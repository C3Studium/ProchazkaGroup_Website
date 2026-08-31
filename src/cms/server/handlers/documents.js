// Studio document operations. Every route here requires a signed-in user,
// checked before a port is constructed. Both roles edit content; only user
// management is owner-only, and that lives in handlers/auth.js.

import { requireUser } from '../auth.js'
import { createSupabaseDataPort } from '../adapter.js'
import { publishedBody, revalidateForDocuments } from '../revalidate.js'
import { jsonParam, methodNotAllowed, readJson, sendJson } from './http.js'
import { sendUpdateNotice } from '../mail.js'
import { findType } from '../validation.js'

/**
 * The transitions that change what a visitor sees, and nothing else in this
 * file does.
 *
 * `patchField` and `update` write `draft` and only `draft` (see adapter.js,
 * which spells out why `data` is unreachable from them), so a visual edit or a
 * saved form changes nothing public and must not regenerate a single page. That
 * is not a policy applied here — it is a property of those methods — and this
 * list is where the two halves meet.
 *
 * It is now also where the archive is written. Same transitions, same argument:
 * a revision records what the public could see, so the set of moments worth
 * recording is exactly the set of moments worth regenerating. A draft write
 * writes no revision for the same reason it regenerates no page.
 *
 * `reject` and `requeue` joined the original four rather than growing a route of
 * their own (migrations/0008). A rejection archives, which is a moment a
 * visitor's page can change; putting it anywhere else would mean a second place
 * to remember revalidation and a second place to remember the revision.
 */
/**
 * Jak se dokument jmenuje v e-mailu.
 *
 * Typ si sám umí udělat náhled (`preview` v core/defineType), takže se nevymýšlí
 * druhé pravidlo — jen se sáhne po tom, co Studio ukazuje ve svém seznamu.
 */
const previewTitleOf = (document) => {
    try {
        const type = findType(document?.type)
        const body = document?.data ?? document?.draft ?? {}
        return type?.preview?.(body)?.title || body.title || body.key || ''
    } catch {
        return ''
    }
}

const TRANSITIONS = new Set(['publish', 'unpublish', 'archive', 'restore', 'reject', 'requeue'])

/**
 * Append the transition to the archive, and never let that fail the transition.
 *
 * The failure mode is chosen rather than inherited. A publish that has already
 * happened, answering 500 because the history write lost a race, is worse than
 * no history at all: the editor reads the error, presses Publikovat again, and
 * the second press is a second publish of a document that was already out. So
 * this swallows, logs and reports — exactly the posture revalidate.js takes one
 * line below, and for the same reason.
 *
 * What the caller sees when it fails: HTTP 200, the document, and
 * `revision: { ok: false, error }` beside `revalidation`. The publish succeeded
 * and says so; the hole in the archive is named in the response and in the
 * server log rather than being silent.
 */
const recordRevision = async (port, document, reason, at) => {
    try {
        const revision = await port.revisions.record({
            document,
            reason,
            at: new Date(at).toISOString(),
        })
        return { ok: true, id: revision.id, reason: revision.reason, buildId: revision.buildId }
    } catch (error) {
        const message = String(error?.message || error)
        console.warn(
            `[cms] archiv: revize k dokumentu ${document?.id} (${reason}) se nezapsala — ${message}`
        )
        return { ok: false, reason, error: message }
    }
}

export const handleDocuments = async (req, res, segments) => {
    const user = await requireUser(req, res)
    const port = createSupabaseDataPort({ user, req, res })

    const [id, action] = segments

    // /documents
    if (!id) {
        if (req.method === 'GET') {
            const { type, search, page, perPage } = req.query
            const result = await port.list({
                type,
                search,
                filters: jsonParam(req.query.filters, {}),
                sort: jsonParam(req.query.sort, undefined),
                page,
                perPage,
                // Tri-state, and it arrives as a string. Anything that is not
                // one of the two opt-ins means "live documents only", so a
                // malformed query parameter cannot surface the archive.
                archived: req.query.archived === 'all' ? 'all' : req.query.archived === '1',
            })
            return sendJson(res, 200, result)
        }
        if (req.method === 'POST') {
            const body = await readJson(req)
            const doc = await port.create({ type: body.type, data: body.data })
            return sendJson(res, 201, doc)
        }
        return methodNotAllowed(res, ['GET', 'POST'])
    }

    // /documents/:id/field — one field of the draft, from the visual editor.
    //
    // PATCH, and the method is the point: every sibling below is a transition
    // ("publish this"), this one is a partial update of the resource, and it is
    // the only route in the CMS that writes a document without being handed the
    // whole body. Sitting it next to them under the same `:id` keeps one
    // authorisation decision — requireUser() above — for everything that can
    // change a document.
    if (action === 'field') {
        if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH'])
        const body = await readJson(req)
        // `value` may legitimately be null (clearing an image), so its presence
        // is checked rather than its truthiness. `field` may not be empty.
        return sendJson(res, 200, await port.patchField({
            id,
            field: body.field,
            value: body.value === undefined ? null : body.value,
        }))
    }

    // /documents/:id/draft — throw the draft away, DELETE because that is what
    // it is: the removal of a sub-resource of the document, not a transition of
    // it. Two things follow from the shape and both are the point.
    //
    // It cannot be confused with taking the page down. `unpublish` is a POST to
    // its own segment; this is a DELETE of `draft`, and no typo turns one into
    // the other. It cannot be confused with deleting the document either — that
    // is DELETE on `:id`, one segment shorter, and the segment is the difference
    // between "lose the unpublished edits" and "lose everything".
    //
    // It is here beside `field` rather than in TRANSITIONS below because it is
    // the same kind of write: `draft` and nothing else. So it records no
    // revision and regenerates no page — not an exemption from the rule at the
    // top of this file, an instance of it. A draft never reached the public, so
    // there is no moment for the archive to record and no page to re-render.
    if (action === 'draft') {
        if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE'])
        return sendJson(res, 200, await port.discardDraft({ id }))
    }

    // /documents/:id/publish | unpublish | archive | restore | reject | requeue
    //
    // Archive, restore, reject and requeue are POSTs like the first two rather
    // than a PATCH of `archived_at`, because they are transitions the server
    // owns: the client says what should happen, never what the timestamp should
    // be — and for `reject`, never who made the decision either.
    //
    // All six are moments the public site can go stale, so all six regenerate
    // the pages they are on before answering. The answer carries a
    // `revalidation` report beside the document, because the Studio's next act
    // is to print a sentence about the web and it must not print one this server
    // cannot stand behind. See ../revalidate.js.
    if (action) {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        if (!TRANSITIONS.has(action)) return methodNotAllowed(res, ['POST'])

        // The document as the public last saw it, read BEFORE the transition. A
        // consultant whose slug changed leaves a page at the old address, and
        // the old address exists in exactly one place: the body this call is
        // about to overwrite. Read rather than reasoned about, because "which
        // fields can move a page" is a question that grows a case a year.
        // Failure is not fatal — the after-body still names most of the routes.
        const before = await port.get({ id }).catch(() => null)
        // The one transition that takes an argument. `reason` is the closed set
        // in schemas/review.js and the adapter refuses anything else, so it is
        // read here and validated there rather than being checked twice with two
        // chances to disagree. readJson answers {} for the other five, which
        // send no body at all.
        const payload = action === 'reject' ? { reason: (await readJson(req)).reason } : {}
        const document = await port[action]({ id, ...payload })
        // The instant the change is in the store, which is what decides whether
        // an already-running render can be waited for instead of a new one.
        const at = Date.now()
        // Before the revalidation, not after. Regenerating pages takes seconds
        // and can be interrupted by a deploy or a cold instance; the record of
        // what changed must be on disk before anything slow happens, because it
        // is the one thing that cannot be recomputed afterwards — `data` has
        // already been overwritten by the line above.
        // A transition that did not change anything gets neither. `unchanged`
        // is set by publish() when the body it was asked to publish is already
        // the published one — see server/documents.js for why that is answered
        // quietly rather than refused. Recording it would put a duplicate row
        // in the archive, and revalidating would spend seconds regenerating
        // pages to the bytes they already have.
        if (document.unchanged) {
            return sendJson(res, 200, {
                ...document,
                revalidation: { ok: true, skipped: 'beze změny', paths: [] },
                revision: { ok: true, skipped: 'beze změny' },
            })
        }

        const revision = await recordRevision(port, document, action, at)
        const revalidation = await revalidateForDocuments(
            req,
            res,
            [publishedBody(before), publishedBody(document)],
            { at },
        )

        /**
         * Publikování je jediná akce, kterou uvidí veřejnost — správce a
         * majitel se o ní mají dozvědět, aniž by museli chodit do Studia se
         * dívat. Až po revalidaci: než e-mail dorazí, ať už je změna na webu.
         *
         * Jen `publish`, a jen když se opravdu něco změnilo — stisk, který nic
         * nezměnil, se vrací výš s `unchanged` a sem nedojde.
         *
         * Nikdy nevyhodí výjimku: publikace už proběhla a je vidět, takže
         * selhání pošty nesmí vypadat jako selhání publikace.
         */
        if (action === 'publish') {
            const type = findType(document.type)
            await sendUpdateNotice({
                what: previewTitleOf(document),
                typeTitle: type?.title || document.type,
                who: user?.name || user?.email || '',
                actorEmail: user?.email || '',
                pages: revalidation?.paths || [],
            })
        }

        return sendJson(res, 200, { ...document, revalidation, revision })
    }

    // /documents/:id
    switch (req.method) {
        case 'GET':
            return sendJson(res, 200, await port.get({ id }))
        // `baseVersion` is the document's `updatedAt` as the client last saw it.
        // In the JSON body beside `data` rather than in an `If-Match` header,
        // because it is an argument of the port method and the port has three
        // implementations, only one of which speaks HTTP (adapter.js says it in
        // full). Absent means "I have no version to name" and keeps the old
        // meaning; it is not defaulted to anything, because a version the server
        // invented would be a check that always passes.
        case 'PUT': {
            const body = await readJson(req)
            return sendJson(res, 200, await port.update({
                id, data: body.data, baseVersion: body.baseVersion ?? null,
            }))
        }
        case 'DELETE':
            await port.remove({ id })
            return sendJson(res, 204)
        default:
            return methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
    }
}
