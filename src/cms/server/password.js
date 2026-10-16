// Password hashing. scrypt, from node:crypto, no dependency.
//
// Argon2id is the better primitive in the abstract. It also needs a native
// module, which on Vercel means a build step that can break on a Node bump for
// a difference that does not decide this system's security — the threat here is
// an offline crack of a leaked table, and scrypt at these parameters costs an
// attacker 32 MiB of memory per guess. It is what Medusa v2 uses and it is in
// the standard library.
//
// The stored string carries its own parameters:
//
//     scrypt$N$r$p$salt$hash
//
// so N can be raised later without invalidating a single existing hash —
// verification reads the cost the hash was made with, not the cost configured
// today. `needsRehash()` says which ones are behind, and the natural moment to
// upgrade one is the next successful sign-in, when the plaintext is in hand.
//
// Salt and hash are base64url: it survives a URL, a JSON string and a psql
// paste without escaping, and the migration's format check is written against
// that alphabet.

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

// N=2^15 with r=8 is 32 MiB per hash. The default maxmem in node:crypto is
// 32 MiB, which this sits exactly on top of, so maxmem is raised rather than
// left to fail on an off-by-one.
export const SCRYPT_PARAMS = Object.freeze({ N: 32768, r: 8, p: 1, saltBytes: 16, keyBytes: 64 })

const MAXMEM = 256 * 1024 * 1024

const b64 = (buffer) => buffer.toString('base64url')

const derive = (password, salt, { N, r, p, keyBytes }) =>
    scryptAsync(
        // Normalised so that a password typed with a composed accent and one
        // typed with a combining accent are the same password. Czech staff will
        // have accented characters in passwords, and macOS and Windows disagree
        // about how to encode them.
        String(password).normalize('NFKC'),
        salt,
        keyBytes,
        { N, r, p, maxmem: MAXMEM }
    )

/**
 * Hash a password into the storage format. Never logs, never returns the
 * plaintext, and generates a fresh salt every time — two people with the same
 * password get different hashes, which is the whole point of a salt.
 */
export const hashPassword = async (password) => {
    const { N, r, p, saltBytes, keyBytes } = SCRYPT_PARAMS
    const salt = randomBytes(saltBytes)
    const key = await derive(password, salt, { N, r, p, keyBytes })
    return `scrypt$${N}$${r}$${p}$${b64(salt)}$${b64(key)}`
}

const parse = (stored) => {
    const parts = String(stored || '').split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return null

    const [, N, r, p, salt, hash] = parts
    const params = { N: Number(N), r: Number(r), p: Number(p) }
    if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) return null
    // A hostile hash string could otherwise ask this process to allocate
    // gigabytes. The stored value comes from our own table, but a parser that
    // trusts its input because of where it came from is one refactor away from
    // being wrong.
    if (params.N < 2 || params.N > 1 << 20 || params.r < 1 || params.r > 32 || params.p < 1 || params.p > 16) return null

    try {
        return { ...params, salt: Buffer.from(salt, 'base64url'), key: Buffer.from(hash, 'base64url') }
    } catch {
        return null
    }
}

/**
 * Verify a password against a stored hash. Returns a boolean and never throws
 * for a bad hash — an unparseable row is a failed login, not a 500 that tells
 * the caller something about the row.
 *
 * The comparison is timingSafeEqual. The length check in front of it leaks the
 * key length, which is a constant of the format and not a secret.
 */
export const verifyPassword = async (password, stored) => {
    const parsed = parse(stored)
    if (!parsed) return false

    const candidate = await derive(password, parsed.salt, { ...parsed, keyBytes: parsed.key.length })
    if (candidate.length !== parsed.key.length) return false
    return timingSafeEqual(candidate, parsed.key)
}

/** True when the stored hash was made with weaker parameters than today's. */
export const needsRehash = (stored) => {
    const parsed = parse(stored)
    if (!parsed) return true
    return parsed.N < SCRYPT_PARAMS.N || parsed.r < SCRYPT_PARAMS.r || parsed.p < SCRYPT_PARAMS.p
}

/**
 * A hash of the right shape over a value nobody knows, used to spend the same
 * scrypt time on an unknown address as on a known one. Built once per process:
 * generating it per request would itself be a timing signal.
 *
 * See auth.js — sign-in must take the same time whether or not the address
 * exists, or the endpoint becomes a directory of who works here.
 */
let decoy = null
export const decoyHash = async () => {
    if (!decoy) decoy = await hashPassword(randomBytes(32).toString('base64url'))
    return decoy
}

// Not a policy engine. One rule, stated once, applied to the bootstrap
// password, an invited user's password and a self-service change alike — a
// minimum length is the only password rule with evidence behind it, and
// composition rules mostly produce Heslo123!.
export const MIN_PASSWORD_LENGTH = 10

export const passwordProblem = (password) => {
    const value = String(password ?? '')
    if (value.length < MIN_PASSWORD_LENGTH) return `Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků`
    if (value.length > 512) return 'Heslo je příliš dlouhé'
    return null
}

/**
 * A password for an invited account. base64url of 18 random bytes: 144 bits,
 * no ambiguous-character problem because nobody retypes it from paper — the
 * owner copies it out of the dialog and sends it to the person, who changes it.
 */
export const generatePassword = () => randomBytes(18).toString('base64url')
