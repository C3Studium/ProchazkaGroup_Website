// Pure translation between the data port's vocabulary (Contract 2/3) and
// PostgREST's. Nothing here touches the network, which is the point: the
// interesting failure modes of this layer — a filter silently ignored, a sort
// column injected, a page size that lets someone pull the whole table — are all
// reachable with a fake query builder and no database.

import { invalid } from './errors.js'

export const DOCUMENT_COLUMNS =
    'id, type, status, data, draft, created_at, updated_at, published_at, archived_at, created_by, legacy_source, legacy_id'

// The column set a public (unauthenticated) read is allowed to see. Mirrors the
// column grant in migrations/0003_cms_document_archive.sql — the grant is the
// enforcement, this is so the server does not even ask for what it must not
// return. `archived_at` is in the grant because a column-level grant governs
// WHERE clauses as well as result columns, and the public read filters on it.
export const PUBLIC_DOCUMENT_COLUMNS =
    'id, type, status, data, published_at, created_at, updated_at, archived_at'

export const MEDIA_COLUMNS =
    'id, bucket, path, url, mime, size_bytes, width, height, alt, created_at, updated_at, created_by'

export const MAX_PER_PAGE = 100
export const DEFAULT_PER_PAGE = 20

// Top-level document fields an editor can filter or sort on, mapped to their
// column. Anything not in here is interpreted as a path into `data`.
const SCALAR_FIELDS = {
    id: 'id',
    type: 'type',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    publishedAt: 'published_at',
    archivedAt: 'archived_at',
    createdBy: 'created_by',
    created_at: 'created_at',
    updated_at: 'updated_at',
    published_at: 'published_at',
    archived_at: 'archived_at',
    created_by: 'created_by',
}

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/

// Filter/sort field names arrive from the Studio and end up inside a PostgREST
// query string, where `data->>x` is syntax rather than a bound parameter. A
// path segment that is not a plain identifier is rejected outright; there is no
// escaping story for PostgREST operators, so the only safe answer is a
// whitelist of shapes.
const parsePath = (field) => {
    if (typeof field !== 'string' || !field.length) {
        throw invalid('Neplatné jméno pole ve filtru')
    }
    const segments = field.split('.')
    for (const segment of segments) {
        if (!SAFE_SEGMENT.test(segment)) {
            throw invalid(`Neplatné jméno pole: ${field}`)
        }
    }
    return segments
}

// `data.foo.bar` -> `data->foo->>bar`; `data.foo` -> `data->>foo`.
// `asText: false` yields `->` on the last hop, which is what ordering on a
// numeric field needs so 10 does not sort before 9.
export const columnFor = (field, { asText = true } = {}) => {
    const segments = parsePath(field)

    if (segments.length === 1 && SCALAR_FIELDS[segments[0]]) {
        return SCALAR_FIELDS[segments[0]]
    }

    const path = segments[0] === 'data' || segments[0] === 'draft'
        ? segments.slice(1)
        : segments
    const root = segments[0] === 'draft' ? 'draft' : 'data'

    if (!path.length) return root

    const head = path.slice(0, -1).map((s) => `->${s}`).join('')
    const tail = asText ? `->>${path[path.length - 1]}` : `->${path[path.length - 1]}`
    return `${root}${head}${tail}`
}

// PostgREST wants every filter value as a string. `false` and `0` are real
// values and must survive; only null/undefined mean "absent".
const asFilterValue = (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'boolean') return String(value)
    if (typeof value === 'number') return String(value)
    if (value instanceof Date) return value.toISOString()
    return String(value)
}

// `isNot` is the negation of `is`, and it exists because `neq` cannot express
// it: in SQL every comparison with NULL is NULL, so `archived_at neq null`
// matches nothing rather than matching every archived row. PostgREST spells it
// `not.is`, which supabase-js reaches through `.not(column, 'is', value)`.
const OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'isNot'])

// A filter entry is either a bare value (equality) or `{ op, value }`.
const normaliseFilter = (field, raw) => {
    if (raw === undefined) return null

    if (raw === null) {
        return { op: 'is', column: columnFor(field), value: null }
    }

    if (typeof raw === 'object' && !Array.isArray(raw) && !(raw instanceof Date)) {
        const op = raw.op || Object.keys(raw).find((k) => OPERATORS.has(k))
        if (!op || !OPERATORS.has(op)) {
            throw invalid(`Neznámý operátor ve filtru pole ${field}`)
        }
        const value = 'value' in raw ? raw.value : raw[op]
        if (op === 'in') {
            if (!Array.isArray(value)) throw invalid(`Operátor "in" u ${field} čeká pole hodnot`)
            return { op, column: columnFor(field), value: value.map(asFilterValue) }
        }
        if (op === 'is' || op === 'isNot') {
            return { op, column: columnFor(field), value: value === null ? null : asFilterValue(value) }
        }
        return { op, column: columnFor(field), value: asFilterValue(value) }
    }

    if (Array.isArray(raw)) {
        return { op: 'in', column: columnFor(field), value: raw.map(asFilterValue) }
    }

    return { op: 'eq', column: columnFor(field), value: asFilterValue(raw) }
}

/**
 * `state` — the one filter key that is about the envelope rather than the body.
 *
 * `src/cms/studio/lib/moderation.js` declares it as part of Contract 2's filter
 * grammar and says out loud that "if build C's port reads filters differently,
 * this is the one constant that has to change". It did read them differently:
 * every key not in SCALAR_FIELDS is a path into `data`, so `{ state: "draft" }`
 * asked the database about `data->>state`, matched nothing, and left the
 * moderation queue, its sidebar badge and the overview's pending list empty
 * against the real port while they worked against the browser stub. Measured on
 * a store holding 23 unapproved reviews: the queue showed none of them.
 *
 * Expanded here rather than added to SCALAR_FIELDS because it is not a column —
 * two of the three states are a conjunction, and `draft` is a column whose
 * NULL-ness is the question, which `eq` cannot ask (see the note on `isNot`).
 *
 *   draft      not on the site at all
 *   published  on the site, with nothing staged on top of it
 *   edited     on the site, with unpublished changes waiting
 */
const STATE_CONDITIONS = {
    draft: [{ op: 'eq', column: 'status', value: 'draft' }],
    published: [
        { op: 'eq', column: 'status', value: 'published' },
        { op: 'is', column: 'draft', value: null },
    ],
    edited: [
        { op: 'eq', column: 'status', value: 'published' },
        { op: 'isNot', column: 'draft', value: null },
    ],
}

const clampPage = (page) => {
    const n = Number.parseInt(page, 10)
    return Number.isFinite(n) && n > 0 ? n : 1
}

const clampPerPage = (perPage) => {
    const n = Number.parseInt(perPage, 10)
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_PER_PAGE
    return Math.min(n, MAX_PER_PAGE)
}

// Escape the LIKE metacharacters so a search for "50%" does not become a
// wildcard, then wrap in the wildcards we do want.
const likeTerm = (search) =>
    `%${String(search).trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/**
 * Translate a Contract 2 `list()` argument object into an explicit plan.
 * Returned as data rather than applied directly so it can be asserted on.
 */
export const buildListQuery = ({
    type,
    search,
    filters,
    sort,
    page,
    perPage,
    columns = DOCUMENT_COLUMNS,
} = {}) => {
    const conditions = []

    if (type) {
        if (Array.isArray(type)) conditions.push({ op: 'in', column: 'type', value: type.map(String) })
        else conditions.push({ op: 'eq', column: 'type', value: String(type) })
    }

    for (const [field, raw] of Object.entries(filters || {})) {
        if (field === 'state') {
            if (raw === undefined || raw === null || raw === '') continue
            const expansion = STATE_CONDITIONS[String(raw)]
            // Refused rather than ignored: a queue silently showing every review
            // is worse than one that reports it was asked something impossible.
            if (!expansion) throw invalid(`Neznámý stav dokumentu ve filtru: ${raw}`)
            conditions.push(...expansion)
            continue
        }
        const condition = normaliseFilter(field, raw)
        if (condition) conditions.push(condition)
    }

    const trimmedSearch = typeof search === 'string' ? search.trim() : ''
    if (trimmedSearch) {
        conditions.push({ op: 'like', column: 'search_text', value: likeTerm(trimmedSearch) })
    }

    const resolvedPage = clampPage(page)
    const resolvedPerPage = clampPerPage(perPage)
    const from = (resolvedPage - 1) * resolvedPerPage

    return {
        columns,
        count: 'exact',
        conditions,
        order: buildOrder(sort),
        range: { from, to: from + resolvedPerPage - 1 },
        page: resolvedPage,
        perPage: resolvedPerPage,
    }
}

// Accepts `{ field, direction }`, an array of them, or a `-field` string —
// the Studio's orderings (Contract 1) produce the first form.
export const buildOrder = (sort) => {
    if (!sort) return [{ column: 'updated_at', ascending: false }]

    const entries = Array.isArray(sort) ? sort : [sort]
    const order = []

    for (const entry of entries) {
        if (!entry) continue
        if (typeof entry === 'string') {
            const descending = entry.startsWith('-')
            const field = descending ? entry.slice(1) : entry
            order.push({ column: columnFor(field, { asText: false }), ascending: !descending })
            continue
        }
        const field = entry.field || entry.by
        if (!field) continue
        order.push({
            column: columnFor(field, { asText: false }),
            ascending: String(entry.direction || 'asc').toLowerCase() !== 'desc',
        })
    }

    return order.length ? order : [{ column: 'updated_at', ascending: false }]
}

/**
 * Apply a plan to a supabase-js query builder. Kept separate from
 * buildListQuery so tests can hand it a recorder instead of a client.
 */
export const applyPlan = (builder, plan) => {
    let query = builder
    for (const condition of plan.conditions) {
        if (condition.op === 'in') query = query.in(condition.column, condition.value)
        else if (condition.op === 'is') query = query.is(condition.column, condition.value)
        else if (condition.op === 'isNot') query = query.not(condition.column, 'is', condition.value)
        else query = query[condition.op](condition.column, condition.value)
    }
    for (const entry of plan.order) {
        query = query.order(entry.column, { ascending: entry.ascending, nullsFirst: false })
    }
    return query.range(plan.range.from, plan.range.to)
}

// --- Row <-> document mapping (Contract 3) ----------------------------------

export const toDocument = (row) => {
    if (!row) return null
    return {
        id: row.id,
        type: row.type,
        status: row.status,
        data: row.data || {},
        draft: row.draft ?? null,
        createdAt: row.created_at ?? null,
        updatedAt: row.updated_at ?? null,
        publishedAt: row.published_at ?? null,
        // Contract 3 plus one field. `archivedAt` is deliberately outside
        // `status`: an archived document keeps the publish state it had, so
        // restoring puts a live person back on the site and leaves a draft a
        // draft. See migrations/0003_cms_document_archive.sql.
        archivedAt: row.archived_at ?? null,
        createdBy: row.created_by ?? null,
        ...(row.legacy_source ? { legacySource: row.legacy_source, legacyId: row.legacy_id } : {}),
    }
}

/**
 * The readable name of an asset, recovered rather than stored.
 *
 * `cms_media` has no filename column, but `filename` is what the media library
 * prints under every tile (studio/media/MediaLibrary.jsx), what the image field
 * shows beside the thumbnail (studio/fields/inputs/AssetInputs.jsx) and what the
 * overlay's picker carries (edit/overlay/assets.js) — the seeded fixtures have
 * it and, until this, a real upload did not, so an uploaded asset arrived in the
 * library with a blank name.
 *
 * Two path shapes, because there are two kinds of row. A seeded row stores a
 * public URL (`/logos/orbit/x.webp`) and its name is the last segment. An
 * uploaded row stores an object key, which `buildObjectKey()` writes as
 * `uploads/<shard>/<hash16>-<name>` — the hash is addressing, not name, so it
 * comes off. Distinguished by the leading slash rather than by matching the hash
 * everywhere, so a legacy file that happens to be called `0123456789abcdef-x`
 * keeps its name.
 */
const filenameFromPath = (path) => {
    const value = String(path || '')
    const last = value.split('/').pop() || ''
    if (!last) return null
    return (value.startsWith('/') ? last : last.replace(/^[0-9a-f]{16}-/, '')) || null
}

export const toAsset = (row) => {
    if (!row) return null
    return {
        id: row.id,
        url: row.url,
        path: row.path,
        bucket: row.bucket,
        mime: row.mime ?? null,
        size: row.size_bytes ?? null,
        width: row.width ?? null,
        height: row.height ?? null,
        alt: row.alt || '',
        filename: filenameFromPath(row.path),
        createdAt: row.created_at ?? null,
    }
}
