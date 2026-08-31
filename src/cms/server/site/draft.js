// Unpublished reads for the Studio's preview — SERVER ONLY.
//
// `read.js` is the public site's door: published rows, `data` only, anon key,
// enforced by RLS. This is the other door, and it exists for exactly one caller
// — `getStaticProps` on /studio/preview when Next reports `context.draftMode`.
//
// It answers with the body an editor is looking at (Contract 3: `draft ?? data`)
// for every document of a type, published or not, so the preview shows the page
// as it *would* look once everything currently staged is published.
//
// Three things follow from that and are worth stating out loud:
//
//   1. It needs the service role key. The anon grant in
//      migrations/0001_cms_tables.sql exposes `status = 'published'` and does
//      not expose the `draft` column at all — which is the correct design, and
//      it means a draft read is impossible without BYPASSRLS. No service key,
//      no drafts; see the empty-answer rule below.
//
//   2. It must never be reachable from a public page. Nothing in
//      `src/pages/index.js` calls it and nothing should: the one call site is
//      behind the draft-mode cookie, which /api/studio/preview only sets for a
//      signed-in editor.
//
//   3. It keeps read.js's contract — never throws, never returns null. A
//      preview that 500s because the CMS is half-installed teaches an editor
//      that the preview is broken, when what is true is that there is nothing
//      staged yet.

import { createDocumentRepository } from '../documents.js'
import { getAdminClient } from '../supabaseAdmin.js'
import { MAX_PER_PAGE } from '../query.js'
// The predicate and the ordering are shared with the archive reader, which has
// the same problem for the mirror-image reason — see ./bodies.js.
import { matchesBody, sortBodies } from './bodies.js'
import { DOCUMENT_ID } from './read.js'

let repository = null

const documents = () => {
    if (!repository) repository = createDocumentRepository({ client: getAdminClient() })
    return repository
}

// Same one-warning-per-type policy as read.js, and for the same reason: a dev
// server rendering the preview repeatedly should say "no service key" once, not
// on every scroll-triggered re-render.
const reported = new Set()

const report = (type, error) => {
    if (reported.has(type)) return
    reported.add(type)
    console.warn(
        `[cms] náhled: "${type}" se nepodařilo načíst v rozpracované verzi, ` +
        `používá se prázdný obsah: ${error?.message || error}`
    )
}

// Contract 3, one line: the editor's body is the draft if there is one, and the
// last published body otherwise.
const editableBody = (row) => row?.draft ?? row?.data ?? null

/**
 * The draft-mode counterpart of `readPublished`. Same signature, same promise:
 * an array of plain bodies, `[]` on any failure.
 *
 * The page limit is the query's ceiling rather than the caller's, because the
 * caller's `perPage` describes how many rows it wants *after* filtering and the
 * filtering happens in this process. 100 documents per type is the repository's
 * own maximum (query.js) and is an order of magnitude more than this site holds.
 *
 * Archived documents are absent without anything here saying so: `list()`
 * defaults to `archived: false` and adds the `archived_at is null` condition
 * itself, which is the same rule `listPublished` gives the public site. An
 * archive is a decision an editor has already made, and the preview should not
 * be the one place it stops holding.
 *
 * Each body carries `_id` — the row it came from — which `readPublished` does
 * not attach and must not. Visual editing has to be able to name the document
 * it is writing to, and this is the only reader whose answers are ever rendered
 * with editing switched on. See DOCUMENT_ID in read.js.
 *
 * @returns {Promise<object[]>} `draft ?? data` bodies with `_id`, or `[]`.
 */
export const readEditable = async ({ type, sort, filters, perPage = 50 } = {}) => {
    try {
        const { rows } = await documents().list({ type, perPage: MAX_PER_PAGE })
        const bodies = rows
            .map((row) => ({ id: row?.id, body: editableBody(row) }))
            .filter((entry) => entry.body && typeof entry.body === 'object')
            // An unpublished document whose draft was emptied has nothing to
            // show; treating it as content puts a blank row on the preview.
            // Counted before `_id` is attached, or every empty draft would look
            // like it had one field.
            .filter((entry) => Object.keys(entry.body).length > 0)
            .map((entry) => ({ ...entry.body, [DOCUMENT_ID]: entry.id }))
            .filter((body) => matchesBody(body, filters))
        return sortBodies(bodies, sort).slice(0, perPage)
    } catch (error) {
        report(type, error)
        return []
    }
}
