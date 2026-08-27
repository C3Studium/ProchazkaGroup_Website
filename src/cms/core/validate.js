/**
 * Validation and zero values.
 *
 * The engine is deliberately small and knows nothing about any particular field
 * type. For every field it asks the type registry four things — is this empty,
 * is the shape right, what do the rules say, what is inside — and the fourth
 * answer is what makes nesting work: `enter` hands back child (key, field,
 * value) triples, so an array of objects inside an object inside an array costs
 * no extra code and produces the same dotted paths as everything else.
 *
 * Paths are dotted with array indices as segments — `highlights.2.label` — which
 * is the shape Contract 1 asks for and the shape a Studio can match against a
 * field it is rendering.
 */
import { getType } from "./registry.js"
import { getFieldType, zeroOf } from "./fieldTypes.js"
import { runRules } from "./rules.js"

const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value)

const join = (path, key) => (path ? `${path}.${key}` : String(key))

/**
 * Validate a document body against a type.
 *
 * `type` is a registered type name (the value of `cms_document.type`) or a type
 * object. `value` is the body — `draft ?? data`, not the envelope.
 */
export function validateDocument(type, value) {
  const resolved = getType(type)
  const errors = []

  if (!isPlainObject(value)) {
    return { ok: false, errors: [{ path: "", message: "Očekáván obsah dokumentu.", rule: "shape", type: resolved.name }] }
  }

  for (const field of resolved.fields) {
    collect(field, value[field.name], field.name, { document: value, parent: value }, errors)
  }

  return { ok: errors.length === 0, errors }
}

/**
 * Validate one field in isolation — what the Studio calls on blur, so a single
 * input can show its own error without paying for a whole-document pass.
 */
export function validateValue(field, value, options = {}) {
  const errors = []
  const document = options.document ?? {}
  collect(field, value, options.path ?? field.name, { document, parent: options.parent ?? document }, errors)
  return { ok: errors.length === 0, errors }
}

function collect(field, value, path, scope, errors) {
  // A field the editor cannot see must not be able to block a save. Conditional
  // fields are the whole reason `hidden` exists.
  if (field.hidden(scope.document, { parent: scope.parent, value, path })) return

  const entry = getFieldType(field.type)
  const empty = entry.isEmpty(value, field)

  // Shape first, and stop there if it is wrong: rules run against a value the
  // type does not recognise would report the same problem a second time in
  // less useful words.
  if (!empty) {
    const shape = entry.check(value, field)
    if (shape) {
      errors.push({ path, message: shape, rule: "type", field: field.name, type: field.type })
      return
    }
  }

  errors.push(
    ...runRules(field.rules, value, {
      field,
      path,
      measure: entry.measure,
      isEmpty: entry.isEmpty,
      document: scope.document,
      parent: scope.parent,
    }),
  )

  // An empty container is not walked — an optional group of fields the editor
  // never opened should not demand its own contents. An array *item* is the
  // exception: it exists because someone added it, so a blank one is an unfinished
  // row and has to say so.
  if (!entry.enter || (empty && !field.isArrayMember)) return

  for (const child of entry.enter(value, field)) {
    if (child.error) {
      errors.push({ path: join(path, child.key), message: child.error, rule: "type", field: field.name, type: field.type })
      continue
    }
    collect(child.field, child.value, join(path, child.key), { document: scope.document, parent: value }, errors)
  }
}

/**
 * A document body with every field at its zero value — what "New document" opens
 * on, and the shape the server can store without the Studio having touched a
 * single input.
 */
export function emptyDocument(type) {
  const resolved = getType(type)
  const body = {}
  for (const field of resolved.fields) body[field.name] = zeroOf(field)
  return body
}

/** The zero value of a single field. The Studio's "add array item" calls this. */
export function emptyValue(field) {
  return zeroOf(field)
}
