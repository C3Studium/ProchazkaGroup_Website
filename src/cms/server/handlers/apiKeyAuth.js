// Turning a presented API key into a principal, and refusing everything else.
//
// Its own module rather than a function inside handlers/content.js so that the
// import graph says what the design says: exactly one handler imports this, and
// grepping for it is how you find every route a key can reach.

import { conflict, unauthorized } from '../errors.js'
import { resolveApiKey } from '../apiKeys.js'
import { clientKey, consume } from '../rateLimit.js'

export const GET_ONLY = ['GET', 'HEAD']

// Two budgets, and they answer different things.
//
// The first caps how often one client may ask at all. A 32-byte token is not
// going to be guessed at any rate — this exists so a broken integration in a
// retry loop cannot occupy the process.
//
// The second is spent only on FAILURES, so a working integration polling every
// second never touches it while somebody trying keys is answered with a
// throttle after twenty wrong ones. Rate limiting is not what makes the token
// unguessable; it is what keeps a wrong one cheap to refuse.
const RATE = { limit: 300, windowMs: 60 * 1000 }
const FAILURES = { limit: 20, windowMs: 15 * 60 * 1000 }

const presented = (req) => {
    const header = req.headers['x-cms-api-key']
    if (header) return Array.isArray(header) ? header[0] : header

    const authorization = String(req.headers.authorization || '')
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
    return match ? match[1].trim() : ''
}

/**
 * @returns {{ id: string, name: string }} — not a user, and deliberately not
 * shaped like one. Nothing else in this server accepts this object.
 */
export const requireKey = async (req, res = null) => {
    const client = clientKey(req)

    const rate = consume(`content:rate:${client}`, RATE)
    if (!rate.allowed) {
        if (res) res.setHeader('Retry-After', String(rate.retryAfter))
        throw conflict('Příliš mnoho požadavků, zkuste to prosím za chvíli')
    }

    // The same answer for a missing key, a malformed one and a revoked one.
    // Distinguishing them tells a caller which half of their guess was right.
    const refuse = () => {
        const budget = consume(`content:fail:${client}`, FAILURES)
        if (!budget.allowed) {
            if (res) res.setHeader('Retry-After', String(budget.retryAfter))
            return conflict('Příliš mnoho neplatných klíčů, zkuste to prosím za chvíli')
        }
        return unauthorized('Chybí nebo neplatí API klíč')
    }

    const token = presented(req)
    if (!token) throw refuse()

    const principal = await resolveApiKey(token)
    if (!principal) throw refuse()

    return principal
}
