import { useEffect, useRef, useState } from "react";
import { cubicBezier, motion, MotionConfig, useScroll, useSpring, useTransform } from "framer-motion";
import { RiBox3Line } from "@remixicon/react";
import OrbitImages from "@/components/common/ui/OrbitImages";
import CornerButton from "@/components/common/ui/CornerButton";
import Arrow from "@/components/common/ui/Arrow";
import { editable, editableDoc } from "@/cms/edit";

// The section takes its logos, copy and photo from the CMS (siteCopy
// "index.offers" and the published partners — see @/cms/server/site). These are
// what it falls back to, and they are the values it shipped with: an empty
// database, a missing table or a failed query all leave the section rendering
// exactly what it rendered before any of this was wired.
//
// Keyed to one light tone in /logos/orbit; ordered so no two wide wordmarks
// end up adjacent on the path.
const FALLBACK_PARTNER_LOGOS = [
    "Allianz", "ceskapojis", "Amundi", "kooperativa", "AXA", "gcp", "ING",
    "Conseq", "csobpenzpoj", "metlife", "monetamb", "cpp", "Komercnipojistovna",
    "unicreditbank",
].map((name) => `/logos/orbit/${name}.webp`);

// Each line is revealed on its own, so the copy is grouped by line rather than
// by colour. [text, highlighted]
const FALLBACK_COPY_LINES = [
    [["Spolupracujeme", true], ["s partnery OVB Group", false]],
    [["a předními finančními domy,", false]],
    [["díky kterým pro vás máme", false], ["slevy", true]],
    [["i u", false], ["lokálních obchodů", true], ["ve vašem okolí.", false]],
];

const FALLBACK_PHOTO = {
    src: "/assets/backgrounds/secondOffice_1300.webp",
    alt: "Nabídky pro klienty",
};

// The ring gives up most of its size early and then takes its time arriving.
const SETTLE = cubicBezier(0.24, 1, 0.28, 1);
// The fly-by runs at a near-even rate — logos passing the camera should not
// visibly accelerate — and only eases at the very end as the ring pulls back.
const FLY = cubicBezier(0.35, 0.1, 0.5, 1);
// The copy's curtain is the opposite shape — it starts unhurried, so a line
// never snaps open the instant its turn comes round.
const CURTAIN = cubicBezier(0.5, 0, 0.16, 1);

// Where in `flow` the stage pins: the scope opens 40vh below the fold and the
// section top has 100vh further to rise, so 140 of the 590vh it spans.
const PIN_AT = 140 / 590;

// Gathering speed into the pin, shedding it again on the far side.
const GLIDE_IN = cubicBezier(0.55, 0, 1, 1);
const GLIDE_OUT = cubicBezier(0, 0, 0.45, 1);

const PHOTO_SLATS = [0, 1, 2, 3, 4];

// The width at which styles.scss trades the pinned stage for a stacked column.
// The two must agree: below it the section is a fraction of a viewport tall,
// the 550vh timeline never runs, and anything still keyed to `journey` sits at
// its end state — which for the stack is faded out. So under this width the
// content stops listening to scroll and carries its own entrances instead.
const STACK_QUERY = "(max-width: 820px)";

// The stacked entrances speak the same grammar as the journey-driven ones —
// slats slide their slice up into place, copy draws out from behind its left
// edge — just cued by arrival in the viewport instead of by the pin.
const STACK_EASE = [0.5, 0, 0.16, 1]; // CURTAIN, as a plain array for variants

const slatVariants = (index) => ({
    hidden: { y: "103%" },
    shown: {
        y: "0%",
        transition: { duration: 0.9, delay: index * 0.07, ease: STACK_EASE },
    },
});

const copyVariants = (index) => ({
    hidden: { clipPath: "inset(0% 100% 0% 0%)", x: "-1.1em" },
    shown: {
        clipPath: "inset(0% 0% 0% 0%)",
        x: "0em",
        transition: { duration: 0.85, delay: 0.1 + index * 0.11, ease: STACK_EASE },
    },
});

const fadeVariants = {
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const ctaVariants = {
    hidden: { opacity: 0, y: 24 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.25, ease: STACK_EASE } },
};

// In view once, a third of the way in — the same "already moving as it
// appears" the journey gives these elements, without a timeline to run on.
const STACK_VIEWPORT = { once: true, amount: 0.3 };

// How many logos cross the screen during the opening pass. The line advances by
// exactly this many slots, so it is also which logos: the first entries of
// partnerLogos above. Reorder that list to change who leads.
const FLY_BY_COUNT = 5;

const TITLE = "Naši partneři";

/**
 * The fourteen logos, as entries the ring can hand an identity to.
 *
 * A partner arrives either as a bare URL — which is what FALLBACK_PARTNER_LOGOS
 * is, and what the CMS answered with before a partner's id travelled with its
 * logo — or as `{ src, id }`. Both are accepted, and deliberately: the ring is
 * on the public homepage under a fallback that is bare strings, so a component
 * that only understood the richer shape would empty the orbit on the day the
 * database is unreachable.
 *
 * The id is the whole difference between a picture on a ring and a document.
 * With one, the logo is annotated as that partner's own row and clicking it in
 * the editor opens the form that already owns `order` — which is the logo's
 * position on this path, so the thing an editor reaches for after seeing the
 * ring is the field that moves it.
 *
 * `editableDoc` answers `{}` on the public site, so what this adds there is one
 * object per logo per render and no attribute at all.
 */
const orbitEntries = (logos) =>
    logos
        .map((entry) => {
            if (typeof entry === "string") return entry ? { src: entry } : null;
            const src = typeof entry?.src === "string" ? entry.src : "";
            return src ? { src, attrs: editableDoc(entry.id, "partner") } : null;
        })
        .filter(Boolean);

// One character of the title. They arrive in reading order, each rising into
// place — the section's own copy uses a per-line curtain and the panels before
// it rise per word, so per character is the one step finer that is still the
// same family of move.
function TitleChar({ ch, index, count, journey }) {
    const start = 0.44 + (index / count) * 0.045;
    const opacity = useTransform(journey, [start, start + 0.04], [0, 1]);
    const y = useTransform(journey, [start, start + 0.055], ["0.42em", "0em"], { ease: SETTLE });
    return (
        <motion.span style={{ opacity, y }}>
            {ch === " " ? "\u00A0" : ch}
        </motion.span>
    );
}


// One slat of the photo. The picture is not uncovered — it is assembled: each
// slat carries its own slice of the image and slides it up into place, so for
// most of the move the frame holds five mismatched strips that only agree at
// the end. Nothing opaque is laid over the section, which matters because the
// orbit is still passing through this space while it happens.
function PhotoSlat({ index, journey, photo, stacked }) {
    const y = useTransform(
        journey,
        [0.58 + index * 0.024, 0.73 + index * 0.024],
        ["103%", "0%"],
        { ease: CURTAIN }
    );
    // Stacked, the slat still assembles its slice — but on arriving in the
    // viewport (variants handed down from the frame) rather than on `journey`,
    // which never advances once the sticky is gone. The pane starts fully
    // clipped by its own slat, so the trigger has to sit on the frame: an
    // element the observer cannot see cannot bring itself in.
    return (
        <div className="Offers__photo__slat" style={{ left: `${index * 20}%` }}>
            <motion.div
                className="Offers__photo__pane"
                style={stacked ? { left: `${index * -100}%` } : { left: `${index * -100}%`, y }}
                variants={stacked ? slatVariants(index) : undefined}
            >
                {/* Five slats carry five slices of one picture and each one
                    slides its own copy; next/image cannot express that, and it
                    is why this is a plain <img> rather than an oversight. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.alt} draggable={false} />
            </motion.div>
        </div>
    );
}

// One line of copy, drawn out from behind its own left edge.
//
// `docId` is the siteCopy block, present only inside the Studio preview. The
// annotation goes on the outer span rather than the clipped one: that is the
// line's actual box, and an outline drawn on the inner element would be cut in
// half by its own reveal while the section is mid-timeline.
//
// `mark` names the inline emphasis the line carries — the `hl` runs below. It
// arrives with `docId` and is the field's own declaration (siteCopy's
// `items[].label`, resolved in @/cms/server/site/homepage.js), not something
// this component decided; all it does is put it where the overlay can read it,
// which is the same attribute-only edit as `docId` itself.
function CopyLine({ index, journey, parts, docId, mark, stacked }) {
    const reveal = useTransform(
        journey,
        [0.63 + index * 0.024, 0.78 + index * 0.024],
        [100, 0],
        { ease: CURTAIN }
    );
    const clipPath = useTransform(reveal, (r) => `inset(0% ${r.toFixed(2)}% 0% 0%)`);
    // A short slide behind the edge, so the words are moving as they appear
    // rather than being uncovered in place.
    const x = useTransform(reveal, (r) => `${(-r * 0.011).toFixed(3)}em`);

    return (
        <span {...editable(docId, `items.${index}.label`, "text", mark)} className="Offers__copyLine">
            <motion.span
                style={stacked ? undefined : { clipPath, x }}
                variants={stacked ? copyVariants(index) : undefined}
            >
                {parts.map(([text, highlighted], j) => (
                    <span className={highlighted ? "hl" : undefined} key={j}>
                        {text}
                        {j < parts.length - 1 ? " " : ""}
                    </span>
                ))}
            </motion.span>
        </span>
    );
}

// Section after the horizontal scroll, and the one place on the page that
// takes its time: 300vh of scroll against a 100vh stage. Two viewports of that
// are spent pinned, and they are spent on one thing — the orbit opened out
// across the whole screen, filling itself a logo at a time, naming what it is,
// and only then folding down onto its line so the section proper can exist.
// Everything before this point revealed itself while the page moved past; this
// one stops the page and plays.
export default function Offers({ partnerLogos: cmsLogos, copyLines: cmsCopyLines, photo: cmsPhoto, title: cmsTitle, docId, copyMark }) {
    const sectionRef = useRef(null);

    // Whether styles.scss has traded the pinned stage for the stacked column.
    // Hydration-safe: false on the server and the first client render, so the
    // markup matches; the CSS hides the stage below the same width, so nothing
    // orbit-shaped flashes in the frame the flag takes to catch up.
    const [stacked, setStacked] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(STACK_QUERY);
        const update = () => setStacked(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    // Resolved before anything else, because the timeline below is measured
    // against partnerLogos.length: the orbit advances by a fixed number of
    // slots and a slot is one over the count. An empty CMS answer therefore has
    // to become the fallback here, not somewhere further down.
    //
    // Normalised in the same breath, and the count taken off the normalised
    // list rather than the raw one: `orbitEntries` drops an entry with no
    // source, and a slot count taken from before that drop would put a gap on
    // the ring that every arrival after it is measured against.
    const partnerLogos = orbitEntries(cmsLogos?.length ? cmsLogos : FALLBACK_PARTNER_LOGOS);
    const copyLines = cmsCopyLines?.length ? cmsCopyLines : FALLBACK_COPY_LINES;
    const photo = cmsPhoto?.src ? cmsPhoto : FALLBACK_PHOTO;
    // Resolved here for the same reason the logos are: the hero spells it out a
    // character at a time and every character's window is cut from the length.
    const title = cmsTitle?.trim() ? cmsTitle.trim() : TITLE;

    // Which document the copy lines may be written back to, and the one place
    // in this file where that is not simply `docId`.
    //
    // A line is `items[n].label` — an item of a list, which has to exist before
    // it can be addressed. When the CMS answered with nothing the four lines
    // below are the ones in FALLBACK_COPY_LINES, and there is no items[0] to
    // write to; annotating them would offer an edit that could only fail. The
    // photo has no such problem and is annotated either way: `image` is a field
    // of the block whether or not it is filled in, so clicking the photo the
    // component shipped with is a real offer to replace it.
    const copyDocId = cmsCopyLines?.length ? docId : null;

    // One scope for the whole section, approach included, plus the release
    // scope below. The section used to run three of them; there is nothing left
    // that needs to know where the pin starts, because the timeline no longer
    // has parts.
    const { scrollYProgress: rawApproach } = useScroll({
        target: sectionRef,
        offset: ["start end", "start start"],
    });

    // A third scope spanning the section end to end, approach included. The
    // opening pass runs on this rather than on the pin, so it is already
    // underway while the section is still arriving — by the time the stage
    // pins, logos have been crossing the screen for most of a viewport.
    // The scope starts below the fold on purpose: "start 1.4" puts zero when
    // the section's top is still four tenths of a viewport under the bottom
    // edge, so the opening is already under way by the time any of it can be
    // seen. Started at the section edge instead, the first stretch is spent
    // scrolling a sticky that has not risen far enough to show anything.
    const { scrollYProgress: rawFlow } = useScroll({
        target: sectionRef,
        offset: ["start 1.4", "end end"],
    });
    const flow = useSpring(rawFlow, { stiffness: 90, damping: 30, restDelta: 0.0005 });

    const approach = useSpring(rawApproach, { stiffness: 260, damping: 42, restDelta: 0.0005 });

    // The pin is not released so much as covered: ReviewsPreview is pulled up
    // over this section's last stretch and slides across the still-pinned stage
    // (see its own y transform). All this does is drift the contents a little
    // against that, so the layer coming over has parallax to move against
    // rather than sliding over something perfectly static.
    const { scrollYProgress: rawLeaving } = useScroll({
        target: sectionRef,
        offset: ["end end", "end start"],
    });
    const leaving = useSpring(rawLeaving, { stiffness: 110, damping: 32, restDelta: 0.0005 });


    // ---- the ring ---------------------------------------------------------
    // ---- one ring, four readings ----------------------------------------
    // The whole sequence is a single object seen from four distances. Nothing
    // appears or disappears; what changes is where the camera is.
    //
    // ---- one motion ------------------------------------------------------
    // A single journey value drives everything. It used to be four eased
    // segments with a held value between each, which is what made it read as
    // three animations stitched together: a value that stops and then starts
    // again has a velocity of zero in the middle of a gesture, and the eye
    // reads every one of those as a seam. Here nothing holds. Each property
    // runs its own keyframes across the same continuous parameter, turning
    // where it has to — a turning point is a real change of direction and
    // passes through zero honestly, a hold does not.
    //
    // The ring is a circle laid flat in space and tipped towards the camera,
    // so the oval is the projection and depth is genuine: the logo at the near
    // point is closer to the lens, so it is centred, largest and moving fastest.
    // The orbit's share of this is deliberately the smaller one: it is over by
    // about four tenths, and the rest belongs to the content, which wants more
    // room than the ring does.
    const journey = useTransform(flow, [0.05, 0.98], [0, 1]);

    const stageScale = useTransform(journey, [0, 0.22, 0.4, 0.86, 1], [4.2, 3.9, 1.5, 1.05, 0.84]);
    const orbitTilt = useTransform(journey, [0, 0.22, 0.4, 0.86, 1], [89.2, 87, 62, 76, 83]);
    const orbitLens = useTransform(journey, [0, 0.22, 0.4, 0.86, 1], [2050, 2200, 4200, 6800, 7600]);
    const orbitLensPx = useTransform(orbitLens, (v) => `${Math.round(v)}px`);
    const stageYBase = useTransform(journey, [0, 0.22, 0.4, 0.86, 1], [-16, -14, 0, -10, -24]);

    // Smoothing the moment the stage pins. Until then the whole sticky is
    // rising at scroll speed and the orbit rides with it; the instant it pins,
    // that motion stops dead. Measured, the stage's centre was moving 10px per
    // 10px of scroll one sample before the pin and 0 after — a hard stop, and
    // the only thing in the section that is not scroll-linked motion.
    //
    // This gives back roughly half of that rise on the way in and then spends
    // it again just after, so the stage is still travelling as the pin takes
    // hold and decelerates out of it instead of being caught. It cannot be
    // cancelled outright: the sticky clips its own overflow, so a stage held
    // still in the viewport would simply be cut away until the section rises.
    const pinGlide = useTransform(flow, [0, PIN_AT, PIN_AT + 0.2], [0, 34, 0], {
        ease: [GLIDE_IN, GLIDE_OUT],
    });
    const stageY = useTransform([stageYBase, pinGlide], ([a, b]) => `${(a + b).toFixed(2)}vh`);
    const stageRotate = useTransform(journey, [0, 0.5], [-7, -8]);

    // Held large while the ring is pushed close; simply as big as the ring
    // makes them once it has pulled back.
    const sizeFix = useTransform(journey, [0, 0.22, 0.4], [0.86, 0.84, 1]);
    // The exit: the section's contents clear before the pin ends, so the stage
    // is empty by the time it stops being sticky and there is nothing to catch
    // the eye letting go. It runs through its own spring rather than straight
    // off the scroll — an eased mapping still arrives exactly when the scroll
    // does, and it is that exactness that reads as mechanical here.
    //
    // The rules are deliberately left out of it: they run to this section's own
    // edges and the section below picks them up there, so fading them breaks
    // the join. What leaves is the content; what hands over is the structure.
    const exiting = useSpring(useTransform(journey, [0.87, 0.98], [0, 1]), {
        stiffness: 62,
        damping: 22,
        restDelta: 0.0005,
    });
    const stackY = useTransform(exiting, [0, 1], ["0vh", "-15vh"]);
    const stackOpacity = useTransform(exiting, [0, 0.85], [1, 0]);



    const stageOpacity = useTransform(journey, [0, 0.02, 0.5, 0.86, 1], [0, 1, 1, 0.4, 0]);


    // The line advances by exactly FLY_BY_COUNT slots during the pass, so that
    // many logos cross the screen and no more. The ring's own steady turn is
    // deliberately slow (see `duration` below) — at a brisk rate it adds slots
    // of its own while you are reading the pass, and the count stops being
    // four. Everything after that is the
    // spin-down; it never stops dead.
    // Which logos are in the window when the pass starts is a matter of where
    // the ring happens to be; this offset parks it so the run begins on the
    // first entry of partnerLogos rather than three from the end.
    const slotSize = (1 / partnerLogos.length) * 100;
    // Enough travel for FLY_BY_COUNT logos to take the centre in turn during
    // the opening, then a long decelerating tail — one monotonic advance, not
    // a burst followed by a separate cruise.
    const passTravel = FLY_BY_COUNT * slotSize;
    // Item 0 starts just short of the near point rather than on it, so it
    // travels the last of the way in and takes the centre a moment after the
    // section opens — sitting it exactly on the mark means it has to be faded
    // up in place, and a logo this size appearing rather than arriving is a
    // pop however short the fade.
    const passOffset = 15;
    // The first FLY_BY_COUNT take the centre at a readable pace; after that it
    // accelerates hard, carrying those four on round to the far side while the
    // rest come through in turn. One monotonic advance, just a steepening one.
    const spinBoost = useTransform(
        journey,
        [0, 0.22, 0.44, 1],
        [passOffset, passOffset + passTravel, passOffset + 115, passOffset + 137],
    );

    // Nothing is faded up. Every logo is uncovered by arriving at the centre,
    // which means the ring has to turn far enough for all fourteen to have had
    // a turn — showing four and then bringing the rest up on opacity is the one
    // moment that reads as a trick, because the ten that appear never travelled
    // anywhere. This is only a backstop against a logo being left dark, and it
    // sits well after the last real arrival.
    const orbitOpen = useTransform(journey, [0.6, 0.68], [0, 1]);

    // The ring's own steady turn is held off until the opening is over, so the
    // section always starts with the same logo on the same mark. It comes in as
    // the ring opens and is at full rate by the time it is a backdrop.
    const orbitDrift = useTransform(journey, [0.42, 0.58], [0, 1]);

    // The track is there from the start, but barely — a hairline the logos are
    // visibly riding rather than floating past on nothing. It is what makes the
    // pass read as designed instead of as objects drifting through frame, and
    // it is the same rule the rest of the page is drawn with. It comes up to
    // full strength as the line curls into the ring.
    const pathProgress = useTransform(journey, [0.24, 0.4], [0, 1]);
    const pathOpacity = useTransform(journey, [0.24, 0.34, 0.46, 0.86, 1], [0, 0.22, 0.6, 1, 0]);

    // The title does one thing: it is there while the ring is at full size and
    // gone by the time it has drawn back. No entrance of its own.
    // The characters carry their own arrival (see TitleChar); the wrapper only
    // takes the whole thing away again.
    const heroOpacity = useTransform(journey, [0.58, 0.64], [1, 0]);
    const heroRule = useTransform(journey, [0.51, 0.56], [0, 1]);

    // Photo assembles itself from slats and the copy slides out from behind an
    // edge — see PhotoSlat and CopyLine. Nothing else on the page opens either
    // way; the earlier sections all wipe diagonally and rise their words.
    const iconOpacity = useTransform(journey, [0.62, 0.69], [0, 1]);
    const ctaOpacity = useTransform(journey, [0.8, 0.88], [0, 1]);
    const ctaY = useTransform(journey, [0.8, 0.88], ["3vh", "0vh"]);

    // ---- rules -----------------------------------------------------------
    // The down-line draws on the approach so it is already standing when the
    // orbit collapses onto it, and it draws slowly: a full viewport of scroll
    // for one hairline.
    const downDraw = useTransform(approach, [0.08, 0.92], [0, 1]);
    const hTopDraw = useTransform(journey, [0.56, 0.7], [0, 1]);
    const hMidDraw = useTransform(journey, [0.66, 0.78], [0, 1]);
    const vRightDraw = useTransform(journey, [0.7, 0.82], [0, 1]);
    const hBaseDraw = useTransform(journey, [0.73, 0.85], [0, 1]);

    // The rules leave too, wiped from the top of the section downwards, so
    // scrolled back up they rebuild from the bottom. Clearing only the content
    // and leaving the structure standing is the odd part — the section reads as
    // half-dismantled.
    //
    // Each horizontal collapses towards its own origin, which is where the
    // spine crosses it, so they retract into the vertical rather than just
    // getting shorter. The spine is the exception: it only wipes back to half,
    // because its lower half is the same line the next section carries on —
    // taking it all the way leaves that section's rule starting from nothing.
    const wipe = useSpring(useTransform(journey, [0.87, 1], [0, 1]), {
        stiffness: 62,
        damping: 22,
        restDelta: 0.0005,
    });
    const downWipe = useTransform(wipe, [0, 1], [1, 0.5]);
    const hTopWipe = useTransform(wipe, [0, 0.45], [1, 0]);
    const vRightWipe = useTransform(wipe, [0.15, 0.7], [1, 0]);
    const hMidWipe = useTransform(wipe, [0.35, 0.8], [1, 0]);
    const hBaseWipe = useTransform(wipe, [0.5, 0.95], [1, 0]);

    // A vertical drawn from its top cannot also be erased from its top by scale
    // alone, so the shrink is paired with a matching slide: the head walks down
    // while the foot stays put.
    const downScale = useTransform([downDraw, downWipe], ([d, w]) => d * w);
    const downY = useTransform(downWipe, (w) => `${((1 - w) * 100).toFixed(2)}vh`);
    const vRightScale = useTransform([vRightDraw, vRightWipe], ([d, w]) => d * w);
    const vRightY = useTransform(vRightWipe, (w) => `${((1 - w) * 54).toFixed(2)}vh`);
    const hTopScale = useTransform([hTopDraw, hTopWipe], ([d, w]) => d * w);
    const hMidScale = useTransform([hMidDraw, hMidWipe], ([d, w]) => d * w);
    const hBaseScale = useTransform([hBaseDraw, hBaseWipe], ([d, w]) => d * w);

    return (
        <MotionConfig reducedMotion="user">
        <section className="Offers" ref={sectionRef}>
            <div className="Offers__sticky">
                {/* Keyed by mode: `stacked` flips just after hydration, and
                    initial/whileInView are read at mount — flipping the props
                    on a live subtree leaves the in-view observers unarmed and
                    the content parked on "hidden". The flip happens while the
                    section is still far below the fold, so the remount is
                    never seen. */}
                <motion.div
                    key={stacked ? "stacked" : "pinned"}
                    className="Offers__stack"
                    style={stacked ? undefined : { y: stackY, opacity: stackOpacity }}
                >
                {!stacked && (
                <motion.div className="Offers__hero" style={{ opacity: heroOpacity }}>
                    {/* The heading, not the run of per-character spans inside
                        it: each character holds its own transform through the
                        reveal, and this is the box whose wrapping is the truth.
                        Same arrangement as WhoWeAre's paragraph. */}
                    <h2 {...editable(docId, "title", "text")} className="Offers__hero__title">
                        {title.split("").map((ch, i) => (
                            <TitleChar key={i} ch={ch} index={i} count={title.length} journey={journey} />
                        ))}
                    </h2>
                    <motion.div className="Offers__hero__rule" style={{ scaleX: heroRule }} />
                </motion.div>
                )}

                {!stacked && (
                <motion.div className="Offers__stageTilt" style={{ rotate: stageRotate, opacity: stageOpacity }}>
                <motion.div
                    className="Offers__stage"
                    style={{ scale: stageScale, y: stageY }}
                >
                    <OrbitImages
                        images={partnerLogos}
                        shape="ellipse"
                        radiusX={620}
                        radiusY={620}
                        rotation={0}
                        duration={110}
                        itemWidth={178}
                        itemHeight={68}
                        responsive
                        fill
                        showPath
                        pathProgress={pathProgress}
                        spinBoost={spinBoost}
                        sizeFix={sizeFix}
                        openProgress={orbitOpen}
                        driftFactor={orbitDrift}
                        tiltX={orbitTilt}
                        perspective={orbitLensPx}
                        pathOpacity={pathOpacity}
                    />
                </motion.div>
                </motion.div>
                )}

                {/* The frame, not a slat: five slats each carry a slice of the
                    same picture, so the thing an editor means by "this photo"
                    is the box they add up to. */}
                <motion.div
                    {...editable(docId, "image", "image")}
                    className="Offers__photo"
                    data-cursor="frame"
                    initial={stacked ? "hidden" : false}
                    whileInView={stacked ? "shown" : undefined}
                    viewport={stacked ? STACK_VIEWPORT : undefined}
                >
                    {PHOTO_SLATS.map((i) => (
                        <PhotoSlat key={i} index={i} journey={journey} photo={photo} stacked={stacked} />
                    ))}
                </motion.div>

                <motion.div
                    className="Offers__info"
                    initial={stacked ? "hidden" : false}
                    whileInView={stacked ? "shown" : undefined}
                    viewport={stacked ? STACK_VIEWPORT : undefined}
                >
                    <motion.span
                        style={stacked ? undefined : { opacity: iconOpacity }}
                        variants={stacked ? fadeVariants : undefined}
                    >
                        <RiBox3Line className="Offers__info__icon" size={26} />
                    </motion.span>
                    <p>
                        {copyLines.map((parts, i) => (
                            <CopyLine key={i} index={i} journey={journey} parts={parts} docId={copyDocId} mark={copyMark} stacked={stacked} />
                        ))}
                    </p>
                </motion.div>

                <motion.div
                    className="Offers__ctaWrap"
                    style={stacked ? undefined : { opacity: ctaOpacity, y: ctaY }}
                    initial={stacked ? "hidden" : false}
                    whileInView={stacked ? "shown" : undefined}
                    viewport={stacked ? STACK_VIEWPORT : undefined}
                    variants={stacked ? ctaVariants : undefined}
                >
                    {/* Genuine navigation — /nabidky is the partner list, which
                        is what this section is about and is not in the contact
                        sheet — so the target stays a path and is not editable.
                        Its words are unannotated for want of a field, not for
                        want of a place to put one: CornerButton forwards rest
                        props now, but this block's `items` ARE the copy lines —
                        every one of them is rendered as a line — so a label
                        stored there would appear on the page as a fifth line.
                        It wants a field of its own, which siteCopy has not got. */}
                    <CornerButton href="/nabidky" className="Offers__cta">
                        Zobrazit
                        <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                    </CornerButton>
                </motion.div>
                </motion.div>

                {!stacked && (<>
                {/* The down-line continues from HScroll panel 3 at 40vw and runs
                    to the bottom edge, where ReviewsPreview picks it up. The
                    rest frame the stage — the section is mostly air once the
                    orbit has settled, and the rules are what hold it together. */}
                <motion.div className="Offers__line Offers__line--down" style={{ scaleY: downScale, y: downY }} />
                <motion.div className="Offers__line Offers__line--hTop" style={{ scaleX: hTopScale }} />
                <motion.div className="Offers__line Offers__line--hMid" style={{ scaleX: hMidScale }} />
                <motion.div className="Offers__line Offers__line--vRight" style={{ scaleY: vRightScale, y: vRightY }} />
                <motion.div className="Offers__line Offers__line--hBase" style={{ scaleX: hBaseScale }} />
                </>)}
            </div>
        </section>
        </MotionConfig>
    );
}
