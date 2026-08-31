// What the Archive is allowed to claim about a replayed moment.
//
//   GET /api/studio/moment?at=<ISO>&route=/o-nas  ->  200 { at, valid, buildId,
//                                                          buildIdNow, sameBuild,
//                                                          changedAt, reason,
//                                                          revisions, limits }
//
// `getArchiveMoment` is the honest half of ARCHIVE.md's layer 5 and it is a
// server function; the Archive is a browser bundle. This is the one line of
// plumbing between them, and it is a route of its own rather than a field on
// /api/studio/asof for the reason that route already gives about `getPageContent`:
// one call sets a cookie and hands over the page list, this one answers a
// question about the boundary, and a screen asks it again every time the framed
// page changes without wanting to re-issue a cookie each time.
//
// Owner only, checked here, exactly as its two siblings are. Everything it
// returns is a fact about the archive — which deployment was live at T, how many
// revisions stand behind the reconstruction — and the archive belongs to the
// owner (ARCHIVE.md, "Kdo tam smí").
//
// Nothing here can open a moment. It reads; the cookie is issued only by
// /api/studio/asof.

import { requireOwner } from '../auth.js'
import { getArchiveMoment } from '../site/index.js'

// Mirrors the switch in the two sibling routes: with the in-memory dev port
// there is no server-side session to check, so requiring one would make the
// Archive unreachable in the environment it is developed in.
const DEV_PORT = process.env.NEXT_PUBLIC_CMS_DEV_PORT === '1'

export const handleMoment = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ code: 'invalid', message: 'Metoda není povolena, použijte GET' })
    }

    if (!DEV_PORT) {
        try {
            await requireOwner(req, res)
        } catch {
            return res.status(401).json({ code: 'unauthorized', message: 'Archiv je přístupný jen vlastníkovi' })
        }
    }

    const at = Array.isArray(req.query.at) ? req.query.at[0] : req.query.at
    const route = Array.isArray(req.query.route) ? req.query.route[0] : req.query.route

    // `getArchiveMoment` answers `valid: false` for anything it cannot read as
    // an instant rather than throwing, so a malformed parameter produces a
    // screen that says it does not know instead of a 500.
    const moment = await getArchiveMoment({ at, route: route || null })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(moment)
}
