// The editing view's session, opened and closed.
//
//   GET /api/studio/edit?session=open   -> draft cookie on,  200 { pages }
//   GET /api/studio/edit?session=close  -> draft cookie off, 204
//
// Two jobs in one endpoint because they are one moment. /studio/edit cannot frame
// anything useful until both have happened: the framed page reads the *draft*
// (`editable()` only emits attributes for a block that carries an id, and only
// the draft reader attaches one — see src/cms/server/site/homepage.js), and the
// page picker cannot list the site's routes because they are read off the
// filesystem and the Studio is a browser bundle. So the view asks once, waits for
// the answer, and only then points the iframe anywhere.
//
// Why this is a fetch when /api/studio/preview is deliberately a redirect. That
// route sets the cookie for a page whose own getStaticProps then reads it, so the
// cookie has to exist before the document request that carries it — and the only
// way to guarantee that ordering is to make the navigation itself the thing that
// sets it. Nothing is server-rendered here: /studio/edit is inside the Studio's
// client-only catch-all and renders no site content of its own. The ordering that
// matters is "cookie before the *iframe's* first document request", and awaiting
// this response before setting `src` is exactly that guarantee, obtained without
// reloading the whole admin underneath the editor.
//
// Closing is best-effort by construction — a tab that is killed cannot send
// anything — which is the same standing as /studio/preview, where an editor who
// closes the tab instead of using "Zpět do Studia" also leaves the cookie set.
// The cost of a stale draft cookie is that this browser stops being served the
// cached copy of the site's ISR pages; it is not a permission.
//
// The session check is the boundary, exactly as on the sibling route: the draft
// cookie is what lets a request read unpublished content, so issuing it is a
// privileged act and is refused to anyone without a Studio session.

import { requireUser } from '../auth.js'
import { listSitePages } from '../pages.js'

// Mirrors the switch in src/pages/studio/[[...path]].jsx and in the sibling
// preview route. With the in-memory dev port there is no server-side session to
// check — the Studio's documents live in the browser — so requiring one here
// would make editing unreachable in the exact environment it is developed in.
const DEV_PORT = process.env.NEXT_PUBLIC_CMS_DEV_PORT === '1'

export const handleEdit = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ code: 'invalid', message: 'Metoda není povolena, použijte GET' })
    }

    if (!DEV_PORT) {
        try {
            await requireUser(req, res)
        } catch {
            // JSON here, unlike the preview route's redirect: this is an XHR from
            // a screen that is already mounted, and the caller turns the code into
            // a message on the stage rather than a blank tab.
            return res.status(401).json({ code: 'unauthorized', message: 'Přihlaste se prosím znovu' })
        }
    }

    // Anything that is not the word "open" closes. A malformed parameter must not
    // be able to hand out the draft cookie.
    const open = String(req.query.session || '') === 'open'
    res.setDraftMode({ enable: open })

    if (!open) return res.status(204).end()

    // Read off src/pages, never typed out — see src/cms/server/pages.js. The
    // response is per-editor and carries a cookie, so it must not be cached by
    // anything in front of it.
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ pages: listSitePages() })
}
