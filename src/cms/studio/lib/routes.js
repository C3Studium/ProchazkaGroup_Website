/**
 * The whole admin lives behind one catch-all page, so routing is a pure
 * function over the path segments Next hands us. No route table, no matcher
 * dependency — five shapes and a builder for each.
 *
 *   /studio                      overview
 *   /studio/moderation           review queue
 *   /studio/edit                 edit the site's pages in place
 *   /studio/media                media library
 *   /studio/stats                stats panel
 *   /studio/users                user management (owners only)
 *   /studio/<type>               document list
 *   /studio/<type>/<id|new>      document editor
 *
 * One address in that space is not parsed here at all: /studio/preview is a real
 * Next page (src/pages/studio/preview.jsx), and a static route outranks the
 * catch-all this file serves, so the Shell never sees it. That is the point —
 * the preview mounts the public site's own component tree with the public
 * `_app` around it, which it cannot do from inside the Studio's fixed overlay.
 *
 * /studio/edit is the opposite case and is parsed here like everything else. It
 * frames the site rather than mounting it, so it needs no page file of its own —
 * and it wants the Studio's sidebar and top bar around it, which is exactly what
 * being a view inside the catch-all gives it for free.
 */

export const BASE = "/studio"

// Reserved first segments. A content type sharing one of these names would be
// unreachable, so StudioProvider warns instead of failing silently. "preview"
// is reserved for the stronger reason: a type named that would be shadowed by a
// page file, not by a branch in parseRoute, and would fail with no warning at
// all.
export const RESERVED = ["moderation", "edit", "media", "stats", "users", "preview"]

export function parseRoute(path) {
  const segments = (Array.isArray(path) ? path : path ? [path] : []).filter(Boolean)

  if (!segments.length) return { view: "overview" }
  if (RESERVED.includes(segments[0])) return { view: segments[0] }
  if (segments.length === 1) return { view: "list", type: segments[0] }

  return { view: "editor", type: segments[0], id: segments[1], isNew: segments[1] === "new" }
}

export const PREVIEW = `${BASE}/preview`

/**
 * `<type>/<id>` — which document an editor was looking at when they opened the
 * preview. It is the only caller-supplied part of the preview URL and the API
 * route pattern-checks it again before it reaches a Location header, so the
 * shape is defined in both places on purpose.
 */
export const previewFrom = (type, id) => (type && id && id !== "new" ? `${type}/${id}` : null)

export const parsePreviewFrom = (value) => {
  const [type, id] = String(value || "").split("/")
  return type && id ? { type, id } : null
}

export const hrefs = {
  overview: () => BASE,
  moderation: () => `${BASE}/moderation`,

  /**
   * A plain in-app link, unlike `preview` below, and the difference is where the
   * draft cookie is set. The preview needs it before `getStaticProps` runs on the
   * host page itself, so entering has to be a navigation through the API route.
   * `/studio/edit` renders no content of its own — the draft only has to be on
   * before the *iframe* is pointed anywhere, which the view sequences for itself
   * (see EditView). So this stays a client-side transition and the Studio does
   * not reload underneath the editor.
   */
  edit: (page) => (page && page !== "/" ? `${BASE}/edit?p=${encodeURIComponent(page)}` : `${BASE}/edit`),

  media: () => `${BASE}/media`,
  stats: () => `${BASE}/stats`,
  users: () => `${BASE}/users`,
  list: (type) => `${BASE}/${type}`,
  editor: (type, id) => `${BASE}/${type}/${id}`,
  create: (type) => `${BASE}/${type}/new`,

  /**
   * Entering the preview goes through the API route, never straight to the page:
   * the draft cookie has to exist before `getStaticProps` runs, and a plain link
   * to /studio/preview would render the published page and quietly look like the
   * draft switch was broken. Everything after the redirect is the API's to
   * decide — see src/pages/api/studio/preview.js.
   */
  preview: ({ mode = "draft", from, page } = {}) => {
    const query = new URLSearchParams({ mode })
    if (from) query.set("from", from)
    // Which page of the site the frame is showing. Carried through the API route
    // so that switching between draft and published — which has to be a real
    // navigation, because it sets a cookie — compares the same page against
    // itself instead of dropping the editor back on the homepage.
    if (page && page !== "/") query.set("p", page)
    return `/api/studio/preview?${query}`
  },

  /**
   * Leaving the preview goes through the same route, because leaving has to
   * clear the draft cookie. A plain link back to /studio would leave it set,
   * and a browser holding a draft-mode cookie stops being served the cached
   * copy of every page on the site — the editor would quietly get an
   * on-demand render of the public homepage for the next month.
   */
  previewExit: ({ from } = {}) => {
    const query = new URLSearchParams({ mode: "off" })
    if (from) query.set("from", from)
    return `/api/studio/preview?${query}`
  },
}

/** True when `href` is the active route, tolerant of trailing segments. */
export const isActive = (href, asPath) => {
  const current = (asPath || "").split("?")[0].replace(/\/$/, "") || BASE
  if (href === BASE) return current === BASE
  return current === href || current.startsWith(`${href}/`)
}
