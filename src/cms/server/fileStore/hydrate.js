// Filling an empty file store — SERVER ONLY.
//
// `src/cms/studio/dev/seed.js` already holds two thousand lines of realistic
// content: reviews in both moderation states, thirteen consultants including an
// archived one, partners of both kinds, offers, Q&A and the page copy. It is the
// dataset the Studio was built against. Re-authoring any of it here would create
// a second set of fixtures to keep in step with the first, so this module does
// one thing: it translates those fixtures into database rows.
//
// It is plain data with no imports of its own, so importing it on the server
// costs nothing and drags nothing along.

import { mediaBucket } from '../env.js'

import { seedAssets, seedDocuments } from '@/cms/studio/dev/seed'

// Bumped when the translation below changes shape, not when the fixtures gain a
// document. A store file written by an older version is discarded and rebuilt —
// same mechanism, same reasoning as devPort.js's STORE_VERSION.
export const STORE_VERSION = 1

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)))

/**
 * One fixture -> one cms_document row.
 *
 * This is devPort.js's `hydrate()`, matched deliberately and line for line,
 * because the two stores have to agree about what a fixture means. Contract 3:
 * an unpublished document has no public body at all, its content lives in
 * `draft` until somebody publishes it — so `_status` decides which column the
 * body lands in and there is no state in which both are filled from a fixture.
 *
 * `_archivedAt` is orthogonal to `_status`, exactly as the column is
 * (migrations/0003): a fixture can be published AND archived, which is the case
 * the archive view exists for.
 */
const documentRow = (type, entry) => {
    const published = entry._status === 'published'
    return {
        id: entry._id,
        type,
        status: published ? 'published' : 'draft',
        data: published ? clone(entry.data) : {},
        draft: published ? null : clone(entry.data),
        created_at: entry._createdAt,
        updated_at: entry._updatedAt,
        published_at: published ? entry._updatedAt : null,
        archived_at: entry._archivedAt ?? null,
        created_by: null,
        updated_by: null,
        legacy_source: null,
        legacy_id: null,
    }
}

// The library rows. `path` is the url because these assets are files the repo
// already serves out of /public — there is no object in a bucket behind them,
// and inventing a key that resolves to nothing would make "remove" look like it
// could work.
const mediaRow = (asset) => ({
    id: asset.id,
    bucket: mediaBucket(),
    path: asset.url,
    url: asset.url,
    mime: asset.mime ?? null,
    size_bytes: asset.size ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    alt: asset.alt ?? '',
    created_at: asset.createdAt,
    updated_at: asset.createdAt,
    created_by: null,
})

/**
 * A complete set of tables for a store that has never been written.
 *
 * `cms_user` and `cms_session` start EMPTY, and that is not an omission. The
 * fixtures carry dev accounts with plaintext passwords for the browser stub;
 * writing those to a file on disk would put a working credential in the repo
 * directory and would also bypass the design in AUTH.md. The first owner is
 * created the same way it is against Supabase — CMS_ADMIN_EMAIL /
 * CMS_ADMIN_PASSWORD, hashed on the first sign-in attempt, through
 * cms_bootstrap_owner. One bootstrap path, whichever store is live.
 */
export const hydrateTables = () => {
    const documents = []
    for (const [type, entries] of Object.entries(seedDocuments || {})) {
        for (const entry of entries) documents.push(documentRow(type, entry))
    }

    return {
        cms_document: documents,
        cms_media: (seedAssets || []).map(mediaRow),
        cms_user: [],
        cms_session: [],
    }
}
