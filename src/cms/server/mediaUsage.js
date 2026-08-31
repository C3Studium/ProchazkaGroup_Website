/**
 * Where each file is used — computed, never stored.
 *
 * The library holds 116 files and 74 of them are referenced by nothing. That
 * number is the reason this exists: an editor picking a portrait has no way to
 * tell the one that is on `/o-nas` from the seventy-four that are on no page at
 * all, and no amount of tidy naming fixes it.
 *
 * ---------------------------------------------------------------------------
 * Why it is derived rather than kept in a column
 *
 * A `used_in` column would be a second copy of a fact the documents already
 * state, and every write that touches an image field would have to remember to
 * update it. The failure mode of that design is silent and permanent: one path
 * forgets, the column drifts, and the library starts lying about what is safe
 * to archive. Deriving it cannot drift, because there is only one copy.
 *
 * The cost is a scan. It is honest about its size: this reads every document's
 * body once, which at 187 documents is one small query and a walk over parsed
 * JSON. That is fine at this scale and would not be at ten thousand — at which
 * point the answer is an index maintained by the database (a GIN index over the
 * bodies, or a join table written by a trigger), not a column written by hand.
 *
 * ---------------------------------------------------------------------------
 * What counts as a reference
 *
 * Both the asset's `id` and its `url`, because both spellings are in the store.
 * A field written by the picker holds the whole asset object (`{id, url, …}`);
 * seeded bodies and anything migrated from the old tables hold a bare path
 * string. Matching on one of them would report half the truth.
 */
import { assertServer } from './env.js'
import { cmsErrorFromPostgrest } from './errors.js'

/** Every string in a body, however deeply nested. */
const stringsIn = (value, out = []) => {
    if (typeof value === 'string') out.push(value)
    else if (Array.isArray(value)) for (const item of value) stringsIn(item, out)
    else if (value && typeof value === 'object') for (const item of Object.values(value)) stringsIn(item, out)
    return out
}

/**
 * A document as the library wants to name it: what it is, and where a reader
 * would find it. `page` and `key` are siteCopy's own fields — the block knows
 * which route it belongs to — and everything else is named by its type.
 */
const placeOf = (document) => {
    const body = document.draft ?? document.data ?? {}
    return {
        id: document.id,
        type: document.type,
        page: typeof body.page === 'string' ? body.page : null,
        key: typeof body.key === 'string' ? body.key : null,
        title:
            (typeof body.title === 'string' && body.title) ||
            (typeof body.name === 'string' && body.name) ||
            [body.firstName, body.lastName].filter((part) => typeof part === 'string' && part).join(' ') ||
            (typeof body.key === 'string' ? body.key : '') ||
            document.type,
    }
}

/**
 * Build the index.
 *
 * @param {object} client Supabase client
 * @param {{id: string, url: string, path: string}[]} assets
 * @returns {Promise<Map<string, object[]>>} media id -> the places it appears
 */
export const buildUsageIndex = async (client, assets) => {
    assertServer('mediaUsage')

    const { data, error } = await client
        .from('cms_document')
        .select('id, type, data, draft')
        .is('archived_at', null)
    if (error) throw cmsErrorFromPostgrest(error, 'Načtení dokumentů selhalo')

    // One pass over the documents, not one pass per asset. With 116 assets and
    // 187 documents the naive shape is 21 692 substring searches; this is 187
    // walks and a set lookup per string.
    const byId = new Map(assets.map((asset) => [asset.id, asset]))
    const byUrl = new Map(assets.map((asset) => [asset.url, asset]))
    const byPath = new Map(assets.map((asset) => [asset.path, asset]))

    const index = new Map()
    for (const document of data || []) {
        const place = placeOf(document)
        const seen = new Set()

        for (const value of stringsIn(document.draft ?? document.data ?? {})) {
            const asset = byId.get(value) || byUrl.get(value) || byPath.get(value)
            if (!asset || seen.has(asset.id)) continue
            seen.add(asset.id)
            if (!index.has(asset.id)) index.set(asset.id, [])
            index.get(asset.id).push(place)
        }
    }

    return index
}
