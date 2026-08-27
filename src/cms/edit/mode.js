// Is this render inside the CMS preview, with editing switched on?
//
// One boolean, and the whole of Contract A's "outside preview the helper
// returns {}" rests on how it is allowed to become true. Three properties are
// wanted at once and only one arrangement gives all three:
//
//   1. The public HTML must never carry a `data-cms-*` attribute.
//   2. The public bundle must never carry anything about editing.
//   3. The preview must not log a hydration mismatch, because a mismatch is a
//      console error and it makes React throw away and re-render the root —
//      on a page whose whole character is a scroll-driven timeline.
//
// So the flag is turned on *only from an effect* (see arm.js, called by _app).
// Effects do not run on the server, therefore no server render can ever see it
// true — not the public page, and not even the preview's own first pass — which
// settles (1) outright rather than by being careful. The first client render
// matches that server output exactly, which settles (3). The effect then
// re-renders the app, and the attributes appear one frame later.
//
// (2) is not this file's to settle any more and is stronger for it: the overlay
// is mounted by the Studio's preview host out of the Studio's bundle, so what
// the public build carries about editing is this flag, three attribute names and
// the helper that reads them.
//
// The alternative that keeps being suggested — set it when the preview module
// is imported — fails (1) in a way that is invisible until it is not: Next
// renders every page of an app in one Node process, and a module-scope flag set
// by the preview route is set for the public route rendering beside it.

let active = false

export const isEditMode = () => active

/**
 * Turn editing on or off. Called by `useEditArming` from an effect, and by
 * nothing else — there is no reason for a component to reach for this.
 */
export function setEditMode(on) {
  active = Boolean(on)
}
