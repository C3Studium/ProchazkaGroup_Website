// StoragePort — the seam between "the CMS has an asset" and "the bytes live
// somewhere".
//
// Why this exists at all: MinIO was the original ask. MinIO is a server
// process. Vercel runs this repo as serverless functions and has nowhere to put
// one, so the first implementation is Supabase Storage. That is a deployment
// constraint, not a decision that Supabase Storage is the right long-term
// answer — so the boundary is drawn here, narrow enough that a second driver is
// a file rather than a refactor.
//
// The port is deliberately smaller than any of the SDKs behind it. It has no
// concept of buckets-as-a-resource, no ACLs, no multipart, no lifecycle rules.
// Every one of those is reachable from the driver if a driver needs it, and
// none of them is reachable from the CMS. What the CMS is allowed to know about
// storage is exactly the five methods below.
//
// ---------------------------------------------------------------------------
// What a second driver has to provide
// ---------------------------------------------------------------------------
//
// A MinIO or R2 (or Vercel Blob, or plain S3) driver satisfies this port when
// it can answer all five methods with the same semantics:
//
//   put(key, body, { contentType, cacheControl, upsert })
//       Writes bytes at an exact key and returns { key, size, contentType }.
//       Must be last-writer-wins when upsert is true and must fail with a
//       CmsError('conflict') when upsert is false and the key exists. S3 has no
//       native "fail if exists", so an S3-family driver implements it with a
//       HEAD before the PUT and accepts the race — the CMS only ever writes
//       content-addressed keys (see buildObjectKey), so a collision means the
//       identical file, and losing that race is harmless.
//
//   remove(keys[])
//       Idempotent. Deleting an absent key is success, not an error. The media
//       repository deletes the row and the object separately and cannot make
//       that atomic; a retry must not fail on the half that already happened.
//
//   publicUrl(key)
//       A stable, unauthenticated, cacheable URL, or null if the driver cannot
//       serve one. The port permits null because MinIO behind a private network
//       genuinely cannot — a driver in that position returns null here and the
//       CMS falls back to signedUrl(). Any driver returning a URL must return
//       one whose host is added to next.config.mjs `images.remotePatterns`,
//       otherwise next/image refuses it. That is the one piece of coupling this
//       seam cannot hide, and it is worth stating rather than discovering.
//
//   signedUrl(key, { expiresIn })
//       Time-limited read URL. Required even for public buckets: it is the only
//       way the Studio can preview an asset that is not yet referenced by a
//       published document, if a deployment later makes the bucket private.
//
//   list({ prefix, limit, offset })
//       Only used for reconciliation and by the migration's --verify pass. A
//       driver may implement it as a no-op returning [] if its backend has no
//       cheap listing; nothing in the request path depends on it.
//
// The port does NOT ask a driver for: image dimensions (the repository probes
// those with sharp, which is already a dependency, so every driver gets it for
// free), MIME sniffing, or thumbnailing. Keeping derived metadata out of the
// driver is what stops the second driver from being a rewrite of the first.
//
// ---------------------------------------------------------------------------

import { CmsError } from '../errors.js'

export const STORAGE_METHODS = Object.freeze([
    'put',
    'remove',
    'publicUrl',
    'signedUrl',
    'list',
])

/**
 * Throws unless `driver` structurally satisfies the port. Called at
 * construction rather than at first use so a misconfigured driver fails on
 * boot, not on an editor's first upload.
 */
export const assertStoragePort = (driver, name = 'StoragePort') => {
    if (!driver || typeof driver !== 'object') {
        throw new CmsError('server', `${name}: ovladač úložiště chybí`)
    }
    const missing = STORAGE_METHODS.filter((m) => typeof driver[m] !== 'function')
    if (missing.length) {
        throw new CmsError('server', `${name}: ovladač neimplementuje ${missing.join(', ')}`)
    }
    return driver
}

// Content-addressed keys. Two editors uploading the same logo converge on one
// object instead of two, the key is stable across re-uploads, and no
// user-supplied string reaches the storage path — the original filename is
// kept only as a readable suffix after being stripped to a safe charset.
export const buildObjectKey = ({ hash, filename, prefix = 'uploads' }) => {
    const safeName = String(filename || 'file')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9.]+/g, '-')
        // Collapse dot runs so no "..' segment survives into the key. A single
        // path segment cannot traverse anything, but an S3-family driver that
        // normalises keys should never be handed one to normalise.
        .replace(/\.{2,}/g, '.')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(-60) || 'file'

    const shard = hash.slice(0, 2)
    return `${prefix}/${shard}/${hash.slice(0, 16)}-${safeName}`
}

// A driver registry rather than a hard import, so adding a driver is a
// registration plus an env var. CMS_STORAGE_DRIVER selects between them.
const drivers = new Map()

export const registerStorageDriver = (name, factory) => {
    drivers.set(name, factory)
}

export const createStorage = (name, options = {}) => {
    const factory = drivers.get(name)
    if (!factory) {
        throw new CmsError(
            'server',
            `Neznámý ovladač úložiště "${name}". Registrované: ${[...drivers.keys()].join(', ') || 'žádné'}`
        )
    }
    return assertStoragePort(factory(options), `storage:${name}`)
}
