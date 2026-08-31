/**
 * The type registry.
 *
 * A single module-level map, deliberately. `cms_document.type` is a bare string
 * in the database; if two declarations could answer to the same name, rows would
 * route to whichever schema won the import race and the damage would be silent
 * and permanent. So: registering a name twice throws, and asking for a name that
 * was never registered throws.
 *
 * `getType` is the loud accessor. UI code that legitimately handles "no such
 * type" — a route parameter typed by a human, for instance — should ask
 * `hasType` or `findType` first rather than catch.
 */
import { fail } from "./errors.js"
import { isField } from "./defineField.js"

const types = new Map()

/** Co typ deklaruje, jako řetězec — dvě vyhodnocení téhož zdroje se shodnou. */
const signature = (type) =>
  JSON.stringify([
    type.name,
    type.title ?? null,
    (type.fields || []).map((field) => [field.name, field.type]),
  ])

export function registerType(type) {
  // A plain object with the right keys looks like a type and reads like one:
  // listing documents never touches a field, so a hand-written schema survives
  // every GET and fails on the first write with `e.hidden is not a function`,
  // several layers below anything the author wrote. The declaration is the only
  // place that can name the real problem, so it is checked here — at startup,
  // before a single request — rather than discovered later.
  if (!type || typeof type !== "object" || !type.__cmsType) {
    fail(
      "not_a_type",
      `type "${type?.name ?? "(unnamed)"}" was not built with defineType(). A plain object ` +
        `will read but not write: fields carry behaviour (visibility, permissions, validation), ` +
        `not just data. Wrap the declaration in defineType({ ... }) from '@/cms/core'.`,
      { type: type?.name },
    )
  }

  const loose = (type.fields || []).filter((field) => !isField(field))
  if (loose.length) {
    fail(
      "not_a_field",
      `type "${type.name}" has ${loose.length} field(s) not built with defineField(): ` +
        `${loose.map((f) => f?.name ?? "(unnamed)").join(", ")}. Wrap each one in ` +
        `defineField({ ... }) from '@/cms/core'.`,
      { type: type.name },
    )
  }

  // Znovuvyhodnocení téže deklarace není konflikt.
  //
  // `defineType` registruje při deklaraci, takže registrace je vedlejší účinek
  // vyhodnocení modulu — a modul se vyhodnotí vícekrát, než by člověk čekal:
  // bundler dá vlastní instanci každému vstupnímu bodu, hot reload ho pustí
  // znovu. Tvrdit v takové chvíli "dva typy se stejným jménem" je nepravda,
  // která zhasne routu; skutečný konflikt je až tehdy, když se ty dvě deklarace
  // opravdu liší.
  const existing = types.get(type.name)
  if (existing && (existing === type || signature(existing) === signature(type))) {
    return existing
  }

  if (types.has(type.name)) {
    fail(
      "duplicate_type",
      `type "${type.name}" is already registered. Two content types cannot share a name — ` +
        `cms_document.type would not tell them apart. (In a hot-reloading dev server, call clearTypes() ` +
        `at the top of the module that declares your schemas.)`,
      { type: type.name },
    )
  }
  types.set(type.name, type)
  return type
}

export function getType(name) {
  if (name && typeof name === "object" && name.__cmsType) return name
  const type = types.get(name)
  if (!type) {
    fail("unknown_type", `unknown type "${name}". Registered: ${[...types.keys()].join(", ") || "(none)"}.`, {
      type: name,
    })
  }
  return type
}

/** Non-throwing lookup. Returns null for names that were never registered. */
export function findType(name) {
  if (name && typeof name === "object" && name.__cmsType) return name
  return types.get(name) ?? null
}

export function hasType(name) {
  return types.has(name)
}

/** Registration order, which is the order schemas were declared in. */
export function listTypes() {
  return [...types.values()]
}

/** Escape hatch for tests and hot reload. Nothing in a request path calls this. */
export function clearTypes() {
  types.clear()
}
