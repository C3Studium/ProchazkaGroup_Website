// Where the control goes. Pure arithmetic, no DOM, so it can be reasoned about
// and tested away from a browser — which matters, because this is the part of
// the feature the client described most precisely and the part where "looks
// right on my screen" is worth nothing.
//
// ---------------------------------------------------------------------------
// One coordinate space
//
// Everything here is in the previewed page's own viewport pixels: the numbers
// `getBoundingClientRect()` returns inside the iframe. The frame is therefore
// always `0, 0 → innerWidth, innerHeight`, and a selection that is scrolled out
// simply has coordinates outside that box. There is no scroll offset in any of
// this and no rectangle crosses a document boundary.
//
// The control is counter-scaled by `1/zoom` so it stays legible while the frame
// emulates a phone, which means its size *in this space* is its layout size
// divided by the zoom. Callers pass the already-divided size; nothing below
// knows what zoom is. That keeps one conversion in one place.
// ---------------------------------------------------------------------------

export const clamp = (value, lo, hi) => (hi < lo ? lo : value < lo ? lo : value > hi ? hi : value)

/** Does any part of `rect` fall inside the frame? Nothing is anchored to a
 *  selection that is entirely scrolled away — the control would be a label
 *  pointing at nothing. */
export function isOnScreen(rect, frame) {
  return rect.right > 0 && rect.left < frame.width && rect.bottom > 0 && rect.top < frame.height
}

/**
 * Place the control against a selection.
 *
 * Horizontally the preference is **right-aligned**: the control's right edge
 * sits on the selection's right edge, so the pair reads as one object anchored
 * at the bottom-right corner. It flips to **left-aligned** — right edge on the
 * left edge is not what "bottom-left" means; the client's word for it is the
 * corner, and the corner is the selection's left one — when right-aligning
 * would push the control past the frame's right edge. That happens more often
 * than it sounds: an element wider than the frame, an element mid-way through a
 * horizontal-scroll section, and the homepage's own 624px-in-390px overflow at
 * phone width all produce a `rect.right` beyond `innerWidth`.
 *
 * Vertically the preference is **below**, flipping to **above** when the
 * control would fall out of the bottom. A third placement exists for the case
 * neither the client nor a devtools inspector can avoid: an element taller than
 * the frame has no outside edge on screen at all, so the control sits *inside*
 * it, held against the bottom of the visible part. Without that case a selected
 * full-height section pins its control off-screen and the feature looks broken
 * on the largest thing on the page.
 *
 * Candidates are tried in order and the first that fits wins; if none fits the
 * last one is clamped. "Fits" is measured against the frame inset by `gap`, so
 * a control never touches the edge of the viewport.
 *
 * @param {{left:number,top:number,right:number,bottom:number}} rect  selection
 * @param {{width:number,height:number}} control  size in frame pixels
 * @param {{width:number,height:number}} frame    the previewed viewport
 * @param {number} gap                            breathing room, frame pixels
 * @returns {{x:number,y:number,side:"right"|"left",place:"below"|"above"|"inside",fitted:boolean}}
 */
export function anchor(rect, control, frame, gap = 8) {
  // Two sets of bounds, and the difference between them is a decision worth
  // stating. A candidate *fits* if it is inside the frame — no inset, because
  // "the right edge would leave the frame" is a boundary and not a margin, and
  // a full-bleed section whose right edge is the viewport's right edge is the
  // commonest thing on this page. Requiring 8px of clearance there would flip
  // the control to the far side of a 1280px hero for no reason a person
  // looking at it could name.
  //
  // The inset bounds are for the last resort only: when nothing fits, the
  // control is being placed against the frame rather than against the element,
  // and there it should not be welded to the edge.
  const softX = [gap, frame.width - gap - control.width]
  const softY = [gap, frame.height - gap - control.height]
  const fitsX = (x) => x >= 0 && x + control.width <= frame.width
  const fitsY = (y) => y >= 0 && y + control.height <= frame.height

  // --- horizontal -----------------------------------------------------------
  const horizontal = [
    { x: rect.right - control.width, side: "right" },
    { x: rect.left, side: "left" },
  ]
  let h = horizontal.find((candidate) => fitsX(candidate.x))
  const hFitted = Boolean(h)
  if (!h) h = { x: clamp(horizontal[0].x, softX[0], softX[1]), side: horizontal[0].side }

  // --- vertical -------------------------------------------------------------
  // The third candidate is measured from the *visible* bottom of the selection,
  // not its real one, which is the whole point of it.
  const visibleBottom = Math.min(rect.bottom, frame.height)
  const vertical = [
    { y: rect.bottom + gap, place: "below" },
    { y: rect.top - gap - control.height, place: "above" },
    { y: visibleBottom - gap - control.height, place: "inside" },
  ]
  let v = vertical.find((candidate) => fitsY(candidate.y))
  const vFitted = Boolean(v)
  if (!v) v = { y: clamp(vertical[2].y, softY[0], softY[1]), place: vertical[2].place }

  return {
    x: h.x,
    y: v.y,
    side: h.side,
    place: v.place,
    // False means the frame is smaller than the control needs; the caller may
    // want to know, and the tests certainly do.
    fitted: hFitted && vFitted,
  }
}
