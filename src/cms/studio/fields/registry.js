/**
 * Input registry.
 *
 * The editor must never switch-case on a field's type name. If it did, every new
 * field type in Contract 1 would need a matching branch here and the two builds
 * would be coupled at the worst possible place. Instead the core computes
 * `field.ui` at schema-definition time, and this registry maps `ui.input` to a
 * component.
 *
 * The core's 16 field types collapse to 9 `kind`s, and several share a component
 * outright — `string`, `text`, `url` and `email` differ only in the props their
 * `ui` already carries. So components are registered under every input key they
 * serve, and `kind` is the safety net: a field type this build has never heard
 * of still renders something sensible, and failing even that gets the fallback
 * input, which shows the raw value and says plainly that no editor is registered.
 *
 * Resolution order, most specific first:
 *
 *   1. ui.input   the input the field type asked for
 *   2. ui.kind    coarse family — "text", "choice", "asset", "collection", …
 *   3. FallbackInput
 */

const inputs = new Map()
const kinds = new Map()

export function registerInput(key, Component) {
  inputs.set(key, Component)
  return Component
}

/** A last-resort renderer for a whole family of types. */
export function registerKind(kind, Component) {
  kinds.set(kind, Component)
  return Component
}

export function resolveInput(ui, fallback) {
  if (ui?.input && inputs.has(ui.input)) return inputs.get(ui.input)
  if (ui?.kind && kinds.has(ui.kind)) return kinds.get(ui.kind)
  return fallback
}

export const registeredInputs = () => [...inputs.keys()]
export const registeredKinds = () => [...kinds.keys()]
