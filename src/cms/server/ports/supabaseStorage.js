// Supabase Storage driver for StoragePort.
//
// First and currently only implementation. See ports/storage.js for what a
// MinIO/R2 replacement would have to answer; this file should read as one of
// several possible drivers, not as the storage layer itself.

import { CmsError, cmsErrorFromPostgrest, serverError } from '../errors.js'
import { assertStoragePort, registerStorageDriver } from './storage.js'

// Supabase surfaces storage failures as `{ message, statusCode }` strings
// rather than Postgres codes, so the mapping is by status.
const mapStorageError = (error, fallback) => {
    if (!error) return serverError(fallback)
    const status = Number(error.statusCode || error.status)
    if (status === 404) return new CmsError('not_found', 'Soubor nenalezen')
    if (status === 409) return new CmsError('conflict', 'Soubor s tímto klíčem už existuje')
    if (status === 401 || status === 403) return new CmsError('forbidden', 'Úložiště operaci odmítlo')
    if (status === 413) return new CmsError('invalid', 'Soubor je příliš velký')
    return cmsErrorFromPostgrest(error, fallback)
}

export const createSupabaseStorage = ({ client, bucket }) => {
    if (!client) throw serverError('createSupabaseStorage: chybí Supabase klient')
    if (!bucket) throw serverError('createSupabaseStorage: chybí jméno bucketu')

    const files = () => client.storage.from(bucket)

    const driver = {
        name: 'supabase',
        bucket,

        async put(key, body, { contentType, cacheControl = '31536000', upsert = false } = {}) {
            const { error } = await files().upload(key, body, {
                contentType: contentType || 'application/octet-stream',
                cacheControl,
                upsert,
            })
            // Content-addressed keys make "already exists" the same file, so an
            // un-upserted collision is success rather than an error the editor
            // needs to see.
            if (error && Number(error.statusCode) !== 409) {
                throw mapStorageError(error, 'Nahrání souboru selhalo')
            }
            return {
                key,
                size: body?.byteLength ?? body?.length ?? null,
                contentType: contentType || null,
            }
        },

        /**
         * The stored bytes. `download` returns a Blob; the callers here are all
         * server-side and want a Buffer, so the conversion belongs in the
         * driver rather than in every one of them.
         */
        async get(key) {
            const { data, error } = await files().download(key)
            if (error) throw mapStorageError(error, 'Načtení souboru selhalo')
            return Buffer.from(await data.arrayBuffer())
        },

        async remove(keys) {
            const list = Array.isArray(keys) ? keys : [keys]
            if (!list.length) return
            const { error } = await files().remove(list)
            // Supabase returns 200 with an empty array for absent keys, but a
            // bucket-level failure is real. Absent-key tolerance is the port's
            // contract, so only non-404s propagate.
            if (error && Number(error.statusCode) !== 404) {
                throw mapStorageError(error, 'Smazání souboru selhalo')
            }
        },

        publicUrl(key) {
            const { data } = files().getPublicUrl(key)
            return data?.publicUrl || null
        },

        async signedUrl(key, { expiresIn = 3600 } = {}) {
            const { data, error } = await files().createSignedUrl(key, expiresIn)
            if (error) throw mapStorageError(error, 'Podepsaný odkaz se nepodařilo vytvořit')
            return data?.signedUrl || null
        },

        async list({ prefix = '', limit = 100, offset = 0 } = {}) {
            const { data, error } = await files().list(prefix, { limit, offset })
            if (error) throw mapStorageError(error, 'Výpis souborů selhal')
            return (data || []).map((entry) => ({
                key: prefix ? `${prefix}/${entry.name}` : entry.name,
                size: entry.metadata?.size ?? null,
                contentType: entry.metadata?.mimetype ?? null,
                updatedAt: entry.updated_at ?? null,
            }))
        },
    }

    return assertStoragePort(driver, 'storage:supabase')
}

registerStorageDriver('supabase', createSupabaseStorage)
