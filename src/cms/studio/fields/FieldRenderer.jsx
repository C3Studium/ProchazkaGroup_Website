import { useAuth } from "../context/StudioProvider"
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
  const { isAdmin, role } = useAuth()

  // `hidden` and `readOnly` are always functions on a normalised field, and are
  // evaluated per render because they may depend on other field values.
  const context = { parent: parent ?? doc, value, path }
  if (field.hidden(doc, context)) return null

  // Not rendered at all rather than rendered disabled. A greyed-out field an
  // editor cannot use is a question they will ask, and the answer — "that one
  // breaks the addresses of pages people have already linked to" — is not one
  // the form can give well. The server refuses the write regardless; this is
  // only what the screen shows.
  if (field.adminOnly && !isAdmin) return null
  if (field.viewRoles && role && !field.viewRoles.includes(role)) return null

  // Locked, not hidden, when the role may not write it. A member moderating a
  // review has to read the text to judge it; hiding it would leave them
  // approving something they cannot see. `adminOnly` above is the other case —
  // there, not seeing it is the point.
  const forbiddenToRole = Boolean(field.editRoles && role && !field.editRoles.includes(role))
  const locked = readOnly || forbiddenToRole || field.readOnly(doc, context)
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
