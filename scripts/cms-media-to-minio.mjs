#!/usr/bin/env node
// Přenese soubory médií do MinIA a přepíše na ně odkazy v cms_media.
//
// Zdroje jsou dva a poznají se podle cesty:
//
//   /assets/…, /logos/…   soubor v `public/` tohohle webu. Do knihovny médií se
//                         kdysi zapsal odkazem, ne nahráním — což funguje na
//                         webu, který ty soubory má, a nikde jinde.
//   uploads/…             skutečný objekt v Supabase Storage.
//
// Idempotentní: co v MinIU už leží se stejnou velikostí, se znovu nenahrává.
//
//   node scripts/cms-media-to-minio.mjs [--dry]

import { readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { createS3Storage } from '../src/cms/server/ports/s3Storage.js'

const env = (file) => Object.fromEntries(
    readFileSync(file, 'utf8').split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const apptest = env('.env.apptest')
const test = env('.env.test')
const dry = process.argv.includes('--dry')

const store = createS3Storage({
    endpoint: apptest.CMS_S3_ENDPOINT,
    bucket: apptest.CMS_S3_BUCKET,
    accessKeyId: apptest.CMS_S3_ACCESS_KEY_ID,
    secretAccessKey: apptest.CMS_S3_SECRET_ACCESS_KEY,
    publicBase: apptest.CMS_MEDIA_HOST,
})

const db = new pg.Client({ connectionString: apptest.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()

const { rows } = await db.query('select id, path, url, mime, size_bytes from cms_media order by path')
const existing = new Map((await store.list({ limit: 1000 })).map((o) => [o.key, o.size]))

/** Klíč v MinIU: stejná struktura, jen bez úvodního lomítka. */
const keyFor = (p) => String(p).replace(/^\/+/, '')

const bytesOf = async (row) => {
    if (row.path.startsWith('uploads/')) {
        const res = await fetch(
            `${test.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/cms-media/${row.path}`,
            { headers: { Authorization: `Bearer ${test.SUPABASE_SERVICE_ROLE_KEY}`, apikey: test.SUPABASE_SERVICE_ROLE_KEY } },
        )
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer())
    }
    const local = path.join(process.cwd(), 'public', keyFor(row.path))
    return existsSync(local) ? readFileSync(local) : null
}

let uploaded = 0, skipped = 0, missing = []
for (const row of rows) {
    const key = keyFor(row.path)
    const bytes = await bytesOf(row)
    if (!bytes) { missing.push(row.path); continue }

    if (existing.get(key) === bytes.byteLength) { skipped += 1 }
    else if (!dry) {
        await store.put(key, bytes, { contentType: row.mime || 'application/octet-stream', upsert: true })
        uploaded += 1
    } else uploaded += 1

    if (!dry) {
        await db.query('update cms_media set path = $1, url = $2, bucket = $3 where id = $4',
            [key, store.publicUrl(key), apptest.CMS_S3_BUCKET, row.id])
    }
}

console.log(`  nahráno ${uploaded}, beze změny ${skipped}, nenalezeno ${missing.length}${dry ? '  (nanečisto)' : ''}`)
if (missing.length) missing.slice(0, 8).forEach((p) => console.log('    chybí zdroj:', p))
await db.end()
