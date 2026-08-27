"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { CURTAIN } from "@/components/common/ui/entrance";
import EuropeMap from "./EuropeMap";
import { MAP } from "./europe";

/**
 * Whether this is a finger or a pointer, answered once for the whole section.
 *
 * Everything in the band and in the counts beside it opens on hover, and hover
 * is not a thing a finger does. What a finger does instead is worse than
 * nothing: a tap fires pointerenter and pointerdown and never fires
 * pointerleave, so a box opened on enter is open until the page is reloaded —
 * the wall stays redistributed around a square nobody is touching, a country
 * stays lifted off the map, the tile that was tapped keeps its sentence out.
 *
 * So the enter/leave pair and the tap are alternatives, never both: with both
 * bound, one tap opens on pointerenter and closes again on click, and nothing
 * appears to happen at all.
 *
 * Read after mount, because the server has no pointer to ask about and a guess
 * that disagrees with the client is a hydration mismatch on every phone.
 */
export function useCoarsePointer() {
    const [coarse, setCoarse] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(hover: none)");
        const read = () => setCoarse(query.matches);
        read();
        query.addEventListener("change", read);
        return () => query.removeEventListener("change", read);
    }, []);

    return coarse;
}

// The offer, as a band of boxes travelling sideways.
//
// It picks up where the statistics leave off — three small boxes in the corner
// with the counts in them — and carries on out of them to the right. The band
// does not scroll itself: it is one wide component inside the section's own
// sticky viewport, and the page's scroll walks it left, the same thing the
// home page's horizontal panels do.
//
// The rules it is built to:
//
//   · rectangles only — squares and oblongs, no rounded cards, no circles
//   · a section owns a slot of the screen's own width and eight tenths of its
//     height, set in the middle of it, so every section is read at the same
//     size and in the same place
//   · the words stand outside the boxes; the boxes hold what the section
//     shows, and they are large — this is a wall of crates, not a dashboard
//   · a section that has subsections of its own is given more than one slot,
//     because three things side by side need the room
//   · a rule with dots along the foot says where in the six you are, the way
//     the reviews on the home page run a dot along their own rules
//
// Everything inside a slot is written as a fraction of it, so the wall is the
// same wall on a laptop and on a wide screen.

// A slot: one screen wide unless a section says otherwise, eight tenths of one
// tall, and centred in the screen's own height.
//
// The band carries the two sections that are looked at — the counts and the
// map. It ends on the map, pointing right, and the page turns downwards there:
// everything after it is read going down, on the grid in OfferGrid.
const SLOT_H = 0.8;
const SLOT_TOP = 0.1;

const SECTIONS = [
    {
        n: "01",
        name: "Naše působení na trhu",
        lead: "To, co by vám trvalo několik dekád, zvládneme během několika let. Když do toho opravdu půjdete.",
        span: 1,
        // In the notch the L leaves — outside the boxes, but held by them, and
        // on the wall's own left edge, so the heading and the first square line
        // up rather than nearly line up. High in the notch, not in the middle
        // of it: the wall is what the eye goes to and the words should have
        // been read before it gets there.
        text: { x: 0.15, y: 0.04, w: 0.42 },
        // Four squares in an L, mirrored: the weight is at the foot and the one
        // that is left stands over the far end of it. The counts' own L, upside
        // down — the section that argued the funnel downwards answers it from
        // the ground up.
        //
        //      ┌───────────────────────┬───────┐
        //      │  the words stand      │ 9000+ │
        //      │  in the notch         │       │
        //      ├───────┬───────┬───────┼───────┘
        //      │ 3000+ │  12+  │  43   │
        //      └───────┴───────┴───────┘
        //
        // Every one of them is a square: the side is a share of the slot's
        // width and the same number of pixels down, which in a slot that is not
        // square is two different fractions.
        // Bigger, and set to the right: the wall is 3 × 432px and stands from
        // 0.15 of the slot, which clears the counts and leaves it a margin on
        // the right rather than a wall against the edge. Two rows of 432 are
        // 864 of the slot's 894, so it stands on the slot's own floor.
        square: { side: 0.25, cols: 3, x: 0.15, y: 0.034 },
        // A phone has no notch to write in: 0.42 of 390px is a heading two
        // words wide, and the wall it was meant to be held by is three squares
        // of 97px with a 45px number in each. So the slot is read downwards
        // instead — the words across the top, the wall under them — and the
        // wall is two by two rather than an L, because four squares in a row
        // on a screen this wide are four slivers.
        //
        // `y` clears the band of counts that stands under the bar for the whole
        // of the offer; see countBandAt in StatRail.
        // And sideways, where there is no height for a heading above a wall
        // either: 390px of screen carries one row of squares and the bar. So
        // the words stand BESIDE the wall instead of in it or over it — the
        // one arrangement of two things that a short wide screen has room for
        // — clear of the counts that hold the top-left corner.
        short: {
            text: { x: 0.13, y: 0.06, w: 0.34 },
            square: { side: 0.32, cols: 2, x: 0.5, y: 0.06 },
            grid: [
                [0, 0],
                [1, 0],
                [0, 1],
                [1, 1],
            ],
        },
        stacked: {
            text: { x: 0.06, y: 0.13, w: 0.88 },
            square: { side: 0.44, cols: 2, x: 0.06, y: 0.46 },
            // Which cell of that two-by-two each block below stands in, in the
            // order they are written: reading order, left to right and down.
            grid: [
                [0, 0],
                [1, 0],
                [0, 1],
                [1, 1],
            ],
        },
        blocks: [
            { kind: "square", col: 0, row: 1, value: "3000+", label: "spokojených klientů" },
            { kind: "square", col: 1, row: 1, value: "12+", label: "let na trhu" },
            { kind: "square", col: 2, row: 1, value: "43", label: "partnerských společností" },
            { kind: "square", col: 2, row: 0, value: "9000+", label: "podepsaných smluv" },
        ],
    },
    {
        n: "02",
        name: "Historie našeho systému",
        lead: "Naše organizace roste už od roku 1970. Šestnáct trhů, na které jsme přišli jeden po druhém — najeďte na zemi a uvidíte, odkdy.",
        span: 1,
        // Above the map, not beside it: it is what tells somebody what they are
        // looking at, and a caption that arrives after the picture is a caption
        // nobody reads.
        text: { x: 0.04, y: 0.07, w: 0.44 },
        short: {
            text: { x: 0.13, y: 0.06, w: 0.34 },
            blocks: [{ kind: "map", x: 0.5, y: 0.06, w: 0.47, h: 0.9 }],
        },
        stacked: {
            text: { x: 0.06, y: 0.13, w: 0.88 },
            blocks: [{ kind: "map", x: 0.03, y: 0.52, w: 0.94, h: 0.6 }],
        },
        blocks: [
            // Smaller than it was, and its left edge is negative on purpose: it
            // reaches back into the slot before it and butts against the wall
            // of squares that ends there, so the two sections are one run of
            // boxes rather than two islands with a gap between them.
            // Below the words and off to the right, so the slot reads as a
            // diagonal rather than as a heading with a picture under it. The
            // width is the height times the map's own proportions: the box
            // hugs the map, because a wider one is a box with air in it.
            { kind: "map", x: 0.3, y: 0.36, w: 0.56, h: 0.62 },
        ],
    },
];

// What stands to the left of the band when it starts, and to the right of it
// when it stops.
const LEAD = 0.12;
// Nothing. The band's last slot is a screen wide, so it is read when it is
// flush against the left edge — and a tail is the band carrying on past that
// with the map already half off the screen.
const TAIL = 0;

// How long a thing takes to be written on once it has arrived — as a share of
// the whole run, which is many screens long, so this is a small number. At
// 0.06 a box took thirteen hundred pixels of travel to finish arriving: the
// section had walked most of a screen past the middle before its last box was
// there. This is about three hundred.
const STEP = 0.022;

// The roster wall's own, from navbar/body/advisors — the house physics and the
// house's own label fade, so a box opening under the pointer feels the same
// here as it does in the menu.
const REACH = { type: "spring", stiffness: 150, damping: 26, restDelta: 0.001 };
const LABEL_IN = { duration: 0.4, ease: CURTAIN };
const LABEL_OUT = { duration: 0.22, ease: CURTAIN };

// Where in the run a thing standing at `sx` reaches the right-hand edge of the
// screen. Everything is revealed against this, so a box is written on as it
// arrives rather than in a queue — the band is many screens long and a queue
// would light the last one while it was still four screens away.
const arrivalOf = (sx, start, distance, vw) => {
    const t = (start - vw + sx) / distance;
    return Math.max(0.02, Math.min(0.94, 0.06 + t * 0.94));
};

/**
 * A section, in the composition this viewport is being read in.
 *
 * An override names only what it changes, so a phone, a phone held sideways
 * and a laptop cannot come to disagree about what a section says — the words,
 * the numbers and the order are written once. What changes is where they
 * stand.
 */
const shapeOf = (section, mode) =>
    section[mode] ? { ...section, ...section[mode] } : section;

// The projection's own proportions. A map box that is not this shape cannot be
// filled by the map without stretching it, and the flags are placed in
// percentages of the box, so they would still land on their countries — on a
// continent half a head taller than Europe. See mapBox.
const MAP_RATIO = MAP.w / MAP.h;

// The site's bar is fixed over the top of every page and the band's own rule
// runs across the foot of this one. A tenth of the screen clears the first on a
// laptop and nowhere else: at 720 it is 72px under a 100px bar, and the eight
// tenths below it then ran the wall's bottom row through the foot rule and off
// the screen. So the slot is bounded rather than proportioned — it starts below
// the bar and stops above the rule, and takes the tuned eight tenths whenever
// they fit between the two, which on anything laptop-sized and taller they do.
const BAR = (vw) => (vw < 900 ? 92 : 100);
// Where the foot rule runs, and where the slot above it has to stop. Higher on
// a short screen: the names hang UNDER the rule, and at 0.965 of 390px there
// are thirteen pixels below it to hang them in.
// A share of the screen, until the names hanging under it run off the bottom of
// it: at 0.965 of 720px the rule is 25px from the floor and the name under it
// needs 28. So the rule is also held a fixed distance up from the foot, and the
// slot above it stops short of wherever it ends up.
const RULE = (mode) => (mode === "short" ? 0.925 : 0.965);
const STOP = (mode) => (mode === "short" ? 26 : 34);
const ruleOf = (view, mode) =>
    Math.min(view.h * RULE(mode), view.h - STOP(mode));

/** Every section's slot, in pixels, given the viewport. */
const slotsOf = (view, mode) => {
    const y = Math.max(view.h * SLOT_TOP, BAR(view.w));
    const h = Math.min(view.h * SLOT_H, ruleOf(view, mode) - 14 - y);
    let x = view.w * LEAD;
    return SECTIONS.map((section) => {
        const w = section.span * view.w;
        const slot = { x, w, y, h };
        x += w;
        return slot;
    });
};

export default function OfferStrip({ ride, view, mode = "wide", coarse = false }) {
    const slots = slotsOf(view, mode);
    const rule = ruleOf(view, mode);
    const last = slots[slots.length - 1];
    const planeW = last.x + last.w + view.w * TAIL;
    const distance = Math.max(1, planeW - view.w);
    const start = view.w * LEAD;

    // The whole of the travel, in one value.
    const x = useTransform(ride, [0.06, 1], [0, -distance]);
    // Drawn quickly and first: it is the floor the sections are laid on, and
    // it has to be there while the counts are still folding up so the two
    // moves touch rather than queue.
    const ruleIn = useTransform(ride, [0, 0.045], [0, 1]);

    return (
        <div className="OfferStrip">
            <motion.div
                className="OfferStrip__plane"
                style={{ width: planeW, height: view.h, x }}
            >
                {SECTIONS.map((section, index) => (
                    <Section
                        key={section.n}
                        section={shapeOf(section, mode)}
                        slot={slots[index]}
                        ride={ride}
                        coarse={coarse}
                        mode={mode}
                        at={arrivalOf(slots[index].x, start, distance, view.w)}
                    />
                ))}

                {/* The foot: one rule, a dot at each section, and the names. */}
                <motion.span
                    className="OfferStrip__rule"
                    style={{ top: rule, scaleX: ruleIn }}
                    aria-hidden="true"
                />
                {SECTIONS.map((section, index) => (
                    <Stop
                        key={section.n}
                        section={section}
                        slot={slots[index]}
                        top={rule}
                        ride={ride}
                        at={arrivalOf(slots[index].x, start, distance, view.w)}
                    />
                ))}
            </motion.div>
        </div>
    );
}

/** A block's own box, in pixels, from its fractions of the slot. */
const place = (block, slot) => {
    return {
        left: slot.x + block.x * slot.w,
        top: slot.y + block.y * slot.h,
        width: block.w * slot.w,
        height: block.h * slot.h,
    };
};

/**
 * The map's box — never taller than its own width can carry.
 *
 * The map inside is drawn to the box's full height with its width taken from
 * the projection, and capped at the box's width. On a wide screen the height
 * always binds first and the map sits centred with air either side, which is
 * what the authored fractions describe. On a phone the width binds first: the
 * box was 218 × 523, the cap held the map to 218 wide, the height stayed at
 * 523 — and preserveAspectRatio is `none` because the flags are placed in
 * percentages of this box, so what was drawn was a Europe stretched to two and
 * a half times its own height.
 *
 * So the height is whatever the width can actually carry, and the two can no
 * longer disagree.
 */
// And what the map has to give up so that the name and the date of the country
// being held can be read under it rather than on it. Stacked only: at 366px
// the date printed inside Slovenia is four pixels tall.
const CAPTION_H = 36;

const mapBox = (block, slot, reserve) => {
    const box = place(block, slot);
    const height = Math.min(box.height - reserve, box.width / MAP_RATIO);
    return { box: { ...box, height: height + reserve }, mapW: height * MAP_RATIO };
};

// The wall of squares, and its hover.
//
// A box does not grow over its neighbours. It takes room from them and they
// give exactly that much up, which is the roster wall's rule in the menu — see
// navbar/body/advisors — and the reason the block is full to its own edges at
// every frame with nothing to overlap.
//
// The wall is a grid of four columns and two rows. Every box is a cell in it,
// except the first at the foot, which is two columns wide. Reaching for a box
// widens the column or columns it stands in and heightens its row; the
// others hand over the difference. So the corner and the box under it share a
// column and both get wider together: that is not a fault, that is an L.
const GROW_COL = 1.5;
const FLOOR_COL = 0.72;
const GROW_ROW = 1.32;
const FLOOR_ROW = 0.76;

/** What each track is worth, given which of them are being reached for. */
const trackShares = (count, active, grow, floor) => {
    if (!active.length) return Array(count).fill(1);
    const near = (i) => Math.min(...active.map((a) => Math.abs(i - a)));
    const weights = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
        if (active.includes(i)) { weights.push(0); continue; }
        const w = 1 / Math.pow(near(i), 1.35);
        weights.push(w);
        total += w;
    }
    const wanted = grow - 1;
    const out = weights.map((w, i) =>
        active.includes(i) ? 0 : Math.max(floor, 1 - wanted * (w / (total || 1)))
    );
    // Whatever the floor refuses to give is simply not taken.
    const freed = out.reduce((sum, v, i) => (active.includes(i) ? sum : sum + (1 - v)), 0);
    active.forEach((i) => {
        out[i] = 1 + freed / active.length;
    });
    return out;
};

/**
 * How wide the notch is: the columns of the wall that have no box in their top
 * row. Stacked there is no notch at all — the words are above the wall, not
 * inside it — and the whole slot is theirs.
 */
const wallNotch = (section, slot) => {
    if (section.grid) return Infinity;
    const side = Math.min(section.square.side * slot.w, (slot.h * (1 - section.square.y)) / 2);
    const filled = section.blocks.filter((b) => b.row === 0).map((b) => b.col);
    const free = filled.length ? Math.min(...filled) : section.square.cols;
    // Less a hair, so the heading stops short of the box beside it rather than
    // touching it.
    return side * free - 16;
};

/** The grid's own lines, in pixels, from the shares. */
const wallOf = (side, cols, rows) => {
    const w = side * cols.length;
    const h = side * 2;
    const cSum = cols.reduce((a, b) => a + b, 0) || 1;
    const rSum = rows.reduce((a, b) => a + b, 0) || 1;
    const x = [0];
    cols.forEach((c) => x.push(x[x.length - 1] + (w * c) / cSum));
    const y = [0];
    rows.forEach((r) => y.push(y[y.length - 1] + (h * r) / rSum));
    return { x, y };
};

function SquareWall({ section, slot, ride, at, coarse }) {
    const [reached, setReached] = useState(-1);
    // A square is a share of the slot's WIDTH, which on a screen that is wider
    // than it is tall is a square taller than the room there is for two of
    // them: at 1280 × 720 the wall wanted 640px of a 648px slot and stood on
    // the foot rule with the bottom row's labels off the screen. So the side
    // is whichever of the two the wall actually fits in.
    const grid = section.grid || null;
    const side = Math.min(
        section.square.side * slot.w,
        (slot.h * (1 - section.square.y)) / 2
    );
    const originX = slot.x + section.square.x * slot.w;
    const originY = slot.y + section.square.y * slot.h;

    // Four columns and two rows, each on its own spring. They are normalised in
    // wallOf rather than trusted: six springs are not in step on the way, and
    // dividing by their sum is what keeps the wall full while they move.
    // Four of them, because hooks are not written in loops, and the wall is
    // three wide today — the fourth is simply not read. See COLS.
    const cols = [useMotionValue(1), useMotionValue(1), useMotionValue(1), useMotionValue(1)];
    const rows = [useMotionValue(1), useMotionValue(1)];
    const sc = [
        useSpring(cols[0], REACH),
        useSpring(cols[1], REACH),
        useSpring(cols[2], REACH),
        useSpring(cols[3], REACH),
    ];
    const sr = [useSpring(rows[0], REACH), useSpring(rows[1], REACH)];
    const count = section.square.cols;

    useEffect(() => {
        const block = section.blocks[reached];
        const cell = block && (grid ? { col: grid[reached][0], row: grid[reached][1] } : block);
        const activeCols = cell
            ? Array.from({ length: block.span || 1 }, (_, i) => cell.col + i)
            : [];
        const activeRows = cell ? [cell.row] : [];
        trackShares(count, activeCols, GROW_COL, FLOOR_COL).forEach((v, i) => cols[i].set(v));
        trackShares(2, activeRows, GROW_ROW, FLOOR_ROW).forEach((v, i) => rows[i].set(v));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reached]);

    const lines = useTransform(
        [sc[0], sc[1], sc[2], sc[3], sr[0], sr[1]],
        (v) => wallOf(side, v.slice(0, count), [v[4], v[5]])
    );

    return section.blocks.map((block, i) => (
        <Square
            key={i}
            // Which cell of the wall this block stands in is the one thing the
            // two compositions disagree about — an L of four across three
            // columns, or a plain two-by-two. Everything else about the block
            // is written once.
            block={grid ? { ...block, col: grid[i][0], row: grid[i][1] } : block}
            lines={lines}
            originX={originX}
            originY={originY}
            open={reached === i}
            coarse={coarse}
            onReach={() => setReached(i)}
            onLeave={() => setReached((v) => (v === i ? -1 : v))}
            onTap={() => setReached((v) => (v === i ? -1 : i))}
            ride={ride}
            at={at + STEP * (0.35 + i * 0.14)}
        />
    ));
}

// One square. It arrives by growing into itself rather than by rising, which is
// what separates the boxes from the words beside them: the words are revealed,
// the boxes are scaled in. Once it is there it does not scale again — what
// changes is the cell it is standing in.
//
// At rest it holds its number and nothing else. The pointer opens it and the
// label comes up under the figure — a caption on every one of them at all
// times is four captions nobody asked for.
function Square({ block, lines, originX, originY, open, coarse, onReach, onLeave, onTap, ride, at }) {
    const span = block.span || 1;
    const left = useTransform(lines, (l) => originX + l.x[block.col]);
    const top = useTransform(lines, (l) => originY + l.y[block.row]);
    const width = useTransform(lines, (l) => l.x[block.col + span] - l.x[block.col]);
    const height = useTransform(lines, (l) => l.y[block.row + 1] - l.y[block.row]);

    const grown = useTransform(ride, [at, at + STEP * 0.8], [0.86, 1]);
    const shown = useTransform(ride, [at, at + STEP * 0.5], [0, 1]);

    return (
        <motion.div
            className="OfferStrip__box OfferStrip__square"
            style={{ left, top, width, height, opacity: shown, scale: grown }}
            // Enter/leave, or a tap — never both. See useCoarsePointer: a
            // finger opens a square and then has no way of shutting it again,
            // and a wall that stays redistributed around a square nobody is
            // touching is a wall with a fault in it.
            onPointerEnter={coarse ? undefined : onReach}
            onPointerLeave={coarse ? undefined : onLeave}
            onClick={coarse ? onTap : undefined}
        >
            {/* Both lines grow together, and the label is there before anybody
                reaches for it: a number with nothing beside it is a number, and
                what the pointer adds is emphasis rather than the fact. */}
            <motion.span
                className="OfferStrip__square__body"
                animate={{ scale: open ? 1.16 : 1 }}
                transition={REACH}
            >
                <span className="OfferStrip__square__value">{block.value}</span>
                <span className="OfferStrip__square__label">{block.label}</span>
            </motion.span>
        </motion.div>
    );
}

function Section({ section, slot, ride, at, coarse, mode }) {
    const from = at;
    const enter = useTransform(ride, [from, from + STEP * 0.8], [0, 1]);
    const lift = useTransform(ride, [from, from + STEP * 0.8], [26, 0]);

    // The heading stands in the notch the wall leaves, so it cannot be wider
    // than the notch is. On a short screen the wall's side is cut down to fit
    // the height — see SquareWall — and the notch narrows with it, while the
    // words, written as a share of the slot's width, do not: at 844 × 390 the
    // heading ran out of the notch and across the square beside it.
    const width = section.square
        ? Math.min(section.text.w * slot.w, wallNotch(section, slot))
        : section.text.w * slot.w;

    return (
        <>
            {/* Outside the wall, and in no box of its own: the boxes are what
                the section shows, and a heading in a box is a box too many. */}
            <motion.header
                className="OfferStrip__words"
                style={{
                    left: slot.x + section.text.x * slot.w,
                    top: slot.y + section.text.y * slot.h,
                    width,
                    opacity: enter,
                    y: lift,
                }}
            >
                <p className="OfferStrip__n">{section.n}</p>
                <h3 className="OfferStrip__title">{section.name}</h3>
                {/* The site's own grammar for a statement: eyebrow, title,
                    rule, and the answer under the rule. */}
                <motion.span
                    className="OfferStrip__words__rule"
                    style={{ scaleX: enter }}
                    aria-hidden="true"
                />
                <p className="OfferStrip__lead">{section.lead}</p>
            </motion.header>

            {section.square ? (
                <SquareWall
                    section={section}
                    slot={slot}
                    ride={ride}
                    at={from}
                    coarse={coarse}
                />
            ) : (
                section.blocks.map((block, i) => (
                    <Block
                        key={i}
                        block={block}
                        slot={slot}
                        section={section}
                        at={from + STEP * (0.35 + i * 0.14)}
                        ride={ride}
                        coarse={coarse}
                        mode={mode}
                    />
                ))
            )}
        </>
    );
}

// One name on the foot rule, arriving with its own section.
function Stop({ section, slot, top, ride, at }) {
    const enter = useTransform(ride, [at, at + STEP * 0.6], [0, 1]);

    return (
        <motion.span
            className="OfferStrip__stop"
            style={{ left: slot.x + 0.03 * slot.w, top, opacity: enter }}
        >
            <span className="OfferStrip__stop__dot" aria-hidden="true" />
            <span className="OfferStrip__stop__n">{section.n}</span>
            <span className="OfferStrip__stop__name">{section.name}</span>
        </motion.span>
    );
}

function Block({ block, slot, section, at, ride, coarse, mode }) {
    const enter = useTransform(ride, [at, at + STEP * 0.75], [0, 1]);
    const lift = useTransform(ride, [at, at + STEP * 0.75], [34, 0]);
    const grown = useTransform(ride, [at, at + STEP * 0.8], [0.86, 1]);
    const rise = { opacity: enter, y: lift };
    const box = { ...place(block, slot), ...rise };


    if (block.kind === "stat") {
        return (
            <motion.div className="OfferStrip__box OfferStrip__stat" style={box}>
                <span className="OfferStrip__stat__value">{block.value}</span>
                <span className="OfferStrip__stat__label">{block.label}</span>
            </motion.div>
        );
    }

    if (block.kind === "item") {
        return (
            <motion.div className="OfferStrip__box OfferStrip__item" style={box}>
                <span className="OfferStrip__item__n">{block.i}</span>
                <span className="OfferStrip__item__title">{block.title}</span>
                <span className="OfferStrip__item__body">{block.body}</span>
            </motion.div>
        );
    }

    if (block.kind === "note") {
        return (
            <motion.div className="OfferStrip__box OfferStrip__note" style={box}>
                {block.text}
            </motion.div>
        );
    }

    if (block.kind === "map") {
        // Arrives the way the squares do — scaled into itself, not raised —
        // because it is one of the boxes and not a picture beside them.
        const stacked = mode === "stacked";
        const { box, mapW } = mapBox(block, slot, stacked ? CAPTION_H : 0);
        return (
            <motion.div
                className="OfferStrip__box OfferStrip__map"
                style={{ ...box, opacity: enter, scale: grown }}
            >
                {/* The map is told how many pixels wide it is going to be.
                    A flag is a picture at a fixed size and everything else in
                    there is in the projection's units, so the one number that
                    converts between them cannot be assumed — at 366px the
                    desktop's 26px flags are three times the size of the
                    country they stand on. */}
                <EuropeMap
                    ride={ride}
                    at={at}
                    step={STEP}
                    width={mapW}
                    caption={stacked}
                    coarse={coarse}
                />
            </motion.div>
        );
    }

    if (block.kind === "photo") {
        return (
            <motion.div
                className="OfferStrip__box OfferStrip__photo"
                style={{ ...box, backgroundImage: `url(${block.src})` }}
            >
                <span className="OfferStrip__photo__caption">{block.caption}</span>
            </motion.div>
        );
    }

    // The map and the projection: the two that are a component's work each.
    return (
        <motion.div className="OfferStrip__box OfferStrip__plate" style={box}>
            <span className="corner corner--tl" />
            <span className="corner corner--tr" />
            <span className="corner corner--bl" />
            <span className="corner corner--br" />
            <span className="OfferStrip__plate__label">{block.label}</span>
            <span className="OfferStrip__plate__note">{block.note}</span>
        </motion.div>
    );
}
