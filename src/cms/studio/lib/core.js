/**
 * Adapter over Contract 1.
 *
 * The Studio is built against `@/cms/core` but does not import it — the core
 * arrives through `StudioProvider`, the same way the data port does. That keeps
 * one integration seam instead of two and lets the whole admin be driven by a
 * stub in a test.
 *
 * The core does the heavy lifting: every field carries a frozen `field.ui`
 * describing how to render it, and `field.ui.input` / `field.ui.kind` are what
 * the input registry keys off. Nothing in this folder switches on a type name.
 */

export function normalizeCore(core) {
  if (!core) throw new Error("[studio] No core supplied. Pass `core` to <Studio />.")

  return {
    ...core,
    // `getType` throws on an unknown name by design — the Studio reaches it from
    // a URL segment, where an unknown name is a typo and must render an empty
    // state, not a crash. `findType` is the non-throwing lookup for exactly this.
    getType: (name) => (name ? core.findType(name) : null),
    listTypes: () => core.listTypes() || [],
    validateDocument: (type, value) => core.validateDocument(type, value) || { ok: true, errors: [] },
    emptyDocument: (type) => core.emptyDocument(type) || {},
    emptyValue: (field) => core.emptyValue(field),
  }
}

/* ------------------------------------------------------------- field tree -- */

/**
 * Groups become the editor's tabs. A type with no declared groups gets one
 * implicit tab so the editor never renders a lone tab strip for a single group.
 */
export function fieldGroups(type) {
  const fields = type?.fields || []
  const declared = type?.groups || []

  if (!declared.length) {
    const used = [...new Set(fields.map((field) => field.group).filter(Boolean))]
    if (!used.length) return [{ name: null, title: null, fields, implicit: true }]
    return used.map((name) => ({
      name,
      title: name,
      fields: fields.filter((field) => field.group === name),
    }))
  }

  const groups = declared.map((group) => ({
    ...group,
    fields: fields.filter((field) => field.group === group.name),
  }))

  // Fields naming no group, or naming one that was never declared, would
  // otherwise be invisible in the editor — surface them rather than drop them.
  const claimed = new Set(groups.flatMap((group) => group.fields.map((field) => field.name)))
  const orphans = fields.filter((field) => !claimed.has(field.name))
  if (orphans.length) groups.push({ name: "_other", title: "Ostatní", fields: orphans })

  return groups.filter((group) => group.fields.length > 0)
}

/** The group a schema marked `default: true`, else the first one. */
export const defaultGroup = (groups) => groups.find((group) => group.default) || groups[0]

/** Errors are dotted paths; a group owns an error when it owns the root field. */
export function errorsForGroup(errors, group) {
  const owned = new Set(group.fields.map((field) => field.name))
  return errors.filter((error) => owned.has(String(error.path).split(".")[0]))
}

export const errorAt = (errors, path) => errors.find((error) => error.path === path) || null
