"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { CURTAIN, RISE, group } from "@/components/common/ui/entrance";
import { useGlobalContext } from "@/context/LoadProvider";

// The navbar wall's arithmetic, three members wide: the reached-for tile takes
// and its neighbours give exactly that up, so the row is full to its edges at
// every frame with nothing to overlap.
// The navbar wall's arithmetic over any one row of the stair.
const spread = (bases, active) => {
    if (active < 0) return bases;
    const GROW = 1.3;
    const FLOOR = 0.74;
    const weights = bases.map((b, i) =>
        (i === active ? 0 : b / Math.pow(Math.abs(i - active), 1.35)));
    const wsum = weights.reduce((a, b) => a + b, 0) || 1;
    const wanted = (GROW - 1) * bases[active];
    const out = bases.map((b, i) =>
        (i === active ? 0 : Math.max(b * FLOOR, b - wanted * (weights[i] / wsum))));
    const freed = out.reduce((sum, v, i) => (i === active ? sum : sum + (bases[i] - v)), 0);
    out[active] = bases[active] + freed;
    return out;
};

const TOP_BASES = [1.5, 1];
const BOTTOM_BASES = [1, 1, 1, 1];

// The six tips, in the site's plain voice. Rendered where the L seats them:
// four along the foot, two up the right edge.
const TIPS = [
    ["Tip 01", "Všechno podstatné je v menu nahoře."],
    ["Tip 02", "Nabídka má vlastní stránku — co pro vás vyřešíme a za kolik."],
    ["Tip 03", "Recenze klientů najdete pod vlastní adresou /recenze."],
    ["Tip 04", "Spojit se s námi jde kdykoli — vpravo nahoře."],
    ["Tip 05", "Benefit program: doporučení, které se počítá."],
];

const TILE_SPRING = { type: "spring", stiffness: 150, damping: 26, restDelta: 0.001 };
// The rise and the notch are ONE gesture, so they run on ONE clock: the same
// curtain tween for height and clip-path. Split across a spring and a tween
// they arrived on different curves and the seam breathed open mid-flight —
// which read as the animation lacking fluency. The widths keep the navbar
// spring; the vertical pair keeps each other.
const VERT = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const TILE_TRANSITION = { ...TILE_SPRING, height: VERT, clipPath: VERT };

// TWIN of the stacked gate at the foot of styles.scss —
// `@media (max-width: 899.98px), (max-height: 520px)`. Keep the two literally
// identical: the script has to know which composition the stylesheet has put on
// screen, because the L's arithmetic (fixed-vh rows, the notch cut in vw) is
// meaningless once the tiles are a one- or two-column grid, and framer's inline
// heights would sit on top of that grid and win.
//
// The height arm is not decoration. A phone in landscape — 844×390, 932×430 —
// is as WIDE as a small tablet and 390px TALL: on width alone it would keep two
// rows of 33vh + 28vh tiles inside 390px of viewport, which is how five of the
// six tiles ended up below the section's `overflow: hidden` and simply gone.
const STACKED_MQ = "(max-width: 899.98px), (max-height: 520px)";

// Read after mount, never guessed: the server has no viewport and no pointer to
// ask about, and a guess that disagrees with the client is a hydration mismatch
// on every phone that loads this page.
function useMedia(query) {
    const [on, setOn] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(query);
        const sync = () => setOn(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, [query]);

    return on;
}

// When a bottom tile rises into the top row's band, the box ABOVE it becomes
// the polygon: a notch is cut out of its bottom edge exactly over the risen
// tile's span, so the two interlock like one tiling instead of two rectangles
// sliding past each other — the partition, not an overlap.
//
// The geometry is closed-form because rows only trade within themselves: while
// a bottom tile is hovered the top row is at rest, so every x below is known
// in vw. Stage coords: the bottom row runs 4→80vw, the top row 38→80vw with
// the way home taking 1.5 shares of its 42vw.
const B_LEFT = 4;
const B_INNER = 76;
const T_LEFT = 38;
const T_INNER = 42;
const GO_W = (1.5 / 2.5) * T_INNER;
const RISE_VH = 4;

// Eight points in both states, so the clip interpolates; at rest the notch is
// a zero-width slit at mid-edge.
const restNotch = () =>
    "polygon(0% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 100%, 50% 100%, 50% 100%, 0% 100%)";

const notchClip = (tileLeftVw, tileWVw, tileHVh, bottomShares, hotIndex) => {
    if (hotIndex < 0) return restNotch();
    const sum = bottomShares.reduce((a, b) => a + b, 0);
    const widths = bottomShares.map((g) => (g / sum) * B_INNER);
    let x = B_LEFT;
    for (let j = 0; j < hotIndex; j += 1) x += widths[j];
    const a = Math.max(tileLeftVw, x);
    const b = Math.min(tileLeftVw + tileWVw, x + widths[hotIndex]);
    if (b - a < 0.5) return restNotch();
    const A = (((a - tileLeftVw) / tileWVw) * 100).toFixed(2);
    const B = (((b - tileLeftVw) / tileWVw) * 100).toFixed(2);
    const cut = (100 - (RISE_VH / tileHVh) * 100).toFixed(2);
    return `polygon(0% 0%, 100% 0%, 100% 100%, ${B}% 100%, ${B}% ${cut}%, ${A}% ${cut}%, ${A}% 100%, 0% 100%)`;
};

// The 404 in the site's own grammar: one giant ghost numeral in the
// BenefitJourney register standing on a baseline, the structural lines drawing
// themselves in junction order — baseline first, then the vertical dropping
// out of it to the row of tiles that answers — go home, what happened,
// where everything else lives — trading the row the navbar wall's way.
//
// Everything enters on load (`animate`, not `whileInView`: there is nothing to
// scroll to on a first-paint page) through one motion tree, each element
// carrying its own delay so the order reads: words, numeral, then the lines,
// then the caption the lines lead to.
export default function NotFound404() {
    const { gate } = useGlobalContext();
    const go = gate === "go";
    // Every delay and duration collapses for a reader who has asked for that —
    // the DOM this renders is identical either way, only the transitions
    // differ, so first paint and hydration agree.
    const reduce = useReducedMotion();

    // Three independent questions about the device, none of them answerable
    // from width: what composition is on screen, whether there is a pointer to
    // follow, and whether there is a hover to rely on.
    const stacked = useMedia(STACKED_MQ);
    const fine = useMedia("(hover: hover) and (pointer: fine)");
    const coarse = useMedia("(hover: none)");

    // Which tile of which step is being reached for.
    const [reach, setReach] = useState(null);

    // Stacked there is no row above to intrude into and no fixed-vh band to
    // rise out of, so nothing may stay reached-for across the change — a tile
    // left active while the viewport rotates would keep an inline height that
    // the grid has no use for.
    useEffect(() => {
        if (stacked) setReach(null);
    }, [stacked]);

    const top = spread(TOP_BASES, reach && reach.row === 0 ? reach.i : -1);
    const bottom = spread(BOTTOM_BASES, reach && reach.row === 1 ? reach.i : -1);

    // The notch each top tile yields to a risen bottom tile.
    const hotBelow = reach && reach.row === 1 ? reach.i : -1;
    const goNotch = notchClip(T_LEFT, GO_W, 33, bottom, hotBelow);
    const tipNotch = notchClip(T_LEFT + GO_W, T_INNER - GO_W, 28, bottom, hotBelow);

    const isHot = (row, i) => !!reach && reach.row === row && reach.i === i;

    // Stacked, framer must hand the tile back to the grid: no share of a row
    // that no longer trades, no fixed band height, and the notch parked at its
    // rest polygon — which is a plain rectangle, so the clip is still a clip
    // and still interpolates if the viewport turns back.
    const boxAnim = (grow, hot, restVh, hotVh, clip) => {
        const base = stacked
            ? { flexGrow: 0, height: "auto" }
            : { flexGrow: grow, height: hot ? hotVh : restVh };
        return clip ? { ...base, clipPath: stacked ? restNotch() : clip } : base;
    };

    // The reach, on either kind of pointer.
    //
    // A mouse simply carries it, and `pointerenter` is the honest event for
    // that. A finger has to be GIVEN it: a tap fires `pointerenter` with no
    // `pointerleave` ever to follow, so on touch that handler would latch the
    // growth on the first tile touched and never release it. On touch the tile
    // is taken by a tap and given back by a second one.
    const reachProps = (row, i) => {
        if (stacked) return {};
        if (coarse) return { onClick: () => setReach(isHot(row, i) ? null : { row, i }) };
        return { onPointerEnter: () => setReach({ row, i }) };
    };

    // The way home is the one tile that is a link, so its second tap is not a
    // toggle — it is the navigation. Which means the FIRST tap must not be an
    // anchor click at all: PageVeil intercepts every internal <a> in the
    // CAPTURE phase, on document, before any handler in this component could
    // preventDefault — so a dimmed Link would start the page transition no
    // matter what this file decided. Unreached on touch, the tile is a
    // <button> and the tap belongs to the stair; it becomes the real Link the
    // moment it is reached, and the second tap leaves through the veil exactly
    // like a desktop click. This is the navbar panel's answer to the same
    // problem, and it is the same answer for the same reason.
    const goClosedOnTouch = coarse && !stacked && !isHot(0, 0);
    const GoInner = goClosedOnTouch ? "button" : Link;
    const goInnerProps = goClosedOnTouch
        ? { type: "button", onClick: () => setReach({ row: 0, i: 0 }) }
        : { href: "/", "data-cursor": "frame", "data-cursor-label": "Domů" };

    // Touch has no "off the tiles" the way a pointer does, so the stage
    // provides one: a tap on the ground puts every tile back.
    const dismiss =
        coarse && !stacked
            ? (e) => {
                if (!e.target?.closest?.(".NotFound404__box")) setReach(null);
            }
            : undefined;

    // The numeral answers the hand: the figure leans a few degrees toward the
    // pointer on two damped springs. It is the depth's proof — an extrusion
    // that never moves might as well be a shadow. Gated to fine pointers and
    // stilled under reduced motion: on touch there is no pointer to follow, so
    // the figure keeps its static composition and the springs stay at zero.
    const leanX = useSpring(0, { stiffness: 60, damping: 18 });
    const leanY = useSpring(0, { stiffness: 60, damping: 18 });
    const rotateX = useTransform(leanY, (v) => `${v}deg`);
    const rotateY = useTransform(leanX, (v) => `${v}deg`);

    const stageRef = useRef(null);
    const follow = useCallback(
        (e) => {
            if (!fine || reduce) return;
            const box = stageRef.current?.getBoundingClientRect();
            if (!box) return;
            const nx = (e.clientX - box.left) / box.width - 0.5;
            const ny = (e.clientY - box.top) / box.height - 0.5;
            leanX.set(nx * 10);
            leanY.set(-ny * 7);
        },
        [fine, reduce, leanX, leanY],
    );
    const rest = useCallback(() => {
        leanX.set(0);
        leanY.set(0);
    }, [leanX, leanY]);

    const rise = (delay) => ({
        hidden: RISE.hidden,
        shown: {
            opacity: 1,
            y: 0,
            transition: reduce ? { duration: 0 } : { duration: 0.53, ease: CURTAIN, delay },
        },
    });

    const drawX = (delay) => ({
        hidden: { scaleX: 0 },
        shown: {
            scaleX: 1,
            transition: reduce ? { duration: 0 } : { duration: 0.75, ease: CURTAIN, delay },
        },
    });

    const drawY = (delay) => ({
        hidden: { scaleY: 0 },
        shown: {
            scaleY: 1,
            transition: reduce ? { duration: 0 } : { duration: 0.42, ease: CURTAIN, delay },
        },
    });

    const fade = (delay) => ({
        hidden: { opacity: 0 },
        shown: {
            opacity: 1,
            transition: reduce ? { duration: 0 } : { duration: 0.45, ease: CURTAIN, delay },
        },
    });

    const tileTransition = reduce ? { duration: 0.4, ease: CURTAIN } : TILE_TRANSITION;

    return (
        <motion.section
            className="NotFound404"
            variants={group()}
            initial="hidden"
            animate={go ? "shown" : undefined}
        >
            <div
                className="NotFound404__stage"
                ref={stageRef}
                onPointerMove={fine ? follow : undefined}
                onPointerLeave={fine ? rest : undefined}
                onPointerDown={dismiss}
            >
                <motion.p className="NotFound404__eyebrow" variants={rise(0.03)}>
                    <em>404</em> — Stránka nenalezena
                </motion.p>

                {/* One quiet off-grid tick opposite the eyebrow. */}
                <motion.span
                    className="NotFound404__tick NotFound404__tick--head"
                    variants={fade(0.78)}
                    aria-hidden="true"
                />

                {/* The numeral itself — the eyebrow already says 404 for a
                    screen reader, this is the picture of it: the solid ghost
                    and an outline echo a step off-axis behind it. */}
                <motion.div className="NotFound404__figure" variants={rise(0.09)} aria-hidden="true">
                    {/* The depth: outline slices stepping away on one diagonal
                        and back in z under the solid face, the whole figure in
                        a perspective that leans toward the pointer. It is the
                        page's BACKGROUND now — the L of tiles stands on it. */}
                    <motion.div className="NotFound404__solid" style={{ rotateX, rotateY }}>
                        <span className="NotFound404__slice">404</span>
                        <span className="NotFound404__numeral">404</span>
                    </motion.div>
                </motion.div>

                {/* The L: two boxes above, four below, flush left — and the
                    FIRST box of the first row is the way home, half again as
                    wide as any tip. Each row trades the navbar wall's way.
                    Stacked, the same six become a column (or two), the way home
                    and the first tip spanning it: the L's own grouping, laid
                    flat rather than re-invented. */}
                <motion.div className="NotFound404__stair" variants={rise(0.45)}>
                    <div
                        className="NotFound404__step NotFound404__step--top"
                        onPointerLeave={coarse || stacked ? undefined : () => setReach(null)}
                    >
                        <motion.div
                            className="NotFound404__box NotFound404__box--go"
                            style={{ flexBasis: 0 }}
                            data-hot={isHot(0, 0) ? "true" : undefined}
                            animate={boxAnim(top[0], isHot(0, 0), "33vh", "37vh", goNotch)}
                            transition={tileTransition}
                            {...(coarse ? {} : reachProps(0, 0))}
                        >
                            <GoInner className="NotFound404__box__link" {...goInnerProps}>
                                <span className="NotFound404__box__body">
                                    <span className="NotFound404__box__cap">Nejrychlejší cesta</span>
                                    <span className="cornerButton NotFound404__goLabel">
                                        <span className="corner corner--tl" />
                                        <span className="corner corner--tr" />
                                        <span className="corner corner--bl" />
                                        <span className="corner corner--br" />
                                        Zpět na hlavní stránku
                                    </span>
                                </span>
                            </GoInner>
                        </motion.div>
                        <motion.div
                            key="0-1"
                            className="NotFound404__box"
                            style={{ flexBasis: 0 }}
                            data-hot={isHot(0, 1) ? "true" : undefined}
                            animate={boxAnim(top[1], isHot(0, 1), "28vh", "32vh", tipNotch)}
                            transition={tileTransition}
                            {...reachProps(0, 1)}
                        >
                            <span className="NotFound404__box__body">
                                <span className="NotFound404__box__cap">{TIPS[0][0]}</span>
                                <span className="NotFound404__box__text">{TIPS[0][1]}</span>
                            </span>
                        </motion.div>
                    </div>

                    <div
                        className="NotFound404__step NotFound404__step--bottom"
                        onPointerLeave={coarse || stacked ? undefined : () => setReach(null)}
                    >
                        {[0, 1, 2, 3].map((i) => (
                            <motion.div
                                key={`1-${i}`}
                                className="NotFound404__box"
                                style={{ flexBasis: 0 }}
                                data-hot={isHot(1, i) ? "true" : undefined}
                                animate={boxAnim(bottom[i], isHot(1, i), "28vh", "32vh", null)}
                                transition={tileTransition}
                                {...reachProps(1, i)}
                            >
                                <span className="NotFound404__box__body">
                                    <span className="NotFound404__box__cap">{TIPS[i + 1][0]}</span>
                                    <span className="NotFound404__box__text">{TIPS[i + 1][1]}</span>
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.section>
    );
}
