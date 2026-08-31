// Router for /api/cms/*. One catch-all page mounts this; the segments after
// /api/cms select the handler.
//
// Only /reviews, the sign-in half of /auth, /content and the GET half of
// /widget are reachable without a session — /content requires an API key
// instead of one, and /widget returns a corner and a colour (handlers/widget.js
// argues why that is not a hole).
// Every other branch calls requireUser() or requireOwner() before it does
// anything, and the default is 404 — an unknown path is not quietly handled by
// whichever branch matched loosely.

import { CmsError } from '../errors.js'
import { handleArchive } from './archive.js'
import { handleAuth } from './auth.js'
import { handleContent } from './content.js'
import { handleDocuments } from './documents.js'
import { handleMedia } from './media.js'
import { handleReviews } from './reviews.js'
import { handleSettings } from './settings.js'
import { handleStats } from './stats.js'
import { handleReactions } from './reactions.js'
import { handleWidget } from './widget.js'
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
            // Owner-only in full, checked on every request rather than by
            // hiding a menu item — the archive holds everything that was ever
            // published, including what somebody later withdrew.
            case 'archive':
                return await handleArchive(req, res, rest)
            case 'auth':
                return await handleAuth(req, res, rest)
            case 'stats':
                return await handleStats(req, res, rest)
            case 'settings':
                return await handleSettings(req, res, rest)
            // Appearance of the site's own "Spravovat web" widget. GET is
            // public, PUT is owner-only; it is not under /settings so that
            // namespace's "owner before any branch" rule stays exceptionless.
            case 'widget':
                return await handleWidget(req, res, rest)
            // The one branch that is not reached with a session cookie. It
            // authenticates an API key instead, and the port it constructs can
            // read published documents and nothing else — see handlers/content.js.
            case 'content':
                return await handleContent(req, res, rest)
            // Public, like the review form and for the same reason: a visitor
            // has no account. Bounded by the rate limiter and by the unique
            // index in 0012 — see handlers/reactions.js.
            case 'reactions':
                return await handleReactions(req, res, rest)
            default:
                throw new CmsError('not_found', 'Neznámý endpoint')
        }
    } catch (err) {
        return sendError(res, err)
    }
}

export {
    handleReviews, handleDocuments, handleMedia, handleArchive,
    handleAuth, handleSettings, handleWidget, handleContent,
}
