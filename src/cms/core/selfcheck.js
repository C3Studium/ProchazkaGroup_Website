/**
 * Self-check for the core schema layer. Run it with `node src/cms/core/selfcheck.js`.
 *
 * Not a test suite and not a substitute for one — no framework, no dependency,
 * no watch mode. It exists because this folder is consumed by two builds that
 * cannot run it themselves yet, so the claims it makes are the claims those
 * builds are relying on: paths through nested arrays, zero values, what fails
 * loudly, and that the field declarations already written against this API in
 * `studio/dev/devCore.js` normalise without complaint.
 */
import {
  defineType,
  defineField,
  getType,
  findType,
  listTypes,
  clearTypes,
  validateDocument,
  validateValue,
  emptyDocument,
  emptyValue,
  getFieldType,
  listFieldTypes,
  registerFieldType,
  createRule,
  FIELD_TYPES,
  FIELD_TYPE_NAMES,
  CmsSchemaError,
} from "./index.js"

let checks = 0
let failures = 0

const ok = (label, condition, detail) => {
  checks += 1
  if (condition) return
  failures += 1
  console.error(`  FAIL  ${label}${detail === undefined ? "" : `\n        ${detail}`}`)
}

const eq = (label, actual, expected) =>
  ok(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)

const throws = (label, fn, codeOrFragment) => {
  checks += 1
  try {
    fn()
  } catch (error) {
    const matched =
      error instanceof CmsSchemaError
        ? error.code === codeOrFragment || error.message.includes(codeOrFragment)
        : String(error.message).includes(codeOrFragment)
    if (matched) return
    failures += 1
    console.error(`  FAIL  ${label}\n        threw ${error.name}(${error.code}): ${error.message}`)
    return
  }
  failures += 1
  console.error(`  FAIL  ${label}\n        did not throw`)
}

const section = (title) => console.log(`\n${title}`)
const pathsOf = (result) => result.errors.map((error) => error.path)

/* ------------------------------------------------------ representative types -- */

// Field declarations copied in style from build B's stub schemas: `of` as a
// single object, reference targets under `options.to`, select lists, rules that
// duplicate what options already say.
defineType({
  name: "consultant",
  title: "Konzultanti",
  icon: "user",
  groups: [
    { name: "profil", title: "Profil" },
    { name: "kontakt", title: "Kontakt" },
  ],
  fields: [
    { name: "name", title: "Jméno", type: "string", group: "profil", validation: (rule) => rule.required().min(3).max(80) },
    { name: "slug", title: "URL adresa", type: "slug", group: "profil", options: { source: "name", prefix: "/o-nas/" }, validation: (rule) => rule.required() },
    { name: "photo", title: "Fotografie", type: "image", group: "profil" },
    { name: "bio", title: "Medailonek", type: "richText", group: "profil", validation: (rule) => rule.max(1200) },
    { name: "specialisations", title: "Specializace", type: "array", group: "profil", of: { name: "item", type: "string" }, validation: (rule) => rule.max(4).unique() },
    { name: "email", title: "E-mail", type: "email", group: "kontakt", validation: (rule) => rule.required().email() },
    { name: "linkedin", title: "LinkedIn", type: "url", group: "kontakt" },
    { name: "order", title: "Pořadí", type: "number", group: "profil", validation: (rule) => rule.integer().positive() },
    { name: "startedOn", title: "Nástup", type: "date", group: "profil", validation: (rule) => rule.min("2010-01-01") },
    { name: "featured", title: "Vypíchnout", type: "boolean", group: "profil" },
    { name: "note", title: "Poznámka", type: "text", group: "kontakt", hidden: (doc) => !doc.featured, validation: (rule) => rule.required().min(5) },
  ],
  preview: (doc) => ({ title: doc.name, subtitle: doc.email, media: doc.photo }),
  orderings: [{ name: "order", title: "Ruční pořadí", by: [{ field: "order", direction: "asc" }] }],
})

// Nesting: an object with fields, an array of objects, and an array inside one
// of those objects — three levels, which is where path building usually breaks.
defineType({
  name: "offer",
  title: "Nabídky",
  fields: [
    { name: "title", title: "Název", type: "string", validation: (rule) => rule.required().min(3).max(120) },
    { name: "service", title: "Služba", type: "select", options: { list: [{ value: "hypoteka", title: "Hypotéka" }, { value: "investice", title: "Investice" }] }, validation: (rule) => rule.required() },
    { name: "tags", title: "Štítky", type: "select", options: { multiple: true, list: ["novinka", "akce", "tip"] }, validation: (rule) => rule.max(2) },
    { name: "consultant", title: "Konzultant", type: "reference", options: { to: ["consultant"] } },
    { name: "cover", title: "Titulní obrázek", type: "image" },
    { name: "attachment", title: "Příloha", type: "file" },
    { name: "publishedAt", title: "Publikováno", type: "datetime" },
    {
      name: "cta",
      title: "Tlačítko",
      type: "object",
      fields: [
        { name: "label", title: "Popisek", type: "string", validation: (rule) => rule.required() },
        { name: "href", title: "Odkaz", type: "url" },
      ],
    },
    {
      name: "sections",
      title: "Sekce",
      type: "array",
      validation: (rule) => rule.required().max(3),
      of: {
        name: "section",
        title: "Sekce",
        type: "object",
        fields: [
          { name: "heading", title: "Nadpis", type: "string", validation: (rule) => rule.required().min(3) },
          { name: "bullets", title: "Body", type: "array", of: { name: "bullet", type: "string", validation: (rule) => rule.min(5) } },
        ],
      },
    },
  ],
})

/* ---------------------------------------------------------------------------- */

section("field type registry")
{
  eq("every FIELD_TYPES entry from the spec is present", FIELD_TYPE_NAMES.length, 16)
  ok("keyed access carries metadata", FIELD_TYPES.string.input === "string" && FIELD_TYPES.image.kind === "asset")
  ok("membership test works", FIELD_TYPES.includes("slug") && !FIELD_TYPES.includes("nope"))
  eq("iteration yields names", [...FIELD_TYPES].slice(0, 3), ["string", "text", "richText"])
  eq("enumerable keys are exactly the type names", Object.keys(FIELD_TYPES).length, 16)

  const incomplete = listFieldTypes().filter(
    (entry) => typeof entry.zero !== "function" || typeof entry.check !== "function" || typeof entry.isEmpty !== "function" || typeof entry.ui !== "function",
  )
  eq("every entry declares zero / check / isEmpty / ui", incomplete.map((entry) => entry.name), [])

  const probe = (type, extra = {}) => defineField({ name: "probe", type, ...extra }).ui
  const uiFor = FIELD_TYPE_NAMES.map((name) => {
    if (name === "object") return probe(name, { fields: [{ name: "inner", type: "string" }] })
    if (name === "array") return probe(name, { of: { name: "item", type: "string" } })
    if (name === "select") return probe(name, { options: { list: ["a"] } })
    return probe(name)
  })
  ok("every ui object names an input and a kind", uiFor.every((ui) => typeof ui.input === "string" && typeof ui.kind === "string"))
  ok("every ui object declares whether it has children", uiFor.every((ui) => ["none", "fields", "members"].includes(ui.children)))
  eq("inputs collapse types that share a control", new Set(uiFor.map((ui) => ui.kind)).size, 9)
}

section("field metadata the Studio renders from")
{
  const consultant = getType("consultant")
  const name = consultant.fieldsByName.name
  eq("required is hoisted for the label", name.required, true)
  eq("rule bounds reach the input as maxLength", name.ui.maxLength, 80)
  eq(
    "an explicit option beats the bound the rules imply",
    defineField({ name: "slug", type: "slug", options: { source: "name", maxLength: 96 }, validation: (rule) => rule.max(200) }).ui.maxLength,
    96,
  )
  eq("groups are derived into tabs with a default", consultant.groups, [
    { name: "profil", title: "Profil", default: true },
    { name: "kontakt", title: "Kontakt", default: false },
  ])

  const order = consultant.fieldsByName.order
  eq("integer rules reach the number input as a step", order.ui.step, 1)
  eq("select choices are normalised from bare strings", getType("offer").fieldsByName.tags.ui.choices[0], { value: "novinka", title: "novinka" })
  eq("reference targets are lifted out of options", getType("offer").fieldsByName.consultant.to, ["consultant"])
  eq("array members are always an array", consultant.fieldsByName.specialisations.members.length, 1)
  ok("`of` stays an object for single-member arrays (build B reads it)", consultant.fieldsByName.specialisations.of.type === "string")
  eq("type defaults merge into options", getType("offer").fieldsByName.cover.ui.accept, "image/*")
  ok("field descriptors are frozen", Object.isFrozen(name))
}

section("empty documents")
{
  const empty = emptyDocument("consultant")
  eq("zero values per the type registry", empty, {
    name: "",
    slug: "",
    photo: null,
    bio: "",
    specialisations: [],
    email: "",
    linkedin: "",
    order: null,
    startedOn: null,
    featured: false,
    note: "",
  })
  eq("an empty document has no shape errors", validateDocument("consultant", empty).errors.filter((error) => error.rule === "type"), [])
  eq("an empty object field zeroes its children", emptyValue(getType("offer").fieldsByName.cta), { label: "", href: "" })
  eq("array members zero individually", emptyValue(getType("offer").fieldsByName.sections.of), { _type: "section", heading: "", bullets: [] })
  ok("emptyDocument returns a fresh object each call", emptyDocument("consultant") !== emptyDocument("consultant"))
}

section("a good document validates")
{
  const result = validateDocument("consultant", {
    name: "Jan Novák",
    slug: "jan-novak",
    photo: { id: "asset-1", url: "https://cdn.example.com/jan.jpg" },
    bio: "<p>Patnáct let v hypotékách.</p>",
    specialisations: ["hypotéky", "investice"],
    email: "jan@prochazkagroup.cz",
    linkedin: "/kontakt",
    order: 3,
    startedOn: "2015-04-01",
    featured: false,
    note: "",
  })
  eq("no errors", result, { ok: true, errors: [] })
}

section("a bad document reports dotted paths")
{
  const result = validateDocument("consultant", {
    name: "Ja",
    slug: "Jan Novák!",
    bio: "x".repeat(1201),
    specialisations: ["a", "a", "b", "c", "d"],
    email: "jan(at)example.com",
    linkedin: "not a url",
    order: 2.5,
    startedOn: "2009-12-31",
    featured: true,
    note: "krát",
  })
  ok("required slug with a bad shape reports its own message", result.errors.some((error) => error.path === "slug" && error.rule === "type"))
  eq("string min", result.errors.find((error) => error.path === "name")?.message, "Musí mít alespoň 3 znaky.")
  eq("richText measures its plain text", result.errors.find((error) => error.path === "bio")?.message, "Může mít nejvýše 1200 znaků.")
  eq(
    "array rules report on the array itself",
    result.errors.filter((error) => error.path === "specialisations").map((error) => error.message),
    ["Může obsahovat nejvýše 4 položky.", "Položky se nesmí opakovat."],
  )
  eq("email type checks format without a rule", result.errors.find((error) => error.path === "email")?.rule, "type")
  eq("url type rejects a non-url", result.errors.find((error) => error.path === "linkedin")?.rule, "type")
  eq("integer", result.errors.find((error) => error.path === "order")?.message, "Musí být celé číslo.")
  eq("date bounds compare as instants", result.errors.find((error) => error.path === "startedOn")?.message, "Nesmí být dříve než 2010-01-01.")
  ok("a field revealed by `hidden` is validated", result.errors.some((error) => error.path === "note" && error.rule === "min"))
}

section("nested paths carry array indices")
{
  const result = validateDocument("offer", {
    title: "Hypotéka",
    service: "leasing",
    tags: ["novinka", "akce", "tip"],
    consultant: { _ref: "id-1", _type: "partner" },
    cta: { label: "", href: "https://prochazkagroup.cz" },
    sections: [
      { _type: "section", heading: "První", bullets: ["dost dlouhé", "krát"] },
      { _type: "section", heading: "OK", bullets: [] },
    ],
  })

  eq("every failing path, in document order", pathsOf(result), [
    "service",
    "tags",
    "consultant",
    "cta.label",
    "sections.0.bullets.1",
    "sections.1.heading",
  ])
  eq("a bad choice is a type error", result.errors.find((error) => error.path === "service")?.message, "Neplatná volba.")
  eq(
    "a reference is checked for shape and target only",
    result.errors.find((error) => error.path === "consultant")?.message,
    "Odkaz musí mířit na typ consultant.",
  )
  eq("nested object field", result.errors.find((error) => error.path === "cta.label")?.message, "Povinné pole.")
  eq("array item inside an array item", result.errors.find((error) => error.path === "sections.0.bullets.1")?.rule, "min")

  // An untouched optional group must not demand its own children — the editor
  // never opened it. Fill any one of its fields and the rest start counting.
  const missing = validateDocument("offer", { title: "Hypotéka", service: "hypoteka", sections: [] })
  eq("an empty required array fails on the array, not its items", pathsOf(missing), ["sections"])
  eq(
    "an untouched optional object stays quiet, a partly filled one does not",
    pathsOf(validateDocument("offer", { title: "Hypotéka", service: "hypoteka", sections: [{ heading: "Ano" }], cta: { href: "/kontakt" } })),
    ["cta.label"],
  )

  const notAnArray = validateDocument("offer", { title: "Hypotéka", service: "hypoteka", cta: { label: "Chci" }, sections: "nope" })
  eq("a wrong container shape reports once, at its own path", pathsOf(notAnArray), ["sections"])
}

section("references are never resolved")
{
  const field = getType("offer").fieldsByName.consultant
  eq("a well-formed reference to an unknown id passes", validateValue(field, { _ref: "does-not-exist", _type: "consultant" }).ok, true)
  eq("missing _ref fails", validateValue(field, { _type: "consultant" }).errors[0].message, "Odkaz nemá vyplněné _ref.")
  eq("a bare id fails", validateValue(field, "id-1").errors[0].message, "Očekáván odkaz ve tvaru { _ref, _type }.")
}

section("emptiness rules")
{
  const field = (config) => defineField(config)
  eq("0 is a filled number", validateValue(field({ name: "n", type: "number", validation: (rule) => rule.required() }), 0).ok, true)
  eq("null is not", validateValue(field({ name: "n", type: "number", validation: (rule) => rule.required() }), null).ok, false)
  eq("false is a filled boolean", validateValue(field({ name: "b", type: "boolean", validation: (rule) => rule.required() }), false).ok, true)
  eq("whitespace is not filled text", validateValue(field({ name: "s", type: "string", validation: (rule) => rule.required() }), "   ").ok, false)
  eq(
    "optional fields stay quiet when untouched",
    validateValue(field({ name: "s", type: "string", validation: (rule) => rule.min(10) }), "").ok,
    true,
  )
}

section("rules are pure")
{
  const base = createRule().required()
  const branch = base.min(2)
  eq("chaining does not mutate the source rule", base.specs.length, 1)
  eq("the chain accumulates", branch.specs.length, 2)

  const global = defineField({ name: "s", type: "string", validation: (rule) => rule.regex(/^[a-z]+$/g) })
  const first = validateValue(global, "abc").ok
  const second = validateValue(global, "abc").ok
  ok("a /g pattern does not alternate between calls", first === true && second === true)

  throws(
    "a custom rule that returns a promise fails loudly",
    () => validateValue(defineField({ name: "s", type: "string", validation: (rule) => rule.custom(async () => true) }), "x"),
    "async_rule",
  )
  eq(
    "a custom rule may return its own message",
    validateValue(defineField({ name: "s", type: "string", validation: (rule) => rule.custom((v) => (v === "ok" ? true : "Musí být ok.")) }), "no").errors[0].message,
    "Musí být ok.",
  )
}

section("config errors fail loudly")
{
  throws("duplicate type name", () => defineType({ name: "consultant", fields: [{ name: "a", type: "string" }] }), "duplicate_type")
  throws("unknown type name", () => getType("nope"), "unknown_type")
  throws("unknown field type", () => defineField({ name: "a", type: "wysiwyg" }), "unknown_field_type")
  throws("duplicate field name", () => defineType({ name: "dupes", fields: [{ name: "a", type: "string" }, { name: "a", type: "text" }] }), "duplicate field name")
  throws("a rule the type cannot evaluate", () => defineField({ name: "a", type: "boolean", validation: (rule) => rule.min(2) }), "invalid_rule")
  throws("integer on a string", () => defineField({ name: "a", type: "string", validation: (rule) => rule.integer() }), "invalid_rule")
  throws("a bound the measure cannot read", () => defineField({ name: "a", type: "date", validation: (rule) => rule.min("someday") }), "invalid_rule")
  throws("an array without `of`", () => defineField({ name: "a", type: "array" }), "needs `of`")
  throws("a select without a list", () => defineField({ name: "a", type: "select" }), "non-empty options.list")
  throws(
    "a counting rule on a single select, where it could never fire",
    () => defineField({ name: "a", type: "select", options: { list: ["x"] }, validation: (rule) => rule.min(1) }),
    "options.multiple",
  )
  throws("an object without fields", () => defineField({ name: "a", type: "object" }), "non-empty `fields`")
  throws("a validation function that forgets to return", () => defineField({ name: "a", type: "string", validation: (rule) => { rule.required() } }), "returned nothing")
  throws("a bad ordering direction", () => defineType({ name: "ord", fields: [{ name: "a", type: "string" }], orderings: [{ name: "x", by: [{ field: "a", direction: "up" }] }] }), 'must be "asc" or "desc"')
  eq("findType stays quiet for routing", findType("nope"), null)
  throws(
    "a rule name from another library names its replacement",
    () => defineField({ name: "a", type: "string", validation: (rule) => rule.matches(/x/) }),
    "Did you mean .regex()?",
  )
}

section("lenient shapes, strict where the spec is explicit")
{
  const bio = getType("consultant").fieldsByName.bio
  eq("richText accepts blocks as well as a string", validateValue(bio, [{ _type: "block", children: [{ text: "Ahoj" }] }]).ok, true)
  eq("blocks measure as their plain text", getFieldType("richText").toDisplay([{ children: [{ text: "Ahoj" }] }]), "Ahoj")
  eq("markup does not count against a character limit", validateValue(bio, `<p>${"x".repeat(1200)}</p>`).ok, true)
  eq("empty markup is an empty field", validateValue(defineField({ name: "b", type: "richText", validation: (rule) => rule.required() }), "<p></p>").ok, false)
  eq("slug accepts Sanity's { current }", validateValue(getType("consultant").fieldsByName.slug, { current: "jan-novak" }).ok, true)
  eq("an image may be a bare url", validateValue(getType("offer").fieldsByName.cover, "https://cdn.example.com/a.jpg").ok, true)
  eq("a document body that is not an object fails at the root", validateDocument("offer", null).errors[0].path, "")
  ok("getType passes a type object straight through", getType(getType("offer")).name === "offer")
}

section("initial values")
{
  const withDefaults = defineField({ name: "tags", type: "array", of: { name: "t", type: "string" }, initialValue: ["novinka"] })
  eq("initialValue beats the type's zero", emptyValue(withDefaults), ["novinka"])
  ok("and is copied, not shared between documents", emptyValue(withDefaults) !== emptyValue(withDefaults))
  eq("a function initialValue is called", emptyValue(defineField({ name: "n", type: "number", initialValue: () => 7 })), 7)
}

section("polymorphic arrays")
{
  defineType({
    name: "page",
    fields: [
      {
        name: "blocks",
        title: "Bloky",
        type: "array",
        of: [
          { name: "hero", title: "Hero", type: "object", fields: [{ name: "heading", type: "string", validation: (rule) => rule.required() }] },
          { name: "quote", title: "Citace", type: "object", fields: [{ name: "text", type: "text", validation: (rule) => rule.required().min(5) }] },
        ],
      },
    ],
  })

  const blocks = getType("page").fieldsByName.blocks
  eq("the ui flags the array as polymorphic", blocks.ui.polymorphic, true)
  eq("a new item carries its _type", emptyValue(blocks.members[1]), { _type: "quote", text: "" })
  eq(
    "items validate against the member their _type names",
    pathsOf(validateDocument("page", { blocks: [{ _type: "hero", heading: "" }, { _type: "quote", text: "ok" }, { _type: "banner" }] })),
    ["blocks.0.heading", "blocks.1.text", "blocks.2"],
  )
  eq(
    "an item of an undeclared type is reported at its index",
    validateDocument("page", { blocks: [{ _type: "banner" }] }).errors[0].message,
    'Neznámý typ položky "banner".',
  )
}

section("adding a field type from outside")
{
  // The whole extension path: a type this folder has never heard of, with its
  // own measure and its own message, driving a Studio input nobody has written.
  registerFieldType({
    name: "rating",
    title: "Hvězdičky",
    kind: "number",
    input: "rating",
    scalar: true,
    options: { stars: 5 },
    zero: () => null,
    check: (value) => (Number.isInteger(value) ? null : "Očekáváno hodnocení."),
    measure: {
      unit: "stars",
      value: (value) => (typeof value === "number" ? value : null),
      bound: (bound) => (typeof bound === "number" ? bound : null),
      message: (flag, bound) => (flag === "min" ? `Nejméně ${bound} hvězdiček.` : `Nejvýše ${bound} hvězdiček.`),
    },
    supports: ["min", "max"],
    ui: (entry, field) => ({
      input: entry.input,
      kind: entry.kind,
      name: field.name,
      title: field.title,
      children: "none",
      stars: field.options.stars,
      required: field.constraints.required,
    }),
    toDisplay: (value) => (value == null ? "" : `${value}/5`),
  })

  const stars = defineField({ name: "score", title: "Hodnocení", type: "rating", validation: (rule) => rule.required().min(3) })
  eq("the new type reaches the ui with its own options", stars.ui, { input: "rating", kind: "number", name: "score", title: "Hodnocení", children: "none", stars: 5, required: true })
  eq("its own measure produces its own message", validateValue(stars, 2).errors[0].message, "Nejméně 3 hvězdiček.")
  eq("and it validates shape like any other", validateValue(stars, "pět").errors[0].rule, "type")
  eq("zero value", emptyValue(stars), null)
  throws("a field type may not be registered twice", () => registerFieldType({ name: "rating", ui: () => ({}) }), "duplicate_field_type")
  throws(
    "a field type that omits a required ui key is rejected",
    () => {
      registerFieldType({ name: "halfBaked", ui: () => ({ input: "x" }) })
      defineField({ name: "a", type: "halfBaked" })
    },
    "omitted kind",
  )
}

section("previews survive drafts")
{
  const consultant = getType("consultant")
  eq("author preview wins", consultant.preview({ name: "Jan", email: "jan@x.cz" }).title, "Jan")
  eq("an empty draft still renders a row", consultant.preview({}).title, "Bez názvu")
  eq("preview always answers with all three keys", Object.keys(getType("offer").preview({ title: "X" })).sort(), ["media", "subtitle", "title"])

  clearTypes()
  const thrower = defineType({ name: "risky", fields: [{ name: "label", type: "string" }], preview: (doc) => ({ title: doc.missing.deep }) })
  eq("a preview that throws falls back", thrower.preview({ label: "Fallback" }).title, "Fallback")
  eq("a type with no orderings gets one", thrower.orderings[0].by[0], { field: "updatedAt", direction: "desc" })
  eq("clearTypes empties the registry", listTypes().length, 1)
}

/* ---------------------------------------------------------------------------- */

console.log(`\n${checks - failures}/${checks} checks passed`)
if (failures > 0) process.exit(1)
