// Document repository — every read and write of cms_document.
//
// Draft model (Contract 3): the editable body always lives in `draft` once a
// document has been touched; `data` is the last published body and nothing but
// publish() ever writes it. That is what lets an editor rework a published page
// without the public site changing under its visitors, and it is why update()
// below never writes `data` even for a document that has never been published.

import { cmsErrorFromPostgrest, conflict, notFound, serverError } from './errors.js'
import {
    DOCUMENT_COLUMNS,
    PUBLIC_DOCUMENT_COLUMNS,
    applyPlan,
    buildListQuery,
    toDocument,
} from './query.js'

const TABLE = 'cms_document'

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
         */
        async update({ id, data, updatedBy = null }) {
            const body = data && typeof data === 'object' ? data : {}
            const { data: updated, error } = await table()
                .update({ draft: body, updated_by: updatedBy })
                .eq('id', id)
                .select(DOCUMENT_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Uložení dokumentu selhalo')
            if (!updated) throw notFound('Dokument nenalezen')
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
