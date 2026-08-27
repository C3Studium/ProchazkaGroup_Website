import { registerInput, registerKind } from "../registry"
import { getPath } from "../../lib/documents"
import Icon from "../../ui/Icon"
import { IconButton } from "../../ui/controls"
import styles from "./inputs.module.scss"

/**
 * Text-shaped inputs.
 *
 * Every input receives the field's `ui` object spread as props plus the editing
 * plumbing, which is what lets the registry treat them interchangeably:
 *
 *   …ui        htmlType, multiline, rows, maxLength, mono, pattern, placeholder…
 *   value      current value
 *   onChange   (next) => void
 *   path       dotted path, for containers building their children's paths
 *   errors     the whole error list, so a container can pass it down
 *   doc        the document body, for options that read another field
 *   id         the id the label points at
 *
 * Note there is no per-type branching on `string` vs `text` vs `url` vs `email`.
 * The core already turned those differences into `htmlType`, `inputMode`,
 * `multiline` and `maxLength`, so one component serves all four.
 */

function TextInput({
  value,
  onChange,
  id,
  readOnly,
  htmlType = "text",
  inputMode,
  autoComplete,
  spellCheck,
  placeholder,
  multiline,
  rows,
  maxLength,
  minLength,
  pattern,
  mono,
}) {
  const length = String(value ?? "").length
  const shared = {
    id,
    value: value ?? "",
    placeholder: placeholder || undefined,
    readOnly,
    spellCheck,
    autoComplete,
    inputMode,
    // The limit is advisory in the markup: `maxLength` on the element would
    // silently truncate a paste, and the editor would never see the rule fire.
    "aria-invalid": maxLength ? length > maxLength : undefined,
    onChange: (event) => onChange(event.target.value),
    className: `${styles.control} ${mono ? styles.mono : ""}`,
  }

  return (
    <div className={styles.stack}>
      {multiline ? (
        <textarea {...shared} rows={rows || 4} />
      ) : (
        <input {...shared} type={htmlType} pattern={pattern || undefined} minLength={minLength || undefined} />
      )}
      {/* Shown only once there is something to count, so an untouched field is
          not decorated with "0 / 2000". */}
      {maxLength && length > 0 ? (
        <span className={`${styles.counter} ${length > maxLength ? styles.counterOver : ""}`}>
          {length} / {maxLength}
        </span>
      ) : null}
    </div>
  )
}

function NumberInput({ value, onChange, id, readOnly, min, max, step, inputMode, placeholder }) {
  return (
    <input
      id={id}
      type="number"
      className={`${styles.control} ${styles.number}`}
      value={value ?? ""}
      min={min ?? undefined}
      max={max ?? undefined}
      step={step ?? "any"}
      inputMode={inputMode}
      placeholder={placeholder || undefined}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
    />
  )
}

function UrlInput(props) {
  const { value, onChange, id, readOnly, placeholder, inputMode, maxLength } = props
  const openable = value && (String(value).startsWith("/") || /^https?:\/\//i.test(String(value)))

  return (
    <div className={styles.affixed}>
      <Icon name="link" size={14} className={styles.affixIcon} />
      <input
        id={id}
        type="url"
        inputMode={inputMode}
        className={`${styles.control} ${styles.withAffix}`}
        value={value ?? ""}
        readOnly={readOnly}
        spellCheck={false}
        placeholder={placeholder || "https://"}
        onChange={(event) => onChange(event.target.value)}
      />
      {openable ? (
        <a className={styles.affixAction} href={value} target="_blank" rel="noreferrer" title="Otevřít v novém okně">
          <Icon name="external" size={13} />
        </a>
      ) : null}
      {maxLength && String(value ?? "").length > maxLength ? <span className={styles.counterOver} /> : null}
    </div>
  )
}

function EmailInput({ value, onChange, id, readOnly, placeholder, autoComplete }) {
  return (
    <div className={styles.affixed}>
      <Icon name="mail" size={14} className={styles.affixIcon} />
      <input
        id={id}
        type="email"
        autoComplete={autoComplete}
        className={`${styles.control} ${styles.withAffix}`}
        value={value ?? ""}
        readOnly={readOnly}
        spellCheck={false}
        placeholder={placeholder || "jmeno@domena.cz"}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

/**
 * A slug is offered, never imposed. Auto-following the title would silently
 * change a live URL when someone fixes a typo in a heading, so generating from
 * `ui.source` stays a deliberate click.
 *
 * The core accepts `{ current }` on the way in but its zero value is a plain
 * string, so that is what this writes.
 */
function SlugInput({ value, onChange, id, doc, readOnly, source, prefix, maxLength }) {
  const current = typeof value === "object" && value ? (value.current ?? "") : (value ?? "")
  const from = sourceText(doc, source)
  const suggestion = from ? slugify(from) : ""
  const canSuggest = suggestion && suggestion !== current

  return (
    <div className={styles.affixed}>
      {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
      <input
        id={id}
        type="text"
        className={`${styles.control} ${styles.mono} ${prefix ? styles.withPrefix : ""}`}
        value={current}
        readOnly={readOnly}
        maxLength={maxLength || undefined}
        spellCheck={false}
        onChange={(event) => onChange(slugify(event.target.value, { typing: true }))}
      />
      {canSuggest && !readOnly ? (
        <IconButton
          icon="refresh"
          label={`Vygenerovat z pole „${[].concat(source).join(" + ")}"`}
          size={13}
          onClick={() => onChange(suggestion)}
        />
      ) : null}
    </div>
  )
}

/**
 * `ui.source` is a path into the document, or several — consultant slugs are
 * surname-first ("kaslova-olga") because the review pages under
 * src/pages/reviews/ already use that form and those URLs are indexed, and no
 * single field holds it. An array is joined in the order given, so the schema
 * decides the word order rather than this component guessing it.
 */
function sourceText(doc, source) {
  if (!source) return ""
  return []
    .concat(source)
    .map((path) => getPath(doc, path))
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
}

/**
 * Kept local rather than shared with lib/format's slugify: while typing, a
 * trailing dash has to survive so the next word can be started. The core's
 * pattern rejects it, so validation still catches a slug left in that state.
 */
function slugify(value, { typing = false } = {}) {
  const base = String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
  return typing ? base.replace(/^-+/, "") : base.replace(/^-+|-+$/g, "")
}

registerInput("string", TextInput)
registerInput("text", TextInput)
registerInput("url", UrlInput)
registerInput("email", EmailInput)
registerInput("number", NumberInput)
registerInput("slug", SlugInput)

// Safety net: an unrecognised text-kind or number-kind field still gets a real
// control rather than the raw-JSON fallback.
registerKind("text", TextInput)
registerKind("number", NumberInput)

export { TextInput, NumberInput, UrlInput, EmailInput, SlugInput }
