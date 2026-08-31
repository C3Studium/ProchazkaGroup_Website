'use client'
import { AnimatePresence, motion, useReducedMotion, usePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import Advisors from './advisors'
import Arrow from '@/components/common/ui/Arrow'
import CornerMarks from '@/components/common/ui/CornerMarks'
import PixelReveal from '@/components/common/ui/PixelReveal'
import { CURTAIN } from '@/components/common/ui/entrance'
import { NavPages, NavAddLinks, NavIcons } from '@/constants/common'

// The menu.
//
// A bento in the middle of the screen, over the page's own photograph turned
// down to a tone. There is no separate picture any more: the pictures are in
// the boxes.
//
// THE BENTO SAYS WHAT MATTERS.
//
// Twelve cells, eight boxes. NABÍDKA takes four of them and BENEFIT PROGRAM
// two; the other six take one each. That is the whole hierarchy and it is
// stated once, in AREAS.
//
// REACHING FOR A BOX OPENS IT.
//
// The box's own photograph unfolds inside it, and which edge it unfolds from is
// where the box sits: the boxes down the left open to the right, the ones down
// the right open to the left, the bottom row opens upwards over its own words.
// Every one of them opens INWARD, towards the middle of the bento — so the
// panel moves like something being opened out from its edges rather than eight
// boxes each doing the same thing.
//
// The grid moves with it. Reaching for a box widens the columns it stands in
// and heightens its row, and every other box gives way, because all twelve
// cells are tracks of one grid. Take the pointer off and the tracks go back.

// The grid, and the only place its size is stated in JavaScript. The stylesheet
// says the same thing in grid-template-areas; these two are the pair that has to
// agree.
const COLS = 4;
const ROWS = 3;

// Where each box goes, in NavPages order — which is reading order, so this runs
// across the top row, then the middle, then the bottom.
const AREAS = ['hlavni', 'nabidka', 'benefit', 'kontakt', 'onas', 'poradci', 'recenze', 'partneri'];

// How big the label sets. It follows the box, and the box follows the hierarchy.
const SIZES = { nabidka: 'lg', benefit: 'md', kontakt: 'md' };

// Which tracks each box stands in — the same thing grid-template-areas says in
// the stylesheet, in the form the hover needs to read it.
const SPANS = {
    hlavni:   { cols: [1],    rows: [1] },
    nabidka:  { cols: [2, 3], rows: [1, 2] },
    benefit:  { cols: [4],    rows: [1, 2] },
    kontakt:  { cols: [1],    rows: [2] },
    onas:     { cols: [1],    rows: [3] },
    poradci:  { cols: [2],    rows: [3] },
    recenze:  { cols: [3],    rows: [3] },
    partneri: { cols: [4],    rows: [3] },
};

// The bento is not one grid, it is three, and the cuts are drawn from the
// tracks — so all three have to be described or the panel is ruled for a shape
// it is not drawing. The table above is the wide one; these two are the others,
// and each is the same map its own block in the stylesheet writes.
//
// What this fixes, measured at 817×1174 and 390×844: below 820px the boxes are
// two across and four down, but the cut for a box's right-hand edge was still
// asking "is this box in column FOUR" and the one for its foot "is it in row
// THREE". Against a two-column, four-row map that is the wrong question twice.
// BENEFIT PROGRAM lost the rule between it and O NÁS, because in the wide map
// it is the last column and needs none; and O NÁS lost the rule between it and
// RECENZE, because in the wide map it is the last row. Every other box happened
// to answer the same either way.
//
// PARTNEŘI has the fifth row across both columns. It used to be hidden here —
// four rows seat seven boxes once NABÍDKA has taken two — and the page then had
// no way in from the menu at all. Only the SIDEWAYS map below still drops it.
//
// Five rows and not four is load-bearing for the cuts, not just for the seat:
// asked "is this box in the last row" against four, the boxes in row 4 would
// each draw a rule under themselves that the row beneath now needs open, and
// PARTNEŘI would draw one along the panel's own bottom frame.
const COMPACT_COLS = 2;
const COMPACT_ROWS = 5;
const SPANS_COMPACT = {
    hlavni:   { cols: [1],    rows: [1] },
    kontakt:  { cols: [2],    rows: [1] },
    nabidka:  { cols: [1, 2], rows: [2] },
    benefit:  { cols: [1],    rows: [3] },
    onas:     { cols: [2],    rows: [3] },
    poradci:  { cols: [1],    rows: [4] },
    recenze:  { cols: [2],    rows: [4] },
    partneri: { cols: [1, 2], rows: [5] },
};

// A phone on its side: four across, two down, and it wins wherever it and the
// block above both match — it is written after it in the stylesheet.
const SIDEWAYS_COLS = 4;
const SIDEWAYS_ROWS = 2;
const SPANS_SIDEWAYS = {
    hlavni:   { cols: [1],    rows: [1] },
    nabidka:  { cols: [2, 3], rows: [1] },
    benefit:  { cols: [4],    rows: [1] },
    kontakt:  { cols: [1],    rows: [2] },
    onas:     { cols: [2],    rows: [2] },
    poradci:  { cols: [3],    rows: [2] },
    recenze:  { cols: [4],    rows: [2] },
    partneri: { cols: [4],    rows: [2] },
};

// Which edge each box's picture unfolds from. Always the outer one, so every
// box opens towards the middle of the bento.
const OPENS = {
    hlavni: 'left',
    nabidka: 'top',
    benefit: 'right',
    kontakt: 'left',
    onas: 'bottom',
    poradci: 'bottom',
    recenze: 'bottom',
    partneri: 'right',
};

// Deliberately gentle. A box is already the size its own importance asked for,
// so the hover only has to say "this one" — pushed harder, a small box reaching
// for the pointer would be wider than NABÍDKA and the hierarchy would read
// differently every time the pointer moved.
const BIG_COL = 1.42;
const SMALL_COL = 0.85;
const BIG_ROW = 1.3;
const SMALL_ROW = 0.83;

// The tracks, as a grid-template string. Plain CSS transitions rather than
// springs: a menu hover is one move at a time, and a CSS transition interrupted
// mid-flight carries on from the value it is actually showing, which is all a
// spring would have bought here.
const tracks = (area, axis, count, big, small) => {
    const spans = area ? SPANS[area]?.[axis] : null;
    return Array.from({ length: count }, (_, i) =>
        `${!spans ? 1 : spans.includes(i + 1) ? big : small}fr`).join(' ');
};

// ── how a picture unfolds ──
//
// Not `clip-path` any more, and that is the whole of what was making it feel
// rough. An animated inset() is re-rasterised on the main thread every frame,
// and it was doing that inside a box whose own width was being animated by the
// grid at the same time — two layout-and-paint jobs a frame, on the largest
// element in the panel.
//
// This is the same reveal built out of transforms only, so the compositor owns
// it: an outer layer slides in from the edge while the inner one slides the
// opposite way by exactly as much. The picture therefore never moves relative
// to the box — what moves is the edge that uncovers it — and nothing is painted
// twice.
//
// The two have to share a duration and a curve exactly. Give them different
// ones and they stop cancelling, and the picture visibly drags inside its own
// frame.
const OUTER = {
    left:   { x: '-100%', y: '0%' },
    right:  { x: '100%',  y: '0%' },
    top:    { x: '0%',    y: '-100%' },
    bottom: { x: '0%',    y: '100%' },
};

const INNER = {
    left:   { x: '100%',  y: '0%' },
    right:  { x: '-100%', y: '0%' },
    top:    { x: '0%',    y: '100%' },
    bottom: { x: '0%',    y: '-100%' },
};

const REST = { x: '0%', y: '0%' };

// The mask and the push-in do not finish together, which is what makes it read
// as something opening rather than a panel switching on: the picture is still
// easing out of its push long after the edge has finished passing over it.
const MASK = { duration: 0.7, ease: CURTAIN };
const PUSH = { duration: 1.15, ease: CURTAIN };

// What the reader's own setting takes away is the push-in — the one thing here
// that is parallax. The uncovering stays, because the box still has to show
// what is in it, and it is quicker.
const CALM = { duration: 0.28, ease: CURTAIN };

const outerPose = (opens, open, calm) => ({
    ...(open ? REST : (OUTER[opens] || OUTER.bottom)),
    transition: calm ? CALM : MASK,
});

const innerPose = (opens, open, calm) => ({
    ...(open ? REST : (INNER[opens] || INNER.bottom)),
    scale: calm ? 1 : (open ? 1 : 1.06),
    transition: calm
        ? CALM
        : { x: MASK, y: MASK, scale: PUSH },
});

// What "no picture" looks like to PixelReveal: one pixel of the site's own
// ground colour, stretched. The menu pixelates this into a photograph on the
// way in and the photograph back into it on the way out — one mechanism for
// both, and the same one the roster on /o-nas uses between two portraits.
//
// Opaque, and it has to be. PixelReveal composites the incoming picture OVER
// the outgoing one and never clears the canvas between frames, because between
// two photographs there is nothing to clear. Handed a transparent tile it
// therefore turned nothing over: `destination-in` against transparent leaves an
// empty cut, the outgoing photograph stayed underneath it for the whole run,
// and the ground simply never left. Measured — the canvas held the same pixels
// from the first frame of the close to the last.
const BLANK = `data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'><rect width='1' height='1' fill='#020E15'/></svg>"
)}`;

// How long the ground's own run takes. Long, on purpose: it is the whole
// screen turning over cell by cell and at nine hundred milliseconds it was over
// before anyone had finished registering that it had started.
const GROUND_RUN = 1500;

// How much of that run one cell spends turning over. A seventh, against the
// third PixelReveal uses by default — so a cell is a square that flips rather
// than a square that dissolves, and the front reads as an edge made of whole
// cells. See the note on CELL_SHARE in PixelReveal.
const GROUND_EDGE = 0.14;

// The menu arrives in three moves and leaves in the same three backwards.
//
//   1. the ground turns over, cell by cell, across the whole screen
//   2. one hairline draws itself along the top, right to left
//   3. the box comes down out of it
//
// Leaving: the box goes back up into the line, the line retracts the way it
// came, and the ground is the last thing on the screen.
//
// The line first is the point of it. A box that simply appears is a box; a box
// that comes out of a line drawn for it reads as being opened — and it is the
// site's own hairline doing the opening.
const EDGE_AT = 0.3;
const EDGE_RUN = 0.6;
const BOX_AT = EDGE_AT + EDGE_RUN;
const BOX_RUN = 0.6;
const CONTENT_AT = BOX_AT + 0.3;

// Going back, the box has to be gone before the line starts retracting — a line
// pulling out from under a box that is still there is the one order that does
// not read as a reversal.
const OUT_EDGE_AT = 0.5;

// Drawn from the right and retracted back to the right: the same end both times,
// so it leaves the way it came rather than sliding off the far side.
const edgeIn = {
    initial: { scaleX: 0 },
    enter: { scaleX: 1, transition: { duration: EDGE_RUN, ease: CURTAIN, delay: EDGE_AT } },
    exit: { scaleX: 0, transition: { duration: 0.45, ease: CURTAIN, delay: OUT_EDGE_AT } },
};

// Down out of the line, and back up into it.
const boxIn = {
    initial: { clipPath: 'inset(0% 0% 100% 0%)' },
    enter: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: BOX_RUN, ease: CURTAIN, delay: BOX_AT } },
    exit: { clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.45, ease: CURTAIN } },
};

const veilIn = {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 0.5, ease: CURTAIN } },
    exit: { opacity: 0, transition: { duration: 0.4, ease: CURTAIN, delay: 0.1 } },
};

// The boxes wait for the line and the box on the way in, and for nothing at all
// after that.
//
// `after` is what the panel has already done. On the first open the boxes are
// the last of three moves and have to wait their turn; coming back from the
// roster the box is already open and the line already drawn, so the same wait
// would be a second and a quarter of an empty panel before its own menu
// reappeared. Same variants, one number.
const cellIn = {
    initial: { opacity: 0, y: 18 },
    enter: ({ i, after }) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: CURTAIN, delay: (after ? 0.06 : CONTENT_AT) + i * 0.045 },
    }),
    exit: { opacity: 0, y: 10, transition: { duration: 0.18, ease: CURTAIN } },
};

// The panel is one box with two things it can be showing. Arriving at the
// roster is not opening something else — it is this box growing and its contents
// being changed, which is what makes BACK a word in the rail rather than a
// dismissal.
//
// The caps are in rem, and they are the numbers that actually decide the size
// on a wide screen: past about 1620 across the vw term overtakes them and the
// min() stops being a safety rail and starts being the width. Written as px
// they froze — a 2560 monitor got the same 1360-wide menu a 1920 one did, two
// thirds of the way to a panel adrift in the middle of the screen. rem grows
// with the root ramp above 1920 (see styles/globals.scss) and is the identical
// 1360/760/1720/980 at every width below it, so the proportions the panel was
// drawn with survive the bigger screen instead of being spent on margin.
// The stylesheet's own fallback says the same thing and the two have to agree.
const SIZE = {
    menu: { width: 'min(84vw, 85rem)', height: 'min(70vh, 47.5rem)' },
    advisors: { width: 'min(92vw, 107.5rem)', height: 'min(86vh, 61.25rem)' },
};

// The same panel on a laptop with a short viewport.
//
// The box is centred on the window, and the navbar is fixed over the top 81px
// of it. At 86vh that leaves the roster's top edge at 50px on a 1260×720 — 31px
// BEHIND the site's own name and menu — and the same at every stop this query
// covers: 46 at 1220×660, 54 at 1366×768, 56 at 1440×800. Only the roster; the
// menu is 70vh and already clears it.
//
// 72vh is the largest round figure that clears the bar at the shortest of them
// (1220×660, where it lands at 79px with 11px of air) and it moves the top edge
// down by half a hundred pixels at the size this was reported on. The height is
// what moves it: the box is centred, so the only way its top goes down is for
// the box to be shorter — a `top` offset would push the foot off the screen,
// which at 720 has only 50px to give.
//
// Same `min(<vh>, <rem>)` shape as the two above, and that is load-bearing:
// framer interpolates between values of the same template by walking the
// numbers in them, so a `calc()` here would animate the panel's growth out of
// the menu as a snap. The rem term is dead in this range (61.25rem is 980px and
// nothing here is 800 tall) and is kept for exactly that reason.
const SIZE_SHORT = {
    menu: SIZE.menu,
    advisors: { width: 'min(92vw, 107.5rem)', height: 'min(72vh, 61.25rem)' },
};

// The box resizes on the house springs — the width leads, the height trails it
// by a few frames. See /nabidka.
const GROW_W = { type: 'spring', stiffness: 150, damping: 26, restDelta: 0.5 };
const GROW_H = { type: 'spring', stiffness: 210, damping: 24, restDelta: 0.5 };

const railIn = {
    initial: { opacity: 0 },
    enter: (after) => ({
        opacity: 1,
        transition: { duration: 0.4, ease: CURTAIN, delay: (after ? 0.1 : CONTENT_AT + 0.35) },
    }),
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Both have to be in `images.qualities` in next.config.mjs, which is
// [60, 80, 90, 100]. Asking for anything else does not fail — Next quietly
// serves a neighbouring value, so the number in the source stops describing
// what ships.
const GROUND_QUALITY = 60;
const BOX_QUALITY = 80;

// PixelReveal loads a plain URL with `new Image()`, which for these files means
// the six-thousand-pixel original — several megabytes each, eight of them. This
// hands it the same optimiser every other picture on the site goes through.
// 1920 is one of Next's default `deviceSizes`; an unlisted width is refused.
const optimised = (src) => `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=${GROUND_QUALITY}`;

// A media query as state, hydration-safe: false on the first render — the
// panel only ever mounts after a click, but the pattern stays the same as
// everywhere else so nothing branches between server and client — and the
// real answer arrives from the effect.
const useMedia = (query) => {
    const [match, setMatch] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(query);
        const read = () => setMatch(mq.matches);
        read();
        mq.addEventListener('change', read);
        return () => mq.removeEventListener('change', read);
    }, [query]);

    return match;
};

// The stops where the stylesheet takes the grid over: the phone map below
// 820px, and the phone-landscape map wherever the viewport is shorter than
// 520px. The JS must not write its 4×3 track lists there — an inline
// `grid-template-columns` with four values beats the stylesheet's two-column
// map and squeezes the whole bento into half the panel.
// The third arm is a tablet upright at 820–900, which the stylesheet gives the
// five-row map. Without it `compact` is false there and the 4×3 track list is
// written inline over a grid that has two columns and five rows — the tracks
// win, the areas are left addressing rows that no longer exist, and the bento
// collapses into a corner of the panel.
const COMPACT =
    '(max-width: 820px), (max-height: 520px), (max-width: 900px) and (orientation: portrait)';

// No hover to drive the wall with, so the tap has to be both the reach and the
// choice. `hover: none` rather than `pointer: coarse` alone — a laptop with a
// touchscreen still has the hover.
const TOUCH = '(hover: none)';

// A `PHONE` query used to be here, telling a phone from anything else with a
// touchscreen. It existed for one reason: the box's two-step was right on a
// tablet and wrong on a phone. There is no two-step any more — one tap goes,
// on everything — so there is nothing left for the distinction to decide, and
// `TOUCH` above is the whole of what this panel needs to know.

// A laptop with a short viewport: 1280×720, 1220×660, 1366×768, 1440×800. This
// is the site's own `lt` stop, written out because the panel's size is an
// inline style animated by framer and a stylesheet cannot reach it. MUST stay
// identical to `lt` in styles/system/_breakpoints.scss.
const SHORT_LAPTOP = '(min-width: 1200px) and (max-height: 800px)';

// Which of the three bento maps is on the screen. Two queries rather than the
// `compact` one above, because that is an OR of both small stops and the two
// draw DIFFERENT grids — asked as one question it cannot tell them apart.
//
// Each must stay identical to the block that owns its map in styles.scss:
// NARROW is that file's `below-px(820)`, SIDEWAYS its `phs-h`. Sideways is
// tested first here for the same reason it wins there — it is written last.
// The second arm is a tablet upright, which the stylesheet's own block reaches
// with `v(md) + from-px(600)` and this has to match: 820–900 upright draws the
// same five-row map and would otherwise be measured against the wide one.
const NARROW =
    '(max-width: 820px), (max-width: 900px) and (orientation: portrait)';
const SIDEWAYS = '(min-width: 480px) and (max-height: 520px) and (orientation: landscape)';

// The office is in Písek and the clock in the rail says so. Read on the client
// only: the server has no idea what time it is, and a time rendered into the
// HTML is a hydration mismatch and a wrong number until the first tick.
const useOfficeClock = () => {
    const [time, setTime] = useState(null);

    useEffect(() => {
        const read = () => setTime(new Intl.DateTimeFormat('cs-CZ', {
            timeZone: 'Europe/Prague',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date()));

        read();
        const timer = setInterval(read, 20000);
        return () => clearInterval(timer);
    }, []);

    return time;
};

export default function NavbarBody({ setMenu, onSheet }) {
    const pathname = usePathname();
    const time = useOfficeClock();
    const calm = useReducedMotion();
    const touch = useMedia(TOUCH);
    const compact = useMedia(COMPACT);
    const shortLaptop = useMedia(SHORT_LAPTOP);
    const narrow = useMedia(NARROW);
    const sideways = useMedia(SIDEWAYS);

    // The map the cuts are drawn from, and its own last column and last row —
    // which is the whole of what a cut asks about.
    const grid = sideways
        ? { spans: SPANS_SIDEWAYS, cols: SIDEWAYS_COLS, rows: SIDEWAYS_ROWS }
        : narrow
          ? { spans: SPANS_COMPACT, cols: COMPACT_COLS, rows: COMPACT_ROWS }
          : { spans: SPANS, cols: COLS, rows: ROWS };

    // The menu opens on the page you are on, so the ground behind it is already
    // where you are — the one thing a menu can say before you have touched it.
    const here = useMemo(() => {
        const found = NavPages.findIndex((item) => item.href === pathname);
        return found < 0 ? 0 : found;
    }, [pathname]);

    // What is open, and there is only ever one question: the box under the
    // pointer, or — when the pointer is not on the bento at all — the page you
    // are already on. So the menu opens with your own page open, closes that
    // one when you reach for another, and falls back to it when you leave.
    const [hovered, setHovered] = useState(-1);

    // Which of the two the panel is showing. The roster is not a second panel;
    // it is this one, larger, with different contents.
    const [view, setView] = useState('menu');

    // Whether the panel's own arrival is behind it. Read while rendering rather
    // than kept in state: nothing should re-render because this flipped, it only
    // changes what the next render asks for.
    const arrived = useRef(false);
    useEffect(() => { arrived.current = true; }, []);
    const shown = hovered < 0 ? here : hovered;

    // The ground is a canvas, not a React tree, and it starts as nothing. The
    // first swap is what pixelates the photograph in; the last one takes it
    // back out. `usePresence` is what makes the second possible — AnimatePresence
    // holds the whole menu mounted until `safeToRemove` says the run is done.
    const [present, safeToRemove] = usePresence();
    const [ground, setGround] = useState(BLANK);

    useEffect(() => {
        if (!present) return;
        setGround(optimised(NavPages[shown].photo.src));
    }, [present, shown]);

    useEffect(() => {
        if (present) return;
        setGround(BLANK);
        const done = setTimeout(safeToRemove, GROUND_RUN + 120);
        return () => clearTimeout(done);
    }, [present, safeToRemove]);

    const close = () => setMenu(false);

    // Escape goes back one step before it goes out. The bar is listening for the
    // same key to close the whole menu, and this listener is registered first —
    // React runs a child's effects before its parent's — so stopping the event
    // here is what keeps the roster from closing the panel it is inside.
    useEffect(() => {
        if (view !== 'advisors') return;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            e.stopImmediatePropagation();
            setView('menu');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [view]);

    return (
        <>
            {/* Under everything, including the page. Clicking it closes. */}
            <motion.div
                className="navPanel__veil"
                variants={veilIn}
                initial="initial"
                animate="enter"
                exit="exit"
                // Clicking away from the roster goes back to the menu it
                // came out of; clicking away from the menu closes. One step at
                // a time, the same as Escape — landing on the page because you
                // missed a portrait is a way of losing the menu you did not ask
                // for.
                onClick={() => (view === 'advisors' ? setView('menu') : close())}
            >
                <div className="navPanel__ground" aria-hidden="true">
                    <PixelReveal
                        src={ground}
                        alt=""
                        // Coarser than the eighth this started at. The canvas
                        // is still a fraction of the screen — that is what keeps
                        // a full-screen turnover affordable — but at a seventh
                        // the cells were smaller than the softness of the
                        // upscale and the whole thing read as a haze rather than
                        // as squares.
                        resolution={0.3}
                        cellShare={GROUND_EDGE}
                        // Not a clean wipe. See `drift` in PixelReveal: the
                        // front still crosses the screen in a direction, but its
                        // edge is broken up so cells scatter ahead of and behind
                        // it rather than falling in a line.
                        order="drift"
                        // A turnover cell by cell across the whole screen is
                        // exactly the scale of movement the preference is
                        // about. It still changes picture; it stops being an
                        // event while it does.
                        duration={calm ? 320 : GROUND_RUN}
                    />
                </div>
                <span className="navPanel__veil__tint" />
            </motion.div>

            <motion.div
                id="navPanel"
                className="navPanel"
                animate={(shortLaptop ? SIZE_SHORT : SIZE)[view]}
                transition={calm
                    ? { duration: 0.3, ease: CURTAIN }
                    : { width: GROW_W, height: GROW_H }}
            >
                {/* The line the box comes out of. Outside the frame, because the
                    frame is clipped to nothing while this is being drawn and
                    anything inside it would be clipped with it. It stops short
                    of both corners: the box is rounded there, and a rule carried
                    past a curve hangs off it. */}
                <motion.span
                    className="navPanel__edge"
                    style={{ '--sweep': '0s' }}
                    variants={edgeIn}
                    initial="initial"
                    animate="enter"
                    exit="exit"
                />

                <motion.div
                    className="navPanel__frame"
                    variants={boxIn}
                    initial="initial"
                    animate="enter"
                    exit="exit"
                >
                    {/* The rest of the frame is the site's own rules and not a
                        border. The delays are negative and in order round the
                        panel, so one light goes round it rather than three
                        lighting at once. */}
                    <span className="navPanel__rule navPanel__rule--r" style={{ '--sweep': '-1.6s' }} />
                    <span className="navPanel__rule navPanel__rule--b" style={{ '--sweep': '-4.2s' }} />
                    <span className="navPanel__rule navPanel__rule--l" style={{ '--sweep': '-2.4s' }} />

                    <AnimatePresence mode="wait">
                    {view === 'menu' ? (
                    <motion.nav
                        key="bento"
                        exit={{ opacity: 0, transition: { duration: 0.18, ease: CURTAIN } }}
                        className="navPanel__bento"
                        // At the compact stops the stylesheet owns the grid —
                        // it is a different map there, and an inline 4×3 track
                        // list would beat it and squeeze the bento into half
                        // the panel.
                        style={compact ? undefined : {
                            gridTemplateColumns: tracks(AREAS[hovered], 'cols', COLS, BIG_COL, SMALL_COL),
                            gridTemplateRows: tracks(AREAS[hovered], 'rows', ROWS, BIG_ROW, SMALL_ROW),
                        }}
                        // On touch the pointer "leaves" the moment the finger
                        // lifts, which would close the box the tap just opened.
                        onPointerLeave={() => { if (!touch) setHovered(-1); }}
                    >
                        {NavPages.map((item, index) => {
                            const area = AREAS[index];
                            const open = shown === index;
                            const isHere = item.href && pathname === item.href;
                            const cls = [
                                'navPanel__box',
                                open ? 'is-open' : '',
                                isHere ? 'is-here' : '',
                                item.modal === 'contact' ? 'is-contact' : '',
                            ].filter(Boolean).join(' ');

                            // The contact box opens the sheet; the other seven
                            // go somewhere. Same box, and the element says which
                            // it is rather than looking like a link and not
                            // being one.
                            //
                            // ONE TAP, on anything with a touchscreen.
                            //
                            // A tablet used to get two: the tap was treated as
                            // the reach, since there is no hover to open a box
                            // with, so the first tap on a closed box opened it —
                            // photograph, note — and only a tap on the already
                            // open box went through. A phone was exempt.
                            //
                            // The preview is not worth a tap. It is a
                            // photograph and a line of note on a box the reader
                            // has already decided about; there is no choice
                            // being made in it, so the second tap is a toll on
                            // every destination in the menu, which is exactly
                            // what a menu is for saving. The roster is the
                            // different case and keeps its own step, because
                            // there the first tap is a genuine choice — WHICH
                            // advisor — and the opening is that choice being
                            // made.
                            //
                            // So the box is a real Link on touch as it always
                            // was on a phone, and that is not a style choice:
                            // PageVeil intercepts every internal <a> click in
                            // the CAPTURE phase, before any handler here could
                            // preventDefault. A <button> is how the old first
                            // tap could belong to this panel at all. As a Link
                            // the tap leaves through the veil exactly like a
                            // desktop click.
                            //
                            // `hovered` is never set from a tap now, so `shown`
                            // stays on `here` — the only box showing its
                            // photograph is the page you are already on, which
                            // is the one preview nobody had to ask for.
                            const Inner = item.modal ? 'button' : Link;

                            const innerProps = item.modal
                                ? {
                                    type: 'button',
                                    'aria-haspopup': 'dialog',
                                    onClick: () => {
                                        // The roster stays inside the panel;
                                        // only the contact sheet is a sheet.
                                        if (item.modal === 'advisors') { setView('advisors'); return; }
                                        close();
                                        onSheet?.(item.modal);
                                    },
                                }
                                : {
                                    href: item.href,
                                    onClick: close,
                                    'aria-current': isHere ? 'page' : undefined,
                                };

                            return (
                                <motion.div
                                    key={item.text}
                                    className={cls}
                                    style={{ gridArea: area }}
                                    data-size={SIZES[area] || 'sm'}
                                    data-opens={OPENS[area]}
                                    variants={cellIn}
                                    custom={{ i: index, after: arrived.current }}
                                    initial="initial"
                                    animate="enter"
                                    exit="exit"
                                    onPointerEnter={() => { if (!touch) setHovered(index); }}
                                >
                                    <Inner
                                        {...innerProps}
                                        className="navPanel__box__link"
                                        // The bar and the page say "this can be
                                        // used" the same way; `frame` is what
                                        // closes the cursor's own marks. See
                                        // ui/Cursor.
                                        data-cursor="frame"
                                        data-marks
                                        // Focus preview is a keyboard thing. On
                                        // touch a tap fires focus BEFORE click,
                                        // so an unguarded focus would put a
                                        // photograph on the screen for the two
                                        // frames between the finger landing and
                                        // the page leaving.
                                        onFocus={() => { if (!touch) setHovered(index); }}
                                    >
                                        {/* Mounted, not conditional: eight
                                            pictures asked for at the moment the
                                            pointer arrives is eight decodes in
                                            the middle of the movement they are
                                            supposed to be part of. */}
                                        <motion.span
                                            className="navPanel__box__shot"
                                            aria-hidden="true"
                                            // Shut on mount even when this is
                                            // the box that is about to be open,
                                            // so the page you are on unfolds as
                                            // the menu arrives instead of being
                                            // there already.
                                            initial={outerPose(OPENS[area], false, calm)}
                                            animate={outerPose(OPENS[area], open, calm)}
                                        >
                                            <motion.span
                                                className="navPanel__box__shot__in"
                                                initial={innerPose(OPENS[area], false, calm)}
                                                animate={innerPose(OPENS[area], open, calm)}
                                            >
                                                <Image
                                                    src={item.photo.src}
                                                    alt=""
                                                    fill
                                                    sizes="(max-width: 820px) 92vw, 42vw"
                                                    quality={BOX_QUALITY}
                                                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                                                />
                                            </motion.span>
                                        </motion.span>

                                        {/* Holds the words up off whatever the
                                            picture is doing underneath them. */}
                                        <span className="navPanel__box__scrim" aria-hidden="true" />

                                        <CornerMarks />

                                        <span className="navPanel__ord" aria-hidden="true">
                                            <span className="navPanel__tick" />
                                            {String(index + 1).padStart(2, '0')}
                                        </span>

                                        <span className="navPanel__foot">
                                            <span className="navPanel__label">{item.text}</span>
                                            <span className="navPanel__note" aria-hidden="true">
                                                <span>{item.note}</span>
                                            </span>
                                        </span>
                                    </Inner>

                                    {/* Where this box meets the next one. Real
                                        elements rather than the box's own
                                        edges, because the travelling light is
                                        drawn on a rule's ::after and a border
                                        does not have one. They move because the
                                        box does; nothing restates where they
                                        are.

                                        Only the inner edges: the panel's own
                                        four rules close the outside, and drawn
                                        twice a hairline reads heavier than the
                                        ones beside it. */}
                                    {!grid.spans[area].cols.includes(grid.cols) && (
                                        <span
                                            className="navPanel__cut navPanel__cut--v"
                                            style={{ '--sweep': `${(-0.7 * index).toFixed(1)}s` }}
                                            aria-hidden="true"
                                        />
                                    )}
                                    {!grid.spans[area].rows.includes(grid.rows) && (
                                        <span
                                            className="navPanel__cut navPanel__cut--h"
                                            style={{ '--sweep': `${(-0.7 * index - 0.35).toFixed(1)}s` }}
                                            aria-hidden="true"
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.nav>
                    ) : (
                        <Advisors key="advisors" calm={calm} touch={touch} onPick={close} />
                    )}
                    </AnimatePresence>

                    <motion.div
                        className="navPanel__rail"
                        variants={railIn}
                        custom={arrived.current}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                    >
                        <span className="navPanel__rule navPanel__rule--t" style={{ '--sweep': '-3.1s' }} />

                        {/* Not a clock for its own sake: the office is in Písek
                            and answers the phone between eight and four, and
                            this is the reader being told what time it is there
                            before they decide to ring it. */}
                        {view === 'advisors' ? (
                            <button
                                type="button"
                                className="navPanel__back"
                                onClick={() => setView('menu')}
                                data-cursor="frame"
                                data-marks
                            >
                                <CornerMarks />
                                {/* The page's own arrow, not a chevron drawn
                                    here out of a rotated box — that one's head
                                    never sat on its shaft, and there is no
                                    reading of this panel on which its arrow
                                    should be a different shape from every other
                                    arrow on the site. */}
                                <Arrow direction="left" className="navPanel__back__arrow" />
                                Zpět do menu
                            </button>
                        ) : (
                            <span className="navPanel__rail__time">{time ? `CET ${time}` : 'CET'}</span>
                        )}

                        <div className="navPanel__rail__links">
                            {NavAddLinks.map((link) => (
                                <Link key={link.href} href={link.href} data-cursor="frame" onClick={close}>
                                    {link.text}
                                </Link>
                            ))}
                            {NavIcons.map((icon) => (
                                <a key={icon.href} href={icon.href} target="_blank" rel="noreferrer" data-cursor="frame">
                                    {icon.text}
                                </a>
                            ))}
                        </div>

                        <span className="navPanel__rail__mark">© ProcházkaGroup 2026</span>
                    </motion.div>
                </motion.div>
            </motion.div>
        </>
    );
}
