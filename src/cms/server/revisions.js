// cms_document_revision — one row per change to what the public can see.
//
// The problem this exists for, stated exactly: documents.js `publish()` writes
// `data` in place, so until this table existed, every publish destroyed the body
// the previous publish had put there. Nothing anywhere kept it. History is
// therefore not something that can be recovered later and switched on — it
// starts the day the first row lands here and contains nothing from before.
//
// WHAT IS RECORDED, AND WHY IT IS THE STATE AFTER
//
// A revision holds the document's published body and publish state as they are
// when the transition has finished. That is what makes ARCHIVE.md's layer 2 a
// query instead of a stored snapshot: "what was published at T" is, per
// document, the last revision with `changed_at <= T`, kept when its `status` is
// 'published' and its `archived_at` is null. An unpublish writes a row whose
// status is 'draft', so the same query stops showing the document at exactly the
// moment the site stopped showing it, and nothing has to be reasoned about.
//
// WHAT IS NOT RECORDED
//
// Draft writes. `update()` and `patchField()` move `draft` and only `draft`
// (adapter.js says why `data` is unreachable from them), so nothing a visitor
// can see has changed and there is nothing for an archive of the public site to
// say. This is why the writer is called from handlers/documents.js's four
// transitions rather than from the repository: the repository's methods are also
// how a draft is saved, and a writer sitting there would have to re-derive which
// calls mattered.
//
// FAILURE MODE, CHOSEN
//
// Writing a revision must never be able to fail a publish. A publish that
// succeeds and then answers 500 because the history write lost a race is worse
// than no history at all — the editor presses the button again, and the second
// press is a second publish. So `record()` is called inside a catch in the
// handler, the same posture revalidate.js takes, and its result is reported
// beside the document as `revision: { ok, ... }` rather than thrown. A lost
// revision is a hole in the archive that the log names; a failed publish is a
// broken CMS.

import { currentBuildId } from './buildId.js'
import { cmsErrorFromPostgrest, notFound, serverError } from './errors.js'
import { assetIdsIn } from './mediaArchive.js'
import { MAX_PER_PAGE, REVISION_COLUMNS, toRevision } from './query.js'

const TABLE = 'cms_document_revision'

// The transitions of handlers/documents.js, and the only values `reason` takes.
// Checked here as well as by the column constraint so a typo fails in
// JavaScript, where the caller is, rather than as a Postgres 23514 three layers
// down.
//
// `reject` and `requeue` are the moderation pair (migrations/0008). They are
// here rather than folded into archive/restore because the one question this
// column exists to answer is which transition ran, and "a review was refused
// publication" is a different answer from "a document was filed away" — it is
// the answer a consumer-protection question is actually about. A rejection's
// body is legitimately empty, by the way: a review that was never approved was
// never public, and this table holds what the public could see.
export const REVISION_REASONS = Object.freeze([
    'publish', 'unpublish', 'archive', 'restore', 'reject', 'requeue',
])

export const createRevisionRepository = ({ client, mediaArchive = null }) => {
    if (!client) throw serverError('createRevisionRepository: chybí Supabase klient')

    const table = () => client.from(TABLE)

    const repo = {
        /**
         * Append one transition.
         *
         * `document` is the document as it is AFTER the transition — the row the
         * handler just got back. `at` is the instant the change reached the
         * store, passed in rather than taken as now() so that the revision, the
         * revalidation report and any media dates derived from it all name the
         * same moment.
         */
        async record({ document, reason, changedBy = null, at = new Date().toISOString() }) {
            if (!document?.id) throw serverError('record(): chybí dokument')
            if (!REVISION_REASONS.includes(reason)) {
                throw serverError(`record(): neznámý přechod "${reason}"`)
            }

            const row = {
                document_id: document.id,
                type: document.type,
                // The published body, never the draft. A draft has never been
                // public, so an archive of the public site has no business
                // holding it — and `data` is exactly what a visitor was served.
                body: document.data || {},
                status: document.status,
                archived_at: document.archivedAt ?? null,
                changed_at: at,
                changed_by: changedBy,
                reason,
                build_id: currentBuildId(),
            }

            const { data, error } = await table()
                .insert(row)
                .select(REVISION_COLUMNS)
                .single()
            if (error) throw cmsErrorFromPostgrest(error, 'Zápis revize selhal')

            const revision = toRevision(data)

            // Derived, and derived from the row that is now safely stored. If
            // this half fails the revision still stands and the date can be
            // recomputed from the archive later; if it were done first, a
            // failure would cost the body itself.
            if (mediaArchive && revision.status === 'published' && !revision.archivedAt) {
                try {
                    await mediaArchive.notePublished({
                        mediaIds: assetIdsIn(revision.body),
                        at: revision.changedAt,
                    })
                } catch (mediaError) {
                    console.warn(
                        `[cms] archiv: revize ${revision.id} uložena, datum první publikace souborů ne ` +
                        `(${mediaError?.message || mediaError})`
                    )
                }
            }

            return revision
        },

        /**
         * The timeline, newest first.
         *
         * `documentId` narrows it to one document's history, `type` to one
         * content type, `from`/`to` to a window — the three axes the Archive's
         * Změny and Texty subpages filter on, and the three a GDPR erasure needs
         * to name what it is about to destroy.
         */
        async list({ documentId, type, reason, from, to, page = 1, perPage = 50 } = {}) {
            const resolvedPage = Math.max(1, Number.parseInt(page, 10) || 1)
            const resolvedPerPage = Math.min(
                MAX_PER_PAGE,
                Math.max(1, Number.parseInt(perPage, 10) || 50)
            )
            const offset = (resolvedPage - 1) * resolvedPerPage

            let query = table()
                .select(REVISION_COLUMNS, { count: 'exact' })
                // Ties are possible: two documents published by one click on
                // "Publikovat vše" share a millisecond. `id` second makes the
                // order total, so page 2 cannot repeat a row from page 1.
                .order('changed_at', { ascending: false })
                .order('id', { ascending: false })
                .range(offset, offset + resolvedPerPage - 1)

            if (documentId) query = query.eq('document_id', documentId)
            if (type) query = query.eq('type', type)
            if (reason) query = query.eq('reason', reason)
            if (from) query = query.gte('changed_at', from)
            if (to) query = query.lte('changed_at', to)

            const { data, error, count } = await query
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení revizí selhalo')
            return {
                rows: (data || []).map(toRevision),
                total: count ?? 0,
                page: resolvedPage,
                perPage: resolvedPerPage,
            }
        },

        async get({ id }) {
            if (!id) throw notFound('Revize nenalezena')
            const { data, error } = await table()
                .select(REVISION_COLUMNS)
                .eq('id', id)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení revize selhalo')
            if (!data) throw notFound('Revize nenalezena')
            return toRevision(data)
        },

        /** Exactly these ids, for the one place that is allowed to destroy them. */
        async byIds(ids) {
            if (!ids.length) return []
            const { data, error } = await table()
                .select(REVISION_COLUMNS)
                .in('id', ids)
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení revizí selhalo')
            return (data || []).map(toRevision)
        },

        /**
         * The only delete in this module, and it has no filters of its own.
         *
         * A caller must have resolved the exact ids first, which is what makes
         * archive.js able to promise that the confirmation named what vanished:
         * the same list is counted and then destroyed. A `deleteWhere(...)`
         * here would let the two drift the moment a row was written between the
         * count and the delete.
         */
        async removeByIds(ids) {
            if (!ids.length) return 0
            const { error, count } = await table()
                .delete({ count: 'exact' })
                .in('id', ids)
            if (error) throw cmsErrorFromPostgrest(error, 'Smazání revizí selhalo')
            return count ?? 0
        },
    }

    return repo
}
