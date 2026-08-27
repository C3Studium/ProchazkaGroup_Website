// Studio document operations. Every route here requires a signed-in user,
// checked before a port is constructed. Both roles edit content; only user
// management is owner-only, and that lives in handlers/auth.js.

import { requireUser } from '../auth.js'
import { createSupabaseDataPort } from '../adapter.js'
import { jsonParam, methodNotAllowed, readJson, sendJson } from './http.js'

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

    // /documents/:id/publish | unpublish | archive | restore
    //
    // Archive and restore are POSTs like the other two rather than a PATCH of
    // `archived_at`, because they are transitions the server owns: the client
    // says what should happen, never what the timestamp should be.
    if (action) {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        if (action === 'publish') return sendJson(res, 200, await port.publish({ id }))
        if (action === 'unpublish') return sendJson(res, 200, await port.unpublish({ id }))
        if (action === 'archive') return sendJson(res, 200, await port.archive({ id }))
        if (action === 'restore') return sendJson(res, 200, await port.restore({ id }))
        return methodNotAllowed(res, ['POST'])
    }

    // /documents/:id
    switch (req.method) {
        case 'GET':
            return sendJson(res, 200, await port.get({ id }))
        case 'PUT': {
            const body = await readJson(req)
            return sendJson(res, 200, await port.update({ id, data: body.data }))
        }
        case 'DELETE':
            await port.remove({ id })
            return sendJson(res, 204)
        default:
            return methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
    }
}
