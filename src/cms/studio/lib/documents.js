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
 *
 * ---------------------------------------------------------------------------
 * "Has a draft" is not "differs from what is published"
 *
 * Every screen used to test `doc.draft` for presence and call the answer
 * "edited". Measured on the live store: 43 documents carried a draft and 10 of
 * them were identical to their published body — so a tenth of the badges, and
 * the publish dialog built on the same test, reported work that did not exist.
 * `hasUnpublishedChanges` is the real question and everything below asks it.
 */

import { sameJson } from "@/cms/core"

/** An editor always edits `draft ?? data`. */
export const bodyOf = (doc) => (doc ? (doc.draft ?? doc.data ?? {}) : {})

/**
 * Is there a draft, and does it say anything other than what is published?
 *
 * The second half is the part that was missing everywhere. `data` is the body
 * the public was last served and `draft` is what would replace it, so a draft
 * that matches `data` is not pending work — publishing it would change nothing
 * and discarding it would lose nothing. It is nothing, and it now reads as
 * nothing.
 */
export const hasUnpublishedChanges = (doc) => Boolean(doc?.draft) && !sameJson(doc.draft, doc.data)

/** The same question narrowed to documents that are actually on the site. */
export const hasPendingDraft = (doc) => hasUnpublishedChanges(doc) && doc?.status === "published"

/**
 * Can this document's draft be thrown away?
 *
 * Two conditions, and the second is the one that is easy to miss: discarding
 * means going back to the published body, so there has to be one. A document
 * that has never been published keeps its only copy in `draft`, and a discard
 * there would not revert anything — it would empty the document. The buttons for
 * that case are Smazat and Do archivu and they already exist. The server refuses
 * it as well (server/documents.js), because a rule only the UI enforces is a
 * rule a stale tab gets around.
 */
export const canDiscardDraft = (doc) =>
  Boolean(doc?.draft) && Object.keys(doc?.data || {}).length > 0

/**
 * What discarding will do to the public site, in the editor's words — the twin
 * of `restoreOutcome`, and there for the same reason. "Zahodit" is a word people
 * read as "take it down" until they are told otherwise, once. Both branches say
 * the same thing about the web, which is the whole point: nothing.
 */
export const discardOutcome = (doc) =>
  doc?.status === "published"
    ? "Na webu se nic nezmění — vrátíte se přesně k tomu, co na něm teď je."
    : "Na webu se nic nezmění — tento dokument na něm stejně není."

/** Archiving is a timestamp, not a status. Null/absent means live. */
export const isArchived = (doc) => Boolean(doc?.archivedAt)

export function stateOf(doc) {
  if (!doc) return "draft"
  if (isArchived(doc)) return "archived"
  if (doc.status !== "published") return "draft"
  return hasUnpublishedChanges(doc) ? "edited" : "published"
}

/**
 * One name per state, and every screen imports it — the list, the editor, the
 * overview and the preview bar's version switch.
 *
 * `edited` used to read "Neuložené změny" — *unsaved changes* — about work that
 * is saved, sitting one button away from the only irreversible action in the
 * system. A receptionist reads that as "I lost it" and the obvious recovery is
 * the bright button next to it. The name now says what the state is: saved,
 * waiting. It also stops colliding with the editor's own "neuložené změny"
 * marker and useUnsavedGuard's message, which are about a buffer that genuinely
 * has not been saved — one phrase, one meaning.
 */
export const STATE_LABELS = {
  draft: { label: "Koncept", tone: "neutral", hint: "Není na webu" },
  edited: {
    label: "Čeká na zveřejnění",
    tone: "warning",
    hint: "Uložené. Na webu je zatím předchozí verze.",
  },
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

/**
 * Structural comparison used by the unsaved-change guard, and only by it.
 *
 * Key order matters here and that is correct: both sides come from the same
 * object graph in the same tab, so an order difference cannot happen, and a
 * guard that is wrong in the "dirty" direction only costs a confirmation while
 * one wrong the other way loses typing. Comparing two *stored* bodies is a
 * different question with a different answer — see `sameJson`.
 */
export const isEqual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Deep enough for a body's own nesting and no deeper. A field path that reaches
// past this is not something an editor reads as a field name anyway, so the
// walk stops and names the node it got to.
const MAX_DEPTH = 4

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const collectChanges = (next, prev, path, out, depth) => {
  if (sameJson(next, prev)) return
  // Same shape and same length: descend, so the answer is "items.2.label" and
  // not "items". An array whose length moved is reported whole — every index
  // after an insertion differs, and listing them all names nothing.
  const descend =
    depth < MAX_DEPTH &&
    ((isPlainObject(next) && isPlainObject(prev)) ||
      (Array.isArray(next) && Array.isArray(prev) && next.length === prev.length))
  if (!descend) {
    out.push(path.join("."))
    return
  }
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])]
  for (const key of keys) collectChanges(next?.[key], prev?.[key], [...path, key], out, depth + 1)
}

/**
 * The field paths where the draft and the published body actually disagree.
 *
 * This is what the publish dialog names. It used to name the paths annotated on
 * the page — every editable element of the block, changed or not — which is how
 * a confirmation ended up listing "changed fields" that nobody had touched. The
 * page's annotations still decide WHICH documents are on it; what changed in
 * them is a question only the two bodies can answer.
 */
export function changedFields(doc) {
  if (!doc) return []
  const out = []
  collectChanges(doc.draft ?? {}, doc.data ?? {}, [], out, 0)
  // An empty path means the two bodies differ at the root — one of them is not
  // an object at all. Nothing useful to name, so it is left out rather than
  // printed as a blank bullet.
  return out.filter(Boolean)
}
