"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
    motion,
    useMotionTemplate,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";

import SplitText from "@/components/common/ui/SplitText";
// The band, and the one question both halves of this section have to answer the
// same way — see useCoarsePointer there. It lives beside the band rather than
// here because the band is where most of the hovering happens; the import runs
// one way only, so there is no cycle.
import OfferStrip, { useCoarsePointer } from "@/components/pages/nabidka/OfferStrip";
import { coverGround } from "@/components/common/ui/pageGround";

// The three photographs the design was drawn on, all of which were already in
// the repository under names that do not describe them: the wallet is
// backgrounds/family.webp and the man on the phone is backgrounds/callBG.webp.
// These are 2000px copies — see the note on HERO_PHOTO in OfferHero.
//
// The first is drawn `unoptimized`, and so is the hero's copy of it. Both have
// to be the identical bitmap or the cut between the two sections shows, and
// only one of them can reach Next's optimiser.
const CELLS = [
    {
        figure: "8",
        photo: "/assets/backgrounds/wallet_2000.webp",
        // Must match OfferHero's exactly. This is the frame the hero hands
        // over, and the cut is only invisible while the two agree. Centred,
        // because the hero's own shader crops from the centre.
        position: "center",
        alt: "Otevřená peněženka s hotovostí",
        text: "domácností je v dluzích nebo je ignoruje",
        // What the sentence shrinks to once the cell is a tile. A count with
        // nothing beside it is a number on a photograph; two words are all a
        // tile has room for and all it needs, and all three tiles get one.
        short: "je v dluzích",
        // The line under the count, shown only while this cell is the one
        // being talked about. The statistic is the fact; this is what it means,
        // and a section called "the reality" needs both.
        note: "Dluh, o kterém se nemluví, roste sám. Nejdřív pomalu.",
        // Per photograph, because the three are nothing like each other in
        // exposure — the wallet is mid, the desk nearly black, the man at the
        // window a white wall in daylight. The first is not free: it is the
        // value the hero parts on.
        scrim: 0.58,
    },
    {
        figure: "3",
        // Not any of the backgrounds/behindLaptop* shots, tempting as they are
        // for this line: every one of them has the previous version of this
        // website open on the laptop screen, purple accent and old claims,
        // legible at full bleed and sitting directly behind the caption. Here
        // the screens face away.
        photo: "/assets/backgrounds/deskWork_2000.webp",
        position: "center 42%",
        alt: "Dva lidé procházejí u stolu finanční přehled",
        text: "domácností se před dluhy brání rozpočtem a hospodařením",
        short: "má rozpočet",
        note: "Rozpočet pomáhá. Sám o sobě ale nestačí.",
        scrim: 0.44,
        // Nudged left so the man at the desk lands inside the right-hand
        // column rather than under the cell next door. See `frame` below.
        frame: { x: -4, y: 0, scale: 1.06 },
    },
    {
        figure: "1",
        photo: "/assets/backgrounds/onPhone_2000.webp",
        position: "center 38%",
        alt: "Poradce telefonuje v kanceláři",
        text: "domácností má profesionála, který se o její finance stará",
        short: "má poradce",
        note: "Rozdíl není ve znalostech. Je v tom, že to někdo hlídá.",
        scrim: 0.62,
        // This cell is an eighth of the screen in its bottom-right corner, and
        // full-bleed framing put a radiator and a stack of boxes in it. The
        // subject of a photograph has to be moved into the box that is
        // actually going to be cut out of it.
        frame: { x: 24, y: 30, scale: 1.34 },
    },
];

// The composition is the statistic.
//
// These three numbers are a funnel — most households are in trouble, a few act,
// almost nobody has help — and the layout says so before the figures are read:
// the cells are sized 8 : 3 : 1 by area. One large panel on the left, two
// stacked on the right, and the story ends on the smallest box on the screen,
// which is the whole point of it.
//
// Both boundaries fall out of that ratio rather than being placed by eye:
//   B / C = row / (100 - row) = 3          -> row = 75
//   A / C = 100·col / (25·(100 - col)) = 8 -> col = 66.67
//
// And then the section keeps going, because the funnel is a sequence and not a
// still. Once the 8:3:1 frame has been read, each count takes its turn at being
// the largest thing on the screen — the emphasis walks down the funnel with the
// reader — and it finishes on 1/10, which is the one the page is arguing for.
//
// All four states are still just the two cuts. Moving the cells between fixed
// slots instead would mean interpolating three rectangles independently, and
// three rectangles that are each on their way somewhere do not tile a screen:
// there would be gaps, and a gap here shows the shader through the page.
//
//                       col     row     areas            largest
//   the 8:3:1 frame     66.67   75      66.7 25.0  8.3   8/10
//   second count        26      75      26.0 55.5 18.5   3/10
//   third count         26      22      26.0 16.3 57.7   1/10
//   folded              0       0        0.0  0.0 100    1/10, full bleed
const PHASES = {
    wide: { build: [100, 100], story: [200 / 3, 75], second: [26, 75], third: [26, 22] },
    // A true 8:3:1 in one column would leave the last cell 8% of the screen
    // with nothing legible in it, so the proportions soften. The order of size
    // still carries the funnel.
    narrow: { build: [100, 100], story: [52, 80], second: [22, 76], third: [22, 44] },
};

// How the section's scroll is divided between the two things it does.
//
// Everything below was tuned in fractions of a 620vh section — the counts'
// reading time against the moves between them, the pause, the close — and the
// offer that plays out afterwards needs a run of its own. So the numbers stay
// exactly as they were tuned and the whole set is rescaled once, here. A beat
// written as 0.19 still lands on the pixel it was measured on.
const ARC = 620;
// The band carries two sections now, not six: the other four moved out to the
// ladder that follows. It was still being given the scroll of six, so the whole
// of it travelled two thousand pixels over eight screens — a crawl. Two and a
// half screens is about a pixel of travel per pixel of scroll.
const OFFER = 250;
const ARC_SHARE = ARC / (ARC + OFFER);

// The whole arc, as fractions of the arc's own share of the section.
const RAW = {
    // The opening is nearly twice as long as it was. At the old timing the
    // question was at full strength for about two hundred pixels of scroll,
    // which on a smooth wheel is not a beat — it is a frame you pass through,
    // and the section read as starting with nothing but a photograph.
    // Long enough for the question to be written one letter at a time. At the
    // old five hundredths it had to arrive as a block, which on a photograph
    // this size is a caption appearing rather than a question being asked.
    headIn: [0.01, 0.11],
    headOut: [0.16, 0.22],
    headRule: [0.005, 0.08],
    // Both cuts at once. They used to run one after the other, which meant two
    // separate arrivals before the section could get to the part that is
    // actually about something — the counts trading places. Now the grid is one
    // gesture and the rest of the run belongs to the story.
    //
    // They do not arrive in lockstep even so: the two cuts are on springs of
    // different stiffness, so the vertical one leads and the horizontal trails
    // it by a few frames, and the three cells read as pushing each other apart
    // rather than as one number being scrubbed.
    // Reading gets more room than moving.
    //
    // Measured on the old spacing, each handover ran 475px of scroll while the
    // count it landed on was readable for 238 to 317 — more time watching the
    // grid rearrange itself than reading what it rearranged into, which is
    // backwards for a section whose whole content is three sentences.
    //
    // Now every handover is 319px and every count stands for 543.
    // The stretch from the grid being built to the copy leaving is split so
    // that every count stands for the same length and each handover is a little
    // over half of it — reading 543px, moving 319px, three times over.
    build: [0.19, 0.29],
    second: [0.434, 0.518],
    third: [0.662, 0.747],

    // Then the section stops moving and lets the last count stand. The pause is
    // a beat, not slack: the reader has just watched the emphasis walk from
    // eight to three to one, and the point of the walk is the one at the end of
    // it. Running straight from the last handover into the close would skip
    // the only moment the argument is actually made.
    //
    // After it, 1/10 keeps going — past being the largest cell to being the
    // whole screen — while its own copy leaves and the line takes its place.
    // The close. The three counts shrink into a cluster of tiles in the
    // top-left — 8 and 3 side by side, 1 under the 8 — and the rectangle they
    // leave, everything right of and below them, is where the closing line and
    // the component after it live.
    collapse: [0.84, 0.92],
    // And then the section's last eighth belongs to the sentence it has been
    // arguing towards. It used to have 0.05 of the run — 290px of scroll for
    // fifteen words, which is not a reveal, it is a caption catching up. The
    // close gives up three hundredths of the pause before it and the statement
    // gets 460px, read the way the home page reads its own: word by word, off
    // its own ride rather than off the section's.
    close: [0.92, 1],
    // The still hands back to the live shader once nothing else is moving.
    // Both are the same thing; the only difference is that one of them has
    // drifted since it was photographed, so a slow dissolve between them at a
    // moment when nothing else is happening is the least visible way to do it.


};

const BEATS = Object.fromEntries(
    Object.entries(RAW).map(([name, span]) => [name, span.map((v) => v * ARC_SHARE)])
);

// Each cell's copy is written on as its box opens, staggered behind the one
// before it. Fractions of the section, from the start of the build.
const REVEAL_STEP = 0.035;
const REVEAL_RUN = 0.14;

// Which of the two compositions a viewport gets.
//
// Not "is it narrow". A phone held sideways is 844 wide and 390 tall, and the
// stacked composition asks for three bands of a count each: the bar's clearance
// plus a figure and its line, which is 148px, three times, on a screen 390 tall.
// It does not fit and it never did — the third band was simply off the bottom of
// the screen with 1/10 in it, which is the count the whole section is arguing
// towards. A short, wide screen is the shape the WIDE composition is drawn for,
// so that is what it gets.
//
// 520px is the house's own line between a phone in landscape and a tablet — see
// phs/phl in _breakpoints.scss — and the stylesheet's stacked block is written
// on exactly this query. The two must not drift: the geometry below and the
// type that sits in it are one decision made in two files.
const isStacked = (vw, vh) => vw < 900 && vh > 520;

// Which of the three the band underneath is laid out on. The counts have two
// compositions and the band has three — a short screen keeps the counts' wide
// one, because three cells across a 844 × 390 screen is exactly what it is
// shaped for, but it cannot keep the band's: a heading above or inside a wall
// of squares needs height, and there is none. See SECTIONS in OfferStrip.
const modeFor = (vw, vh) => (vh <= 520 ? "short" : isStacked(vw, vh) ? "stacked" : "wide");

export default function StatRail() {
    const sectionRef = useRef(null);

    // Which geometry the cells are laid out on. Defaults to the wide one, which
    // is what the server renders; the real answer arrives a frame later and
    // before anything is on screen, because this section is still dark until it
    // pins.
    // The tiles depend on the viewport's proportions — a square is not a fixed
    // pair of percentages — so the size is measured rather than assumed.
    const [view, setView] = useState({ w: 1512, h: 900 });
    const narrow = isStacked(view.w, view.h);
    // Whether the pointer can hover at all. Everything in this section that
    // opens under a pointer has to open under a finger instead, and it cannot
    // do both: a tap fires pointerenter with no pointerleave ever following, so
    // a box opened on enter stays open for the rest of the page.
    //
    // Read after mount rather than guessed, so the server's markup and the
    // client's first render agree.
    const coarse = useCoarsePointer();
    useEffect(() => {
        const read = () =>
            setView((current) =>
                current.w === window.innerWidth && current.h === window.innerHeight
                    ? current
                    : { w: window.innerWidth, h: window.innerHeight }
            );
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, []);

    const geo = geomFor(view.w, view.h);
    const finals = finalBoxes(geo);
    // Where each count ends up once it is a box rather than a photograph, and
    // what the cluster does when one of them is reached for. Two cuts, sprung,
    // and the three boxes read their own corners off them — see boxClusterAt.
    const [reached, setReached] = useState(-1);
    const cutX = useMotionValue(SPLITS.rest[0]);
    const cutY = useMotionValue(SPLITS.rest[1]);
    const grow = useMotionValue(0);
    const CUT = { stiffness: 210, damping: 28, restDelta: 0.0005 };
    const sx = useSpring(cutX, CUT);
    const sy = useSpring(cutY, CUT);
    const sg = useSpring(grow, CUT);
    useEffect(() => {
        const [x, y] = SPLITS[reached] || SPLITS.rest;
        cutX.set(x);
        cutY.set(y);
        grow.set(reached < 0 ? 0 : 1);
    }, [reached, cutX, cutY, grow]);

    const countRow = useTransform([sx, sy, sg], ([x, y, g]) =>
        // The L of tiles is a wide screen's answer. A phone's is a rule of
        // three under the bar: at a tenth of 390px the L's corner box was
        // twenty pixels across and the three counts printed over each other —
        // "8/13/1" — which is the section's whole argument rendered as noise.
        // Across the full width each count keeps its own third and its own
        // words, and nothing has to be reached for to be read.
        narrow ? countBandAt(view.w, view.h) : boxClusterAt(view.w, view.h, [x, y], g)
    );
    // How far under the frame's rule the closing block hangs. Shorter on a
    // phone, where the rectangle is half a screen and the drop is a third of it.
    // The bar's height as a share of this viewport — see clearOf.
    const safe = (clearOf(view.w) / view.h) * 100;

    // Where the closing statement is read.
    //
    // Dead centre of the screen on a wide one, because the rectangle the tiles
    // leave open is most of the screen and its middle is the screen's middle.
    // Stacked, it is not: the three bands are pressed up under the bar and take
    // the top half, so a block centred on the screen is read through 1/10. It
    // sits in the middle of what is actually left.
    const closeTop = narrow
        ? `${(3 * geo.band + (100 - 3 * geo.band) / 2).toFixed(2)}%`
        : "50%";


    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });

    const progress = useSpring(scrollYProgress, {
        stiffness: 220,
        damping: 40,
        restDelta: 0.0005,
    });

    // This section is pulled a screen up over the hero, which means its own box
    // is on screen — and painting an opaque photograph over the bottom of the
    // hero — for the whole of the hero's run. It has to stay dark until it pins.
    //
    // The switch is instant rather than a fade, and can be: at the moment it
    // flips, the frame underneath is this section's own first frame, the same
    // file at the same scale under the same scrim.
    const { scrollYProgress: approach } = useScroll({
        target: sectionRef,
        offset: ["start end", "start start"],
    });
    const shown = useTransform(approach, (v) => (v >= 0.999 ? 1 : 0));

    // The two cuts, and the only two numbers the whole composition is built on.
    //
    // They lead and lag rather than sharing a clock. The cut that is opening a
    // new cell moves first and settles first; the one that is giving up space
    // trails it. Run off one value the panels read as a slider being scrubbed;
    // staggered they read as one pushing the other.
    const P = narrow ? PHASES.narrow : PHASES.wide;

    // The cuts hold their last arrangement. All three cells survive the close,
    // shrunk into tiles, so the grid they describe has to stay the grid.
    const colTarget = useTransform(
        progress,
        [BEATS.build[0], BEATS.build[1], BEATS.second[0], BEATS.second[1]],
        [P.build[0], P.story[0], P.story[0], P.second[0]]
    );
    const rowTarget = useTransform(
        progress,
        [BEATS.build[0], BEATS.build[1], BEATS.third[0], BEATS.third[1]],
        [P.build[1], P.story[1], P.second[1], P.third[1]]
    );
    const col = useSpring(colTarget, { stiffness: 150, damping: 26, restDelta: 0.01 });
    const row = useSpring(rowTarget, { stiffness: 210, damping: 24, restDelta: 0.01 });

    // The block leaves as one; the letters arrive one at a time inside it.
    const headOut = useTransform(progress, BEATS.headOut, [1, 0]);
    const headY = useTransform(progress, [BEATS.headIn[0], BEATS.headOut[1]], ["3vh", "-3vh"]);
    const headRule = useTransform(progress, BEATS.headRule, [0, 1]);
    const labelIn2 = useTransform(progress, [BEATS.headIn[0], BEATS.headIn[0] + 0.03], [0, 1]);

    // A single brighter mark travelling down the scale, at the pace the
    // question is being written. It is what turns the ticks from decoration
    // into a scale that is being read — and it is the only moving thing in the
    // block, which is why it can be this quiet.
    const readerAt = useTransform(progress, BEATS.headIn, ["14%", "86%"]);
    const readerIn = useTransform(
        progress,
        [BEATS.headIn[0], BEATS.headIn[0] + 0.02, BEATS.headIn[1] - 0.02, BEATS.headIn[1]],
        [0, 1, 1, 0]
    );

    // And a rule drawn out under the question as the last letters land, running
    // past the text towards the edge of the page — the sentence carrying on
    // into what the section is about to show.
    const underline = useTransform(
        progress,
        [BEATS.headIn[1] - 0.045, BEATS.headOut[0]],
        [0, 1]
    );

    // Nothing belonging to the cells exists until the first cut has started to
    // move. Before that this is still the hero's photograph and has to be.
    // A gate, not a fade. The visible arrival is the clip and the rise below —
    // opacity here only stops a cell with no area from drawing type into a
    // box that is one pixel tall.
    // How far the close has run. The tiles and the rectangle both read it.
    const close = useTransform(progress, BEATS.collapse, [0, 1]);

    const copyIn = useTransform(progress, [BEATS.build[0], BEATS.build[0] + 0.01], [0, 1]);

    // The cuts do not leave with the grid — they become its frame.
    //
    // The vertical one settles on the right edge of the left-hand column and
    // keeps running the full height; the horizontal one settles under the top
    // row and opens out to the full width, which it could not do while the
    // left cell was there to start it after.
    const cutsIn = copyIn;

    // The statement the section has been arguing towards, on a ride of its own.
    //
    // Everything below is stated as a fraction of this rather than of the
    // section, which is how the home page's panels are written — see
    // HorizontalScroll's copyRide. It is also what lets SplitText keep its own
    // defaults: its overlap window is a share of the value it is given, and
    // shares of a section are three decimal places of nothing.
    const closeRide = useTransform(progress, BEATS.close, [0, 1]);

    // The line drops out of the frame's own rule and the block hangs off it —
    // the connector WhoWeAre draws down into FirstTime, at the one place on
    // this page where there is a rule above a piece of copy to hang it from.
    const eyebrowIn = useTransform(closeRide, [0.04, 0.18], [0, 1]);
    const ruleDraw = useTransform(closeRide, [0.46, 0.92], [0, 1]);

    // ── and then the offer, in the same section ──────────────────────────
    //
    // The statement leaves the way it came, the rectangle it stood in opens
    // out to the whole screen, and the cards start arriving from the foot.
    const offerRide = useTransform(progress, [ARC_SHARE, 1], [0, 1]);
    // ── the hand-over, as one movement ──────────────────────────────────
    //
    // Three phases, and they overlap on purpose: the statement is still going
    // when the counts start folding, and the counts are still landing when the
    // band starts being laid down. Butted end to end instead, the section had
    // six tenths of a screen with nothing happening in it between the boxes
    // arriving and the band starting — measured, and it read as the page
    // waiting for something.
    const stateOut = useTransform(offerRide, [0, 0.04], [0, 1]);
    // The L of photographs becoming three small boxes with the counts in them —
    // see boxRow. This is what used to be the push-out: the tiles do not leave
    // the screen, they stop being pictures.
    // Brisk, and eased. It ran over a screen and a half of scroll on a linear
    // ramp, which for a move this small — the L is already small by the time
    // the close is done — is a crawl. Seven tenths of a screen, starting and
    // landing softly.
    const squaresRaw = useTransform(offerRide, [0.015, 0.1], [0, 1]);
    const squares = useTransform(squaresRaw, (v) => v * v * (3 - 2 * v));

    // ...and only then the band. It starts where the boxes finish.
    const stripIn = useTransform(offerRide, [0.05, 0.92], [0, 1]);

    // In from the right and out to the left, on one line: the statement is
    // read on its way through rather than parked. Both halves are the same
    // travel, which is why they are one value and not two.
    const stateX = useTransform([closeRide, stateOut], ([c, o]) => {
        const inAt = Math.min(1, Math.max(0, (c - 0.02) / 0.5));
        return `${(9 * (1 - inAt) - 11 * o).toFixed(2)}vw`;
    });
    const stateIn = useTransform([closeRide, stateOut], ([c, o]) => {
        const inAt = Math.min(1, Math.max(0, (c - 0.02) / 0.36));
        return inAt * (1 - Math.min(1, o / 0.8));
    });

    // The boundaries themselves, as one object every cell and every hairline
    // reads. Two springs and the close go in; where the four edges are comes
    // out. See planAt.
    const plan = useTransform([col, row, close], ([c, r, t]) => planAt(c, r, t, 0, geo));
    const cuts = geo.narrow ? CUTS_NARROW : CUTS_WIDE;

    // Names what is on the screen, and stays named. The question at the top
    // says it once and leaves, and after that three large numbers sit on three
    // photographs with nothing anywhere saying what they count — which is
    // exactly how it read to someone seeing it for the first time.
    const labelIn = useTransform(
        progress,
        [BEATS.build[0], BEATS.build[0] + 0.05, ...BEATS.collapse],
        [0, 1, 1, 0]
    );

    // The photographs hand the page back to the shader they were laid over.
    // Everything in this section is opaque and this is the only thing that is
    // not, so fading it is the whole of the change of ground.

    // The rectangle is not opened by a curve of its own — it is the part of
    // the partition nobody is standing in. It appears because the third cell's
    // right edge is moving off it, at exactly the rate that edge moves.
    // Nothing is clipped out of the screen any more: the counts end as three
    // boxes standing on it rather than as three windows cut into it.
    const restClip = "inset(0% 0% 0% 0%)";

    // What the wipe uncovers is a photograph of the shader, not the shader.
    // Measured across the wipe the live canvas doubled the frame time, and it
    // is uncovering exactly when the section can least afford it. This is the
    // same image, costing nothing, and it steps aside for the real one at the
    // very end.
    //
    // Which is here, and it matters more than it did: while this section was
    // three photographs the ground was never seen, so a bitmap of the shader
    // was free. The offer is see-through — the page's own ground carries on
    // behind the band — and a bitmap behind that is a still photograph of a
    // thing that is supposed to be moving. It goes out with the photographs.
    const stillOut = useTransform(squares, [0.25, 0.8], [1, 0]);

    // While this section owns the screen, the page's shader is drawing four
    // screens of scrolling that nobody can see. Covering it is not enough —
    // the cost is the drawing, not the being-seen — so it is told, and drops
    // to an on-demand frameloop until the still hands back to it.
    const [covering, setCovering] = useState(false);
    const decideCover = () => {
        // Held to the very end, not released when the still starts handing
        // back. The shader does not need to be awake to be uncovered — on an
        // on-demand frameloop it holds its last frame, which is a still of the
        // same picture — and letting the lattice wake in the middle of the
        // exit put every long frame back exactly where they are noticed.
        // Only while the arc owns the screen. Held to the end — which is what
        // this said — the shader stays on an on-demand frameloop for the whole
        // of the offer, holding one frame: the ground behind the band was a
        // photograph of the shader rather than the shader.
        const shouldCover =
            approach.get() >= 0.999 && progress.get() < ARC_SHARE + 0.02;
        setCovering((current) => (current === shouldCover ? current : shouldCover));
    };
    useMotionValueEvent(approach, "change", decideCover);
    useMotionValueEvent(progress, "change", decideCover);

    useEffect(() => {
        if (!covering) return undefined;
        return coverGround();
    }, [covering]);

    // Every hairline is gated by the same number, so it is worked out once here
    // rather than inside the loop below. It was a useTransform per cut, called
    // from inside cuts.map() — and the wide layout has four cuts where the
    // narrow one has three, so the first resize past 900px changed the hook
    // count mid-render and took the page with it.
    const cutGate = useTransform([cutsIn, squares], ([g, k]) => g * (1 - k));




    return (
        <section className="StatRail" ref={sectionRef}>
            <motion.div className="StatRail__viewport" style={{ opacity: shown }}>
                <motion.div
                    className="StatRail__still"
                    style={{ opacity: stillOut }}
                    aria-hidden="true"
                />
                <div className="StatRail__ground">
                {CELLS.map((cell, index) => (
                    <Cell
                        key={cell.figure}
                        cell={cell}
                        index={index}
                        plan={plan}
                        narrow={narrow}
                        copyIn={copyIn}
                        close={close}
                        final={finals[index]}
                        squares={squares}
                        row={countRow}
                        onReach={setReached}
                        coarse={coarse}
                        view={view}
                        safe={safe}
                        progress={progress}
                    />
                ))}

                {/* One hairline per boundary, keyed on the layout so a change
                    of geometry mounts its own set rather than re-pointing
                    these at a different edge. */}
                {cuts.map((cut, index) => (
                    <Cut
                        key={`${geo.narrow ? "n" : "w"}${index}`}
                        axis={cut.axis}
                        delay={cut.delay}
                        pick={cut.pick}
                        plan={plan}
                        gate={cutGate}
                    />
                ))}

                </div>

                <motion.p className="StatRail__label" style={{ opacity: labelIn }}>
                    <span className="StatRail__label__tick" />
                    Realita českých domácností
                    <span className="StatRail__label__source">dle statistik ČNB</span>
                </motion.p>

                {/* Hung off a rule with a scale marked down it. The ticks say
                    nothing and are not meant to — they are the only graphic on
                    the page that reads as measurement, which is what the whole
                    section is, and they do it without asking to be read. */}
                <motion.div className="StatRail__head" style={{ opacity: headOut }}>
                    <motion.span
                        className="StatRail__head__rule"
                        style={{ scaleY: headRule }}
                        aria-hidden="true"
                    >
                        <span className="StatRail__head__ticks" />
                    </motion.span>

                    <motion.span
                        className="StatRail__head__reader"
                        style={{ top: readerAt, opacity: readerIn }}
                        aria-hidden="true"
                    />

                    <motion.div className="StatRail__head__body" style={{ y: headY }}>
                        <motion.p
                            className="StatRail__head__label"
                            style={{ opacity: labelIn2 }}
                        >
                            Dle statistik ČNB
                        </motion.p>
                        <h2 className="StatRail__head__title">
                            <Written
                                text="Jaká je dneska realita finanční situace domácností v ČR"
                                progress={progress}
                                from={BEATS.headIn[0]}
                                to={BEATS.headIn[1]}
                            />
                        </h2>

                        <motion.span
                            className="StatRail__head__underline"
                            style={{ scaleX: underline }}
                            aria-hidden="true"
                        />
                    </motion.div>
                </motion.div>

                {/* The rectangle the tiles leave open — and then, once it
                    has pushed them off the screen, the screen. The closing
                    statement is read in it on its way through, and the cards
                    arrive in it afterwards. */}
                <motion.section className="StatRail__rest" style={{ clipPath: restClip }}>
                    {/* Centred, and travelling: in from the right, out to the
                        left, on one line. It is the sentence the section has
                        been arguing towards and it is also the hinge — what it
                        hands over to comes up from the foot behind it. */}
                    {/* Two boxes, and it has to be two: the outer one centres
                        itself with a translate and framer writes its own
                        transform on whatever it is given a `x` for, which
                        would overwrite the centring. Same trap the handoff
                        heading and the section's own line fell into. */}
                    <div className="StatRail__close" style={{ top: closeTop }}>
                    <motion.div
                        className="StatRail__close__move"
                        style={{ x: stateX, opacity: stateIn }}
                    >
                        <motion.p
                            className="StatRail__close__eyebrow"
                            style={{ opacity: eyebrowIn }}
                        >
                            <span className="StatRail__close__tick" aria-hidden="true" />
                            Co z toho plyne
                        </motion.p>
                        <h2 className="StatRail__close__lead">
                            <SplitText
                                text="Vaše starosti s financemi nejsou jen čísla."
                                progress={closeRide}
                                from={0.06}
                                to={0.62}
                                rise="0.4em"
                            />
                        </h2>
                        <motion.span
                            className="StatRail__close__rule"
                            style={{ scaleX: ruleDraw }}
                            aria-hidden="true"
                        />
                        <p className="StatRail__close__body">
                            <SplitText
                                text="Jsou to roky života, které můžete ještě zachránit."
                                progress={closeRide}
                                from={0.34}
                                to={0.96}
                                window={0.34}
                            />
                        </p>
                    </motion.div>
                    </div>

                    {/* The offer: six cards, each the size of the screen, each
                        drawn up from the foot over the one before it. */}
                    {/* The offer. It is laid down only once the counts have
                        finished becoming boxes — the two are one handover and
                        a band arriving over a move still in progress is two
                        things happening at once. */}
                    <OfferStrip ride={stripIn} view={view} mode={modeFor(view.w, view.h)} coarse={coarse} />
                </motion.section>
            </motion.div>

            {/* The whole set as sentences, for anything that is not looking at
                the screen. */}
            <p className="StatRail__sr">
                {CELLS.map((cell) => `${cell.figure} z 10 ${cell.text}. ${cell.note}`).join(" ")}
            </p>
        </section>
    );
}

// Framing per cell rather than per screen.
//
// Each photograph is laid out full-bleed and the cell is a window onto it, so a
// cell in a corner gets whatever happens to be in that corner of the frame —
// which for the smallest one was the wall behind the subject. Only one cell
// ever sees each of these layers, so each can be moved to put its own subject
// where its own window is. The first has none and cannot have one: it is the
// frame the hero parts on.
//
// The framing has to come off again as a cell grows. Pushing a picture down and
// right to fill a corner leaves its own top-left uncovered, which nothing sees
// while the cell is that corner — and everything sees the moment that cell
// folds out to the whole screen, as a black band down the left-hand edge.

// A line written one letter at a time, in opacity only.
//
// Split by word first and by letter inside it, so the words still wrap: a bare
// per-character split lets a line break fall inside a word, which on a question
// this long happens on almost every viewport.
//
// The slices overlap heavily — each letter takes more than its share of the run
// — so it reads as a line resolving rather than as a typewriter.
function Written({ text, progress, from, to }) {
    const words = text.split(" ");
    const total = text.replace(/\s/g, "").length;
    let index = 0;

    return (
        <span className="written" aria-label={text}>
            {words.map((word, w) => {
                const letters = [...word].map((letter) => {
                    const at = index;
                    index += 1;
                    return { letter, at };
                });
                return (
                    <span className="written__word" key={`${word}-${w}`} aria-hidden="true">
                        {letters.map(({ letter, at }, l) => (
                            <Letter
                                key={l}
                                letter={letter}
                                at={at}
                                total={total}
                                progress={progress}
                                from={from}
                                to={to}
                            />
                        ))}
                    </span>
                );
            })}
        </span>
    );
}

function Letter({ letter, at, total, progress, from, to }) {
    const run = to - from;
    // Each letter's own fade is a fifth of the whole run, so at any moment
    // about a fifth of the line is mid-way in and the edge of the reveal is
    // soft rather than a moving cursor.
    const each = run * 0.2;
    const start = from + (at / Math.max(1, total - 1)) * (run - each);
    const opacity = useTransform(progress, [start, start + each], [0, 1]);
    return <motion.span style={{ opacity }}>{letter}</motion.span>;
}

// Where the counts end up: an L of tiles along the top and the left, with the
// rectangle they enclose left open for everything that comes after.
//
// One square in the corner; beside it a band running out to the right edge;
// under it a band running down to the foot. Two lines describe the finished
// thing — one down, one across — which is what the four boundaries of the
// close converge into: the two verticals meet at the square's edge and the
// one that separated the cells in the bottom band runs out of the screen.
//
// The square has to be measured rather than written down: a box 12% of the
// width is only square if its height is 12% of the width too, and in
// percentages of the viewport that is a different number on every screen.
// The site's bar is fixed over the whole page and the top row of tiles is
// flush under it. The photographs can be — a picture behind a bar is still a
// picture — but the counts cannot: flush in the corner put "8/10" straight
// through "PROCHÁZKAGROUP". So the copy in a tile that touches the top edge
// starts below the bar instead of at the tile's own top.
//
// Measured, not guessed: the bar is 82.8px on a desktop and 78 on a phone,
// and this is that plus air.
const clearOf = (vw) => (vw < 900 ? 92 : 100);

// The square, as a share of the width. Read on a wide screen only — a phone
// does not end on a square at all any more; see geomFor.
const squareOf = () => 0.12;

// ── the close, written as one partition of the screen ───────────────────
//
// Three boxes each interpolating towards its own destination do not tile a
// screen. Every one of them is on its way somewhere, and between them they
// either leave the ground showing or lie on top of one another — the band
// arriving from the right crossed straight over the count it was travelling
// past, which is what one cell moving through another looks like.
//
// So the close is written as the boundaries and not as the cells, and every
// cell reads its box off the same four numbers. Nothing can overlap because
// nothing holds an opinion of its own about where it is: a cell ends exactly
// where the next one begins, at every frame, by construction.
//
//   X    the cut in the top band     col  → the square's width
//   Y    the cut across              row  → the square's height
//   L    the first cell's foot in the bottom band, which is also the third
//        cell's left edge — one number, and that is what keeps them apart
//   Rt   the third cell's right edge 100  → the square's width
//
//   y < Y    [0, X] first     [X, 100] second
//   y > Y    [0, L] first     [L, Rt] third     [Rt, 100] the rest
//
// At rest — L = X = col, Rt = 100 — that is precisely the layout the story
// ends on: the first cell the whole left column, the second the top right, the
// third everything under it, and no fourth region at all. At the end L is 0, X
// and Rt have met at the square's width, and the region nobody is in is the
// rectangle the closing line and the next component live in.
//
// The first cell is the one that has to bridge the two, being a column on the
// way in and a square on the way out, so while its foot is still in the bottom
// band it is an L. That L is the whole trick: it is what lets the third cell
// come across the screen without either of them passing through the other.

// How long the first cell keeps that foot. Its width goes to nothing, so what
// is left of it is invisible some time before it is gone.
const FOOT_GONE = 0.42;

const geomFor = (vw, vh) => {
    if (isStacked(vw, vh)) {
        // A phone ends the story on three bands stacked down the screen, and
        // three stacked bands cannot be shuffled into an L without two of them
        // travelling through each other. They compress instead — the same
        // three in the same order, pressed up under the bar, with the closing
        // line taking the full width underneath, which it needs: the L left it
        // a 242px column to be read in.
        //
        // A band is the bar's clearance and then a count and its line.
        return { narrow: true, band: Math.max(15, ((clearOf(vw) + 48) / vh) * 100) };
    }
    const q = squareOf() * 100;
    return { narrow: false, q, s: (q * vw) / vh };
};

/**
 * The boundaries, at this point in the close — and at this point in the open.
 *
 * `open` is the move after the close: the rectangle nobody is standing in
 * grows until it is the whole screen, and the three tiles are pushed off the
 * top and the left edges by the same boundaries that made them. Every edge is
 * simply taken to nought, so the tiles do not fade or slide away on their own
 * account: they run out of room, which is the same physics as everything else
 * in this section.
 */
const planAt = (c, r, t, open, geo) => {
    const shut = 1 - open;
    if (geo.narrow) {
        const b = geo.band;
        return {
            t,
            H1: (c + (b - c) * t) * shut,
            H2: (r + (2 * b - r) * t) * shut,
            H3: (100 + (3 * b - 100) * t) * shut,
        };
    }
    return {
        t,
        X: (c + (geo.q - c) * t) * shut,
        Y: (r + (geo.s - r) * t) * shut,
        L: c * Math.max(0, 1 - t / FOOT_GONE) * shut,
        Rt: (100 + (geo.q - 100) * t) * shut,
    };
};

const pct = (n) => `${n.toFixed(2)}%`;
const insetOf = ([t, r, b, l]) => `inset(${pct(t)} ${pct(r)} ${pct(b)} ${pct(l)})`;

// What one cell is, given the boundaries: the shape it is cut to, the box that
// holds it — the photograph and the copy are both placed in percentages of the
// screen, so both want a rectangle — and its area, which is what its type is
// sized off.
//
// `cover` is the clock the photograph compresses on. It is the close itself
// for everything that is a rectangle the whole way; the L is the exception.
const shapeAt = (index, p) => {
    if (p.H1 !== undefined) {
        const box =
            index === 0
                ? [0, 0, 100 - p.H1, 0]
                : index === 1
                  ? [p.H1, 0, 100 - p.H2, 0]
                  : [p.H2, 0, 100 - p.H3, 0];
        return { clip: insetOf(box), box, area: (100 - box[0] - box[2]) / 100, cover: p.t };
    }
    if (index === 1) {
        const box = [0, 0, 100 - p.Y, p.X];
        return { clip: insetOf(box), box, area: ((100 - p.X) * p.Y) / 1e4, cover: p.t };
    }
    if (index === 2) {
        const box = [p.Y, 100 - p.Rt, 0, p.L];
        return { clip: insetOf(box), box, area: ((p.Rt - p.L) * (100 - p.Y)) / 1e4, cover: p.t };
    }
    // The L: down the left edge, in under the top band, and back up.
    const foot = p.L > 0.01;
    return {
        clip:
            `polygon(0% 0%, ${pct(p.X)} 0%, ${pct(p.X)} ${pct(p.Y)}, ` +
            `${pct(p.L)} ${pct(p.Y)}, ${pct(p.L)} 100%, 0% 100%)`,
        box: [0, 100 - p.X, foot ? 0 : 100 - p.Y, 0],
        area: (p.X * p.Y + p.L * (100 - p.Y)) / 1e4,
        // A photograph that has to cover the whole height of the screen is a
        // photograph at full size, so this one cannot start compressing while
        // there is still a foot down there. It starts from exactly where it
        // stood — full bleed, dead centre — at the moment the foot goes, which
        // is the same moment the box it has to cover becomes the square.
        cover: Math.max(0, (p.t - FOOT_GONE) / (1 - FOOT_GONE)),
    };
};

// Where the cells finish. The copy has to be placed inside a tile before the
// tile is there — see xClose in Cell.
const finalBoxes = (geo) =>
    geo.narrow
        ? [0, 1, 2].map((i) => [i * geo.band, 0, 100 - (i + 1) * geo.band, 0])
        : [
              [0, 100 - geo.q, 100 - geo.s, 0],
              [0, 0, 100 - geo.s, geo.q],
              [geo.s, 100 - geo.q, 0, 0],
          ];

// ── and then out of the photographs altogether ──────────────────────────
//
// The close leaves an L of photographs. What follows it is not the L being
// pushed off the screen — it is the L becoming three small boxes in a row with
// nothing in them but the counts. The pictures have done their work by then;
// what has to survive into the offer is the argument, which is three numbers.
//
// Written as its own move rather than as another target for the partition
// above: three boxes in a row do not tile a screen, and the partition's whole
// point is that its three do. It runs after the photographs have gone, so
// there is nothing left to leave a hole in.
// The three counts do not end in a row. They keep the shape the section spent
// its whole arc building: one in the corner, one beside it and one under it —
// the L, at a twentieth of the size.
//
// Which means the cluster is a block two cells wide and two tall with the
// fourth cell empty, and the whole of it is described by two numbers: where the
// column splits and where the row splits. Three boxes, two cuts, and they tile
// the block exactly — so there is nothing to overlap, at rest or half way
// through a change.
// Small, and smaller than it was. Once the band is running these are not the
// subject any more — they are what the reader has already been told, kept in
// the corner between the bar and the content so the argument is still on the
// screen while the offer is made.
// A tenth of 1512px is 157, which halves into tiles of 78 — the size the
// cluster was drawn at. A tenth of 844 is 88, and tiles of 44: exactly the
// smallest thing a finger is expected to hit, on the viewport most likely to
// be touched. So the cluster is a larger share of a smaller screen, which
// leaves it the same size in pixels rather than the same size in per cent.
const clusterFor = (vw) => (vw < 1100 ? 13.5 : 10.4);

// Where the two cuts stand: at rest, and when each of the three is reached for.
// A box takes room from the cuts it touches, and what it takes the others give
// up — the roster wall's rule, in two axes instead of one. The corner's width
// is shared with the box under it, which is not a bug: it is what an L is.
const SPLITS = {
    rest: [0.5, 0.5],
    0: [0.7, 0.64],
    1: [0.36, 0.62],
    2: [0.7, 0.36],
};

// And how much taller the block itself gets while one of them is open, so the
// reached-for box has somewhere to put the sentence.
const TALL = 1.7;

/**
 * The cluster, as three clip insets — and each box's own openness and squeeze,
 * for the type inside it.
 */
const boxClusterAt = (vw, vh, [x, y], grown) => {
    const w = clusterFor(vw);
    const h = ((w * vw) / vh) * (1 + (TALL - 1) * grown);
    const top = (clearOf(vw) / vh) * 100;
    const cx = w * x;
    const cy = h * y;

    // A quarter of the block each, at rest.
    const share = (bw, bh) => (bw * bh) / (w * h) / 0.25;
    const of = (rect, bw, bh) => {
        const k = share(bw, bh);
        return {
            rect,
            open: Math.max(0, Math.min(1, (k - 1) / 0.8)),
            // A squeezed box has room for its count and not for the words under
            // it, so what it does with this is stop saying them rather than
            // wrap them into a column one word wide.
            tight: Math.max(0, Math.min(1, (1 - k) / 0.45)),
        };
    };

    return [
        of([top, 100 - cx, 100 - top - cy, 0], cx, cy),
        of([top, 100 - w, 100 - top - cy, cx], w - cx, cy),
        of([top + cy, 100 - cx, 100 - top - h, 0], cx, h - cy),
    ];
};

// ...and the same three counts on a phone: one band under the bar, cut in
// three. The stacked arc has already given each count a screen of its own, so
// what survives into the offer is a reminder and not a control — nothing here
// opens, and nothing needs to, because at a third of 390px there is room for
// the figure and the two words that say what it counts.
//
// Written to the same contract as the cluster above — a rect and an openness —
// so the cell reading it does not have to know which composition it is in.
const COUNT_BAND = 66;

const countBandAt = (vw, vh) => {
    const top = (clearOf(vw) / vh) * 100;
    const h = (COUNT_BAND / vh) * 100;
    const w = 100 / 3;
    return [0, 1, 2].map((i) => ({
        rect: [top, 100 - w * (i + 1), 100 - top - h, w * i],
        open: 0,
        tight: 0,
    }));
};

// The hairlines are the boundaries themselves, so they are read off the same
// plan: where each one runs, how much of it there is, and how much of it can
// be seen — the foot's line goes out with the foot, and the rest's arrives
// from the right-hand edge of the screen, where at first it is nothing.
const CUTS_WIDE = [
    { axis: "y", delay: "-2.4s", pick: (p) => [p.X, 0, p.Y, 1] },
    { axis: "x", delay: "-5.1s", pick: (p) => [p.Y, p.L, 100, 1] },
    { axis: "y", delay: "-3.7s", pick: (p) => [p.L, p.Y, 100, Math.max(0, 1 - p.t / FOOT_GONE)] },
    { axis: "y", delay: "-1.2s", pick: (p) => [p.Rt, p.Y, 100, p.t] },
];

const CUTS_NARROW = [
    { axis: "x", delay: "-2.4s", pick: (p) => [p.H1, 0, 100, 1] },
    { axis: "x", delay: "-5.1s", pick: (p) => [p.H2, 0, 100, 1] },
    { axis: "x", delay: "-1.2s", pick: (p) => [p.H3, 0, 100, p.t] },
];

function Cell({
    cell,
    index,
    plan,
    narrow,
    copyIn,
    close,
    final,
    squares,
    row,
    onReach,
    coarse,
    view,
    safe,
    progress,
}) {
    const first = index === 0;

    // The block's own width, measured. The close needs it: the big left cell's
    // copy hangs off its right edge — against the cut, which is the whole
    // reason it reads as one composition — and a tile's copy has to hang off
    // its left one. Sliding from one to the other is a translation, and the
    // distance is the block's width, which depends on the font and so has to
    // be read rather than written down.
    const blockRef = useRef(null);
    // ...and its height, for the same kind of reason: the block is centred on
    // its cell, the site's bar is fixed over the top of the screen, and a cell
    // that has shrunk to a fifth of the screen has its middle behind the bar.
    // How far the block has to be pushed down to clear it is half its own
    // height, which is type and so has to be measured.
    const [metrics, setMetrics] = useState({ block: 0, pad: 0, height: 0 });
    useEffect(() => {
        const el = blockRef.current;
        if (!el) return undefined;
        const read = () =>
            setMetrics((current) => {
                const block = el.offsetWidth;
                const height = el.offsetHeight;
                const pad = parseFloat(getComputedStyle(el.parentElement).paddingLeft) || 0;
                return current.block === block &&
                    current.pad === pad &&
                    current.height === height
                    ? current
                    : { block, pad, height };
            });
        read();
        const observer = new ResizeObserver(read);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // A plain reveal: up and in. It used to be written on left to right, with
    // the type uncovered by a clip — and a count that is also being scaled by
    // its cell's share of the screen has a clip that is being scaled with it,
    // so the edge of the wipe moved at a different speed from the letters it
    // was uncovering and cut the figure mid-glyph. Opacity and a rise do the
    // same job and do not care how big the thing is.
    const revealFrom = BEATS.build[0] + index * REVEAL_STEP;
    const reveal = useTransform(progress, [revealFrom, revealFrom + REVEAL_RUN], [0, 1]);
    const figureIn = useTransform(reveal, [0, 0.7], [0, 1]);
    const figureY = useTransform(reveal, [0, 1], ["0.34em", "0em"]);
    const captionReveal = useTransform(reveal, [0.28, 1], [0, 1]);
    const captionY = useTransform(captionReveal, [0, 1], ["0.5em", "0em"]);
    const tick = useTransform(reveal, [0, 0.5], [0, 1]);
    // Last in the block, and behind its own caption: it was arriving whole
    // while the line above it was still being written, which read as two
    // unrelated things rather than as one block being set.
    const noteReveal = useTransform(reveal, [0.62, 1], [0, 1]);
    const noteY = useTransform(reveal, [0.62, 1], ["0.5em", "0em"]);

    // This cell's slice of the partition — see planAt / shapeAt above. The
    // cell does not decide where it is; it reads it off the same boundaries
    // every other cell reads, which is the whole of why none of them can end
    // up on top of another.
    const shape = useTransform(plan, (p) => shapeAt(index, p));

    // ...and then out of the partition and into its own box. Every edge simply
    // travels; there is nothing left to tile by the time it does, because the
    // photograph has gone — see the note on boxRow.
    // Opened by the pointer, the way the bar's own boxes open: the box itself
    // grows rather than something appearing beside it, and what it makes room
    // for is the sentence the count is short for. Closed, a box says "8/10, je
    // v dluzích"; open, it says what that means.
    // This box's place in the row, and how far it is opened — both read off the
    // row rather than kept here, because a box's width is not its own business:
    // it is whatever the other two can spare. See boxClusterAt.
    const mine = useTransform(row, (r) => r[index]);
    const endBox = useTransform(mine, (m) => m.rect);
    const opened = useTransform(mine, (m) => m.open);
    const tight = useTransform(mine, (m) => m.tight);

    const rect = useTransform([shape, squares, endBox], ([sh, k, target]) =>
        k <= 0 ? sh.box : sh.box.map((v, i) => v + (target[i] - v) * k)
    );
    const clip = useTransform([shape, squares, rect], ([sh, k, r]) =>
        k <= 0
            ? sh.clip
            : `inset(${r[0].toFixed(2)}% ${r[1].toFixed(2)}% ${r[2].toFixed(2)}% ${r[3].toFixed(2)}%)`
    );

    // The picture goes first and the frame arrives behind it, so the box is
    // never both at once — a photograph with a border drawn round it is a
    // different thing from a box with a number in it.
    // The picture holds until the box is nearly the size it will be, and the
    // line arrives under it before it goes. Faded on a schedule of its own the
    // photographs were gone by the time the boxes were still half the screen
    // wide, and what travelled the rest of the way was an empty frame.
    // Late, and later than the phase's own middle: the edges travel linearly in
    // percentages, so at seven tenths of the move a band that ends 128px wide
    // is still 550. Measured — the picture was gone while the box was four
    // times the size it was going to be.
    const photoOut = useTransform(squares, [0.79, 0.97], [1, 0]);
    const boxIn = useTransform(squares, [0.7, 0.94], [0, 1]);
    // Nothing to hit in the stacked band: it says both of its lines at all
    // times, so a target there would be a cursor over something that does not
    // answer.
    const hitOn = useTransform(squares, (k) => (k > 0.98 && !narrow ? "auto" : "none"));

    // The photograph shrinks with its cell, so a tile is a thumbnail of the
    // picture and not a hole punched through a full-size one.
    //
    // Both the scale and the centring are read off the box as it is now, not
    // interpolated towards where it ends up. Interpolated, the two disagree
    // in the middle — the picture shrinks about the tile it is heading for
    // while the clip is still somewhere else — and the gap between them is
    // ground, showing through the corner of a cell for half a second.
    //
    // Written this way the picture is centred on its own box throughout and
    // never smaller than it:
    //   s(u) = 1 + (max(w, h) − 1)·u     shift(u) = (centre − 50)·u
    // which is 1 and nothing at the start, and the box's own scale and
    // position at the end.
    //
    // Both terms are fractions of their own axis, so they compare directly.
    // Taking the larger is what covers the box on both — converting one of
    // them through the viewport's aspect, which an earlier version did, makes
    // the two agree by accident on a square and leaves 109px of it bare.
    const geom = useTransform(shape, ({ box: r, cover: u }) => {
        const w = (100 - r[1] - r[3]) / 100;
        const h = (100 - r[0] - r[2]) / 100;
        return [
            1 + (Math.max(w, h) - 1) * u,
            ((r[3] + (100 - r[1])) / 2 - 50) * u,
            ((r[0] + (100 - r[2])) / 2 - 50) * u,
        ];
    });
    const shrink = useTransform(geom, ([g]) => g);
    // In pixels, because framer writes the translate ahead of the scale: this
    // moves the picture's middle, and the scale then happens about it.
    const shrinkX = useTransform(geom, ([, x]) => `${((x * view.w) / 100).toFixed(1)}px`);
    const shrinkY = useTransform(geom, ([, , y]) => `${((y * view.h) / 100).toFixed(1)}px`);

    // The copy's own clock. The first cell's copy has to be in its corner
    // before the cell stops being a column — the box it reads its middle off
    // loses its foot part way through, and anything still weighing that middle
    // would jump the moment it does. Ahead of the foot, and it never sees it.
    const copyClose = useTransform(close, (c) =>
        index === 0 ? Math.min(1, c / (FOOT_GONE - 0.07)) : c
    );

    const share = useTransform(shape, (sh) => sh.area);

    // How big this cell is as a share of the screen — the copy is sized off it,
    // so a cell worth an eighth of the page does not shout like the one worth
    // two thirds. That is the layout doing the arithmetic for the reader. The
    // L's area is its two parts, not the box around them: the column's foot
    // going means the cell is smaller, and the type says so as it happens.

    // The range is wider at both ends than the cells' own areas would give: the
    // peak is 1.2 rather than 1 and the floor 0.27 rather than 0.34. The point
    // of sizing type by a cell's share of the screen is that the proportion is
    // legible before the number is, and exaggerating it makes that reading
    // louder without changing what it says.
    const copyScale = useTransform([share, copyClose], ([sh, c]) => {
        const t = Math.min(1, Math.max(0, (sh - 0.06) / (0.67 - 0.06)));
        const own = 0.272 + (1.2 - 0.272) * t;
        // A tile is about 207 x 212 at this width; a fifth puts the figure at
        // roughly twenty pixels, which is the largest a number can be there.
        // On a phone the base size is half as big and the tile is three times
        // the share of the width, so the same twenty pixels costs more scale.
        const tileType = narrow ? 0.38 : 0.2;
        return own + (tileType - own) * c;
    });

    // The caption is scaled back up against the block, because the two cannot
    // share one scale: at the ratio that makes the figure right the sentence
    // is five pixels. This is the tile's own type scale, not a smaller copy of
    // the section's.
    const captionScale = useTransform(close, [0, 1], [1, 2.1]);

    // Which cell is being talked about, read off its own size rather than kept
    // as a second schedule that could disagree with the first. A cell that is
    // not the largest is somewhere between 8% and 26% of the screen; the one
    // that is sits above 55%. Nothing lands in between.
    const focus = useTransform(share, [0.3, 0.52], [0, 1]);

    // The others step back. Size alone says which cell is largest but not which
    // one is being read; this is what turns three boxes into a sequence.
    const recede = useTransform(focus, [0, 1], [0.34, 0]);

    // The caption waits for a cell big enough to read it in. Scaled down with
    // the rest of the block it landed at about seven pixels in the smallest
    // cell — present, unreadable, and therefore just noise around the number.
    const captionIn = useTransform(share, [0.1, 0.2], [0, 1]);


    // And it leaves at the close. Only the widest tile was ever big enough to
    // clear the threshold above, so at the end one tile carried four lines of
    // sentence across a 207px band and the other two carried a bare number.
    // The sentence goes out, two words come in, and all three tiles say what
    // they are counting.
    const captionOut = useTransform(copyClose, [0.12, 0.42], [1, 0]);
    const shortIn = useTransform(copyClose, [0.62, 0.94], [0, 1]);

    // A cell with no width yet has nothing to say.
    const alive = useTransform([copyIn, share], ([c, s]) => c * Math.min(1, s / 0.02));

    // The copy and its gradient are anchored to this cell's own edges, not to
    // the screen's. Both live on a full-screen layer that the clip cuts down,
    // so anything left at the screen's foot is simply outside the two cells in
    // the right-hand column and vanishes.
    const edgeTop = useTransform(rect, ([t]) => `${t.toFixed(2)}%`);
    const edgeRight = useTransform(rect, ([, r]) => `${r.toFixed(2)}%`);
    const edgeBottom = useTransform(rect, ([, , b]) => `${b.toFixed(2)}%`);
    const edgeLeft = useTransform(rect, ([, , , l]) => `${l.toFixed(2)}%`);
    const box = { top: edgeTop, right: edgeRight, bottom: edgeBottom, left: edgeLeft };

    // The copy sits at its cell's own middle height and hangs off the edge that
    // faces the middle of the composition — the big left cell against the cut,
    // the two on the right away from it. In the corner it was furthest from
    // where anyone is looking, which on the largest cell meant the one thing
    // the section is saying was the hardest thing on it to find.
    // The middle of the cell while it is a cell; just inside the top edge once
    // it is a tile. Centred, the block is taller than a tile and the clip takes
    // the number with it.
    // A tile hung off the top of the screen starts its copy under the bar; one
    // that is already below it starts just inside its own edge.
    const pad = final[0] === 0 ? safe : 1.6;
    const centreY = useTransform([rect, copyClose, copyScale], ([r, c, k]) => {
        const own = (r[0] + (100 - r[2])) / 2;
        const at = own + (r[0] + pad - own) * c;
        // The block is centred on `at` while it is a cell's copy and hung off
        // its top once it is a tile's, so what has to clear the bar shrinks to
        // nothing as the close runs — by which point `pad` above is already
        // doing the same job.
        //
        // Half a block, scaled, in percentages of the screen. Without it the
        // second cell's count is behind PROCHÁZKA GROUP for the whole of the
        // beat it is the one being read: it is the top-right box, its top edge
        // is the top of the screen, and by the third count it is a fifth of the
        // screen tall — so its middle is fifty pixels up inside a bar that is
        // a hundred tall.
        //
        // ...and it cannot push the block out of the cell either, which is the
        // same fault at the other end: the cell clips, so a block pushed past
        // its foot loses its last line rather than being hidden by a bar. Where
        // the two cannot both be had — a band shorter than the block plus the
        // bar — staying inside the cell wins, because a line half-hidden behind
        // a bar can still be read and a line that has been cut off cannot.
        const half = ((metrics.height * k) / 2 / view.h) * 100 * (1 - c);
        const foot = 100 - r[2] - half - 1;
        return `${Math.min(Math.max(at, safe + half), Math.max(at, foot)).toFixed(2)}%`;
    });
    const copyY = useTransform(copyClose, [0, 1], ["-50%", "0%"]);
    const copyOrigin = useTransform(copyClose, [0, 1], ["50%", "0%"]);
    const inner = !narrow && index === 0 ? "right" : "left";

    // Where that block ends up sideways. Everything below is in real pixels,
    // because framer writes the translate before the scale — so it is not
    // shrunk with the block, which is what makes a fixed inset possible at all.
    //
    //   scaling about the layer's own edge puts the block's left at
    //     left-hung   tileLeft + pad·k
    //     right-hung  tileRight - (pad + block)·k
    //   and both want to be at tileLeft + TILE_PAD.
    const kClose = narrow ? 0.38 : 0.2;
    const TILE_PAD = narrow ? 14 : 20;
    const tileW = ((100 - final[1] - final[3]) / 100) * view.w;
    const xClose =
        inner === "right"
            ? TILE_PAD - tileW + (metrics.pad + metrics.block) * kClose
            : TILE_PAD - metrics.pad * kClose;
    const copyX = useTransform(copyClose, [0, 1], ["0px", `${xClose.toFixed(1)}px`]);

    // Unwound as the cell approaches the full screen — see the note on framing
    // — and unwound again at the close, for the same reason backwards. The
    // framing was measured for the box this cell holds while it is a cell, and
    // the tile it ends as is somewhere else on the screen entirely: left on, it
    // pushed the last photograph down and right out of its own band and left
    // four pixels of ground showing along the top of it.
    //
    // Off, the tile is a slice of the plain picture at its own middle, which is
    // both what covers the tile by construction — see the scale above — and where
    // the subject of each of these three photographs happens to be.
    const plain = useTransform([share, close], ([sh, c]) =>
        Math.max(Math.min(1, Math.max(0, (sh - 0.6) / 0.4)), Math.min(1, c / 0.35))
    );
    const framed = cell.frame || { x: 0, y: 0, scale: 1 };
    const fx = useTransform(plain, (u) => framed.x * (1 - u));
    const fy = useTransform(plain, (u) => framed.y * (1 - u));
    const frameScale = useTransform(plain, (u) => 1 + (framed.scale - 1) * (1 - u));
    const frameX = useMotionTemplate`${fx}%`;
    const frameY = useMotionTemplate`${fy}%`;

    // Different rates, so the three do not read as one photograph cut in three.
    // The first gets none: it is the frame the hero parts on.
    const drift = useTransform(
        useTransform(plan, (p) => (p.H1 === undefined ? p.X : p.H1)),
        [100, 60],
        first ? ["0%", "0%"] : [`${2 + index}%`, `${-2 - index}%`]
    );

    return (
        <motion.div
            className="StatRail__cell"
            style={{ clipPath: clip, zIndex: useTransform(opened, (o) => (o > 0.01 ? 8 : 1)) }}
        >
            {/* What is left when the photograph has gone: a box with a line
                round it and a count in it. The count is its own element rather
                than the block above, which is sized and placed for a cell that
                is a window onto a picture — this one only has to sit in a
                hundred-and-thirty-pixel box. */}
            <motion.span
                className="StatRail__cell__box"
                style={{ opacity: boxIn }}
                aria-hidden="true"
            />
            <motion.p className="StatRail__cell__mark" style={{ ...box, opacity: boxIn }}>
                <span className="StatRail__cell__mark__n">
                    {cell.figure}
                    <span>/10</span>
                </span>

                {/* The whole sentence, in the room the box makes when it
                    opens. It is in the flow rather than absolute so the box
                    grows around a real block of type. */}
                {/* What the count counts, on the tile at all times. It is the
                    only copy the stacked band has room for and the only copy
                    it needs; the wide cluster's tiles are half as wide as a
                    word of it, so there it stays out of the way and the
                    sentence below is what the pointer is for. */}
                <span className="StatRail__cell__mark__short">{cell.short}</span>

                <motion.span
                    className="StatRail__cell__mark__full"
                    // Against what the box can actually reach, not against
                    // one: the row can only spare so much, so `open` tops out
                    // around two thirds and a range ending at 1 left the
                    // sentence at a third of its own weight.
                    style={{ opacity: useTransform(opened, [0.18, 0.58], [0, 1]) }}
                >
                    {cell.text}
                </motion.span>
            </motion.p>

            {/* What the pointer actually hits: the box, and only while there
                is a box to hit. The cell itself is a full-screen layer with a
                clip on it, and a full-screen layer cannot be hovered. */}
            {/* On a fine pointer, enter and leave. On a finger there is no
                leave — a tap fires pointerenter and nothing ever follows it —
                so the same box is a toggle instead, and the two are never both
                bound at once: bound together, the tap's own pointerenter would
                open the box and its click would immediately close it again.
                Stacked, there is nothing to open: the band says its piece. */}
            <motion.span
                className="StatRail__cell__hit"
                style={{ ...box, opacity: boxIn, pointerEvents: hitOn }}
                onPointerEnter={coarse || narrow ? undefined : () => onReach(index)}
                onPointerLeave={coarse || narrow ? undefined : () => onReach(-1)}
                onClick={
                    coarse && !narrow
                        ? () => onReach((current) => (current === index ? -1 : index))
                        : undefined
                }
                aria-hidden="true"
            />
            <motion.div
                className="StatRail__cell__shrink"
                style={{ scale: shrink, x: shrinkX, y: shrinkY, opacity: photoOut }}
            >
            <motion.div
                className="StatRail__cell__frame"
                style={cell.frame ? { x: frameX, y: frameY, scale: frameScale } : undefined}
            >
            <motion.div
                className={`StatRail__cell__photo${first ? " is-fixed" : ""}`}
                style={{ y: drift }}
            >
                <Image
                    src={cell.photo}
                    alt={cell.alt}
                    fill
                    priority={first}
                    unoptimized
                    sizes="100vw"
                    style={{ objectFit: "cover", objectPosition: cell.position }}
                />
            </motion.div>
            </motion.div>
            </motion.div>
            <motion.div
                className="StatRail__cell__scrim"
                style={{ opacity: useTransform(photoOut, (v) => v * cell.scrim) }}
                aria-hidden="true"
            />
            {/* Ground for this cell's own copy, at its own foot. A single
                gradient across the page cannot serve three boxes at three
                sizes, and at progress 0 there must be none at all — the hero
                parts without one. */}
            <motion.div
                className={`StatRail__cell__wash StatRail__cell__wash--${inner}`}
                style={{ ...box, opacity: copyIn }}
                aria-hidden="true"
            />

            <motion.div
                className="StatRail__cell__recede"
                style={{ opacity: recede }}
                aria-hidden="true"
            />

            <motion.div
                className={`StatRail__cell__copy StatRail__cell__copy--${inner}`}
                style={{
                    ...box,
                    top: centreY,
                    bottom: "auto",
                    // Out before the box's own mark comes in. Faded across the
                    // whole move the two overlapped in the middle of it and
                    // every count was on the screen twice.
                    opacity: useTransform([alive, squares], ([a, k]) =>
                        a * (1 - Math.min(1, k / 0.5))
                    ),
                    // framer composes its own y and scale into one transform,
                    // which is the only reason the vertical centring can live
                    // here at all — a CSS translate would be overwritten.
                    x: copyX,
                    y: copyY,
                    scale: copyScale,
                    transformOrigin: useMotionTemplate`${inner === "right" ? "right" : "left"} ${copyOrigin}`,
                }}
            >
                <div className="StatRail__cell__block" ref={blockRef}>
                <p className="StatRail__ordinal" aria-hidden="true">
                    <motion.span className="StatRail__ordinal__tick" style={{ scaleX: tick }} />
                    <motion.span style={{ opacity: tick }}>
                        {String(index + 1).padStart(2, "0")}
                    </motion.span>
                </p>
                <motion.p
                    className="StatRail__figure"
                    style={{ opacity: figureIn, y: figureY }}
                    aria-hidden="true"
                >
                    {cell.figure}
                    <span className="StatRail__figure__of">/10</span>
                </motion.p>
                {/* The sentence and the two words share one box, stacked, so
                    the line that is arriving does not add its height to a
                    block that is being positioned by its top edge — it would
                    push the count off the tile as it faded in. */}
                <div className="StatRail__cell__line">
                    <motion.p
                        className="StatRail__caption"
                        style={{
                            opacity: useTransform(
                                [captionIn, captionOut, captionReveal],
                                ([a, b, c]) => a * b * c
                            ),
                            y: captionY,
                            scale: captionScale,
                        }}
                        aria-hidden="true"
                    >
                        {cell.text}
                    </motion.p>
                    <motion.p
                        className="StatRail__short"
                        style={{ opacity: shortIn, scale: captionScale }}
                        aria-hidden="true"
                    >
                        {cell.short}
                    </motion.p>
                </div>
                <motion.p
                    className="StatRail__note"
                    style={{
                        opacity: useTransform([focus, noteReveal], ([a, b]) => a * b),
                        y: noteY,
                    }}
                    aria-hidden="true"
                >
                    {cell.note}
                </motion.p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// The hairline on a cut. `from` is the other cut, for the one that only runs
// across half the page.
function Cut({ axis, plan, pick, gate, delay }) {
    // [where it runs, where it starts, where it ends, how much of it shows].
    // A boundary in a partition is a segment and not a full-length line: the
    // cut in the top band stops at the cut across, and the two down in the
    // bottom band start there.
    const seg = useTransform(plan, pick);
    const pos = useTransform(seg, (v) => `${v[0].toFixed(2)}%`);
    const from = useTransform(seg, (v) => `${v[1].toFixed(2)}%`);
    const to = useTransform(seg, (v) => `${(100 - v[2]).toFixed(2)}%`);
    const opacity = useTransform([gate, seg], ([g, v]) => g * v[3]);

    const vertical = axis === "y";
    const style = vertical
        ? { left: pos, top: from, bottom: to, opacity }
        : { top: pos, left: from, right: to, opacity };

    return (
        <motion.div
            className={`StatRail__cut StatRail__cut--${vertical ? "y" : "x"}`}
            style={style}
            aria-hidden="true"
        >
            <span className="StatRail__cut__line" style={{ animationDelay: delay }} />
        </motion.div>
    );
}
