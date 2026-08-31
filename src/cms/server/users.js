// User management. Owner-only; the check is in the handler, before any of this
// is reached, for the same reason adapter.js does not check authorisation —
// a module that sometimes checks and sometimes does not is worse than one that
// never does. Reaching this file means the caller has been established as an
// owner.
//
// Two invariants are enforced twice on purpose:
//
//   - There is always at least one active owner. The message a person reads
//     comes from here; the guarantee comes from the constraint trigger in
//     0002_cms_auth.sql. A UI check that is the only check is a suggestion.
//   - A password never leaves this layer in plaintext except once, at the
//     moment an account is created, to the owner who created it. It is not
//     stored, and there is no endpoint that can produce it a second time.

import { conflict, invalid, notFound, serverError } from './errors.js'
import { generatePassword, hashPassword, passwordProblem } from './password.js'
import { getAdminClient } from './supabaseAdmin.js'
import { revokeSessionsForUser } from './auth.js'

// password_hash is absent from every select in this file. It has no business
// crossing an HTTP boundary even to an owner, and the surest way to keep it out
// of a response is never to fetch it.
const FIELDS = 'id, email, name, role, created_at, updated_at, last_login_at, disabled_at, created_by'

/**
 * The roles this screen may hand out — `admin` is deliberately absent.
 *
 * Admin is decided by CMS_ADMIN_EMAIL (server/auth.js effectiveRole), not by a
 * column, so accepting it here would let somebody store a value the server then
 * ignores: the row would read admin and every request would still answer
 * member. A role that can be saved and does nothing is worse than one that
 * cannot be saved.
 *
 * `owner` and `member` carry identical permissions today — owner is the title a
 * client sees on their own site. Kept as separate values so it can be given
 * meaning later without revisiting every account.
 */
const ROLES = ['owner', 'member']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const db = () => getAdminClient()

const toUser = (row) => ({
    id: row.id,
    email: row.email,
    name: row.name || '',
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    disabledAt: row.disabled_at,
    createdBy: row.created_by,
})

const normaliseEmail = (value) => String(value || '').trim().toLowerCase()

/** How many owners could still sign in. The number the lock-out rule is about. */
const activeOwnerCount = async () => {
    const { count, error } = await db()
        .from('cms_user')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner')
        .is('disabled_at', null)

    if (error) throw serverError('Nepodařilo se ověřit počet vlastníků')
    return count || 0
}

const fetchUser = async (id) => {
    const { data, error } = await db().from('cms_user').select(FIELDS).eq('id', id).maybeSingle()
    if (error) throw serverError('Načtení uživatele selhalo')
    if (!data) throw notFound('Uživatel neexistuje')
    return data
}

/**
 * Would this change leave the system with nobody who can administer it? Called
 * before demoting, disabling and deleting, so all three give the same
 * explanation instead of three different database errors.
 */
const assertNotLastOwner = async (target, { stillActiveOwner }) => {
    if (target.role !== 'owner' || target.disabled_at) return
    if (stillActiveOwner) return
    if ((await activeOwnerCount()) <= 1) {
        throw conflict(
            'Toto je poslední aktivní vlastník. Nejdřív pověřte někoho dalšího, jinak by se systém uzamkl.'
        )
    }
}

export const listUsers = async () => {
    const { data, error } = await db()
        .from('cms_user')
        .select(FIELDS)
        // The administrator first, then alphabetically. ASCENDING, and the
        // direction is load-bearing: with the roles renamed to admin/owner/
        // member the alphabet happens to put admin first, where the person who
        // can change things belongs. It sorted descending while the roles were
        // owner/editor, which put the same person at the top for the same
        // reason — the rename inverted which direction does that.
        // A staff list is read to find a person, and it is short enough that
        // paging it would be noise.
        .order('role', { ascending: true })
        .order('email', { ascending: true })

    if (error) throw serverError('Načtení uživatelů selhalo')
    return { rows: (data || []).map(toUser) }
}

/**
 * Invite or create. One operation because they differ only in who chooses the
 * password.
 *
 * With no `password`, one is generated and returned ONCE, in this response, for
 * the owner to pass on out of band. There is no mail dependency in this build
 * and inventing one to send a password would be worse than showing it to the
 * person who just typed the address.
 *
 * The returned plaintext is never written anywhere: the row holds the hash, the
 * response is not cached (handlers/http.js sets no-store), and no later request
 * can retrieve it. If it is lost, the owner creates a new one.
 */
export const createUser = async (actor, { email, name, role = 'member', password }) => {
    const address = normaliseEmail(email)
    if (!EMAIL_RE.test(address)) {
        throw invalid('Zadejte platnou e-mailovou adresu', { email: 'Neplatný formát' })
    }
    if (!ROLES.includes(role)) throw invalid('Neplatná role', { role: 'Neznámá role' })

    const generated = !password
    const secret = generated ? generatePassword() : String(password)

    if (!generated) {
        const problem = passwordProblem(secret)
        if (problem) throw invalid(problem, { password: problem })
    }

    const { data, error } = await db()
        .from('cms_user')
        .insert({
            email: address,
            password_hash: await hashPassword(secret),
            name: String(name || '').trim(),
            role,
            created_by: actor.id,
        })
        .select(FIELDS)
        .maybeSingle()

    if (error) {
        if (error.code === '23505') {
            throw conflict('Uživatel s touto adresou už existuje')
        }
        throw serverError('Vytvoření uživatele selhalo')
    }

    return { user: toUser(data), temporaryPassword: generated ? secret : null }
}

/**
 * Change someone's role. An owner demoting themselves is allowed and sometimes
 * correct — handing over and stepping back is a real thing people do — but not
 * while they are the only one left.
 */
export const updateUserRole = async (actor, id, role) => {
    if (!ROLES.includes(role)) throw invalid('Neplatná role', { role: 'Neznámá role' })

    const target = await fetchUser(id)
    if (target.role === role) return toUser(target)

    await assertNotLastOwner(target, { stillActiveOwner: role === 'owner' })

    const { data, error } = await db()
        .from('cms_user')
        .update({ role })
        .eq('id', id)
        .select(FIELDS)
        .maybeSingle()

    if (error) throw serverError('Změna role selhala')
    return toUser(data)
}

/**
 * Disable or re-enable an account. Disabling is the reversible half of removal
 * and is what should normally be used: it keeps the audit trail that a delete
 * throws away, and it takes effect on the next request either way because
 * cms_resolve_session() refuses a disabled account.
 *
 * Sessions are revoked as well as blocked. Belt and braces, and it means the
 * rows do not sit there looking live.
 */
export const setUserDisabled = async (actor, id, disabled) => {
    const target = await fetchUser(id)

    if (disabled) await assertNotLastOwner(target, { stillActiveOwner: false })

    const { data, error } = await db()
        .from('cms_user')
        .update({ disabled_at: disabled ? new Date().toISOString() : null })
        .eq('id', id)
        .select(FIELDS)
        .maybeSingle()

    if (error) throw serverError('Změna stavu účtu selhala')
    if (disabled) await revokeSessionsForUser(id)

    return toUser(data)
}

/**
 * Delete. The sessions go with the row (ON DELETE CASCADE), which is the
 * argument for storing sessions rather than issuing JWTs: access ends now, not
 * whenever the token would have expired.
 *
 * Documents the person authored survive — created_by is ON DELETE SET NULL.
 * Losing a year of content because somebody left is not a security feature.
 */
export const deleteUser = async (actor, id) => {
    const target = await fetchUser(id)
    await assertNotLastOwner(target, { stillActiveOwner: false })

    const { error } = await db().from('cms_user').delete().eq('id', id)
    if (error) throw serverError('Smazání uživatele selhalo')
}
