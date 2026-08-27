import { useState } from "react"
import Icon from "../../ui/Icon"
import styles from "./inputs.module.scss"

/**
 * What a field type this build has never seen renders as.
 *
 * The alternative — throwing, or silently skipping the field — would mean build A
 * shipping a new field type breaks or quietly hides content in the admin. This
 * keeps the document editable, names the missing piece, and points at the one
 * place that needs a line added.
 */
export default function FallbackInput({ field, fieldType, value, onChange, id, readOnly }) {
  const isPlain = value == null || typeof value === "string" || typeof value === "number"

  return (
    <div className={styles.fallback}>
      <p className={styles.fallbackNote}>
        <Icon name="info" size={12} />
        Pro typ <code>{fieldType?.name || field.type}</code> zatím není v administraci editor.
      </p>
      {isPlain ? (
        <input
          id={id}
          type="text"
          className={styles.control}
          value={value ?? ""}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <JsonArea id={id} value={value} onChange={onChange} readOnly={readOnly} />
      )}
    </div>
  )
}

/**
 * The text has to be its own state: a controlled textarea whose value is
 * `JSON.stringify(value)` snaps back on the first keystroke that leaves the JSON
 * momentarily invalid, which is every keystroke. Edits are held locally and
 * pushed up only when they parse.
 */
function JsonArea({ id, value, onChange, readOnly }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2))
  const [broken, setBroken] = useState(false)

  return (
    <>
      <textarea
        id={id}
        className={`${styles.control} ${styles.mono} ${broken ? styles.controlInvalid : ""}`}
        rows={6}
        readOnly={readOnly}
        value={text}
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value)
          try {
            onChange(JSON.parse(event.target.value))
            setBroken(false)
          } catch {
            setBroken(true)
          }
        }}
      />
      {broken ? <p className={styles.fallbackError}>Neplatný JSON — změny se zatím neukládají.</p> : null}
    </>
  )
}
