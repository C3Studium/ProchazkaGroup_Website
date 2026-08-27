import { useMemo, useRef, useState } from "react"

import { useCore, usePort } from "@/cms/studio/context/StudioProvider"
import FieldRenderer from "@/cms/studio/fields/FieldRenderer"
import { useAsync } from "@/cms/studio/hooks/useAsync"
import { bodyOf, getPath, isEqual, setPath } from "@/cms/studio/lib/documents"
import { Button } from "@/cms/studio/ui/controls"
import { ErrorState, Spinner } from "@/cms/studio/ui/feedback"

import styles from "./sheet"

/**
 * An array of objects, edited whole — and one member of it, edited whole.
 *
 * > kliknutí na otázku otevře tu otázku i s odpovědí; kliknutí na blok vedle ní
 * > otevře celý seznam
 *
 * One popup, two entry points, and the difference between them is the path in
 * the annotation, not a second component and not a mode:
 *
 *   data-cms-field="items"     the whole array — reorder, edit, add, remove
 *   data-cms-field="items.3"   one member — its own fields, edited together
 *
 * The FAQ is why this kind exists. A question and its answer are `items[i].label`
 * and `items[i].value` of the same siteCopy block, and annotating them as two
 * `text` fields made an editor edit half a Q&A pair at a time — with the answer
 * only reachable while its question happened to be the open one.
 *
 * ---------------------------------------------------------------------------
 * Why there is no input in this file
 *
 * The same argument `DocModule` makes: every control below is `FieldRenderer`,
 * which is what `/studio/<type>/<id>` renders. In the whole-array shape that
 * resolves to the Studio's own `ArrayInput`, so reorder, add and remove are the
 * ones the client already knows from the document editor — including their
 * keyboard reachability, which is the array input's own (two icon buttons, not a
 * drag). A second array editor written here would be right on the day it was
 * written and wrong after the first schema change.
 *
 * ---------------------------------------------------------------------------
 * What each shape may write, and why they differ
 *
 * The whole-array shape submits the array; `patchField` validates it as the
 * array field, so `min`/`max` are checked and a removal is expressible.
 *
 * The one-member shape submits that member and only that member. It offers no
 * remove and no reorder on purpose rather than by omission: both are statements
 * about the array's length or order, and `items.3` cannot express either —
 * writing `null` there would leave a hole in the list, which is a body no form
 * can render and no `.map()` on the site survives. An editor who wants to remove
 * a question opens the block beside it, which is the entry point that can.
 *
 * ---------------------------------------------------------------------------
 * Validation is the document's, narrowed to this path
 *
 * `core.validateDocument` runs over the whole body with the edit applied, and
 * the errors shown are the ones under the annotated path. Whole-document
 * validation because a `custom` rule may compare two fields; narrowed because an
 * unrelated half-finished field elsewhere in the block must not block a Q&A fix
 * — and `patchField` validates only this field anyway, so a wider refusal here
 * would be this component inventing a rule the server does not have.
 */
export default function ListModule({ docId, field, onCommit, onClose }) {
  const port = usePort()
  const core = useCore()

  const [buffer, setBuffer] = useState(null)
  const baseline = useRef(null)

  const { data, error, loading, reload } = useAsync(async () => {
    const doc = await port.get({ id: docId })
    const body = bodyOf(doc)
    baseline.current = body
    setBuffer(body)
    return { doc, type: core.getType(doc?.type) }
  }, [port, core, docId])

  const type = data?.type
  const descriptor = useMemo(() => resolveList(type, field), [type, field])

  const validation = useMemo(
    () => (buffer && type ? core.validateDocument(type, buffer) : { ok: true, errors: [] }),
    [core, type, buffer],
  )
  // Only what is under the annotated path. `startsWith(path + ".")` and not
  // `startsWith(path)`, or editing `items` would claim `itemsCount`'s errors.
  //
  // Shown from the first render rather than after a touch or a refused save,
  // which is where `DocModule` shows them: that form is a whole document and
  // most of it is not what the editor came for, so leading with its errors would
  // be noise. This popup is one list and the editor is looking straight at it.
  const mine = useMemo(
    () => validation.errors.filter((entry) => entry.path === field || String(entry.path).startsWith(`${field}.`)),
    [validation.errors, field],
  )

  if (loading && !buffer) {
    return (
      <div className={styles.setLoading}>
        <Spinner size={20} />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!buffer) return null
  if (descriptor.problem) return <p className={styles.setProblem}>{descriptor.problem}</p>

  const value = getPath(buffer, field)
  const stored = getPath(baseline.current, field)
  const dirty = !isEqual(value, stored)
  const whole = descriptor.shape === "array"
  const count = Array.isArray(value) ? value.length : 0

  const update = (next) => setBuffer((current) => setPath(current, field, next))

  return (
    <div className={styles.setPane}>
      <div className={styles.docForm}>
        <div className={styles.listForm}>
          <FieldRenderer
            field={descriptor.field}
            value={value}
            path={field}
            bare={!whole}
            errors={mine}
            doc={buffer}
            parent={whole ? buffer : getPath(buffer, field.slice(0, field.lastIndexOf(".")))}
            onChange={update}
          />
        </div>
      </div>

      <div className={styles.setFoot}>
        <span className={styles.setCount}>
          {/* Which item, when it is one item. The popup covers the page, so the
              question it was opened from is not on screen to count against. */}
          {whole ? `${count} ${plural(count)} · ` : `${Number(field.slice(field.lastIndexOf(".") + 1)) + 1}. položka · `}
          Ukládá se jako koncept — na web to nepustí.
        </span>
        <span className={styles.grow} />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zrušit
        </Button>
        {/* The rule the whole build follows: nothing to save, nothing offered. */}
        <Button variant="primary" size="sm" disabled={!dirty || mine.length > 0} onClick={() => onCommit(value)}>
          Uložit
        </Button>
      </div>
    </div>
  )
}

const plural = (n) => (n === 1 ? "položka" : n < 5 ? "položky" : "položek")

/* ------------------------------------------------------------------ paths -- */

/**
 * The field a dotted path names, and which of the two shapes it is.
 *
 * The same structural walk `@/cms/server/fieldPatch` does — resolved against the
 * schema, never against the body, so `items.3` answers on a block whose fourth
 * question has not been typed yet. What it adds is the distinction this popup
 * turns on: a path landing on the array itself is the whole list, a path landing
 * on a member is one entry.
 */
function resolveList(type, path) {
  if (!type) return { problem: "Typ dokumentu není v tomto sezení znám." }

  const segments = String(path).split(".")
  let field = null
  let shape = null

  for (const segment of segments) {
    if (field === null) {
      field = (type.fields || []).find((entry) => entry.name === segment) || null
      shape = field?.type === "array" ? "array" : null
    } else if (field.type === "array") {
      if (!/^(0|[1-9][0-9]*)$/.test(segment)) {
        return { problem: `Seznam „${field.title || field.name}" se adresuje číslem položky, ne „${segment}".` }
      }
      const members = field.members || []
      if (members.length !== 1) {
        return { problem: `Seznam „${field.title || field.name}" má víc typů položek — takhle se upravit nedá.` }
      }
      field = members[0]
      shape = "entry"
    } else if (field.type === "object") {
      field = (field.fields || []).find((entry) => entry.name === segment) || null
      shape = field?.type === "array" ? "array" : null
    } else {
      field = null
    }
    if (!field) return { problem: `Typ „${type.title || type.name}" nemá pole „${path}".` }
  }

  if (!shape) {
    return { problem: `Pole „${field.title || field.name}" není seznam ani jeho položka.` }
  }
  return { field, shape, problem: null }
}
