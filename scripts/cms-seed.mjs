#!/usr/bin/env node
/**
 * cms-seed — take an empty CMS store to a working one, and say what it will do
 * before it does it.
 *
 *   node scripts/cms-seed.mjs                dry run: print the plan, exit
 *   node scripts/cms-seed.mjs --write        actually write
 *   node scripts/cms-seed.mjs --help         flags
 *
 * DRY RUN IS THE DEFAULT AND --write IS THE ONLY WAY PAST IT.
 *
 * ---------------------------------------------------------------------------
 * What this is, and what scripts/cms-migrate.js is
 * ---------------------------------------------------------------------------
 * cms-migrate reads the three legacy Supabase tables and turns them into
 * documents: people -> consultant, reviews -> review, total -> one siteCopy
 * block. It covers 52 of the 125 documents the CMS needs and none of the media
 * library. The other 73 — every partner, offer, Q&A, the assistant and the
 * thirty-nine other blocks of page copy — have never lived in Supabase at all.
 * They live in this repository, as fixtures, and the file store already knows
 * how to turn them into rows.
 *
 * So this tool has one job cms-migrate cannot do: put the whole content set into
 * an empty store. The two overlap on consultants and reviews, and the plan says
 * so loudly rather than letting somebody run both and get fourteen consultants
 * twice.
 *
 * ---------------------------------------------------------------------------
 * Decisions, each of which had a defensible alternative
 * ---------------------------------------------------------------------------
 *
 * IT DOES NOT RUN THE SQL. It verifies and instructs. Three reasons, in order
 * of weight. 0004_legacy_lockdown.sql drops two columns off the client's live
 * `reviews` table and is irreversible; a tool with a "run all pending
 * migrations" mode runs it the first time somebody types --write in the wrong
 * directory. supabase-js speaks PostgREST, which has no way to execute DDL at
 * all — running these files needs the Postgres connection string, which is a
 * credential this project does not hold, and a driver, which is a dependency it
 * does not have. And the migrations say so themselves: 0004 "waits for a human",
 * 0009 names the SQL editor. So the ground check below reports exactly which
 * files have run, refuses to write when one is missing, and names the first one
 * to run.
 *
 * IDENTITY IS (legacy_source, legacy_id). Not the fixture id, which cannot be a
 * primary key here — see minting below — and not a body field, because only two
 * of the seven types have one that is unique. The pair has a partial unique
 * index in 0001 written for exactly this, so a second run collides in the
 * database rather than in this file's memory.
 *
 * IDS ARE MINTED, DETERMINISTICALLY. cms_document.id is a uuid column and not
 * one of the 124 fixture ids is a uuid — they are "review-1", "consultant-9".
 * The file store accepts them because it is a JSON file; Postgres rejects the
 * insert. So each row gets a UUIDv5 derived from the fixture id under a fixed
 * namespace: same fixture, same uuid, every run, on every machine — which is
 * what lets a re-run recognise its own work and what makes the id in a support
 * question mean something.
 *
 * WHICH FORCES A REWRITE. An image field stores the asset object whole,
 * `{ id, url, ... }` (core/fieldTypes.js), and 43 values across the fixtures
 * carry one. Mint a new id for the media row and leave the body alone, and the
 * body names an asset that does not exist — against Postgres that is not a quiet
 * mismatch but an error, because mediaArchive.js asks `in('id', [...])` against
 * a uuid column with "asset-9" in the list, the first time an editor publishes a
 * page with a portrait on it. So the same map is applied to the bodies, using
 * mediaArchive's own rule for what an asset reference is.
 *
 * A DOCUMENT THAT EXISTS AND DIFFERS IS SKIPPED AND REPORTED. After the first
 * seed the document belongs to the editors: the fixture text is frozen in the
 * repository and an updating seeder would overwrite a month of their work every
 * time anybody ran it. --update-existing is the deliberate way round, and even
 * it cannot move the public site — it goes through documents.update(), which
 * stages a draft and never touches `data`.
 *
 * IT WRITES NO REVISIONS. A seeded document has no history because nothing
 * happened to it. cms_document_revision records transitions — who published
 * what, when, under which build — and an invented row would be stamped with
 * today's date and today's commit for content that has been on the site for
 * years, which is precisely the false answer 0007's header says the archive
 * exists to avoid ("content from 3 March, replayed by today's code" rather than
 * "this is how the site looked"). 0008 already set the precedent in words: "the
 * rejection ledger starts empty and fills forward, exactly as 0007's revisions
 * do." The cost is real and is printed in the plan: on day one the Archive is
 * empty, and it cannot answer what the site looked like before the seed. A
 * fabricated revision would not answer that either — it would answer it wrongly.
 */

import cmsDatabase from '../cms.database.js'
const { applyDatabaseEnv, describeDatabase, resolveDatabase } = cmsDatabase

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * `next dev` loads .env; bare node does not, and every module below reads
 * process.env. Existing values win so that a one-off
 * `CMS_FILE_STORE_DIR=/tmp/x node scripts/cms-seed.mjs` means what it looks
 * like.
 *
 * Not imported from scripts/cms-migrate.js, whose copy of this is four lines
 * longer: that file is deliberately CommonJS with no imports from anywhere, so
 * that it cannot accidentally pull in a module that writes something. Reaching
 * into it would break the one property it was built to have.
 */
const loadEnvFile = () => {
    const file = path.join(ROOT, '.env')
    if (!fs.existsSync(file)) return
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
        const at = trimmed.indexOf('=')
        const name = trimmed.slice(0, at).trim()
        if (process.env[name] === undefined) process.env[name] = trimmed.slice(at + 1).trim()
    }
}

loadEnvFile()

// Which project the three canonical names point at — see cms.database.js.
// After loadEnvFile(), because it resolves from what .env just provided, and
// before anything reads them, which is everything below this line.
applyDatabaseEnv()

// Hooks first, then the CMS. `module.register()` applies to imports that happen
// after it, so every import below is dynamic and every one of them is awaited
// before anything reads them.
register('./lib/src-esm-loader.mjs', import.meta.url)

const { STORE_VERSION, hydrateTables } = await import('@/cms/server/fileStore/hydrate.js')
const { hasServiceRoleKey, mediaBucket, storageDriver } = await import('@/cms/server/env.js')
const { getAdminClient } = await import('@/cms/server/supabaseAdmin.js')
const { createDocumentRepository } = await import('@/cms/server/documents.js')
const { createMediaRepository } = await import('@/cms/server/media.js')
// The side effect is the point: it registers the seven content types, which is
// what makes collectErrors() able to answer at all.
await import('@/cms/server/registerSchemas.js')
const { collectErrors, knownType } = await import('@/cms/server/validation.js')
// Registers the storage drivers and exposes the app's own choice between them.
const { createStorageFromEnv } = await import('@/cms/server/adapter.js')

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// The provenance mark this tool owns. Distinct from cms-migrate's
// `supabase.people` / `supabase.reviews` / `supabase.total` so the two tools can
// never claim the same row, and so "where did this document come from" has an
// answer a year from now.
const SEED_SOURCE = 'cms.seed'

const MIGRATE_SOURCES = ['supabase.people', 'supabase.reviews', 'supabase.total']

// Fixed for the life of the project. Changing it re-mints every id, which would
// make the next run duplicate everything — so it is a constant, not an option.
const ID_NAMESPACE = '466ae110-30ea-43d1-a9f5-40fc8ff72774'

/**
 * What each migration file left behind that a GET can see.
 *
 * `absent` inverts the test: 0004's whole purpose is that two columns stop
 * existing, so "still readable" is how you know it has not run. 0008 and 0009
 * are honestly marked unobservable — one adds a check constraint and a partial
 * index, the other is a one-time UPDATE — and neither is claimed as checked. A
 * probe that guessed at them would be worse than one that says it cannot see.
 */
const MIGRATIONS = [
    {
        file: '0001_cms_tables.sql',
        // NOT cms_editor. It is created here and DROPPED by 0002, which
        // replaced the magic-link editor list with cms_user/cms_session. A
        // probe that required it could only pass in the window between the two
        // migrations, so on any correctly migrated project this check refused
        // to seed and named 0001 as missing — measured on a fresh project with
        // all eight applied.
        needs: [['cms_document', 'id'], ['cms_media', 'id']],
    },
    { file: '0002_cms_auth.sql', needs: [['cms_user', 'id'], ['cms_session', 'id']] },
    { file: '0003_cms_document_archive.sql', needs: [['cms_document', 'archived_at']] },
    {
        file: '0004_legacy_lockdown.sql',
        absent: [['reviews', 'ip_list'], ['reviews', 'list_of_all_ips']],
        // The only migration this tool does not require. It hardens the legacy
        // tables and drops personal data; it creates nothing the CMS reads, so
        // seeding without it works and running it afterwards changes nothing
        // here. Reported, never a refusal.
        optional: true,
    },
    { file: '0005_cms_api_key.sql', needs: [['cms_api_key', 'id']] },
    { file: '0006_cms_setting.sql', needs: [['cms_setting', 'key']] },
    {
        file: '0007_cms_archive.sql',
        needs: [['cms_document_revision', 'id'], ['cms_media_archive', 'media_id'], ['cms_media', 'archived_at']],
    },
    { file: '0008_cms_review_rejection.sql', unobservable: 'kontrola omezení a částečný index, přes REST je nevidět' },
    { file: '0009_cms_noop_draft_cleanup.sql', unobservable: 'jednorázový UPDATE, na prázdné tabulce nemá co dělat' },
]

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const colour = process.stdout.isTTY
const c = {
    dim: (s) => (colour ? `\x1b[2m${s}\x1b[0m` : s),
    bold: (s) => (colour ? `\x1b[1m${s}\x1b[0m` : s),
    green: (s) => (colour ? `\x1b[32m${s}\x1b[0m` : s),
    yellow: (s) => (colour ? `\x1b[33m${s}\x1b[0m` : s),
    red: (s) => (colour ? `\x1b[31m${s}\x1b[0m` : s),
    cyan: (s) => (colour ? `\x1b[36m${s}\x1b[0m` : s),
}

// Stable stringify, so "did the body change" is a string comparison rather than
// a deep-equality helper with its own bugs. Same function, same reason, as
// cms-migrate.js `canonical` and core/body.js `sameJson`.
const canonical = (value) => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value)
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
}

/**
 * RFC 4122 v5 — sha1 of (namespace, name), with the version and variant bits
 * forced. Written out rather than depended on: it is nine lines and the
 * alternative is a package whose only job is these nine lines.
 *
 * v5 and not randomUUID(), because the whole property this needs is that it is
 * NOT random: the same fixture must produce the same uuid on the second run, or
 * a re-run duplicates everything it already wrote.
 */
const uuidV5 = (namespace, name) => {
    const ns = Buffer.from(namespace.replaceAll('-', ''), 'hex')
    const hash = crypto.createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest()
    hash[6] = (hash[6] & 0x0f) | 0x50
    hash[8] = (hash[8] & 0x3f) | 0x80
    const hex = hash.subarray(0, 16).toString('hex')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

const mintId = (table, legacyId) => uuidV5(ID_NAMESPACE, `${table}:${legacyId}`)

const bytes = (n) => {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`
    return `${(n / 1024 / 1024).toFixed(2)} MB`
}

/**
 * A media row's `path` says which of the two kinds of asset it is, and the rule
 * is already written down in query.js `filenameFromPath`: a leading slash is a
 * public URL served by this repository out of `public/`, anything else is an
 * object key inside a bucket. Reused rather than re-derived from the `url`,
 * which is the field that changes when the bytes move.
 */
const isSiteAsset = (row) => String(row.path || '').startsWith('/')

// ---------------------------------------------------------------------------
// Ground check
// ---------------------------------------------------------------------------

/**
 * Which migrations have run, asked with a GET and nothing else.
 *
 * Bare fetch rather than a supabase-js client, for the property cms-migrate.js
 * gets the same way: the method is not a parameter, so there is no code path in
 * this function that can write. It also works with the anon key, which matters —
 * without a service-role key getAdminClient() answers with the file store, so
 * asking it about Supabase would return facts about a JSON file on this laptop.
 */
const probeMigrations = async () => {
    const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
        return { reachable: false, reason: 'chybí NEXT_PUBLIC_SUPABASE_URL nebo klíč', results: [] }
    }

    const seen = new Map()
    const column = async (table, col) => {
        const cacheKey = `${table}.${col}`
        if (seen.has(cacheKey)) return seen.get(cacheKey)
        let answer
        try {
            const response = await fetch(`${url}/rest/v1/${table}?select=${col}&limit=1`, {
                method: 'GET',
                headers: { apikey: key, Authorization: `Bearer ${key}` },
            })
            if (response.ok) answer = { ok: true }
            else {
                const body = await response.json().catch(() => ({}))
                answer = { ok: false, code: body.code || String(response.status), message: body.message || '' }
            }
        } catch (error) {
            answer = { ok: false, code: 'network', message: error.message }
        }
        seen.set(cacheKey, answer)
        return answer
    }

    const results = []
    for (const migration of MIGRATIONS) {
        if (migration.unobservable) {
            results.push({ ...migration, state: 'unknown' })
            continue
        }
        const missing = []
        for (const [table, col] of migration.needs || []) {
            const probe = await column(table, col)
            if (!probe.ok) missing.push(`${table}.${col} (${probe.code})`)
        }
        for (const [table, col] of migration.absent || []) {
            const probe = await column(table, col)
            if (probe.ok) missing.push(`${table}.${col} stále existuje`)
        }
        results.push({ ...migration, state: missing.length ? 'missing' : 'ran', missing })
    }

    return { reachable: true, results }
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

/**
 * Where the content comes from. Two answers, and the difference between them is
 * worth a sentence each.
 *
 * `fixtures` is hydrate.js run against the repository's own seed modules: the
 * content as the repository declares it, reproducible on any checkout, with no
 * developer's afternoon in it. This is the default because it is the only source
 * whose contents can be reviewed in a diff.
 *
 * `store` is whatever the file store currently holds. It carries everything the
 * fixtures do plus whatever has been done in the Studio since — which is how the
 * two uploaded files and the assistant document exist at all, and therefore the
 * only source that exercises moving bytes into a bucket. It is read and never
 * written; the store's own reader is not used for it, because that reader caches
 * per process against CMS_FILE_STORE_DIR and this needs to read one store while
 * writing another. STORE_VERSION is imported rather than assumed so the two
 * cannot disagree about the file format.
 */
const loadSource = (options) => {
    if (options.source === 'fixtures') {
        const tables = hydrateTables()
        return {
            label: 'fixtures (src/cms/studio/dev/seed*.js → fileStore/hydrate.js)',
            documents: tables.cms_document,
            media: tables.cms_media,
        }
    }

    const file = path.join(options.storeDir, 'store.json')
    if (!fs.existsSync(file)) throw new Error(`Zdrojové úložiště neexistuje: ${file}`)
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (parsed.version !== STORE_VERSION) {
        throw new Error(`${file} má verzi ${parsed.version}, čekáno ${STORE_VERSION}`)
    }
    return {
        label: `souborové úložiště ${file}`,
        documents: parsed.tables.cms_document || [],
        media: parsed.tables.cms_media || [],
    }
}

/**
 * Every asset reference in a body, repointed at the minted ids.
 *
 * The shape rule is mediaArchive.js `assetIdsIn`'s, deliberately and word for
 * word: an object carrying both a string `id` and a string `url`, at any depth,
 * inside an array or an object alike. Anything looser would rewrite a document
 * id or a slug that happened to sit beside a url; anything stricter would miss
 * the array fields, which is where partner logos live.
 *
 * Only ids the map knows are touched. A reference to something outside the seed
 * is left exactly as it was and counted, because inventing a target for it would
 * be worse than a dangling reference somebody can see.
 */
const remapAssets = (value, map, stats) => {
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map((entry) => remapAssets(entry, map, stats))

    const next = {}
    for (const [key, entry] of Object.entries(value)) next[key] = remapAssets(entry, map, stats)

    if (typeof value.id === 'string' && value.id && typeof value.url === 'string' && value.url) {
        if (map.has(value.id)) {
            next.id = map.get(value.id)
            stats.rewritten += 1
        } else {
            stats.unknown.add(value.id)
        }
    }
    return next
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const buildPlan = async ({ options, source, documents, media }) => {
    // Media first: the document bodies are rewritten with the ids this decides.
    const assetMap = new Map()
    const mediaItems = source.media.map((row) => {
        const id = mintId('cms_media', row.id)
        assetMap.set(row.id, id)
        const site = isSiteAsset(row)
        const item = {
            kind: site ? 'site' : 'object',
            sourceId: row.id,
            id,
            bucket: mediaBucket(),
            path: row.path,
            url: row.url,
            mime: row.mime ?? null,
            size_bytes: row.size_bytes ?? null,
            width: row.width ?? null,
            height: row.height ?? null,
            alt: row.alt ?? '',
            created_at: row.created_at,
            updated_at: row.updated_at ?? row.created_at,
            // The author is dropped on the way through, and it is not laziness:
            // created_by is a foreign key to cms_user, the target's cms_user is
            // empty on the day this runs, and carrying an id from another store
            // would fail the constraint. A seeded row honestly has no author.
            created_by: null,
            archived_at: row.archived_at ?? null,
        }

        if (site) {
            // A committed site asset. `public/` already serves it; nothing is
            // uploaded and the url stays the path, exactly as hydrate.js's
            // mediaRow writes it and for the reason stated there.
            const onDisk = path.join(ROOT, 'public', row.path)
            item.bytesPath = onDisk
            item.bytesFound = fs.existsSync(onDisk)
            item.transferBytes = 0
        } else {
            const onDisk = path.join(options.storeDir, 'media', row.path)
            item.bytesPath = onDisk
            item.bytesFound = fs.existsSync(onDisk)
            item.transferBytes = item.bytesFound ? fs.statSync(onDisk).size : 0
        }
        return item
    })

    const existingMedia = new Map()
    for (let page = 1; ; page += 1) {
        const { rows, total } = await media.list({ page, perPage: 100, archived: 'all' })
        for (const row of rows) existingMedia.set(row.path, row)
        if (existingMedia.size >= total || !rows.length) break
    }
    for (const item of mediaItems) {
        const current = existingMedia.get(item.path)
        item.action = current ? 'exists' : 'create'
        if (current) item.existingId = current.id
    }

    // Documents.
    const rewriteStats = { rewritten: 0, unknown: new Set() }
    const documentItems = source.documents
        .filter((row) => options.only.size === 0 || options.only.has(row.type))
        .map((row) => {
            // Both columns are carried verbatim rather than re-derived from
            // `status`. hydrate.js can derive them because a fixture is never in
            // both states at once, but a row that has LIVED is: unpublish()
            // leaves the last published body in `data` with `status = 'draft'`
            // and `draft` null, and re-deriving would read that document as
            // empty — which it did, and the plan reported four "povinné pole"
            // errors on a review that has a complete body. `draft ?? data` is
            // Contract 3's editable body and is what gets compared and
            // validated; the pair is what gets stored.
            const data = remapAssets(row.data || {}, assetMap, rewriteStats)
            const draft = row.draft == null ? null : remapAssets(row.draft, assetMap, rewriteStats)
            const body = draft ?? data
            return {
                sourceId: row.id,
                id: mintId('cms_document', row.id),
                type: row.type,
                status: row.status,
                data,
                draft,
                created_at: row.created_at,
                updated_at: row.updated_at,
                published_at: row.published_at ?? null,
                archived_at: row.archived_at ?? null,
                // Dropped for the reason the media row's is: cms_user is empty
                // in the target and these are foreign keys. A seeded document
                // honestly has no author.
                created_by: null,
                updated_by: null,
                legacy_source: SEED_SOURCE,
                legacy_id: row.id,
                body,
                knownType: knownType(row.type),
                errors: knownType(row.type) ? collectErrors(row.type, body) : [],
            }
        })

    const existing = new Map(
        (await documents.listByLegacySource({ source: SEED_SOURCE })).map((doc) => [doc.legacyId, doc])
    )
    for (const item of documentItems) {
        const current = existing.get(item.legacy_id)
        if (!current) {
            item.action = 'create'
            continue
        }
        item.existingId = current.id
        // Compared against the body the document actually uses — `draft ?? data`
        // (Contract 3) — for cms-migrate.js's reason: an unpublished document
        // keeps its body in `draft`, so comparing `data` alone would report a
        // change on every run.
        const currentBody = current.draft ?? current.data
        item.action = canonical(currentBody) === canonical(item.body) ? 'unchanged' : 'differs'
    }

    // Documents the OTHER tool would claim. Counted rather than described,
    // because "you may end up with two of everything" needs a number.
    const collisions = []
    for (const legacy of MIGRATE_SOURCES) {
        const rows = await documents.listByLegacySource({ source: legacy })
        if (rows.length) collisions.push({ source: legacy, count: rows.length })
    }

    /**
     * How much is in the target that this tool did not put there.
     *
     * The gate exists because the default target is the store a developer is
     * working in, and it is already full. Nothing recognises those rows —
     * hydrate.js writes `legacy_source: null`, so they carry no mark at all —
     * and a --write against them would not update 124 documents, it would add a
     * second copy of every one. Counted here and refused at the write, rather
     * than discovered afterwards in a store with 248 documents in it.
     */
    const { total: targetDocuments } = await documents.list({ archived: 'all', perPage: 1 })
    const foreign = targetDocuments - existing.size - collisions.reduce((sum, x) => sum + x.count, 0)

    return { documentItems, mediaItems, rewriteStats, collisions, assetMap, targetDocuments, foreign }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const tally = (items) =>
    items.reduce((acc, item) => ({ ...acc, [item.action]: (acc[item.action] || 0) + 1 }), {})

const printPlan = ({ options, source, plan, ground, target }) => {
    const { documentItems, mediaItems, rewriteStats, collisions } = plan

    console.log('')
    console.log(c.bold('  cms-seed — plán'))
    console.log(c.dim(`  režim: ${options.write ? c.red('ZÁPIS') : c.green('dry run (nic se nezapíše)')}`))
    console.log('')

    console.log(c.bold('  Zdroj'))
    console.log(`    ${source.label}`)
    console.log(`    ${source.documents.length} dokumentů, ${source.media.length} položek knihovny`)
    console.log('')

    console.log(c.bold('  Cíl'))
    console.log(`    ${target.label}`)
    console.log(c.dim(`    ovladač úložiště: ${storageDriver()}, bucket: ${mediaBucket()}`))
    console.log('')

    console.log(c.bold('  Migrace v živém Supabase'))
    if (!ground.reachable) {
        console.log(c.yellow(`    nelze zjistit: ${ground.reason}`))
    } else {
        for (const item of ground.results) {
            const mark = item.state === 'ran' ? c.green('✓')
                : item.state === 'missing' ? (item.optional ? c.yellow('!') : c.red('✗'))
                : c.dim('?')
            const note = item.state === 'missing' ? c.dim(`  ← ${item.missing.join(', ')}`)
                : item.state === 'unknown' ? c.dim(`  ← ${item.unobservable}`)
                : ''
            console.log(`    ${mark} ${item.file.padEnd(34)}${note}`)
        }
        const blocking = ground.results.filter((r) => r.state === 'missing' && !r.optional)
        if (blocking.length) {
            console.log('')
            console.log(c.red(`    ${blocking.length} migrací neproběhlo. Spusťte v Supabase SQL editoru, v pořadí:`))
            for (const item of blocking) console.log(c.dim(`      migrations/${item.file}`))
            console.log(c.dim('    Tento nástroj SQL nespouští — 0004 nevratně maže sloupce a PostgREST DDL neumí.'))
        }
    }
    console.log('')

    console.log(c.bold('  Knihovna médií'))
    const site = mediaItems.filter((i) => i.kind === 'site')
    const objects = mediaItems.filter((i) => i.kind === 'object')
    const transfer = objects.reduce((sum, i) => sum + i.transferBytes, 0)
    console.log(`    ${String(site.length).padStart(3)} souborů z public/ ${c.dim('— commitnuté assety webu, zůstávají kde jsou, nahrává se jen řádek')}`)
    console.log(`    ${String(objects.length).padStart(3)} nahraných souborů ${c.dim(`— bytes do úložiště, ${bytes(transfer)} celkem`)}`)
    for (const item of objects) {
        const mark = item.bytesFound ? c.green('·') : c.red('✗')
        console.log(`        ${mark} ${item.path} ${c.dim(`${bytes(item.transferBytes)} ${item.bytesFound ? '' : '— BYTES NENALEZENY'}`)}`)
    }
    const missingSite = site.filter((i) => !i.bytesFound)
    if (missingSite.length) {
        console.log(c.yellow(`    ${missingSite.length} řádků ukazuje na soubor, který v public/ není:`))
        for (const item of missingSite) console.log(c.dim(`        ${item.path}`))
    }
    const mediaCounts = tally(mediaItems)
    console.log(c.dim(`    ${'—'.repeat(50)}`))
    console.log(`    vytvořit ${mediaCounts.create || 0}, už existuje ${mediaCounts.exists || 0}`)
    console.log('')

    console.log(c.bold('  Dokumenty'))
    const byType = {}
    for (const item of documentItems) {
        byType[item.type] = byType[item.type] || { create: 0, unchanged: 0, differs: 0 }
        byType[item.type][item.action] += 1
    }
    for (const [type, counts] of Object.entries(byType).sort()) {
        const parts = Object.entries(counts).filter(([, n]) => n > 0).map(([a, n]) => `${a} ${n}`)
        console.log(`    ${type.padEnd(12)} ${parts.join(', ')}`)
    }
    const docCounts = tally(documentItems)
    console.log(c.dim(`    ${'—'.repeat(50)}`))
    console.log(
        `    ${'celkem'.padEnd(12)} vytvořit ${docCounts.create || 0}, ` +
        `beze změny ${docCounts.unchanged || 0}, liší se ${docCounts.differs || 0}`
    )
    console.log('')

    const differing = documentItems.filter((i) => i.action === 'differs')
    if (differing.length) {
        console.log(c.bold(`  Existuje a liší se (${differing.length})`))
        console.log(c.dim(
            options.updateExisting
                ? '    --update-existing: tělo se uloží jako KONCEPT. `data` se nemění, web se nehne.'
                : '    Přeskakuje se. Po prvním seedu patří dokument redakci, ne fixturám.'
        ))
        for (const item of differing) {
            console.log(`    ${item.type.padEnd(12)} ${item.legacy_id.padEnd(16)} ${c.dim(item.existingId)}`)
        }
        console.log('')
    }

    console.log(c.bold('  Poznámky'))
    console.log(`    ${c.cyan('i')} Identita: legacy_source="${SEED_SOURCE}" + legacy_id=<id fixtury>, ` +
        'unikátní index z 0001. id je UUIDv5 z téhož páru — stejná fixtura, stejné id, každý běh.')
    console.log(`    ${c.cyan('i')} ${rewriteStats.rewritten} odkazů na obrázek v tělech dokumentů se přepisuje na nová id knihovny.`)
    if (rewriteStats.unknown.size) {
        console.log(`    ${c.yellow('!')} ${rewriteStats.unknown.size} odkazů míří mimo seed a zůstávají beze změny: ` +
            [...rewriteStats.unknown].slice(0, 8).join(', '))
    }
    console.log(`    ${c.cyan('i')} Revize se nezakládají. Seedovaný dokument nemá historii, protože se s ním nic nestalo — ` +
        'archiv startuje prázdný a plní se dopředu (0007, 0008). Den jedna neumí říct, jak web vypadal předtím.')
    console.log(`    ${c.cyan('i')} Uživatelé se nezakládají. První vlastník vzniká z CMS_ADMIN_EMAIL / CMS_ADMIN_PASSWORD ` +
        'při prvním přihlášení, přes cms_bootstrap_owner — jedna cesta, ať běží kterékoli úložiště.')
    const unknownTypes = [...new Set(documentItems.filter((i) => !i.knownType).map((i) => i.type))]
    if (unknownTypes.length) {
        console.log(`    ${c.yellow('!')} Typy bez schématu, dokumenty se uloží ale Studio je neotevře: ${unknownTypes.join(', ')}`)
    }
    const invalid = documentItems.filter((i) => i.knownType && i.errors.length)
    if (invalid.length) {
        console.log(`    ${c.yellow('!')} ${invalid.length} dokumentů neprojde validací schématu. Uloží se ` +
            '(obsah je dnes na webu), ale ve Studiu je nepůjde uložit beze změny:')
        for (const item of invalid.slice(0, 10)) {
            console.log(c.dim(`        ${item.type} ${item.legacy_id}: ${item.errors.map((e) => `${e.path} ${e.message}`).join('; ')}`))
        }
        if (invalid.length > 10) console.log(c.dim(`        … a dalších ${invalid.length - 10}`))
    }
    if (plan.foreign > 0) {
        console.log(`    ${c.red('!')} V cíli je ${plan.foreign} dokumentů, které tenhle nástroj nezapsal a nepozná ` +
            '(hydratované úložiště zapisuje legacy_source = null). Seed by je nepřepsal, přidal by druhou sadu. ' +
            `Zápis odmítne, dokud nedáte ${c.bold('--allow-nonempty')}.`)
    }
    for (const clash of collisions) {
        console.log(`    ${c.red('!')} V cíli je ${clash.count} dokumentů z legacy_source="${clash.source}" ` +
            '(scripts/cms-migrate.js). Ty a tenhle seed popisují stejné lidi a recenze dvakrát — ' +
            'spusťte jeden z těch dvou nástrojů, ne oba.')
    }
    console.log('')

    if (options.verbose) {
        console.log(c.bold('  Detail'))
        for (const item of documentItems) {
            console.log(`    ${item.action.padEnd(10)} ${item.type.padEnd(12)} ` +
                `${c.dim(`[${item.status}${item.archived_at ? ' archiv' : ''}]`)} ${item.legacy_id} ${c.dim(item.id)}`)
        }
        console.log('')
    }

    if (!options.write) {
        console.log(c.green('  Dry run. Nic se nezapsalo.'))
        console.log(c.dim('  Zápis: node scripts/cms-seed.mjs --write'))
        console.log('')
    }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const apply = async ({ options, plan, documents, media, storage }) => {
    const results = {
        mediaCreated: 0, mediaExists: 0, mediaUploaded: 0, uploadedBytes: 0,
        created: 0, unchanged: 0, skipped: 0, updated: 0, failed: 0,
    }

    // Media first. A document body names an asset id, so writing the documents
    // first would leave every portrait pointing at a row that does not exist yet
    // — briefly, but the window is exactly when a half-finished run is most
    // likely to be looked at.
    for (const item of plan.mediaItems) {
        if (item.action === 'exists') { results.mediaExists += 1; continue }
        try {
            let url = item.url
            if (item.kind === 'object') {
                if (!item.bytesFound) throw new Error(`bytes nenalezeny: ${item.bytesPath}`)
                const buffer = fs.readFileSync(item.bytesPath)
                // upsert, because the key is content-addressed: an object already
                // at this key is these bytes, and failing on it would make a
                // resumed run impossible.
                await storage.put(item.path, buffer, { contentType: item.mime, upsert: true })
                results.mediaUploaded += 1
                results.uploadedBytes += buffer.length
                // The url is re-derived rather than carried: the source's url
                // names the store the file is LEAVING (/api/cms/asset/... for the
                // file driver) and would 404 against the new one.
                url = storage.publicUrl(item.path)
                    || (await storage.signedUrl(item.path, { expiresIn: 60 * 60 * 24 * 365 }))
            }
            await media.importRow({ ...item, url })
            results.mediaCreated += 1
        } catch (error) {
            results.failed += 1
            console.error(c.red(`    selhalo médium ${item.path}: ${error.message}`))
        }
    }

    for (const item of plan.documentItems) {
        if (item.action === 'unchanged') { results.unchanged += 1; continue }
        if (item.action === 'differs' && !options.updateExisting) { results.skipped += 1; continue }
        try {
            if (item.action === 'differs') {
                // Through update(), which writes `draft` and never `data`. So
                // even the forceful mode cannot change what a visitor sees; an
                // editor gets a pending change they can read and publish or
                // discard.
                await documents.update({ id: item.existingId, data: item.body })
                results.updated += 1
            } else {
                await documents.importRow(item)
                results.created += 1
            }
        } catch (error) {
            results.failed += 1
            console.error(c.red(`    selhalo ${item.type} ${item.legacy_id}: ${error.message}`))
        }
    }

    console.log(c.bold('  Zápis dokončen'))
    console.log(`    knihovna: vytvořeno ${results.mediaCreated}, už bylo ${results.mediaExists}, ` +
        `nahráno ${results.mediaUploaded} souborů (${bytes(results.uploadedBytes)})`)
    console.log(`    dokumenty: vytvořeno ${results.created}, beze změny ${results.unchanged}, ` +
        `přeskočeno ${results.skipped}, aktualizováno ${results.updated}, selhalo ${results.failed}`)
    console.log('')

    if (results.failed) process.exitCode = 1
    return results
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP = `
  cms-seed — naplní prázdné CMS úložiště obsahem, který web dnes ukazuje

  node scripts/cms-seed.mjs [flags]

  --write             Provede zápis. Bez něj je to dry run a nic se nezapíše.
  --source=fixtures   Výchozí. Fixtury repozitáře přes fileStore/hydrate.js.
  --source=store      Aktuální obsah souborového úložiště (i nahrané soubory).
  --store-dir=<path>  Kde to úložiště je. Výchozí .cms-dev. Jen se z něj čte.
  --only=a,b          Jen vybrané typy dokumentů.
  --update-existing   Dokument, který existuje a liší se, se přepíše — jako
                      KONCEPT. \`data\` se nemění, veřejný web se nehne.
  --allow-nonempty    Zapíše i do cíle, ve kterém už jsou cizí dokumenty.
                      Bez něj je neprázdný cíl důvod k odmítnutí.
  --verbose           Vypíše každý dokument, ne jen souhrn.
  --json              Plán jako JSON na stdout.
  --help              Tato nápověda.

  Cíl vybírá src/cms/server/supabaseAdmin.js na jedné otázce: je nastaven
  SUPABASE_SERVICE_ROLE_KEY? Ano -> Supabase. Ne -> souborové úložiště
  v CMS_FILE_STORE_DIR (výchozí .cms-dev). Tenhle nástroj tu volbu nepřebíjí.

  SQL nespouští. Zkontroluje, které migrace proběhly, a jmenuje první chybějící.
`

const parseArgs = (argv) => {
    const options = {
        write: false,
        verbose: false,
        json: false,
        updateExisting: false,
        allowNonEmpty: false,
        source: 'fixtures',
        storeDir: process.env.CMS_SEED_STORE_DIR || path.join(ROOT, '.cms-dev'),
        only: new Set(),
    }

    for (const arg of argv) {
        if (arg === '--help' || arg === '-h') { console.log(HELP); process.exit(0) }
        else if (arg === '--write' || arg === '--commit') options.write = true
        else if (arg === '--verbose' || arg === '-v') options.verbose = true
        else if (arg === '--json') options.json = true
        else if (arg === '--update-existing') options.updateExisting = true
        else if (arg === '--allow-nonempty') options.allowNonEmpty = true
        else if (arg === '--dry-run') { /* already the default; typing it asks for what you get */ }
        else if (arg.startsWith('--source=')) options.source = arg.slice(9)
        else if (arg.startsWith('--store-dir=')) options.storeDir = path.resolve(arg.slice(12))
        else if (arg.startsWith('--only=')) {
            options.only = new Set(arg.slice(7).split(',').map((s) => s.trim()).filter(Boolean))
        } else {
            console.error(c.red(`  Neznámý přepínač: ${arg}`))
            console.log(HELP)
            process.exit(2)
        }
    }

    if (!['fixtures', 'store'].includes(options.source)) {
        console.error(c.red(`  --source musí být fixtures nebo store, ne "${options.source}"`))
        process.exit(2)
    }

    return options
}

const main = async () => {
    const options = parseArgs(process.argv.slice(2))

    // The file store announces itself once per process with console.info, which
    // is stdout — and in --json mode stdout is the document being produced. Sent
    // to stderr for the duration rather than silenced: the line says which store
    // is live, which is exactly the thing you want in the log of a run whose
    // output you are piping somewhere else.
    if (options.json) console.info = (...args) => console.error(...args)

    const toSupabase = hasServiceRoleKey()
    const targetDir = process.env.CMS_FILE_STORE_DIR || path.join(ROOT, '.cms-dev')
    const target = {
        kind: toSupabase ? 'supabase' : 'file',
        label: toSupabase
            ? `Supabase ${String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')}`
            : `souborové úložiště ${path.join(targetDir, 'store.json')}`,
    }

    // Reading and writing the same store would rewrite the source underneath the
    // run. Refused rather than detected halfway through.
    if (!toSupabase && options.source === 'store' && path.resolve(options.storeDir) === path.resolve(targetDir)) {
        throw new Error(
            `Zdroj i cíl je totéž úložiště (${targetDir}).\n` +
            '  Nastavte CMS_FILE_STORE_DIR na jiný adresář, nebo použijte --source=fixtures.'
        )
    }

    const client = getAdminClient()
    const documents = createDocumentRepository({ client })
    const storage = createStorageFromEnv()
    const media = createMediaRepository({ client, storage })

    const [ground, source] = await Promise.all([probeMigrations(), Promise.resolve(loadSource(options))])
    const plan = await buildPlan({ options, source, documents, media })

    if (options.json) {
        console.log(JSON.stringify({
            mode: options.write ? 'write' : 'dry-run',
            target,
            source: { label: source.label, documents: source.documents.length, media: source.media.length },
            migrations: ground,
            documents: plan.documentItems.map(({ body, errors, ...item }) => ({ ...item, errors })),
            media: plan.mediaItems,
        }, null, 2))
        return
    }

    printPlan({ options, source, plan, ground, target })

    if (!options.write) return

    const blocking = ground.reachable
        ? ground.results.filter((r) => r.state === 'missing' && !r.optional)
        : []
    if (target.kind === 'supabase' && blocking.length) {
        throw new Error(
            `Zápis se neprovede: ${blocking.length} migrací v cílovém projektu neproběhlo.\n` +
            blocking.map((r) => `  migrations/${r.file}`).join('\n') +
            '\n  Spusťte je v pořadí v Supabase SQL editoru a zkuste znovu.'
        )
    }

    if (plan.foreign > 0 && !options.allowNonEmpty) {
        throw new Error(
            `Zápis se neprovede: v cíli je ${plan.foreign} dokumentů, které tenhle nástroj nezapsal.\n` +
            '  Seed by je nepřepsal — přidal by druhou sadu vedle nich.\n' +
            '  Seedujte do prázdného úložiště (CMS_FILE_STORE_DIR), nebo si to vynuťte přes --allow-nonempty.'
        )
    }

    console.log(c.red(`  Zapisuji do: ${target.label}`))
    console.log('')
    await apply({ options, plan, documents, media, storage })
}

main().catch((error) => {
    console.error('')
    console.error(c.red(`  ${error.message}`))
    console.error('')
    process.exit(1)
})
