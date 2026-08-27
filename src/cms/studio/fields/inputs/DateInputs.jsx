import { registerInput, registerKind } from "../registry"
import { formatDateTime } from "../../lib/format"
import styles from "./inputs.module.scss"

/**
 * Native date pickers. A custom calendar would be a week of work to reach parity
 * with what the browser already does for keyboard, locale and mobile — and this
 * admin is used in Czech, where the native control is already correct.
 *
 * One component covers both `date` and `datetime`: the core distinguishes them
 * with `ui.withTime`, and the stored formats differ accordingly — a bare
 * `YYYY-MM-DD` for `date` (the core's check enforces it) and full ISO 8601 for
 * `datetime`. `<input type="datetime-local">` speaks local time without a zone,
 * so conversion happens on the boundary in both directions.
 */

const toDateValue = (value) => (typeof value === "string" ? value.slice(0, 10) : "")

const toLocalValue = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function DateTimeInput({ value, onChange, id, readOnly, withTime, min, max }) {
  // Read-only stamps (submittedAt, an import date) are metadata, not something
  // to edit — a disabled picker would invite a click that does nothing.
  if (readOnly) {
    return (
      <div className={styles.readonlyValue}>
        {value ? (withTime ? formatDateTime(value) : toDateValue(value)) : "—"}
      </div>
    )
  }

  return (
    <input
      id={id}
      type={withTime ? "datetime-local" : "date"}
      className={`${styles.control} ${styles.date}`}
      value={withTime ? toLocalValue(value) : toDateValue(value)}
      min={min || undefined}
      max={max || undefined}
      onChange={(event) => {
        const next = event.target.value
        if (!next) return onChange(null)
        return onChange(withTime ? new Date(next).toISOString() : next)
      }}
    />
  )
}

registerInput("date", DateTimeInput)
registerInput("datetime", DateTimeInput)
registerKind("datetime", DateTimeInput)

export { DateTimeInput }
