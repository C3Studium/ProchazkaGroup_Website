// Sessions and sign-in. Replaces the Supabase magic-link flow entirely; see
// src/cms/AUTH.md for why.
//
// The shape of the flow:
//
//   1. POST /api/cms/auth/sign-in with an address and a password.
//   2. This module finds the cms_user row, verifies the hash, and mints a
//      32-byte random token.
//   3. The token's SHA-256 goes in cms_session. The token itself goes in an
//      httpOnly cookie and is never written down anywhere.
//   4. Every later request presents the cookie; step 3 runs in reverse.
//
// Two things about that are load-bearing.
//
// The database stores a digest, not the token — the same argument as passwords.
// A leaked cms_session table is a list of digests, and a digest is not a
// credential. The migration enforces the shape of that column so a future
// refactor cannot quietly start storing the real thing.
//
// The cookie is signed with CMS_SESSION_SECRET. The signature adds nothing
// cryptographically over a 256-bit random token — it exists so that a forged or
// truncated cookie is rejected in this process, without a database round trip,
// and so that rotating one environment variable signs everybody out.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { conflict, forbidden, invalid, serverError, unauthorized } from './errors.js'
import { bootstrapAdmin, isProduction, sessionSecret } from './env.js'
// Browser-safe and imported here only for the name, so the cookie the site
// reads and the cookie this module writes cannot drift. Everything about what
// that cookie may and may not be trusted for is in that file.
import { HINT_COOKIE, HINT_VALUE } from '@/cms/manage/hint'
import { clientKey, consume } from './rateLimit.js'
import { decoyHash, hashPassword, needsRehash, passwordProblem, verifyPassword } from './password.js'
import { getAdminClient } from './supabaseAdmin.js'

const COOKIE = 'cms_session'

const SESSION_DAYS = 30
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

// Sliding expiry, but not on every request: an editor with the admin open in a
// tab would otherwise write to cms_session every few seconds. Extend only once
// the session is a day old, which is invisible to a person and cheap for a
// database.
const SLIDE_AFTER_MS = 24 * 60 * 60 * 1000

// The same answer for an unknown address and a wrong password. Anything that
// distinguishes them turns this endpoint into a list of who works here.
const SIGN_IN_FAILED = 'Nesprávný e-mail nebo heslo'

/* ------------------------------------------------------------- cookie ---- */

const cookieHeader = (name, value, maxAge, { httpOnly = true } = {}) => {
    const parts = [`${name}=${value}`, 'Path=/', 'SameSite=Lax', `Max-Age=${maxAge}`]
    if (httpOnly) parts.push('HttpOnly')
    // Secure would make the cookie unusable on http://localhost, so it follows
    // NODE_ENV rather than being unconditional.
    if (isProduction()) parts.push('Secure')
    return parts.join('; ')
}

/**
 * The session cookie and the hint that shadows it, always written together.
 *
 * Two cookies in one Set-Cookie array rather than two `setHeader` calls, because
 * the second call would replace the first — and a session issued without its
 * hint, or a hint left behind by a cleared session, is precisely the drift this
 * pairing exists to make impossible. Every place below that touches one touches
 * both by construction: there is no way to call this and get only the session.
 *
 * The hint is NOT httpOnly, deliberately and singularly. It is the one thing in
 * this module a script on a public page is allowed to read, it says nothing but
 * "somebody signed in here", and it is worth exactly nothing to whoever forges
 * it. src/cms/manage/hint.js holds that argument in full; it belongs there
 * rather than here because the file that could be tempted to trust the cookie is
 * the file that reads it.
 */
const sessionCookies = (token, maxAge) => [
    cookieHeader(COOKIE, token, maxAge),
    cookieHeader(HINT_COOKIE, token ? HINT_VALUE : '', maxAge, { httpOnly: false }),
]

const readCookies = (req) => {
    if (req.cookies) return req.cookies
    const header = req.headers?.cookie || ''
    return Object.fromEntries(
        header.split(';').filter(Boolean).map((part) => {
            const index = part.indexOf('=')
            if (index < 0) return [part.trim(), '']
            return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
        })
    )
}

const sign = (token) => createHmac('sha256', sessionSecret()).update(token).digest('base64url')

const digest = (token) => createHash('sha256').update(token).digest('hex')

/**
 * Pull the token out of a signed cookie. Returns null for anything that does
 * not verify, so a tampered cookie is indistinguishable from no cookie for
 * every caller above this line.
 */
const tokenFromCookie = (req) => {
    const raw = readCookies(req)[COOKIE]
    if (!raw) return null

    const separator = raw.lastIndexOf('.')
    if (separator < 1) return null

    const token = raw.slice(0, separator)
    const presented = Buffer.from(raw.slice(separator + 1), 'base64url')
    const expected = Buffer.from(sign(token), 'base64url')

    if (presented.length !== expected.length) return null
    if (!timingSafeEqual(presented, expected)) return null
    return token
}

export const clearSessionCookie = (res) => {
    res.setHeader('Set-Cookie', sessionCookies('', 0))
}

/**
 * The digest of the token this request arrived holding, or null.
 *
 * The session screen needs to know which of the listed rows is the browser
 * looking at it — to mark it, and to leave it alone when everything else is
 * signed out. That is the only question outside this module that needs the
 * digest, and it is answered with the digest rather than the token so nothing
 * above this line ever holds a working credential. sessions.js compares it and
 * drops it.
 */
export const currentSessionHash = (req) => {
    const token = tokenFromCookie(req)
    return token ? digest(token) : null
}

/* ------------------------------------------------------------ sessions --- */

const db = () => getAdminClient()

/**
 * Mint a session for a user who has already been authenticated. Never called
 * anywhere that has not just verified a password — constructing a session is
 * the server saying the check passed.
 */
const issueSession = async (req, res, userId) => {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + SESSION_MS)

    const { error } = await db()
        .from('cms_session')
        .insert({
            user_id: userId,
            token_hash: digest(token),
            expires_at: expiresAt.toISOString(),
            // Already a salted hash — the limiter and the session row share one
            // definition of "which client is this" and neither holds an address.
            ip_hash: clientKey(req),
            user_agent: String(req.headers?.['user-agent'] || '').slice(0, 300) || null,
        })

    if (error) throw serverError('Přihlášení se nepodařilo dokončit')

    res.setHeader('Set-Cookie', sessionCookies(`${token}.${sign(token)}`, Math.floor(SESSION_MS / 1000)))
    return { expiresAt }
}

const revokeByTokenHash = async (tokenHash) => {
    if (!tokenHash) return
    await db()
        .from('cms_session')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
}

/** Every session a user holds, gone. Used when disabling an account or when a
 *  password changes — a changed password that leaves old sessions alive has not
 *  actually locked anybody out. */
export const revokeSessionsForUser = async (userId) => {
    if (!userId) return
    await db()
        .from('cms_session')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null)
}

/**
 * Resolve the caller. Returns null for anonymous callers rather than throwing —
 * the public review route runs without a session and Contract 2 makes
 * `auth.user()` explicitly nullable.
 *
 * The four reasons a session can be dead (wrong digest, revoked, expired,
 * account disabled) are all decided by cms_resolve_session() in the migration,
 * so there is one definition of a usable session and it is in the database.
 */
export const getSessionUser = async (req, res = null) => {
    const token = tokenFromCookie(req)
    if (!token) return null

    const tokenHash = digest(token)
    const { data, error } = await db().rpc('cms_resolve_session', { p_token_hash: tokenHash })
    if (error) throw serverError('Ověření přihlášení selhalo')

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null

    // A valid session whose browser has no hint: write one and nothing else.
    //
    // The hint is written beside the session at sign-in and again on every
    // slide — but a slide only happens once a session is a day old, so a
    // browser that signed in before the hint existed, or signed in today, holds
    // a perfectly good session and no hint, and the public site shows it
    // nothing. That is not a rare edge: it was every existing session the day
    // the widget shipped.
    //
    // Only the hint is rewritten. Calling `sessionCookies` here would reissue
    // the session cookie with a fresh Max-Age too, which is a slide — and would
    // quietly turn "extend once a day" into "extend on every request", the
    // write rate SLIDE_AFTER_MS exists to prevent.
    if (res && !readCookies(req)[HINT_COOKIE]) {
        res.setHeader(
            'Set-Cookie',
            cookieHeader(HINT_COOKIE, HINT_VALUE, Math.floor(SESSION_MS / 1000), { httpOnly: false }),
        )
    }

    // Sliding expiry. Failure here is deliberately ignored: an editor mid-edit
    // should not be signed out because a housekeeping write lost a race.
    const remaining = new Date(row.expires_at).getTime() - Date.now()
    if (res && remaining < SESSION_MS - SLIDE_AFTER_MS) {
        await db()
            .from('cms_session')
            .update({ expires_at: new Date(Date.now() + SESSION_MS).toISOString() })
            .eq('id', row.session_id)
        // The hint rides along on the same slide, so a browser in daily use
        // never holds a hint older than the session it shadows.
        res.setHeader('Set-Cookie', sessionCookies(`${token}.${sign(token)}`, Math.floor(SESSION_MS / 1000)))
    }

    return {
        id: row.user_id,
        email: row.email,
        name: row.name || row.email,
        role: effectiveRole(row.email, row.role),
    }
}

/**
 * Which role this account really has.
 *
 * The environment decides who the admin is, not the row. `CMS_ADMIN_EMAIL` is
 * the developer's account, and reading it here means three things hold without
 * anyone maintaining them: moving the variable to a different address moves
 * admin with it, a row edited to `admin` in the database by hand grants nothing
 * (the address has to match as well), and the developer cannot be locked out of
 * their own CMS by a demotion.
 *
 * `owner` and `member` are returned as stored. They differ in nothing today —
 * `owner` is the title a client sees on their own site, not a permission — and
 * when they do differ it will be decided in this file rather than by scattering
 * checks through the handlers.
 */
export const effectiveRole = (email, storedRole) => {
    const admin = bootstrapAdmin()
    if (admin && String(email || '').trim().toLowerCase() === admin.email) return 'admin'
    return storedRole === 'admin' ? 'member' : storedRole || 'member'
}

/** Does this role carry the developer's powers? */
export const isAdminRole = (role) => role === 'admin'

/** A signed-in user of any role. Content editing needs nothing more. */
export const requireUser = async (req, res = null) => {
    const user = await getSessionUser(req, res)
    if (!user) throw unauthorized()
    return user
}

/**
 * An owner. Checked on the server on every request that manages users, not by
 * hiding the button — a hidden button is a UI convenience, never a control.
 * `forbidden` rather than `unauthorized` so the Studio can tell "sign in" apart
 * from "you are signed in and this is not yours".
 */
export const requireAdmin = async (req, res = null) => {
    const user = await requireUser(req, res)
    if (!isAdminRole(user.role)) throw forbidden('Tuto akci může provést jen správce')
    return user
}

/**
 * The old name, kept as an alias for one reason: `requireOwner` is imported by
 * seven handlers and by server/index.js, and a rename that touches all of them
 * in the same change as the role model itself makes the diff impossible to
 * read. It means what it always meant — "the account that may administer this
 * CMS" — and that account is now called admin.
 *
 * @deprecated Use requireAdmin.
 */
export const requireOwner = requireAdmin

/* ------------------------------------------------------------ bootstrap -- */

// Memoised only in the direction that is safe to remember. Once an account has
// been observed, no environment pair can ever seed again, so caching that is
// permanent truth. The other direction is never cached: an empty table today
// may be a seeded one a second from now.
let accountsExist = false

/**
 * Create the first owner from CMS_ADMIN_EMAIL / CMS_ADMIN_PASSWORD.
 *
 * It is a seed, not a back door, and the guarantee is in SQL rather than here:
 * cms_bootstrap_owner() inserts `where not exists (select 1 from cms_user)` in
 * one atomic statement. Once any account exists this returns no rows forever,
 * so leaving the variables set in Vercel grants nothing, rotating them grants
 * nothing, and changing the password in the admin cannot be undone from the
 * environment.
 *
 * The environment password is hashed and dropped. It is never stored, never
 * logged, and never compared against a stored plaintext — there is no code path
 * in this module that reads CMS_ADMIN_PASSWORD at verification time.
 */
export const ensureBootstrapOwner = async () => {
    if (accountsExist) return null

    const seed = bootstrapAdmin()
    if (!seed) {
        // Nothing configured. Whether the table is empty is not this function's
        // problem — an empty table with no seed simply means nobody can sign in
        // yet, which is the correct state for a project that has not been set up.
        return null
    }

    const problem = passwordProblem(seed.password)
    if (problem) {
        // Named loudly, without the value. A too-short bootstrap password is a
        // deployment mistake that would otherwise surface as "login does not
        // work" weeks later.
        console.error(`[cms] CMS_ADMIN_PASSWORD rejected: ${problem}. The first owner was not created.`)
        return null
    }

    const passwordHash = await hashPassword(seed.password)
    const { data, error } = await db().rpc('cms_bootstrap_owner', {
        p_email: seed.email,
        p_password_hash: passwordHash,
        p_name: '',
    })

    if (error) {
        console.error('[cms] bootstrap failed', error)
        return null
    }

    const created = Array.isArray(data) ? data[0] : data
    accountsExist = true

    if (created) {
        // The address, never the password. Somebody has to be able to tell from
        // a deploy log that the seed ran.
        console.info(`[cms] bootstrap created the first owner: ${created.email}`)
        return created
    }
    return null
}

/* --------------------------------------------------------------- login --- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normaliseEmail = (value) => String(value || '').trim().toLowerCase()

/**
 * Sign in. Rate-limited per address and per client, constant-time, and giving
 * the same answer for every kind of failure.
 *
 * The decoy hash is the part that is easy to leave out: without it, an unknown
 * address returns in a millisecond and a known one takes the ~100ms of a scrypt
 * verification, which is a reliable oracle for whether an address is staff.
 */
export const signIn = async (req, res, { email, password }) => {
    const address = normaliseEmail(email)

    // Both budgets are spent before anything is looked up, so a scripted attack
    // cannot use the endpoint's own work as a timing channel either.
    const perClient = consume(`signin:client:${clientKey(req)}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    const perAddress = consume(
        `signin:user:${createHash('sha256').update(address).digest('hex').slice(0, 32)}`,
        { limit: 5, windowMs: 15 * 60 * 1000 }
    )

    if (!perClient.allowed || !perAddress.allowed) {
        const retryAfter = Math.max(perClient.retryAfter, perAddress.retryAfter)
        res.setHeader('Retry-After', String(retryAfter))
        throw conflict('Příliš mnoho pokusů o přihlášení, zkuste to prosím za chvíli')
    }

    // Before the lookup, so the very first sign-in on a fresh deployment finds
    // the owner it is about to check.
    await ensureBootstrapOwner()

    if (!EMAIL_RE.test(address) || !password) throw unauthorized(SIGN_IN_FAILED)

    const { data, error } = await db()
        .from('cms_user')
        .select('id, email, name, role, password_hash, disabled_at')
        .eq('email', address)
        .maybeSingle()

    if (error) throw serverError('Přihlášení selhalo')

    const stored = data?.password_hash || (await decoyHash())
    const matches = await verifyPassword(password, stored)

    if (!data || !matches || data.disabled_at) throw unauthorized(SIGN_IN_FAILED)

    // Session fixation: a token the caller arrived holding must not survive a
    // successful login, whoever it belonged to.
    const previous = tokenFromCookie(req)
    if (previous) await revokeByTokenHash(digest(previous))

    await issueSession(req, res, data.id)

    await db()
        .from('cms_user')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.id)

    // The one moment the plaintext is in hand and the cost parameters can be
    // raised without anyone noticing. Best-effort — a failure here must not
    // fail the login the user just completed successfully.
    if (needsRehash(stored) && data.password_hash) {
        try {
            await db()
                .from('cms_user')
                .update({ password_hash: await hashPassword(password) })
                .eq('id', data.id)
        } catch {
            /* the old hash still verifies; upgrading is an optimisation */
        }
    }

    // Housekeeping on the one request per day that can afford it.
    db().rpc('cms_prune_sessions').then(
        () => {},
        () => {}
    )

    return { id: data.id, email: data.email, name: data.name || data.email, role: data.role }
}

export const signOut = async (req, res) => {
    const token = tokenFromCookie(req)
    // The cookie is cleared whether or not the row updates. A sign-out that
    // leaves the browser holding a cookie because a database write failed is
    // the wrong failure to pick.
    clearSessionCookie(res)
    if (token) await revokeByTokenHash(digest(token))
}

/**
 * Change your own password. Requires the current one — an unattended logged-in
 * laptop should not be enough to take an account over.
 *
 * Every other session belonging to the user is revoked, and a fresh one is
 * issued for the browser that made the change. "I changed my password because I
 * think someone has it" has to mean something.
 */
export const changeOwnPassword = async (req, res, user, { currentPassword, newPassword }) => {
    const problem = passwordProblem(newPassword)
    if (problem) throw invalid(problem, { newPassword: problem })

    const { data, error } = await db()
        .from('cms_user')
        .select('password_hash')
        .eq('id', user.id)
        .maybeSingle()

    if (error || !data) throw serverError('Změna hesla selhala')

    const matches = await verifyPassword(currentPassword, data.password_hash)
    if (!matches) {
        throw invalid('Současné heslo není správné', { currentPassword: 'Nesprávné heslo' })
    }

    const passwordHash = await hashPassword(newPassword)
    const { error: writeError } = await db()
        .from('cms_user')
        .update({ password_hash: passwordHash })
        .eq('id', user.id)

    if (writeError) throw serverError('Změna hesla selhala')

    await revokeSessionsForUser(user.id)
    await issueSession(req, res, user.id)
}

// Test seam — the memo above is process-wide and a test that seeds twice needs
// to be able to forget.
export const resetBootstrapMemo = () => {
    accountsExist = false
}
