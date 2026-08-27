import { errorAt } from "../lib/core"
import { FieldShell } from "../ui/controls"
import { resolveInput } from "./registry"
import FallbackInput from "./inputs/FallbackInput"

// Importing the input modules is what populates the registry. Each one calls
// registerInput()/registerKind() at module scope, so this is the single place
// that decides which inputs exist.
import "./inputs/TextInputs"
import "./inputs/ChoiceInputs"
import "./inputs/DateInputs"
import "./inputs/RichTextInput"
import "./inputs/AssetInputs"
import "./inputs/ReferenceInput"
import "./inputs/ContainerInputs"

/**
 * Renders one schema field.
 *
 * Note what is absent: any mention of a concrete type name. The core computes
 * `field.ui` at schema-definition time — it carries the input key, the coarse
 * kind, and every attribute the control needs, including limits already derived
 * from the validation rules. This component hands `ui` to the registry and
 * spreads it into whatever comes back. A field type added in build A appears
 * here without this file changing.
 */
export default function FieldRenderer({ field, value, onChange, path, errors = [], doc, parent, readOnly, bare }) {
  const ui = field.ui

  // `hidden` and `readOnly` are always functions on a normalised field, and are
  // evaluated per render because they may depend on other field values.
  const context = { parent: parent ?? doc, value, path }
  if (field.hidden(doc, context)) return null

  const locked = readOnly || field.readOnly(doc, context)
  const Input = resolveInput(ui, FallbackInput)
  const error = errorAt(errors, path)

  const input = (id) => (
    <Input
      // `ui` first so a field type's own render props are available by name,
      // and the plumbing below cannot be shadowed by one of them.
      {...ui}
      ui={ui}
      field={field}
      value={value}
      onChange={onChange}
      path={path}
      errors={errors}
      doc={doc}
      readOnly={locked}
      invalid={Boolean(error)}
      id={id}
    />
  )

  // Array members and other nested leaves supply their own framing.
  if (bare) return input(path)

  return (
    <FieldShell
      label={ui.title}
      description={ui.description}
      required={ui.required}
      error={error?.message}
      id={path}
      width={ui.width}
    >
      {input}
    </FieldShell>
  )
}
