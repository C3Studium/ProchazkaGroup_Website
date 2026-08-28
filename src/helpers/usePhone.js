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
export const usePhone = ({ eager = false } = {}) => {
    const [phone, setPhone] = useState(
        () => (eager && typeof window !== "undefined" ? window.matchMedia(PHONE).matches : false));

    useEffect(() => {
        const mq = window.matchMedia(PHONE);
        const read = () => setPhone(mq.matches);
        read();
        mq.addEventListener("change", read);
        return () => mq.removeEventListener("change", read);
    }, []);

    return phone;
};
