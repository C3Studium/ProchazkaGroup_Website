// The Archive's moment, opened and closed.
//
//   GET /api/studio/asof?at=2026-03-03T09:12:00.000Z  -> moment cookie on,  200 { at, pages }
//   GET /api/studio/asof?session=close                -> moment cookie off, 204
//
// The third door beside /api/studio/preview and /api/studio/edit, and the same
// mechanism as both: Next's preview cookie. The difference is that this one
// carries a PAYLOAD — the instant being replayed — which is why it calls
// `setPreviewData` where its siblings call `setDraftMode`. Draft mode is preview
// mode with an empty payload; the two are one cookie and one code path in the
// framework (next/dist/server/api-utils), so a page reads both through the same
// `viewOf(context)`.
//
// ---------------------------------------------------------------------------
// Why the moment is a cookie and not a query parameter
// ---------------------------------------------------------------------------
//
// Because the pages it has to reach are the site's own public URLs. The Archive
// frames /o-nas as /o-nas, for the reason src/cms/preview/frame.js measured and
// wrote down: a page served from a mirrored address renders its navigation
// differently from the site. A `?asof=` on those URLs would therefore be a
// parameter any visitor could type, and the archive reader — which answers with
// bodies that were withdrawn, superseded or never meant to be seen again — is
// exactly the thing that must not be reachable that way.
//
// Next's preview data is signed and encrypted with per-deployment keys, so the
// value cannot be forged, and it is only ever issued here. There is nothing to
// type. That is one step stronger than the draft-mode guarantee `index.js`
// keeps by calling `getHomepageContent()` with no arguments, and it is the
// reason the Archive needs no mirrored routes of its own.
//
// A fetch rather than a redirect, on /api/studio/edit's terms exactly: nothing
// is server-rendered by the caller — /studio/archive is inside the Studio's
// client-only catch-all — and the ordering that matters is "cookie before the
// IFRAME's first document request", which awaiting this response gives without
// reloading the admin underneath the person using it.
//
// Owner, not editor. ARCHIVE.md ("Kdo tam smí") is explicit: the archive holds
// everything that was ever published, including what somebody later took down,
// so it is the owner's and the server checks it on every request rather than
// hiding a menu item.

import { requireOwner } from '../auth.js'
import { listSitePages } from '../pages.js'
import { momentOf } from '../site/index.js'

// Mirrors the switch in src/pages/studio/[[...path]].jsx and in both sibling
// routes. With the in-memory dev port there is no server-side session to check —
// the Studio's documents live in the browser — so requiring one here would make
// the Archive unreachable in the exact environment it is developed in.
const DEV_PORT = process.env.NEXT_PUBLIC_CMS_DEV_PORT === '1'

export const handleAsof = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ code: 'invalid', message: 'Metoda není povolena, použijte GET' })
    }

    if (!DEV_PORT) {
        try {
            await requireOwner(req, res)
        } catch {
            // JSON rather than a redirect, unlike /api/studio/preview: this is an
            // XHR from a screen that is already mounted, and the caller turns the
            // code into a message on the stage rather than a blank tab.
            return res.status(401).json({ code: 'unauthorized', message: 'Archiv je přístupný jen vlastníkovi' })
        }
    }

    // Anything that is not a readable instant closes. A malformed parameter must
    // not be able to open a moment, because a moment that fell back to "now"
    // would put today's site under yesterday's date — the one failure ARCHIVE.md
    // opens by naming.
    const at = String(req.query.session || '') === 'close' ? null : momentOf(req.query.at)

    if (!at) {
        // `clearPreviewData` and not `setDraftMode({ enable: false })`: this
        // cookie has two halves and only the former removes both. Leaving the
        // payload behind would leave every page on this browser rendering a
        // moment nobody asked for any more.
        res.clearPreviewData()
        if (String(req.query.session || '') === 'close') return res.status(204).end()
        return res.status(400).json({ code: 'invalid', message: 'Chybí nebo je neplatný okamžik "at"' })
    }

    res.setPreviewData({ at })

    // Read off src/pages, never typed out — see src/cms/server/pages.js. The
    // Archive needs the same list the editing view does, for the same reason:
    // the routes are a fact about the filesystem and the Studio is a browser
    // bundle. The response is per-request and carries a cookie, so nothing in
    // front of it may cache it.
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ at, pages: listSitePages() })
}
