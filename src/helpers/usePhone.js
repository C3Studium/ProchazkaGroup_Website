import { useEffect, useState } from "react";

// ── what a phone is, in JS ──
//
// Portrait AND under 600px, both bounds meant. A phone on its side is a
// different composition everywhere this is asked — `phs-h` / `phl-h` in the
// stylesheets own it — and portrait on its own is also every tablet ever made.
//
// 600 rather than a bound nearer the widest phone we target (430) because the
// navigation panel, which hosts the first of the three components that ask,
// switches to its own phone layout there: left at 750 the two disagreed across
// a 150px band, where a small tablet in portrait got a grid of thumbnails
// inside a panel still laid out as a tablet. It is also the site's own `$v md`
// stop (bpV.md in ./checkViewport.js, `$v` in styles/system/_breakpoints.scss),
// and it sits in the empty gap between the widest phone we target and the
// narrowest tablet in portrait, 768.
//
// This string is the TWIN of `@include v(xs) { @include below-px(600) { … } }`
// in the stylesheet of every component that reads it, and the pair has to
// agree: the stylesheet lays a thing out, this decides what the thing IS.
// Disagreeing, they produce a grid of tiles with a list's markup in it, or a
// record panel that nothing can put anybody into.
//
// It lives here, and not in the three components, because it had already been
// copied twice by the time the third asked for it — the same argument that put
// `rootRamp` in ./checkViewport.js. There is one bound, so there is one place
// to change it.
export const PHONE = "(min-width: 320px) and (orientation: portrait) and (max-width: 600px)";

// ── and what a phone on its SIDE is ──
//
// The twin of `@include phs-h`, exactly as PHONE is the twin of
// `v(xs) + below-px(600)`: min-width 480, max-height 520, landscape, straight
// out of $h / $h-constraints in styles/system/_breakpoints.scss. 520 is chosen
// there to clear the tallest phone lying down (430) with the browser's own
// furniture on top and still sit well under the shortest tablet in landscape
// (768), so what this matches is a phone and a desktop window somebody has
// squashed to the height of one.
//
// `phs` and not `phl`: `phl` starts at 800, which is the 13 and the 15 Pro Max
// and nothing else — the SE at 568 and the 8 at 667 are phones on their side
// too, and phs holds all of them.
//
// A SECOND string rather than a loosening of the one above. Three components
// read PHONE, and every one of them means "upright" by it: the navigation's
// advisor roster, /o-nas' colleagues, the benefit programme's picker. A phone
// lying down is a different composition in each, and widening PHONE would hand
// all three a layout none of them has been drawn.
export const PHONE_LANDSCAPE = "(min-width: 480px) and (max-height: 520px) and (orientation: landscape)";

// A phone, held either way round. A media query LIST is an or, so the two
// strings with a comma between them is precisely that — one matchMedia, one
// listener, and no third bound to keep in step with the other two.
export const PHONE_ANY = `${PHONE}, ${PHONE_LANDSCAPE}`;

// ── upright, up to a tablet ──
//
// PHONE with its ceiling at 900 instead of 600, and it exists because one
// component wants that and the others do not.
//
// The navigation's advisor sheet is drawn two ways: a grid of 3:4 tiles with the
// chosen one enlarged at its foot, or a wall wide enough to stand ten faces
// across. A tablet held upright is the first of those, only bigger — 818px of
// width does not make a wall of ten, it makes the same grid with more room in
// it.
//
// Its own constant rather than a wider PHONE. That string is the twin of the
// stylesheet's phone block in THREE components — this roster, /o-nas'
// colleagues and the benefit programme's picker — and widening it would hand
// the other two a layout neither has been drawn. Same argument as the note on
// PHONE_LANDSCAPE above, from the other direction.
export const PHONE_OR_TABLET_UPRIGHT =
    "(min-width: 320px) and (orientation: portrait) and (max-width: 900px)";

/**
 * The shared body of the hooks below: a media query as a piece of state.
 *
 * `query` is always one of the module constants above, so the dependency never
 * actually changes — it is declared because the effect reads it, not because
 * anything is expected to swap it out.
 */
const useQuery = (query, eager) => {
    const [on, setOn] = useState(
        () => (eager && typeof window !== "undefined" ? window.matchMedia(query).matches : false));

    useEffect(() => {
        const mq = window.matchMedia(query);
        const read = () => setOn(mq.matches);
        read();
        mq.addEventListener("change", read);
        return () => mq.removeEventListener("change", read);
    }, [query]);

    return on;
};

/**
 * Whether this is a phone held upright, as a piece of state.
 *
 * `eager` is the difference between the two ways the answer can be wrong for
 * one frame, and which one is acceptable depends on where the component mounts:
 *
 * - Left off (the default), the first answer is `false` and the truth arrives
 *   from the effect. That is what a server-rendered component needs — the first
 *   client render has to agree with markup written where there was no viewport
 *   to measure, and anything else is a hydration mismatch.
 *
 * - Set, the first answer is read from `matchMedia` directly. Only safe for a
 *   component that cannot be server-rendered — one behind a `{open && …}` that
 *   only ever mounts from a tap — and worth it there, because answering `false`
 *   first would mean one committed render of the wide-screen branch: portraits
 *   a phone asks the network for and then throws away, and subtrees React tears
 *   down to swap one element for another.
 */
export const usePhone = ({ eager = false } = {}) => useQuery(PHONE, eager);

/**
 * Whether this is a phone at all, held either way round — PHONE_ANY above.
 *
 * Same `eager` contract as usePhone, and the same warning attached to it: set
 * it only on a component that cannot be server-rendered.
 *
 * The name is the whole point of it being separate. `usePhone()` answers "is
 * this a phone standing up", which is a question about a LAYOUT; this one
 * answers "is this a phone", which is a question about the DEVICE. Read one
 * where the other was meant and the answer is wrong on exactly the screens
 * nobody tests on.
 */
export const usePhoneAny = ({ eager = false } = {}) => useQuery(PHONE_ANY, eager);

/**
 * Whether this is held upright and no wider than a tablet —
 * PHONE_OR_TABLET_UPRIGHT above. One caller: the navigation's advisor sheet.
 */
export const usePhoneOrTabletUpright = ({ eager = false } = {}) =>
    useQuery(PHONE_OR_TABLET_UPRIGHT, eager);
