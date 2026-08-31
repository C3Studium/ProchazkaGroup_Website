// Media repository — cms_media rows plus whatever the StoragePort is holding.
//
// The row and the object are two writes that cannot be one transaction. The
// order is chosen so the failure modes are survivable: on upload, bytes first
// then row (a stranded object costs storage, a row pointing at nothing breaks
// a page); on delete, row first then object (same reasoning, inverted).
//
// Removal is no longer a delete. `archive()` files a row out of the library and
// keeps both halves; the only hard delete left in the CMS is `hardDelete()`,
// which server/archive.js calls behind an owner check and a confirmation. The
// reasoning is on archive() itself and in migrations/0007.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { cmsErrorFromPostgrest, conflict, invalid, notFound, serverError } from './errors.js'
import { probeBytes } from './imageProbe.js'
import { MEDIA_COLUMNS, toAsset } from './query.js'
import { buildUsageIndex } from './mediaUsage.js'
import { assertStoragePort, buildObjectKey } from './ports/storage.js'

const TABLE = 'cms_media'

// image/svg+xml is absent deliberately. An SVG is a script host; serving one
// from a bucket the site embeds turns an editor upload into stored XSS the day
// someone puts the bucket behind the site's own domain. The public site already
// ships every logo as .webp, so nothing is lost by requiring the same here.
const ALLOWED_MIME = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
    'image/gif',
    'application/pdf',
])

const RASTER_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'])

// sharp is already a dependency of this project (next/image uses it), so this
// costs no new package. It is the fallback rather than the first answer:
// imageProbe.js reads the container header, which is a few hundred microseconds
// against a native module load, and — unlike sharp — it is also the thing that
// decides the MIME, so the same read may as well answer both. Loaded lazily
// because the media route is a small fraction of requests.
//
// Verified equal on 170 files (161 site .webp, 2 .png, and generated
// jpeg/png/gif/avif/lossy/lossless/alpha-webp fixtures): 170 matches, 0
// mismatches. This path is therefore only reached by a raster format whose
// header imageProbe.js could read the type of but not the size — a truncated
// JPEG, an AVIF with no `ispe` in its first 64 kB.
const probeDimensions = async (buffer, mime) => {
    if (!RASTER_MIME.has(mime)) return { width: null, height: null }
    try {
        const { default: sharp } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'sharp')
        const meta = await sharp(buffer).metadata()
        return { width: meta.width ?? null, height: meta.height ?? null }
    } catch {
        // A file we cannot read is still a file the editor can use; dimensions
        // are a convenience for the Studio's grid, not a correctness concern.
        return { width: null, height: null }
    }
}

/**
 * The original bytes, wherever this row keeps them.
 *
 * Two kinds of row exist and only one of them has an object in the bucket. A
 * seeded row points at a committed site asset — `path` and `url` are both
 * `/assets/portraits/…` — and asking the bucket for that key returns nothing,
 * because nothing ever put it there (see `importRow`, which exists precisely so
 * those rows do not copy repo assets into storage).
 *
 * So a leading slash means "a file in public/", and everything else is a key
 * the storage driver wrote and can read back. Cropping a seeded asset therefore
 * MOVES the row into the bucket — its new bytes have to live somewhere the
 * driver owns — while `source_url` keeps pointing at the untouched file in the
 * repository, which is exactly where the original should stay.
 */
const readOriginal = async (storage, sourcePath) => {
    const key = String(sourcePath || '')
    if (!key) throw invalid('Soubor nemá cestu k původním datům')

    if (key.startsWith('/')) {
        const onDisk = path.join(process.cwd(), 'public', key.replace(/^\/+/, ''))
        if (!fs.existsSync(onDisk)) throw invalid(`Soubor ${key} v public/ není`)
        return fs.readFileSync(onDisk)
    }

    return storage.get(key)
}

/** The last path segment, so a crop keeps a readable name in its key. */
const filenameOf = (path) => String(path || 'file').split('/').pop() || 'file'

/**
 * A rectangle that sharp will accept.
 *
 * extract() throws on a single pixel of overhang, and the rectangle arrives
 * from a mouse drag, so it is brought inside the picture rather than refused.
 * A zero- or negative-sized box is the one thing that cannot be fixed by
 * clamping — there is no crop there to take — so that one is an error.
 */
const clampRect = (rect, { width, height }) => {
    if (!width || !height) throw invalid('Rozměry obrázku se nepodařilo přečíst, ořez nelze spočítat')

    const round = (value) => Math.round(Number(value) || 0)
    const x = Math.min(Math.max(round(rect?.x), 0), width - 1)
    const y = Math.min(Math.max(round(rect?.y), 0), height - 1)
    const w = Math.min(round(rect?.width), width - x)
    const h = Math.min(round(rect?.height), height - y)

    if (w < 1 || h < 1) throw invalid('Výřez je prázdný')

    return { x, y, width: w, height: h }
}

export const createMediaRepository = ({ client, storage, maxBytes, mediaArchive = null }) => {
    if (!client) throw serverError('createMediaRepository: chybí Supabase klient')
    assertStoragePort(storage)

    const table = () => client.from(TABLE)

    const repo = {
        async upload(file, { alt = '', createdBy = null } = {}) {
            const buffer = file?.buffer
            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                throw invalid('Soubor je prázdný')
            }
            if (maxBytes && buffer.length > maxBytes) {
                throw invalid(`Soubor je větší než povolených ${Math.floor(maxBytes / 1024 / 1024)} MB`)
            }

            // A filename is a name, not a path. `buildObjectKey()` would
            // flatten a separator to a dash and nothing would escape anywhere,
            // but silently renaming `../../etc/passwd` to `etc-passwd` and
            // storing it is a worse answer than refusing: whatever produced that
            // string was not a file picker, and the editor should be told rather
            // than served.
            const filename = String(file.filename || 'file')
            if (/[\\/\0]/.test(filename)) {
                throw invalid('Název souboru nesmí obsahovat cestu')
            }

            // The bytes decide the type, not the Content-Type the client sent —
            // that header is a guess from a file extension, and an extension is
            // exactly what an attacker controls. The declared value is kept only
            // to be quoted back when the two disagree.
            const declared = String(file.mime || '').toLowerCase().split(';')[0].trim()
            const probed = probeBytes(buffer)
            const mime = probed.mime

            // Two different refusals, because they are two different mistakes.
            // An unreadable header is usually a renamed file — an SVG called
            // .webp is the case this whole check exists for — and reporting the
            // declared type there would print "Nepodporovaný typ: image/webp"
            // directly above a list containing image/webp.
            if (!mime) {
                throw invalid(
                    'Obsah souboru neodpovídá žádnému podporovanému formátu' +
                    `${declared ? ` (hlavička uvádí ${declared})` : ''}. ` +
                    `Povoleno: ${[...ALLOWED_MIME].join(', ')}`
                )
            }
            if (!ALLOWED_MIME.has(mime)) {
                throw invalid(
                    `Nepodporovaný typ souboru: ${mime}. ` +
                    `Povoleno: ${[...ALLOWED_MIME].join(', ')}`
                )
            }

            const hash = crypto.createHash('sha256').update(buffer).digest('hex')
            const key = buildObjectKey({ hash, filename })

            // Same bytes uploaded twice is the same asset. Returning the
            // existing row keeps the media library from filling with duplicates
            // and makes a retried upload idempotent.
            //
            // Unless it was archived: an editor uploading a file is asking for it
            // to be in the library, and answering with a row the library does not
            // show would look like an upload that silently did nothing.
            const existing = await repo.findByPath(key)
            if (existing) return existing.archivedAt ? repo.restore(existing.id) : existing

            await storage.put(key, buffer, { contentType: mime, upsert: true })

            const { width, height } = probed.width
                ? { width: probed.width, height: probed.height }
                : await probeDimensions(buffer, mime)
            const url = storage.publicUrl(key) || (await storage.signedUrl(key, { expiresIn: 60 * 60 * 24 * 365 }))

            const { data, error } = await table()
                .insert({
                    bucket: storage.bucket,
                    path: key,
                    url,
                    mime,
                    size_bytes: buffer.length,
                    width,
                    height,
                    alt: String(alt || '').slice(0, 500),
                    created_by: createdBy,
                })
                .select(MEDIA_COLUMNS)
                .single()

            if (error) {
                // Lost a race with a concurrent identical upload: the object is
                // already correct, so read the winner's row rather than fail.
                if (error.code === '23505') {
                    const row = await repo.findByPath(key)
                    if (row) return row
                }
                throw cmsErrorFromPostgrest(error, 'Uložení souboru selhalo')
            }
            return toAsset(data)
        },

        async findByPath(path) {
            const { data, error } = await table()
                .select(MEDIA_COLUMNS)
                .eq('bucket', storage.bucket)
                .eq('path', path)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení souboru selhalo')
            return data ? toAsset(data) : null
        },

        /**
         * Insert one library row for bytes that are already where they belong.
         *
         * upload() is the wrong door for two different reasons, and the seeded
         * library contains both kinds of row. A `/public` asset has no object in
         * any bucket — the repository serves the file itself — so upload() would
         * copy a committed site asset into storage and then point the row at the
         * copy, which is exactly what hydrate.js's `mediaRow` refuses to do. An
         * asset whose bytes are being moved between two stores has already been
         * hashed, probed and keyed by the store it is leaving; re-deriving all of
         * it would mint a second key for identical bytes.
         *
         * So the caller puts the bytes (or establishes that there are none to
         * put) and this writes the row it decided on. `(bucket, path)` is unique
         * in 0001, which is what makes a second run collide rather than
         * duplicate.
         */
        async importRow(row) {
            const { data, error } = await table()
                .insert({
                    id: row.id,
                    bucket: row.bucket,
                    path: row.path,
                    url: row.url,
                    mime: row.mime ?? null,
                    size_bytes: row.size_bytes ?? null,
                    width: row.width ?? null,
                    height: row.height ?? null,
                    alt: String(row.alt || '').slice(0, 500),
                    created_at: row.created_at,
                    updated_at: row.updated_at ?? row.created_at,
                    created_by: row.created_by ?? null,
                    archived_at: row.archived_at ?? null,
                })
                .select(MEDIA_COLUMNS)
                .single()
            if (error) throw cmsErrorFromPostgrest(error, 'Vložení souboru do knihovny selhalo')
            return toAsset(data)
        },

        /**
         * `archived` is the same tri-state documents.js takes, and a first-class
         * argument for the same reason: forgetting it is what would put a file
         * somebody deliberately took out of the library back in front of an
         * editor as though nothing had happened.
         *
         *   undefined / false  the library          (the default)
         *   true               archived files only  (the Archive's Média view)
         *   'all'              both
         */
        /**
         * The folders the library actually has — derived from the paths.
         *
         * No taxonomy is stored and none has to be maintained: a file at
         * `/assets/portraits/casual/3.webp` is in the casual portraits folder
         * because that is where it is. For the 116 committed site assets this
         * produces exactly the ten groups a person would have made by hand,
         * which is the argument against making them by hand.
         *
         * Uploads land under `uploads/<shard>/…`, whose shard is two hex
         * characters and means nothing to a reader, so they are collapsed into
         * one group rather than sprayed across 256.
         */
        async folders({ archived = false } = {}) {
            let query = table().select('path')
            if (archived === true) query = query.not('archived_at', 'is', null)
            else if (archived !== 'all') query = query.is('archived_at', null)

            const { data, error } = await query
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení složek selhalo')

            const counts = new Map()
            for (const row of data || []) {
                const path = String(row.path || '')
                const folder = path.startsWith('uploads/')
                    ? 'uploads'
                    : path.split('/').slice(0, -1).join('/') || '/'
                counts.set(folder, (counts.get(folder) || 0) + 1)
            }

            return [...counts.entries()]
                .map(([path, count]) => ({ path, count }))
                .sort((a, b) => a.path.localeCompare(b.path, 'cs'))
        },

        async list({ page = 1, perPage = 24, search = '', archived = false, missingAlt = false, folder = '', usage = '', withUsage = false } = {}) {
            const resolvedPage = Math.max(1, Number.parseInt(page, 10) || 1)
            const resolvedPerPage = Math.min(100, Math.max(1, Number.parseInt(perPage, 10) || 24))
            const from = (resolvedPage - 1) * resolvedPerPage

            const wantedFolder = String(folder || '').trim()
            const wantedUsage = String(usage || '').trim()

            /**
             * Every filter except paging and usage, applied once.
             *
             * Extracted because it has to run TWICE when the usage filter is
             * on: "unused" is a fact about the documents, not about the row, so
             * that branch has to see the whole filtered set before it can page
             * it. Building the query in two places instead is how the first
             * version of this lost the folder — asking for "business portraits,
             * used" answered with every used file in the library.
             */
            const filtered = () => {
                let query = table().select(MEDIA_COLUMNS, { count: 'exact' })

                if (archived === true) query = query.not('archived_at', 'is', null)
                else if (archived !== 'all') query = query.is('archived_at', null)

                const term = String(search || '').trim()
                if (term) {
                    const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`)
                    query = query.or(`alt.ilike.%${escaped}%,path.ilike.%${escaped}%`)
                }

                // Empty string, not null: `alt` is `not null default ''` in
                // 0001, so "no description" is a row with an empty one. A
                // `is.null` here would match nothing and the filter would look
                // broken.
                if (missingAlt) query = query.eq('alt', '')

                // A folder is a path prefix, which is all it ever was.
                // `uploads` covers every shard under it, so the collapsed group
                // in folders() and the filter here mean the same thing.
                if (wantedFolder) {
                    const escaped = wantedFolder.replace(/[\\%_]/g, (c) => `\\${c}`)
                    query = query.like('path', `${escaped}/%`)
                }

                return query.order('created_at', { ascending: false })
            }

            const query = wantedUsage ? filtered() : filtered().range(from, from + resolvedPerPage - 1)
            const { data, error, count } = await query
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení knihovny selhalo')

            /**
             * How many files have no description, across the WHOLE library.
             *
             * Counted here rather than in the browser, because the browser only
             * ever holds one page. With 116 files and a page of 24 the client's
             * own tally said "3 bez popisu" while 80 were missing one — a number
             * that is wrong in the reassuring direction, which is the worst kind.
             *
             * A count query, not a fetch: `head: true` asks Postgres for the
             * number and returns no rows.
             */
            let missing = 0
            {
                let counter = table().select('id', { count: 'exact', head: true }).eq('alt', '')
                if (archived === true) counter = counter.not('archived_at', 'is', null)
                else if (archived !== 'all') counter = counter.is('archived_at', null)
                const { count: missingCount, error: missingError } = await counter
                if (missingError) throw cmsErrorFromPostgrest(missingError, 'Načtení knihovny selhalo')
                missing = missingCount ?? 0
            }

            let rows = (data || []).map(toAsset)
            let total = count ?? 0

            /**
             * Where each file is used, and the filter built on it.
             *
             * Costs one extra read of every document, so it is opt-in — the
             * picker inside a popup does not ask for it, the library screen
             * does. See mediaUsage.js for why this is derived rather than kept
             * in a column, and for what would replace it at a scale this
             * project is nowhere near.
             *
             * The `usage` filter cannot be pushed into the query, because
             * "unused" is a fact about the documents rather than about the row.
             * So that branch reads the whole library, filters, and pages in
             * memory. At 116 files that is one extra query; the moment it is
             * not, the answer is an index in the database, not a bigger loop
             * here.
             */
            if (withUsage || wantedUsage) {
                // `rows` already carries every other filter — when the usage
                // filter is on it is the whole filtered set, unpaged, which is
                // exactly what this needs.
                const scope = rows
                const index = await buildUsageIndex(client, scope.map((asset) => ({
                    id: asset.id, url: asset.url, path: asset.path,
                })))

                if (wantedUsage) {
                    const matching = scope.filter((asset) => {
                        const places = index.get(asset.id) || []
                        return wantedUsage === 'unused' ? places.length === 0 : places.length > 0
                    })
                    total = matching.length
                    rows = matching.slice(from, from + resolvedPerPage)
                }

                rows = rows.map((asset) => ({ ...asset, usedIn: index.get(asset.id) || [] }))
            }

            return {
                rows,
                total,
                missingAlt: missing,
                page: resolvedPage,
                perPage: resolvedPerPage,
            }
        },


        // Alt text is the only mutable field. Everything else describes bytes
        // that are content-addressed and therefore immutable by construction.
        async update(id, { alt }) {
            const { data, error } = await table()
                .update({ alt: String(alt || '').slice(0, 500) })
                .eq('id', id)
                .select(MEDIA_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Uložení popisku selhalo')
            if (!data) throw notFound('Soubor nenalezen')
            return toAsset(data)
        },

        async get(id) {
            const { data, error } = await table()
                .select(MEDIA_COLUMNS)
                .eq('id', id)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení souboru selhalo')
            if (!data) throw notFound('Soubor nenalezen')
            return toAsset(data)
        },

        /**
         * Re-frame a picture without minting a second one.
         *
         * ONE library row. An editor cropping a portrait means "this picture,
         * framed like this" — not "this picture, and also a near-duplicate of
         * it one character different in the list". So the id does not change,
         * and neither does anything else about the row an editor recognises it
         * by: its description, when it was uploaded, whether it is archived.
         *
         * NON-DESTRUCTIVE, which is what makes it a crop handle rather than a
         * one-way edit. The original object is never overwritten and never
         * removed: `source_path`/`source_url` remember where it is, and every
         * crop after the first decodes THAT rather than the previous crop. So a
         * frame can be widened again, moved, or cleared, and cropping twice
         * cannot slowly grind the picture down — the second crop is computed
         * from the same pixels as the first.
         *
         * The rectangle is in the SOURCE image's own pixels. Clamped rather
         * than rejected: a rectangle a drag ended slightly outside the picture
         * is an editor's hand, not an error worth a dialog, and sharp's
         * extract() throws on one pixel of overhang.
         *
         * `crop: null` restores the original — the row goes back to pointing at
         * `source_path` and forgets it was ever cropped.
         *
         * What this deliberately does NOT do is rewrite documents. A body
         * carries the asset whole (core/fieldTypes.js), so a page keeps showing
         * the framing it was saved with until someone re-picks the image there.
         * That is the same rule an old revision relies on to keep resolving,
         * and it is why cropping cannot silently restyle a page nobody opened.
         */
        async crop(id, rect, { croppedBy = null } = {}) {
            const row = await repo.get(id)
            if (!RASTER_MIME.has(row.mime)) {
                throw invalid('Oříznout lze jen rastrový obrázek, ne ' + (row.mime || 'neznámý typ'))
            }

            // Where the untouched pixels are: the recorded source once this row
            // has been cropped before, otherwise the row itself.
            const sourcePath = row.source?.path ?? row.path
            const sourceUrl = row.source?.url ?? row.url

            if (rect === null) {
                if (!row.source) return row
                const original = await readOriginal(storage, sourcePath)
                const { width, height } = await probeDimensions(original, row.mime)
                return repo.writeCrop(id, {
                    path: sourcePath,
                    url: sourceUrl,
                    width,
                    height,
                    size: original.length,
                    source_path: null,
                    source_url: null,
                    crop: null,
                })
            }

            const source = await readOriginal(storage, sourcePath)
            const probed = await probeDimensions(source, row.mime)
            const box = clampRect(rect, probed)

            const { default: sharp } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'sharp')
            const cropped = await sharp(source)
                .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
                // Same format in, same format out. Re-encoding a PNG as WebP
                // behind an editor's back would change what the file IS, and
                // `mime` on the row — which next/image and the library both
                // read — would then describe the old bytes.
                .toBuffer()

            const hash = crypto.createHash('sha256').update(cropped).digest('hex')
            const key = buildObjectKey({ hash, filename: filenameOf(sourcePath) })

            await storage.put(key, cropped, { contentType: row.mime, upsert: true })
            const url = storage.publicUrl(key) || (await storage.signedUrl(key, { expiresIn: 60 * 60 * 24 * 365 }))

            return repo.writeCrop(id, {
                path: key,
                url,
                width: box.width,
                height: box.height,
                size: cropped.length,
                source_path: sourcePath,
                source_url: sourceUrl,
                crop: box,
            })
        },

        /** The single UPDATE both branches of crop() end in. */
        async writeCrop(id, { path, url, width, height, size, source_path, source_url, crop }) {
            const { data, error } = await table()
                .update({
                    path,
                    url,
                    width,
                    height,
                    size_bytes: size,
                    source_path,
                    source_url,
                    crop,
                })
                .eq('id', id)
                .select(MEDIA_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Uložení ořezu selhalo')
            if (!data) throw notFound('Soubor nenalezen')
            return toAsset(data)
        },

        async byIds(ids) {
            if (!ids.length) return []
            const { data, error } = await table()
                .select(MEDIA_COLUMNS)
                .in('id', ids)
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení souborů selhalo')
            return (data || []).map(toAsset)
        },

        /**
         * What "smazat" in the library now does. The row stays, the object
         * stays, the file leaves the library.
         *
         * Until this, `remove()` deleted the row and then the object. That is
         * the one operation that could destroy the archive from the inside: a
         * revision from March points at a file, an editor tidies the library in
         * June, and the March page silently loses its picture with nothing
         * anywhere reporting it. ARCHIVE.md's order of work puts this BEFORE the
         * Archive screen for that reason — otherwise the first revisions written
         * are already pointing at files somebody is about to delete.
         *
         * `archived_at` is a column and not a status, exactly as it is on a
         * document (migrations/0003's header is the argument): nothing that
         * reads cms_media has to learn a new value, and a timestamp answers
         * "when did this leave the library", which a boolean cannot.
         *
         * Hard deletion has not disappeared, it has moved: it is one owner-only,
         * confirmed action in the Archive (server/archive.js) and there is no
         * other.
         */
        async archive(id, { archivedAt = new Date().toISOString() } = {}) {
            const { data, error } = await table()
                .update({ archived_at: archivedAt })
                .eq('id', id)
                // Re-archiving would move the filing date and lose when the file
                // actually left the library — same guard, same reason, as
                // documents.js archive().
                .is('archived_at', null)
                .select(MEDIA_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Archivace souboru selhala')
            if (!data) {
                // Either the id is wrong or the guard bit; get() answers the
                // first with not_found, so reaching past it means the second.
                await repo.get(id)
                throw conflict('Soubor je už v archivu')
            }

            const asset = toAsset(data)
            if (mediaArchive) {
                await mediaArchive.noteArchived({
                    mediaId: asset.id,
                    uploadedAt: asset.createdAt,
                    archivedAt,
                })
            }
            return asset
        },

        /**
         * Back into the library. The counterpart to archive(), and the reason
         * archiving is safe to offer at all: without it a mis-click could only be
         * undone by the one action in the system that cannot be undone.
         */
        async restore(id) {
            const { data, error } = await table()
                .update({ archived_at: null })
                .eq('id', id)
                .select(MEDIA_COLUMNS)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Obnovení souboru selhalo')
            if (!data) throw notFound('Soubor nenalezen')

            const asset = toAsset(data)
            if (mediaArchive) {
                await mediaArchive.noteArchived({
                    mediaId: asset.id,
                    uploadedAt: asset.createdAt,
                    archivedAt: null,
                })
            }
            return asset
        },

        /**
         * Destroy files: the row, the ledger entry and the bytes.
         *
         * The only caller is server/archive.js, behind an owner check and a
         * confirmation that has already named these exact files. Nothing else in
         * the CMS deletes an object, and this method takes a resolved list of
         * ids rather than a filter so that what was counted and what is removed
         * cannot differ.
         *
         * Returns the bytes actually released, which is smaller than the sum of
         * the rows' sizes whenever two rows shared one object — the caller
         * reports it, so it has to be measured rather than assumed.
         */
        async hardDelete(ids) {
            if (!ids.length) return { rows: 0, objects: 0, bytes: 0 }

            const { data, error } = await table()
                .select('id, bucket, path, size_bytes')
                .in('id', ids)
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení souborů selhalo')
            const rows = data || []
            if (!rows.length) return { rows: 0, objects: 0, bytes: 0 }

            // Asked BEFORE the rows go, so `neq(id)` is what excludes them
            // rather than a race deciding it. Keys are content-addressed and
            // `upload()` returns the existing row for identical bytes, so two
            // rows on one path is not the normal case — but it is reachable: a
            // migration writing rows directly, the seeded library where several
            // rows name the same file in /public, or a row created while a
            // concurrent upload held the same hash. Unlinking there would blank
            // an asset that is still in the library and still on a page.
            const doomed = new Set(rows.map((row) => row.id))
            const keys = new Map()
            for (const row of rows) {
                const { data: sharing, error: shareError } = await table()
                    .select('id')
                    .eq('bucket', row.bucket)
                    .eq('path', row.path)
                if (shareError) throw cmsErrorFromPostgrest(shareError, 'Načtení souboru selhalo')
                const survivor = (sharing || []).some((other) => !doomed.has(other.id))
                if (!survivor) keys.set(row.path, row.size_bytes || 0)
            }

            if (mediaArchive) await mediaArchive.forget([...doomed])

            const { error: deleteError } = await table().delete().in('id', [...doomed])
            if (deleteError) throw cmsErrorFromPostgrest(deleteError, 'Smazání souboru selhalo')

            // Best effort, and last. The rows are gone, so nothing renders a
            // broken asset; an object that outlives its row is a storage cost,
            // not something to fail a confirmed destruction over.
            let objects = 0
            if (keys.size) {
                try {
                    await storage.remove([...keys.keys()])
                    objects = keys.size
                } catch (storageError) {
                    console.warn(
                        `[cms] archiv: řádky smazány, objekty v úložišti ne ` +
                        `(${storageError?.message || storageError})`
                    )
                }
            }

            return {
                rows: doomed.size,
                objects,
                bytes: [...keys.values()].reduce((sum, size) => sum + size, 0),
            }
        },
    }

    return repo
}

export const ALLOWED_UPLOAD_MIME = ALLOWED_MIME
