import { registerInput, registerKind } from "../registry"
import { Checkbox, Select, Toggle } from "../../ui/controls"
import styles from "./inputs.module.scss"

function BooleanInput({ value, onChange, readOnly, title, layout }) {
  const label = value ? "Ano" : "Ne"

  if (layout === "checkbox") {
    return <Checkbox checked={Boolean(value)} disabled={readOnly} onChange={onChange} label={title} />
  }

  return (
    <div className={styles.booleanRow}>
      <Toggle checked={Boolean(value)} disabled={readOnly} onChange={onChange} label={label} />
    </div>
  )
}

/**
 * The core already decided between a radio group and a dropdown — it switches at
 * five options, past which a radio group stops being scannable — and hands that
 * down as `ui.layout`. Re-deciding here would put the threshold in two places.
 */
function SelectInput({ value, onChange, id, readOnly, choices = [], multiple, layout, placeholder }) {
  if (multiple) {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className={styles.choices}>
        {choices.map((choice) => (
          <Checkbox
            key={choice.value}
            checked={selected.includes(choice.value)}
            disabled={readOnly}
            label={choice.title}
            onChange={(on) =>
              onChange(on ? [...selected, choice.value] : selected.filter((entry) => entry !== choice.value))
            }
          />
        ))}
      </div>
    )
  }

  if (layout === "radio") {
    return (
      <div className={styles.choices} role="radiogroup" aria-labelledby={id}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={value === choice.value}
            disabled={readOnly}
            className={`${styles.choice} ${value === choice.value ? styles.choiceActive : ""}`}
            // Clicking the active option clears it, which is the only way to
            // empty an optional select without a separate "×" control.
            onClick={() => onChange(value === choice.value ? null : choice.value)}
          >
            {choice.title}
          </button>
        ))}
      </div>
    )
  }

  return (
    <Select
      id={id}
      value={value}
      onChange={onChange}
      options={choices}
      disabled={readOnly}
      placeholder={placeholder || "— vyberte —"}
    />
  )
}

registerInput("boolean", BooleanInput)
registerInput("select", SelectInput)
registerKind("boolean", BooleanInput)
registerKind("choice", SelectInput)

export { BooleanInput, SelectInput }
