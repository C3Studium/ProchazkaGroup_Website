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
 * REJECTION — the gap this file used to name, and how it closed.
 *
 * It said: "`review` has no third state, so 'reject' has nowhere to record
 * itself… rejecting deletes… Worth a `rejectedAt` stamp." Rejecting really did
 * call `port.remove()`, and the only way back was a toast that lived 7.5 seconds
 * and re-created the document under a new id.
 *
 * The third state was never needed. `archived_at` (migrations/0003) is already
 * the orthogonal withdrawal column — filtered out of every public read, denied to
 * anon by the RLS policy itself, and a column precisely so that it does not
 * fight with `status`. A rejection is that column plus a reason, and the reason
 * lives in two places on purpose:
 *
 *   in the body       `rejectedAt`, `rejectedBy`, `rejectedReason`
 *                     (schemas/review.js). Editable-shaped data an editor reads,
 *                     and what the rejected queue filters on — one predicate,
 *                     `draft->>rejectedAt is not null`, whether the review's body
 *                     sat in `draft` or in `data`.
 *
 *   in the revision   `reason = 'reject'`, with `changed_by` and `changed_at`
 *                     (server/revisions.js). Append-only, owner-only, and nothing
 *                     in the application ever updates it. This is the half that
 *                     is evidence: a body field can be edited by whoever is
 *                     holding the mouse; a revision row cannot.
 *
 * That split is also the answer to the legal question underneath it. These are
 * consumer reviews and the Omnibus amendment to zákona o ochraně spotřebitele
 * asks a business to be able to account for how it handles them — and not to
 * suppress the unfavourable ones. A deleted review is not evidence in either
 * direction. A kept one, with who and when and why, is.
 *
 * Nothing here deletes. Destruction lives in one place, the Archive, behind its
 * own confirmation — which a rejected review is reachable from, because it is
 * archived like anything else (ARCHIVE.md, "Mazání je ruční, a je jediné").
 */

import { REJECTION_FIELDS, REJECTION_REASONS } from "@/cms/schemas/review"

import { bodyOf } from "./documents"

export const PENDING = "pending"
export const APPROVED = "approved"
export const REJECTED = "rejected"

/** The reasons a rejection may name. The schema owns the list; see it for why. */
export { REJECTION_REASONS }

export const rejectionOf = (body) => REJECTION_REASONS.find((entry) => entry.value === body?.rejectedReason) || null

export const isRejected = (doc) => Boolean(bodyOf(doc)?.rejectedAt)

export const moderationStateOf = (doc) => {
  if (isRejected(doc)) return REJECTED
  return doc?.status === "published" ? APPROVED : PENDING
}

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
  {
    id: REJECTED,
    title: "Zamítnuté",
    empty: "Zatím jste nic nezamítli.",
    hint: "Zamítnuté recenze nejsou na webu a nemažou se. Vrátit je do fronty jde kdykoli.",
  },
]

/**
 * Queue filters in Contract 2's `filters` argument.
 *
 * SPEC GAP: the spec names `filters` without giving it a shape. Anything the
 * Studio sends has to survive serialisation into an HTTP request, so this build
 * assumes a declarative grammar rather than predicate functions:
 *
 *     { field: value }              equality on the document body (`data`)
 *     { data.field: … }             the same, written out
 *     { draft.field: … }            the staged body instead of the published one
 *     { field: { op, value } }      op ∈ eq | neq | is | isNot | in | gt | lt | …
 *     { state: "draft" | "published" | "edited" }   the document envelope
 *
 * `server/query.js` is the authority on both the roots and the operator set —
 * a bare field name means `data->>field` there, which is why the rejected queue
 * below says `draft.` out loud. `dev/devPort.js` implements the same grammar for
 * the browser stub. Those two disagreeing is not hypothetical: `state` used to
 * work in the stub and match nothing against the real port, and the moderation
 * queue was empty for 23 pending reviews until query.js grew a case for it.
 */
export const QUEUE_FILTERS = {
  [PENDING]: { state: "draft" },
  [APPROVED]: { state: "published" },
  [REJECTED]: { "draft.rejectedAt": { op: "isNot", value: null } },
}

/**
 * A queue as a whole `list()` argument, because two of its three parts are not
 * filters at all.
 *
 * `archived` is a first-class argument of `list()` and defaults to "live only"
 * (server/documents.js), which is exactly what keeps a rejected review out of
 * the pending queue: it is archived, so no caller that forgets anything can
 * surface it. The rejected queue is the one place that opts in.
 *
 * Sorting differs too, and for a reason worth stating: the other two queues are
 * ordered by when the customer wrote, because that is the order you work them
 * in. The rejected queue is ordered by when the decision was taken, because it
 * is not a work queue — it is the record of what was decided, and the question
 * asked of it is "what happened lately".
 */
export const queueQuery = (queue) => ({
  filters: QUEUE_FILTERS[queue],
  archived: queue === REJECTED,
  sort:
    queue === REJECTED
      ? [{ field: "draft.rejectedAt", direction: "desc" }]
      : [{ field: "submittedAt", direction: "desc" }],
})

/**
 * The body an approval writes. `approved` is kept in step with the publish that
 * accompanies it so stored data never shows a published review marked
 * unapproved — but it is a consequence of the decision, never the record of it.
 *
 * The rejection stamps come off in the same breath. A review can carry them and
 * still be approved — restoring one from the document archive puts it back in
 * the queue with its stamps intact, deliberately, so nobody loses sight of the
 * earlier decision — and publishing writes `draft` into `data`, which the anon
 * grant makes world-readable. A moderator's name has no business going out with
 * it, and "zamítnuto" beside a review that is on the site is simply false.
 */
export const approvedBody = (body) => {
  const next = { ...body, approved: true }
  for (const field of REJECTION_FIELDS) delete next[field]
  return next
}

/** Junk that is obvious enough to lead with a reject rather than a read. */
const JUNK = /^(test|testing|zkouška|asdf|qwerty)\b/i

export function looksLikeJunk(body) {
  const message = String(body?.message ?? "").trim()
  if (!message) return true
  if (message.length < 12) return true
  return JUNK.test(message)
}
