// Document repository — every read and write of cms_document.
//
// Draft model (Contract 3): the editable body always lives in `draft` once a
// document has been touched; `data` is the last published body and nothing but
// publish() ever writes it. That is what lets an editor rework a published page
// without the public site changing under its visitors, and it is why update()
// below never writes `data` even for a document that has never been published.
//
// The other half of that model is stated at update() and discardDraft(): `draft`
// is non-null exactly when there is something the public has not seen. Every
// badge, the `state` filter in query.js and the publish dialog read it that way,
// so a draft that merely repeats `data` is not stored and can be thrown away.

import { cmsErrorFromPostgrest, conflict, notFound, serverError } from './errors.js'
import { sameJson } from './validation.js'
import {
    DOCUMENT_COLUMNS,
    PUBLIC_DOCUMENT_COLUMNS,
    applyPlan,
    buildListQuery,
    toDocument,
} from './query.js'

const TABLE = 'cms_document'

/**
 * The one refusal this module makes about versions, worded once.
 *
 * The sentence is `studio/ui/feedback.jsx`'s `ERROR_COPY.conflict` text
 * verbatim. That copy has shipped since the Studio's first screen and nothing
 * in the system could produce it, because nothing checked a version; it is
 * reachable now and says the same thing in the toast, in the resolve dialog and
 * in `ErrorState`, rather than three near-misses of one idea.
 */
const versionConflict = () =>
    conflict('Někdo jiný obsah mezitím změnil. Načtěte jej znovu.')

export const createDocumentRepository = ({ client }) => {
    if (!client) throw serverError('createDocumentRepository: chybí Supabase klient')

    const table = () => client.from(TABLE)

    const repo = {
        /**
         * `archived` decides which side of the archive the caller wants, and it
         * is a first-class argument rather than a filter the caller remembers to
         * pass, because forgetting it is the one mistake that puts a retired
         * person back in front of an editor as though nothing had happened:
         *
         *   undefined / false  live documents only          (the default)
         *   true               archived documents only      (the archive view)
         *   'all'              both
         *
         * Defaulting to "live only" means every existing caller — the list
         * screens, the moderation queue, the overview counts — keeps its meaning
         * without being changed.
         */
        async list({ archived = false, ...args } = {}) {
            const filters = { ...(args.filters || {}) }
            if (archived === true) filters.archivedAt = { op: 'isNot', value: null }
            else if (archived !== 'all') filters.archivedAt = null

            const plan = buildListQuery({ ...args, filters })
            const query = applyPlan(
                table().select(plan.columns, { count: 'exact' }),
                plan
            )
            const { data, error, count } = await query
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení dokumentů selhalo')
            return {
                rows: (data || []).map(toDocument),
                total: count ?? 0,
                page: plan.page,
                perPage: plan.perPage,
            }
        },

        // Public-site read: published, unarchived rows only, and only the
        // columns the anon grant exposes. Uses the same code path as the Studio
        // so there is one list implementation, not two that can drift.
        //
        // Both halves of the condition are also in the RLS policy
        // (migrations/0003). The policy is the enforcement and this is the
        // optimisation: an archived consultant is unreachable with the anon key
        // even if this line is deleted.
        async listPublished(args = {}) {
            return repo.list({
                ...args,
                archived: false,
                columns: PUBLIC_DOCUMENT_COLUMNS,
                filters: { ...(args.filters || {}), status: 'published' },
            })
        },

        async get({ id }) {
            if (!id) throw notFound()
            const { data, error } = await table()
                .select(DOCUMENT_COLUMNS)
                .eq('id', id)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení dokumentu selhalo')
            if (!data) throw notFound('Dokument nenalezen')
            return toDocument(data)
        },

        async getByLegacy({ source, legacyId }) {
            const { data, error } = await table()
                .select(DOCUMENT_COLUMNS)
                .eq('legacy_source', source)
                .eq('legacy_id', String(legacyId))
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení dokumentu selhalo')
            return data ? toDocument(data) : null
        },

        /**
         * Every document that carries one provenance mark, in one read.
         *
         * getByLegacy() answers for one row and is right for the review route,
         * which knows exactly which row it wants. A seeder knows a hundred and
         * twenty of them, and asking one at a time is a hundred and twenty round
         * trips to establish a fact — "what is already there" — that one query
         * answers. list() cannot do it: `legacy_source` is not in query.js's
         * SCALAR_FIELDS, so a filter naming it would be read as a path into
         * `data`, match nothing, and report an empty table as the plan.
         *
         * Deliberately unpaged. The caller is comparing against a fixed set it
         * already holds in memory, so a page boundary here would only be a way
         * to silently miss half of it.
         */
        async listByLegacySource({ source }) {
            const { data, error } = await table()
                .select(DOCUMENT_COLUMNS)
                .eq('legacy_source', source)
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení dokumentů selhalo')
            return (data || []).map(toDocument)
        },

        /**
         * Insert one complete Contract 3 row exactly as given.
         *
         * create() cannot express this and must not learn how. It mints the id,
         * refuses to fill `data`, stamps `published_at` itself and has never
         * heard of `archived_at` — every one of those is right for an editor
         * pressing "Nový" and wrong for content that already exists and is being
         * moved into this table with the state and the dates it already had.
         * The archived consultant in the fixtures is the case that makes the
         * difference concrete: through create() she would arrive un-archived.
         *
         * It lives here rather than in the script because this file is where
         * cms_document's column names are spelled. A seeder that spelled them
         * itself would be the second place they live and the first one to drift
         * — which is the whole reason the seeder writes through a repository
         * instead of PostgREST.
         *
         * `search_text` is never named: 0001 makes it `generated always as`, and
         * Postgres rejects an insert that mentions a generated column at all.
         *
         * The row is trusted. Validation, minting the id and deciding what
         * already exists belong to the caller — one command a person runs with a
         * printed plan in front of it, not a request handler.
         */
        async importRow(row) {
            const { data: inserted, error } = await table()
                .insert({
                    id: row.id,
                    type: row.type,
                    status: row.status,
                    data: row.data ?? {},
                    draft: row.draft ?? null,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    published_at: row.published_at ?? null,
                    archived_at: row.archived_at ?? null,
                    created_by: row.created_by ?? null,
                    updated_by: row.updated_by ?? null,
                    legacy_source: row.legacy_source ?? null,
                    legacy_id: row.legacy_id == null ? null : String(row.legacy_id),
                })
                .select(DOCUMENT_COLUMNS)
                .single()
            if (error) throw cmsErrorFromPostgrest(error, 'Vložení dokumentu selhalo')
            return toDocument(inserted)
        },

        /**
         * A new document starts unpublished with its body in `draft`. `data`
         * stays empty so that nothing can reach the public site before someone
         * publishes it deliberately — a create() that populated `data` would
         * make "published" a property of a later call rather than of the row.
         */
        async create({ type, data, createdBy = null, status = 'draft', publishedAt = null,
                       legacySource = null, legacyId = null }) {
            const body = data && typeof data === 'object' ? data : {}
            const publishing = status === 'published'

            const row = {
                type,
                status: publishing ? 'published' : 'draft',
                data: publishing ? body : {},
                draft: publishing ? null : body,
                created_by: createdBy,
                updated_by: createdBy,
                published_at: publishing ? (publishedAt || new Date().toISOString()) : null,
                legacy_source: legacySource,
                legacy_id: legacyId === null ? null : String(legacyId),
            }

            const { data: inserted, error } = await table()
                .insert(row)
                .select(DOCUMENT_COLUMNS)
                .single()
            if (error) throw cmsErrorFromPostgrest(error, 'Vytvoření dokumentu selhalo')
            return toDocument(inserted)
        },

        /**
         * Full body in, full body stored — the port's contract says the caller
         * sends everything and the server diffs. The "diff" that matters here
         * is that only `draft` moves; the published body is untouched until
         * publish().
         *
         * A body that says exactly what `data` already says stores NO draft.
         *
         * That is not an optimisation, it is the invariant the whole publish UI
         * rests on: `draft is not null` has to mean "there is something the
         * public has not seen", because that is what the badge, the state filter
         * in query.js and the publish dialog all read it as. Without this line
         * the store fills up with drafts that are copies of the published body —
         * 10 of 43 when it was last counted — every one of them a "Čeká na
         * zveřejnění" badge on a document nobody has changed, and a row in a
         * publish dialog that would change nothing.
         *
         * They arrive by the most ordinary route there is: an editor opens a
         * document, reads it, and presses Uložit. The overlay already refuses to
         * write an unchanged value for the same reason (edit/overlay/Overlay.jsx,
         * `Commit`); this is that rule where it cannot be skipped.
         *
         * Nothing is lost by it. An editor reads `draft ?? data`, and when the
         * two are equal, dropping the first changes no answer.
         *
         * The read this costs is the same one publish(), reject() and requeue()
         * already do. `sameJson` and not `===` on the stringified bodies: see
         * @/cms/core/body.js for what jsonb does to key order.
         *
         * ------------------------------------------------------------------
         * `baseVersion` — the version the caller was looking at
         * ------------------------------------------------------------------
         *
         * Until this existed the statement below was filtered on `id` and
         * nothing else, so the last write won and the loser was never told.
         * Measured on two signed-in browsers: A saved, B saved nine seconds
         * later without ever having seen A's value, and A's edit was gone with
         * a green "Uloženo jako koncept" under it.
         *
         * The version is `updated_at` and it is an OPAQUE STRING. Postgres
         * renders microseconds and the file store milliseconds; anything that
         * parsed it into a Date and re-rendered it would truncate and then
         * report a conflict that did not happen — which is the failure mode
         * this whole guard is not allowed to have. It is compared, never read.
         *
         * `updated_at` rather than a new counter column because it already
         * exists (a BEFORE UPDATE trigger in migrations/0001, transcribed in
         * fileStore/client.js `touch`), already crosses the wire on every
         * document as `updatedAt`, and already moves on exactly the writes that
         * matter. A `version integer` would need a migration, a trigger and a
         * backfill to say the same thing.
         *
         * TWO GUARDS, ONE MEANING. The comparison against the row we just read
         * is what produces the message; `.eq('updated_at', …)` on the statement
         * is what makes it true — between the read and the write there is a
         * round trip, and a check that only ran in JavaScript would have the
         * very window it is closing.
         *
         * OPTIONAL, AND ON PURPOSE. A caller that genuinely has no version to
         * name omits it and keeps its old meaning — the archive's "put this old
         * body back" (studio/views/ArchiveView.jsx) is a deliberate overwrite of
         * whatever is there, and the review route writes a document no editor
         * has open. Inventing a version for them would be a check that always
         * passes. They still get the statement-level guard, which is the half
         * that costs nothing to be right about: it can only fire when a real
         * write landed between this method's own read and its own write.
         *
         * THE NO-OP COMES FIRST, and that ordering is the anti-false-conflict
         * rule. A write that would store exactly what is already stored cannot
         * lose anybody's work, so it is answered rather than refused — which is
         * what makes a double-click, a retried request and "press Uložit twice"
         * incapable of producing a 409. It also stops `updated_at` moving for a
         * save that stored nothing, which used to invalidate every other tab's
         * version for no reason at all.
         */
        async update({ id, data, updatedBy = null, baseVersion = null }) {
            const body = data && typeof data === 'object' ? data : {}
            const current = await repo.get({ id })
            const draft = sameJson(body, current.data) ? null : body

            if (sameJson(draft, current.draft)) return current

            if (baseVersion != null && baseVersion !== current.updatedAt) throw versionConflict()

            const { data: updated, error } = await table()
                .update({ draft, updated_by: updatedBy })
                .eq('id', id)
                .eq('updated_at', current.updatedAt)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Uložení dokumentu selhalo')
            if (!updated) {
                // Nothing matched, which is either a wrong id or the version
                // guard biting. get() throws not_found for the first, so
                // reaching past it means the second — the same shape archive()
                // uses one screen down, and for the same reason: reporting "not
                // found" for a document the editor is looking at is a lie.
                await repo.get({ id })
                throw versionConflict()
            }
            return toDocument(updated)
        },

        // Used by the public review route and the migration, both of which need
        // to write `data` directly rather than stage a draft.
        async replacePublished({ id, data, publishedAt = null }) {
            const { data: updated, error } = await table()
                .update({
                    data,
                    draft: null,
                    status: 'published',
                    published_at: publishedAt || new Date().toISOString(),
                })
                .eq('id', id)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Uložení dokumentu selhalo')
            if (!updated) throw notFound('Dokument nenalezen')
            return toDocument(updated)
        },

        async remove({ id }) {
            const { error, count } = await table()
                .delete({ count: 'exact' })
                .eq('id', id)
            if (error) throw cmsErrorFromPostgrest(error, 'Smazání dokumentu selhalo')
            if (!count) throw notFound('Dokument nenalezen')
        },

        async publish({ id, updatedBy = null }) {
            const current = await repo.get({ id })
            const body = current.draft ?? current.data
            if (!body || !Object.keys(body).length) {
                throw conflict('Prázdný dokument nelze publikovat')
            }

            /**
             * Publishing what is already published is not a publish.
             *
             * Measured, not supposed: three POSTs to /publish on an untouched
             * document produced three rows in cms_document_revision, all with
             * the same body. The archive is kept so somebody can answer "what
             * did the site say on this date", and a run of identical versions
             * makes that question harder to answer, not easier.
             *
             * NOT an error, though. The editor did nothing wrong — they pressed
             * a button that was offered — and a red dialog for "the site
             * already says this" would be a worse answer than doing nothing
             * quietly. So it returns the document with `unchanged: true`, and
             * the handler reads that to skip both the revision and the
             * revalidation. See handlers/documents.js.
             *
             * `published_at` is deliberately NOT bumped. It means "when the
             * public last saw something new", and a press that changed nothing
             * did not make that a different moment.
             *
             * A draft identical to the published body is cleared on the way
             * through. That is the state migrations/0009 exists to clean up —
             * ten of forty-three drafts were copies — and leaving it in place
             * would keep the document looking like it had something pending.
             */
            if (current.status === 'published' && sameJson(body, current.data)) {
                if (!current.draft) return { ...current, unchanged: true }

                const { data: tidied, error: tidyError } = await table()
                    .update({ draft: null, updated_by: updatedBy })
                    .eq('id', id)
                    .select(DOCUMENT_COLUMNS)
                    .maybeSingle()
                if (tidyError) throw cmsErrorFromPostgrest(tidyError, 'Publikování selhalo')
                if (!tidied) throw notFound('Dokument nenalezen')
                return { ...toDocument(tidied), unchanged: true }
            }

            const { data: updated, error } = await table()
                .update({
                    data: body,
                    draft: null,
                    status: 'published',
                    published_at: new Date().toISOString(),
                    updated_by: updatedBy,
                })
                .eq('id', id)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Publikování selhalo')
            if (!updated) throw notFound('Dokument nenalezen')
            return toDocument(updated)
        },

        /**
         * Withdraw from the public site without losing anything. `data` keeps
         * the last published body so `draft ?? data` still resolves for the
         * editor, and re-publishing is one call away.
         */
        async unpublish({ id, updatedBy = null }) {
            const { data: updated, error } = await table()
                .update({ status: 'draft', published_at: null, updated_by: updatedBy })
                .eq('id', id)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Stažení z publikace selhalo')
            if (!updated) throw notFound('Dokument nenalezen')
            return toDocument(updated)
        },

        /**
         * Throw the draft away and go back to the published body.
         *
         * The counterpart publish() never had. Until this existed the only way
         * to clear a draft was to publish it — so an editor who changed their
         * mind was pushed towards the one action in the system that cannot be
         * taken back.
         *
         * NOT UNPUBLISH, and the two statements are the proof rather than the
         * naming. unpublish() writes `status` and `published_at` and leaves the
         * bodies alone: the page comes off the site. This writes `draft` and
         * leaves `data`, `status` and `published_at` alone: unpublished work
         * disappears and the site does not move. Nothing a visitor can reach is
         * named in the statement below, which is why discarding cannot take a
         * page down however hard the caller tries.
         *
         * It also writes no revision and regenerates no page, and that is the
         * existing rule rather than a new exemption: the archive records what
         * the public could see (handlers/documents.js), a draft never reached
         * the public, so there is nothing to record and nothing to re-render.
         * That is why this is not in the transitions list.
         *
         * The refusal is the interesting part. A document that has never been
         * published keeps its only copy in `draft`, and clearing it there would
         * not revert anything — it would empty the document, leaving a body that
         * publish() itself refuses as empty. So "discard" is defined only where
         * there is something to go back to.
         */
        async discardDraft({ id, updatedBy = null }) {
            const current = await repo.get({ id })
            if (!current.draft) throw conflict('Dokument nemá rozpracovaný koncept')
            if (!Object.keys(current.data || {}).length) {
                throw conflict(
                    'Není k čemu se vrátit — tento dokument ještě nebyl publikovaný. ' +
                    'Použijte archiv nebo smazání.'
                )
            }

            const { data: updated, error } = await table()
                .update({ draft: null, updated_by: updatedBy })
                .eq('id', id)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Zahození konceptu selhalo')
            if (!updated) throw notFound('Dokument nenalezen')
            return toDocument(updated)
        },

        /**
         * Take a document off the public site without losing it and without
         * changing what it was.
         *
         * `status` and `published_at` are deliberately untouched. Archiving is
         * not unpublishing: a consultant who leaves is filed away as a published
         * document that happens to be archived, so restoring them puts them
         * straight back on the site, and archiving someone who was still a draft
         * leaves them a draft. Folding this into `status` would erase that
         * difference — see the header of migrations/0003.
         *
         * Nothing here names a content type. Archiving is available to every
         * type for the same reason the table is one table.
         */
        async archive({ id, updatedBy = null }) {
            const { data: updated, error } = await table()
                .update({ archived_at: new Date().toISOString(), updated_by: updatedBy })
                .eq('id', id)
                // Re-archiving an archived document would move its filing date
                // and lose when it actually happened.
                .is('archived_at', null)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Archivace selhala')
            if (!updated) {
                // Nothing matched, which means either the id is wrong or the
                // `archived_at is null` guard bit. get() throws not_found for
                // the first, so reaching the line below means the second —
                // better than reporting "not found" for a document the editor
                // is looking at.
                await repo.get({ id })
                throw conflict('Dokument je už v archivu')
            }
            return toDocument(updated)
        },

        /**
         * Rejecting a review — archive plus the reason, and never a delete.
         *
         * There is no third `status` to record a rejection in and there must not
         * be one (migrations/0003 argues that at length), so a rejection is the
         * withdrawal column that already exists plus three stamps in the body:
         *
         *   rejectedAt      when
         *   rejectedBy      who, as a name a person reads
         *   rejectedReason  which of the schema's fixed reasons
         *
         * WHY THE STAMP IS IN THE BODY AND NOT IN COLUMNS. `archived_at` is
         * type-agnostic — 0003 makes a point of naming no type, which is how one
         * migration gave every content type an archive. Rejection is not: it is
         * moderation, and moderation is a fact about reviews. Three columns on
         * cms_document for one type's workflow would be the first type-specific
         * thing in a table that has stayed type-agnostic on purpose.
         *
         * WHY IT IS `draft` AND NOT `data`. Only publish() writes `data` — the
         * whole draft model rests on that, and a moderation stamp is not a thing
         * a visitor was served. Writing it to `draft` also makes the rejected
         * queue one predicate (`draft->>rejectedAt is not null`) for a review
         * whose body was in `draft` and for one whose body was in `data`.
         *
         * The revision written beside this (handlers/documents.js) is the other
         * half and the one that cannot be edited afterwards: `reason = 'reject'`,
         * `changed_by`, `changed_at`. The body says why in words an editor reads;
         * the ledger says who and when in a row nobody can rewrite.
         */
        async reject({ id, reason, by = null, updatedBy = null }) {
            const current = await repo.get({ id })
            // Rejecting something that is on the site would be a withdrawal, and
            // there is already a word and a button for that. Refused here rather
            // than only omitted from the screen: the record's meaning depends on
            // "rejected" never having meant "was live and got pulled".
            if (current.status === 'published') {
                throw conflict('Publikovanou recenzi nelze zamítnout — nejdřív ji stáhněte z webu')
            }

            const at = new Date().toISOString()
            const body = {
                ...(current.draft ?? current.data ?? {}),
                rejectedAt: at,
                rejectedBy: by,
                rejectedReason: reason,
            }

            const { data: updated, error } = await table()
                .update({ draft: body, archived_at: at, updated_by: updatedBy })
                .eq('id', id)
                // Same guard as archive(): a second rejection would move the
                // filing date and lose when the first one happened.
                .is('archived_at', null)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Zamítnutí selhalo')
            if (!updated) throw conflict('Recenze je už zamítnutá nebo v archivu')
            return toDocument(updated)
        },

        /**
         * The way back: out of the archive and back into the queue, same id.
         *
         * Not `restore()` with extra steps — restore leaves the stamps where they
         * are, which is right for a review somebody filed away by hand and wrong
         * for a rejection that is being taken back. Clearing them is what makes
         * the queue predicate stop matching, so a requeued review is pending
         * again rather than pending and still labelled rejected.
         *
         * The revision the rejection wrote stays. Taking a decision back does not
         * unmake the fact that it was taken, and a ledger that could be emptied
         * by pressing a button twice would not be evidence of anything.
         */
        async requeue({ id, updatedBy = null }) {
            const current = await repo.get({ id })
            const { rejectedAt, rejectedBy, rejectedReason, ...body } = current.draft ?? current.data ?? {}

            const { data: updated, error } = await table()
                .update({ draft: body, archived_at: null, updated_by: updatedBy })
                .eq('id', id)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Vrácení do fronty selhalo')
            if (!updated) throw notFound('Dokument nenalezen')
            return toDocument(updated)
        },

        async restore({ id, updatedBy = null }) {
            const { data: updated, error } = await table()
                .update({ archived_at: null, updated_by: updatedBy })
                .eq('id', id)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Obnovení z archivu selhalo')
            if (!updated) throw notFound('Dokument nenalezen')
            return toDocument(updated)
        },

        /**
         * Cheap existence probe on a single indexed field.
         *
         * Goes through listPublished rather than building its own query, which
         * it used to do. The reason is `archived_at`: this runs as service_role,
         * which bypasses RLS, so the policy that protects every other public
         * read protects nothing here — the filter has to come from the shared
         * code path or "published" quietly means "published or archived".
         */
        async existsPublished({ type, field, value }) {
            const { total } = await repo.listPublished({
                type,
                filters: { [field]: value },
                perPage: 1,
            })
            return total > 0
        },
    }

    return repo
}
