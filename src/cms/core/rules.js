/**
 * The validation rule builder.
 *
 * Two properties are load-bearing:
 *
 * 1. **Pure.** A rule is a description of a check, not the check itself. Nothing
 *    here reads a database, resolves a reference or awaits anything. A rule can
 *    therefore run in the browser on every keystroke and on the server on every
 *    write, from the same declaration, with the same answer.
 *
 * 2. **Immutable.** Every method returns a new rule. `rule.required().min(2)` is
 *    a chain of three objects, not one mutated object, so a rule can be shared
 *    between fields or held in a module constant without spooky action.
 *
 * Rules know nothing about field types. What "min 10" *means* — ten characters,
 * ten items, the number ten, a date floor — is supplied by the field type's
 * `measure` (see fieldTypes.js). That is why there is no switch on type name in
 * this file, and why adding a field type does not mean editing it.
 */
import { CmsSchemaError, fail } from "./errors.js"

export const RULE_FLAGS = Object.freeze([
  "required",
  "min",
  "max",
  "length",
  "regex",
  "email",
  "url",
  "integer",
  "positive",
  "unique",
  "custom",
])

// Pragmatic, not RFC 5322. Rejecting a deliverable address is worse than
// accepting an undeliverable one — the confirmation mail is the real check.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

class Rule {
  constructor(specs = []) {
    this.specs = Object.freeze(specs)
    Object.freeze(this)
  }

  _with(spec) {
    return guard(new Rule([...this.specs, Object.freeze(spec)]))
  }

  has(flag) {
    return this.specs.some((spec) => spec.flag === flag)
  }

  required(message) {
    return this._with({ flag: "required", message })
  }

  min(bound, message) {
    return this._with({ flag: "min", bound, message })
  }

  max(bound, message) {
    return this._with({ flag: "max", bound, message })
  }

  length(bound, message) {
    return this._with({ flag: "length", bound, message })
  }

  regex(pattern, message) {
    if (!(pattern instanceof RegExp)) {
      fail("invalid_rule", `regex() expects a RegExp, received ${typeof pattern}.`)
    }
    // A /g regex carries `lastIndex` between calls, so `.test()` alternates
    // true/false on the same input. Strip the flag: rules must be pure.
    const flags = pattern.flags.replace(/[gy]/g, "")
    return this._with({ flag: "regex", pattern: new RegExp(pattern.source, flags), message })
  }

  email(message) {
    return this._with({ flag: "email", message })
  }

  url(message, options = {}) {
    return this._with({ flag: "url", message, options })
  }

  integer(message) {
    return this._with({ flag: "integer", message })
  }

  positive(message) {
    return this._with({ flag: "positive", message })
  }

  unique(message) {
    return this._with({ flag: "unique", message })
  }

  custom(test, message) {
    if (typeof test !== "function") {
      fail("invalid_rule", `custom() expects a function, received ${typeof test}.`)
    }
    return this._with({ flag: "custom", test, message })
  }
}

/**
 * Rule names that other validation libraries use for the same idea. The eleven
 * in RULE_FLAGS are the contract; these exist only to make the mistake legible,
 * because `rule.max(2).matches is not a function` says nothing about the fix and
 * three people are writing schemas against this API at once.
 */
const NEAR_MISSES = {
  matches: "regex",
  pattern: "regex",
  test: "custom",
  uri: "url",
  notEmpty: "required",
  greaterThan: "min",
  lessThan: "max",
  size: "length",
  distinct: "unique",
}

// Property reads a host may make on any object; answering them is not our business.
const PASS_THROUGH = new Set(["then", "toJSON", "inspect", "nodeType", "$$typeof"])

const guard = (rule) =>
  new Proxy(rule, {
    get(target, property, receiver) {
      if (typeof property === "symbol" || property in target || PASS_THROUGH.has(property)) {
        return Reflect.get(target, property, receiver)
      }
      const suggestion = NEAR_MISSES[property] ? ` Did you mean .${NEAR_MISSES[property]}()?` : ""
      fail("invalid_rule", `there is no rule .${String(property)}().${suggestion} Available: ${RULE_FLAGS.join(", ")}.`, {
        rule: String(property),
      })
    },
  })

export function createRule() {
  return guard(new Rule())
}

export function isRule(value) {
  return value instanceof Rule
}

/**
 * Turn a field's `validation` into a flat list of rule specs.
 *
 * Accepts the spec's form — `(rule) => rule.required()` — plus a bare rule and
 * an array of rules, because Sanity muscle memory produces both and neither is
 * ambiguous. Returning nothing is a bug (the chain was built and dropped), so
 * that throws rather than silently validating nothing.
 */
export function resolveValidation(validation, where) {
  if (validation == null) return []
  if (isRule(validation)) return [...validation.specs]
  if (Array.isArray(validation)) return validation.flatMap((entry) => resolveValidation(entry, where))

  if (typeof validation !== "function") {
    fail("invalid_rule", `${where}: validation must be a function, received ${typeof validation}.`)
  }

  const produced = validation(createRule())
  if (produced == null) {
    fail(
      "invalid_rule",
      `${where}: the validation function returned nothing. Rules are immutable — return the chain, ` +
        `e.g. (rule) => rule.required().min(2).`,
    )
  }
  if (Array.isArray(produced)) return produced.flatMap((entry) => resolveValidation(entry, where))
  if (!isRule(produced)) {
    fail("invalid_rule", `${where}: the validation function must return a rule, received ${typeof produced}.`)
  }
  return [...produced.specs]
}

/* --------------------------------------------------------------- evaluation -- */

const stableStringify = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`
}

const asNumber = (value) => (typeof value === "number" ? value : Number(value))

const parseUrl = (raw, options) => {
  const value = String(raw).trim()
  const { schemes = ["http", "https"], allowRelative = true } = options ?? {}
  // Site-internal hrefs are legitimate content, and `new URL("/kontakt")` throws.
  if (allowRelative && (value.startsWith("/") || value.startsWith("#"))) return true
  try {
    const parsed = new URL(value)
    return schemes.includes(parsed.protocol.replace(":", ""))
  } catch {
    return false
  }
}

/**
 * One entry per flag. Each returns `null` when the value passes, or a default
 * message when it fails. `required` is absent: emptiness is decided by the field
 * type's `isEmpty`, and the engine gates on it before any rule runs.
 */
const TESTS = {
  // The value and the bound are both read through the field type's measure, so
  // `min(10)` on a string and `min("2026-01-01")` on a date compare in whatever
  // space that type counts in. A value the measure cannot read (null) passes:
  // shape errors are `check`'s job and reporting both would say it twice.
  min: (spec, value, ctx) => {
    const size = ctx.measure.value(value, ctx.field)
    const limit = ctx.measure.bound(spec.bound)
    if (size === null || limit === null || size >= limit) return null
    return ctx.measure.message("min", spec.bound)
  },
  max: (spec, value, ctx) => {
    const size = ctx.measure.value(value, ctx.field)
    const limit = ctx.measure.bound(spec.bound)
    if (size === null || limit === null || size <= limit) return null
    return ctx.measure.message("max", spec.bound)
  },
  length: (spec, value, ctx) => {
    const size = ctx.measure.value(value, ctx.field)
    const limit = ctx.measure.bound(spec.bound)
    if (size === null || limit === null || size === limit) return null
    return ctx.measure.message("length", spec.bound)
  },
  regex: (spec, value) => (spec.pattern.test(String(value)) ? null : "Neplatný formát."),
  email: (spec, value) => (EMAIL_PATTERN.test(String(value).trim()) ? null : "Neplatná e-mailová adresa."),
  url: (spec, value) => (parseUrl(value, spec.options) ? null : "Neplatná adresa odkazu."),
  integer: (spec, value) => (Number.isInteger(asNumber(value)) ? null : "Musí být celé číslo."),
  positive: (spec, value) => (asNumber(value) > 0 ? null : "Musí být kladné číslo."),
  unique: (spec, value) => {
    if (!Array.isArray(value)) return null
    const seen = new Set(value.map(stableStringify))
    return seen.size === value.length ? null : "Položky se nesmí opakovat."
  },
  custom: (spec, value, ctx) => {
    const verdict = spec.test(value, ctx)
    if (verdict && typeof verdict.then === "function") {
      throw new CmsSchemaError(
        `[cms/core] ${ctx.path || ctx.field.name}: custom() returned a promise. Rules are synchronous and ` +
          `must not touch the network — do async checks in the server layer.`,
        { code: "async_rule", path: ctx.path },
      )
    }
    if (verdict === true || verdict === undefined || verdict === null) return null
    if (typeof verdict === "string") return verdict
    return "Neplatná hodnota."
  },
}

/**
 * Run one field's rules against one value.
 *
 * Order is deliberate: `required` first, and if the value is empty every other
 * rule is skipped. An untouched optional field must not shout "at least 10
 * characters" at an editor who never intended to fill it in.
 */
export function runRules(specs, value, ctx) {
  const errors = []
  const empty = ctx.isEmpty(value, ctx.field)

  for (const spec of specs) {
    if (spec.flag === "required") {
      if (empty) errors.push(makeError(spec, "Povinné pole.", value, ctx))
      continue
    }
    if (empty) continue

    const failure = TESTS[spec.flag]?.(spec, value, ctx)
    if (failure) errors.push(makeError(spec, failure, value, ctx))
  }

  return errors
}

function makeError(spec, fallback, value, ctx) {
  const custom = typeof spec.message === "function" ? spec.message(value, ctx) : spec.message
  return {
    path: ctx.path,
    message: custom || fallback,
    rule: spec.flag,
    field: ctx.field.name,
    type: ctx.field.type,
  }
}

/** Cheap, UI-facing digest of a rule chain. See defineField for why. */
export function summarizeRules(specs) {
  const summary = { required: false, min: null, max: null, length: null, pattern: null, integer: false, positive: false, unique: false }
  for (const spec of specs) {
    if (spec.flag === "required") summary.required = true
    else if (spec.flag === "min") summary.min = spec.bound
    else if (spec.flag === "max") summary.max = spec.bound
    else if (spec.flag === "length") summary.length = spec.bound
    else if (spec.flag === "regex") summary.pattern = spec.pattern
    else if (spec.flag === "integer") summary.integer = true
    else if (spec.flag === "positive") summary.positive = true
    else if (spec.flag === "unique") summary.unique = true
  }
  return Object.freeze(summary)
}
