#!/usr/bin/env node
// Přenese obsah CMS ze Supabase do Postgresu.
//
// Čte přes PostgREST (service-role klíč) a zapisuje přes pg. Tabulky jdou
// v pořadí, ve kterém na sebe odkazují — uživatelé dřív než dokumenty, protože
// dokumenty ukazují na autora.
//
// Je to idempotentní: zapisuje se `on conflict (id) do update`, takže opakované
// spuštění obsah srovná, místo aby ho zdvojilo.
//
//   node scripts/cms-supabase-to-postgres.mjs [--dry]

import { readFileSync } from 'node:fs'
import pg from 'pg'

const envFile = (file) => {
    try {
        return Object.fromEntries(
            readFileSync(file, 'utf8').split('\n')
                .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
                .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
        )
    } catch { return {} }
}

const test = envFile('.env.test')
const apptest = envFile('.env.apptest')

const SUPABASE_URL = (test.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const SERVICE_KEY = test.SUPABASE_SERVICE_ROLE_KEY
const DATABASE_URL = apptest.DATABASE_URL
const dry = process.argv.includes('--dry')

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('.env.test: chybí Supabase URL nebo service-role klíč')
if (!DATABASE_URL) throw new Error('.env.apptest: chybí DATABASE_URL')

// Pořadí je závislost, ne abeceda.
const TABLES = [
    'cms_user',
    'cms_document',
    'cms_media',
    'cms_document_revision',
    'cms_media_archive',
    'cms_setting',
    'cms_api_key',
    'cms_reaction',
    // cms_session se nepřenáší: sezení není obsah a podepisuje se jiným
    // klíčem, takže by na cíli stejně neplatilo. Editoři se přihlásí znovu.
]

const readAll = async (table) => {
    const rows = []
    const step = 500
    for (let from = 0; ; from += step) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
            headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
                Range: `${from}-${from + step - 1}`,
            },
        })
        if (!res.ok) {
            if (res.status === 404) return null            // tabulka na zdroji není
            throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`)
        }
        const batch = await res.json()
        rows.push(...batch)
        if (batch.length < step) return rows
    }
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()

/**
 * Sloupce, do kterých se dá zapsat.
 *
 * Generované sloupce se vynechávají, protože zapsat do nich nejde — Postgres
 * je počítá sám. `cms_document.search_text` je vyhledávací text odvozený
 * z dat; přenášet ho by znamenalo přenášet výsledek místo vstupu.
 */
const columnsOf = async (table) => {
    const { rows } = await client.query(
        `select column_name from information_schema.columns
         where table_schema='public' and table_name=$1 and is_generated = 'NEVER'`,
        [table],
    )
    return new Set(rows.map((r) => r.column_name))
}

let total = 0
for (const table of TABLES) {
    const rows = await readAll(table)
    if (rows === null) { console.log(`  ${table.padEnd(22)} na zdroji není`); continue }
    if (!rows.length) { console.log(`  ${table.padEnd(22)} 0`); continue }

    const known = await columnsOf(table)
    // Sloupec, který cíl nemá, se zahodí — a řekne se to. Schémata se mezi
    // Supabase a Postgresem liší tam, kde se vynechaly platformní věci.
    const dropped = Object.keys(rows[0]).filter((c) => !known.has(c))
    const cols = Object.keys(rows[0]).filter((c) => known.has(c))

    if (!dry) {
        const list = cols.map((c) => `"${c}"`).join(', ')
        const update = cols.filter((c) => c !== 'id').map((c) => `"${c}" = excluded."${c}"`).join(', ')
        for (const row of rows) {
            const values = cols.map((c) => {
                const v = row[c]
                return v !== null && typeof v === 'object' ? JSON.stringify(v) : v
            })
            const holders = cols.map((_, i) => `$${i + 1}`).join(', ')
            await client.query(
                `insert into public.${table} (${list}) values (${holders})` +
                    (known.has('id') ? ` on conflict (id) do update set ${update}` : ' on conflict do nothing'),
                values,
            )
        }
    }
    total += rows.length
    console.log(`  ${table.padEnd(22)} ${String(rows.length).padStart(4)}${dropped.length ? `   (vynecháno sloupců: ${dropped.join(', ')})` : ''}`)
}

console.log(`\n  celkem ${total} řádků${dry ? ' (nanečisto)' : ''}`)
await client.end()
