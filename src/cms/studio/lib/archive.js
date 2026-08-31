/**
 * The Archive's vocabulary and its two derivations — BROWSER ONLY, no fetching.
 *
 * The data comes through the data port (`port.history.*`, see
 * server/httpDataPort.js) like everything else in this Studio; nothing here
 * talks to the network. What lives here is the part the server deliberately
 * does not answer:
 *
 *   the words     `reason` is four machine values and four Czech sentences
 *   the texts     "every version of every text, from when until when" is not a
 *                 table — it is a walk over revision bodies plus a comparison
 *                 between successive revisions of the same document
 *   the usage     which documents ever referred to a file, read off the
 *                 archive's own bodies rather than off a count somebody kept
 *
 * All three are computed from revisions the server already sent for the list on
 * screen, so none of them costs a second round trip.
 */

/**
 * `reason` — the transition that produced a revision. The values are
 * `cms_document_revision.reason` (server/revisions.js REVISION_REASONS) and the
 * labels are what a person reads.
 *
 * `reject` and `requeue` are moderation's pair and they are the reason this list
 * is worth reading at all under consumer-protection law: filtering the Změny
 * subpage to `reject` is how the client shows what they refused and when, which
 * is the question the Omnibus amendment makes them able to answer. Kept distinct
 * from archive/restore for exactly that — "filed away" and "refused publication"
 * are different acts and a ledger that spelled them the same could not be used
 * to answer either question.
 */
export const REASONS = {
  publish: { label: "Publikováno", tone: "positive", hint: "Tělo dokumentu se stalo tím, co viděl návštěvník." },
  unpublish: { label: "Staženo", tone: "neutral", hint: "Dokument přestal být na webu." },
  archive: { label: "Archivováno", tone: "neutral", hint: "Dokument zmizel z webu i ze seznamů ve Studiu." },
  restore: { label: "Obnoveno", tone: "neutral", hint: "Dokument se vrátil z archivu." },
  reject: { label: "Zamítnuto", tone: "danger", hint: "Recenze byla odmítnuta ve frontě schvalování. Nesmazala se." },
  requeue: { label: "Vráceno do fronty", tone: "neutral", hint: "Zamítnutí bylo vzato zpět, recenze zase čeká na schválení." },
}

export const reasonOf = (reason) => REASONS[reason] || { label: reason || "—", tone: "neutral", hint: "" }

export const REASON_OPTIONS = Object.entries(REASONS).map(([value, entry]) => ({ value, label: entry.label }))

/** The three sub-pages, in the order ARCHIVE.md lists them. */
export const SECTIONS = [
  { id: "changes", title: "Změny", segment: null },
  { id: "texts", title: "Texty", segment: "texty" },
  { id: "media", title: "Média", segment: "media" },
]

/**
 * The line the archive is never allowed to stop saying (ARCHIVE.md, layer 5).
 * "Takhle web vypadal" is not a true statement. This is.
 */
export const REPLAY_CAVEAT =
  "Obsah je z uvedeného data, přehraný dnešním kódem. Rozvržení, animace a zabudované texty jsou dnešní."

/** The confirmation sentence, verbatim. It is a requirement, not a suggestion. */
export const DESTROY_CONFIRM = "Jste si opravdu jisti? Tato akce nelze vrátit zpět."

/* --------------------------------------------------------------- selection -- */

export const EMPTY_SELECTION = { revisionIds: [], mediaIds: [] }

export const selectionSize = (selection) =>
  (selection?.revisionIds?.length || 0) + (selection?.mediaIds?.length || 0)

/* ------------------------------------------------------------------ dates -- */

/**
 * A date the archive can be held to: absolute, never relative.
 *
 * "před 3 dny" is right on a queue somebody works through today and wrong in a
 * record that may be read out in a dispute two years from now. It also avoids a
 * known bug — `format.js` `formatRelative` prints "před 1 minuta" where Czech
 * wants "před minutou" — and a record is the worst place in the admin for it.
 */
export const stamp = (value) => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const day = (value) => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })
}

/** The round number and the exact one. An archive is asked "how much, exactly". */
export const bytes = (value) => {
  const count = Number(value) || 0
  if (count < 1024) return `${count} B`
  if (count < 1024 * 1024) return `${(count / 1024).toFixed(1)} kB`
  return `${(count / (1024 * 1024)).toFixed(2)} MB`
}

/* ------------------------------------------------------------------ texts -- */

// A timestamp stored as a string is rendered from its own column elsewhere;
// listing it as a "text version" would bury the sentences this sub-page exists
// to show.
const isTimestamp = (value) => /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)

/** An asset value, as the media library handed it to a field. See `assetIdsIn`. */
const isAsset = (node) =>
  typeof node?.id === "string" && node.id && typeof node.url === "string" && node.url

/**
 * Every string leaf of a body that is text somebody wrote, with the dotted path
 * that named it.
 *
 * Two exclusions, and both are about not answering a different question:
 *
 *   an ASSET value is descended into only as far as `alt`. The rest of it — the
 *   id, the path, the mime type, the pixel dimensions — is the media library's
 *   bookkeeping, it has its own sub-page, and `alt` is precisely the one key of
 *   an asset an editor can reach (fieldPatch.js says so and enforces it). Before
 *   this rule the Texty list printed a UUID and "image/png" as versions of a
 *   text, which is the sort of thing that makes a record unreadable.
 *
 *   an UNDERSCORED key is a rich-text block's structure (`_type`, `_key`), not
 *   copy. The prose inside those blocks is reached through their `text` keys and
 *   still appears.
 */
export function textLeaves(body, prefix = "", out = []) {
  if (body == null) return out
  if (typeof body === "string") {
    const trimmed = body.trim()
    if (trimmed && !isTimestamp(trimmed)) out.push({ field: prefix, value: body })
    return out
  }
  if (Array.isArray(body)) {
    body.forEach((entry, index) => textLeaves(entry, prefix ? `${prefix}.${index}` : String(index), out))
    return out
  }
  if (typeof body === "object") {
    if (isAsset(body)) {
      if (typeof body.alt === "string" && body.alt.trim()) {
        out.push({ field: prefix ? `${prefix}.alt` : "alt", value: body.alt })
      }
      return out
    }
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("_")) continue
      textLeaves(value, prefix ? `${prefix}.${key}` : key, out)
    }
  }
  return out
}

/**
 * Every version of every text, with the window it stood for.
 *
 * A VERSION, not a revision, and the difference is the whole readability of this
 * sub-page. Four transitions in a row — publish, unpublish, archive, restore —
 * carry the same body, so keying rows on revisions printed the same sentence
 * four times with four identical windows. A version therefore starts where a
 * field's value CHANGES and runs until it changes again or the field goes away.
 *
 * "Od kdy do kdy" is computed rather than stored, and the closing edge is not
 * always an edit: a revision that removed the field ends the run too, and so
 * does the end of the archive — `until: null`, printed as "dosud".
 *
 * `visible` is a separate question from the window and travels beside it. A text
 * can be in the document without the public being able to read it, which is
 * exactly what an `unpublish` revision records: same body, `status: "draft"`.
 * So the window says when the text was IN the document and `visible` says
 * whether any part of that window was public.
 */
export function buildTextIndex(revisions) {
  const byDocument = new Map()
  for (const revision of revisions) {
    if (!byDocument.has(revision.documentId)) byDocument.set(revision.documentId, [])
    byDocument.get(revision.documentId).push(revision)
  }

  const rows = []
  for (const [documentId, list] of byDocument) {
    // Oldest first, so a run is a walk forwards.
    const ordered = list.slice().sort((a, b) => String(a.changedAt).localeCompare(String(b.changedAt)))
    // One walk per body. The lookup below runs for every field of every
    // revision, and re-walking there turned a few hundred rows into a pause.
    const leaves = ordered.map((revision) => new Map(textLeaves(revision.body).map((leaf) => [leaf.field, leaf.value])))
    const fields = new Set(leaves.flatMap((map) => [...map.keys()]))

    for (const field of fields) {
      let run = null
      const close = (until) => {
        if (!run) return
        rows.push({ ...run, until })
        run = null
      }

      ordered.forEach((revision, index) => {
        const value = leaves[index].get(field)
        const live = revision.status === "published" && !revision.archivedAt

        if (value === undefined) {
          close(revision.changedAt)
          return
        }
        if (run && run.value === value) {
          run.visible = run.visible || live
          return
        }
        close(revision.changedAt)
        run = {
          id: `${revision.id}::${field}`,
          revisionId: revision.id,
          documentId,
          type: revision.type,
          body: revision.body,
          field,
          value,
          since: revision.changedAt,
          visible: live,
        }
      })

      close(null)
    }
  }

  // Newest first, then grouped by document and field so successive versions of
  // one text sit together instead of being scattered by field name.
  rows.sort(
    (left, right) =>
      String(right.since).localeCompare(String(left.since)) ||
      String(left.documentId).localeCompare(String(right.documentId)) ||
      left.field.localeCompare(right.field),
  )
  return rows
}

/* ------------------------------------------------------------------ usage -- */

/**
 * Every asset id a stored body refers to.
 *
 * The browser-side twin of `server/mediaArchive.js` `assetIdsIn`, and it must
 * stay the same shape test: an object carrying BOTH an `id` and a `url` is an
 * asset the media library handed to a field. Anything looser — "every uuid in
 * the body" — would credit files with appearances they never made, and an
 * invented reference cannot be told from a real one afterwards.
 */
export function assetIdsIn(body) {
  const found = new Set()
  const walk = (node) => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (typeof node.id === "string" && node.id && typeof node.url === "string" && node.url) found.add(node.id)
    for (const value of Object.values(node)) walk(value)
  }
  walk(body)
  return [...found]
}

/**
 * Where each file was used — read off the archive rather than off a counter.
 *
 * The server answers "is it on the site today" (`inUseNow`), which is a fact
 * about the live set and the only one it can give cheaply. "Where was it used"
 * is a fact about history, so it comes from the revisions the archive already
 * holds: every document whose published body ever mentioned the file, with the
 * first and last moment it did.
 */
export function buildUsageIndex(revisions) {
  const usage = new Map()
  for (const revision of revisions) {
    if (revision.status !== "published") continue
    for (const assetId of assetIdsIn(revision.body)) {
      if (!usage.has(assetId)) usage.set(assetId, new Map())
      const documents = usage.get(assetId)
      const seen = documents.get(revision.documentId)
      documents.set(revision.documentId, {
        documentId: revision.documentId,
        type: revision.type,
        body: seen?.body || revision.body,
        first: seen ? (seen.first < revision.changedAt ? seen.first : revision.changedAt) : revision.changedAt,
        last: seen ? (seen.last > revision.changedAt ? seen.last : revision.changedAt) : revision.changedAt,
      })
    }
  }
  return new Map([...usage].map(([assetId, documents]) => [assetId, [...documents.values()]]))
}
