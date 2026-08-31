/**
 * What the CMS contributes to a host application's `next.config`.
 *
 * The Studio is a library (see LIBRARY.md): a second project should be able to
 * adopt it without re-deriving the HTTP policy its admin needs. This module is
 * that seam. The host writes one line —
 *
 *   import { cmsHeaders } from './src/cms/nextConfig.mjs'
 *   async headers() { return [...cmsHeaders(), ...ownHeaders] }
 *
 * — and everything the CMS wants said about its own routes is said here.
 *
 * ## Why this is a config contribution and not a middleware
 *
 * The obvious alternative was `middleware.js`, and it was built and measured
 * before this was written. Three findings killed it, all reproduced on Next
 * 16.1.1:
 *
 *  1. `config.matcher` must be a literal in the middleware file. Next reads it
 *     by static analysis (`extractExportedConstValue`); an imported constant
 *     throws `UnsupportedValueError`, which `getPageStaticInfo` catches and
 *     *silences*. The middleware then runs with no matcher at all — measured:
 *     `/` came back carrying the admin's noindex header. So the one thing this
 *     module exists to own, the path list, is the one thing a middleware seam
 *     cannot own; the host would have to copy it, and copying it wrong fails
 *     silently and on the public site.
 *  2. A middleware is a function invocation on every matched request, for a
 *     header that never varies. `headers()` is applied by the router at zero
 *     runtime cost, and applies even to responses the page failed to render —
 *     measured on a 500.
 *  3. Next 16 deprecated the convention outright: a `middleware` file logs
 *     "the middleware file convention is deprecated, please use proxy instead",
 *     and having both is a hard error. Writing one today writes a file whose
 *     replacement already shipped.
 *
 * A middleware earns its cost when the response depends on the request. Nothing
 * here does. If that ever changes, the paths below are already the single list
 * to build a matcher from — and it will still have to be copied into the
 * matcher literal rather than imported, for reason (1).
 *
 * ## Why there is no edge gate either
 *
 * The candidate was: redirect an unauthenticated `/studio/*` to the sign-in
 * view before anything renders. It was dropped for two measured reasons, not
 * for taste.
 *
 * **There is nowhere to redirect to.** The gate is not a route. `studio/Studio.jsx`
 * renders `<SignIn />` in place of `<Shell />` whenever the session check comes
 * back empty, at whatever path the browser is on — so `/studio/edit` already
 * shows the sign-in form, and sending it to `/studio` would only lose the
 * address the editor was trying to reach.
 *
 * **A presence check would gate nothing.** The cookie is httpOnly and
 * HMAC-signed, and only `server/auth.js` can tell a real one from a made-up
 * one; a middleware sees the name and nothing else. Measured against the
 * running server with a well-formed but wrongly-signed `cms_session`:
 * `/api/cms/documents` → 401 `unauthorized`, exactly as with no cookie at all.
 * The forged cookie *is* present, so a presence check would have waved it
 * through — it would refuse only the honest visitor who has never signed in,
 * while the real check that stops the attacker already runs on every request
 * that carries data. `/studio` itself answers 200 either way and is right to:
 * its HTML is a client-only shell with no content in it, and every byte worth
 * protecting arrives over `/api/cms/*`.
 */

/**
 * Where the CMS mounts in a host app. Both are prefixes of real route files
 * (`src/pages/studio/[[...path]].jsx`, `src/pages/api/cms/[...route].js`), so a
 * host that moves either one has moved the pages too and must say so here.
 */
export const CMS_BASE_PATHS = {
  studio: '/studio',
  api: '/api/cms',
}

const NOINDEX = 'noindex, nofollow'

/**
 * Keep an admin out of the index.
 *
 * The Studio's pages already carry `<meta name="robots">`, but a meta tag only
 * reaches a crawler that chose to parse the HTML, and `/api/cms/*` serves no
 * HTML at all. A header is read by everything that reads anything, so it is the
 * broader instrument and it is what a host gets for free.
 *
 * `:path*` matches zero segments too, so `/studio` itself is covered and not
 * only its children — the previous rule here was `/studio/preview/:path*` and
 * `/studio` was consequently bare. `/studiox` is not matched: the `/` before the
 * parameter is a literal segment boundary. Both verified against a running
 * server.
 *
 * Three consequences worth naming rather than discovering later:
 *
 *  - **`/studio/preview/home` is included, deliberately.** It is a page of the
 *    site — it renders `@/pages/index` — living under a Studio path, and it is
 *    what the preview iframe frames. That is exactly why it must carry the
 *    header: it is a draft render of the homepage at a second address, and an
 *    indexed draft competing with `/` is the duplicate-content failure the
 *    canonical homepage would lose. The public `/` is untouched and stays the
 *    only indexable copy.
 *  - **`/api/cms/asset/*` is included.** In production it is dead weight (the
 *    Supabase driver serves bucket URLs and this route 404s), and where it does
 *    serve files, `next/image` fetches it server-side and publishes
 *    `/_next/image?url=…` to the browser — which is not under this prefix. So
 *    the blanket rule costs no public image its place in an index.
 *  - **robots.txt already disallows `/studio` and `/api`.** That is a crawl
 *    instruction, not an index instruction: a disallowed URL discovered from a
 *    link can still be indexed URL-only, and a crawler obeying the disallow
 *    never fetches the page and so never reads this header. The two cover
 *    different crawlers rather than one repeating the other.
 *
 * @param {object} [options]
 * @param {string} [options.studio] Studio mount point, default `/studio`.
 * @param {string} [options.api]    CMS API mount point, default `/api/cms`.
 * @param {string} [options.robots] The header value, if a host wants a narrower
 *   directive (`noindex` alone, say, to let a crawler follow outbound links).
 * @returns {Array<{source: string, headers: Array<{key: string, value: string}>}>}
 *   Entries for `next.config`'s `headers()`. A host may drop or replace any of
 *   them — they are data, and the return value is a fresh array each call so a
 *   caller mutating it cannot reach back into this module.
 */
export const cmsHeaders = ({
  studio = CMS_BASE_PATHS.studio,
  api = CMS_BASE_PATHS.api,
  robots = NOINDEX,
} = {}) =>
  [studio, api].map((base) => ({
    source: `${base}/:path*`,
    headers: [{ key: 'X-Robots-Tag', value: robots }],
  }))
