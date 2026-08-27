import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    AnimatePresence,
    cubicBezier,
    motion,
    useAnimationFrame,
    useInView,
    useMotionValue,
    useReducedMotion,
    useTransform,
} from "framer-motion";
import CornerButton from "@/components/common/ui/CornerButton";
import MoreLink from "@/components/common/ui/MoreLink";
import Arrow, { SCROLL_NUDGE } from "@/components/common/ui/Arrow";
import { TextTypeState } from "@/components/common/TextAnim/typingText";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import Lines, { hasLines } from "@/components/common/ui/lines";
import { CONTACT_TRIGGER } from "@/components/common/ContactModal/open";
import { ACTIONS_MODERATE, editable, editableDoc } from "@/cms/edit";

// What the section shows when the CMS has nothing to show — a missing table, an
// empty database, or simply no review approved yet. Approved reviews arrive as
// the `reviews` prop (see @/cms/server/site); these are the placeholders the
// section shipped with and they remain the floor under it.
//
// The pool is read two at a time, so it wants an even count: the pair on screen
// is [2n, 2n + 1] and the tag numbers come straight from these positions, which
// is why re-ordering this list also re-numbers what the reader sees.
const FALLBACK_REVIEWS = [
    {
        tag: "#benefitprogram",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce in dui ut metus blandit dapibus ut eget purus. Nunc vel turpis mollis, consequat turpis at, tempus velit.",
        author: "| Jméno a město - klienta",
    },
    {
        tag: "#benefitprogram",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce in dui ut metus blandit dapibus ut eget purus. Nunc vel turpis mollis, consequat turpis at, tempus velit.",
        author: "| Jméno a město - klienta",
    },
    {
        tag: "#hypoteka",
        text: "Praesent commodo cursus magna vel scelerisque nisl consectetur et. Donec ullamcorper nulla non metus auctor fringilla. Vestibulum id ligula porta felis euismod semper.",
        author: "| Jméno a město - klienta",
    },
    {
        tag: "#investice",
        text: "Maecenas faucibus mollis interdum. Cras mattis consectetur purus sit amet fermentum. Aenean lacinia bibendum nulla sed consectetur, nullam quis risus eget urna mollis.",
        author: "| Jméno a město - klienta",
    },
    {
        tag: "#pojisteni",
        text: "Nullam quis risus eget urna mollis ornare vel eu leo. Integer posuere erat a ante venenatis dapibus posuere velit aliquet, sed do eiusmod tempor incididunt.",
        author: "| Jméno a město - klienta",
    },
    {
        tag: "#rodinnefinance",
        text: "Curabitur blandit tempus porttitor. Etiam porta sem malesuada magna mollis euismod. Duis mollis, est non commodo luctus, nisi erat porttitor ligula eget lacinia odio.",
        author: "| Jméno a město - klienta",
    },
];

// The section's own copy, from siteCopy "index.reviews". What is NOT here:
//
//   the heading   "Prohlédněte si další<br />recenze" — a hard line break, and
//                 the in-place editor flattens an element to one text node, so
//                 `textContent` would join the two lines. It also holds the
//                 Recenze button inside it.
//   the two links "Spojme se" / "Kontakt" are a typing animation between two
//                 stored strings, so the DOM never holds a settled value for an
//                 in-place editor to read back.
const ASIDE = { value: "3000+", label: "Spokojených klientů" };
const FALLBACK_SCROLL_HINT = "Scroll down";

// The section's heading, in the shape the site layer answers with: one entry per
// line, each a run of `[text, marked]`. No accent — this section paints none.
const FALLBACK_HEADING = [
    [["Prohlédněte si další", false]],
    [["recenze", false]],
];

// The pool the section actually reads. An odd count is trimmed rather than
// padded: the last review would otherwise be paired with `undefined` and the
// cell would render blank on one cycle in every rotation. Fewer than two
// approved reviews cannot make a pair at all, so the placeholders stand — the
// section is never partly real and partly lorem.
const resolvePool = (cmsReviews) => {
    const pool = Array.isArray(cmsReviews) ? cmsReviews.filter((r) => r?.text) : [];
    if (pool.length < 2) return FALLBACK_REVIEWS;
    return pool.length % 2 ? pool.slice(0, -1) : pool;
};

// How long one dot takes to run the whole path. Every beat below is a position
// in that run, so stretching this stretches the reviews' turn with it — the
// dots are not a decoration timed alongside the copy, they are its clock.
const LAP = 12;

// The path, once. Both dots run this same chain of corners; the second is
// simply further along it. A dot enters off the left edge on the row divider —
// which is the underside of the upper review and the top edge of the lower one
// — crosses right to the vertical at 40vw, climbs it to the lower of the two
// top rules, and carries on right, off the far edge. In, up, out.
//
// The first and last corners sit just outside the viewport on purpose: that is
// where the run closes, so the moment a dot stops being the one leaving and
// becomes the one arriving happens where nobody can see it. Only just outside,
// though — every frame a dot spends out there is a frame with one dot on screen
// instead of two, so the overshoot is the dot's own width and no more.
const PATH = [
    { x: -2, y: 42 },   // in from off the left edge, along the row divider
    { x: 40, y: 42 },   // ...across to the vertical
    { x: 40, y: 6 },    // ...up it to the lower top rule    → a review turns
    { x: 102, y: 6 },   // ...and away to the right, off the far edge
];

// Each leg's slice of the run, cut by the leg's real length at a 16:9 viewport
// rather than picked, so the dot holds one speed the whole way round instead of
// hurrying the short one.
const WINDOWS = [[0, 0.338], [0.338, 0.501], [0.501, 1]];

const CLIMB_IN = WINDOWS[1][0];
const CLIMB_OUT = WINDOWS[1][1];

// Where the second dot is on the path relative to the first: far enough back
// that it reaches the start of the divider on the frame the first one leaves it
// for the vertical. That is the loop — one dot turns up, the next comes in —
// and it is why there are always two of them on screen.
const FOLLOW = 1 - CLIMB_IN;

// The turns. A dot climbing the vertical is the event, and it takes one review
// up with it; the two dots take a different one each, so a cell holds for a
// whole run and the two cells turn a third of a run apart. Both positions are
// in the shared run, which is why the second is the first shifted back by the
// gap between the dots.
const BEATS = [
    { at: CLIMB_IN, cell: "first" },
    { at: (CLIMB_IN - FOLLOW + 1) % 1, cell: "second" },
];

// Where the dots stand before the run starts — far enough in that both are on
// screen, which is what a reader with motion turned down is left looking at.
const AT_REST = 0.1;

// The run cannot start before the three rules it uses are finished, or a dot
// arrives somewhere the line has not reached yet. That very nearly happened: the
// divider grows outwards from where the vertical crosses it, so its left end —
// which is exactly where a dot comes in — is the last part of it to exist. The
// draw windows below are ordered so v1, the top rule and the divider are all
// done by 0.58, and this waits for that.
const ARMED_AT = 0.6;

// How a dot crosses each leg, and how its trail follows. One curve per leg
// rather than one for all three, because the run's two ends are not corners —
// they are the same continuous motion seen either side of the frame edge. A dot
// that decelerated into the right edge and accelerated out of the left one would
// hang about outside the frame at both ends, and every frame it spends out there
// is a frame with one dot on screen instead of two.
//
// So: in at speed and easing into the corner, easing both ways up the vertical,
// then out of the corner and away at speed.
const EASES = [
    cubicBezier(0.25, 0.25, 0.3, 1),
    cubicBezier(0.42, 0, 0.3, 1),
    cubicBezier(0.42, 0, 0.75, 0.75),
];

// How far the lit trail reaches back behind a dot, as a share of the run. Short
// enough to read as something dragged along rather than as a line being filled
// in — the two dots share these rules, so nothing may be left lit behind one of
// them for the other to run into.
const COMET = 0.075;

// The dots breathe on their own clock rather than on their position in the run,
// so the swell reads at the same rate wherever they are on the path.
const PULSE = 1.8;

// Taking a corner: a hard swell given up at once and then a long tail, at the
// foot of the climb — which is the turn — and again at its head. Keyframes
// rather than a curve because it happens twice in a run, and the flat stretch
// between is what keeps each one an event.
const SWELL_AT = [
    CLIMB_IN - 0.012, CLIMB_IN, CLIMB_IN + 0.016, CLIMB_IN + 0.07,
    CLIMB_OUT - 0.012, CLIMB_OUT, CLIMB_OUT + 0.016, CLIMB_OUT + 0.07,
];
const SWELL = [1, 1.7, 1.45, 1, 1, 1.7, 1.45, 1];

// ...and the ring it throws off, which is the only thing in the section that
// says a corner was taken rather than showing it.
const PING_AT = [
    CLIMB_IN - 0.001, CLIMB_IN, CLIMB_IN + 0.07,
    CLIMB_OUT - 0.001, CLIMB_OUT, CLIMB_OUT + 0.07,
];
const PING = [1, 1, 4.4, 1, 1, 4.4];
const PING_FADE = [0, 0.5, 0, 0, 0.5, 0];

// Same curtain shape the sections above use for their copy: unhurried at the
// start, so a review never snaps into place the instant its turn comes round.
const CURTAIN = cubicBezier(0.5, 0, 0.16, 1);

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Did the run pass `at` between the last frame and this one? `raw` is allowed
// past 1 so a beat sitting near the end of the run is still caught on the frame
// the run wraps, rather than being stepped over unnoticed.
const crossed = (from, raw, at) =>
    raw < 1 ? from < at && raw >= at : from < at || raw - 1 >= at;

// Corners in viewport units → pixels from the section's top-left corner.
const toPixels = (corners, width, height) =>
    corners.map((corner) => ({
        x: (corner.x / 100) * width,
        y: (corner.y / 100) * height,
    }));

// Where a dot is at `t`. The leg is found by window rather than by distance —
// the windows are what hold the two dots the right way apart, so they, not the
// geometry, decide where a dot is at any moment.
const pointAt = (points, t) => {
    const found = WINDOWS.findIndex(([, to]) => t <= to);
    const i = found === -1 ? WINDOWS.length - 1 : found;
    const [from, to] = WINDOWS[i];
    const local = EASES[i](clamp01((t - from) / (to - from)));

    return {
        x: points[i].x + (points[i + 1].x - points[i].x) * local,
        y: points[i].y + (points[i + 1].y - points[i].y) * local,
    };
};

// Viewport size, for turning the path above into pixel distances. Only updates
// when the numbers actually change, so a resize that doesn't move anything
// doesn't remount the runners.
const useViewport = () => {
    const [size, setSize] = useState({ width: 1600, height: 900 });

    useEffect(() => {
        const read = () =>
            setSize((prev) =>
                prev.width === window.innerWidth && prev.height === window.innerHeight
                    ? prev
                    : { width: window.innerWidth, height: window.innerHeight },
            );
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, []);

    return size;
};

// One leg of the path, lit only where its dot has just been. Head and tail are
// the same curve a fixed interval apart and what is drawn is the gap between
// them, so the light travels the leg and drains off its end instead of filling
// it up. It has to be a passing thing: both dots run these same rules, and a leg
// left lit behind one of them would still be lit when the other arrived. The
// gradient falls away towards the tail, so the near end reads as the dot's own
// glow and the far end as it giving out.
function RouteLeg({ from, to, span, ease, clock }) {
    const [a, b] = span;
    const head = useTransform(clock, (t) => ease(clamp01((t - a) / (b - a))));
    const tail = useTransform(clock, (t) => ease(clamp01((t - a - COMET) / (b - a))));
    const extent = useTransform([head, tail], ([h, l]) => Math.max(0, h - l));

    const horizontal = from.y === to.y;
    // The box is laid out from the leg's lower coordinate whichever way the dot
    // runs, so the origin is put on the end it starts from and the trail is
    // pushed the other way.
    const forward = horizontal ? to.x > from.x : to.y > from.y;
    const shift = useTransform(tail, (l) => `${(forward ? l : -l) * 100}%`);

    const style = horizontal
        ? {
            left: `${Math.min(from.x, to.x)}vw`,
            top: `${from.y}vh`,
            width: `${Math.abs(to.x - from.x)}vw`,
            height: "1px",
            transformOrigin: forward ? "left center" : "right center",
            backgroundImage: `linear-gradient(to ${forward ? "right" : "left"}, transparent, var(--hColor))`,
            x: shift,
            scaleX: extent,
        }
        : {
            left: `${from.x}vw`,
            top: `${Math.min(from.y, to.y)}vh`,
            width: "1px",
            height: `${Math.abs(to.y - from.y)}vh`,
            transformOrigin: forward ? "center top" : "center bottom",
            backgroundImage: `linear-gradient(to ${forward ? "bottom" : "top"}, transparent, var(--hColor))`,
            y: shift,
            scaleY: extent,
        };

    return <motion.div className="ReviewsPreview__trail" style={style} />;
}

// One dot, its trail, and what it does at the corners. `at` is how far along the
// shared run this one stands; everything below reads that rather than the run
// itself, so the second dot is the first one's code with a different number.
// Keyed on the viewport by the parent, so the pixel measurements are rebuilt
// rather than corrected when the window changes.
function Runner({ at, clock, phase, viewport }) {
    const points = useMemo(
        () => toPixels(PATH, viewport.width, viewport.height),
        [viewport.width, viewport.height],
    );

    // This dot's own position in the run, wrapped. Everything else hangs off it.
    const own = useTransform(clock, (t) => (t + at) % 1);

    const x = useTransform(own, (t) => pointAt(points, t).x);
    const y = useTransform(own, (t) => pointAt(points, t).y);

    // The dot itself needs no fade — it leaves and returns through the clipped
    // edges. Its trail does: a trail is longer than the overshoot, so at the
    // moment the run closes there is still some of it lying inside the frame.
    // Rather than push the dot further out to bury it — which would cost the
    // second dot on screen — the trail is dimmed away over the last stretch and
    // reads as the glow giving out as it goes over the edge.
    const trailFade = useTransform(own, [0.86, 0.99], [1, 0]);

    // The breath: a slow swell and fall, small enough to be felt rather than
    // watched. On `phase`, so it reads at one rate wherever the dot is.
    //
    const breath = useTransform(phase, (s) => Math.sin((s / PULSE) * Math.PI * 2));
    const halo = useTransform(breath, (b) => 2.3 - b * 0.45);
    const haloOpacity = useTransform(breath, (b) => 0.18 + b * 0.1);

    const swell = useTransform(own, SWELL_AT, SWELL);
    const ping = useTransform(own, PING_AT, PING);
    const pingOpacity = useTransform(own, PING_AT, PING_FADE);
    const core = useTransform([breath, swell], ([b, s]) => (1 + b * 0.13) * s);

    return (
        <div className="ReviewsPreview__runner">
            <motion.div className="ReviewsPreview__runner__trail" style={{ opacity: trailFade }}>
                {PATH.slice(0, -1).map((from, i) => (
                    <RouteLeg
                        key={i}
                        from={from}
                        to={PATH[i + 1]}
                        span={WINDOWS[i]}
                        ease={EASES[i]}
                        clock={own}
                    />
                ))}
            </motion.div>
            <motion.div className="ReviewsPreview__runner__head" style={{ x, y }}>
                <motion.span
                    className="ReviewsPreview__runner__ping"
                    style={{ scale: ping, opacity: pingOpacity }}
                />
                <motion.span
                    className="ReviewsPreview__runner__halo"
                    style={{ scale: halo, opacity: haloOpacity }}
                />
                <motion.span className="ReviewsPreview__runner__core" style={{ scale: core }} />
            </motion.div>
        </div>
    );
}

// The copy does not turn as a block. It used to: one clip across the whole cell,
// opening from the edge the dot was on. The idea was right and the timing was
// not — the upper cell is 60vw wide with its text set against the right of it,
// so a clip travelling in from the left spent over half its length crossing an
// empty column before it reached a word. It read as a wait, and then a rush.
//
// So the clip is per line and tight to the line's own box, and the lines follow
// one another. Every frame of the reveal now has text in it. Which way they come
// from still says which line delivered them: `left` belongs to the upper cell,
// whose left edge is the vertical the dot climbs, `top` to the lower one, whose
// top edge is the divider the dot leaves to start that climb.
//
// The insets are pushed past the box on the open side so an arrived line is not
// quietly clipping its own descenders.
const HIDDEN = "inset(-40% 0% 112% 0%)";
const SHOWN = "inset(-40% 0% -40% 0%)";

const lineVariants = (shift) => ({
    initial: { opacity: 0, clipPath: HIDDEN, ...shift },
    enter: {
        opacity: 1,
        x: 0,
        y: 0,
        clipPath: SHOWN,
        transition: { duration: 0.6, ease: CURTAIN },
    },
    exit: {
        opacity: 0,
        clipPath: HIDDEN,
        ...shift,
        transition: { duration: 0.24, ease: "easeIn" },
    },
});

const OPENINGS = {
    left: lineVariants({ x: -18, y: 0 }),
    top: lineVariants({ x: 0, y: -16 }),
};

// Leaving runs bottom-up and quicker than arriving: the copy is pulled back
// towards the line it came from rather than dropped.
//
// The outgoing copy has to be all the way gone before the incoming copy mounts —
// that is what `mode="wait"` means, and it is the right choice here, because the
// two sets of lines would otherwise sit over each other. So the exit is kept
// short and the first arriving line waits for nothing: any slack between the two
// is a cell with nothing in it, and a blank cell reads as a flicker.
const COPY = {
    initial: {},
    enter: { transition: { staggerChildren: 0.07 } },
    exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

/**
 * The annotation on a quote, and the one thing it is allowed to offer.
 *
 * A review is a client's words. Nobody on this side of the site may rewrite
 * them, so the popup this opens is narrowed to moderation — hide and archive,
 * and no fields — which is what `data-cms-actions` says. Written beside the
 * annotation rather than as an attribute of its own on the element, because it
 * has to be gated on exactly the same condition: `editableDoc` answers `{}`
 * outside the editing frame, and an actions attribute written straight onto the
 * element would be the one `data-cms-*` in the public homepage's HTML.
 *
 * The presence of the document id IS that condition, so it is the test.
 */
const moderateOnly = (docId) => {
    const doc = editableDoc(docId, "review");
    return DOC_ATTR in doc ? { ...doc, "data-cms-actions": "moderate" } : doc;
};

// One review. Swapped whole, but arriving a line at a time.
// `ACTIONS_MODERATE` is the third argument and not a second annotation: a review
// is a client's words, nobody on this side may rewrite them, and the popup is
// narrowed to hide and archive. Passed here rather than inferred from the type,
// because the same type is edited in full in Schvalování recenzí — it is a
// statement about this surface.
// A quote is a `review` document, not copy: what is on screen is composed out
// of three of its fields — the tag is `#` plus the hashtag, the author is `|`
// plus the customer's name — so there is no one field an in-place edit could
// write back to. The whole document is annotated instead and clicking it opens
// the form an editor already knows from Schvalování recenzí.
function ReviewCopy({ index, review, turn, opening, showMore }) {
    const container = COPY;
    const line = OPENINGS[opening];

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={turn}
                {...editableDoc(review.docId, "review", ACTIONS_MODERATE)}
                className="ReviewsPreview__review__body"
                variants={container}
                initial="initial"
                animate="enter"
                exit="exit"
            >
                <motion.span className="ReviewsPreview__review__tag" variants={line}>
                    {String(index + 1).padStart(2, "0")} {review.tag}
                </motion.span>
                <motion.p variants={line}>{review.text}</motion.p>
                {showMore ? (
                    <motion.span variants={line}>
                        {/* Genuine navigation, and unannotated for want of a
                            field: the quote is truncated here and /recenze is
                            where it is not. "...více" is this component's own
                            word — reviewsCopy has no item for it. */}
                        <MoreLink href="/recenze" className="ReviewsPreview__review__more">...více</MoreLink>
                    </motion.span>
                ) : null}
                <motion.span className="ReviewsPreview__review__author" variants={line}>
                    {review.author}
                </motion.span>
            </motion.div>
        </AnimatePresence>
    );
}

// Reviews teaser after the Offers section. The structural lines are the grid
// cell borders, matching the 40vw geometry of the sections above. Two dots run
// those lines on one shared path, a third of it apart: in from the left along
// the row divider, up the vertical — which is where a review turns — and out to
// the right, at which point the one behind is arriving to do the same. Nothing
// else times the section.
export default function ReviewsPreview({ reviews, copy = {} }) {
    const sectionRef = useRef(null);
    const docId = copy.docId;
    const asideValue = copy.asideValue || ASIDE.value;
    const asideLabel = copy.asideLabel || ASIDE.label;
    const scrollHint = copy.scrollHint || FALLBACK_SCROLL_HINT;
    // Same split as the hero's, for the same reason: the mark belongs to the
    // field and holds even when the value falls back to what this component
    // shipped with. See MainIntro.
    const heading = {
        mark: copy.heading?.mark,
        lines: hasLines(copy.heading?.lines) ? copy.heading.lines : FALLBACK_HEADING,
    };
    const progress = useSectionProgress(sectionRef);
    const viewport = useViewport();

    // Resolved once per render rather than per cell: the indices below are
    // indices into this, and the two cells have to be reading the same pool or
    // the pairing means nothing.
    const pool = useMemo(() => resolvePool(reviews), [reviews]);
    const pairCount = Math.floor(pool.length / 2);

    // Position in the shared run. Kept off React state on purpose: it changes
    // every frame and only feeds transforms.
    const clock = useMotionValue(AT_REST);
    const phase = useMotionValue(0);

    // One counter per cell: they are turned by different dots, a third of a run
    // apart. Both advance exactly once per run, so the pool is still read in
    // pairs — the lower cell is simply holding the previous pair's half while
    // the upper one has moved on.
    const [firstTurn, setFirstTurn] = useState(0);
    const [secondTurn, setSecondTurn] = useState(0);

    // A little over a third of the section on screen: enough that the reviews
    // are being read, and it stops the run again once the page has moved on.
    //
    // This is the only thing that stops it. Holding the run while the cursor was
    // over a review seemed like courtesy — it is a countdown on something being
    // read — but the two cells between them cover almost the whole section, and
    // the page carries a cursor of its own that is always somewhere. In practice
    // it meant the dots stood still whenever anyone was looking at them, which
    // does not read as waiting. It reads as broken.
    const inView = useInView(sectionRef, { amount: 0.35 });

    // Motion turned down slows the run rather than parking it: the reviews are
    // the content and a dot crawling at a third of its pace still delivers
    // them, where a stopped one would pin the section to whichever pair it
    // happened to be holding. Everything downstream — trails, swells, the
    // typing labels — takes its time from this same clock, so one divisor
    // calms the lot.
    const calm = useReducedMotion();

    useAnimationFrame((_, delta) => {
        if (!inView) return;

        // A backgrounded tab hands back one enormous delta; capped, the run
        // resumes where it was instead of skipping a turn on return.
        const beat = Math.min(delta, 64) / 1000 / (calm ? 3 : 1);
        phase.set((phase.get() + beat) % PULSE);

        // Nothing to run along until the rules are drawn.
        if (progress.get() < ARMED_AT) return;

        const from = clock.get();
        const raw = from + beat / LAP;

        for (const { at, cell } of BEATS) {
            if (!crossed(from, raw, at)) continue;
            if (cell === "first") setFirstTurn((n) => n + 1);
            else setSecondTurn((n) => n + 1);
        }

        clock.set(raw % 1);
    });

    const firstIndex = (firstTurn % pairCount) * 2;
    const secondIndex = (secondTurn % pairCount) * 2 + 1;

    // Flips on every turn, either cell's — which is every time a dot climbs.
    const swapped = (firstTurn + secondTurn) % 2 === 1;

    // v1 carries on from the Offers down-line (both at 40vw), then the
    // staggered top spreads out of it, the row divider follows, and v2 hands
    // the network down to ChooseAdvisor.
    //
    // The three the dots run on — v1, the top rule and the divider — are all
    // brought forward to finish by 0.58, because ARMED_AT is 0.6 and a dot must
    // never be somewhere its line is not. The three that only hold the section's
    // shape take the rest of the scroll, in the same order they always did.
    const v1Draw = useTransform(progress, [0.06, 0.34], [0, 1]);
    const topLeftDraw = useTransform(progress, [0.16, 0.44], [0, 1]);
    const topRightDraw = useTransform(progress, [0.2, 0.5], [0, 1]);
    const h1Draw = useTransform(progress, [0.3, 0.58], [0, 1]);
    const v2Draw = useTransform(progress, [0.5, 0.74], [0, 1]);
    const h2Draw = useTransform(progress, [0.62, 0.86], [0, 1]);
    const bottomDraw = useTransform(progress, [0.68, 0.92], [0, 1]);

    // Up by the time the run starts, so the dots are standing on the network
    // rather than fading in over it once they are already moving.
    const dotsOpacity = useTransform(progress, [0.44, 0.58], [0, 1]);

    return (
        <section className="ReviewsPreview" ref={sectionRef}>
            <div className="ReviewsPreview__intro">
                <h2>
                    {/* The third of the four "nejde editovat" reports, and the
                        only one that could not simply be annotated where it
                        stands: the <h2> also holds the button, and an in-place
                        edit of the heading would swallow its words. So the two
                        lines get a box of their own.

                        An inline <span> with no rules of its own is the one
                        wrapper that adds nothing to inline layout — the h2's
                        own font, line-height and the `.cornerButton` descendant
                        rule all still apply through it. Measured before and
                        after: the h2's box and the button's box are identical
                        to the pixel. */}
                    <span {...editable(docId, "headline", "text", heading.mark)}>
                        <Lines lines={heading.lines} />
                    </span>
                    {/* Genuine navigation to the page this section is a teaser
                        for. Unannotated for want of a field: the word is this
                        component's own and reviewsCopy has no item for it. */}
                    <CornerButton href="/recenze">Recenze</CornerButton>
                </h2>
            </div>

            <article className="ReviewsPreview__review ReviewsPreview__review--first">
                <ReviewCopy
                    index={firstIndex}
                    review={pool[firstIndex]}
                    turn={firstTurn}
                    opening="left"
                />
            </article>

            <article className="ReviewsPreview__review ReviewsPreview__review--second">
                <ReviewCopy
                    index={secondIndex}
                    review={pool[secondIndex]}
                    turn={secondTurn}
                    opening="top"
                    showMore
                />
            </article>

            <div className="ReviewsPreview__aside">
                <span {...editable(docId, "items.0.value", "text")} className="ReviewsPreview__aside__value">{asideValue}</span>
                <span {...editable(docId, "items.0.label", "text")} className="ReviewsPreview__aside__label">{asideLabel}</span>
                {/* The two labels are never the same word: one is fed the flag
                    and the other its opposite, so whatever one is typing, the
                    other is typing the other. They turn over on `swapped`, which
                    is the parity of the two turn counters — so the labels change
                    on the same beat a review does, and the section keeps to one
                    rhythm rather than running a second timer of its own.

                    Unhurried, and with no cursor: the longer word takes about a
                    second to lay down. Everything else here moves at the pace of
                    a dot crossing the screen, and a label that rattled out would
                    be the one thing in the section in a hurry. */}
                {/* Both open the contact sheet rather than going to /kontakt,
                    which is a route with nothing on it but the patička. These
                    are the "Spojme se" the ask names: the sheet is the
                    conversion path and it is what the words already promise.
                    The href stays as the no-JavaScript fallback, and
                    `aria-haspopup` says what taking it actually does.

                    Their words stay unannotated, and not for want of a place to
                    put them: each is a typing animation between two stored
                    strings, so the DOM never holds a settled value for an
                    in-place editor to read back. Same reason they are absent
                    from reviewsCopy — see @/cms/server/site/homepage. */}
                <div className="ReviewsPreview__aside__links">
                    <Link href="/kontakt" aria-label="Kontakt" data-cursor="frame" {...CONTACT_TRIGGER}>
                        <TextTypeState
                            isActive={swapped}
                            textWhenTrue="Spojme se"
                            textWhenFalse="Kontakt"
                            typingSpeed={90}
                            deletingSpeed={52}
                            showCursor={false}
                        />
                    </Link>
                    <span className="divider" />
                    <Link href="/kontakt" aria-label="Kontakt" data-cursor="frame" {...CONTACT_TRIGGER}>
                        <TextTypeState
                            isActive={!swapped}
                            textWhenTrue="Spojme se"
                            textWhenFalse="Kontakt"
                            typingSpeed={90}
                            deletingSpeed={52}
                            showCursor={false}
                        />
                    </Link>
                </div>
                <div className="ReviewsPreview__aside__scroll">
                    <motion.span className="arrow" {...SCROLL_NUDGE}>
                        <Arrow direction="down" />
                    </motion.span>
                    <span {...editable(docId, "items.1.label", "text")}>{scrollHint}</span>
                </div>
            </div>

            {/* Structural line network (all connected):
                staggered top (left segment higher, right lower), v1 joins the
                two levels and runs to the row divider, v2 runs from the divider
                to the bottom edge, the aside closes on v2 at 74vh, and the
                bottom segment joins v2 from the left. */}
            <motion.div className="ReviewsPreview__line ReviewsPreview__line--topLeft" style={{ scaleX: topLeftDraw }} />
            <motion.div className="ReviewsPreview__line ReviewsPreview__line--topRight" style={{ scaleX: topRightDraw }} />
            <motion.div className="ReviewsPreview__line ReviewsPreview__line--v1" style={{ scaleY: v1Draw }} />
            <motion.div className="ReviewsPreview__line ReviewsPreview__line--h1" style={{ scaleX: h1Draw }} />
            <motion.div className="ReviewsPreview__line ReviewsPreview__line--v2" style={{ scaleY: v2Draw }} />
            <motion.div className="ReviewsPreview__line ReviewsPreview__line--h2" style={{ scaleX: h2Draw }} />
            <motion.div className="ReviewsPreview__line ReviewsPreview__line--bottom" style={{ scaleX: bottomDraw }} />

            {/* The two dots. Same path, same code, a third of a run apart — and
                the run reads the same on the server and on the first client
                frame, so nothing here has to be decided in the browser. The
                container clips: that is what lets the path start and end
                outside the frame. */}
            <motion.div className="ReviewsPreview__dots" style={{ opacity: dotsOpacity }}>
                <Runner
                    key={`lead-${viewport.width}x${viewport.height}`}
                    at={0}
                    clock={clock}
                    phase={phase}
                    viewport={viewport}
                />
                <Runner
                    key={`follow-${viewport.width}x${viewport.height}`}
                    at={FOLLOW}
                    clock={clock}
                    phase={phase}
                    viewport={viewport}
                />
            </motion.div>
        </section>
    );
}
