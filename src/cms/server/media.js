// Media repository — cms_media rows plus whatever the StoragePort is holding.
//
// The row and the object are two writes that cannot be one transaction. The
// order is chosen so the failure modes are survivable: on upload, bytes first
// then row (a stranded object costs storage, a row pointing at nothing breaks
// a page); on delete, row first then object (same reasoning, inverted).

import crypto from 'node:crypto'

import { cmsErrorFromPostgrest, invalid, notFound, serverError } from './errors.js'
import { probeBytes } from './imageProbe.js'
import { MEDIA_COLUMNS, toAsset } from './query.js'
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
        const { default: sharp } = await import('sharp')
        const meta = await sharp(buffer).metadata()
        return { width: meta.width ?? null, height: meta.height ?? null }
    } catch {
        // A file we cannot read is still a file the editor can use; dimensions
        // are a convenience for the Studio's grid, not a correctness concern.
        return { width: null, height: null }
    }
}

export const createMediaRepository = ({ client, storage, maxBytes }) => {
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
            const existing = await repo.findByPath(key)
            if (existing) return existing

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

        async list({ page = 1, perPage = 24, search = '' } = {}) {
            const resolvedPage = Math.max(1, Number.parseInt(page, 10) || 1)
            const resolvedPerPage = Math.min(100, Math.max(1, Number.parseInt(perPage, 10) || 24))
            const from = (resolvedPage - 1) * resolvedPerPage

            let query = table()
                .select(MEDIA_COLUMNS, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, from + resolvedPerPage - 1)

            const term = String(search || '').trim()
            if (term) {
                const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`)
                query = query.or(`alt.ilike.%${escaped}%,path.ilike.%${escaped}%`)
            }

            const { data, error, count } = await query
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení knihovny selhalo')
            return {
                rows: (data || []).map(toAsset),
                total: count ?? 0,
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

        async remove(id) {
            const { data, error } = await table()
                .select('id, bucket, path')
                .eq('id', id)
                .maybeSingle()
            if (error) throw cmsErrorFromPostgrest(error, 'Načtení souboru selhalo')
            if (!data) throw notFound('Soubor nenalezen')

            // Asked BEFORE the row goes, so `neq(id)` is what excludes this
            // one rather than a race deciding it. Keys are content-addressed and
            // `upload()` returns the existing row for identical bytes, so two
            // rows on one path is not the normal path — but it is reachable: a
            // migration writing rows directly, the seeded library where several
            // rows can name the same file in /public, or a row created while a
            // concurrent upload held the same hash. Unlinking there would blank
            // an asset that is still in the library and still on a page.
            const { data: sharing, error: shareError } = await table()
                .select('id')
                .eq('bucket', data.bucket)
                .eq('path', data.path)
                .neq('id', id)
                .limit(1)
            if (shareError) throw cmsErrorFromPostgrest(shareError, 'Načtení souboru selhalo')

            const { error: deleteError } = await table().delete().eq('id', id)
            if (deleteError) throw cmsErrorFromPostgrest(deleteError, 'Smazání souboru selhalo')

            if (sharing && sharing.length) return

            // Best effort. The row is gone, so nothing renders a broken asset;
            // an orphaned object is a storage cost, not a bug the editor should
            // be told about.
            try {
                await storage.remove([data.path])
            } catch {
                /* orphan swept by reconciliation, not by the request path */
            }
        },
    }

    return repo
}

export const ALLOWED_UPLOAD_MIME = ALLOWED_MIME
