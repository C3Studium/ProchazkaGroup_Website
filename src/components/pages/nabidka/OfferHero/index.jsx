"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
    animate,
    cubicBezier,
    motion,
    useMotionValue,
    useMotionValueEvent,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";

import { editable, editableLink } from "@/cms/edit";
import Arrow from "@/components/common/ui/Arrow";
import { coverGround } from "@/components/common/ui/pageGround";
import CornerButton from "@/components/common/ui/CornerButton";
import GridDistortion from "@/components/common/ui/GridDistortion";
import Lines, { hasLines } from "@/components/common/ui/lines";
import { useGlobalContext } from "@/context/LoadProvider";

// The hero is the first statistics band seen from close up, and scrolling is
// the camera pulling back off it. So this photo is not decoration that the
// next section happens to follow — it is the next section's first frame, and
// the two are the same file on purpose. Whatever replaces it here has to be
// replaced there too or the hand-off tears. See HANDOFF at the bottom.
//
// A 2000px copy, not the original: GridDistortion hands `imageSrc` straight
// to THREE.TextureLoader, so a 6000px source would go to the GPU at full size
// — tens of megabytes of texture for an image never drawn wider than the
// viewport. The source is backgrounds/family.webp, which is misnamed: it is
// the wallet, and it is the photo the first statistics band was designed on.
const HERO_PHOTO = "/assets/backgrounds/wallet_2000.webp";

// What this section says when the CMS says nothing — every string it shipped
// with, gathered so the fallbacks read as the copy they are rather than as
// defaults scattered through the markup. `seedNabidka.js` holds these verbatim;
// changing one here without changing it there makes the page say two different
// things depending on whether a query answered.
//
// The heading is written as the DECODED value — one entry per line, each a run
// of `[text, marked]` — for the reason MainIntro's is: this is the fallback, so
// it is not decoded, it IS the decoded value, and spelling it this way is the
// only version that cannot drift from what the mark's decoder would produce.
const FALLBACK_EYEBROW = "Nabídka";
const FALLBACK_HEADING = [
    [["Nemáte na vaše", false]],
    [["finance", false], ["prostor?", true]],
];
const FALLBACK_LEAD =
    "Každý den, kdy vaše dluhy nebo inflace rostou, ztrácíte peníze, které už nikdy neuvidíte.";
const FALLBACK_CTA = "Spojit se hned";
const FALLBACK_SCROLL = "Scroll";

// The photograph is deliberately NOT read from the CMS, and this is the one
// place that can say why: it is the first frame of the section below. StatRail's
// first cell draws the identical bitmap, unoptimised, from the same path, and
// the pin change between the two is invisible only while they agree. One of the
// two is a component constant either way (see HANDOFF at the foot of this file),
// so an editable copy here would be a picker that silently tears the handover.

// The resting aperture, in percentages of the pinned viewport. Percent rather
// than vh/vw because framer interpolates clip-path by walking the numbers in
// the string: a calc() anywhere inside it stops being interpolable and the
// shape snaps between keyframes instead of opening.
// The photograph's own aspect. The plate is derived from it rather than
// written down, because a fixed percentage cannot serve both a 1512x900 desk
// and a 390x844 phone: the same numbers that give a landscape window on one
// give a portrait window on the other, and a portrait window onto a landscape
// photograph crops away everything the picture was chosen for.
const PHOTO_RATIO = 2000 / 1333;

// Three tiers, matching what the copy is doing at each. Above md the copy is
// two columns in the bands above and below, so the plate can be tall; below it
// the copy stacks into one column and needs most of the lower band, so the
// plate gives way rather than being sat on.
//
// `cap` is a share of the viewport height: the ceiling that keeps the copy off
// the picture. `side` is the margin the plate keeps from the page edges.
// The top tier is deliberately off-centre. The headline crosses the plate's
// left edge, so the plate has to leave a wide margin on that side and almost
// none on the other — a centred plate with type beside it puts the two in
// separate zones and neither holds the page.
//
// Below 1200 the copy stacks under the picture and there is nothing to make
// room for, so those tiers stay symmetric.
// The boundaries are md (1200) and sm (900) from the breakpoint map, because
// each one is where the stylesheet changes what the copy is doing:
//
//   >= 1200  headline crosses the plate      plate off-centre, tall
//   >= 900   headline and lead flank it      plate centred, shorter
//    < 900   everything stacks beneath it    plate centred, a band
//
// Change one of these and the matching @include in styles.scss has to move
// with it, or the plate will make room for a layout that is not there.
const TIERS = [
    { from: 1200, left: 34, right: 6, cap: 0.54 },
    { from: 900, left: 12, right: 12, cap: 0.36 },
    { from: 0, left: 6, right: 6, cap: 0.34 },
];

// A phone held sideways is the one shape none of those three can serve. 844x390
// matches the last of them on width alone, and what it draws there is a 132px
// letterbox across the middle of the screen with the stacked copy sitting on
// top of it — measured, the headline covered the picture from edge to edge.
// Three blocks of type and a photograph do not go one above the other in 390px
// of height.
//
// Landscape is the aspect the desktop composition was designed for, so this is
// that composition at phone size: the plate takes the right half and the copy
// stands beside it. `cap` is generous because in this arrangement nothing is
// underneath the picture that it could sit on.
//
// The query is written out again in styles.scss as `@include phs-h` and the
// two have to agree — a width-only gate here would leave every phone in
// landscape on the stacked composition, which is the bug this tier exists for.
const SHORT_LANDSCAPE = { left: 50, right: 5, cap: 0.78 };
const isShortLandscape = (vw, vh) => vh <= 520 && vw >= 480 && vw >= vh;

// And a smaller version of the same argument one step down. The stacked
// composition was tuned on a 390x844 phone, where the plate and the three
// blocks of copy come to 9px short of the screen — so it has no spare, and a
// shorter phone has less than none. Measured at 360x640 the headline was drawn
// straight across the middle of the photograph, with the shade that would have
// made it legible already switched off at this width.
//
// Most of that is the stylesheet's to fix and it does (see the matching
// @media block in styles.scss): the copy was laid out in a column 68px
// narrower than the screen and broke into four lines it did not need. This
// tier is only the remainder, for viewports short enough that even the
// corrected copy cannot clear a centred plate. The plate's height is derived
// from its width, so widening its margins is how it gives room back: at
// 360x640, 14% instead of 6% takes a 211px band down to 165px.
//
// Deliberately narrower than the stylesheet's query, which also covers narrow
// but tall phones — those have the room once the copy stops wasting it, and
// a plate shrunk there would be a smaller picture for no reason.
const SHORT_PORTRAIT = { left: 14, right: 14, cap: 0.3 };
const isShortPortrait = (vw, vh) => vw < 900 && vh <= 720 && vh > vw;

// Width first, then the height the photograph asks for at that width, then the
// cap if the copy cannot live with it. What survives is expressed back as the
// inset percentages the clip-path needs.
const plateFor = (vw, vh) => {
    const tier = isShortLandscape(vw, vh)
        ? SHORT_LANDSCAPE
        : isShortPortrait(vw, vh)
          ? SHORT_PORTRAIT
          : TIERS.find((t) => vw >= t.from) || TIERS[TIERS.length - 1];
    const width = vw * (1 - (tier.left + tier.right) / 100);
    const height = Math.min(width / PHOTO_RATIO, vh * tier.cap);
    return { top: ((1 - height / vh) / 2) * 100, left: tier.left, right: tier.right };
};

// What the server renders and what a first paint shows: the desktop plate. The
// real one arrives in an effect a frame later, which is invisible here because
// the first thing the hero does is open the picture out of a hairline — there
// is no plate on screen yet to correct.
const SSR_PLATE = { top: 23, left: 34, right: 6 };

// The plate the entry opens into, measured once and then frozen. The live
// plate cannot be used for it: a keyframe array that changes identity restarts
// its animation, so every resize would replay the whole reveal.
const useEntryPlate = () => {
    const [entryPlate, setEntryPlate] = useState(null);
    useEffect(() => {
        setEntryPlate(plateFor(window.innerWidth, window.innerHeight));
    }, []);
    return entryPlate;
};

const usePlate = () => {
    const [plate, setPlate] = useState(SSR_PLATE);

    useEffect(() => {
        const measure = () =>
            setPlate((current) => {
                const next = plateFor(window.innerWidth, window.innerHeight);
                // Same object every resize would restart every useTransform
                // that closes over it, so the aperture would flicker while a
                // window is being dragged.
                return current.top === next.top &&
                    current.left === next.left &&
                    current.right === next.right
                    ? current
                    : next;
            });

        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    return plate;
};

const inset = (top, right, left = right) =>
    `inset(${top.toFixed(2)}% ${right.toFixed(2)}% ${top.toFixed(2)}% ${left.toFixed(2)}%)`;

// Where the aperture finishes. What is left after it is a short held frame —
// long enough that the rail never takes over mid-open (the last percent of the
// travel is slow, and a 9px rim of shader swapped out in one frame is a pop),
// short enough not to read as a pause.
const OPEN_END = 0.9;

// Two curves, because the two openings are driven by different things.
//
// SETTLE is time: the entry runs on its own and should arrive fast and come to
// rest slowly, which is the curve the rest of the site reveals on.
//
// TRAVEL is scroll, and the same curve there is wrong. A hard ease-out spends
// nine tenths of the movement in the first fraction of the wheel, so the
// picture snaps open and the remaining scroll does nothing — measured at rest,
// the aperture was already full bleed a third of the way into the section.
// Near-linear with a little softening at each end is what makes it read as a
// camera being pulled back by hand.
const SETTLE = cubicBezier(0.22, 1, 0.36, 1);
const TRAVEL = cubicBezier(0.45, 0.05, 0.35, 1);

// LAND is the entry's scale, and it is a third curve because SETTLE cannot do
// what this one has to. Under SETTLE the zoom was finished at the same
// millisecond as the aperture — measured 1.001 at 1923ms against the clip
// reaching 0% at 1923ms — so the picture stopped growing exactly as its window
// stopped, and the two motions cancelled into a wipe. This is flat enough
// through the middle that the scale is still visibly coming down after the
// window has settled, which is what makes a photograph read as landing.
const LAND = cubicBezier(0.33, 0.15, 0.25, 1);

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// The entry, in seconds. Written out here rather than inline because four
// elements have to agree on it: the seam draws, the photo opens out of the
// seam while the seam is still there to open out of, and the rules and the
// copy arrive behind both. Change one number in isolation and the sequence
// stops reading as one gesture.
// The share of the entry that is on screen; the rest is clip values the outer
// aperture already covers. Referenced by the map and by the edge lights.
const VISIBLE_RUN = 0.8;

const T = {
    seam: 0.43,
    photoDelay: 0.28,
    photo: 1.05,
    rulesDelay: 0.58,
    rules: 0.6,
    copyDelay: 0.7,
};

/**
 * @param {object} [copy] the `nabidka.hero` block, from `getPageContent`.
 *   `copy.docId` arrives only inside the Studio's editing frame.
 */
export default function OfferHero({ copy = {} }) {
    const sectionRef = useRef(null);
    const reduced = useReducedMotion();
    const { gate } = useGlobalContext();
    const go = gate === "go";
    // The photo's whole entry — seam, aperture, zoom — runs a stage early,
    // from "ground": the preloader's window opens ~400ms later and the
    // picture has to be standing behind it. Copy, rules and marks wait for
    // "go" as before.
    const ground = gate !== "hold";

    const docId = copy.docId;
    const eyebrow = copy.eyebrow || FALLBACK_EYEBROW;
    // The mark and the lines are resolved apart, for the reason MainIntro's
    // are: the mark is the FIELD's declaration and holds whether or not the
    // value arrived, and this fallback carries an accented run of its own.
    const heading = {
        mark: copy.heading?.mark,
        lines: hasLines(copy.heading?.lines) ? copy.heading.lines : FALLBACK_HEADING,
    };
    const lead = copy.lead || FALLBACK_LEAD;
    const cta = copy.cta || FALLBACK_CTA;
    const scrollHint = copy.scrollHint || FALLBACK_SCROLL;
    // Read when the entry starts, deliberately NOT a dependency: the gate
    // moves ground -> go while the aperture is mid-open, and restarting the
    // effect there would stop the animation to re-arm it with a delay.
    const gateRef = useRef(gate);
    gateRef.current = gate;
    const plate = usePlate();

    // The page's ground is a photograph of itself here, not the live shader.
    //
    // Measured across this section's own opening — the aperture going from the
    // plate to full bleed — the live shader was the whole of the cost: p50
    // 16.7ms and nine frames over 33ms with it, p50 8.3ms and none without.
    // It is the single worst stretch on the page, and it is the first thing
    // anyone sees. The still is the same picture from the same shader, so
    // nothing about the look changes; see ui/pageGround.js.
    useEffect(() => {
        const node = sectionRef.current;
        if (!node || typeof IntersectionObserver === "undefined") return undefined;

        let release = null;
        const watcher = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !release) release = coverGround();
            else if (!entry.isIntersecting && release) {
                release();
                release = null;
            }
        });
        watcher.observe(node);

        return () => {
            watcher.disconnect();
            release?.();
        };
    }, []);
    const entryPlate = useEntryPlate();

    // Everything timed rather than scrolled waits for that measurement. It
    // lands a frame after mount, which is nothing next to the delay before the
    // picture opens, and it is what keeps the reveal from being choreographed
    // against a plate that is not the one on screen.
    // One value drives the entry, and the clip and both edge lights are read
    // off it. Running them as three parallel animations meant three timelines
    // that only agreed at the ends: measured mid-reveal, the lights sat 25px
    // inside the picture they were supposed to be the edge of.
    const entryOpen = useMotionValue(0);

    useEffect(() => {
        if (!ground) return;
        if (reduced) {
            entryOpen.set(1);
            return;
        }
        if (!entryPlate) return;
        // Linear on purpose. The shaping lives in the map below, where it can
        // be applied to the part of the run that is on screen instead of being
        // spread across a range that is mostly hidden.
        const controls = animate(entryOpen, 1, {
            duration: T.photo,
            // No lead-in when the preloader is about to open its window —
            // the picture has 400ms to be there. On client navigations the
            // gate is already "go" and the original delay stands.
            delay: gateRef.current === "go" ? T.photoDelay : 0,
            ease: "linear",
        });
        return () => controls.stop();
    }, [entryOpen, entryPlate, reduced, ground]);

    const entryPlateTop = entryPlate ? entryPlate.top : SSR_PLATE.top;

    // Seam to plate over the first 80% of the run, plate to nothing over the
    // rest. Only the first stretch can be seen — the outer aperture covers the
    // remainder — so that is the stretch the easing is spent on, and it gets
    // four fifths of the clock rather than the eighth it had when one curve
    // ran the whole way.
    const entryInset = useTransform(entryOpen, (e) => {
        if (e >= 1) return 0;
        if (e <= VISIBLE_RUN) {
            return 50 + (entryPlateTop - 50) * SETTLE(e / VISIBLE_RUN);
        }
        return entryPlateTop * (1 - (e - VISIBLE_RUN) / (1 - VISIBLE_RUN));
    });

    const entryClip = useTransform(entryInset, (v) => inset(v, 0));

    // The lights sit on the visible edge, which is whichever of the two clips
    // is narrower — so they are clamped to the plate exactly as the picture is.
    const edgeOffset = useTransform(entryInset, (v) => `${Math.max(v, plate.top).toFixed(2)}%`);
    const roofFade = useTransform(entryOpen, [VISIBLE_RUN - 0.04, VISIBLE_RUN + 0.1], [1, 0]);
    const floorFade = useTransform(
        entryOpen,
        [0, 0.05, VISIBLE_RUN - 0.04, VISIBLE_RUN + 0.1],
        [0, 1, 1, 0]
    );

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });

    // Spring-smoothed for the same reason the homepage hero is: the aperture
    // is a large shape and reading it straight off the wheel makes the edge
    // stutter frame to frame.
    const progress = useSpring(scrollYProgress, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });

    // How far open the aperture is, 0 at the plate and 1 at full bleed. Every
    // frame element reads this one value, so the marks, the rules and the
    // window cannot drift apart.
    const opened = useTransform(progress, (v) => TRAVEL(clamp01(v / OPEN_END)));

    const aperture = useTransform(opened, (t) =>
        inset(plate.top * (1 - t), plate.right * (1 - t), plate.left * (1 - t))
    );

    // The photo shrinks towards its natural size as the window grows. Both
    // halves of "pulling back": a window that opens while the subject holds
    // its size would read as a wipe.
    const photoScale = useTransform(opened, [0, 1], [1.1, 1]);

    // Frame geometry, tracking the aperture exactly.
    const frameTop = useTransform(opened, [0, 1], [`${plate.top}%`, "0%"]);
    const frameBottom = frameTop;
    const frameLeft = useTransform(opened, [0, 1], [`${plate.left}%`, "0%"]);
    const frameRight = useTransform(opened, [0, 1], [`${plate.right}%`, "0%"]);
    const frameOpacity = useTransform(opened, [0.55, 1], [1, 0]);

    // The two rules run off both edges of the page while the plate sits on
    // them, then travel to the very top and bottom as it opens.
    const ruleTop = useTransform(opened, [0, 1], [`${plate.top}%`, "0%"]);
    const ruleBottom = useTransform(opened, [0, 1], [`${plate.top}%`, "0%"]);
    const ruleOpacity = useTransform(opened, [0.5, 0.95], [1, 0]);

    // The shader comes off the picture before the picture is handed over.
    //
    // GridDistortion paints a WebGL canvas on top of the ordinary <Image>, and
    // the rail that takes this frame over renders that same <Image> with no
    // canvas at all. Two different pipelines drawing the same photograph do
    // not produce the same pixels, so the cut between the sections — which is
    // only invisible while the two frames match — was showing.
    //
    // Fading it out is also the honest reading of what the shader is for: it
    // answers the pointer, and by now the picture is the whole screen and
    // there is nothing to point at. It stops costing the GPU anything visible
    // at exactly the moment the rail needs it.
    // Finished by 0.78, not 0.94. Measured on a hard throw across the cut, the
    // canvas was still at 0.94 two hundred milliseconds after the rail had
    // taken over: this value rides the same lagging spring as everything else
    // and then has the component's own 0.35s ease stacked on top of it. From
    // 0.9 onwards nothing about this section's appearance changes any more,
    // which is the margin the spring is allowed to eat.
    // A cut, not a dissolve — and not until the two pictures are the same size.
    //
    // Two renderings of one photograph are never quite the same picture, and a
    // long cross-fade between them shows both at once: the wallet doubled.
    // A cut is one frame of change instead, but only if there is nothing to
    // change — and for most of this section there is.
    //
    // The canvas is rasterised at the layout size and then scaled up by the
    // entry zoom and the scroll's pull-back, both of which are still settling:
    // measured from load, the painted box goes 1929x1148 -> 1663x990 and does
    // not reach its 1512x900 buffer until the pull-back is done. An upscaled
    // canvas next to a full-resolution bitmap is softer, and switching between
    // them at that point reads as the picture changing size.
    //
    // So the switch waits for both to finish. `atRest` is that gate.
    // The gate asks the canvas, rather than inferring from the scale it is
    // driven by. Two tenths of a percent of slack was enough to let the switch
    // through at a painted 1514x901 against a 1512x900 buffer, and that pair
    // of pixels is the whole of what a cut can show.
    //
    // The measurement is a layout read, so it is only taken once the scale
    // says it is nearly there — a handful of reads at the end of the run
    // rather than one on every frame of it.
    const [zoomLanded, setZoomLanded] = useState(false);
    const [pulledBack, setPulledBack] = useState(false);
    // Asked at most a few times, and never again once it has answered.
    //
    // getBoundingClientRect forces layout, and this fires on every frame the
    // scroll produces. Left to run it cost a 99.8ms worst frame in the middle
    // of the hero — a jank fix that was itself the jank.
    const settledRef = useRef(false);
    useMotionValueEvent(photoScale, "change", (v) => {
        if (settledRef.current || v > 1.02) return;
        // Found through the section rather than a ref: GridDistortion is not a
        // forwardRef component, so a ref handed to it would have been silently
        // undefined and this gate would never have opened.
        const host = sectionRef.current?.querySelector(".gridDistortion");
        if (!host) return;

        // Painted against laid out, not painted against the buffer.
        //
        // The buffer is in device pixels: on a 2x screen it is 3024x1800 behind
        // a 1512x900 box, so comparing the two can never match and the gate
        // would simply never open — the shader would stay up for the whole
        // page on every retina display. What the switch actually needs to know
        // is whether a transform is still enlarging the picture, and that is
        // the painted box against the laid-out one.
        const box = host.getBoundingClientRect();
        const matched =
            Math.abs(box.width - host.offsetWidth) < 1 &&
            Math.abs(box.height - host.offsetHeight) < 1;
        if (!matched) return;
        settledRef.current = true;
        setPulledBack(true);
    });
    // Reduced motion has no zoom to land, so nothing would ever report it.
    const atRest = (zoomLanded || reduced) && pulledBack;
    const shaderFade = atRest ? 0 : 1;

    // Shades the strip of picture the headline crosses. Only the desktop tier
    // overlaps, and only while the headline is there to need it — the moment
    // the copy is gone the photograph gets its own left edge back.
    const shadeOpacity = useTransform(progress, [0, 0.3], [1, 0]);

    // Copy clears well before the photo fills the screen, so nothing is ever
    // caught sitting on top of the full-bleed frame.
    // Held longer than it was. It used to be gone a quarter of the way through
    // the hero's travel, which left half a screen of scroll with the aperture
    // opening and nothing to read on either side of it — the join into the
    // section below felt like a gap because it was one.
    const copyOpacity = useTransform(progress, [0.2, 0.5], [1, 0]);
    const copyY = useTransform(progress, [0, 0.6], ["0vh", "-9vh"]);

    // Two jobs, one element. At rest it is holding the photo down into the
    // page's palette — a plate at full exposure is a bright rectangle in the
    // middle of a very dark site and reads as pasted on. From 0.45 it deepens
    // further, because the section after this one puts type on this picture.
    // Locked at the parting value from 0.85 rather than reaching it at 1.
    //
    // Both sections read scroll through a spring, and the cut between them is
    // a hard switch. Ramping right up to 1 meant that on a fast throw the
    // hero's spring had not arrived when the rail appeared at its own final
    // value, so the two disagreed by whatever the lag happened to be and the
    // handover flashed. Every value this section parts on now settles before
    // the last stretch, so lag cannot land inside the cut.
    // The scrim's own ramp used to be here — 0.28 through to 0.58 on this same
    // timeline. It is a flat half now (see .photoVeil in globals.scss), so there
    // is nothing left for the scroll to drive. The paragraph above still holds
    // for everything else this section parts on.

    // Reduced motion gets the composition, not the choreography: the plate is
    // simply there. The scroll-driven opening stays — it is the page's
    // structure, not an embellishment, and it only moves when the user does.
    // Reduced motion still has to be told to show the copy, not merely left
    // alone. Handing back an empty object dropped the variants off the
    // container, and a child that carries `variants` and is never given one to
    // resolve does not fall back to "visible" — it renders at the hidden state.
    // With Reduce Motion on, the headline, the eyebrow, the lead and the scroll
    // hint were all at opacity 0 and the hero was a photograph on a shader.
    //
    // `initial: false` is the fix rather than a zero-length transition: it
    // means "start where you are going", so the copy is simply there.
    const RISE = rise(reduced);

    const entry = (variants, transition) => ({
        initial: "hidden",
        animate: go ? "shown" : undefined,
        variants,
        transition,
    });

    return (
        <section className="OfferHero" ref={sectionRef}>
            {/* The seam is a plain element rather than a motion value, so the
                one number it shares with the aperture is handed to CSS. */}
            <div
                className="OfferHero__viewport"
                style={{
                    "--plate-left": `${plate.left}%`,
                    "--plate-right": `${plate.right}%`,
                }}
            >
                {/* The ground, as a bitmap. The live one is switched off for
                    as long as this section is on screen — see the effect
                    above — so this is what stands behind the plate. */}
                <div className="OfferHero__still" aria-hidden="true" />

                {/* Aperture. Two nested clips that intersect: the outer one is
                    the scroll (plate -> full bleed), the inner one is the entry
                    (seam -> full). Nesting them is what lets both own a
                    clip-path without either overwriting the other — at rest the
                    inner is wide open and the outer holds the plate, and on
                    scroll the outer is the narrower of the two and leads. */}
                <motion.div className="OfferHero__aperture" style={{ clipPath: aperture }}>
                    {/* Three keyframes, not two, and the middle one is the
                        whole point.
                        
                        Opening straight from the seam to inset(0) spends
                        almost all of its time on clip values the outer
                        aperture is already covering: the visible edge stops at
                        the plate, so of 1.15s only the first 180ms could be
                        seen and the picture appeared to snap. Stopping at the
                        plate at 80% of the run puts the easing where the eye
                        is, and the last fifth covers the part nobody watches.
                        
                        Horizontal is left at 0 throughout — the outer aperture
                        owns the plate's left and right edges and is correct
                        from the first frame, so restating them here would only
                        be a second chance to disagree with it. */}
                    <motion.div className="OfferHero__reveal" style={{ clipPath: entryClip }}>
                        {/* The entry's own scale, on its own element. The
                            scroll owns `scale` on the layer below, and two
                            sources cannot write one transform — nesting them
                            multiplies instead, which is what the two motions
                            should do anyway.

                            It runs longer than the aperture and settles after
                            it, so the picture is still coming to rest once the
                            window has stopped. That trailing quarter-second is
                            the whole difference between a photograph arriving
                            and a shape being wiped open. */}
                        <motion.div
                            className="OfferHero__zoom"
                            initial={{ scale: 1.16 }}
                            animate={ground ? { scale: 1 } : undefined}
                            transition={{
                                duration: reduced ? 0 : 2.4,
                                delay: reduced || gate !== "go" ? 0 : T.photoDelay - 0.05,
                                ease: LAND,
                            }}
                            onAnimationComplete={() => setZoomLanded(true)}
                        >
                        <motion.div
                            className="OfferHero__photo"
                            style={{ scale: photoScale, "--shader-fade": shaderFade }}
                        >
                            <GridDistortion imageSrc={HERO_PHOTO} cellSize={56}>
                                <Image
                                    src={HERO_PHOTO}
                                    alt="Otevřená peněženka s hotovostí"
                                    fill
                                    priority
                                    // Unoptimised, and so is every copy of
                                    // this photograph in the rail. Three
                                    // things have to draw the identical
                                    // bitmap — this fallback, the rail's own
                                    // ground layer and the <image> inside the
                                    // rail's SVG mask — and the optimiser is
                                    // reachable from only one of them. The
                                    // file is already a hand-cut 2000px copy
                                    // at 220KB, which is close to what it
                                    // would have returned anyway.
                                    unoptimized
                                    sizes="100vw"
                                    // Centred, because the shader crops from the centre and
                                    // the two have to be the same picture for the
                                    // switch between them to be invisible. Also the
                                    // frame the rail's first cell has to match.
                                    style={{ objectFit: "cover", objectPosition: "center" }}
                                />
                            </GridDistortion>
                        </motion.div>
                        </motion.div>
                        <motion.div
                            className="OfferHero__shade"
                            style={{ opacity: shadeOpacity }}
                            aria-hidden="true"
                        />
                        {/* The page's one half-black — see .photoVeil in
                            globals.scss. This element was already the overlay
                            that class describes; what it carried was a ramp
                            from 0.28 to 0.58 across the hero's own scroll,
                            which is the same picture at two different weights
                            depending on where the reader had stopped. 0.5 is
                            inside a tenth of both ends of that ramp, so the
                            handover to the rail below reads as it did — that
                            movement is a scale and a position, not a fade. */}
                        <div className="OfferHero__scrim photoVeil" aria-hidden="true" />
                    </motion.div>
                </motion.div>

                {/* The line the picture comes out of — and then the two
                    lines it comes out between.
                    
                    The seam used to draw itself and fade while the photograph
                    opened somewhere behind it, which left the opening with no
                    edge at all. Instead it splits: this one rides the top edge
                    up and a second rides the bottom edge down, both arriving
                    at the plate with the clip and going out there. The picture
                    is opened by something, rather than merely appearing. */}
                <motion.div
                    className="OfferHero__seam"
                    aria-hidden="true"
                    style={{ top: edgeOffset, opacity: roofFade }}
                    initial={{ scaleX: 0 }}
                    animate={ground ? { scaleX: 1 } : undefined}
                    transition={{ duration: reduced ? 0 : T.seam, ease: SETTLE }}
                />
                <motion.div
                    className="OfferHero__seam OfferHero__seam--floor"
                    aria-hidden="true"
                    style={{ bottom: edgeOffset, opacity: floorFade }}
                />

                {/* The plate sits on two rules that leave the page at both
                    ends. They are the only graphic device here, and they are
                    the same hairline the rest of the site is drawn with. */}
                <motion.div
                    className="OfferHero__rule OfferHero__rule--top"
                    aria-hidden="true"
                    style={{ top: ruleTop, opacity: ruleOpacity }}
                >
                    <motion.span
                        className="OfferHero__rule__line"
                        initial={{ scaleX: 0 }}
                        animate={go ? { scaleX: 1 } : undefined}
                        transition={{
                            duration: reduced ? 0 : T.rules,
                            delay: reduced ? 0 : T.rulesDelay,
                            ease: SETTLE,
                        }}
                    />
                </motion.div>
                <motion.div
                    className="OfferHero__rule OfferHero__rule--bottom"
                    aria-hidden="true"
                    style={{ bottom: ruleBottom, opacity: ruleOpacity }}
                >
                    <motion.span
                        className="OfferHero__rule__line"
                        initial={{ scaleX: 0 }}
                        animate={go ? { scaleX: 1 } : undefined}
                        transition={{
                            duration: reduced ? 0 : T.rules,
                            delay: reduced ? 0 : T.rulesDelay + 0.08,
                            ease: SETTLE,
                        }}
                    />
                </motion.div>

                {/* Marks on the plate that spread with it, so the frame is
                    never drawn as a box — only ever implied at its corners. */}
                <motion.div
                    className="OfferHero__frame"
                    aria-hidden="true"
                    style={{
                        top: frameTop,
                        bottom: frameBottom,
                        left: frameLeft,
                        right: frameRight,
                        opacity: frameOpacity,
                    }}
                >
                    {/* Not the shared CornerMarks component. That one is
                        five pixels across, starts invisible and is brought in
                        by a hover on its host — it is built to mark a word in
                        the navbar. These mark a half-screen plate and are part
                        of its resting look, so every property of it would have
                        had to be overridden. Same vocabulary, different object. */}
                    <motion.div
                        className="OfferHero__frame__marks"
                        initial={{ opacity: 0 }}
                        animate={go ? { opacity: 1 } : undefined}
                        transition={{
                            duration: reduced ? 0 : 0.7,
                            delay: reduced ? 0 : T.rulesDelay + 0.15,
                        }}
                    >
                        <span className="OfferHero__mark OfferHero__mark--tl" />
                        <span className="OfferHero__mark OfferHero__mark--tr" />
                        <span className="OfferHero__mark OfferHero__mark--bl" />
                        <span className="OfferHero__mark OfferHero__mark--br" />
                    </motion.div>
                </motion.div>

                <motion.div
                    className="OfferHero__copy"
                    style={{ opacity: copyOpacity, y: copyY }}
                    {...entry(
                        { hidden: {}, shown: {} },
                        {
                            delayChildren: reduced ? 0 : T.copyDelay,
                            staggerChildren: reduced ? 0 : 0.09,
                        }
                    )}
                >
                    {/* The eyebrow's words are the block's `title` and are
                        edited in the form, not here: they are a bare text node
                        sharing this paragraph with the tick, so annotating the
                        paragraph would store the tick as part of the copy and
                        drop its <span> on the first save. Same refusal
                        /ochrana-soukromi's GDPR eyebrow makes. */}
                    <motion.p className="OfferHero__eyebrow" variants={RISE}>
                        <span className="OfferHero__eyebrow__tick" />
                        {eyebrow}
                    </motion.p>

                    {/* One element holding two lines and one accented run. The
                        break is `\n` in the store and the accent is the mark
                        the field declares, so `mark` travels with `docId` and
                        the run carries the declared class beside this
                        section's own — see @/components/common/ui/lines. */}
                    <motion.h1
                        {...editable(docId, "headline", "text", heading.mark)}
                        className="OfferHero__title"
                        variants={RISE}
                    >
                        <Lines lines={heading.lines} markClass="OfferHero__title__accent" />
                    </motion.h1>

                    <div className="OfferHero__lead">
                        {/* The sentence that carries the whole argument, set at
                            a size that says so. In the design it was the
                            smallest type on the screen and the greeting above
                            it was the largest, which had the hierarchy exactly
                            backwards. */}
                        <motion.p
                            {...editable(docId, "body", "text")}
                            className="OfferHero__lead__text"
                            variants={RISE}
                        >
                            {lead}
                        </motion.p>
                        <motion.div className="OfferHero__lead__action" variants={RISE}>
                            {/* Words only. The target is a path on this site,
                                which is the site's own routing rather than
                                content — see `editableLink`'s three shapes and
                                the same call on /o-nas's cards. */}
                            <CornerButton
                                {...editableLink(docId, { text: "items.0.label" })}
                                href="/kontakt"
                            >
                                {cta}
                                <span className="cornerButton__arrow">
                                    <Arrow direction="upRight" />
                                </span>
                            </CornerButton>
                        </motion.div>
                    </div>

                    <motion.div className="OfferHero__hint" variants={RISE}>
                        <span {...editable(docId, "items.1.label", "text")}>{scrollHint}</span>
                        <Arrow direction="down" />
                    </motion.div>
                </motion.div>

            </div>
        </section>
    );
}

// One rise shared by every piece of copy, so the stagger is the only thing
// that distinguishes them and the block arrives as a block.
const rise = (reduced) => ({
    hidden: { opacity: 0, y: "0.6em" },
    shown: {
        opacity: 1,
        y: "0em",
        transition: { duration: reduced ? 0 : 1.28, ease: [0.22, 1, 0.36, 1] },
    },
});

// HANDOFF — read before building the statistics rail.
//
// This section ends with HERO_PHOTO full bleed, scale 1, object-position
// centre, under a 0.58 black scrim. The rail that follows has to open on
// exactly that: same file, same fit, same scrim, no entry animation on its
// first frame. Anything else and the pin change between the two sections
// shows as a jump, which is the one thing the whole reveal was for.
//
// The rail is pulled up over this section's last screen with a negative margin
// so that it pins at the moment this one stops travelling. Without that they
// would hand over across a full screen of scroll with both photographs on
// screen at once, sliding past each other.
//
// The statistics' own heading belongs to the rail and is drawn there, on the
// first frame of this same photograph. It was briefly here instead, which put
// a beat at the end of the hero that the rail would then have had to cover
// mid-sentence.
export { HERO_PHOTO };
