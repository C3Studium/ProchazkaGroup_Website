/**
 * Helpers over Contract 3. The publish model is the one thing a non-technical
 * editor gets wrong most easily, so the vocabulary is centralised here and the
 * UI never re-derives it.
 *
 *   never published                          → "draft"
 *   published, no pending edits              → "published"
 *   published, with an unpublished draft     → "edited"   (the tricky one)
 *   archived, whatever it was before         → "archived"
 *
 * Archived wins over the other three in the label because it is the only one an
 * editor can act on from the archive view, and because "Koncept" on a person
 * who left the company two years ago tells them nothing. The underlying state is
 * still there — `doc.status` is untouched by archiving — which is what lets
 * restore put a published consultant straight back on the site.
 */

/** An editor always edits `draft ?? data`. */
export const bodyOf = (doc) => (doc ? (doc.draft ?? doc.data ?? {}) : {})

export const hasPendingDraft = (doc) => Boolean(doc?.draft) && doc?.status === "published"

/** Archiving is a timestamp, not a status. Null/absent means live. */
export const isArchived = (doc) => Boolean(doc?.archivedAt)

export function stateOf(doc) {
  if (!doc) return "draft"
  if (isArchived(doc)) return "archived"
  if (doc.status !== "published") return "draft"
  return doc.draft ? "edited" : "published"
}

export const STATE_LABELS = {
  draft: { label: "Koncept", tone: "neutral", hint: "Není na webu" },
  edited: { label: "Neuložené změny", tone: "warning", hint: "Na webu je starší verze" },
  published: { label: "Publikováno", tone: "positive", hint: "Živé na webu" },
  archived: { label: "V archivu", tone: "neutral", hint: "Není na webu, zůstává v administraci" },
}

/**
 * What restoring this document will do, in the editor's words. The answer is
 * not the same for everyone in the archive — someone archived while live comes
 * back live — and guessing wrong is the one thing that would make an editor
 * afraid of the button.
 */
export const restoreOutcome = (doc) =>
  doc?.status === "published"
    ? "Vrátí se rovnou na web — v době archivace byl publikovaný."
    : "Vrátí se mezi koncepty. Na web se dostane až po publikování."

/**
 * Runs the type's own `preview()` and normalises the result. A schema author
 * may return any of the documented keys or none — the list must still render a
 * row, so a missing title degrades to the document id rather than an empty cell.
 */
export function previewOf(type, doc) {
  const body = bodyOf(doc)
  let preview = {}
  try {
    preview = type?.preview?.(body, doc) || {}
  } catch {
    // A schema author's preview throwing must not take down the whole list.
    preview = {}
  }
  return {
    title: preview.title || "Bez názvu",
    subtitle: preview.subtitle || "",
    media: preview.media || null,
    badge: preview.badge ?? null,
  }
}

/** Asset-ish values carry a url; `image` fields and raw asset objects both do. */
export const mediaUrl = (value) => {
  if (!value) return null
  if (typeof value === "string") return value
  return value.url || value.asset?.url || null
}

/** Deep-set on a dotted path, copying only the nodes along the way. */
export function setPath(target, path, value) {
  const keys = Array.isArray(path) ? path : String(path).split(".")
  if (!keys.length) return value

  const [head, ...rest] = keys
  const index = Number(head)
  const isIndex = Number.isInteger(index) && String(index) === head

  if (isIndex) {
    const list = Array.isArray(target) ? [...target] : []
    list[index] = rest.length ? setPath(list[index], rest, value) : value
    return list
  }

  const next = target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {}
  next[head] = rest.length ? setPath(next[head], rest, value) : value
  return next
}

export function getPath(target, path) {
  const keys = Array.isArray(path) ? path : String(path).split(".")
  return keys.reduce((value, key) => (value == null ? undefined : value[key]), target)
}

/** Structural comparison used by the unsaved-change guard. */
export const isEqual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
