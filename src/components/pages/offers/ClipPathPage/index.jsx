"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
    cubicBezier,
    motion,
    useMotionValueEvent,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";
import GridDistortion from "@/components/common/ui/GridDistortion";
import { useGlobalContext } from "@/context/LoadProvider";
import CornerButton from "@/components/common/ui/CornerButton";
import Arrow from "@/components/common/ui/Arrow";
import { projects } from "@/constants/nabidkypage";
import { trackEvent } from "@/hooks/trackEvent";

// the site's own glide — away quickly, then a long approach
const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Viewport heights of scroll each chapter is given.
const RUN = 115;

// And the last chapter is held for this long after it finishes arriving.
//
// The sequence used to end inside itself. `lead` ran 0→3 across the whole of
// the section's scroll, so the fourth chapter's window finished opening at
// progress 1.0 — at which point the section stopped being sticky. There was a
// sheet of the page's own ground fading up over the last 7% to cover the seam,
// and measured at 1440×900 it began while the fourth chapter was 83% open and
// was solid by 99%: the last of the four was never once on the screen, lit and
// still. The other three each get a stretch of their own before the next climbs
// over them.
//
// The sheet is gone and this is what replaced it. The chapters now finish at
// 0.852 of the section, and the 60vh after that is the fourth one standing
// open, in full, while the reader decides what to do about it. That is a better
// ending than a fade to black for the one chapter carrying a link.
const CLOSE_RUN = 60;

// The one gate this page has, and the exact query styles.scss opens its
// `stacked` block on — the two have to agree to the pixel, because every value
// on this page is measured against a section that is 445vh tall in one layout
// and as tall as its own contents in the other.
//
// Nothing held upright is in it — phone, tablet or turned-sideways monitor.
// They all pin and ride like a laptop; only a phone has the reading placed
// differently. See the mixin in styles.scss for what the two arms are and what
// they are what is left of.
const STACK_QUERY =
    "(max-width: 900px) and (min-height: 521px) and (orientation: landscape)," +
    "(max-width: 479px) and (orientation: landscape)";

// False on the server and on the first client paint, so the markup either side
// of hydration is identical — matchMedia cannot be read while rendering. The
// stylesheet carries the same layout under !important, so the paint before this
// resolves is already the stacked one; this only stops the desktop timeline
// from writing inline values over it.
function useStacked() {
    const [stacked, setStacked] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(STACK_QUERY);
        const sync = () => setStacked(query.matches);
        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    return stacked;
}

// The partners, as one sequence.
//
// Each chapter is a full-screen plate stacked over the last, and it arrives by
// its own window opening from the floor — so nothing is ever dismissed, it is
// COVERED. Behind that window the picture travels a third of its own height,
// which is what makes an opening window read as depth rather than as a wipe.
// The picture is the shader, not a photograph: it can be pushed about in square
// cells like every other picture on this site.
//
// The reading sits to the right, on two plates. The first is the partner and
// what they are; the second is the one number the reader came for, kept apart
// so it cannot be skimmed past. Both are hairline boxes over a blurred, dimmed
// ground — no radius, no colour, nothing but the rules.
//
// The rules are the styling. An upright down the column's edge and two reaches
// that run out of it clear across the photograph, each carrying the same
// travelling white the home page's network carries.
//
// There is one arrangement. The switch between frames, a grid and a list was
// three ways of saying the same thing, and the sequence is the one worth having.
export default function Partners() {
    const [front, setFront] = useState(0);
    const { gate } = useGlobalContext();
    // Below the gate the plates are not fixed and there is no ride to be part
    // way through, so nothing on this page may be driven by the scroll — see
    // useStacked above and the `stacked` block in styles.scss.
    const stacked = useStacked();
    const calm = useReducedMotion();
    // The whole section is its photographs, so the root opacity is media and
    // enters at "ground" — a stage before the preloader's window opens.
    const ground = gate !== "hold";
    const sectionRef = useRef(null);
    const last = projects.length - 1;

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });
    // Softened, so a chapter keeps arriving for a beat after the wheel stops.
    const ride = useSpring(scrollYProgress, { stiffness: 110, damping: 30, mass: 0.5 });
    // Where the chapters are done, as a share of the section's own scroll. The
    // rest of it is the hold — see CLOSE_RUN.
    const rideSpan = (last * RUN) / (last * RUN + CLOSE_RUN);

    const lead = useTransform(ride, (p) => clamp01(p / rideSpan) * last);

    useMotionValueEvent(lead, "change", (v) => {
        const i = Math.min(last, Math.max(0, Math.round(v)));
        setFront((prev) => (prev === i ? prev : i));
    });

    return (
        <motion.section
            className="Partners"
            ref={sectionRef}
            // The measuring height belongs to the pinned ride. Stacked, the
            // section is as tall as the four chapters it actually contains —
            // the stylesheet says so too, but stating it here keeps a 445vh
            // inline value off an element that is 3000px tall.
            style={stacked ? undefined : { height: `${100 + last * RUN + CLOSE_RUN}vh` }}
            initial={{ opacity: 0 }}
            animate={ground ? { opacity: 1 } : undefined}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* All the chrome there is: what this is, and how far through. */}
            <div className="Partners__mark">
                <span className="Partners__mark__label">Partneři</span>
                <span className="Partners__mark__rule" aria-hidden="true" />
                {/* Pinned, this counts where the ride has got to. Stacked, the
                    mark is a heading at the top of a list that is then scrolled
                    away from, and a "01 / 04" frozen at its first chapter is a
                    progress report that never reports. It becomes the count. */}
                <span className="Partners__mark__count">
                    {stacked ? (
                        String(projects.length).padStart(2, "0")
                    ) : (
                        <>
                            {String(front + 1).padStart(2, "0")}
                            <em> / {String(projects.length).padStart(2, "0")}</em>
                        </>
                    )}
                </span>
            </div>

            <div className="Partners__stage">
                {projects.map((item, index) => (
                    <Chapter
                        key={item.number}
                        item={item}
                        index={index}
                        lead={lead}
                        stacked={stacked}
                        calm={calm}
                    />
                ))}
                {/* The full stop used to be here: a sheet of the page's own
                    ground over the whole stage, fading up to solid as the
                    section ran out. It is gone. What it was for — not letting
                    the sequence stop mid-sentence — is the tail of scroll below
                    (CLOSE_RUN), and that does it by holding the last chapter
                    rather than by painting it out. The fourth partner is the
                    one thing on this page a reader might act on; ending on it
                    means leaving it up. */}
            </div>
        </motion.section>
    );
}

function Chapter({ item, index, lead, stacked, calm }) {
    // How far this chapter has come in. 0 while the one before it still holds
    // the screen, 1 once its window is fully open. The first is simply open.
    const enter = useTransform(lead, (p) => clamp01(p - (index - 1)));
    // ...and how far the NEXT one has come over it, which is what dismisses it.
    const buried = useTransform(lead, (p) => clamp01(p - index));

    // The window, opening from the floor over the chapter beneath.
    //
    // Every chapter, the same way. Alternating the edge was tried and taken back
    // out: sideways, the window travels against the direction the page is being
    // read in, and what looked like rhythm on paper looked like a different
    // effect every other screen. One gesture, repeated, is the sequence.
    const clip = useTransform(enter, (e) =>
        `inset(${((1 - e) * 100).toFixed(2)}% 0% 0% 0%)`);

    // The long travel behind it.
    const own = useTransform(lead, (p) => p - index);
    const rideY = useTransform(own, [-1, 1], ["16%", "-16%"]);

    // Everything below arrives on the ride, so below the gate there is no ride
    // to arrive on and every one of them reads "already here". One value, held
    // at rest, rather than a branch per property.
    const still = stacked ? 1 : null;

    const dim = useTransform(buried, [0, 1], [1, 0.4]);

    // The reading arrives once the window is most of the way open and leaves as
    // the next plate climbs over it.
    //
    // In ORDER, though. Every line used to ride one value and the whole plate
    // appeared at once, which reads as a slide being swapped rather than a page
    // being set. Each part now has its own window out of the same arrival, in
    // the order the eye takes them — the stagger this site uses everywhere else.
    const copyIn = useTransform(enter, [0.36, 0.9], [0, 1]);
    const gone = useTransform(buried, (b) => clamp01(1 - b * 1.6));

    // Written out rather than made by a helper: a helper that calls useTransform
    // is a hook inside a function, and the lint that runs on build refuses it
    // even though the call order never varies.
    const plateAlive = useTransform([copyIn, gone], ([c, g]) => clamp01(c / 0.28) * g);
    const eyebrowIn = useTransform([copyIn, gone], ([c, g]) => clamp01((c - 0.05) / 0.35) * g);
    const nameIn = useTransform([copyIn, gone], ([c, g]) => clamp01((c - 0.14) / 0.48) * g);
    const offerIn = useTransform([copyIn, gone], ([c, g]) => clamp01((c - 0.34) / 0.44) * g);
    const ctaIn = useTransform([copyIn, gone], ([c, g]) => clamp01((c - 0.5) / 0.4) * g);
    const dealIn = useTransform([copyIn, gone], ([c, g]) => clamp01((c - 0.62) / 0.38) * g);

    const plateY = useTransform(plateAlive, [0, 1], ["3vh", "0vh"]);
    const dealY = useTransform(dealIn, [0, 1], ["4vh", "0vh"]);
    const eyebrowY = useTransform(eyebrowIn, [0, 1], ["0.8em", "0em"]);
    const offerY = useTransform(offerIn, [0, 1], ["0.7em", "0em"]);
    const ctaY = useTransform(ctaIn, [0, 1], ["1em", "0em"]);
    const nameClip = useTransform(nameIn, (c) =>
        `inset(-30% ${((1 - c) * 100).toFixed(2)}% -30% 0%)`);

    // The rules, drawn out of the same arrival: the upright first, then the two
    // reaches out across the picture.
    const spineDraw = useTransform(enter, [0.26, 0.62], [0, 1]);
    const reachTop = useTransform(enter, [0.4, 0.8], [0, 1]);
    const reachBase = useTransform(enter, [0.52, 0.94], [0, 1]);

    const onVisit = () => {
        trackEvent(`partner_${item.title.toLowerCase().replace(/\s+/g, "_")}_visited`, {
            partner_name: item.title,
            partner_number: item.number,
            partner_url: item.href,
            page_section: "partners",
        });
    };

    return (
        <motion.article
            className="Partners__chapter"
            style={{ clipPath: stacked ? "none" : clip, zIndex: index + 1 }}
        >
            <div className="Partners__chapter__plate" data-cursor="frame">
                {/* The picture's own travel is the one motion here that answers
                    to nothing but itself, so it is the one the motion
                    preference takes away. The window keeps opening: it is tied
                    to the scroll, and it is how the page is read. */}
                <motion.div
                    className="Partners__chapter__ride"
                    style={{ y: stacked || calm ? 0 : rideY }}
                >
                    <GridDistortion imageSrc={item.src} cellSize={46}>
                        <Image
                            src={item.src}
                            alt={item.alt}
                            fill={true}
                            quality={80}
                            sizes="100vw"
                            style={{ objectFit: "cover", objectPosition: "center top" }}
                        />
                    </GridDistortion>
                </motion.div>
                {/* The page's half-black — see .photoVeil in globals.scss.
                    Constant, and under the wash rather than mixed into it: the
                    wash is this chapter's own STATE (it lifts as the next plate
                    climbs over), and a photograph's weight is not a state. */}
                <span className="photoVeil" aria-hidden="true" />
                <motion.span className="Partners__chapter__wash" aria-hidden="true" style={{ opacity: still ?? dim }} />
            </div>

            {/* The rules run clear across the picture, not just around the
                reading — that reach is what keeps them from being a border.
                They reach across a full-screen plate and there is no such plate
                below the gate, so stacked they are not drawn at all. */}
            {!stacked && (
                <>
                    <motion.span className="Partners__rule Partners__rule--spine" style={{ scaleY: spineDraw, opacity: gone }} aria-hidden="true" />
                    <motion.span className="Partners__rule Partners__rule--reachT" style={{ scaleX: reachTop, opacity: gone }} aria-hidden="true" />
                    <motion.span className="Partners__rule Partners__rule--reachB" style={{ scaleX: reachBase, opacity: gone }} aria-hidden="true" />
                </>
            )}

            <div className="Partners__column">
                <motion.div className="Partners__panel" style={{ opacity: still ?? plateAlive, y: stacked ? 0 : plateY }}>
                    <motion.span
                        className="Partners__panel__eyebrow"
                        style={{ opacity: still ?? eyebrowIn, y: stacked ? 0 : eyebrowY }}
                    >
                        <em>{item.number}</em>
                        <i />
                        {item.tag}
                    </motion.span>

                    <motion.h2 className="Partners__panel__name" style={{ clipPath: stacked ? "none" : nameClip }}>
                        {item.title}
                    </motion.h2>

                    <motion.p
                        className="Partners__panel__offer"
                        style={{ opacity: still ?? offerIn, y: stacked ? 0 : offerY }}
                    >
                        {item.description}
                    </motion.p>

                    <motion.div
                        className="Partners__panel__act"
                        style={{ opacity: still ?? ctaIn, y: stacked ? 0 : ctaY }}
                    >
                        <CornerButton href={item.href} className="Partners__panel__cta" onClick={onVisit}>
                            Navštívit stránky
                            <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                        </CornerButton>
                    </motion.div>
                </motion.div>

                {/* The number the reader came for, on its own plate and offset,
                    so it is read rather than skimmed past inside a paragraph —
                    and set as a figure, which is what it is. */}
                <motion.div className="Partners__deal" style={{ opacity: still ?? dealIn, y: stacked ? 0 : dealY }}>
                    <span className="Partners__deal__label">Co z toho máte</span>
                    <span className="Partners__deal__line">
                        {item.dealFigure && (
                            <em className="Partners__deal__figure">{item.dealFigure}</em>
                        )}
                        <span className="Partners__deal__rest">{item.deal}</span>
                    </span>
                </motion.div>
            </div>
        </motion.article>
    );
}
