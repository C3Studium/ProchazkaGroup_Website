/**
 * The seam between the three builds of the visual editor — SHARED, BROWSER-SAFE.
 *
 * Three pieces of code have to agree on one thing: what URL the preview's iframe
 * loads, and how a document inside it knows it is being edited.
 *
 *   the host     (src/cms/studio/preview) builds the URL, points the iframe, and
 *                mounts the overlay into the document it loaded
 *   the page     (whatever route that URL names) is rendered by it, and arms
 *                `editable()` because the flag is on it (src/cms/edit/arm.js)
 *
 * Rather than let each of them spell the answer out, all three import it here.
 * Nothing in this file touches the DOM at import time, imports a component or
 * reaches for the server, so the edit helper can pull it into the site bundle
 * without dragging the Studio along.
 *
 * ---------------------------------------------------------------------------
 * What the iframe loads: the site's own URL, with one parameter added
 *
 *   /o-nas?edit=1
 *   /kontakt?edit=1
 *   /reviews/vituj-lukas?edit=1
 *
 * Not a copy of those routes and not a mirror of them under /studio. The page in
 * the frame has to *be* the page, down to its address: this site reads its own
 * pathname in five components — navbar/body marks the active link with
 * `pathname === href`, navbar/menu changes the CTA copy on /o-nas, the footer and
 * Contact branch on it as well. A preview served from a different address renders
 * its navigation differently from the site, which was measured rather than
 * guessed: an earlier version of this file mirrored the site under
 * /studio/preview/frame/*, and every page in it had no active nav link and a
 * hydration error to go with it.
 *
 * ---------------------------------------------------------------------------
 * The homepage, and why it is the exception
 *
 *   /studio/preview/home?edit=1
 *
 * `src/pages/index.js` calls `getHomepageContent()` with no arguments and must
 * keep doing so: src/cms/server/site/homepage.js states the guarantee that
 * follows — the public homepage cannot reach a draft no matter what the preview
 * does — and a preview feature is not a good enough reason to spend it. So the
 * draft switch lives on a route only the Studio loads.
 *
 * The cost is the one thing above, paid on one page: inside the homepage preview
 * `usePathname()` answers `/studio/preview/home` rather than `/`. Nothing on the
 * homepage branches on that today (no component compares against `"/"`), and the
 * preview has always had this shape. It is still a gap, and it closes by itself
 * the day `src/pages/index.js` is allowed to read `context.draftMode` — at which
 * point this route and this exception both disappear.
 *
 * ---------------------------------------------------------------------------
 * The flag, and why it needs a second half
 *
 * `?edit=1`, one parameter, as agreed — and a query parameter on a public URL is
 * a query parameter anyone can type. On its own it would let a visitor turn the
 * marketing site into an editing surface by appending eight characters.
 *
 * So the flag is *claimed* by the URL and *validated* by the frame: it counts
 * only in a document the Studio's own preview host is showing. That is not a
 * second channel — nothing is signalled by it, no message is passed, and the
 * parameter remains the only thing that says "edit". It is the check that makes
 * the one signal unforgeable, and it lives in one function so no caller has to
 * remember it.
 *
 * There is a second, stronger guarantee underneath it now: the overlay is not in
 * the framed page's bundle at all. `isEditFrame()` gates the *attributes*, which
 * are inert on their own; the editing surface is mounted by the host out of the
 * Studio's bundle, so a page a visitor loaded has nothing to arm even if this
 * function could be made to lie.
 */

/** The Studio's preview host — a document allowed to frame an editor. */
export const HOST_PATH = "/studio/preview"

/**
 * The editing view, inside the Studio shell (`/studio/edit`).
 *
 * A second host, not a second mechanism. It frames the same URLs through the
 * same `frameUrl()` and mounts the same overlay from the same bundle; the only
 * thing that differs is the chrome around the frame, which is the Studio's own
 * sidebar and top bar rather than the preview's full-screen bar. So it has to be
 * named here too, because `isEditFrame()` below asks *which document is framing
 * me* and a page framed by the editor would otherwise decline to arm.
 */
export const EDIT_HOST_PATH = "/studio/edit"

/** The documents allowed to frame an editor. Both are Studio-only addresses. */
const HOST_PATHS = [HOST_PATH, EDIT_HOST_PATH]

/**
 * The homepage's stand-in. The one route in the project that may read drafts,
 * and therefore the one page whose preview is not its own public URL.
 */
export const HOME_PREVIEW_PATH = "/studio/preview/home"

/** The edit-mode flag. One parameter, one accepted value. */
export const EDIT_PARAM = "edit"
export const EDIT_VALUE = "1"

/**
 * Cache buster. The published side of the preview is a statically generated page
 * and the router's data cache will happily answer "Obnovit" with the props it had
 * a minute ago; a parameter that changes forces a real render. Draft mode
 * bypasses the cache anyway, so this is a no-op there.
 */
export const BUST_PARAM = "r"

/** `/o-nas/` and `/o-nas` are the same page; routes are written the second way. */
const normalise = (sitePath) => {
    const value = String(sitePath || "/").trim()
    if (!value.startsWith("/")) return "/"
    const trimmed = value.replace(/\/+$/, "")
    return trimmed || "/"
}

/**
 * The address the frame should load in order to show `sitePath`.
 *
 * @param {string} sitePath  a public route — "/", "/o-nas", "/reviews/vituj-lukas"
 * @param {{ edit?: boolean, bust?: string }} [options]
 */
export const frameUrl = (sitePath, { edit = true, bust } = {}) => {
    const path = normalise(sitePath)
    const base = path === "/" ? HOME_PREVIEW_PATH : path
    const query = new URLSearchParams()
    if (edit) query.set(EDIT_PARAM, EDIT_VALUE)
    if (bust) query.set(BUST_PARAM, bust)
    const search = query.toString()
    return search ? `${base}?${search}` : base
}

/**
 * The inverse: which page of the site a framed document is showing.
 *
 * Everything is a site path except the host itself and the Studio behind it —
 * following a link out of the preview and into /studio would otherwise put the
 * admin inside its own frame.
 */
export const sitePathFromFrame = (pathname) => {
    const path = normalise(pathname)
    if (path === HOME_PREVIEW_PATH) return "/"
    if (path === HOST_PATH || path.startsWith(`${HOST_PATH}/`)) return null
    if (path === "/studio" || path.startsWith("/studio/")) return null
    if (path.startsWith("/api/")) return null
    return path
}

/**
 * Is this document being edited?
 *
 * Both halves, for the reason set out at the top of this file: the parameter is
 * the flag, and being inside one of the Studio's own hosts is what makes the flag
 * mean anything. A cross-origin parent throws on the location read and the answer
 * is no, which is the right answer — an editor's surface has no business
 * appearing in someone else's iframe.
 *
 * The list is two entries long and both are addresses only a signed-in editor
 * reaches. Widening it is the one change that could turn `?edit=1` back into
 * eight characters anyone can type, so a new entry needs the same argument these
 * two have.
 */
export const isEditFrame = () => {
    if (typeof window === "undefined") return false
    if (new URLSearchParams(window.location.search).get(EDIT_PARAM) !== EDIT_VALUE) return false
    try {
        if (window.self === window.top) return false
        return HOST_PATHS.includes(normalise(window.parent.location.pathname))
    } catch {
        return false
    }
}
