/**
 * Review moderation is the client's daily job, so its rules live in one place
 * rather than inside the view.
 *
 * The state that matters is the document's publish state, not a content field.
 * `status` is the enforcement: the anon grant makes a published document's `data`
 * world-readable, so a review that has not been approved has to be a draft or it
 * is on the site. Approving is therefore publishing — there is no second flag
 * that could disagree with it. `approved` is written in the same action purely so
 * the two never drift apart in stored data; nothing reads it to decide state.
 *
 * SPEC GAP, unresolved by design: `review` has no third state, so "reject" has
 * nowhere to record itself. Leaving a rejected review as a draft would float it
 * back into the queue forever, so rejecting deletes — and because that is
 * destructive, every reject offers an undo that recreates the document from the
 * body the view still holds. The undo produces a new id. Worth a `rejectedAt`
 * stamp or a `moderation` enum in the schema if this ever needs to be auditable.
 */

export const PENDING = "pending"
export const APPROVED = "approved"

export const moderationStateOf = (doc) => (doc?.status === "published" ? APPROVED : PENDING)

export const QUEUES = [
  {
    id: PENDING,
    title: "Čeká na schválení",
    empty: "Hotovo — žádná recenze nečeká.",
    hint: "Tyto recenze zatím nikdo neviděl na webu.",
  },
  {
    id: APPROVED,
    title: "Schválené",
    empty: "Zatím jste nic neschválili.",
    hint: "Tyto recenze jsou veřejně na webu.",
  },
]

/**
 * Queue filters in Contract 2's `filters` argument.
 *
 * SPEC GAP: the spec names `filters` without giving it a shape. Anything the
 * Studio sends has to survive serialisation into an HTTP request, so this build
 * assumes a declarative grammar rather than predicate functions:
 *
 *     { field: value }              equality on the document body
 *     { field: { op, value } }      op ∈ eq | neq | exists | in | contains | gt | lt
 *     { state: "draft" | "published" | "edited" }   the document envelope
 *
 * `dev/devPort.js` implements it. If build C's port reads filters differently,
 * this is the one constant that has to change.
 */
export const QUEUE_FILTERS = {
  [PENDING]: { state: "draft" },
  [APPROVED]: { state: "published" },
}

/**
 * The body an approval writes. `approved` is kept in step with the publish that
 * accompanies it so stored data never shows a published review marked
 * unapproved — but it is a consequence of the decision, never the record of it.
 */
export const approvedBody = (body) => ({ ...body, approved: true })

/** Junk that is obvious enough to lead with a reject rather than a read. */
const JUNK = /^(test|testing|zkouška|asdf|qwerty)\b/i

export function looksLikeJunk(body) {
  const message = String(body?.message ?? "").trim()
  if (!message) return true
  if (message.length < 12) return true
  return JUNK.test(message)
}
