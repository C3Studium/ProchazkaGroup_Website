/**
 * The interaction lock — the framed page stops answering the mouse.
 *
 * ---------------------------------------------------------------------------
 * What it is for
 *
 * This site is dense with pointer behaviour: `Magnetic` follows the cursor with
 * a spring, two custom cursors track `pointermove` on the window, sections
 * reveal on hover, and every `next/link` navigates. While editing is armed, a
 * click is a *selection gesture* — it means "edit this" — and it must not also
 * follow a link, fire a magnet or drag an image out of the page. The overlay
 * already refuses the click on the element it selects; that is not enough,
 * because the harm is everything the page does on the way there.
 *
 * ---------------------------------------------------------------------------
 * Capture, at the document, and only stopPropagation
 *
 * The listeners are registered on the frame's **document, in the capture
 * phase**, which is upstream of everything the page can install: React attaches
 * its own delegated listeners to the root container *inside* `<body>`, the
 * cursors listen on `window` in the bubble phase, and `Magnetic`'s handlers are
 * React props. `stopPropagation()` here means the event never descends to the
 * target and never bubbles back — so none of them run.
 *
 * `stopPropagation` and not `stopImmediatePropagation`, deliberately: the
 * overlay's own hit-testing listeners are on this same document in this same
 * phase, and the immediate form would silence them too. Same-node listeners are
 * unaffected by the ordinary one, whichever was registered first.
 *
 * ---------------------------------------------------------------------------
 * What is *not* blocked, and why each one matters
 *
 *   Scrolling.  `wheel`, `touchstart`/`touchmove`/`touchend`, `scroll` and every
 *               key are absent from the list below. Parts of this page are 550vh
 *               and an editor has to reach the bottom of them; a lock that
 *               stopped the wheel would be a lock on the job, not on the page.
 *               Touch is left alone entirely rather than filtered by
 *               `pointerType`, because a cancelled touch-derived pointer event
 *               is one of the ways a browser will decline to scroll.
 *
 *   Keys.       Not pointer interactions. Space, PageDown, Home and End scroll,
 *               and Escape is how the overlay clears a selection.
 *
 *   Defaults,   `preventDefault()` is called only where the *default action* is
 *   mostly.     itself the harm — following a link, opening it in a new tab,
 *               starting a drag. It is deliberately not called on `mousedown`:
 *               that would take away focus and the start of a text selection,
 *               and the overlay needs the frame focused for Escape to reach it.
 *
 *   Two zones.  Anything inside the overlay's own chrome (`[data-cms-overlay]`,
 *               its portalled root) and anything inside the element currently
 *               being typed into (`[data-cms-editing]`, set by text.js) passes
 *               through untouched. The second is what keeps click-to-place-caret
 *               and drag-to-select working in the field being edited — which is
 *               also what the *Zvýraznit* affordance is driven by.
 *
 * ---------------------------------------------------------------------------
 * Lifetime
 *
 * Installed by `mount.jsx` when it creates an overlay for a document, released
 * when it tears one down. Nothing else may call it. That is the whole of the
 * guarantee that `/studio/preview` stays a faithful preview: it does not arm the
 * overlay, so no overlay is created, so nothing is ever blocked there.
 */

/**
 * Every pointer and mouse event, minus everything that scrolls.
 *
 * `mouseenter`/`mouseleave` and their pointer twins do not bubble, but they are
 * still dispatched through the capture phase to the ancestors on the path — so a
 * document-level capture listener does see them, and `Magnetic`'s `onMouseLeave`
 * (which React synthesises from `mouseout`) is covered twice over.
 */
const BLOCKED = [
  "pointerdown",
  "pointerup",
  "pointermove",
  "pointerover",
  "pointerout",
  "pointerenter",
  "pointerleave",
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseover",
  "mouseout",
  "mouseenter",
  "mouseleave",
  "click",
  "dblclick",
  "auxclick",
  "dragstart",
]

/** The ones whose default action is the thing being prevented. See above. */
const CANCELLED = new Set(["click", "auxclick", "dragstart"])

/** The overlay's chrome, and the field an editor is typing into. */
const EXEMPT = "[data-cms-overlay],[data-cms-editing]"

/**
 * Set on the framed `<html>` while the lock is up. Not read by any stylesheet —
 * it exists so "is the page locked" is answerable by looking at the document
 * rather than by inferring it from whether a click did anything.
 */
export const LOCK_ATTR = "data-cms-locked"

/**
 * @param {Window} frameWindow  the framed page's window — same origin, by construction
 * @returns {{release: () => void}}
 */
export function installInteractionLock(frameWindow) {
  const doc = frameWindow?.document
  if (!doc) return { release() {} }

  const onEvent = (event) => {
    const target = event.target
    // `closest` is missing on the document, on `window` and on a text node — all
    // of which can be a target here (`mouseleave` fires at the document when the
    // pointer leaves the frame). None of them is an exempt zone.
    if (target && typeof target.closest === "function" && target.closest(EXEMPT)) return
    event.stopPropagation()
    if (CANCELLED.has(event.type)) event.preventDefault()
  }

  for (const type of BLOCKED) doc.addEventListener(type, onEvent, true)
  doc.documentElement?.setAttribute(LOCK_ATTR, "")

  let live = true
  return {
    release() {
      if (!live) return
      live = false
      for (const type of BLOCKED) doc.removeEventListener(type, onEvent, true)
      doc.documentElement?.removeAttribute(LOCK_ATTR)
    },
  }
}
