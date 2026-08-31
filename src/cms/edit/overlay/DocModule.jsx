import { useCallback, useMemo, useRef, useState } from "react"

import { useCore, usePort, useRevision, useAuth } from "@/cms/studio/context/StudioProvider"
import { useToast } from "@/cms/studio/context/ToastProvider"
import FieldRenderer from "@/cms/studio/fields/FieldRenderer"
import { useAsync } from "@/cms/studio/hooks/useAsync"
import { defaultGroup, errorsForGroup, fieldGroups } from "@/cms/studio/lib/core"
import { bodyOf, isEqual, setPath } from "@/cms/studio/lib/documents"
import { Button } from "@/cms/studio/ui/controls"
import { ErrorState, Spinner } from "@/cms/studio/ui/feedback"
import editor from "@/cms/studio/views/DocumentEditorView.module.scss"

import styles from "./sheet"

/**
 * A partner, an offer or a consultant — the type's own form, over the page.
 *
 * > pro partnery, slevy a poradce to ukáže ten stejný pop up který je v jejich
 * > nativní stránce.
 *
 * "The same" is meant literally, and it is why nothing here draws an input.
 * Every control below is `FieldRenderer`, which is what `/studio/<type>/<id>`
 * renders: the same registry, the same `field.ui`, the same validation, the same
 * tabs from `fieldGroups`. A second form implementation would be right on the
 * day it was written and wrong after the first schema change — and wrong
 * silently, because a missing input looks like a field that does not exist.
 *
 * ---------------------------------------------------------------------------
 * What is deliberately NOT here
 *
 * The document editor's header carries publish, unpublish, archive and delete.
 * None of them come across. This surface writes `draft` and only `draft`
 * (`port.update`, whose statement in `server/documents.js` names `draft` and
 * `updated_by` and no other column), so an editor working here has changed
 * nothing a visitor can see — which is the property the whole editing mode
 * rests on, and a Publikovat inside a popup over the page would quietly end it.
 * Publishing stays where the thing being published is the thing on screen.
 *
 * Neither does *Zahodit koncept*, and that one is worth the paragraph because it
 * would pass the test above: `discardDraft` writes `draft` and names no other
 * column, so it changes nothing a visitor can see. The rule this surface is
 * really protecting is the other one — everything it does can be done again.
 * Every write here is `port.update`, and an editor who mistypes into a form
 * retypes it. Discard is the one draft write that cannot be taken back, and the
 * place for it is the screen that already carries every whole-document action an
 * editor has to be careful with, one click away, where the confirmation naming
 * what disappears has room to be read. A second such place over the page would
 * be a second place to be careful.
 *
 * Validation is the document editor's, for the same reason as the inputs:
 * `port.update` validates the whole body server-side and answers 422, so
 * checking here is about telling the editor which field before the round trip,
 * not about permission.
 */
export default function DocModule({ docId, typeName, onSaved, onClose }) {
  const port = usePort()
  const core = useCore()
  const toast = useToast()
  const { bump } = useRevision()

  const [buffer, setBuffer] = useState(null)
  const [touched, setTouched] = useState(() => new Set())
  const [showAll, setShowAll] = useState(false)
  const [group, setGroup] = useState(null)
  const [busy, setBusy] = useState(false)
  const baseline = useRef(null)

  const { data: doc, error, loading, reload } = useAsync(async () => {
    const loaded = await port.get({ id: docId })
    const body = bodyOf(loaded)
    baseline.current = body
    setBuffer(body)
    return loaded
  }, [port, docId])

  // The annotation's declared type, with the stored one as the fallback. They
  // agree in every correct annotation; when they do not, the document's own type
  // is the one the server will validate against, so it wins and the disagreement
  // is said rather than resolved silently.
  const type = core.getType(doc?.type || typeName)
  const mismatch = doc?.type && typeName && doc.type !== typeName ? doc.type : null

  const { role } = useAuth()

  const groups = useMemo(() => fieldGroups(type, role), [type, role])
  const activeGroup = groups.find((entry) => entry.name === group) || defaultGroup(groups)

  const validation = useMemo(
    () => (buffer && type ? core.validateDocument(type, buffer) : { ok: true, errors: [] }),
    [core, type, buffer],
  )
  const visibleErrors = useMemo(
    () => (showAll ? validation.errors : validation.errors.filter((entry) => touched.has(entry.path))),
    [validation.errors, touched, showAll],
  )

  const update = useCallback((path, value) => {
    setBuffer((current) => setPath(current, path, value))
    setTouched((current) => new Set(current).add(path))
  }, [])

  const dirty = buffer != null && !isEqual(buffer, baseline.current)

  const save = async () => {
    if (!validation.ok) {
      setShowAll(true)
      const first = groups.find((entry) => errorsForGroup(validation.errors, entry).length)
      if (first) setGroup(first.name)
      toast.error("Zkontrolujte vyplněná pole", { description: validation.errors[0]?.message })
      return
    }
    setBusy(true)
    try {
      // Version-checked like the Studio's own editor: this popup sends a WHOLE
      // body, so without it a form left open would revert whatever a colleague
      // wrote in the meantime — including through the overlay one element away.
      // There is no resolve dialog here and there should not be one: the popup
      // is a few fields the editor can see, and `reload` puts the stored version
      // in front of them. The refusal's own sentence says to do that.
      const saved = await port.update({ id: docId, data: buffer, baseVersion: doc?.updatedAt })
      baseline.current = bodyOf(saved)
      setBuffer(bodyOf(saved))
      setTouched(new Set())
      setShowAll(false)
      bump()
      toast.success("Uloženo jako koncept")
      onSaved?.(saved)
    } catch (failure) {
      toast.error("Uložení selhalo", { description: failure?.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading && !buffer) {
    return (
      <div className={styles.setLoading}>
        <Spinner size={20} />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!buffer) return null
  if (!type) {
    return <p className={styles.mediaError}>Typ „{typeName || doc?.type}" není v tomto sezení znám.</p>
  }

  return (
    <div className={styles.setPane}>
      {mismatch ? (
        <p className={styles.setProblem}>
          Anotace na stránce říká „{typeName}", uložený dokument je „{mismatch}". Formulář ukazuje uložený typ.
        </p>
      ) : null}

      {groups.length > 1 ? (
        <div className={editor.tabs} role="tablist">
          {groups.map((entry) => {
            const count = errorsForGroup(visibleErrors, entry).length
            const isActive = entry.name === activeGroup.name
            return (
              <button
                key={entry.name || "_"}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${editor.tab} ${isActive ? editor.tabActive : ""}`}
                onClick={() => setGroup(entry.name)}
              >
                {entry.title || entry.name}
                {count ? <span className={editor.tabError}>{count}</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className={styles.docForm}>
        <div className={editor.form}>
          {activeGroup?.fields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={buffer[field.name]}
              path={field.name}
              errors={visibleErrors}
              doc={buffer}
              onChange={(value) => update(field.name, value)}
            />
          ))}
        </div>
      </div>

      <div className={styles.setFoot}>
        {/* Said on the surface that does the writing, because a form that looks
            exactly like the Studio's should not behave differently in the one
            way that reaches the public. */}
        <span className={styles.setCount}>Ukládá se jako koncept — na web to nepustí.</span>
        <span className={styles.grow} />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zavřít
        </Button>
        <Button variant="primary" size="sm" disabled={!dirty} loading={busy} onClick={save}>
          Uložit
        </Button>
      </div>
    </div>
  )
}
