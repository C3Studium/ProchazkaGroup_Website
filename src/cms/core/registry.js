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

const types = new Map()

export function registerType(type) {
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
