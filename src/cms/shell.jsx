import { useEffect } from "react"

/**
 * Which shell a route gets — SHARED, BROWSER-SAFE.
 *
 * The Studio is not a page of the site it manages. It is an application that
 * happens to be served by the same Next build, and until this file existed
 * `_app.js` had no way to know that: it wrapped every route in the marketing
 * shell — a WebGL shader, the custom cursor, the opening curtain, the page
 * veil, Lenis, the navbar and the patička — and the admin spent two stylesheets
 * hiding the result. Hiding is not omitting. Measured on `/studio` before this
 * file: two canvases mounted, a Lenis instance constructed and then immediately
 * told to stop, three focusable navbar elements at 0×0 carrying the Czech
 * alphabet, and the Studio's own <main> held at `opacity: 0; pointer-events:
 * none` for 8.5 seconds by a global rule keyed on the curtain's flag.
 *
 * ---------------------------------------------------------------------------
 * How a route says which shell it wants, and why it is not the path
 *
 * The obvious rule — "anything under /studio is the admin" — is wrong, and
 * wrong on a route that already exists. `/studio/preview/home` is a page of the
 * *site*: it imports `@/pages/index` and renders it, it is what the preview's
 * iframe frames, and the whole argument for the preview is that what an editor
 * sees is what a visitor gets. A prefix match strips the shader and the navbar
 * out of the one render whose entire job is to be faithful.
 *
 * So the declaration lives on the **page component**, and the two directions
 * are deliberately unequal:
 *
 *   - the default is the site shell. A route that declares nothing is a page of
 *     the site, which is what a route is unless someone went out of their way.
 *     Adding `src/pages/whatever.js` cannot lose its chrome by forgetting
 *     something, because there is nothing to remember.
 *   - the admin opts out, once, next to the import of the thing it mounts.
 *     `studioChrome()` travels with the Studio, not with the URL.
 *
 * A new Studio *view* is not a new route at all — views are added inside
 * `/studio/[[...path]]`, which is already marked — so the case the brief worries
 * about ("a new Studio view must remember to opt out") cannot arise through the
 * router. What can still arise is a new *file* under `src/pages/studio/`, and
 * `assertDeclared` below closes that: inside the Studio's own path space an
 * undeclared page is a development-time error naming both helpers, so the author
 * has to say which of the two things it is rather than inherit an answer.
 *
 * Note what that assertion is and is not. The path prefix decides **nothing**;
 * it only decides where silence is suspicious. `/studio/preview/home` passes it
 * by declaring `siteChrome`, and gets the full site shell, from the same
 * mechanism as `/o-nas`.
 *
 * ---------------------------------------------------------------------------
 * Hydration
 *
 * The decision reads a static property of the page component. `_app` is handed
 * the same component object by the same import on the server pass and on the
 * first client pass, so the answer cannot differ between them — unlike
 * `router.isReady`, which is false on the server and true on a static route's
 * first client render, and unlike `asPath`, which is the rewritten path on one
 * side only. `router.pathname` is passed here purely to give the dev assertion
 * something to name; nothing returned to `_app` depends on it.
 */

export const STUDIO_CHROME = "studio"
export const SITE_CHROME = "site"

/**
 * The property the two helpers set. A plain string key rather than a symbol so
 * it shows up in React DevTools next to `getInitialProps`, which is the same
 * kind of thing: a static a page hangs on itself for the app shell to read.
 */
const SHELL_KEY = "cmsShell"

/** The Studio's own path space. Used by the dev assertion only — see above. */
const STUDIO_ROOT = "/studio"

/** This page is the Studio. Give it nothing of the site. */
export function studioChrome(Component) {
  Component[SHELL_KEY] = STUDIO_CHROME
  return Component
}

/**
 * This page is a page of the site, whatever its URL suggests. Only ever needed
 * under `STUDIO_ROOT`, where silence is an error rather than a default.
 */
export function siteChrome(Component) {
  Component[SHELL_KEY] = SITE_CHROME
  return Component
}

/**
 * The question `_app` asks. Everything else in this file exists to make the
 * answer to it impossible to get wrong.
 */
export function usesStudioChrome(Component, pathname) {
  const declared = Component?.[SHELL_KEY]
  if (process.env.NODE_ENV !== "production") assertDeclared(declared, pathname)
  return declared === STUDIO_CHROME
}

/**
 * A route under the Studio's path space that declares neither shell is almost
 * certainly a new admin screen that will silently inherit the marketing shell —
 * the exact failure this file replaces. Reported rather than thrown: a shell
 * decision must never be what takes a page to a blank screen, and the message
 * has to survive being read in a terminal at 3am, so it names the two calls.
 */
function assertDeclared(declared, pathname) {
  if (declared === STUDIO_CHROME || declared === SITE_CHROME) return
  if (typeof pathname !== "string") return
  if (pathname !== STUDIO_ROOT && !pathname.startsWith(`${STUDIO_ROOT}/`)) return

  console.error(
    `[cms] ${pathname} declares no shell and is being served the site's. ` +
      "Wrap its default export in studioChrome() if it is an admin screen, or " +
      "siteChrome() if it is a page of the site living under /studio (as " +
      "/studio/preview/home is). Both come from @/cms.",
  )
}

/**
 * Everything a Studio route gets from the app shell.
 *
 * Which is close to nothing, and that is the point: the Studio's surfaces bring
 * their own tokens, their own reset, their own focus treatment and their own
 * animations, and both of them already take the viewport with `position: fixed`
 * and lock scrolling for themselves. What they could not bring is the *absence*
 * of the site around them.
 *
 * The one positive act is the flag below, and it is not housekeeping.
 * `_document.js` renders `<html data-preload="1">` on every document so the
 * opening curtain can hold the page back, and the curtain clears it when it
 * leaves. The curtain is site chrome and is not mounted here, so nothing would
 * ever clear it — and the site's global sheet reads that flag as
 * `main { opacity: 0; pointer-events: none }`, which matches the Studio's own
 * workspace element (studio/shell/Shell.jsx). Measured before this file: the
 * admin's workspace was invisible and dead to the pointer for the 8.5s the
 * curtain used to take, and without this line it would stay that way forever.
 * A shell that removes the curtain owns the flag the curtain was holding.
 */
export function StudioShell({ children }) {
  useEffect(() => {
    delete document.documentElement.dataset.preload
  }, [])

  return <>{children}</>
}
