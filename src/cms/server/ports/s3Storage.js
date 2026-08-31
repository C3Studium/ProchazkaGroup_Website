// Úložiště na S3 — a tím i na MinIO, které S3 mluví.
//
// Adresa je tu dvakrát a nejsou zaměnitelné:
//
//   endpoint    kam chodí server. Uvnitř Railway je to privátní doména, která
//               je rychlejší a neúčtuje se za ni přenos.
//   publicBase  z čeho si obrázek stahuje PROHLÍŽEČ. Na privátní adresu se
//               nedostane, takže tohle je veřejná doména služby.
//
// Když se veřejná adresa nezadá, `publicUrl()` vrací null a CMS se přepne na
// podepsané adresy — port to výslovně dovoluje právě kvůli tomuhle případu.

import { CmsError, serverError } from '../errors.js'
import { assertStoragePort, registerStorageDriver } from './storage.js'
import { encodeKey, presignUrl, signRequest } from './s3.js'

const trimSlashes = (value) => String(value || '').replace(/\/+$/, '')

/** Chybová odpověď S3 je XML; užitečná je z něj hlavně značka Code. */
const codeOf = (xml) => (String(xml).match(/<Code>([^<]+)<\/Code>/) || [])[1] || ''

export const createS3Storage = ({
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region = 'us-east-1',
    publicBase = null,
}) => {
    if (!endpoint) throw serverError('createS3Storage: chybí adresa úložiště (CMS_S3_ENDPOINT)')
    if (!bucket) throw serverError('createS3Storage: chybí jméno bucketu (CMS_S3_BUCKET)')
    if (!accessKeyId || !secretAccessKey) throw serverError('createS3Storage: chybí přístupové klíče')

    const base = trimSlashes(endpoint)
    const publicRoot = publicBase ? trimSlashes(publicBase) : null

    const urlFor = (key, query = {}) => {
        const url = new URL(`${base}/${bucket}/${encodeKey(key)}`)
        for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
        return url
    }

    const call = async (method, url, { body = '', headers = {} } = {}) => {
        const signed = signRequest({ method, url, body, headers, accessKeyId, secretAccessKey, region })
        return fetch(signed.url, {
            method,
            headers: signed.headers,
            body: method === 'GET' || method === 'HEAD' || method === 'DELETE' ? undefined : body,
        })
    }

    const driver = {
        name: 's3',
        bucket,

        /**
         * Zapsat bajty na přesný klíč.
         *
         * `upsert: false` a klíč už existuje je **úspěch**, ne konflikt. Klíče
         * jsou obsahové (viz ports/storage.js buildObjectKey), takže shodný klíč
         * znamená shodné bajty — přepsat je stejným obsahem nebo to nechat být
         * vyjde nastejno. Stejně se chová ovladač pro Supabase.
         */
        async put(key, body, { contentType, cacheControl = 'public, max-age=31536000, immutable', upsert = false } = {}) {
            const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body)

            if (!upsert) {
                const head = await call('HEAD', urlFor(key))
                if (head.ok) return { key, size: bytes.byteLength, contentType: contentType || null }
            }

            const res = await call('PUT', urlFor(key), {
                body: bytes,
                headers: {
                    'content-type': contentType || 'application/octet-stream',
                    'content-length': String(bytes.byteLength),
                    'cache-control': cacheControl,
                },
            })
            if (!res.ok) {
                throw new CmsError('server', `Nahrání souboru selhalo (${res.status} ${codeOf(await res.text())})`)
            }
            return { key, size: bytes.byteLength, contentType: contentType || null }
        },

        async get(key) {
            const res = await call('GET', urlFor(key))
            if (res.status === 404) throw new CmsError('not_found', 'Soubor v úložišti není')
            if (!res.ok) throw new CmsError('server', `Načtení souboru selhalo (${res.status})`)
            return Buffer.from(await res.arrayBuffer())
        },

        /** Mazání je idempotentní: chybějící klíč je úspěch, ne chyba. */
        async remove(keys) {
            for (const key of [].concat(keys || [])) {
                const res = await call('DELETE', urlFor(key))
                if (!res.ok && res.status !== 404) {
                    throw new CmsError('server', `Smazání souboru selhalo (${res.status})`)
                }
            }
            return { removed: [].concat(keys || []).length }
        },

        publicUrl(key) {
            return publicRoot ? `${publicRoot}/${bucket}/${encodeKey(key)}` : null
        },

        signedUrl(key, { expiresIn = 3600 } = {}) {
            return presignUrl({ url: urlFor(key), accessKeyId, secretAccessKey, region, expiresIn })
        },

        async list({ prefix = '', limit = 1000, offset = 0 } = {}) {
            const url = new URL(`${base}/${bucket}`)
            url.searchParams.set('list-type', '2')
            if (prefix) url.searchParams.set('prefix', prefix)
            url.searchParams.set('max-keys', String(Math.min(limit + offset, 1000)))

            const res = await call('GET', url)
            if (!res.ok) throw new CmsError('server', `Výpis úložiště selhal (${res.status})`)
            const xml = await res.text()

            const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1])
            const sizes = [...xml.matchAll(/<Size>(\d+)<\/Size>/g)].map((m) => Number(m[1]))
            return keys.slice(offset, offset + limit).map((key, i) => ({ key, size: sizes[offset + i] ?? null }))
        },
    }

    return assertStoragePort(driver, 's3')
}

registerStorageDriver('s3', createS3Storage)
