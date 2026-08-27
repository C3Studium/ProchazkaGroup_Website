import { Fragment, useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import { surfaceFor } from "@/cms/visualEditing"
import { useCore, usePort, useRevision } from "../context/StudioProvider"
import { useToast } from "../context/ToastProvider"
import { useAsync } from "../hooks/useAsync"
import { useUnsavedGuard } from "../hooks/useUnsavedGuard"
import { defaultGroup, errorsForGroup, fieldGroups } from "../lib/core"
import { STATE_LABELS, bodyOf, isArchived, isEqual, previewOf, restoreOutcome, setPath, stateOf } from "../lib/documents"
import { formatRelative } from "../lib/format"
import { hrefs } from "../lib/routes"
import FieldRenderer from "../fields/FieldRenderer"
import { Button, IconButton } from "../ui/controls"
import { Badge, ErrorState, Spinner } from "../ui/feedback"
import { ConfirmDialog } from "../ui/Modal"
import Icon from "../ui/Icon"
import { ViewBody, ViewHeader } from "./ViewLayout"
import VisualSurfaceNotice from "./VisualSurfaceNotice"
import styles from "./DocumentEditorView.module.scss"
import surfaceStyles from "./VisualSurfaceNotice.module.scss"

/**
 * The editor.
 *
 * Three decisions worth stating:
 *
 * - Saving and publishing are separate buttons. Contract 3 keeps edits in
 *   `draft` until `publish()` copies them into `data`, and the client needs to
 *   be able to work on a text without it appearing on the site. A single "Save"
 *   that also published would make that impossible to express.
 *
 * - Validation runs on every change but errors are only *shown* for fields the
 *   editor has touched, until they press save. Showing "Povinné pole" on every
 *   field of a blank new document is noise, not help.
 *
 * - The buffer is local state, flushed on save. Saving per keystroke against a
 *   real server would mean a partially-typed value is what gets published if the
 *   tab closes at the wrong moment.
 */
export default function DocumentEditorView({ type, id, isNew }) {
  const port = usePort()
  const core = useCore()
  const router = useRouter()
  const toast = useToast()
  const { bump } = useRevision()

  const [buffer, setBuffer] = useState(null)
  const [touched, setTouched] = useState(() => new Set())
  const [showAll, setShowAll] = useState(false)
  const [group, setGroup] = useState(null)
  const [busy, setBusy] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const baseline = useRef(null)

  const { data: doc, error, loading, reload, setData } = useAsync(async () => {
    if (isNew) {
      // A new document is not created server-side until the first save, so an
      // abandoned "New" leaves nothing behind.
      const body = core.emptyDocument(type)
      baseline.current = body
      setBuffer(body)
      return null
    }
    const loaded = await port.get({ id })
    const body = bodyOf(loaded)
    baseline.current = body
    setBuffer(body)
    return loaded
  }, [port, core, type, id, isNew])

  /**
   * Is this document one whose copy is edited by clicking the page?
   *
   * Keyed off the buffer rather than the loaded document, so it answers
   * correctly while an editor is typing a key into a new block — the notice
   * appears the moment the key matches, which is the moment it becomes true.
   */
  const surface = useMemo(() => surfaceFor(type?.name, buffer), [type, buffer])

  /**
   * The top-level fields the page owns, and therefore the ones that lose their
   * input here. A surface lists paths (`items.*.label`); an input is a whole
   * field (`items`), so the head of each path is what matters.
   *
   * Everything else on the document keeps its input. See VisualSurfaceNotice
   * for why that is not a compromise.
   */
  const lockedFields = useMemo(
    () => new Set((surface?.fields || []).map((entry) => String(entry.path).split(".")[0])),
    [surface],
  )

  const groups = useMemo(() => fieldGroups(type), [type])
  // A schema can mark one group `default: true`; honour it instead of always
  // opening the first tab.
  const activeGroup = groups.find((entry) => entry.name === group) || defaultGroup(groups)

  const validation = useMemo(
    () => (buffer ? core.validateDocument(type, buffer) : { ok: true, errors: [] }),
    [core, type, buffer],
  )

  const visibleErrors = useMemo(
    () => (showAll ? validation.errors : validation.errors.filter((entry) => touched.has(entry.path))),
    [validation.errors, touched, showAll],
  )

  const dirty = buffer != null && !isEqual(buffer, baseline.current)
  useUnsavedGuard(dirty)

  const update = useCallback((path, value) => {
    setBuffer((current) => setPath(current, path, value))
    setTouched((current) => new Set(current).add(path))
  }, [])

  const save = async ({ publish = false } = {}) => {
    // A blocked publish is the moment every error becomes relevant, so reveal
    // them all — including for fields on tabs the editor has not opened.
    if (!validation.ok) {
      setShowAll(true)
      const firstGroup = groups.find((entry) => errorsForGroup(validation.errors, entry).length)
      if (firstGroup) setGroup(firstGroup.name)
      toast.error(`Zkontrolujte ${validation.errors.length === 1 ? "jedno pole" : "vyplněná pole"}`, {
        description: validation.errors[0]?.message,
      })
      return
    }

    setBusy(publish ? "publish" : "save")
    try {
      let saved = doc
      if (isNew && !doc) {
        saved = await port.create({ type: type.name, data: buffer })
      } else {
        saved = await port.update({ id: saved.id, data: buffer })
      }

      if (publish) saved = await port.publish({ id: saved.id })

      baseline.current = bodyOf(saved)
      setBuffer(bodyOf(saved))
      setData(saved)
      setShowAll(false)
      setTouched(new Set())
      bump()

      toast.success(publish ? "Publikováno na web" : "Uloženo jako koncept")

      // A newly created document needs a real URL, otherwise a refresh loses it.
      if (isNew) router.replace(hrefs.editor(type.name, saved.id), undefined, { shallow: true })
    } catch (failure) {
      toast.error("Uložení selhalo", { description: failure?.message })
    } finally {
      setBusy(null)
    }
  }

  const runAction = async (action, label) => {
    setBusy(action)
    try {
      const updated = await port[action]({ id: doc.id })
      setData(updated)
      baseline.current = bodyOf(updated)
      setBuffer(bodyOf(updated))
      bump()
      toast.success(label)
    } catch (failure) {
      toast.error("Akce selhala", { description: failure?.message })
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  const remove = async () => {
    setBusy("remove")
    try {
      await port.remove({ id: doc.id })
      bump()
      toast.success("Dokument smazán")
      // The guard must not challenge a navigation away from something deleted.
      baseline.current = buffer
      router.push(hrefs.list(type.name))
    } catch (failure) {
      toast.error("Smazání selhalo", { description: failure?.message })
      setBusy(null)
      setConfirming(null)
    }
  }

  if (loading && !buffer) {
    return (
      <div className={styles.loading}>
        <Spinner size={20} />
      </div>
    )
  }

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!buffer) return null

  const state = STATE_LABELS[stateOf(doc)]
  const preview = previewOf(type, doc || { draft: buffer })
  const title = isNew ? `Nový dokument: ${type.title}` : preview.title
  const archived = isArchived(doc)

  return (
    <>
      <ViewHeader
        breadcrumb={[{ label: type.title || type.name, href: hrefs.list(type.name) }, { label: isNew ? "Nový" : "Detail" }]}
        title={title}
        meta={
          <>
            {!isNew ? (
              <Badge tone={state.tone} dot title={state.hint}>
                {state.label}
              </Badge>
            ) : (
              <Badge tone="neutral">Neuloženo</Badge>
            )}
            {dirty ? <span className={styles.dirtyMark}>neuložené změny</span> : null}
          </>
        }
        subtitle={doc ? `Naposledy upraveno ${formatRelative(doc.updatedAt)}` : "Zatím neuloženo"}
        actions={
          archived ? (
            // An archived document offers exactly two things: put it back, or
            // end it. Save and publish are absent rather than disabled — a
            // "Publikovat" that leaves the document invisible because it is
            // still archived would be a button that lies.
            <>
              <IconButton icon="trash" label="Smazat natrvalo" tone="danger" onClick={() => setConfirming("remove")} />
              <Button variant="primary" icon="unarchive" onClick={() => runAction("restore", "Vráceno z archivu")} loading={busy === "restore"}>
                Vrátit z archivu
              </Button>
            </>
          ) : (
            <>
              {doc?.status === "published" ? (
                <IconButton icon="eyeOff" label="Stáhnout z webu" onClick={() => setConfirming("unpublish")} />
              ) : null}
              {doc ? <IconButton icon="archive" label="Do archivu" onClick={() => setConfirming("archive")} /> : null}
              {doc ? <IconButton icon="trash" label="Smazat" tone="danger" onClick={() => setConfirming("remove")} /> : null}
              <Button variant="secondary" onClick={() => save()} loading={busy === "save"} disabled={!dirty && !isNew}>
                Uložit koncept
              </Button>
              <Button variant="primary" icon="check" onClick={() => save({ publish: true })} loading={busy === "publish"}>
                {doc?.status === "published" ? "Publikovat změny" : "Publikovat"}
              </Button>
            </>
          )
        }
      />

      {archived ? (
        <p className={styles.archivedNote} role="status">
          <Icon name="archive" size={14} />
          <span>
            Tento záznam je v archivu, takže není na webu. {restoreOutcome(doc)}
          </span>
        </p>
      ) : null}

      {groups.length > 1 ? (
        <div className={styles.tabs} role="tablist">
          {groups.map((entry) => {
            const count = errorsForGroup(visibleErrors, entry).length
            const isActive = entry.name === activeGroup.name
            return (
              <button
                key={entry.name || "_"}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                onClick={() => setGroup(entry.name)}
              >
                {entry.title || entry.name}
                {/* The error count on an unopened tab is the only way an editor
                    finds out a hidden field is blocking their publish. */}
                {count ? <span className={styles.tabError}>{count}</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      <ViewBody>
        <div className={styles.form}>
          {showAll && !validation.ok ? (
            <div className={styles.summary} role="alert">
              <Icon name="warning" size={14} />
              <span>
                {validation.errors.length === 1
                  ? "Jedno pole potřebuje opravit, než půjde publikovat."
                  : `${validation.errors.length} polí potřebuje opravit, než půjde publikovat.`}
              </span>
            </div>
          ) : null}

          {/* `type`/`id` were the preview's "which document did I come from"
              breadcrumb. "Upravit kontent" is reached by page, not by document —
              it spans several — so the notice no longer needs either. */}
          {surface ? <VisualSurfaceNotice surface={surface} disabled={!doc?.id} /> : null}

          {/* Schema order is kept even where half the fields have lost their
              inputs. An editor knows this form; reordering it so the read-only
              ones sit together would be a second thing that changed today. The
              divider is inserted before the first of them instead, which lands
              in the same place for both blocks that have one. */}
          {activeGroup?.fields.map((field, index) => {
            const locked = lockedFields.has(field.name)
            const firstLocked =
              locked && !activeGroup.fields.slice(0, index).some((entry) => lockedFields.has(entry.name))

            return (
              <Fragment key={field.name}>
                {firstLocked ? (
                  <p className={surfaceStyles.lockedLabel}>Upravuje se na stránce</p>
                ) : null}
                <FieldRenderer
                  field={field}
                  value={buffer[field.name]}
                  path={field.name}
                  errors={visibleErrors}
                  doc={buffer}
                  readOnly={locked}
                  onChange={(value) => update(field.name, value)}
                />
              </Fragment>
            )
          })}
        </div>
      </ViewBody>

      {/* Deleting and archiving are offered side by side, so the copy for
          delete has to say what archiving would have done instead. Without
          that, "Smazat" is the only button anyone finds for "this person left". */}
      <ConfirmDialog
        open={confirming === "remove"}
        title="Smazat natrvalo?"
        description={
          "Tuto akci nelze vzít zpět — dokument zmizí z webu, z administrace i z databáze. " +
          "Pokud jde jen o to, aby nebyl na webu, použijte archiv: odtud ho lze kdykoliv vrátit."
        }
        confirmLabel="Smazat natrvalo"
        busy={busy === "remove"}
        onClose={() => setConfirming(null)}
        onConfirm={remove}
      />

      {/* Archiving is reversible, so this is a confirmation that explains
          rather than one that warns. It exists because "archive" is a word
          people read as "delete" until they are told otherwise, once. */}
      <ConfirmDialog
        open={confirming === "archive"}
        title="Přesunout do archivu?"
        description={
          "Záznam zmizí z webu, ale zůstane v administraci v záložce Archiv a kdykoliv ho odtud můžete vrátit zpět. " +
          "Nic se nemaže."
        }
        confirmLabel="Do archivu"
        tone="secondary"
        busy={busy === "archive"}
        onClose={() => setConfirming(null)}
        onConfirm={() => runAction("archive", "Přesunuto do archivu")}
      />

      <ConfirmDialog
        open={confirming === "unpublish"}
        title="Stáhnout z webu?"
        description="Obsah zůstane v administraci jako koncept, ale na webu přestane být vidět."
        confirmLabel="Stáhnout z webu"
        tone="secondary"
        busy={busy === "unpublish"}
        onClose={() => setConfirming(null)}
        onConfirm={() => runAction("unpublish", "Staženo z webu")}
      />
    </>
  )
}
