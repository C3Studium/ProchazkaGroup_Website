import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

import { frameHost } from "@/cms/preview/frame"
import { hasManageHint } from "./hint"

/**
 * The one thing about the Studio that a visitor's browser downloads — SITE-SAFE.
 *
 * `_app` mounts this on every public route, so what is in this module is what
 * every visitor pays. It is four conditions and a `useState`. The widget itself
 * — its markup, its stylesheet, its fetch — is behind `dynamic()` and lands in
 * its own chunk, which is requested only after all four conditions pass. A
 * visitor who has never signed in downloads this file, runs one effect that
 * returns on its third line, renders `null`, and makes no request.
 *
 * ---------------------------------------------------------------------------
 * Why an effect, and why the arming is a state change
 *
 * Copied from `@/cms/edit/arm.js`, whose header holds the full reasoning; the
 * short form is that the answer depends on a cookie and the server does not
 * have one. Every public page here is statically generated with ISR, so its
 * HTML is built once, months before this browser asks for it, and is the same
 * bytes for the editor and for everybody else. A render that branched on
 * `document.cookie` would therefore differ from the server's — a hydration
 * mismatch, which is a console error and makes React throw the root away and
 * re-render it, on a site whose whole character is a scroll-driven timeline.
 *
 * Effects do not run on the server and do not run during the first client
 * render. So the server renders `null`, the first client render renders `null`,
 * and the widget can only appear one commit later. Nothing can differ between
 * the two passes because for both of them there is nothing there.
 *
 * ---------------------------------------------------------------------------
 * The three places it must not appear, and why each is checked here
 *
 * `frameHost()` covers two of them in one call, and it is already in this bundle
 * because `editable()` imports the module: inside `/studio/preview` a widget
 * would break the faithfulness the preview exists for, and inside `/studio/edit`
 * a "manage this site" button in the middle of the thing that manages the site
 * is simply absurd. Both frames belong to a signed-in editor and therefore
 * carry the hint, so neither would be excluded by anything else.
 *
 * The pathname check covers `/studio/*` itself. The shell seam already means the
 * site's chrome — and so this component — is not mounted there at all
 * (`@/cms/shell`), which makes the check redundant today. It is here because the
 * cost is a `startsWith` and the failure it guards against is a Studio screen
 * that renders a button back to the Studio; `/studio/preview/home` is the live
 * proof that a route under that prefix can legitimately ask for the site shell,
 * so "the shell decides" and "the path decides" are not the same rule and this
 * component should survive either.
 */
const ManageWidget = dynamic(() => import("./ManageWidget"), { ssr: false })

export default function ManageBadge() {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (frameHost() !== null) return
    if (window.location.pathname.startsWith("/studio")) return
    if (!hasManageHint()) return
    setArmed(true)
  }, [])

  return armed ? <ManageWidget /> : null
}
