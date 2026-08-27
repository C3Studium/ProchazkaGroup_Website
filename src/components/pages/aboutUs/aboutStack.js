// The About page's first two sections are one mechanism, not two.
//
// AboutHero pins; MemberShowcase is pulled up over it, grows its first card out
// of the bottom-right corner and then rides left across the screen; and the
// hero is erased from the right in exactly the places the track has reached, so
// the two never overlap and never leave a gap between them.
//
// That last part only works if both sections agree about the same geometry, and
// three files trying to hold the same numbers by hand is how the hero's
// clear-out has already been mis-set twice. So the numbers live here once, the
// ratios are derived, and `trackXAt` is the single description of where the
// track is at any point — the showcase moves the track by it and the hero
// clears itself by it, which is why the two cannot come apart.
//
// The two stylesheets carry the heights as well and say so; they are the only
// other copies, because Sass cannot read this file.

// ---- the track ----------------------------------------------------------

/** One speaker: their card of copy, then their photograph. */
export const CARD_VW = 44;
export const PHOTO_VW = 32;
export const PAIR_VW = CARD_VW + PHOTO_VW;

export const MEMBER_COUNT = 3;
export const TRACK_VW = MEMBER_COUNT * PAIR_VW;

/** The last photograph ends flush with the right edge of the final screen. */
export const TRAVEL_VW = TRACK_VW - 100;

/**
 * The share of the showcase's scroll its first card spends growing — half of
 * it. The growth covers 72vw in that half and the ride covers 156vw in the
 * other, so the opening moves at roughly half the pace of the ride that follows
 * it. That is the point: it is the one moment of the section that is meant to
 * be watched rather than travelled through.
 */
export const GROW_TO = 0.442;

/**
 * Where the ride stops. The last eighth of the section is not travel — the
 * track is parked with the third card square in the middle of the screen and
 * the scroll buys nothing but time.
 *
 * That is deliberate. It is the stretch in which the discs are loose and the
 * pointer can reach them, and without it the room they land in is still sliding
 * in from the right when the section runs out. A section that ends on an
 * interaction has to stop moving first.
 */
export const RIDE_END = 0.779;

/**
 * Where the showcase is taken off the screen — not by fading and not by
 * scrolling away, but by being squeezed out. Colleagues' two halves close on
 * the seam from either side and this clips inwards to exactly their inner
 * edges, so the strip of showcase still showing shrinks to nothing at the
 * moment they meet. The two are the same movement seen from both sides.
 *
 * Between RIDE_END and here the track is parked and nothing is being taken
 * away: that stretch is the discs' playground.
 */
export const SQUEEZE_FROM = 0.911;

/** Where the seam between the two halves of Colleagues falls. */
export const SEAM_VW = 47;

/**
 * The card's leading edge, in vw from the left, at which it finally stands at
 * the full height of the viewport — a good way past the point where it has
 * finished widening, so the panel is still rising while it has already begun to
 * travel. Sixty per cent of the screen crossed, and not before.
 */
export const FULL_HEIGHT_AT_VW = 40;

/**
 * The finish. Everything the opening does arrives on this curve rather than at
 * a constant rate: a panel that stops dead at its final size reads as a value
 * running out, and one that decelerates into it reads as having been placed.
 *
 * It lives here rather than in either component because the hero clears itself
 * against the track's position — ease one of them and not the other and the two
 * edges, which are supposed to be the same edge, drift apart.
 */
const settle = (t) => {
    const x = Math.min(1, Math.max(0, t));
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * Where that curve is close enough to 1 for the eye to call it arrived. It
 * approaches its end asymptotically, so "finished" has to be a number: an
 * easing that technically completes at the last frame reads as having completed
 * a long time before, and the rise was landing at a quarter of the timeline
 * when it was supposed to land at 60% of the screen.
 */
const SETTLED = 0.864;

/** How far through its growth the first card is, eased. */
export const growthAt = (progress) => settle(progress / GROW_TO);

/**
 * Where the track's left edge comes to rest at the end of the growth.
 *
 * It used to be 100 - CARD_VW, which welded the card's right edge to the right
 * edge of the screen and left the growth entirely on the right-hand third. The
 * card now carries on past that: it opens out of the bottom-right corner and
 * comes to rest just left of centre, with its photograph filling the room it
 * has left behind on the right. The growth is a crossing of the screen, not an
 * expansion in a corner of it.
 */
export const LAND_AT_VW = 28;

/**
 * The track's left edge, in vw from the left of the screen, at a given point in
 * the showcase's own 0→1.
 *
 * Through the growth it walks from one screen out to RIDE_FROM_VW, which is
 * exactly the width the first card is gaining — that is what keeps the card's
 * right edge welded to the right edge of the screen. After that it is the ride.
 */
export const trackXAt = (progress) => {
    const p = Math.min(1, Math.max(0, progress));
    if (p <= GROW_TO) return 100 - (100 - LAND_AT_VW) * growthAt(p);
    if (p >= RIDE_END) return -TRAVEL_VW;
    return LAND_AT_VW - RIDE_SPAN_VW * ((p - GROW_TO) / (RIDE_END - GROW_TO));
};

/** How far the track travels once the growth is over. */
export const RIDE_SPAN_VW = LAND_AT_VW + TRAVEL_VW;

/** `settle` run backwards, so a position on the track can name its own moment. */
const unsettle = (y) => {
    const v = Math.min(1, Math.max(0, y));
    return v < 0.5
        ? Math.cbrt(v / 4)
        : 1 - Math.cbrt(2 * (1 - v)) / 2;
};

/**
 * The inverse of `trackXAt`: at what point in the showcase's 0→1 is the track's
 * left edge at a given place on the screen.
 *
 * Written because the growth now crosses most of the screen, so a rule stated
 * in vw — "full height once the leading edge has passed 60% of the screen" —
 * can land in either beat depending on how far the growth is set to travel. The
 * previous version assumed it always landed in the ride, and quietly gave the
 * wrong answer the moment that stopped being true.
 */
export const progressAtTrackX = (vw) => {
    if (vw >= LAND_AT_VW) {
        return unsettle((100 - vw) / (100 - LAND_AT_VW)) * GROW_TO;
    }
    return GROW_TO + (RIDE_END - GROW_TO) * ((LAND_AT_VW - vw) / RIDE_SPAN_VW);
};

/**
 * Where the growth's height finishes, expressed on the showcase's own 0→1 —
 * derived from FULL_HEIGHT_AT_VW rather than typed, so the rule stays "sixty
 * per cent of the screen" even if the track's geometry changes underneath it.
 */
export const FULL_HEIGHT_AT = progressAtTrackX(FULL_HEIGHT_AT_VW) / SETTLED;

/** How far through its rise the first pair is, eased. */
export const heightAt = (progress) => settle(progress / FULL_HEIGHT_AT);

// ---- the two boxes ------------------------------------------------------

/** `.AboutHero` — the non-sticky box the hero's scroll is measured against. */
export const HERO_BOX_VH = 460;

/** `.MemberShow` — its full height, and how far it is pulled up over the hero. */
// 665vh, and the four fractions above are what carve it up. They look
// arbitrary and are not: they are chosen so the growth still gets its 250vh and
// the ride its 190vh — the lengths those two were tuned to — while the play and
// the squeeze are added on top rather than taken out of them. Change this
// height and all four have to be recomputed, or the discs and the track quietly
// speed up.
export const SHOW_VH = 665;
export const SHOW_OVERLAP_VH = 410;

// Scroll available to each, once the pinned viewport is taken off the top.
export const HERO_MEASURE_VH = HERO_BOX_VH - 100;
export const SHOW_SCROLL_VH = SHOW_VH - 100;

/**
 * Where the showcase's box begins, in page scroll — which is also the point at
 * which the hero has finished moving and pins.
 */
export const PIN_AT_VH = HERO_BOX_VH - SHOW_OVERLAP_VH;

/** The hero's own 0→1 at the moment it pins. All of its motion is before this. */
export const HERO_PINS_AT = PIN_AT_VH / HERO_MEASURE_VH;

// ---- the third box ------------------------------------------------------

/** `.Colleagues` — its own non-sticky measuring box, and its pull back over
 * the showcase. It is pulled up so its stage pins exactly where the squeeze
 * begins: the halves closing and the showcase being cut away are one event.
 */
export const COLLEAGUES_BOX_VH = 260;
export const COLLEAGUES_OVERLAP_VH = 150;

/**
 * How much of Colleagues' own scroll the arrival takes. The rest of its pin is
 * spent drawing its detail in — rails, row rules, the frame round the portrait.
 */
export const ARRIVE_TO = 0.375;

/**
 * The showcase's own 0→1, read off the hero's. The hero clears itself against
 * the track's position, so it has to be able to ask where the track is.
 */
export const showcaseProgressFromHero = (heroProgress) =>
    Math.min(1, Math.max(0, (heroProgress * HERO_MEASURE_VH - PIN_AT_VH) / SHOW_SCROLL_VH));
