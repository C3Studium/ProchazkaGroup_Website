/**
 * `defineField` — normalise one field declaration into the descriptor that the
 * Studio renders and the validator walks.
 *
 * Everything expensive or error-prone happens once, here, at module evaluation:
 * rules are compiled, options are merged with the type's defaults, children are
 * normalised recursively, conditionals become functions, and the render metadata
 * is computed. Validation then runs on every keystroke without rebuilding any of
 * it, and a malformed schema fails at import rather than in front of an editor.
 *
 * The returned object is frozen. It is shared by the Studio, the server and the
 * validator; none of them may reshape it for the others.
 */
import { fail, at } from "./errors.js"
import { getFieldType, hasFieldType } from "./fieldTypes.js"
import { resolveValidation, summarizeRules } from "./rules.js"

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const MARKER = "__cmsField"

const asFunction = (value, fallback) => {
  if (value === undefined || value === null) return () => fallback
  if (typeof value === "function") return value
  return () => Boolean(value)
}

export function defineField(config, context = {}) {
  // Idempotent: schemas hand normalised fields back through defineType, and a
  // second pass must not re-run validation resolution or lose object identity.
  if (config && config[MARKER]) return config

  const where = at(context.where, config?.name ?? "?")

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    fail("invalid_config", `${where}: a field must be an object.`)
  }
  if (!NAME_PATTERN.test(config.name ?? "")) {
    fail("invalid_config", `${where}: field name must match ${NAME_PATTERN} (got ${JSON.stringify(config.name)}).`)
  }
  if (!hasFieldType(config.type)) {
    fail("unknown_field_type", `${where}: unknown field type ${JSON.stringify(config.type)}.`, { type: config.type })
  }

  const entry = getFieldType(config.type)
  const options = Object.freeze({ ...entry.options, ...(config.options ?? {}) })

  const field = {
    // Unknown keys survive on purpose: the Studio and the server both hang
    // their own hints off field declarations, and core should not eat them.
    ...config,
    [MARKER]: true,
    name: config.name,
    title: config.title ?? config.name,
    description: config.description ?? "",
    type: config.type,
    group: config.group ?? null,
    options,
    initialValue: config.initialValue,
    // Conditionals are always functions, so no caller has to test the type of
    // `hidden` before calling it. `options.readOnly` is honoured too — build B's
    // schemas put it there.
    hidden: asFunction(config.hidden, false),
    readOnly: asFunction(config.readOnly ?? options.readOnly, false),
    to: normalizeReferenceTargets(config, options, where),
    fields: [],
    members: [],
    isArrayMember: context.isArrayMember === true,
  }

  if (config.type === "object") {
    field.fields = normalizeChildFields(config.fields, where)
  }
  if (config.type === "array") {
    field.members = normalizeMembers(config, where)
    // build B's stub reads `field.of` as a single field. Keep that alias for the
    // overwhelmingly common single-member array; `members` is always the truth.
    field.of = field.members.length === 1 ? field.members[0] : field.members
  }

  field.rules = Object.freeze(resolveValidation(config.validation, where))
  assertRulesApply(field, entry, where)
  field.constraints = summarizeRules(field.rules)
  const configError = entry.checkConfig?.(field)
  if (configError) fail("invalid_config", `${where}: ${configError}`, { type: field.type })
  // Hoisted for the UI: an asterisk on a label should not require walking rules.
  field.required = field.constraints.required
  field.ui = entry.ui(field)

  Object.freeze(field.fields)
  Object.freeze(field.members)
  return Object.freeze(field)
}

export function isField(value) {
  return Boolean(value && value[MARKER])
}

/* ------------------------------------------------------------------ pieces -- */

function normalizeReferenceTargets(config, options, where) {
  if (config.type !== "reference") return Object.freeze([])
  // `to: ["consultant"]`, `to: [{ type: "consultant" }]` and
  // `options: { to: [...] }` all appear in the wild; accept all three.
  const raw = config.to ?? options.to ?? []
  const list = (Array.isArray(raw) ? raw : [raw]).map((target) =>
    typeof target === "string" ? target : target?.type ?? target?.name,
  )
  if (list.some((target) => typeof target !== "string" || target === "")) {
    fail("invalid_config", `${where}: reference targets must be type names.`)
  }
  return Object.freeze(list)
}

function normalizeChildFields(fields, where) {
  if (!Array.isArray(fields) || fields.length === 0) {
    fail("invalid_config", `${where}: an object field needs a non-empty \`fields\` array.`)
  }
  const seen = new Set()
  return fields.map((child, index) => {
    const normalized = defineField(child, { where: at(where, `fields[${index}]`) })
    if (seen.has(normalized.name)) {
      fail("invalid_config", `${where}: duplicate field name "${normalized.name}".`)
    }
    seen.add(normalized.name)
    return normalized
  })
}

function normalizeMembers(config, where) {
  const raw = config.of ?? config.members
  if (raw == null) {
    fail("invalid_config", `${where}: an array field needs \`of\` — the definition of one item.`)
  }
  const list = Array.isArray(raw) ? raw : [raw]
  if (list.length === 0) {
    fail("invalid_config", `${where}: an array field needs at least one member type in \`of\`.`)
  }

  const seen = new Set()
  return list.map((member, index) => {
    const draft = typeof member === "string" ? { type: member } : member
    const normalized = defineField(
      // A member is a field without a name in most schemas; the type name is a
      // sane default and doubles as the `_type` tag for polymorphic arrays.
      { name: draft?.name ?? draft?.type, title: draft?.title, ...draft },
      { where: at(where, `of[${index}]`), isArrayMember: true },
    )
    if (seen.has(normalized.name)) {
      fail("invalid_config", `${where}: duplicate member name "${normalized.name}" in \`of\`.`)
    }
    seen.add(normalized.name)
    return normalized
  })
}

/**
 * A rule the field type cannot evaluate is a bug, not a no-op. `.integer()` on a
 * string or `.unique()` on a boolean would otherwise pass forever and quietly
 * mean nothing, which is the worst outcome for a validation layer.
 */
function assertRulesApply(field, entry, where) {
  for (const spec of field.rules) {
    if (!entry.supports.includes(spec.flag)) {
      fail(
        "invalid_rule",
        `${where}: rule .${spec.flag}() does not apply to type "${field.type}". ` +
          `Supported here: ${entry.supports.join(", ")}.`,
        { rule: spec.flag, type: field.type },
      )
    }
    if (spec.flag === "min" || spec.flag === "max" || spec.flag === "length") {
      if (!entry.measure) {
        fail("invalid_rule", `${where}: type "${field.type}" has no measure, so .${spec.flag}() cannot be checked.`)
      }
      if (entry.measure.bound(spec.bound) === null) {
        fail(
          "invalid_rule",
          `${where}: .${spec.flag}(${JSON.stringify(spec.bound)}) is not a valid bound for type "${field.type}" ` +
            `(measured in ${entry.measure.unit}).`,
        )
      }
    }
  }
}
