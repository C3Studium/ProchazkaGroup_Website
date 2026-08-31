/**
 * Three-way merge of two document bodies, field by field.
 *
 * ---------------------------------------------------------------------------
 * Why a merge is available here and is not for a text file
 *
 * A document is JSONB with a declared schema. Its fields are atomic and named,
 * so "what did each side change" is a question with an exact answer and no
 * line diff to reconcile: for every field there are three values — the one both
 * editors started from, the one that is stored, the one in this tab — and the
 * four cases they make are exhaustive.
 *
 *   neither side moved it      keep it
 *   only I moved it            keep mine        (they never saw it)
 *   only they moved it         keep theirs      (I never saw it)
 *   both moved it              → the same value, and there is nothing to ask
 *                              → to different values, and only a person can say
 *
 * The last case is the only one that becomes a question. Everything else is
 * arithmetic, which is what makes the dialog short: on the measured runs a
 * conflict between two editors of one Q&A asks about one field and merges the
 * other three without a word.
 *
 * ---------------------------------------------------------------------------
 * The base
 *
 * `base` is the body this tab LOADED — `baseline.current` in the editor, moved
 * forward on every successful save. That is the actual common ancestor: A and B
 * both read it, and each has since changed something in their own copy.
 *
 * The last published body (`doc.data`) was the other candidate and it is worse,
 * because it is not always an ancestor at all: two editors reworking a draft
 * that has never been published share a body the public has never seen, and
 * diffing both sides against `data` would report every field of the draft as
 * changed by both of them. It is kept only as the fallback for a tab that has
 * no baseline to offer, where a wrong base costs an extra question rather than
 * a wrong merge.
 *
 * ---------------------------------------------------------------------------
 * `sameJson`, not `isEqual`
 *
 * Two of the three bodies here have been through jsonb, which does not keep the
 * key order it was handed, and they arrive by different code paths — `publish()`
 * copies a body whole, `patchField()` rebuilds one through `setPath` and appends
 * a previously-absent key at the end. `isEqual` in ./documents.js stringifies
 * and would call those different; it says so itself and says it is only for the
 * unsaved-changes guard, where both sides come from one object graph. A merge
 * that read key order as content would ask about every field of every conflict,
 * and an editor who is asked four questions with identical answers learns to
 * click the first button — which is a worse silence than the one this replaces.
 */

import { sameJson } from "@/cms/core"

/**
 * Every key any of the three bodies has, in schema order first.
 *
 * Schema order so the dialog reads like the form the editor just left. Keys
 * outside the schema still come last rather than being dropped: a body may hold
 * something a type has since stopped declaring, and a merge that silently
 * deleted it would be the data loss this exists to stop, wearing a dialog.
 */
const keysOf = (type, bodies) => {
  const declared = (type?.fields || []).map((field) => field.name)
  const seen = new Set(declared)
  const extra = []
  for (const body of bodies) {
    for (const key of Object.keys(body || {})) {
      if (seen.has(key)) continue
      seen.add(key)
      extra.push(key)
    }
  }
  return [...declared.filter((name) => bodies.some((body) => body && name in body)), ...extra]
}

/**
 * What each side did to each field, and the merge that follows from it.
 *
 * @param {object} type    the registered content type, for field order and labels
 * @param {object} base    the body both editors started from
 * @param {object} mine    the body in this tab
 * @param {object} theirs  the body that is stored
 * @returns {{ entries: object[], conflicts: object[], merged: object }}
 */
export function mergeReport(type, base, mine, theirs) {
  const entries = keysOf(type, [base, mine, theirs]).map((name) => {
    const field = (type?.fields || []).find((entry) => entry.name === name) || null
    const at = { base: base?.[name], mine: mine?.[name], theirs: theirs?.[name] }
    const mineMoved = !sameJson(at.mine, at.base)
    const theirsMoved = !sameJson(at.theirs, at.base)
    const kind = !mineMoved && !theirsMoved
      ? "untouched"
      : mineMoved && !theirsMoved
        ? "mine"
        : !mineMoved && theirsMoved
          ? "theirs"
          : sameJson(at.mine, at.theirs)
            ? "agreed"
            : "conflict"
    return { name, field, title: field?.ui?.title || field?.title || name, kind, ...at }
  })

  return {
    entries,
    conflicts: entries.filter((entry) => entry.kind === "conflict"),
    // With every conflict resolved in the stored version's favour. The dialog
    // starts from a body that is already correct on the three quiet cases, so
    // an editor who reads it and presses save without touching a choice has
    // still kept both people's work everywhere it was not contested.
    merged: applyChoices(entries, {}),
  }
}

/**
 * The body a set of per-field choices produces.
 *
 * Starts from `theirs` for every key and overlays, rather than starting from
 * `mine`: what is stored may hold keys neither the schema nor this tab knows
 * about, and those must survive a merge untouched.
 *
 * @param {object[]} entries   from mergeReport
 * @param {object} choices     `{ [fieldName]: 'mine' | 'theirs' }`, conflicts only
 */
export function applyChoices(entries, choices) {
  const body = {}
  for (const entry of entries) {
    const side =
      entry.kind === "mine" ? "mine"
        : entry.kind === "conflict" ? (choices[entry.name] === "mine" ? "mine" : "theirs")
          : entry.kind === "theirs" || entry.kind === "agreed" ? "theirs"
            : "base"
    const value = entry[side]
    // A field one side removed stays removed. Writing `undefined` would survive
    // into the request and come back as null, which is a value and not an
    // absence — the two mean different things to a schema with an optional
    // field, and only one of them is what the editor did.
    if (value !== undefined) body[entry.name] = value
  }
  return body
}

/**
 * Is this a merge the editor still has to answer for?
 *
 * Used to keep the save button honest: with an unanswered conflict the dialog
 * would be about to write the stored value over work the editor can see on the
 * screen behind it, which is exactly the silent overwrite it was opened for.
 */
export const unanswered = (report, choices) =>
  report.conflicts.filter((entry) => !choices[entry.name])
