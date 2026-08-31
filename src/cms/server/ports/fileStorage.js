// Local filesystem driver for StoragePort — SERVER ONLY.
//
// The second implementation the port was drawn for, arriving earlier than
// expected and for a duller reason than MinIO: with no SUPABASE_SERVICE_ROLE_KEY
// there is no Supabase Storage either, so `client.storage` answers with a
// sentence (fileStore/client.js) and "nahrát nový obrázek" — named twice in the
// ask — cannot happen at all. The document store already solved this by writing
// to `.cms-dev/`. This is the same answer for bytes.
//
// Selected by exactly the condition that selects the document store:
// `hasServiceRoleKey()`, read once in env.js `storageDriver()`. There is no
// branch anywhere above this file. `media.js`, the handlers and the Studio hold
// a StoragePort and cannot tell which one.
//
// ---------------------------------------------------------------------------
// Where the bytes go, and how they come back
// ---------------------------------------------------------------------------
//
// `.cms-dev/media/<key>`, beside `.cms-dev/store.json`, under the same
// gitignore rule and deleted by the same `rm -rf .cms-dev`. NOT `public/`:
// that directory is the site's own committed assets, `next dev` serves it
// verbatim, and an editor's test upload appearing there is a file the next
// `git status` asks about and someone eventually commits.
//
// Which leaves the question of how a file outside `public/` is fetched over
// HTTP, and the answer is one route — `pages/api/cms/asset/[...key].js`,
// unauthenticated, reading nothing but this directory. Unauthenticated is the
// load-bearing word: the Supabase driver's `publicUrl()` is a public bucket
// URL, and `next/image`'s optimizer fetches an image server-side with no
// cookies. A session-gated byte route answers that fetch with 401, so every
// `<Image>` pointing at an uploaded asset would break while a plain `<img>` in
// the browser worked — the worst kind of difference to debug. What the route
// exposes is what a public bucket exposes: the bytes of assets an editor
// uploaded, at unguessable content-addressed keys.
//
// `publicUrl()` returns a ROOT-RELATIVE path rather than an absolute URL. An
// absolute one would have to name a host — `NEXT_PUBLIC_SITE_URL`, or
// localhost:3000 — and that host would then need an entry in next.config.mjs
// `images.remotePatterns` before `next/image` would touch it, would be baked
// into every row in `cms_media`, and would be wrong the first time the dev
// server takes a different port. A relative path is same-origin by
// construction, needs no remotePatterns entry at all, and matches what the
// seeded rows already store (`/assets/...`).
//
// ---------------------------------------------------------------------------
// What this driver deliberately does not do
// ---------------------------------------------------------------------------
//
// `signedUrl()` returns the same URL as `publicUrl()`. The port asks for a
// time-limited link so a Studio preview works against a private bucket; this
// directory has no private mode and no signing key that would mean anything —
// pretending otherwise by appending an expiry nobody checks would be worse than
// saying so here.

import fs from 'node:fs'
import path from 'node:path'

import { assertServer } from '../env.js'
import { conflict, invalid, serverError } from '../errors.js'
import { assertFileStoreUsable, storeDir } from '../fileStore/store.js'
import { assertStoragePort, registerStorageDriver } from './storage.js'

assertServer('@/cms/server/ports/fileStorage')

// The route that reads this directory back out. One constant, so the URL a row
// stores and the route that serves it cannot drift apart.
export const ASSET_URL_PREFIX = '/api/cms/asset'

export const mediaRoot = () => path.join(storeDir(), 'media')

/**
 * Keys this driver will touch the filesystem for.
 *
 * `buildObjectKey()` already produces `uploads/<shard>/<hash>-<name>` from a
 * charset that cannot contain a separator or a dot run, so in the normal path
 * this never rejects anything. It exists for the two cases that are not the
 * normal path: a key read back off an HTTP request (the asset route), and a key
 * from a row written before this driver existed — the seeded library stores
 * `path` as `/assets/logos/x.webp`, a file in `public/` that this driver has no
 * business unlinking.
 *
 * Segments must begin with an alphanumeric, which is what makes `..`, `.` and a
 * leading `/` unrepresentable rather than merely filtered.
 */
const SAFE_KEY = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/

const MAX_KEY_LENGTH = 200

export const isSafeKey = (key) => {
    const value = String(key ?? '')
    return value.length > 0 && value.length <= MAX_KEY_LENGTH && SAFE_KEY.test(value)
}

/**
 * key -> absolute path, or a refusal.
 *
 * Two independent checks, because one of them being wrong is the whole bug
 * class: the charset above, and then `path.resolve` + a prefix test on the
 * result. The second is what actually holds — it is a statement about the path
 * that will be opened, not about the string it was built from.
 */
export const resolveAssetPath = (key) => {
    if (!isSafeKey(key)) throw invalid('Neplatný klíč souboru')
    const root = mediaRoot()
    const full = path.resolve(root, key)
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`
    if (!full.startsWith(prefix)) throw invalid('Neplatný klíč souboru')
    return full
}

export const createFileStorage = ({ bucket }) => {
    if (!bucket) throw serverError('createFileStorage: chybí jméno bucketu')

    const driver = {
        name: 'file',
        bucket,

        async put(key, body, { contentType = null, upsert = false } = {}) {
            // Same gate as the document store's, for the same reason and in the
            // same words: a production filesystem is per-invocation, so bytes
            // written to it vanish with no error anywhere. Called here rather
            // than at construction so that constructing a data port — which
            // every public read does — stays free of it.
            assertFileStoreUsable()

            const target = resolveAssetPath(key)
            if (!Buffer.isBuffer(body)) throw serverError('fileStorage.put: očekává Buffer')

            const exists = fs.existsSync(target)
            if (exists && !upsert) throw conflict('Soubor s tímto klíčem už existuje')

            // Temp file plus rename, matching fileStore/store.js: a reader — the
            // asset route, or `next/image` fetching it — sees either the whole
            // file or no file, never a half-written one.
            fs.mkdirSync(path.dirname(target), { recursive: true })
            const temp = `${target}.${process.pid}.tmp`
            fs.writeFileSync(temp, body)
            fs.renameSync(temp, target)

            return { key, size: body.byteLength, contentType }
        },

        /**
         * The stored bytes.
         *
         * Two kinds of key reach this driver and only one of them is in the
         * store: an uploaded object under `uploads/…`, and a seeded row whose
         * "key" is a path into the committed site assets (`/assets/portraits/
         * …`). The second is not something this driver wrote and cannot be
         * resolved against the store directory, so it is read from `public/`
         * instead — which is where it actually is.
         */
        async get(key) {
            const source = String(key || '')
            if (!source) throw invalid('fileStorage.get: chybí klíč')

            const target = source.startsWith('/')
                ? path.join(process.cwd(), 'public', source.replace(/^\/+/, ''))
                : resolveAssetPath(source)

            if (!fs.existsSync(target)) throw invalid(`Soubor ${source} v úložišti není`)

            return fs.readFileSync(target)
        },

        async remove(keys) {
            const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean)
            if (!list.length) return
            assertFileStoreUsable()

            for (const key of list) {
                // A key this driver did not write — a seeded `/assets/...` path
                // — is not an error and is emphatically not something to unlink.
                // The port's contract is that removing what is not there
                // succeeds, and a file in `public/` is exactly "not there" as
                // far as this directory is concerned.
                if (!isSafeKey(key)) continue

                const target = resolveAssetPath(key)
                try {
                    fs.unlinkSync(target)
                } catch (err) {
                    if (err.code !== 'ENOENT') throw serverError(`Smazání souboru selhalo: ${err.code}`)
                }

                // The shard directory is a hash prefix; once empty it will never
                // be reused except by chance. Removing it keeps `.cms-dev/media`
                // legible to a human looking at what is actually stored. Never
                // the root itself — a single-segment key's dirname IS the root,
                // and removing it would be a delete quietly taking the store's
                // directory with it.
                const parent = path.dirname(target)
                if (parent !== mediaRoot()) {
                    try {
                        fs.rmdirSync(parent)
                    } catch {
                        /* not empty, or gone — both fine */
                    }
                }
            }
        },

        publicUrl(key) {
            if (!isSafeKey(key)) return null
            // The charset makes this a no-op today; it is here so that a future
            // widening of SAFE_KEY cannot silently produce a broken URL.
            const encoded = key.split('/').map(encodeURIComponent).join('/')
            return `${ASSET_URL_PREFIX}/${encoded}`
        },

        async signedUrl(key) {
            return driver.publicUrl(key)
        },

        async list({ prefix = '', limit = 100, offset = 0 } = {}) {
            assertFileStoreUsable()
            const root = mediaRoot()
            const start = prefix ? path.join(root, prefix) : root

            const entries = []
            const walk = (dir, relative) => {
                let contents = []
                try {
                    contents = fs.readdirSync(dir, { withFileTypes: true })
                } catch {
                    return
                }
                for (const entry of contents) {
                    const rel = relative ? `${relative}/${entry.name}` : entry.name
                    if (entry.isDirectory()) walk(path.join(dir, entry.name), rel)
                    else if (!entry.name.endsWith('.tmp')) {
                        const stat = fs.statSync(path.join(dir, entry.name))
                        entries.push({
                            key: rel,
                            size: stat.size,
                            contentType: null,
                            updatedAt: new Date(stat.mtimeMs).toISOString(),
                        })
                    }
                }
            }
            walk(start, prefix)

            entries.sort((a, b) => (a.key < b.key ? -1 : 1))
            return entries.slice(offset, offset + limit)
        },
    }

    return assertStoragePort(driver, 'storage:file')
}

/**
 * The asset route's read side.
 *
 * Here rather than in the route because the containment rule and the directory
 * belong to this module; a route that recomputed either would be a second place
 * for the traversal check to live, and the second place is the one that gets it
 * wrong. Returns null for anything absent or unreadable so the caller answers
 * 404 without a stack trace.
 */
export const readAssetFile = (key) => {
    let target
    try {
        target = resolveAssetPath(key)
    } catch {
        return null
    }
    try {
        const stat = fs.statSync(target)
        if (!stat.isFile()) return null
        return { buffer: fs.readFileSync(target), size: stat.size, mtimeMs: stat.mtimeMs }
    } catch {
        return null
    }
}

registerStorageDriver('file', createFileStorage)
