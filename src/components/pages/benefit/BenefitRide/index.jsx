"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
    motion,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";

import { CURTAIN, ENTERS, RISE, group } from "@/components/common/ui/entrance";

// A sprung number as a vh length. Tiny, but it keeps the select-between-raw-
// and-sprung pattern readable where it is used.
const useTransformTemplateVh = (mv) => useTransform(mv, (v) => `${v.toFixed(3)}vh`);

// Benefit program — section 03, the rewards as one horizontal editorial ride.
//
// A tall section pins a full-screen stage and the scroll drives one track of
// pieces right-to-left. The track is set like a magazine spread, not a grid:
// each level OPENS with a full-height cover card, its remaining vouchers stand
// behind it as a quieter two-row cluster, and the two big rewards run as
// cinematic full-height panels. The far end is one dark cell holding the sum.
// Size is money, and rhythm is the read: cover — cluster — cover — cluster —
// panel — panel — total.
//
// Where the navbar's grow-and-push physics lives now, and why only there: a
// share that changes anywhere on the top line re-lays-out the whole 290vw
// track — three screens of images per spring frame, which is exactly the
// stutter this section was rejected for. So the top line never changes size.
// The push happens INSIDE a cluster — a 40vw box with four cards — where a
// frame's layout is cheap and the spring can actually be felt. The covers and
// panels answer the pointer the editorial way instead: the photograph comes to
// full colour and the detail line is given room, nothing resizes.

// ── the data ────────────────────────────────────────────────────────────

const TIERS = [
    { amount: 500, brands: "Kaufland nebo Shell" },
    { amount: 1000, brands: "Kaufland, Shell nebo Alza" },
    { amount: 15000, brands: "Alza, AboutYou nebo Zalando" },
    { amount: 25000, brands: "Alza nebo wellness pobyt" },
];

// Czech money, glued with non-breaking spaces — "47 500 Kč" never breaks.
const czk = (n) => `${n.toLocaleString("cs-CZ").replace(/\s/g, " ")} Kč`;

const M = (at, tier, file, base = 1) => ({ at, tier, file, base });

// Each level: a cover (its first voucher, full height) and the rest as a
// cluster of two independent rows — independent so their seams never align.
const LEVELS = [
    {
        cover: M(1, 0, "DOP01"),
        top: [M(2, 0, "DOP02", 1.1), M(3, 0, "DOP03", 0.9)],
        bottom: [M(4, 0, "DOP04", 0.94), M(5, 0, "DOP05", 1.06)],
    },
    {
        cover: M(6, 1, "DOP06"),
        top: [M(7, 1, "DOP07", 0.92), M(8, 1, "DOP08", 1.08)],
        bottom: [M(9, 1, "DOP09", 1.12), M(10, 1, "DOP10", 0.88)],
    },
];

// The track, in journey order. Widths in vw — the ride is stated in vw and the
// travel is the track's width minus one screen.
const MARK_VW = 4.5;
const GAP_VW = 0.7;

// The editorial pieces grow too — into WIDTH — and they do it the same way
// everything on this site grows: by taking from a neighbour that gives. What
// keeps it fluid is that the taking is local. A level is one fixed-width
// group in which the cover and its cluster trade; the two cinematic panels
// are one fixed-width trio in which they trade with each other across the
// level marker between them. The top line's segment widths still never
// change, so no hover ever asks three screens of track to re-lay themselves.
const COVER_VW = 25;
const CLUSTER_VW = 40;
const GROUP_VW = COVER_VW + GAP_VW + CLUSTER_VW;
const P20_VW = 46;
const P30_VW = 54;
const TRIO_VW = P20_VW + GAP_VW + MARK_VW + GAP_VW + P30_VW;

const PANELS = [M(20, 2, "DOP11"), M(30, 3, "DOP12")];

const SEGS = [
    { kind: "mark", level: 1, vw: MARK_VW },
    { kind: "group", level: 0, vw: GROUP_VW },
    { kind: "mark", level: 2, vw: MARK_VW },
    { kind: "group", level: 1, vw: GROUP_VW },
    { kind: "mark", level: 3, vw: MARK_VW },
    { kind: "trio", vw: TRIO_VW },
    { kind: "dest", vw: 38 },
];

// The sum — computed, never typed.
const TOTAL = [...LEVELS.flatMap((l) => [l.cover, ...l.top, ...l.bottom]), ...PANELS]
    .reduce((sum, m) => sum + TIERS[m.tier].amount, 0);

// ── the geometry of the ride ────────────────────────────────────────────

const SEG_LEFT = [];
let acc = 0;
for (const seg of SEGS) {
    SEG_LEFT.push(acc);
    acc += seg.vw + GAP_VW;
}
const TRACK_VW = acc - GAP_VW;
const TRAVEL_VW = TRACK_VW - 100;

// Where the travel ends on the section's own 0→1 — the last twentieth is the
// destination standing still, fully on screen before the stage lets go.
const RIDE_END = 0.95;

// Level 4's marker stands inside the trio, between the two panels — its
// centre is worked out from the trio's own layout rather than a segment edge.
const MARK_CENTERS = [
    ...SEGS.map((seg, i) => (seg.kind === "mark" ? { level: seg.level, center: SEG_LEFT[i] + seg.vw / 2 } : null)).filter(Boolean),
    { level: 4, center: SEG_LEFT[SEGS.findIndex((s) => s.kind === "trio")] + P20_VW + GAP_VW + MARK_VW / 2 },
];

const LEVEL_AT = MARK_CENTERS
    .sort((a, b) => a.level - b.level)
    .map(({ level, center }) => ({
        level,
        at: Math.max(0.02, (RIDE_END * (center - 50)) / TRAVEL_VW),
        left: (center / TRACK_VW) * 100,
    }));

// ── the push, where it can be felt ──────────────────────────────────────
//
// The navbar wall's arithmetic: the reached-for member takes, the others give
// in proportion to how near they are, the floors keep everyone legible, and
// whatever the floors refuse to give is not taken — so a line's shares always
// sum to its rest total and the line is full to its edges at every frame.
const spread = (bases, active, grow, floor) => {
    const n = bases.length;
    if (active < 0 || active >= n || n < 2) return bases;
    const floorOf = (i) => (Array.isArray(floor) ? floor[i] : floor);

    const weights = [];
    let wsum = 0;
    for (let i = 0; i < n; i++) {
        if (i === active) { weights.push(0); continue; }
        const w = 1 / Math.pow(Math.abs(i - active), 1.35);
        weights.push(w);
        wsum += w;
    }

    const wanted = (grow - 1) * bases[active];
    const out = bases.map((b, i) =>
        (i === active ? 0 : Math.max(b * floorOf(i), b - wanted * (weights[i] / wsum))));

    const freed = out.reduce((sum, v, i) => (i === active ? sum : sum + (bases[i] - v)), 0);
    out[active] = bases[active] + freed;
    return out;
};

const CELL_GROW = 1.6;
const ROW_GROW = 1.34;
// The editorial pieces' width growth: a cover takes from its cluster, a panel
// takes from the other panel (the marker between them holds its ground).
const COVER_GROW = 1.3;
const PANEL_GROW = 1.2;
const CELL_FLOOR = 0.55;
const ROW_FLOOR = 0.7;
const ROW_BASES = [1.04, 0.96];

// The navbar wall's springs.
const WIDTH_SPRING = { type: "spring", stiffness: 150, damping: 26, restDelta: 0.001 };
const HEIGHT_SPRING = { type: "spring", stiffness: 170, damping: 26, restDelta: 0.001 };
const STILL = { duration: 0 };

// Under reduced motion the hover does not snap, it eases. The preference is
// about motion the page inflicts — parallax, autoplay, things that travel on
// their own. A box growing under the reader's own pointer is feedback they
// asked for, and cutting it to zero duration reads as the page being broken,
// which is exactly how it was reported. So: no spring, no overshoot, one
// short curtain ease.
const CALM_HOVER = { duration: 0.45, ease: CURTAIN };

const altOf = (m) =>
    `Tištěná poukázka za ${m.at}. doporučení — ${czk(TIERS[m.tier].amount)}`;

// ── reaching for a card, whichever way the device offers ────────────────
//
// The ride's whole reveal — the photograph coming to colour, the brands line
// being given room, the box taking width from its neighbours — hangs off one
// piece of state per group. On a fine pointer that state follows the pointer
// in and out and costs no click. A touch device has no in and no out, so the
// SAME state is bound to the tap, and a second tap on the open card closes it.
// Nothing on this section is reachable only by hovering.
//
// `canHover` is the switch, and it is also why `onPointerLeave` is bound only
// when it is true: on touch a `pointerleave` fires the instant the finger
// lifts, so a leave handler would shut the card the tap had just opened —
// the mirror of the latched-hover bug, and just as invisible in a mouse test.
const reachProps = ({ canHover, isOpen, open, close }) => ({
    className: isOpen ? " is-open" : "",
    role: "button",
    tabIndex: 0,
    "aria-expanded": isOpen,
    onPointerEnter: canHover ? open : undefined,
    // A fine pointer never closes on click — it has a leave for that, and a
    // click that undid the hover would read as the card flinching.
    onClick: isOpen && !canHover ? close : open,
    onKeyDown: (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        (isOpen ? close : open)();
    },
});

// The flat journey for the phone's swipe strip: strict 1 → 30 order.
const FLAT = SEGS.flatMap((seg) => {
    if (seg.kind === "group") {
        const l = LEVELS[seg.level];
        return [
            { kind: "cell", m: l.cover, big: true },
            ...[...l.top, ...l.bottom].sort((a, b) => a.at - b.at).map((m) => ({ kind: "cell", m })),
        ];
    }
    if (seg.kind === "trio") {
        return [
            { kind: "cell", m: PANELS[0], big: true },
            { kind: "mark", level: 4 },
            { kind: "cell", m: PANELS[1], big: true },
        ];
    }
    return [seg];
});

// One card's face. No hooks — fixed markup shared by every kind of cell. The
// detail line is revealed by CSS alone (:hover on the cell, or standing open on
// the editorial pieces), so pointing at a card costs no React work at all.
const face = (m, big, delay, calm) => (
    <motion.div
        className="BenefitRide__face"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={ENTERS}
        transition={calm ? STILL : { duration: 0.7, ease: CURTAIN, delay }}
    >
        <Image
            src={`/assets/benefit-cards/${m.file}.webp`}
            alt={altOf(m)}
            fill
            quality={70}
            sizes={big ? "(max-width: 900px) 76vw, 50vw" : "(max-width: 900px) 66vw, 24vw"}
            style={{ objectFit: "cover" }}
        />
        <span className="BenefitRide__scrim" aria-hidden="true" />

        <span className="BenefitRide__ord">
            <span className="BenefitRide__ord__n">{m.at}.</span>
            <span className="BenefitRide__ord__cap">doporučení</span>
        </span>

        <span className="BenefitRide__foot">
            {/* Size follows the piece, colour follows the money: a cover is
                big because it opens a chapter, but only the two rewards the
                whole ride exists for carry the accent. */}
            <span className={`BenefitRide__amount${big && m.tier >= 2 ? " BenefitRide__amount--big" : ""}`}>
                {czk(TIERS[m.tier].amount)}
            </span>
            <span className="BenefitRide__more">
                <span>
                    <span className="BenefitRide__brands">
                        Poukaz — {TIERS[m.tier].brands}
                    </span>
                </span>
            </span>
        </span>
    </motion.div>
);

// One level as a group of its own: the cover and its cluster trading a fixed
// width between them, a component of its own so a hover re-renders sixty-five
// vw of page, not two hundred ninety. Its own state, its own fixed hooks.
function LevelGroup({ level, calm, canHover }) {
    // What is being reached for: null, { cover: true }, or { row, col }.
    const [hot, setHot] = useState(null);
    const clear = () => setHot(null);

    // The outer trade: cover against cluster. Reaching for the cover takes
    // width from the cluster; reaching into the cluster takes a little from
    // the cover, so the whole level leans toward wherever the hand is.
    const outer = spread(
        [COVER_VW, CLUSTER_VW],
        hot ? (hot.cover ? 0 : 1) : -1,
        hot && hot.cover ? COVER_GROW : 1.08,
        [0.84, 0.82],
    );

    const rowShares = spread(
        ROW_BASES,
        hot && !hot.cover ? hot.row : -1,
        ROW_GROW,
        ROW_FLOOR,
    );

    const coverOpen = !!(hot && hot.cover);
    const coverReach = reachProps({
        canHover,
        isOpen: coverOpen,
        open: () => setHot({ cover: true }),
        close: clear,
    });

    return (
        <div className="BenefitRide__group" onPointerLeave={canHover ? clear : undefined}>
            <motion.div
                {...coverReach}
                className={`BenefitRide__cell BenefitRide__cell--big BenefitRide__cell--cover${coverReach.className}`}
                style={{ flexBasis: 0 }}
                animate={{ flexGrow: outer[0] }}
                transition={calm ? CALM_HOVER : WIDTH_SPRING}
            >
                {face(level.cover, true, 0.04, calm)}
            </motion.div>

            <motion.div
                className="BenefitRide__cluster"
                style={{ flexBasis: 0 }}
                animate={{ flexGrow: outer[1] }}
                transition={calm ? CALM_HOVER : WIDTH_SPRING}
            >
            {[level.top, level.bottom].map((cards, r) => {
                const active = hot && hot.row === r ? hot.col : -1;
                const cellShares = spread(
                    cards.map((c) => c.base),
                    active,
                    CELL_GROW,
                    CELL_FLOOR,
                );
                return (
                    <motion.div
                        key={`row-${r}`}
                        className="BenefitRide__row"
                        style={{ flexBasis: 0 }}
                        animate={{ flexGrow: rowShares[r] }}
                        transition={calm ? CALM_HOVER : HEIGHT_SPRING}
                    >
                        {cards.map((m, c) => {
                            const reach = reachProps({
                                canHover,
                                isOpen: active === c,
                                open: () => setHot({ row: r, col: c }),
                                close: clear,
                            });
                            return (
                                <motion.div
                                    key={m.at}
                                    {...reach}
                                    className={`BenefitRide__cell${reach.className}`}
                                    style={{ flexBasis: 0 }}
                                    animate={{ flexGrow: cellShares[c] }}
                                    transition={calm ? CALM_HOVER : WIDTH_SPRING}
                                >
                                    {face(m, false, 0.05 * c + 0.03 * r, calm)}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                );
            })}
            </motion.div>
        </div>
    );
}

// The two cinematic panels and the level marker between them: one fixed-width
// trio in which the panels trade with each other and the marker holds its
// ground (floor 1 — a chapter heading does not give way).
function PanelTrio({ calm, canHover, lit }) {
    const [hot, setHot] = useState(-1);
    const clear = () => setHot(-1);

    const shares = spread(
        [P20_VW, MARK_VW, P30_VW],
        hot,
        PANEL_GROW,
        [0.84, 1, 0.84],
    );

    const panel = (i) =>
        reachProps({ canHover, isOpen: hot === i, open: () => setHot(i), close: clear });
    const left = panel(0);
    const right = panel(2);

    return (
        <div className="BenefitRide__trio" onPointerLeave={canHover ? clear : undefined}>
            <motion.div
                {...left}
                className={`BenefitRide__cell BenefitRide__cell--big${left.className}`}
                style={{ flexBasis: 0 }}
                animate={{ flexGrow: shares[0] }}
                transition={calm ? CALM_HOVER : WIDTH_SPRING}
            >
                {face(PANELS[0], true, 0.05, calm)}
            </motion.div>

            <motion.div
                className={`BenefitRide__markCell BenefitRide__markCell--inTrio${lit >= 4 ? " is-lit" : ""}`}
                style={{ flexBasis: 0 }}
                animate={{ flexGrow: shares[1] }}
                transition={calm ? CALM_HOVER : WIDTH_SPRING}
                // The marker is the trio's neutral ground on either input: the
                // pointer crossing it lets both panels go, and so does a tap.
                onPointerEnter={canHover ? clear : undefined}
                onClick={clear}
            >
                <span className="BenefitRide__markCell__label">Úroveň 04</span>
            </motion.div>

            <motion.div
                {...right}
                className={`BenefitRide__cell BenefitRide__cell--big${right.className}`}
                style={{ flexBasis: 0 }}
                animate={{ flexGrow: shares[2] }}
                transition={calm ? CALM_HOVER : WIDTH_SPRING}
            >
                {face(PANELS[1], true, 0.05, calm)}
            </motion.div>
        </div>
    );
}

// One tick of the ruler under the track — thirty of them, one per referral.
// Each stretches UP as the ride reaches its stretch of the road: a bell around
// the current progress, read off the same sprung value the track rides on, so
// the wave under the journey moves exactly as the journey does.
function RulerTick({ ride, at }) {
    const stretch = useTransform(ride, (p) => {
        const d = Math.abs(p - at) / 0.085;
        const bell = Math.max(0, 1 - d * d);
        return 0.22 + bell * 0.78;
    });
    const glow = useTransform(ride, (p) => {
        const d = Math.abs(p - at) / 0.085;
        const bell = Math.max(0, 1 - d * d);
        return 0.2 + bell * 0.65;
    });
    return (
        <motion.span
            className="BenefitRide__ruler"
            style={{ left: `${(at * 100).toFixed(2)}%`, scaleY: stretch, opacity: glow }}
        />
    );
}

const RULER = Array.from({ length: 30 }, (_, i) => (i + 0.5) / 30);

export default function BenefitRide() {
    const sectionRef = useRef(null);

    // Both preferences read the hydration-safe way: state that starts as the
    // server rendered and flips in an effect.
    const [calm, setCalm] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => setCalm(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    const [canHover, setCanHover] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
        const sync = () => setCanHover(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    // THE STACKING GATE. Twin of the `stacked` mixin in styles.scss — the two
    // are one decision written twice, and they must be edited together: this
    // one swaps the pinned ride for the swipe strip, that one swaps the
    // geometry that goes with it, and a disagreement leaves a 340vh pin
    // wrapped around a strip.
    //
    // The height arm is the whole point of the second clause. A phone held in
    // landscape is 844×390 or 932×430 — the wider one clears 900px on width
    // alone and would take the desktop composition, which is a 340vh pin and a
    // 64vh track inside 430px of screen: the header lands on top of the cards.
    // 520px is the same figure `phs`/`phl` use in _breakpoints.scss (above the
    // tallest phone in landscape, well under the shortest tablet).
    const [stacked, setStacked] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 900px), (max-height: 520px)");
        const sync = () => setStacked(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });

    // The ride glides on a spring; under reduced motion it maps 1:1 —
    // scroll-driven either way, never autonomous.
    const glided = useSpring(scrollYProgress, {
        stiffness: 90,
        damping: 24,
        restDelta: 0.0004,
    });
    const ease = (p) => `${(-TRAVEL_VW * Math.min(1, Math.max(0, p / RIDE_END))).toFixed(3)}vw`;
    const xRaw = useTransform(scrollYProgress, ease);
    const xGlide = useTransform(glided, ease);
    const x = calm ? xRaw : xGlide;

    // How far through the ride we are, 0→1 — what the ruler under the track
    // reads. Off the sprung value, so the wave moves as the track does.
    const rideFrac = (p) => Math.min(1, Math.max(0, p / RIDE_END));
    const rideRaw = useTransform(scrollYProgress, rideFrac);
    const rideGlide = useTransform(glided, rideFrac);
    const rideScrolled = calm ? rideRaw : rideGlide;

    // What covers the pin. A sticky stage betrays itself twice: the page
    // visibly stops the moment it catches, and visibly lets go at the end.
    // Both moments get continuous scroll-driven motion laid over them — the
    // track finishes rising INTO its seat during the first slice of the pin
    // and starts leaving it during the last, so there is no frame in which
    // scrolling produces no movement. Scroll-mapped, not autonomous, so it
    // stays under reduced motion too.
    const seatIn = useTransform(scrollYProgress, [0, 0.05], [1, 0], { clamp: true });
    const seatOut = useTransform(scrollYProgress, [RIDE_END, 1], [0, 1], { clamp: true });
    const seatSpring = useSpring(useTransform([seatIn, seatOut], ([a, b]) => a * 7 - b * 9), {
        stiffness: 120,
        damping: 26,
        restDelta: 0.001,
    });
    const seatRaw = useTransform([seatIn, seatOut], ([a, b]) => `${a * 7 - b * 9}vh`);
    // Both computed, then chosen — a hook behind a ternary is the rule this
    // file keeps warning everyone else about.
    const seatSprung = useTransformTemplateVh(seatSpring);
    const seatY = calm ? seatRaw : seatSprung;
    const baseFade = useTransform(scrollYProgress, [RIDE_END, 0.99], [1, 0.3], { clamp: true });

    // The head leaves as the seat does. The exit lifts the track nine vh, which
    // carries the destination up THROUGH the header — the lead was being
    // written across the last card's ordinal at every width. Read off `seatOut`
    // itself rather than off the scroll, so the fade cannot drift from the lift
    // that makes it necessary: gone by the time the two would touch, and the
    // last word left on the stage is the sum, which is what the head said too.
    const headFade = useTransform(seatOut, [0.1, 0.3], [1, 0], { clamp: true });

    const [lit, setLit] = useState(0);
    useMotionValueEvent(scrollYProgress, "change", (v) => {
        // In the strip the section is a few hundred pixels tall inside a taller
        // viewport, so this progress is degenerate and says nothing about where
        // the reader is — the strip's own scroll does, below.
        if (stacked) return;
        let n = 0;
        for (const { at } of LEVEL_AT) if (v >= at) n++;
        setLit(n);
    });

    // The strip's own progress. A horizontal scroller inside a vertical page
    // is the one place on this site where there is nothing to tell you the
    // road continues — the destination, which is the whole point of a section
    // called "Cesta za 47 500 Kč", sits fifteen cards to the right of the
    // first screen. So the strip gets the ride's instrument too: the same
    // hairline with the same accent fill, read off scrollLeft instead of
    // scrollYProgress, and the level markers light as they pass the left edge.
    const stripRide = useMotionValue(0);
    const onStripScroll = (e) => {
        const el = e.currentTarget;
        const max = el.scrollWidth - el.clientWidth;
        stripRide.set(max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0);

        // Measured rather than mapped: the strip's stops are of three
        // different widths, so no arithmetic on scrollLeft would say which
        // chapter has gone by. Four elements, read on a scroll — cheap.
        const edge = el.getBoundingClientRect().left + 1;
        let n = 0;
        for (const mark of el.querySelectorAll("[data-level]")) {
            if (mark.getBoundingClientRect().left <= edge) n = Math.max(n, +mark.dataset.level);
        }
        setLit(n);
    };

    // Both are live motion values, both are computed every render; which one
    // the instrument reads is the only thing the gate decides.
    const ride = stacked ? stripRide : rideScrolled;

    const destination = (key, wide) => (
        <div
            key={key}
            className="BenefitRide__dest"
            style={wide ? { flex: `0 0 ${wide}vw` } : undefined}
        >
            <motion.div
                className="BenefitRide__dest__in"
                variants={group()}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.span className="BenefitRide__dest__label" variants={RISE}>
                    Celkem v poukazech
                </motion.span>
                <motion.span className="BenefitRide__dest__value" variants={RISE}>
                    {czk(TOTAL)}
                </motion.span>
                <motion.span className="BenefitRide__dest__note" variants={RISE}>
                    Poukazy, ne hotovost. Vyplácí se po uzavření smlouvy
                    doporučeným klientem.
                </motion.span>
            </motion.div>
        </div>
    );

    const marker = (level, key) => (
        <div
            key={key}
            data-level={level}
            className={`BenefitRide__markCell${lit >= level ? " is-lit" : ""}`}
        >
            <span className="BenefitRide__markCell__label">
                Úroveň {String(level).padStart(2, "0")}
            </span>
        </div>
    );

    return (
        <section
            className="BenefitRide"
            ref={sectionRef}
            aria-labelledby="BenefitRide__title"
        >
            {/* The join: the thread down from the three steps' last rule,
                landing on this section's eyebrow. */}
            <motion.span
                className="BenefitRide__thread"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={ENTERS}
                transition={calm ? STILL : { duration: 1.1, ease: CURTAIN }}
                aria-hidden="true"
            />

            <div className="BenefitRide__stage">
                <motion.header
                    className="BenefitRide__head"
                    // Only where there is a seat to leave. In the strip this
                    // section is shorter than the viewport, so its own
                    // scrollYProgress is degenerate — binding the header's
                    // opacity to it is how a phone ends up with an invisible
                    // heading, which is the oldest bug on this site.
                    style={stacked ? undefined : { opacity: headFade }}
                    variants={group()}
                    initial="hidden"
                    whileInView="shown"
                    viewport={ENTERS}
                >
                    <motion.p className="BenefitRide__eyebrow" variants={RISE}>
                        03
                    </motion.p>
                    <motion.h2 className="BenefitRide__title" id="BenefitRide__title" variants={RISE}>
                        Cesta za {czk(TOTAL)}
                    </motion.h2>
                    {/* The invitation has to name the gesture the device
                        actually has. "Najeďte" asks for a pointer nobody on a
                        phone owns, and it was the only instruction telling the
                        reader the cards open at all. */}
                    <motion.p className="BenefitRide__lead" variants={RISE}>
                        Dvanáct odměn ve čtyřech úrovních.{" "}
                        {stacked
                            ? "Projeďte je prstem."
                            : canHover
                              ? "Najeďte na kteroukoli."
                              : "Klepněte na kteroukoli."}
                    </motion.p>
                </motion.header>

                {stacked ? (
                    <div className="BenefitRide__strip" onScroll={onStripScroll}>
                        {FLAT.map((item, i) => {
                            if (item.kind === "mark") return marker(item.level, `m-${item.level}`);
                            if (item.kind === "dest") return destination("dest");
                            return (
                                <div
                                    className={`BenefitRide__cell${item.big ? " BenefitRide__cell--big" : ""}`}
                                    key={item.m.at}
                                >
                                    {face(item.m, !!item.big, Math.min(0.2, 0.04 * i), calm)}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // The ride. x is the only transform this element carries,
                    // and — deliberately — the only thing about the top line
                    // that ever moves: every segment's width is written once,
                    // so no hover can ask three screens of track to re-lay
                    // themselves out. See the note at the top of the file.
                    <motion.div
                        className="BenefitRide__track"
                        style={{ x, y: seatY, width: `${TRACK_VW}vw` }}
                    >
                        {SEGS.map((seg) => {
                            const fixed = { flex: `0 0 ${seg.vw}vw` };
                            if (seg.kind === "mark") return marker(seg.level, `mark-${seg.level}`);
                            if (seg.kind === "dest") return destination("dest", seg.vw);
                            if (seg.kind === "trio") {
                                return (
                                    <div key="trio" className="BenefitRide__seat" style={fixed}>
                                        <PanelTrio calm={calm} canHover={canHover} lit={lit} />
                                    </div>
                                );
                            }
                            return (
                                <div key={`gr-${seg.level}`} className="BenefitRide__seat" style={fixed}>
                                    <LevelGroup level={LEVELS[seg.level]} calm={calm} canHover={canHover} />
                                </div>
                            );
                        })}
                    </motion.div>
                )}

                {stacked ? (
                    // The strip's instrument. The four numbered ticks are the
                    // ride's, and they cannot come along: their positions are
                    // fractions of the TRACK, and the strip re-orders the same
                    // twelve cards at three different widths. The markers are
                    // in the strip itself instead, so what is left to say here
                    // is how far along the road we are — the line, the accent
                    // fill and where the road leads.
                    <div className="BenefitRide__base BenefitRide__base--strip" aria-hidden="true">
                        <motion.span className="BenefitRide__base__fill" style={{ scaleX: ride }} />
                        <span className="BenefitRide__base__cap">1.–30. doporučení</span>
                    </div>
                ) : (
                    <motion.div className="BenefitRide__base" style={{ opacity: baseFade }} aria-hidden="true">
                        {/* The accent progress, drawn along the line as the ride
                            moves — the same sprung value, so the two agree. */}
                        <motion.span className="BenefitRide__base__fill" style={{ scaleX: ride }} />

                        {/* The ruler: one tick per referral, rising in a wave
                            under wherever the ride currently is. */}
                        {RULER.map((at) => (
                            <RulerTick key={at} ride={ride} at={at} />
                        ))}

                        {LEVEL_AT.map(({ level, left }) => (
                            <span
                                key={level}
                                className={`BenefitRide__tick${lit >= level ? " is-lit" : ""}`}
                                style={{ left: `${left.toFixed(2)}%` }}
                            >
                                <span className="BenefitRide__tick__line" />
                                <span className="BenefitRide__tick__n">
                                    {String(level).padStart(2, "0")}
                                </span>
                            </span>
                        ))}
                        <span className="BenefitRide__base__cap">1.–30. doporučení</span>
                    </motion.div>
                )}
            </div>
        </section>
    );
}
