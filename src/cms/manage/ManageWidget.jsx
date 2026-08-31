import { useEffect, useState } from "react"

import styles from "./ManageWidget.module.scss"

/**
 * "Spravovat web" — the editor's way back into the Studio, on the public site.
 *
 * SITE-SAFE, and in its own chunk. Nothing here imports the Studio: not the
 * overlay, not the media library, not `FieldRenderer`, not the design tokens
 * under `studio/styles`. It is one element, one link, one fetch and a
 * stylesheet, so that the price of the whole feature to a browser that never
 * loads this file is the stub in `./index.jsx`.
 *
 * The client should never have to type an address into a browser to reach the
 * thing that edits their own website. That is all this is.
 *
 * ---------------------------------------------------------------------------
 * Why the appearance is fetched and not a prop
 *
 * Because the pages it appears on are statically generated with ISR and this
 * project has no on-demand revalidation, so a corner that arrived in
 * `getStaticProps` would take up to ten minutes per page to move — see
 * `@/cms/server/manageWidget`. One request, made only by a browser that already
 * passed every check in `./index.jsx`, and the change is live on the next load.
 *
 * The response is not a permission and is not treated as one. It is a corner, a
 * colour and two booleans; the endpoint hands the same thing to anybody who
 * asks, deliberately (`server/handlers/widget.js`). If the fetch fails, nothing
 * renders and nothing is logged: a visitor who forged the hint out of curiosity
 * is not owed an error message, and an editor briefly offline is not helped by
 * one in a console they will not open.
 */

/**
 * Dismissal lasts the tab, not forever. `localStorage` would mean an editor who
 * hid it once has to be told about the settings screen to get it back, which
 * turns a courtesy into a support call; `sessionStorage` forgets when the tab
 * closes. Permanently off is a real choice and it has a real switch — the
 * on/off in /studio/settings — so this one does not need to be permanent too.
 */
const DISMISSED = "cms.manage.dismissed"

/** Storage can throw outright in a locked-down browser; neither read nor write is worth a failure. */
const readDismissed = () => {
  try {
    return window.sessionStorage.getItem(DISMISSED) === "1"
  } catch {
    return false
  }
}

export default function ManageWidget() {
  const [look, setLook] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (readDismissed()) {
      setDismissed(true)
      return undefined
    }

    // `AbortController` rather than a liveness flag: unmounting mid-flight
    // should stop the request, not just ignore its answer.
    const abort = new AbortController()

    fetch("/api/cms/widget", { credentials: "same-origin", signal: abort.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (value?.enabled) setLook(value)
      })
      .catch(() => {
        // Offline, aborted, or an endpoint that is not there. Rendering nothing
        // is the whole of the correct behaviour.
      })

    return () => abort.abort()
  }, [])

  if (dismissed || !look) return null

  const hide = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISSED, "1")
    } catch {
      /* hidden for this render either way */
    }
  }

  return (
    <aside
      className={styles.root}
      // Corner and blur as data attributes rather than composed class names, so
      // the four positions are four rules in one stylesheet that can be read
      // side by side, and the colour arrives as a custom property because it is
      // the one value that is not from a fixed set.
      data-corner={look.corner}
      data-blur={look.blur ? "on" : "off"}
      style={{ "--cms-manage-bg": look.background }}
      aria-label="Správa webu"
      // Escape closes it, and only while focus is inside it. Bound here rather
      // than on the document because Escape belongs to whatever the visitor is
      // actually using — a fixed badge in a corner has no business intercepting
      // it from a menu or a form somewhere else on the page.
      onKeyDown={(event) => {
        if (event.key === "Escape") hide()
      }}
    >
      <span className={styles.label}>Spravovat web</span>

      {/* A plain anchor, not next/link. The Studio is a different application
          under the same build — it declares `studioChrome()` and throws away
          everything the site's shell mounts — so a client-side transition into
          it would tear down the shader, the cursor and Lenis inside a running
          page instead of simply leaving. A full navigation is what going there
          actually is. No prefetch either: the Studio's bundle is large and this
          link is hovered far less often than it is seen.

          `data-no-veil` is required, not decoration. PageVeil intercepts every
          internal anchor click in the CAPTURE phase and replaces it with a 3.3s
          cinematic transition that ends in `router.push` — which would both make
          "open the editor" a four-second wait and turn the full load above into
          the client-side one this comment just argued against. The attribute is
          that component's own documented opt-out. */}
      <a className={styles.open} href="/studio" data-no-veil>
        Otevřít Studio
      </a>

      <button type="button" className={styles.hide} onClick={hide} aria-label="Skrýt do konce návštěvy">
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
          <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  )
}
