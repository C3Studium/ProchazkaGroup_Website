// The Studio preview's front door.
//
//   GET /api/studio/preview?mode=draft      -> draft cookie on,  307 to the preview
//   GET /api/studio/preview?mode=published  -> draft cookie off, 307 to the preview
//   GET /api/studio/preview?mode=off        -> draft cookie off, 307 back to the Studio
//
// Leaving is on this route rather than being an ordinary link back to /studio
// because leaving is when the cookie has to be cleared. A browser that keeps a
// draft-mode cookie is a browser that stops being served the cached copy of
// every ISR page on the site, so an editor who previewed once in March gets an
// on-demand render of the public homepage until the cookie expires.
//
// This is Next's Draft Mode, used the way Pages Router intends: the route sets
// the signed bypass cookie, redirects, and from then on `getStaticProps` on
// /studio/preview is invoked per request with `context.draftMode === true`. The
// preview is therefore the real page with real props rather than a second
// rendering of the homepage that would drift from the first one the week after
// it was written.
//
// Three deliberate choices.
//
// A GET that redirects, not a fetch. Draft mode is a cookie, and a cookie set by
// XHR is only reliably applied to the *next* document request; making the
// navigation itself the thing that sets it removes the ordering problem
// entirely. It also means the panel's mode switch and the sidebar's preview
// entry are ordinary links — middle-clickable, keyboard-operable, and working
// with JavaScript disabled.
//
// The redirect target is built here, never taken from the query. A route that
// sets a privileged cookie and then forwards to a caller-supplied URL is an open
// redirect with a credential attached; the only thing the caller may influence
// is which document the panel points back at, and that is pattern-checked below.
//
// The session check is the boundary. The draft cookie is what lets a request
// read unpublished content, so issuing it is a privileged act and is refused to
// anyone without a Studio session — the same requireUser() every mutating CMS
// endpoint calls.

import { requireUser } from '@/cms/server/auth'

// Mirrors the switch in src/pages/studio/[[...path]].jsx. With the in-memory dev
// port there is no server-side session to check — the Studio's documents live in
// the browser — so requiring one here would make the preview unreachable in the
// exact environment it is developed in. It is the same flag that already decides
// the Studio has no real backend, not a new hole: with a real port configured
// this branch is dead and the check below is the only path.
const DEV_PORT = process.env.NEXT_PUBLIC_CMS_DEV_PORT === '1'

// `<type>/<id>`, and nothing that could carry a scheme, a host or a path
// traversal into the Location header. Studio ids are uuids from Postgres or
// `type-xxxxxxxx` from the dev port; both fit.
const FROM = /^[A-Za-z0-9_-]{1,40}\/[A-Za-z0-9_-]{1,64}$/

// Which page of the site the frame was showing, so switching between draft and
// published stays on it. Pattern-checked for the same reason as `from`: it is
// caller-supplied and ends up in a Location header. It can only ever be a query
// parameter on the fixed path below — never the path itself — but a value that
// could carry a scheme or a host has no business being echoed back either way.
const PAGE = /^\/[A-Za-z0-9\-._~/]{0,120}$/

const PREVIEW_PATH = '/studio/preview'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ code: 'invalid', message: 'Metoda není povolena, použijte GET' })
    }

    // Anything that is not one of the other two words means draft. The preview
    // exists to show unpublished work, so that is the safe default for a
    // malformed parameter.
    const requested = String(req.query.mode || '')
    const mode = requested === 'published' || requested === 'off' ? requested : 'draft'
    const from = FROM.test(String(req.query.from || '')) ? String(req.query.from) : null
    const page = PAGE.test(String(req.query.p || '')) ? String(req.query.p) : null

    if (!DEV_PORT) {
        try {
            await requireUser(req, res)
        } catch {
            // Not "401 Unauthorized" as a body: this is a navigation, and the
            // useful answer to an editor whose session expired mid-preview is
            // the sign-in screen, not a JSON error in a blank tab.
            return res.redirect(307, '/studio')
        }
    }

    // The whole mechanism, in one call. `enable: false` clears the cookie, which
    // is what makes the panel's "Publikováno" side show the page exactly as a
    // visitor gets it rather than a draft render with the drafts filtered out.
    res.setDraftMode({ enable: mode === 'draft' })

    if (mode === 'off') {
        // Back where the editor came from when that is known — previewing from a
        // document and landing on the overview loses their place for no reason.
        return res.redirect(307, from ? `/studio/${from}` : '/studio')
    }

    const query = new URLSearchParams({ m: mode })
    if (from) query.set('from', from)
    if (page) query.set('p', page)

    // `m` is not read by getStaticProps — a static route gets no query there, and
    // the authoritative answer is `context.draftMode`. It is in the URL so that
    // switching modes is a different URL and therefore a real navigation with a
    // real data fetch, and so that a reloaded or bookmarked preview still shows
    // the panel in the state the editor left it.
    return res.redirect(307, `${PREVIEW_PATH}?${query}`)
}
