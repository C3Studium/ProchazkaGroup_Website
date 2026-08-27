"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

import { CURTAIN, ENTERS, RISE, group } from "@/components/common/ui/entrance";
import { CHAIN } from "./content";

// The offer.
//
// Rows of one or two cells, read downwards. It has been through a good deal:
// blocks pushing each other about, a wall tiling the screen edge to edge, a
// line threading between cells and lighting up as it went. All of it moved, and
// this is the part of the page there is most to read — five things moving over
// a paragraph is four too many, and a picture running out to both edges of the
// screen leaves the words nowhere to sit.
//
// So: nothing here is driven by the scroll. A row arrives once, the way every
// other section on this site arrives — see entrance.js — and then it is still,
// for as long as anyone wants to look at it. The wall is set in from the page
// on both sides and the rows are well apart; the two cells of a row still share
// an edge, because that is the one join that was worth keeping.
//
//   ╷ ┌──────────┬───────────────────┐
//   │ │  03      │  03.01            │
//   ┿ └──────────┴───────────────────┘
//   │
//   ┿ ┌───────────────┬──────────────┐
//   │ │  03.02        │  03.03       │
//   ╵ └───────────────┴──────────────┘
//
// The rail down the left is the journey, kept out of the way of the reading:
// one tick per row, filled as far as you have got.

// How a row divides, and how tall it is in screens. Rows are deliberately
// unlike each other — a run of identical bands is a spreadsheet.
const PLAN = [
    { h: 0.66, cells: [[0, 0.38], [1, 0.62]], link: { from: 0.69, to: 0.28, bend: 0.5 } },
    { h: 0.56, cells: [[2, 0.57], [3, 0.43]], link: { from: 0.78, to: 0.68, bend: 0.3 } },
    { h: 0.66, cells: [[4, 0.36], [5, 0.64]], link: { from: 0.68, to: 0.5, bend: 0.62 } },
    { h: 0.5, cells: [[6, 1]], link: { from: 0.5, to: 0.7, bend: 0.4 } },
    { h: 0.66, cells: [[7, 0.4], [8, 0.6]], link: { from: 0.7, to: 0.23, bend: 0.56 } },
    { h: 0.56, cells: [[9, 0.46], [10, 0.54]], link: { from: 0.77, to: 0.69, bend: 0.28 } },
    { h: 0.66, cells: [[11, 0.38], [12, 0.62]], link: { from: 0.69, to: 0.5, bend: 0.5 } },
    { h: 0.5, cells: [[13, 1]] },
];

// The same query as `@mixin stacked` in styles.scss, which is what decides that
// the wall is one column. The stylesheet settles the layout on its own — the
// widths and heights this file writes inline are beaten by !important there —
// but the drifts below are inline transforms, and CSS cannot reach those. So
// the two have to agree, and they have to be edited together.
//
// The width alone is not enough: a 932×430 phone in landscape is wider than the
// `sm` stop and is still a phone. Bounded on width as well as height, so a
// desktop window dragged short keeps the composition it was drawn for.
const STACKED =
    "(max-width: 899.98px), (max-width: 1100px) and (max-height: 520px) and (orientation: landscape)";

// Hydration-safe by construction: the server has no viewport, so the first
// render is always the wide answer and the client corrects it in an effect.
// Nothing this decides makes anything appear or disappear — only how far it
// drifts — so a correction on the first frame is not visible.
function useMatches(query) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(query);
        const sync = () => setMatches(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, [query]);

    return matches;
}

export default function OfferGrid() {
    const ref = useRef(null);
    const stacked = useMatches(STACKED);
    // Not "no motion": the rows still arrive, and the rules still draw
    // themselves on. What stops is the part that never stops — the five things
    // that follow the scroll for as long as the section is on screen.
    const still = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start 80%", "end 60%"],
    });
    const gone = useSpring(scrollYProgress, {
        stiffness: 300,
        damping: 44,
        restDelta: 0.0006,
    });
    // The only thing on the page that follows the scroll, and it lives in the
    // margin where it cannot cross a word. It is kept even under reduced
    // motion: it is a position in a document, not an effect.
    const walked = useTransform(gone, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`);

    return (
        <section className="OfferWall" ref={ref}>
            <Depth progress={gone} still={still} />

            <div className="OfferWall__rail" aria-hidden="true">
                <span className="OfferWall__rail__line" />
                <motion.span className="OfferWall__rail__walked" style={{ height: walked }} />
                {PLAN.map((row, i) => (
                    <span
                        key={i}
                        className="OfferWall__rail__tick"
                        style={{ top: `${(i / (PLAN.length - 1)) * 100}%` }}
                    />
                ))}
            </div>

            {PLAN.map((row, i) => (
                <Row key={i} row={row} stacked={stacked} still={still} />
            ))}
        </section>
    );
}

// The layer everything else stands in front of.
//
// Long hairlines at nothing in particular, drifting the other way to the page.
// On its own it would be wallpaper; what makes it read as distance is that it
// is the slowest of five things moving at five different rates — the field, the
// pictures, the lines between the blocks, the blocks and their words, in that
// order from farthest to nearest.
const FIELD = [7, 23, 41, 62, 78, 91];
const TICKS = [0.08, 0.19, 0.31, 0.44, 0.57, 0.68, 0.81, 0.93];

function Depth({ progress, still }) {
    // Measured rather than guessed: this runs over the whole section where the
    // others run over their own passage, so the same number would have made it
    // the *second* slowest thing on the page instead of the slowest.
    const y = useTransform(progress, [0, 1], still ? [0, 0] : [-160, 160]);

    return (
        <motion.div className="OfferWall__depth" style={{ y }} aria-hidden="true">
            {FIELD.map((x, i) => (
                <span
                    key={x}
                    className={`OfferWall__depth__rule${i % 3 === 0 ? " is-near" : ""}`}
                    style={{ left: `${x}%` }}
                />
            ))}
            {TICKS.map((t, i) => {
                const x = FIELD[i % FIELD.length];
                // Cut to fit rather than left to run: a tick that starts at 91
                // and is 16 wide is a hundred pixels of page nobody asked for,
                // and the horizontal scrollbar that comes with it.
                const w = Math.min(6 + (i % 3) * 5, 99 - x);
                return (
                    <span
                        key={t}
                        className="OfferWall__depth__tick"
                        style={{ top: `${t * 100}%`, left: `${x}%`, width: `${w}%` }}
                    />
                );
            })}
        </motion.div>
    );
}

function Row({ row, stacked, still }) {
    return (
        <motion.div
            className="OfferWall__row"
            // Beaten by `height: auto !important` in the stacked block of the
            // stylesheet, where a fraction of a screen is the wrong measure for
            // a column of things that size themselves.
            style={{ height: `${row.h * 100}vh` }}
            variants={group()}
            initial="hidden"
            whileInView="shown"
            viewport={ENTERS}
        >
            {row.cells.map(([i, w]) => (
                <Cell
                    key={CHAIN[i].n}
                    rung={CHAIN[i]}
                    width={w}
                    of={row.cells.length}
                    stacked={stacked}
                    still={still}
                />
            ))}
            {row.link ? <Link link={row.link} still={still} /> : null}
        </motion.div>
    );
}

// What ties one row to the next: a hairline that leaves the block above,
// steps across the gap and arrives at the block below. It is drawn in the space
// between the rows, which is the one place on this page a line can go without
// crossing something somebody is reading — and it is the reason the rows can be
// as far apart as they are without coming loose from each other.
//
// The turn is at a different height in every gap and the two ends are at
// different points of their rows, so no two of them are the same shape.
function Link({ link, still }) {
    const { from, to, bend } = link;
    const box = useRef(null);
    const { scrollYProgress } = useScroll({
        target: box,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [-14, 14]);
    const d = `M${(from * 100).toFixed(2)},0 V${(bend * 100).toFixed(2)} H${(to * 100).toFixed(
        2,
    )} V100`;

    return (
        <motion.svg
            className="OfferWall__link"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            ref={box}
            style={{ y }}
            aria-hidden="true"
        >
            {/* A second line a little off the first, fainter. Two hairlines a
                few pixels apart read as one line seen from slightly the wrong
                place, which is the cheapest depth there is. */}
            <motion.path
                d={`M${((from + 0.012) * 100).toFixed(2)},0 V${((bend + 0.06) * 100).toFixed(
                    2,
                )} H${((to + 0.012) * 100).toFixed(2)} V100`}
                className="OfferWall__link__ghost"
                vectorEffect="non-scaling-stroke"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    shown: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { duration: 1.3, ease: CURTAIN, delay: 0.15 },
                    },
                }}
            />
            <motion.path
                d={d}
                className="OfferWall__link__line"
                vectorEffect="non-scaling-stroke"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    shown: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { duration: 1.2, ease: CURTAIN, delay: 0.25 },
                    },
                }}
            />
            {/* A short bright piece that walks the line, over and over, slowly.
                This is the whole of the movement on the page once everything
                has arrived: it is a hairline in an empty margin, so it can be
                alive without being in the way. */}
            <path
                d={d}
                className="OfferWall__link__walk"
                vectorEffect="non-scaling-stroke"
            />
            <circle className="OfferWall__link__end" cx={to * 100} cy={99} r="0.7" />
        </motion.svg>
    );
}

// A cell arrives once and is then done. A picture is uncovered rather than
// raised — see PHOTO in entrance.js for why — and the words rise under it.
const OPEN = {
    hidden: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
    shown: {
        opacity: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        transition: { duration: 1, ease: CURTAIN },
    },
};

function Cell({ rung, width, of, stacked, still }) {
    // Two cells to a row set their words against the edge they share, so a
    // row's two sentences meet near the middle of the screen instead of running
    // off to opposite margins.
    const align = of === 2 && width < 0.5 ? "end" : "start";

    // The picture drifts inside its own crop as the block goes by — the frame
    // does not move, the words do not move, and nothing reflows. It is the only
    // motion the reading half of the page carries, and it stops the moment the
    // reader does.
    const frame = useRef(null);
    const { scrollYProgress } = useScroll({
        target: frame,
        offset: ["start end", "end start"],
    });
    const drift = useSpring(scrollYProgress, {
        stiffness: 90,
        damping: 26,
        restDelta: 0.001,
    });

    // Five rates, farthest to nearest: the field behind everything, then the
    // picture, then the line into the next row, then the block, then the words
    // on it. Each one only moves while the page does, so a reader who has
    // stopped is looking at something that has stopped.
    //
    // Once the wall is one column, only the picture keeps its rate. The words
    // are the reason: the copy is bottom-anchored inside a box that clips, and
    // on a phone the padding it drifts through is a third of what it is on a
    // desktop — so thirty pixels of travel eats most of the space under the
    // last line instead of being lost in it. Holding the words and the frame
    // still is also the right reading of a phone, where the column is one thing
    // at a time and the picture is the thing that can afford to move.
    const held = still || stacked;
    const shift = useTransform(drift, [0, 1], still ? ["0%", "0%"] : ["-10%", "10%"]);
    const frameY = useTransform(drift, [0, 1], held ? [0, 0] : [14, -14]);
    const copyY = useTransform(drift, [0, 1], held ? [0, 0] : [30, -30]);

    if (rung.kind === "head") {
        return (
            <motion.header
                className={`OfferWall__cell OfferWall__head is-${align}`}
                // Given the ref too, though a heading has no picture to drift.
                // The hook above is called for every cell — it has to be — and
                // framer will not have a target that never becomes an element.
                ref={frame}
                style={{ width: `${width * 100}%`, y: copyY }}
                variants={RISE}
            >
                <p className="OfferWall__n">{rung.n}</p>
                <h2 className="OfferWall__title">{rung.title}</h2>
                <motion.span
                    className="OfferWall__head__rule"
                    variants={{
                        hidden: { scaleX: 0 },
                        shown: { scaleX: 1, transition: { duration: 1, ease: CURTAIN } },
                    }}
                    aria-hidden="true"
                />
                <p className="OfferWall__lead">{rung.lead}</p>
            </motion.header>
        );
    }

    return (
        <motion.article
            className={`OfferWall__cell OfferWall__block is-${align}`}
            ref={frame}
            style={{ width: `${width * 100}%`, y: frameY }}
            variants={OPEN}
        >
            <span className="OfferWall__marks" aria-hidden="true">
                <i className="OfferWall__marks__tl" />
                <i className="OfferWall__marks__tr" />
                <i className="OfferWall__marks__bl" />
                <i className="OfferWall__marks__br" />
            </span>

            {/* Scaled a little past its box so the drift has somewhere to go.
                1.22 rather than 1.2: with translate written before scale the
                shift is in unscaled units, so 1.2 leaves exactly ten per cent
                of overhang for exactly ten per cent of travel and the edge
                lands flush — one rounding error from showing the wall behind
                it. The extra two per cent is the margin.

                A reader who has asked for no motion gets no travel, so there is
                nothing for the overhang to cover: the picture sits in its frame
                at its own size, which is a better crop than the enlargement. */}
            <motion.div
                className="OfferWall__block__photo"
                style={{ y: shift, scale: still ? 1 : 1.22 }}
            >
                <Image
                    src={rung.photo}
                    alt=""
                    fill
                    // The same two clauses as STACKED above, in the one other
                    // grammar that has to know about them: once the wall is a
                    // single column a block is the width of the page, and a
                    // phone held sideways was being served the two-column size
                    // for a box half again as wide.
                    sizes="(max-width: 899.98px) 100vw, (max-width: 1100px) and (max-height: 520px) and (orientation: landscape) 100vw, 56vw"
                    style={{ objectFit: "cover", objectPosition: rung.position }}
                />
            </motion.div>
            <span className="OfferWall__block__scrim" aria-hidden="true" />

            <motion.div className="OfferWall__block__copy" style={{ y: copyY }}>
                <p className="OfferWall__block__n">{rung.n}</p>
                <h3 className="OfferWall__block__title">{rung.title}</h3>
                <p className="OfferWall__block__body">{rung.body}</p>
            </motion.div>
        </motion.article>
    );
}
