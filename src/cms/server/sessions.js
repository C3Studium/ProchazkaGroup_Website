// Seeing the sessions that exist, and ending them.
//
// auth.js issues sessions and revokes them one at a time (sign-out) or all at
// once for a user (disable, password change). What there was no way to do was
// look: thirty-day sliding sessions accumulate, a laptop that was signed in in
// March is still signed in in September, and the only evidence was a table
// nobody could query. Seventeen rows were live in this project's store when
// this file was written.
//
// Owner-only, like user management. The check is in the handler before any of
// this is reached — same rule as users.js.
//
// What a row here may show is decided by the same argument that dropped
// `ip_list` from the migrated reviews: `ip_hash` is a salted hash and is
// deliberately NOT returned, because a hash of an address is still a stable
// per-person identifier and nothing on this screen is answered by it. The
// browser string is what a person recognises their own laptop by, so that is
// what is shown.

import { serverError } from './errors.js'
import { getAdminClient } from './supabaseAdmin.js'

const TABLE = 'cms_session'

const db = () => getAdminClient()

// `token_hash` is selected because the current session has to be identifiable,
// and it never leaves this module: `toSession` compares it and drops it. The
// same reasoning as users.js never selecting `password_hash` — except here the
// column IS needed for one comparison, so it is fetched and discarded rather
// than sent.
const FIELDS = 'id, user_id, token_hash, created_at, expires_at, revoked_at, user_agent'

const toSession = (row, currentHash) => ({
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    userAgent: row.user_agent || '',
    // Which of these rows is the browser reading this screen. Everything the
    // UI says about "this device" hangs off it.
    current: Boolean(currentHash) && row.token_hash === currentHash,
})

/**
 * Every session that could still be used, newest first, with the address behind
 * it.
 *
 * Revoked and expired rows are left out rather than greyed: this list answers
 * "who is signed in right now", and a dead session is not an answer to it.
 * cms_prune_sessions() eventually deletes them anyway.
 */
export const listSessions = async ({ currentHash = null } = {}) => {
    const { data, error } = await db()
        .from(TABLE)
        .select(FIELDS)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    if (error) throw serverError('Načtení přihlášení selhalo')

    const rows = (data || []).map((row) => toSession(row, currentHash))

    // One extra query rather than a join: PostgREST embedding needs a declared
    // foreign key and the file store does not implement it. A staff list is
    // four rows.
    const users = await db().from('cms_user').select('id, email, name, role')
    if (users.error) throw serverError('Načtení přihlášení selhalo')

    const byId = new Map((users.data || []).map((user) => [user.id, user]))

    return {
        rows: rows.map((row) => {
            const user = byId.get(row.userId)
            return {
                ...row,
                email: user?.email || '',
                name: user?.name || user?.email || '',
                role: user?.role || '',
            }
        }),
    }
}

/** One session, ended now. Used for "that laptop, not this one". */
export const revokeSession = async (id) => {
    const { error } = await db()
        .from(TABLE)
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .is('revoked_at', null)

    if (error) throw serverError('Odhlášení relace selhalo')
}

/**
 * Sign out everywhere.
 *
 * `keepHash` is the caller's own session and the default is to keep it, which
 * is a decision rather than a convenience: the person clicking this is sitting
 * in the Studio, and a button that logs the owner out of the screen they
 * clicked it on is a button they will not press the second time they need it.
 * The threat it answers is a session somebody ELSE holds, and the caller's own
 * cookie is the one session they can already account for.
 *
 * Ending your own too is still reachable and is one row's button away — and
 * changing the password (auth.js) revokes everything including the current one,
 * which is the right tool for "I think someone has my password".
 *
 * `userId` narrows it to one person; without it, every session in the system
 * goes. Both are owner-only.
 *
 * @returns {number} how many sessions were ended
 */
export const revokeAllSessions = async ({ userId = null, keepHash = null } = {}) => {
    let query = db()
        .from(TABLE)
        .select('id, token_hash')
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())

    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) throw serverError('Odhlášení selhalo')

    const doomed = (data || []).filter((row) => !keepHash || row.token_hash !== keepHash)
    if (!doomed.length) return 0

    const { error: writeError } = await db()
        .from(TABLE)
        .update({ revoked_at: new Date().toISOString() })
        .in('id', doomed.map((row) => row.id))

    if (writeError) throw serverError('Odhlášení selhalo')
    return doomed.length
}
