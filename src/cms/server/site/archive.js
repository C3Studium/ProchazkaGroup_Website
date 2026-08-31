// The site as it was at a chosen moment — SERVER ONLY.
//
// The third reader. `read.js` answers "what is published now", `draft.js`
// answers "what would be published if everything staged went out", and this
// answers "what was published at time T". All three have the same signature and
// the same promise, which is the whole reason this feature is small: page.js
// already chooses a reader, so a moment is one more lever on a switch that
// exists, not a second rendering path.
//
// ---------------------------------------------------------------------------
// "What was published at T" is a query, not a snapshot
// ---------------------------------------------------------------------------
//
// For each document: the LATEST revision whose `changed_at <= T`; keep it if
// that revision says `status = 'published'` and carries no `archived_at`.
// Nothing is stored per moment, so a year of history costs one row per editorial
// change rather than one copy of the site per day. See ARCHIVE.md, layer 2.
//
// The three things that make this a real reconstruction rather than a plausible
// one, each of which was a way to get it wrong:
//
//   - the ORDER comes from `data.order` **in the archived bodies**, not from the
//     documents as they stand today. That is why sorting happens in this process
//     (./bodies.js) instead of in the query;
//   - a document ARCHIVED before T is absent, and one archived after T is
//     present, because the answer is read off the revision rather than off the
//     row's current `archived_at`;
//   - MEDIA needs no work at all. `ports/storage.js` builds an object key from a
//     hash of the bytes, so replacing an image writes a new key and the old file
//     is never overwritten. An archived body holds the old URL and the old URL
//     still resolves to the old picture. This is the single most valuable
//     property the archive has and it fell out of a decision made for
//     deduplication.
//
// ---------------------------------------------------------------------------
// What it cannot do, stated rather than hidden
// ---------------------------------------------------------------------------
//
// Old bodies are replayed through TODAY'S components and TODAY'S
// `cms.config.js`. If either changed, the result is something that never
// existed. `getArchiveMoment` exists so the screen can carry that admission with
// the render — the build the revision was written under, the build running now,
// and the list limits being applied — and ARCHIVE.md is explicit that the screen
// may say "obsah z 3. března, přehraný dnešním kódem" and may never say "takhle
// web vypadal".
//
// ---------------------------------------------------------------------------
// The service-role client, and why the public site cannot reach any of this
// ---------------------------------------------------------------------------
//
// `cms_document_revision` holds everything that was EVER published, including
// what somebody later withdrew, so it is owner-only data (ARCHIVE.md, "Kdo tam
// smí") and there is no anon grant to read it with. Same client as draft.js and
// the same consequence: no service-role key, no archive — which the empty-answer
// rule below turns into a page rendering the copy it ships with rather than a
// 500.
//
// Nothing gives a moment to a public page. `at` never comes off a URL: it
// travels in Next's signed, encrypted preview-data cookie, which only
// /api/studio/archive issues and only to a signed-in owner (`viewOf` below). A
// query parameter a visitor can type reaches nothing, which is the same
// guarantee `src/pages/index.js` keeps for drafts by calling
// `getHomepageContent()` with no arguments — one step stronger, because here
// there is no parameter to type.

import site from '@/cms/site/config'
import { pageFor } from '@/cms/site'

import { currentBuildId } from '../buildId.js'
import { REVISION_COLUMNS } from '../query.js'
import { getAdminClient } from '../supabaseAdmin.js'
import { matchesBody, sortBodies } from './bodies.js'
import { readEditable } from './draft.js'
import { readPublished } from './read.js'

const TABLE = 'cms_document_revision'

/**
 * How many revisions of one type are read to reconstruct one moment.
 *
 * The correct query is `distinct on (document_id) … order by document_id,
 * changed_at desc`, which PostgREST cannot express, so the reduction happens in
 * this process and the scan is bounded here instead. Bounded rather than
 * unbounded because this runs inside a page render: a table that has grown for
 * five years must not be able to turn one archive view into a full-table read.
 *
 * Two thousand rows is roughly a decade of this site at two editorial changes a
 * day, and hitting it is REPORTED rather than swallowed — a moment reconstructed
 * from a truncated scan is missing documents, and an archive that quietly drops
 * documents is worse than one that says it could not answer.
 */
export const REVISION_SCAN_LIMIT = 2000

let client = null

const db = () => {
    if (!client) client = getAdminClient()
    return client
}

// Same one-warning-per-type policy as read.js and draft.js: a dev server
// rendering an archived page repeatedly should say "no such table" once.
const reported = new Set()

const report = (key, error) => {
    if (reported.has(key)) return
    reported.add(key)
    console.warn(
        `[cms] archiv: "${key}" se k danému okamžiku nepodařilo načíst, ` +
        `používá se prázdný obsah: ${error?.message || error}`
    )
}

/**
 * A moment, normalised to the one form everything below compares against, or
 * `null` for anything that is not a moment.
 *
 * `null` is never "now". An unreadable `at` that fell back to the published site
 * would be the archive's one unforgivable failure — a screen captioned "3.
 * března" showing today's copy — so the callers below turn `null` into an empty
 * answer, which renders the components' own text and cannot be mistaken for a
 * reconstruction.
 */
export const momentOf = (value) => {
    if (value === null || value === undefined || value === '') return null
    const date = value instanceof Date ? value : new Date(value)
    const ms = date.getTime()
    if (!Number.isFinite(ms)) return null
    return date.toISOString()
}

/**
 * Every revision of one type at or before the moment, newest first.
 *
 * Ordered on `changed_at` and then on `id`, because "newest first" has to be a
 * total order for the reduction below to be deterministic: two transitions
 * written in the same millisecond would otherwise reconstruct differently on
 * two renders of the same moment.
 */
const revisionsUpTo = async ({ type, at }) => {
    const query = db()
        .from(TABLE)
        .select(REVISION_COLUMNS)
        .lte('changed_at', at)
        .order('changed_at', { ascending: false })
        .order('id', { ascending: false })
        // One more than the cap, so that "the scan was truncated" is a fact
        // about the answer rather than a guess from a full page.
        .limit(REVISION_SCAN_LIMIT + 1)

    const { data, error } = type ? await query.eq('type', type) : await query
    if (error) throw new Error(error.message || 'čtení revizí selhalo')
    const rows = data || []
    if (rows.length > REVISION_SCAN_LIMIT) {
        throw new Error(
            `historie typu "${type}" přesáhla ${REVISION_SCAN_LIMIT} revizí; ` +
            'okamžik by byl zrekonstruovaný neúplně'
        )
    }
    return rows
}

/**
 * Newest-first revisions -> the bodies that were on the site at that moment.
 *
 * One pass: the first revision seen for a document is by construction its latest
 * at or before T, and every later one for the same document is history that had
 * already been superseded. Whether that revision is a publish, an unpublish or
 * an archival is read off the revision itself, which is what makes "withdrawn on
 * 2 March" and "archived on 5 March" answer differently at 3 March.
 *
 * No `_id` is attached, deliberately, on read.js's terms: the archive is a
 * record and nothing in it is editable (ARCHIVE.md, layer 3), so there is
 * nothing to name a document for — and a body with no `_id` is the same body the
 * public reader produces, which is what lets `at` = now be compared byte for
 * byte against the published page.
 */
const bodiesAsPublished = (rows) => {
    const seen = new Set()
    const bodies = []
    for (const row of rows) {
        const id = row?.document_id
        if (!id || seen.has(id)) continue
        seen.add(id)
        if (row.status !== 'published') continue
        if (row.archived_at != null) continue
        const body = row.body
        if (!body || typeof body !== 'object' || !Object.keys(body).length) continue
        bodies.push(body)
    }
    return bodies
}

/**
 * The archive counterpart of `readPublished`. Same signature plus `at`, same
 * promise: an array of plain bodies, `[]` on any failure.
 *
 * `perPage` is applied last, after the archived bodies have been filtered and
 * sorted, exactly as `readEditable` applies it — see the limit caveat in
 * `getArchiveMoment`, which is where the honest answer about it lives.
 *
 * @returns {Promise<object[]>} the bodies published at `at`, or `[]`.
 */
export const readAt = async ({ type, sort, filters, perPage = 50, at } = {}) => {
    const moment = momentOf(at)
    if (!moment) {
        report(`${type}@${at}`, new Error('neplatný okamžik'))
        return []
    }
    try {
        const bodies = bodiesAsPublished(await revisionsUpTo({ type, at: moment }))
            .filter((body) => matchesBody(body, filters))
        return sortBodies(bodies, sort).slice(0, perPage)
    } catch (error) {
        report(`${type}@${moment}`, error)
        return []
    }
}

/**
 * A moment that is present and cannot be read. Deliberately a value `momentOf`
 * rejects, so it travels through `readerFor` as "an archive session that cannot
 * be reconstructed" and comes out as the empty reader.
 */
const UNREADABLE_MOMENT = 'unreadable'

/** `readAt` with the moment already bound — the shape every reader has. */
export const readerAt = (at) => (args) => readAt({ ...args, at })

/**
 * Which of the three readers a view wants.
 *
 * One function so that the twelve `getStaticProps` bodies on this site keep
 * spelling the choice once each. The order matters: a moment wins over draft
 * mode, because the cookie that carries a moment also carries draft mode's flag
 * (Next builds one on top of the other) and an archive that silently showed
 * unpublished work would be the same lie in the other direction.
 *
 * An `at` that is present and unreadable answers empty rather than falling back
 * to the published site. See `momentOf`.
 */
export const readerFor = ({ draft = false, at = null } = {}) => {
    if (at === null || at === undefined || at === '') return draft ? readEditable : readPublished
    const moment = momentOf(at)
    if (!moment) return async () => []
    return readerAt(moment)
}

/**
 * What a request is asking to be shown, from the one channel that can carry it.
 *
 * `context.draftMode` and `context.previewData` are two halves of Next's own
 * preview cookie: draft mode is preview mode with no payload, so a request that
 * carries a moment reports `draftMode: true` as well. Reading them together here
 * is what stops every page having to know that.
 *
 * The moment is NOT read from `context.query` and must not be. A page of this
 * site is statically generated, so `query` is empty at build time and populated
 * only on a per-request render — a moment taken from there would be a parameter
 * a visitor could type onto a public URL and, worse, one that reads correct in
 * dev and does nothing in production. The cookie is signed and encrypted by Next
 * and is only ever issued by /api/studio/archive, to an owner.
 *
 * @returns {{ draft: boolean, at: string|null }}
 */
export const viewOf = (context) => {
    const raw = context?.previewData?.at
    if (raw === undefined) return { draft: Boolean(context?.draftMode), at: null }
    // A payload that names a moment and names it unreadably is a CORRUPTED
    // archive session, not a draft one. Answering `at: null` here would quietly
    // demote it to draft mode and put unpublished work inside a frame captioned
    // with a date — so the unreadable value is passed on, `momentOf` rejects it
    // again in `readerFor`, and the page renders the copy its components ship
    // with. Empty is the only answer that cannot be mistaken for a record.
    return { draft: false, at: momentOf(raw) ?? UNREADABLE_MOMENT }
}

/**
 * What the screen has to be able to say about the moment it is showing.
 *
 * Everything here is about the BOUNDARY rather than about the content, which is
 * why it is a separate call: `getPageContent` answers with props a page renders,
 * and mixing "which commit was live in March" into them would put a fact about
 * the archive inside the site's own data.
 *
 * `limits` is the honest half of the list-limit trap, and the answer is a
 * limitation rather than a fix. `cms.config.js` declares
 * `reviews: { type: 'review', limit: 12 }`; that file is CODE, it is not
 * versioned in the database, and nothing in a revision records what it said in
 * March. So the replay applies TODAY'S limits, and the only thing that can be
 * said truthfully is which limits were applied and whether the code has moved
 * since — hence `limits` and `sameBuild` travelling together.
 *
 * The trap only bites where the archive holds more documents of a type than the
 * limit allows: with eight reviews published in March, twelve or two hundred
 * make the same page. Where it does bite, the render shows the right documents
 * in the right order and possibly the wrong NUMBER of them. Reconstructing the
 * true limit would mean checking out `build_id` and reading its `cms.config.js`,
 * which is a job for a person with the repository, not for this reader.
 *
 * @param {{ at: string|Date|number, route?: string }} options
 */
export const getArchiveMoment = async ({ at, route = null } = {}) => {
    const moment = momentOf(at)
    const buildIdNow = currentBuildId()
    const page = route ? pageFor(site, route) : null
    // Declared limits, as they are being applied right now — read off the same
    // configuration `page.js` is about to hand to the readers, so the number the
    // screen prints cannot drift from the number that was used.
    const limits = Object.fromEntries(
        Object.entries(page?.sources || {}).map(([name, source]) => [name, source.limit ?? null])
    )

    const empty = {
        at: moment,
        valid: Boolean(moment),
        buildId: null,
        buildIdNow,
        sameBuild: false,
        changedAt: null,
        changedBy: null,
        reason: null,
        revisions: 0,
        limits,
    }
    if (!moment) return empty

    try {
        // The newest transition at or before T, of any type: its `build_id` is
        // the deployment that was running when the site last changed before the
        // moment being replayed, which is the closest thing to "the code then"
        // that a content archive can know.
        const { data, error, count } = await db()
            .from(TABLE)
            .select(REVISION_COLUMNS, { count: 'exact' })
            .lte('changed_at', moment)
            .order('changed_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(1)
        if (error) throw new Error(error.message || 'čtení revizí selhalo')
        const row = (data || [])[0] || null
        return {
            ...empty,
            buildId: row?.build_id || null,
            sameBuild: Boolean(row?.build_id) && row.build_id === buildIdNow,
            changedAt: row?.changed_at || null,
            changedBy: row?.changed_by || null,
            reason: row?.reason || null,
            // How much history stands behind the moment. `count` is the number
            // of rows the filter matched, not the one row `limit(1)` returned —
            // PostgREST reports both, which is the only reason this is one
            // round trip rather than two.
            revisions: count ?? 0,
        }
    } catch (error) {
        report(`moment@${moment}`, error)
        return empty
    }
}
