// POST /api/cms/reviews — public review submission.
//
// This route replaces the browser-side insert in src/hooks/useReviewForm.js,
// which today writes to the reviews table with the anon key. That path stays
// working until someone cuts over deliberately; nothing here touches it.
//
// What changes when it is cut over:
//
//   - No write-capable key in the browser. The submission is a POST to this
//     handler and the database write happens with the service role.
//   - The submitted body is not the stored body. Fields are copied one at a
//     time from a whitelist (buildReviewBody), so a client that sends
//     `approved: true`, `likes: 9999`, `status: "published"` or an extra column
//     gets none of it.
//   - The review lands as a DRAFT. Draft rows are invisible to the anon key by
//     RLS, so unmoderated text from the internet is never publicly readable.
//     An editor approving it in the Studio is what publishes it.
//   - Rate limited per client.
//   - No IP is recorded. The legacy table has ip_list/list_of_all_ips; this
//     build takes the position that there is no stated lawful basis for them,
//     and a replacement route that started collecting them again would make
//     that position meaningless.
//   - No email is recorded. The current form collects one and the live table
//     has no column for it. Adding one here would be worse than the status quo:
//     `data` is world-readable for published documents, so an approved review
//     would publish the submitter's address.

import { consultantFullName } from '@/cms/schemas/consultant'

import { createSupabaseDataPort } from '../adapter.js'
import { conflict, invalid } from '../errors.js'
import { assertValid } from '../validation.js'
import { clientKey, consume } from '../rateLimit.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

const REVIEW_BODY_LIMIT = 16 * 1024
const RATE = { limit: 3, windowMs: 60 * 60 * 1000 }

const HASHTAGS = new Set(['poradce', 'benefitprogram'])

const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/**
 * Whitelist, normalise, and stamp the server-owned fields. Pure — no client,
 * no clock beyond the injected `now`, so it can be asserted on directly.
 *
 * Everything not named here is discarded. That is the mechanism by which the
 * client is not trusted on `approved`: there is no path from request body to
 * stored body except through this function.
 */
export const buildReviewBody = (input, { now = new Date() } = {}) => {
    const body = input && typeof input === 'object' ? input : {}

    const customerName = text(body.customerName ?? body.customer_name, 120)
    const consultantName = text(body.consultantName ?? body.consultant_name, 120)
    const message = text(body.message, 2000)

    const requested = String(body.hashtag ?? body.reviewType ?? '').trim().toLowerCase()
    // The legacy hook derives the hashtag from the consultant name rather than
    // trusting the form; same rule here, with the client's value only used when
    // it is one of the two known values.
    const hashtag = consultantName.toLowerCase() === 'benefit program'
        ? 'benefitprogram'
        : (HASHTAGS.has(requested) ? requested : 'poradce')

    return {
        customerName,
        consultantName,
        message,
        hashtag,
        // Server-owned from here down. Present in the stored body so the shape
        // matches a migrated review exactly, and set here so no request can
        // influence them.
        approved: false,
        likes: 0,
        source: 'web',
        submittedAt: now.toISOString(),
    }
}

/** Case- and diacritic-sensitive is fine; whitespace and case are not. */
const nameKey = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Is this the name of a consultant we publish? Compared both with and without
 * the academic title, because the submitted string comes from a form that may
 * have been filled in either way.
 */
const isKnownConsultant = async (port, submitted) => {
    const wanted = nameKey(submitted)
    if (!wanted) return false

    const { rows } = await port.publicRead.list({ type: 'consultant', perPage: 100 })

    return rows.some((row) => {
        const body = row?.data || {}
        return (
            wanted === nameKey(consultantFullName(body)) ||
            wanted === nameKey(`${body.firstName ?? ''} ${body.lastName ?? ''}`)
        )
    })
}

export const handleReviews = async (req, res) => {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

    const gate = consume(`review:${clientKey(req)}`, RATE)
    if (!gate.allowed) {
        res.setHeader('Retry-After', String(gate.retryAfter))
        throw conflict('Recenzi jste už odeslali. Zkuste to prosím později.')
    }

    const submitted = await readJson(req, REVIEW_BODY_LIMIT)

    // Honeypot. A field no human sees and no real form fills. Answered with the
    // same 202 as a real submission so a bot learns nothing from the response.
    if (String(submitted.website || '').trim()) {
        return sendJson(res, 202, { ok: true })
    }

    const data = buildReviewBody(submitted)

    // Schema validation is the core's job (Contract 1), not a second set of
    // rules written here — required fields, lengths and formats all come from
    // src/cms/schemas/review.js and stay in one place.
    assertValid('review', data)

    const port = createSupabaseDataPort({ user: null })

    // The consultant has to be one we actually publish. Without this, the
    // dropdown is only a suggestion and the reviews list fills with names that
    // match nothing.
    //
    // This was a single-column probe on `data.name` until the name became three
    // fields. There is no column to probe now — the display name is composed —
    // so the published set is listed and composed the same way the site
    // composes it. That is a read of at most a few dozen rows and it buys two
    // things the probe did not have: an archived consultant stops accepting new
    // reviews the moment they are archived (listPublished excludes them), and
    // the comparison can ignore the academic title, so a form that submits
    // "Václav Procházka" for "Mgr. Václav Procházka" is accepted rather than
    // rejected for a prefix nobody typed.
    if (!(await isKnownConsultant(port, data.consultantName))) {
        throw invalid('Vybraný poradce neexistuje', [
            { path: 'consultantName', message: 'Neznámý poradce' },
        ])
    }

    await port.documents.create({ type: 'review', data, status: 'draft' })

    // 202, and no document id in the response: the submitter has no business
    // knowing the identifier of a row they cannot read.
    return sendJson(res, 202, { ok: true, message: 'Děkujeme za váš názor!' })
}
