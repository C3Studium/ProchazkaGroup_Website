// API keys the CMS issues — the token an outside system uses to read this
// site's published content.
//
// The whole design is auth.js's session design, reused rather than re-argued:
// 32 random bytes, a SHA-256 of the token in the row, the token itself handed
// over once and written down nowhere. A leaked cms_api_key table is a list of
// digests, and a digest is not a credential. The file store carries the same
// 64-hex check constraint on `token_hash` that migrations/0002 puts on
// cms_session, so a refactor that ever started storing the real thing fails on
// insert instead of quietly working.
//
// What a key is NOT is the other half of the design, and it is structural:
//
//   - Resolving a key answers a `{ id, name }` principal. It is not a user, it
//     has no role, and no other module in this server accepts it. requireUser()
//     and requireOwner() read a cookie and nothing else, so a key cannot reach
//     drafts, users, sessions or media by any path — not "is refused there",
//     cannot arrive there.
//   - The only caller is handlers/content.js, which constructs a port with two
//     read methods on it (contentApi.js). Widening what a key can do means
//     adding a method to that port, in that file, under the comment saying not
//     to.
//
// Owner-only to create, list and revoke. The check is in the handler, before
// anything here is reached — the same rule as users.js, for the same reason.

import { createHash, randomBytes } from 'node:crypto'

import { invalid, notFound, serverError } from './errors.js'
import { getAdminClient } from './supabaseAdmin.js'

const TABLE = 'cms_api_key'

// `token_hash` is absent from every select in this file, exactly as
// `password_hash` is from users.js. It has no business crossing an HTTP
// boundary even to an owner, and the surest way to keep it out of a response is
// never to fetch it.
const FIELDS = 'id, name, created_at, created_by, last_used_at, revoked_at'

// A recognisable prefix so that a token found in a log or a config file can be
// identified as this system's and revoked. It carries no information — the
// entropy is the 32 bytes after it — and it is part of what gets hashed.
const PREFIX = 'pgcms_'

const NAME_MAX = 60

const db = () => getAdminClient()

const digest = (token) => createHash('sha256').update(token).digest('hex')

const toKey = (row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    createdBy: row.created_by,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
})

export const listApiKeys = async () => {
    const { data, error } = await db()
        .from(TABLE)
        .select(FIELDS)
        // Live keys first, newest first inside each group. The list is read to
        // answer "what can currently read this site", and a revoked key is
        // history — kept visible because "we turned that one off in March" is
        // the question a person asks next.
        .order('revoked_at', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false })

    if (error) throw serverError('Načtení API klíčů selhalo')
    return { rows: (data || []).map(toKey) }
}

/**
 * Issue one. The plaintext is returned in this response and never again: the
 * row holds a digest, handlers/http.js sets no-store, and there is no endpoint
 * that can produce it a second time. users.js's `temporaryPassword` is the same
 * flow and the Studio reuses its wording.
 */
export const createApiKey = async (actor, { name }) => {
    const label = String(name || '').trim()
    if (!label) throw invalid('Pojmenujte klíč, ať víte, co ho používá', { name: 'Zadejte název' })
    if (label.length > NAME_MAX) {
        throw invalid(`Název může mít nejvýš ${NAME_MAX} znaků`, { name: 'Příliš dlouhé' })
    }

    const token = `${PREFIX}${randomBytes(32).toString('base64url')}`

    const { data, error } = await db()
        .from(TABLE)
        .insert({
            name: label,
            token_hash: digest(token),
            created_by: actor?.id ?? null,
        })
        .select(FIELDS)
        .maybeSingle()

    if (error) throw serverError('Vytvoření API klíče selhalo')

    return { key: toKey(data), token }
}

/**
 * Revoke. A timestamp rather than a delete, so the list can still say that a
 * key existed and stopped working — and so `resolveApiKey` has something to
 * refuse rather than a row that simply is not there any more.
 *
 * Already-revoked is not an error: two owners clicking the same button is not a
 * conflict worth a message.
 */
export const revokeApiKey = async (actor, id) => {
    const { data, error } = await db()
        .from(TABLE)
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .is('revoked_at', null)
        .select(FIELDS)

    if (error) throw serverError('Zneplatnění klíče selhalo')
    if (data && data.length) return toKey(data[0])

    // Nothing updated: either it was already revoked, or there is no such key.
    const existing = await db().from(TABLE).select(FIELDS).eq('id', id).maybeSingle()
    if (existing.error) throw serverError('Zneplatnění klíče selhalo')
    if (!existing.data) throw notFound('Klíč neexistuje')
    return toKey(existing.data)
}

// Recording every request would mean a write per read. The column answers "is
// this key still in use" to within a minute, which is the question it exists
// for; a minute of resolution costs one write per key per minute at most. Same
// argument as auth.js's SLIDE_AFTER_MS, one order of magnitude tighter.
const TOUCH_AFTER_MS = 60 * 1000

/**
 * The presented token -> a principal, or null.
 *
 * Deliberately not shaped like a user. It carries an id and a name so a request
 * can be attributed, and nothing that any other part of this server would
 * accept as authorisation.
 */
export const resolveApiKey = async (token) => {
    const presented = String(token || '')
    if (!presented.startsWith(PREFIX) || presented.length < PREFIX.length + 20) return null

    const { data, error } = await db()
        .from(TABLE)
        .select('id, name, last_used_at, revoked_at')
        .eq('token_hash', digest(presented))
        .maybeSingle()

    if (error) throw serverError('Ověření API klíče selhalo')
    if (!data || data.revoked_at) return null

    const last = data.last_used_at ? new Date(data.last_used_at).getTime() : 0
    if (Date.now() - last > TOUCH_AFTER_MS) {
        // Best effort. A key that works must not stop working because a
        // bookkeeping write lost a race.
        try {
            await db()
                .from(TABLE)
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', data.id)
        } catch {
            /* the read the caller asked for is what matters */
        }
    }

    return { id: data.id, name: data.name }
}
