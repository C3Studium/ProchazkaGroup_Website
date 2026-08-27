// Router for /api/cms/*. One catch-all page mounts this; the segments after
// /api/cms select the handler.
//
// Only /reviews and the sign-in half of /auth are reachable without a session.
// Every other branch calls requireUser() or requireOwner() before it does
// anything, and the default is 404 — an unknown path is not quietly handled by
// whichever branch matched loosely.

import { CmsError } from '../errors.js'
import { handleAuth } from './auth.js'
import { handleDocuments } from './documents.js'
import { handleMedia } from './media.js'
import { handleReviews } from './reviews.js'
import { sendError } from './http.js'

export const handleCmsRequest = async (req, res) => {
    const route = req.query.route
    const segments = (Array.isArray(route) ? route : [route]).filter(Boolean)
    const [head, ...rest] = segments

    try {
        switch (head) {
            case 'reviews':
                return await handleReviews(req, res, rest)
            case 'documents':
                return await handleDocuments(req, res, rest)
            case 'media':
                return await handleMedia(req, res, rest)
            case 'auth':
                return await handleAuth(req, res, rest)
            default:
                throw new CmsError('not_found', 'Neznámý endpoint')
        }
    } catch (err) {
        return sendError(res, err)
    }
}

export { handleReviews, handleDocuments, handleMedia, handleAuth }
