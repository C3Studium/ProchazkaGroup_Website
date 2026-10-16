// cms_media_archive — the two dates about a file that cms_media cannot answer.
//
// "Nahráno" and "publikováno" are different questions and the Archive's Média
// subpage asks both (ARCHIVE.md). The upload date is a fact about the row and
// lives on it. The first publication date is not a fact about the file at all:
// it is the first revision with `status = 'published'` whose body mentions the
// file, which is a fact about the revision table — so it is computed here, when
// a revision is written, and stored rather than recomputed. Recomputing it would
// mean scanning every body in the archive to render one line of one screen.
//
// A row here does NOT mean "archived". It means the archive has learned
// something about this file — that it was published, or that it was archived,
// whichever happened first. `archived_at is not null` is what means archived,
// and cms_media.archived_at is the authoritative copy of it (see
// migrations/0007 for why there are two).

import { cmsErrorFromPostgrest, serverError } from './errors.js'
import { MEDIA_ARCHIVE_COLUMNS, toMediaArchive } from './query.js'

const TABLE = 'cms_media_archive'
const MEDIA_TABLE = 'cms_media'

// PostgREST answers an empty result set with [] and the file store with null in
// one place; `rows` names the difference once rather than at every call site.
const rows = (value) => value || []

/**
 * Every asset a stored body refers to.
 *
 * An `image` or `file` field keeps whatever the media library returned — the
 * asset object whole, `{ id, url, path, mime, width, ... }` — see
 * core/fieldTypes.js `kind: "asset"` and fieldPatch.js, which allows an editor
 * to reach `alt` inside it and nothing else. So the shape to look for is an
 * object carrying both an `id` and a `url`, at any depth, inside an array or an
 * object field alike.
 *
 * Deliberately NOT "every uuid-looking string in the body". A body also
 * contains document ids, slugs and copy an editor typed, and a scan loose
 * enough to catch an asset referenced some other way would also stamp a
 * publication date onto files that were never on the page. A reference this
 * misses shows as `firstPublishedAt: null`, which the Archive can print
 * honestly; a reference it invents cannot be told from a real one.
 */
export const assetIdsIn = (body) => {
    const found = new Set()

    const walk = (node) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
            node.forEach(walk)
            return
        }
        if (typeof node.id === 'string' && node.id && typeof node.url === 'string' && node.url) {
            found.add(node.id)
        }
        for (const value of Object.values(node)) walk(value)
    }

    walk(body)
    return [...found]
}

export const createMediaArchiveRepository = ({ client }) => {
    if (!client) throw serverError('createMediaArchiveRepository: chybí Supabase klient')

    const table = () => client.from(TABLE)

    const rowsFor = async (mediaIds) => {
        if (!mediaIds.length) return []
        const { data, error } = await table()
            .select(MEDIA_ARCHIVE_COLUMNS)
            .in('media_id', mediaIds)
        if (error) throw cmsErrorFromPostgrest(error, 'Načtení archivu médií selhalo')
        return data || []
    }

    const repo = {
        async get(mediaId) {
            const [row] = await rowsFor([mediaId])
            return row ? toMediaArchive(row) : null
        },

        async list(mediaIds) {
            return (await rowsFor(mediaIds)).map(toMediaArchive)
        },

        /**
         * Everything the archive knows, newest archival first.
         *
         * Unpaginated on purpose: this table has one row per file the archive
         * has heard of, the media library is in the tens, and the caller — the
         * Archive's Média subpage — needs to line these dates up against a page
         * of cms_media rows it has already fetched. Paginating both sides
         * independently would show a file with somebody else's dates.
         */
        async all() {
            const { data, error } = await table()
                .select(MEDIA_ARCHIVE_COLUMNS)
                .order('archived_at', { ascending: false, nullsFirst: false })
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení archivu médií selhalo')
            return (data || []).map(toMediaArchive)
        },

        /**
         * Stamp `first_published_at` for every asset this published body names.
         *
         * FIRST, so it is written once and never moved: a file published in
         * March, taken off the page in April and put back in May was first
         * published in March, and the Archive's answer to "since when was this
         * on the site" must not drift forward every time somebody republishes.
         *
         * `at` is the revision's own `changed_at` rather than now(), so a
         * revision and the dates it produced agree to the millisecond.
         *
         * Assets with no row in cms_media are skipped rather than inserted:
         * `media_id` is a foreign key, and a body can legitimately carry an
         * asset object whose library row an earlier hard delete destroyed.
         */
        async notePublished({ mediaIds, at }) {
            if (!mediaIds || !mediaIds.length) return { stamped: [], skipped: [] }

            const { data: media, error } = await client
                .from(MEDIA_TABLE)
                .select('id, created_at')
                .in('id', mediaIds)
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení souborů selhalo')

            const known = rows(media)
            const existing = new Map(
                (await rowsFor(known.map((row) => row.id))).map((row) => [row.media_id, row])
            )

            const stamped = []
            for (const asset of known) {
                const current = existing.get(asset.id)
                if (current && current.first_published_at) continue

                if (current) {
                    const { error: updateError } = await table()
                        .update({ first_published_at: at, uploaded_at: asset.created_at })
                        .eq('media_id', asset.id)
                    if (updateError) throw cmsErrorFromPostgrest(updateError, 'Zápis do archivu médií selhal')
                } else {
                    const { error: insertError } = await table().insert({
                        media_id: asset.id,
                        uploaded_at: asset.created_at,
                        archived_at: null,
                        first_published_at: at,
                    })
                    // Lost a race with a concurrent transition naming the same
                    // asset: the other writer's date is at worst milliseconds
                    // from this one and is equally first.
                    if (insertError && insertError.code !== '23505') {
                        throw cmsErrorFromPostgrest(insertError, 'Zápis do archivu médií selhal')
                    }
                }
                stamped.push(asset.id)
            }

            const knownIds = new Set(known.map((row) => row.id))
            return { stamped, skipped: mediaIds.filter((id) => !knownIds.has(id)) }
        },

        /** Mirror an archival (or a restore, with `archivedAt: null`) into the ledger. */
        async noteArchived({ mediaId, uploadedAt = null, archivedAt }) {
            const [current] = await rowsFor([mediaId])
            if (current) {
                const { error } = await table()
                    .update({ archived_at: archivedAt, uploaded_at: uploadedAt ?? current.uploaded_at })
                    .eq('media_id', mediaId)
                if (error) throw cmsErrorFromPostgrest(error, 'Zápis do archivu médií selhal')
                return
            }
            const { error } = await table().insert({
                media_id: mediaId,
                uploaded_at: uploadedAt,
                archived_at: archivedAt,
                first_published_at: null,
            })
            if (error && error.code !== '23505') {
                throw cmsErrorFromPostgrest(error, 'Zápis do archivu médií selhal')
            }
        },

        /**
         * Drop the ledger rows for files that are being hard-deleted.
         *
         * The migration declares `on delete cascade`, so against Postgres this
         * is redundant and harmless. It is here for the file-backed development
         * store, which has cascade for exactly one relationship (cms_user ->
         * cms_session) and would otherwise leave dates behind for a file that no
         * longer exists.
         */
        async forget(mediaIds) {
            if (!mediaIds.length) return
            const { error } = await table().delete().in('media_id', mediaIds)
            if (error) throw cmsErrorFromPostgrest(error, 'Úklid archivu médií selhal')
        },
    }

    return repo
}
