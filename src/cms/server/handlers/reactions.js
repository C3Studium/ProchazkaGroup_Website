/**
 * /api/cms/reactions — „líbí se" od návštěvníka.
 *
 * The second branch under /api/cms reached WITHOUT a session, and the
 * comparison worth making is with the first: `/reviews` takes a review from the
 * public and queues it for a human. This takes a click and moves a number.
 * Neither trusts the caller; both are rate limited by the same fingerprint, and
 * this one is additionally bounded by the unique index in migrations/0012 — a
 * visitor cannot vote twice however many requests they send.
 *
 *   GET     which of the given ids this visitor has voted for, and the counts
 *   POST    vote
 *   DELETE  take the vote back
 *
 * What it deliberately does NOT do is take a count from the client. A number the
 * browser can send is a number anybody can send.
 */
import { invalid } from '../errors.js'
import { clientKey, consume } from '../rateLimit.js'
import { assertTarget, fingerprint, likedAmong, react, totalsFor, unreact } from '../reactions.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

// Generous, because a reader going down the wall and agreeing with eight
// reviews is doing the thing this is for. It is a brake on a script, not on a
// person: the unique index is what stops the same visitor counting twice.
const RATE = { limit: 120, windowMs: 60 * 60 * 1000 }

const MAX_IDS = 200

export const handleReactions = async (req, res) => {
    const client = clientKey(req)

    // GET is not rate limited. It is the state a page needs to render its
    // buttons correctly, and refusing it would leave a reader looking at a
    // button that says they have not voted when they have — which invites the
    // second click this whole design exists to prevent.
    if (req.method === 'GET') {
        const targetType = assertTarget(String(req.query.type || ''))
        const ids = String(req.query.ids || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, MAX_IDS)

        const [liked, counts] = await Promise.all([
            likedAmong(targetType, ids, (id) => fingerprint(client, targetType, id)),
            // Totals, not vote counts: the same number the card was rendered
            // with, so the browser swaps one for the other instead of doing
            // arithmetic against a baseline it cannot see.
            totalsFor(targetType, ids),
        ])

        return sendJson(res, 200, { liked, counts })
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return methodNotAllowed(res, ['GET', 'POST', 'DELETE'])
    }

    const gate = consume(`reaction:${client}`, RATE)
    if (!gate.allowed) {
        res.setHeader('Retry-After', String(gate.retryAfter))
        throw invalid('Příliš mnoho hlasů z jednoho místa, zkuste to prosím za chvíli')
    }

    const body = await readJson(req)
    const targetType = assertTarget(String(body?.type || ''))
    const targetId = String(body?.id || '')

    // The fingerprint is per target on purpose — see reactions.js. One visitor
    // liking twelve reviews leaves twelve unrelated rows rather than a trail
    // that says which twelve.
    const ipHash = fingerprint(client, targetType, targetId)

    if (req.method === 'DELETE') {
        const { count } = await unreact({ targetType, targetId, ipHash, clientHash: client })
        return sendJson(res, 200, { ok: true, liked: false, count })
    }

    const { already, count } = await react({ targetType, targetId, ipHash, clientHash: client })

    // 200 either way. "You have already voted" is the system working, and a
    // 409 would make the browser's fetch look like a failure to a reader who
    // did nothing wrong.
    return sendJson(res, 200, { ok: true, liked: true, already, count })
}
