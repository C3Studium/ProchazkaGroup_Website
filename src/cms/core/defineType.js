/**
 * `defineType` — declare a content type and register it.
 *
 * Adding a content type to this project is one call to this function. No
 * migration, no table, no server change: documents are JSONB rows keyed by
 * `type`, so the schema is the only thing that has to exist.
 *
 * The normalisation here exists so the Studio never has to write `?.` around a
 * schema. After defineType, a type always has: a title, an icon, a non-empty
 * field list, a groups array (derived from the fields when not declared), at
 * least one ordering, and a preview function that returns `{ title, subtitle,
 * media }` for any document you hand it, including a half-typed draft.
 */
import { fail, at } from "./errors.js"
import { defineField } from "./defineField.js"
import { getFieldType } from "./fieldTypes.js"
import { registerType } from "./registry.js"

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

export function defineType(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    fail("invalid_config", "defineType() expects a configuration object.")
  }
  if (!NAME_PATTERN.test(config.name ?? "")) {
    fail("invalid_config", `defineType(): name must match ${NAME_PATTERN} (got ${JSON.stringify(config.name)}).`)
  }
  if (!Array.isArray(config.fields) || config.fields.length === 0) {
    fail("invalid_config", `${config.name}: a type needs a non-empty \`fields\` array.`)
  }

  const fields = normalizeFields(config.fields, config.name)
  const fieldsByName = Object.freeze(Object.fromEntries(fields.map((field) => [field.name, field])))

  const type = {
    ...config,
    __cmsType: true,
    name: config.name,
    title: config.title ?? config.name,
    icon: config.icon ?? "document",
    description: config.description ?? "",
    fields,
    fieldsByName,
    groups: normalizeGroups(config.groups, fields, config.name),
    orderings: normalizeOrderings(config.orderings, config.name),
    /**
     * Which roles may create a document of this type. `null` means everyone.
     *
     * The case it exists for is `review`: a review is a customer's statement,
     * and an editor able to write one is an editor able to write a testimonial
     * and sign a stranger's name to it. Moderating what arrives is the job;
     * authoring it is not.
     *
     * Only creation. Approving, rejecting and archiving stay open to whoever
     * the role rules elsewhere allow — see AUTH.md.
     */
    createRoles: Array.isArray(config.createRoles) && config.createRoles.length
        ? Object.freeze([...new Set(config.createRoles.map(String))])
        : null,
    preview: buildPreview(config.preview, fields),
  }

  Object.freeze(type.fields)
  return registerType(Object.freeze(type))
}

/* ------------------------------------------------------------------ pieces -- */

function normalizeFields(fields, typeName) {
  const seen = new Set()
  return fields.map((field, index) => {
    const normalized = defineField(field, { where: at(typeName, `fields[${index}]`) })
    if (seen.has(normalized.name)) {
      fail("invalid_config", `${typeName}: duplicate field name "${normalized.name}".`, { type: typeName })
    }
    seen.add(normalized.name)
    return normalized
  })
}

/**
 * Groups are the editor's tabs. The spec puts `group` on fields but never says
 * where the tab titles come from, so declared groups win and any group a field
 * mentions but no one declared is derived — a type with grouped fields always
 * has tabs, and a type with none always has an empty array.
 */
function normalizeGroups(declared, fields, typeName) {
  const groups = []
  const index = new Map()

  for (const group of declared ?? []) {
    const name = typeof group === "string" ? group : group?.name
    if (!name) fail("invalid_config", `${typeName}: a group needs a name.`, { type: typeName })
    if (index.has(name)) fail("invalid_config", `${typeName}: duplicate group "${name}".`, { type: typeName })
    const normalized = { name, title: (typeof group === "object" && group.title) || name, default: group?.default === true }
    index.set(name, normalized)
    groups.push(normalized)
  }

  for (const field of fields) {
    if (field.group && !index.has(field.group)) {
      const derived = { name: field.group, title: field.group, default: false }
      index.set(field.group, derived)
      groups.push(derived)
    }
  }

  if (groups.length > 0 && !groups.some((group) => group.default)) groups[0].default = true
  return Object.freeze(groups.map((group) => Object.freeze(group)))
}

function normalizeOrderings(declared, typeName) {
  const orderings = (declared ?? []).map((ordering, position) => {
    const where = `${typeName}: orderings[${position}]`
    if (!ordering?.name) fail("invalid_config", `${where} needs a name.`, { type: typeName })
    if (!Array.isArray(ordering.by) || ordering.by.length === 0) {
      fail("invalid_config", `${where} needs a non-empty \`by\`.`, { type: typeName })
    }
    const by = ordering.by.map((clause) => {
      if (!clause?.field) fail("invalid_config", `${where}: every \`by\` clause needs a field.`, { type: typeName })
      const direction = clause.direction ?? "asc"
      if (direction !== "asc" && direction !== "desc") {
        fail("invalid_config", `${where}: direction must be "asc" or "desc", got ${JSON.stringify(direction)}.`)
      }
      return Object.freeze({ field: clause.field, direction })
    })
    return Object.freeze({ name: ordering.name, title: ordering.title ?? ordering.name, by: Object.freeze(by) })
  })

  // A list view always needs something to sort by, and "what changed last" is
  // the only ordering that makes sense before an author has expressed a taste.
  if (orderings.length === 0) {
    orderings.push(
      Object.freeze({
        name: "updatedAt",
        title: "Naposledy upravené",
        by: Object.freeze([Object.freeze({ field: "updatedAt", direction: "desc" })]),
      }),
    )
  }
  return Object.freeze(orderings)
}

/**
 * Preview drives every list row in the Studio, so it has to survive documents
 * that are empty, half-typed or shaped by an older version of the schema. The
 * author's function is wrapped, not trusted: if it throws on a draft the row
 * still renders, and `title`, `subtitle` and `media` are always present.
 */
function buildPreview(preview, fields) {
  if (preview !== undefined && typeof preview !== "function") {
    fail("invalid_config", "preview must be a function (doc) => ({ title, subtitle, media }).")
  }

  const textual = fields.filter((field) => ["string", "text", "slug", "select", "email"].includes(field.type))
  const mediaField = fields.find((field) => field.type === "image")

  const fallback = (doc) => {
    const shown = textual
      .map((field) => ({ field, text: getFieldType(field.type).toDisplay(doc[field.name], field) }))
      .filter((candidate) => candidate.text)
    return {
      title: shown[0]?.text ?? "",
      subtitle: shown[1]?.text ?? "",
      media: mediaField ? doc[mediaField.name] ?? null : null,
    }
  }

  return (document) => {
    const doc = document ?? {}
    let authored = null
    try {
      authored = preview ? preview(doc) : null
    } catch {
      authored = null // a preview that throws must not take a list view down
    }
    const base = fallback(doc)
    const merged = { ...base, ...(authored ?? {}) }
    return {
      ...merged,
      title: merged.title || base.title || "Bez názvu",
      subtitle: merged.subtitle || "",
      media: merged.media ?? null,
    }
  }
}
