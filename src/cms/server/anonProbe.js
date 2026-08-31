// What the public anon key can still reach on the legacy tables.
//
// The audit's finding: `reviews`, `people` and `total` are readable — and
// `reviews` exposes `ip_list` / `list_of_all_ips`, which are IP addresses and
// personal data under GDPR, world-readable to anyone who opens the site's own
// bundle and copies the anon key out of it. A parallel change closes it in SQL.
// This turns that one-off finding into something the owner can watch become
// false.
//
// ---------------------------------------------------------------------------
// Read-only, and what that costs
// ---------------------------------------------------------------------------
//
// Every request below is a GET. No probe writes, and no probe sends a write
// verb "that cannot match a row" either — a monitor that mutates the thing it
// monitors is not a monitor, and a health check nobody dares run is worse than
// none.
//
// The honest consequence: THE WRITE QUESTION CANNOT BE ANSWERED THIS WAY.
// Whether anon may INSERT or UPDATE is a fact about table privileges, and
// PostgREST offers no read that discloses them — `/rest/v1/` (the OpenAPI
// document, which does list them) answers 401 for anything but service_role,
// verified against this project. The only remaining way to find out is to
// attempt a write, which is the one thing this file will not do. So `writable`
// is reported as `unknown` with the reason attached, rather than guessed at or
// quietly reported as "no".
//
// That is not a hole in the check. The exposure that is measurable — a public
// key reading personal data — is the one that is live right now, and it is the
// one this reports precisely.
//
// Nothing here runs on render. handlers/settings.js reaches it only when
// someone asks, and the answer is held for a minute so that a double click, a
// re-mount or a second owner does not multiply the round trips.

import { supabaseAnonKey, supabaseUrl } from './env.js'

// Legacy tables, from the audit. Not the cms_* tables — those are covered by
// migrations/0002's outright `revoke all from anon` and the file store carries
// the same grant (`anonGrant: []`).
const TABLES = ['reviews', 'people', 'total']

// Columns whose readability is the GDPR half of the finding.
const PERSONAL_COLUMNS = ['ip_list', 'list_of_all_ips']

const TIMEOUT_MS = 4000
const CACHE_MS = 60 * 1000

let cached = null

const request = async (path, headers = {}) => {
    const key = supabaseAnonKey()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
            method: 'GET',
            headers: { apikey: key, Authorization: `Bearer ${key}`, ...headers },
            signal: controller.signal,
        })
        const text = await response.text()
        return { status: response.status, contentRange: response.headers.get('content-range'), text }
    } finally {
        clearTimeout(timer)
    }
}

// PostgREST answers `Range: 0-0` with `content-range: 0-0/37`, so one request
// gives both "can this be read" and "how much of it is there".
const totalFrom = (contentRange) => {
    const match = /\/(\d+)$/.exec(String(contentRange || ''))
    return match ? Number(match[1]) : null
}

const probeTable = async (table) => {
    try {
        const { status, contentRange } = await request(`${table}?select=*`, {
            Prefer: 'count=exact',
            Range: '0-0',
        })
        return {
            table,
            readable: status === 200 || status === 206,
            rows: totalFrom(contentRange),
            status,
        }
    } catch (err) {
        // A network failure is not "the hole is closed". Reported as its own
        // state so a timeout can never read as good news.
        return { table, readable: null, rows: null, status: null, failed: err.name || 'error' }
    }
}

const probePersonalColumns = async () => {
    try {
        const { status, text } = await request(
            `reviews?select=${PERSONAL_COLUMNS.join(',')}&limit=1`
        )
        if (status !== 200 && status !== 206) return { readable: false, populated: false, status }

        let populated = false
        try {
            const rows = JSON.parse(text)
            populated = Array.isArray(rows) && rows.some((row) =>
                PERSONAL_COLUMNS.some((column) => row?.[column] != null && row[column] !== '')
            )
        } catch {
            /* a 200 with an unparseable body still means the grant is there */
        }

        // `populated` distinguishes "the column exists and anyone can read it"
        // from "anyone can read it AND there is personal data in it right now".
        // The second is the breach; the first is the door it came through.
        return { readable: true, populated, status }
    } catch (err) {
        return { readable: null, populated: null, status: null, failed: err.name || 'error' }
    }
}

/**
 * @param {{ force?: boolean }} [options]
 */
export const probeAnonAccess = async ({ force = false } = {}) => {
    if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.result

    const [tables, personal] = await Promise.all([
        Promise.all(TABLES.map(probeTable)),
        probePersonalColumns(),
    ])

    const result = {
        checkedAt: new Date().toISOString(),
        tables,
        personalColumns: { columns: PERSONAL_COLUMNS, ...personal },
        writable: {
            answer: 'unknown',
            // Czech, because it is printed as-is. The reasoning is in the
            // header of this file; this is the one sentence of it a person
            // reading the screen needs.
            reason:
                'Zápis nelze ověřit bez zápisu. Sonda dělá jen čtení, a PostgREST ' +
                'seznam oprávnění anonymnímu klíči nevydá (ověřeno: /rest/v1/ vrací 401). ' +
                'Ověřte v Supabase → Database → Roles, nebo migrací, která práva odebere.',
        },
    }

    cached = { at: Date.now(), result }
    return result
}

// Test seam, and what a "zkontrolovat znovu" button bypasses.
export const resetProbeCache = () => {
    cached = null
}
