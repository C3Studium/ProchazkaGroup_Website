/**
 * The field-type registry.
 *
 * One entry per member of `FIELD_TYPES`. An entry answers four questions, and
 * every other file in this folder is written against those four answers rather
 * than against type names:
 *
 *   zero / isEmpty   what the field holds in an empty document, and what counts
 *                    as "not filled in" — the only definition of emptiness
 *                    `required` ever consults
 *   check            is this value even the right shape for this type
 *   measure          what min/max/length mean here: characters, items, the
 *                    number itself, a point in time
 *   ui               the props the editor needs to render the field
 *
 * Two consequences worth stating, because they are the point of the design:
 *
 *   - `rules.js` contains no switch on type name. `min(10)` on a string, an
 *     array, a rating and a date all run the same three lines of code, because
 *     the type supplied the measure.
 *   - The Studio does not switch on type name either. It looks up
 *     `field.ui.input` in its own component registry and spreads `field.ui` as
 *     props. Adding a field type is: add an entry here, add a component there.
 *
 * `enter` is how nesting works: it turns a container value into child
 * (key, field, value) triples, so validation and path building stay generic and
 * `array`/`object` are not special-cased in the engine.
 */
import { fail } from "./errors.js"

/* -------------------------------------------------------------- primitives -- */

const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value)
const isFilledString = (value) => typeof value === "string" && value.trim() !== ""

/** Blank for everything that is not a container. Containers override. */
const blank = (value) => value === undefined || value === null || value === "" || (typeof value === "string" && value.trim() === "")

/**
 * richText and slug accept more than one shape on the way in (see README —
 * lenient where the spec is silent). Reading them goes through these.
 */
const plainText = (value) => {
  if (typeof value === "string") return value
  if (!Array.isArray(value)) return ""
  return value
    .map((block) => {
      if (typeof block === "string") return block
      if (Array.isArray(block?.children)) return block.children.map((span) => (typeof span?.text === "string" ? span.text : "")).join("")
      return typeof block?.text === "string" ? block.text : ""
    })
    .join("\n")
}

const slugText = (value) => (isPlainObject(value) ? String(value.current ?? "") : typeof value === "string" ? value : "")

// An author writing to a 1200 character limit means 1200 characters of prose.
// Counting `<strong>` against them would be a bug they cannot see.
const richPlain = (value) => (typeof value === "string" ? value.replace(/<[^>]*>/g, "") : plainText(value))

/* ----------------------------------------------------------------- measures -- */

/**
 * Czech needs three forms for a count. Getting "2 znaků" in front of an editor
 * is the kind of small wrongness that makes a tool feel unfinished.
 */
const plural = (count, [one, few, many]) => {
  const n = Math.abs(count)
  if (n === 1) return one
  if (n >= 2 && n <= 4) return few
  return many
}

const numericBound = (bound) => (typeof bound === "number" && Number.isFinite(bound) ? bound : null)

const CHARACTERS = Object.freeze({
  unit: "characters",
  value: (value, field) => (field?.type === "slug" ? slugText(value).length : plainText(value).length),
  bound: numericBound,
  message: (flag, bound) => {
    const noun = plural(bound, ["znak", "znaky", "znaků"])
    if (flag === "min") return `Musí mít alespoň ${bound} ${noun}.`
    if (flag === "max") return `Může mít nejvýše ${bound} ${noun}.`
    return `Musí mít přesně ${bound} ${noun}.`
  },
})

const RICH_TEXT = Object.freeze({ ...CHARACTERS, value: (value) => richPlain(value).length })

const ITEMS = Object.freeze({
  unit: "items",
  value: (value) => (Array.isArray(value) ? value.length : null),
  bound: numericBound,
  message: (flag, bound) => {
    const noun = plural(bound, ["položku", "položky", "položek"])
    if (flag === "min") return `Musí obsahovat alespoň ${bound} ${noun}.`
    if (flag === "max") return `Může obsahovat nejvýše ${bound} ${noun}.`
    return `Musí obsahovat přesně ${bound} ${noun}.`
  },
})

const MAGNITUDE = Object.freeze({
  unit: "value",
  value: (value) => (typeof value === "number" && Number.isFinite(value) ? value : null),
  bound: numericBound,
  message: (flag, bound) => {
    if (flag === "min") return `Musí být alespoň ${bound}.`
    if (flag === "max") return `Může být nejvýše ${bound}.`
    return `Musí být přesně ${bound}.`
  },
})

/**
 * Dates measure as instants, so `min("2026-01-01")` reads naturally and the
 * comparison happens in epoch milliseconds. The bound is coerced through the
 * same door as the value, which is what keeps rules.js type-blind.
 */
const instant = (render) =>
  Object.freeze({
    unit: "instant",
    value: (value) => {
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? null : parsed
    },
    bound: (bound) => {
      if (bound instanceof Date) return bound.getTime()
      if (typeof bound === "number" && Number.isFinite(bound)) return bound
      const parsed = Date.parse(bound)
      return Number.isNaN(parsed) ? null : parsed
    },
    message: (flag, bound) => {
      const shown = render(bound)
      if (flag === "min") return `Nesmí být dříve než ${shown}.`
      if (flag === "max") return `Nesmí být později než ${shown}.`
      return `Musí být přesně ${shown}.`
    },
  })

const DAY = instant((bound) => String(bound).slice(0, 10))
const MOMENT = instant((bound) => String(bound).replace("T", " ").slice(0, 16))

/* ---------------------------------------------------------------- ui helper -- */

/**
 * Keys every `ui` object carries. Generic Studio code — the field wrapper, the
 * group tabs, the grid — reads only these. Everything a type adds beyond them is
 * props for the one component that `input` names, so the two never collide.
 */
const baseUi = (entry, field, extra = {}) => ({
  input: entry.input,
  kind: entry.kind,
  name: field.name,
  title: field.title,
  description: field.description ?? "",
  placeholder: field.options.placeholder ?? "",
  width: field.options.width ?? "full",
  children: "none",
  required: field.constraints.required,
  ...extra,
})

const textUi = (entry, field, extra) =>
  baseUi(entry, field, {
    htmlType: "text",
    inputMode: "text",
    autoComplete: "off",
    spellCheck: true,
    mono: field.options.mono === true,
    // Rules imply an input's limits; an explicit option overrides them. Same
    // precedence as number's min/max/step below.
    maxLength: field.options.maxLength ?? field.constraints.max,
    minLength: field.options.minLength ?? field.constraints.min,
    pattern: field.constraints.pattern ? field.constraints.pattern.source : null,
    ...extra,
  })

/* ------------------------------------------------------------------ entries -- */

const definitions = [
  {
    name: "string",
    title: "Krátký text",
    kind: "text",
    input: "string",
    scalar: true,
    zero: () => "",
    check: (value) => (typeof value === "string" ? null : "Očekáván text."),
    measure: CHARACTERS,
    supports: ["min", "max", "length", "regex", "email", "url"],
    ui: (entry, field) => textUi(entry, field),
    toDisplay: (value) => String(value ?? ""),
  },
  {
    name: "text",
    title: "Delší text",
    kind: "text",
    input: "text",
    scalar: true,
    options: { rows: 4 },
    zero: () => "",
    check: (value) => (typeof value === "string" ? null : "Očekáván text."),
    measure: CHARACTERS,
    supports: ["min", "max", "length", "regex"],
    ui: (entry, field) => textUi(entry, field, { multiline: true, rows: field.options.rows }),
    toDisplay: (value) => String(value ?? ""),
  },
  {
    name: "richText",
    title: "Formátovaný text",
    kind: "text",
    input: "richText",
    scalar: false,
    // Held as a string (build B's editor binds to one). An array of blocks is
    // accepted too so a portable-text editor can be dropped in later without a
    // core change; both measure as their plain-text length.
    options: { toolbar: ["bold", "italic", "link", "h2", "h3", "ul", "ol"] },
    zero: () => "",
    check: (value) =>
      typeof value === "string" || Array.isArray(value) ? null : "Očekáván formátovaný text.",
    isEmpty: (value) => richPlain(value).trim() === "",
    measure: RICH_TEXT,
    supports: ["min", "max", "length", "regex"],
    ui: (entry, field) =>
      baseUi(entry, field, {
        format: Array.isArray(field.initialValue) ? "blocks" : "html",
        toolbar: field.options.toolbar,
        maxLength: field.options.maxLength ?? field.constraints.max,
      }),
    toDisplay: (value) => richPlain(value),
  },
  {
    name: "number",
    title: "Číslo",
    kind: "number",
    input: "number",
    scalar: true,
    // null, not 0 — an untouched rating and a rating of zero are different
    // answers, and `required` has to be able to tell them apart.
    zero: () => null,
    check: (value) => (typeof value === "number" && Number.isFinite(value) ? null : "Očekáváno číslo."),
    measure: MAGNITUDE,
    supports: ["min", "max", "integer", "positive"],
    ui: (entry, field) =>
      baseUi(entry, field, {
        htmlType: "number",
        inputMode: field.constraints.integer ? "numeric" : "decimal",
        // Explicit options win over what the rules imply, so an author can widen
        // the spinner without weakening validation.
        min: field.options.min ?? field.constraints.min,
        max: field.options.max ?? field.constraints.max,
        step: field.options.step ?? (field.constraints.integer ? 1 : "any"),
      }),
    toDisplay: (value) => (typeof value === "number" ? String(value) : ""),
  },
  {
    name: "boolean",
    title: "Ano / ne",
    kind: "boolean",
    input: "boolean",
    scalar: true,
    zero: () => false,
    check: (value) => (typeof value === "boolean" ? null : "Očekávána hodnota ano/ne."),
    // `false` is an answer, not a blank. A checkbox that must be ticked is
    // `.custom((v) => v === true)`, not `.required()`.
    isEmpty: (value) => value === undefined || value === null,
    supports: [],
    ui: (entry, field) => baseUi(entry, field, { layout: field.options.layout ?? "switch" }),
    toDisplay: (value) => (value === true ? "Ano" : value === false ? "Ne" : ""),
  },
  {
    name: "date",
    title: "Datum",
    kind: "datetime",
    input: "date",
    scalar: true,
    zero: () => null,
    check: (value) =>
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
        ? null
        : "Očekáváno datum ve tvaru RRRR-MM-DD.",
    measure: DAY,
    supports: ["min", "max"],
    ui: (entry, field) => baseUi(entry, field, { withTime: false, min: field.options.min ?? null, max: field.options.max ?? null }),
    toDisplay: (value) => (typeof value === "string" ? value : ""),
  },
  {
    name: "datetime",
    title: "Datum a čas",
    kind: "datetime",
    input: "datetime",
    scalar: true,
    zero: () => null,
    check: (value) =>
      typeof value === "string" && !Number.isNaN(Date.parse(value)) ? null : "Očekáváno datum a čas v ISO 8601.",
    measure: MOMENT,
    supports: ["min", "max"],
    ui: (entry, field) => baseUi(entry, field, { withTime: true, min: field.options.min ?? null, max: field.options.max ?? null }),
    toDisplay: (value) => (typeof value === "string" ? value.replace("T", " ").slice(0, 16) : ""),
  },
  {
    name: "slug",
    title: "URL adresa",
    kind: "text",
    input: "slug",
    scalar: true,
    options: { source: null, prefix: "" },
    // A plain string, matching the Studio's input. `{ current }` is accepted on
    // the way in so Sanity-shaped imports validate rather than explode.
    zero: () => "",
    check: (value) => {
      if (typeof value === "string" || (isPlainObject(value) && typeof value.current === "string")) {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugText(value)) ? null : "Jen malá písmena, číslice a pomlčky."
      }
      return "Očekávána URL adresa."
    },
    isEmpty: (value) => slugText(value).trim() === "",
    measure: CHARACTERS,
    supports: ["min", "max", "length", "regex"],
    ui: (entry, field) =>
      baseUi(entry, field, {
        source: field.options.source,
        prefix: field.options.prefix,
        maxLength: field.options.maxLength ?? field.constraints.max,
      }),
    toDisplay: (value) => slugText(value),
  },
  {
    name: "image",
    title: "Obrázek",
    kind: "asset",
    input: "image",
    scalar: false,
    options: { accept: "image/*", hotspot: false },
    zero: () => null,
    // The asset object Contract 2's `media.upload` returns, kept whole in the
    // document so the public site renders without a second lookup.
    check: (value) => {
      if (typeof value === "string") return isFilledString(value) ? null : "Očekáván obrázek z knihovny médií."
      if (isPlainObject(value) && (isFilledString(value.id) || isFilledString(value.url))) return null
      return "Očekáván obrázek z knihovny médií."
    },
    // Only null is empty. A present object missing its id is corrupt data from a
    // migration, not a cleared field, and saying so is more use than silence.
    supports: [],
    ui: (entry, field) =>
      baseUi(entry, field, { assetKind: "image", accept: field.options.accept, hotspot: field.options.hotspot }),
    toDisplay: (value) => (isPlainObject(value) ? value.alt || value.url || "" : String(value ?? "")),
  },
  {
    name: "file",
    title: "Soubor",
    kind: "asset",
    input: "file",
    scalar: false,
    options: { accept: "*/*" },
    zero: () => null,
    check: (value) => {
      if (typeof value === "string") return isFilledString(value) ? null : "Očekáván soubor z knihovny médií."
      if (isPlainObject(value) && (isFilledString(value.id) || isFilledString(value.url))) return null
      return "Očekáván soubor z knihovny médií."
    },
    supports: [],
    ui: (entry, field) => baseUi(entry, field, { assetKind: "file", accept: field.options.accept }),
    toDisplay: (value) => (isPlainObject(value) ? value.name || value.url || "" : String(value ?? "")),
  },
  {
    name: "reference",
    title: "Odkaz na dokument",
    kind: "relation",
    input: "reference",
    scalar: false,
    zero: () => null,
    // Shape only. Whether the id exists is a database question and this layer
    // never asks one — the server checks referential integrity on write.
    check: (value, field) => {
      if (!isPlainObject(value)) return "Očekáván odkaz ve tvaru { _ref, _type }."
      if (!isFilledString(value._ref)) return "Odkaz nemá vyplněné _ref."
      if (!isFilledString(value._type)) return "Odkaz nemá vyplněné _type."
      if (field.to.length > 0 && !field.to.includes(value._type)) {
        return `Odkaz musí mířit na typ ${field.to.join(" nebo ")}.`
      }
      return null
    },
    // `null` is a cleared reference; an object without `_ref` is a broken one.
    supports: [],
    ui: (entry, field) => baseUi(entry, field, { to: field.to, searchable: true }),
    toDisplay: (value) => (isPlainObject(value) ? String(value._ref ?? "") : ""),
  },
  {
    name: "array",
    title: "Seznam",
    kind: "collection",
    input: "array",
    scalar: false,
    options: { sortable: true, layout: "list" },
    zero: () => [],
    check: (value) => (Array.isArray(value) ? null : "Očekáván seznam."),
    isEmpty: (value) => !Array.isArray(value) || value.length === 0,
    measure: ITEMS,
    supports: ["min", "max", "length", "unique"],
    enter: (value, field) =>
      (Array.isArray(value) ? value : []).map((item, index) => {
        const member = pickMember(field, item)
        return member
          ? { key: String(index), field: member, value: item }
          : { key: String(index), error: `Neznámý typ položky${item?._type ? ` "${item._type}"` : ""}.` }
      }),
    ui: (entry, field) =>
      baseUi(entry, field, {
        children: "members",
        members: field.members,
        polymorphic: field.members.length > 1,
        sortable: field.options.sortable,
        layout: field.options.layout,
        min: field.constraints.min,
        max: field.constraints.max,
      }),
    toDisplay: (value, field) =>
      Array.isArray(value)
        ? value
            .map((item) => {
              const member = pickMember(field, item)
              return member ? getFieldType(member.type).toDisplay(item, member) : ""
            })
            .filter(Boolean)
            .join(", ")
        : "",
  },
  {
    name: "object",
    title: "Skupina polí",
    kind: "record",
    input: "object",
    scalar: false,
    options: { collapsible: true, collapsed: false },
    zero: (field) => {
      const value = {}
      // Members of a polymorphic array carry their type, so the array editor can
      // tell a new item apart without asking the field which one it made.
      if (field.isArrayMember) value._type = field.name
      for (const child of field.fields) value[child.name] = zeroOf(child)
      return value
    },
    check: (value) => (isPlainObject(value) ? null : "Očekávána skupina polí."),
    isEmpty: (value, field) => {
      if (!isPlainObject(value)) return true
      return field.fields.every((child) => getFieldType(child.type).isEmpty(value[child.name], child))
    },
    supports: [],
    // Tolerates a missing value: an empty array item is still walked, so that its
    // required children can report themselves rather than pass by absence.
    enter: (value, field) =>
      field.fields.map((child) => ({ key: child.name, field: child, value: isPlainObject(value) ? value[child.name] : undefined })),
    ui: (entry, field) =>
      baseUi(entry, field, {
        children: "fields",
        fields: field.fields,
        collapsible: field.options.collapsible,
        collapsed: field.options.collapsed,
      }),
    toDisplay: (value, field) => {
      if (!isPlainObject(value)) return ""
      const first = field.fields.find((child) => !getFieldType(child.type).isEmpty(value[child.name], child))
      return first ? getFieldType(first.type).toDisplay(value[first.name], first) : ""
    },
  },
  {
    name: "select",
    title: "Výběr",
    kind: "choice",
    input: "select",
    scalar: true,
    options: { list: [], multiple: false },
    zero: (field) => (field.options.multiple ? [] : null),
    check: (value, field) => {
      const allowed = choicesOf(field).map((choice) => choice.value)
      if (field.options.multiple) {
        if (!Array.isArray(value)) return "Očekáván seznam voleb."
        return value.every((item) => allowed.includes(item)) ? null : "Neplatná volba."
      }
      return allowed.includes(value) ? null : "Neplatná volba."
    },
    isEmpty: (value, field) => (field.options.multiple ? !Array.isArray(value) || value.length === 0 : blank(value)),
    measure: ITEMS,
    supports: ["min", "max", "length", "unique"],
    checkConfig: (field) => {
      if (choicesOf(field).length === 0) return "a select needs a non-empty options.list."
      // Counting rules measure a multi-select's items. On a single select they
      // would never fire, which is a lie the author should hear about now.
      if (!field.options.multiple && field.rules.some((spec) => ["min", "max", "length", "unique"].includes(spec.flag))) {
        return "count rules need options.multiple on a select."
      }
      return null
    },
    ui: (entry, field) => {
      const choices = choicesOf(field)
      return baseUi(entry, field, {
        choices,
        multiple: field.options.multiple,
        // A radio group beyond a handful of options stops being scannable.
        layout: field.options.layout ?? (choices.length > 4 ? "dropdown" : "radio"),
      })
    },
    toDisplay: (value, field) => {
      const choices = choicesOf(field)
      const label = (item) => choices.find((choice) => choice.value === item)?.title ?? String(item ?? "")
      return Array.isArray(value) ? value.map(label).join(", ") : value == null ? "" : label(value)
    },
  },
  {
    name: "url",
    title: "Odkaz",
    kind: "text",
    input: "url",
    scalar: true,
    options: { schemes: ["http", "https"], allowRelative: true },
    zero: () => "",
    check: (value, field) => {
      if (typeof value !== "string") return "Očekávána adresa odkazu."
      const raw = value.trim()
      if (field.options.allowRelative && (raw.startsWith("/") || raw.startsWith("#"))) return null
      try {
        const parsed = new URL(raw)
        return field.options.schemes.includes(parsed.protocol.replace(":", "")) ? null : "Nepodporovaný protokol odkazu."
      } catch {
        return "Neplatná adresa odkazu."
      }
    },
    measure: CHARACTERS,
    supports: ["min", "max", "regex", "url"],
    ui: (entry, field) => textUi(entry, field, { htmlType: "url", inputMode: "url", spellCheck: false }),
    toDisplay: (value) => String(value ?? ""),
  },
  {
    name: "email",
    title: "E-mail",
    kind: "text",
    input: "email",
    scalar: true,
    zero: () => "",
    check: (value) => {
      if (typeof value !== "string") return "Očekávána e-mailová adresa."
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? null : "Neplatná e-mailová adresa."
    },
    measure: CHARACTERS,
    supports: ["min", "max", "regex", "email"],
    ui: (entry, field) =>
      textUi(entry, field, { htmlType: "email", inputMode: "email", autoComplete: "email", spellCheck: false }),
    toDisplay: (value) => String(value ?? ""),
  },
]

/* ----------------------------------------------------------------- registry -- */

const registry = new Map()

/**
 * The keys generic Studio code reads on every field, whatever its type. Enforced
 * rather than documented: a field type that skips one would render as a hole in
 * a form somewhere far away from the entry that caused it.
 */
const REQUIRED_UI_KEYS = ["input", "kind", "name", "title", "children"]

function normalizeEntry(definition) {
  const entry = {
    name: definition.name,
    title: definition.title ?? definition.name,
    kind: definition.kind ?? "text",
    input: definition.input ?? definition.name,
    scalar: definition.scalar ?? true,
    options: Object.freeze({ ...(definition.options ?? {}) }),
    supports: Object.freeze(["required", "custom", ...(definition.supports ?? [])]),
    measure: definition.measure ?? null,
    zero: definition.zero ?? (() => null),
    check: definition.check ?? (() => null),
    isEmpty: definition.isEmpty ?? blank,
    enter: definition.enter ?? null,
    // Optional: reject field declarations this type cannot make sense of, at
    // import time. See `select`, where a missing list is a dead input.
    checkConfig: definition.checkConfig ?? null,
    toDisplay: definition.toDisplay ?? ((value) => (value == null ? "" : String(value))),
    ui: (field) => {
      const ui = definition.ui(entry, field)
      const missing = REQUIRED_UI_KEYS.filter((key) => ui[key] === undefined)
      if (missing.length > 0) {
        fail("invalid_config", `field type "${entry.name}": ui() omitted ${missing.join(", ")}.`, { type: entry.name })
      }
      return Object.freeze(ui)
    },
  }
  return Object.freeze(entry)
}

export function registerFieldType(definition) {
  if (!definition?.name || typeof definition.name !== "string") {
    fail("invalid_config", "registerFieldType() needs a string `name`.")
  }
  if (typeof definition.ui !== "function") {
    fail("invalid_config", `field type "${definition.name}" must declare ui(entry, field) — the Studio renders from it.`)
  }
  if (registry.has(definition.name)) {
    fail("duplicate_field_type", `field type "${definition.name}" is already registered.`, { type: definition.name })
  }
  const entry = normalizeEntry(definition)
  registry.set(entry.name, entry)
  return entry
}

for (const definition of definitions) registerFieldType(definition)

export function getFieldType(name) {
  const entry = registry.get(name)
  if (!entry) {
    fail("unknown_field_type", `unknown field type "${name}". Known: ${[...registry.keys()].join(", ")}.`, { type: name })
  }
  return entry
}

export function hasFieldType(name) {
  return registry.has(name)
}

export function listFieldTypes() {
  return [...registry.values()]
}

export const FIELD_TYPE_NAMES = Object.freeze(definitions.map((definition) => definition.name))

/**
 * `FIELD_TYPES` is keyed by name — `FIELD_TYPES.string.input` — because the spec
 * lists the names but the Studio needs the metadata behind them, and a bare
 * array of strings would have forced it back into switch-casing.
 *
 * Iteration and `.includes()` are provided as non-enumerable extras so the
 * plausible readings of "FIELD_TYPES is the list of field types" all work:
 * `Object.keys(FIELD_TYPES)`, `[...FIELD_TYPES]` and `FIELD_TYPES.includes("slug")`
 * agree, while `Object.values()` stays the 16 metadata entries.
 */
export const FIELD_TYPES = Object.freeze(
  Object.defineProperties(Object.fromEntries([...registry].map(([name, entry]) => [name, entry])), {
    [Symbol.iterator]: { value: () => FIELD_TYPE_NAMES[Symbol.iterator](), enumerable: false },
    includes: { value: (name) => registry.has(name), enumerable: false },
    length: { value: FIELD_TYPE_NAMES.length, enumerable: false },
  }),
)

/* ------------------------------------------------------------------ helpers -- */

/** Which member definition an array item belongs to. */
export function pickMember(field, item) {
  const members = field.members ?? []
  if (members.length === 0) return null
  if (members.length === 1) return members[0]
  const tag = item?._type
  return members.find((member) => member.name === tag || member.type === tag) ?? null
}

export function choicesOf(field) {
  return (field.options.list ?? []).map((choice) =>
    isPlainObject(choice) ? { value: choice.value, title: choice.title ?? String(choice.value) } : { value: choice, title: String(choice) },
  )
}

/**
 * The zero value of one field. `initialValue` wins over the type's zero, so a
 * new document can arrive pre-filled ("approved: false", "publishedAt: today")
 * without the Studio knowing which fields those are.
 */
export function zeroOf(field) {
  if (field.initialValue !== undefined) {
    return typeof field.initialValue === "function" ? field.initialValue() : structuredCloneish(field.initialValue)
  }
  return getFieldType(field.type).zero(field)
}

export function isEmptyValue(field, value) {
  return getFieldType(field.type).isEmpty(value, field)
}

// A frozen initialValue must not become shared mutable state across documents.
function structuredCloneish(value) {
  if (value === null || typeof value !== "object") return value
  return JSON.parse(JSON.stringify(value))
}
