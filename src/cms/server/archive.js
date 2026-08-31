// The only place in the CMS that destroys anything — SERVER ONLY.
//
// ARCHIVE.md's settled position, in one file: nothing is ever deleted
// automatically — not a file, not a revision, not an old version — and
// everything that destroys is one deliberate, confirmed, owner-only action in
// the Archive. `media.remove` became `media.archive` and the delete buttons
// elsewhere go away; this is where what they used to do now lives.
//
// Three obligations, and each of them is a refusal or a promise the server makes
// rather than something a screen is trusted to arrange:
//
//   1. A revision that is also today's published body cannot be destroyed. That
//      is not history, it is the web. A hidden button is not a control, so the
//      refusal is here and the screen merely does not offer it.
//   2. Only an owner may destroy. Checked in handlers/archive.js before this
//      module is constructed, exactly as user management is (see users.js), and
//      re-stated on `purge()` itself because this is the one operation in the
//      system with no undo.
//   3. Before destroying, the server must be able to SAY what would be
//      destroyed — how many revisions, which days, how many files, how many
//      bytes — because the confirmation ARCHIVE.md specifies names those numbers
//      and a confirmation that names numbers the server did not produce is a
//      guess. `report()` and `purge()` therefore share one resolver: the count
//      shown and the rows removed are the same list, not two queries that agree
//      today.
//
// The extra refusal, stated plainly because it is not in the brief: a FILE that
// a currently published document still uses is refused too, on exactly the
// argument the design makes for the live body — destroying it would not be
// deleting history, it would be breaking the site that is up. It is reported as
// `in_use` and can be lifted by taking the file off the page first.

import { conflict, forbidden, invalid, serverError } from './errors.js'
import { MAX_PER_PAGE } from './query.js'
import { assetIdsIn } from './mediaArchive.js'

/**
 * Key-ordered JSON, so two bodies are compared by content rather than by the
 * order Postgres happened to return their keys in. jsonb does not preserve
 * insertion order and the file store's clone does, which is precisely the kind
 * of difference that would make the "is this the live body" refusal work on one
 * developer's machine and not in production.
 */
const canonical = (value) => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
        .join(',')}}`
}

const ids = (value) =>
    [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry)).filter(Boolean))]

export const createArchiveService = ({ documents, revisions, media, mediaArchive }) => {
    if (!documents || !revisions || !media) throw serverError('createArchiveService: chybí repozitáře')

    /**
     * Every asset id that a document on the public site right now refers to.
     *
     * Read rather than remembered. The alternative — a reference count kept up
     * to date on every write — is a second source of truth about which files are
     * in use, and the failure it produces is a file that "is not used by
     * anything" and is on the homepage. This runs once per confirmation, on an
     * owner-only screen, over the published set; on this site that is two pages
     * of documents.
     */
    const liveAssetIds = async () => {
        const found = new Set()
        for (let page = 1; ; page += 1) {
            const { rows, total } = await documents.listPublished({ page, perPage: MAX_PER_PAGE })
            for (const doc of rows) assetIdsIn(doc.data).forEach((id) => found.add(id))
            if (page * MAX_PER_PAGE >= total || !rows.length) break
        }
        return found
    }

    /**
     * A selection turned into the exact rows it names, plus the reasons any of
     * them will not be destroyed.
     *
     * `revisionIds` / `mediaIds` are what the Archive's checkboxes produce.
     * `documentId` + `from` / `to` is the other shape a real request takes: an
     * erasure under GDPR is "everything this document ever said", which the
     * right to be forgotten reaches into whether it is convenient or not, and
     * which nobody is going to tick a hundred boxes for.
     */
    const resolve = async (selection = {}) => {
        const revisionIds = ids(selection.revisionIds)
        const mediaIds = ids(selection.mediaIds)
        const { documentId, from, to } = selection

        if (!revisionIds.length && !mediaIds.length && !documentId) {
            throw invalid('Ke smazání nebylo nic vybráno')
        }

        const selectedRevisions = revisionIds.length ? await revisions.byIds(revisionIds) : []

        if (documentId) {
            // Paged through rather than asked for in one go, because a document
            // that has been republished daily for two years has more revisions
            // than any one page returns and a purge that silently stopped at the
            // page size would report a number it then failed to reach.
            for (let page = 1; ; page += 1) {
                const { rows, total } = await revisions.list({
                    documentId, from, to, page, perPage: MAX_PER_PAGE,
                })
                rows.forEach((row) => selectedRevisions.push(row))
                if (page * MAX_PER_PAGE >= total || !rows.length) break
            }
        }

        // byIds and the paged list can name the same revision.
        const revisionRows = [...new Map(selectedRevisions.map((row) => [row.id, row])).values()]
        const mediaRows = mediaIds.length ? await media.byIds(mediaIds) : []

        const blocked = []

        // One read per distinct document, not per revision: a hundred revisions
        // of one document ask the same question a hundred times.
        const documentCache = new Map()
        const documentFor = async (id) => {
            if (!documentCache.has(id)) {
                documentCache.set(id, await documents.get({ id }).catch(() => null))
            }
            return documentCache.get(id)
        }

        for (const revision of revisionRows) {
            const document = await documentFor(revision.documentId)
            // The document is gone, so no body of it is live and every revision
            // of it is history in the plainest sense.
            if (!document) continue
            if (document.status !== 'published') continue
            if (canonical(document.data) !== canonical(revision.body)) continue
            blocked.push({
                kind: 'revision',
                id: revision.id,
                reason: 'live_body',
                // Czech: this reaches an editor's screen verbatim.
                message: 'Tuto verzi web právě zobrazuje. Není to historie, je to web.',
            })
        }

        if (mediaRows.length) {
            const live = await liveAssetIds()
            for (const asset of mediaRows) {
                if (!live.has(asset.id)) continue
                blocked.push({
                    kind: 'media',
                    id: asset.id,
                    reason: 'in_use',
                    message: 'Tento soubor je na publikované stránce. Nejdřív ho z ní odeberte.',
                })
            }
        }

        return { revisions: revisionRows, media: mediaRows, blocked }
    }

    return {
        /**
         * What a destroy would take, in the numbers the confirmation prints.
         *
         * ARCHIVE.md is specific about the sentence — *„Jste si opravdu jisti?
         * Tato akce nelze vrátit zpět."* above **what exactly disappears: how
         * many revisions, which days, how many files, how much space** — and
         * this is where those four numbers come from. `days` is a range rather
         * than a count of distinct dates because "od 3. 3. do 14. 6." is what a
         * person checks a deletion against.
         */
        async report(selection) {
            const { revisions: revisionRows, media: mediaRows, blocked } = await resolve(selection)

            const times = revisionRows
                .map((row) => row.changedAt)
                .filter(Boolean)
                .sort()

            // The bytes a destroy would actually release. Two rows sharing one
            // content-addressed object release it once, and the same set
            // arithmetic runs in media.hardDelete() — counted here so the
            // confirmation cannot promise more space than the deletion frees.
            const seen = new Set()
            let bytes = 0
            for (const asset of mediaRows) {
                const key = `${asset.bucket} ${asset.path}`
                if (seen.has(key)) continue
                seen.add(key)
                bytes += asset.size || 0
            }

            return {
                revisions: {
                    count: revisionRows.length,
                    from: times[0] || null,
                    to: times[times.length - 1] || null,
                    documents: new Set(revisionRows.map((row) => row.documentId)).size,
                },
                media: { count: mediaRows.length, bytes },
                blocked,
            }
        },

        /**
         * Destroy exactly what report() described.
         *
         * All or nothing on the refusals: if anything in the selection is
         * blocked, the whole call is refused rather than quietly doing less than
         * the confirmation named. The screen has already asked for a report, so
         * a request that reaches here with a blocked row is either a stale
         * screen or a client that skipped the step — and both deserve the
         * refusal rather than a partial success nobody can audit.
         */
        async purge(selection, { actor } = {}) {
            // Re-stated here even though handlers/archive.js has already checked
            // it. Everywhere else in this codebase authorisation lives in the
            // handler alone and that rule is right; this is the one operation
            // with no undo, and users.js sets the precedent that the irreversible
            // ones are checked where they happen too.
            if (actor?.role !== 'owner') {
                throw forbidden('Trvale mazat z archivu smí jen vlastník')
            }

            const { revisions: revisionRows, media: mediaRows, blocked } = await resolve(selection)

            if (blocked.length) {
                const live = blocked.filter((entry) => entry.reason === 'live_body').length
                const used = blocked.filter((entry) => entry.reason === 'in_use').length
                throw conflict(
                    'Smazání odmítnuto: ' +
                    [
                        live ? `${live}× verze, kterou web právě zobrazuje` : null,
                        used ? `${used}× soubor na publikované stránce` : null,
                    ].filter(Boolean).join(', ') +
                    '.'
                )
            }

            const removedRevisions = await revisions.removeByIds(revisionRows.map((row) => row.id))
            const removedMedia = await media.hardDelete(mediaRows.map((row) => row.id))

            // One line per destruction, naming what it took. This is the only
            // action in the CMS that cannot be undone; a log line is the cheapest
            // thing that can answer "what happened to it" afterwards.
            console.info(
                `[cms] archiv: trvale smazáno ${removedRevisions} revizí a ` +
                `${removedMedia.rows} souborů (${removedMedia.bytes} B) — ${actor?.email || actor?.id}`
            )

            return { revisions: removedRevisions, media: removedMedia }
        },

        /**
         * The Média subpage's data: every file the archive knows about, with the
         * dates cms_media cannot answer and the one fact only the live site can
         * — whether it is in use today.
         */
        async mediaLedger({ page, perPage, search, archived = 'all' } = {}) {
            const listing = await media.list({ page, perPage, search, archived })
            const dates = mediaArchive
                ? new Map((await mediaArchive.list(listing.rows.map((row) => row.id)))
                    .map((row) => [row.mediaId, row]))
                : new Map()
            const live = await liveAssetIds()

            return {
                ...listing,
                rows: listing.rows.map((asset) => ({
                    ...asset,
                    uploadedAt: asset.createdAt,
                    firstPublishedAt: dates.get(asset.id)?.firstPublishedAt ?? null,
                    inUseNow: live.has(asset.id),
                })),
            }
        },
    }
}
