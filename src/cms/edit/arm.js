import { useEffect, useState } from "react"

import { isEditFrame } from "@/cms/preview/frame"
import { setEditMode } from "./mode"

/**
 * The one thing the framed page still has to do for itself — SITE-SAFE.
 *
 * The overlay is mounted by the host now, from the host's own bundle, and the
 * framed page carries nothing but the inert `data-cms-*` attributes. But those
 * attributes come from `editable()`, `editable()` runs inside the page's React,
 * and React lives in the frame's realm: the host cannot flip a module flag in
 * another realm's module registry, and it cannot make that realm re-render if it
 * could. Something in the page has to notice and re-render once.
 *
 * This is that something, and it is all of it. Note what it does **not** reach:
 * nothing under `overlay/`, no Studio component, no media library — just the
 * URL check and the flag, both of which the public bundle already carries
 * because `editable()` imports them. `@/cms/edit/index.js` says why that matters.
 *
 * ---------------------------------------------------------------------------
 * Why an effect, and why the re-render is a state change
 *
 * The flag is set **only from an effect**. Effects do not run on the server, so
 * no server render can emit an attribute — not a public page, and not the
 * preview's own first pass — which is what keeps `data-cms-*` out of the public
 * HTML by construction rather than by care, and what keeps the first client
 * render byte-identical to the server's. See mode.js.
 *
 * Setting a module flag re-renders nothing, so the state change is the other
 * half: it re-renders `_app`, which creates a fresh `<Component>` element, which
 * re-renders the page and with it every annotated element. This is the same
 * arrangement `EditSurface` used (it re-keyed its child with `cloneElement`
 * instead, because it was handed one element rather than being the root); the
 * cost is one extra render of the page, once, immediately after hydration.
 *
 * For a visitor it costs a `useState` and an effect that returns on its first
 * line: `isEditFrame()` is false outside a same-origin `/studio/preview` frame,
 * so nothing is set and nothing re-renders.
 */
export function useEditArming() {
  const [, setArmed] = useState(false)

  useEffect(() => {
    // Both halves of Contract 0: `?edit=1` claims it, being framed by the
    // Studio's preview host is what makes the claim mean anything. Eight
    // characters typed onto a public URL still arm nothing.
    if (!isEditFrame()) return undefined

    setEditMode(true)
    setArmed(true)

    return () => {
      setEditMode(false)
    }
  }, [])
}

export default useEditArming
