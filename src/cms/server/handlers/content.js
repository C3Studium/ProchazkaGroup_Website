// /api/cms/content/*  — published content, for an outside system holding a key.
//
//   GET /content/documents?type=&search=&page=&perPage=
//   GET /content/documents/:id
//
// This is the ONLY place an API key is accepted, and the shape is the same one
// every other handler uses: resolve the caller first, then construct a port,
// and let the port be the limit of what the caller can do. handlers/documents.js
// calls requireUser() and builds the full Contract 2 adapter; this calls
// requireKey() and builds contentApi.js, which has two read methods on it.
//
// Two things follow from that, and both are structural rather than checks:
//
//   - A session cookie means nothing here. There is no branch that reads one,
//     so an editor's browser gets 401 from this route exactly like a stranger,
//     and this route can never become a second, weaker way into the Studio's
//     data.
//   - A key means nothing anywhere else. requireUser() and requireOwner() read
//     the session cookie and nothing else, so presenting a key to /documents,
//     /media or /auth/users is presenting nothing at all. That is why the
//     answer there is 401 rather than 403: from those routes' point of view
//     nobody signed in.

import { GET_ONLY, requireKey } from './apiKeyAuth.js'
import { createContentReadPort } from '../contentApi.js'
import { methodNotAllowed, sendJson } from './http.js'
import { notFound } from '../errors.js'

export const handleContent = async (req, res, segments) => {
    if (!GET_ONLY.includes(req.method)) return methodNotAllowed(res, GET_ONLY)

    // Before the port exists, as everywhere else in this server. The principal
    // is deliberately not echoed back in a header: key names are typed by a
    // person and this project's are Czech, and a header value outside latin-1
    // makes Node throw ERR_INVALID_CHAR — a 500 on a working request, to tell
    // the caller something it already knows.
    await requireKey(req, res)
    const port = createContentReadPort()

    const [collection, id] = segments

    if (collection !== 'documents') throw notFound('Neznámý endpoint obsahu')

    if (!id) {
        const { type, search, page, perPage } = req.query
        return sendJson(res, 200, await port.list({ type, search, page, perPage }))
    }

    return sendJson(res, 200, await port.get({ id }))
}
