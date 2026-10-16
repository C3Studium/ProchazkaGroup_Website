import Image from "next/image";
import { motion, cubicBezier, useReducedMotion } from "framer-motion";
import { RiGiftLine } from "@remixicon/react";
import Arrow, { SCROLL_NUDGE } from "@/components/common/ui/Arrow";
import { useGlobalContext } from "@/context/LoadProvider";
import { editable } from "@/cms/edit";

// SCROLL TECHNIQUE (step two):
// A pinned stage with a layered parallax handoff, then a wipe.
//
// The section becomes a ~200vh box holding a 100vh sticky stage. As the box is
// scrolled, the title dims and drifts up fastest, the photograph trails it, the
// rules barely move — the same depth ordering AboutHero uses. The number is the
// one thing that does NOT leave on its own schedule: it holds its position and
// its brightness longest, because it is the single fact the reader has to still
// be carrying when the three-steps section explains how it is earned. The stage
// then clears by a moving edge shared with the section arriving over it, rather
// than by a crossfade — a fade leaves the photograph legible through the next
// section's copy, which is exactly the failure AboutHero documents.
//
// A pin is right here specifically because this page is long and explanatory:
// the reader's first scroll should feel like the page starting to answer the
// question the hero just posed, not like the hero being scrolled off a list.
//
// What was rejected: scroll-driven entry for anything in this section. Every
// element here is above the fold at rest, so a `whileInView` reveal would put a
// blank column and an empty photo frame on a page nobody has scrolled yet.
// Hence mount-only `initial`/`animate` below.

// The site's own glide — the curve SplitText and AboutHero settle on. Imported
// as a shape rather than as `CURTAIN` from entrance.js because that module's
// variants are built for `whileInView`, and nothing in this section is.
const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// A meeting across a desk, not a handshake stock shot. The programme's middle
// step is the one that is hardest to picture — "the person you recommended
// becomes a client" — and this is that step: an advisor and a client, one
// table, both at ease. (family.webp, despite the name, is a wallet; checked.)
const PHOTO = {
    src: "/assets/backgrounds/workingHours.webp",
    alt: "Poradce Procházka Group při schůzce s klientkou",
};

// Copy comes from the CMS (`benefit-program.uvod` — see cms.config.js). These
// are the words the section ships with and what every field falls back to on
// its own, so an empty CMS, an unreachable database or a block that fills in
// nothing but its title renders exactly this screen.
const COPY = {
    eyebrow: "Benefit program",
    title: "Doporučte nás",
    statement: "Doporučte nás někomu, koho znáte — až se stane naším klientem, pošleme vám poukaz.",
    figureValue: "47 500 Kč",
    // Beside the gift icon, inside the same `<span>` as it. A bare text node
    // sharing its parent with markup has no element of its own to click, so
    // this one is edited in the Studio's form — see the note at the label.
    figureLabel: "celková hodnota odměn v programu",
    origin: "Procházka Group · Písek · OVB Allfinanz",
    scrollCue: "Jak to funguje",
};

/** A CMS string when there is one, the shipped one otherwise. */
const say = (value, shipped) => (value?.trim() ? value.trim() : shipped);

// Benefit program — opening section.
//
// One screen, and it has one job: a reader who leaves it must be able to say
// what the programme is in a sentence. So it carries exactly one statement and
// exactly one number, and nothing else that could be mistaken for a second
// point. The three steps, the ladder and the vouchers are the sections after
// this one; repeating any of them here would cost the statement its clarity.
//
// The number is 47 500 Kč — the whole ladder's worth — because it is the only
// figure that makes the programme concrete without describing its mechanics.
//
// No ground of its own: the WebGL shader mounted in _app sits behind every page
// and anything laid over it here, however translucent, only flattens it. The
// one wash in the section belongs to the photograph, not to the section.
export default function BenefitIntro({ copy = {} }) {
    const { gate } = useGlobalContext();
    const go = gate === "go";
    // Calm means the things that never stop, stop. The arrow's nudge is the
    // only perpetual motion this section owns in JS — the rules' glints are
    // the CSS half of the same rule and are turned off in styles.scss. The
    // mount entrances below are deliberately NOT gated on this: they happen
    // once, they are how the composition assembles, and removing them would
    // leave a reader who asked for less motion looking at a page that never
    // arrived rather than at a calm one.
    const calm = useReducedMotion();
    // The photograph alone enters a stage early — at "ground", ~400ms before
    // the preloader's window opens — so it is already standing when the page
    // is first seen. On client-side navigations gate is "go" from the first
    // render, so the original delay still applies there.
    const ground = gate !== "hold";

    // Field by field, over the words above.
    const said = {
        eyebrow: say(copy.eyebrow, COPY.eyebrow),
        title: say(copy.title, COPY.title),
        statement: say(copy.statement, COPY.statement),
        figureValue: say(copy.figureValue, COPY.figureValue),
        figureLabel: say(copy.figureLabel, COPY.figureLabel),
        origin: say(copy.origin, COPY.origin),
        scrollCue: say(copy.scrollCue, COPY.scrollCue),
    };
    // `alt: 'own'` in the configuration refuses the block's title as a stand-in
    // alt, so an unwritten alt arrives empty and the shipped one stands.
    const photo = copy.photo?.src
        ? { src: copy.photo.src, alt: say(copy.photo.alt, PHOTO.alt) }
        : PHOTO;
    const doc = copy.docId;

    return (
        <section className="BenefitIntro">
            {/* The rule network. Four lines on the grid's own column and row
                boundaries — the left margin, the 72vw rail the photograph
                crosses, and the two horizontals that close the title's room.
                They are drawn in on mount, in order down the page, so the
                composition assembles rather than appearing. */}
            <motion.div
                className="BenefitIntro__line BenefitIntro__line--railLeft"
                initial={{ scaleY: 0 }}
                animate={go ? { scaleY: 1 } : undefined}
                transition={{ duration: 0.83, ease: GLIDE, delay: 0.05 }}
            />
            <motion.div
                className="BenefitIntro__line BenefitIntro__line--railRight"
                initial={{ scaleY: 0 }}
                animate={go ? { scaleY: 1 } : undefined}
                transition={{ duration: 0.98, ease: GLIDE, delay: 0.1 }}
            />
            <motion.div
                className="BenefitIntro__line BenefitIntro__line--titleOver"
                initial={{ scaleX: 0 }}
                animate={go ? { scaleX: 1 } : undefined}
                transition={{ duration: 0.9, ease: GLIDE, delay: 0.18 }}
            />
            <motion.div
                className="BenefitIntro__line BenefitIntro__line--titleUnder"
                initial={{ scaleX: 0 }}
                animate={go ? { scaleX: 1 } : undefined}
                transition={{ duration: 1.05, ease: GLIDE, delay: 0.35 }}
            />
            <motion.div
                className="BenefitIntro__line BenefitIntro__line--foot"
                initial={{ scaleX: 0 }}
                animate={go ? { scaleX: 1 } : undefined}
                transition={{ duration: 1.05, ease: GLIDE, delay: 0.58 }}
            />

            <motion.p
                className="BenefitIntro__eyebrow"
                initial={{ opacity: 0, y: 12 }}
                animate={go ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.68, ease: GLIDE, delay: 0.15 }}
                {...editable(doc, "items.0.label", "text")}
            >
                {said.eyebrow}
            </motion.p>

            <h1 className="BenefitIntro__title">
                {/* The span rather than the h1: the reveal rises out of its own
                    line box, and the h1 is the box the grid places. */}
                <motion.span
                    initial={{ y: "0.32em", opacity: 0 }}
                    animate={go ? { y: "0em", opacity: 1 } : undefined}
                    transition={{ duration: 0.98, ease: GLIDE, delay: 0.13 }}
                    {...editable(doc, "title", "text")}
                >
                    {said.title}
                </motion.span>
            </h1>

            <div className="BenefitIntro__copy">
                <motion.p
                    className="BenefitIntro__statement"
                    initial={{ opacity: 0, y: 24 }}
                    animate={go ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.75, ease: GLIDE, delay: 0.43 }}
                    {...editable(doc, "body", "text")}
                >
                    {said.statement}
                </motion.p>

                <motion.div
                    className="BenefitIntro__figure"
                    initial={{ opacity: 0, y: 24 }}
                    animate={go ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.75, ease: GLIDE, delay: 0.53 }}
                >
                    <span
                        className="BenefitIntro__figure__value"
                        {...editable(doc, "items.1.value", "text")}
                    >
                        {said.figureValue}
                    </span>
                    <span className="BenefitIntro__figure__label">
                        {/* The icon says "poukaz" without spending a second
                            line on it — the label has room for the scale of the
                            figure or for what form it takes, not both.

                            It is also why these words carry no annotation: they
                            are a bare text node sharing this `<span>` with the
                            icon, and an in-place editor rebuilds the element's
                            children out of what it read — which would store the
                            `<svg>` as copy and drop it on the first save. The
                            words are `items.1.label` and are edited in the
                            form. */}
                        <RiGiftLine size={20} aria-hidden="true" />
                        {said.figureLabel}
                    </span>
                </motion.div>
            </div>

            {/* Over the rules, not under them. The rail at 72vw runs the height
                of the section and the photograph is the only solid thing on the
                screen; the line reads better disappearing behind it than ruled
                across it, and that crossing is what ties the two halves of the
                composition together.

                It opens from its top edge — the direction the title rose from —
                rather than bottom-up as entrance.js's PHOTO variant does. That
                variant is written for pictures that arrive on scroll, into a
                page already in motion; this one arrives on mount, alongside the
                title, and following it up from below would have the two moving
                against each other on the first frame the reader ever sees. */}
            <motion.div
                className="BenefitIntro__photo"
                initial={{ clipPath: "inset(100% 0% 0% 0%)", scale: 1.06 }}
                animate={ground ? { clipPath: "inset(0% 0% 0% 0%)", scale: 1 } : undefined}
                transition={{ duration: 1.13, ease: GLIDE, delay: gate === "go" ? 0.6 : 0 }}
                {...editable(doc, "image", "image")}
            >
                <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill={true}
                    priority={true}
                    quality={90}
                    // In lockstep with the two gates in styles.scss: short
                    // and sideways the picture takes 38% of the width, narrow
                    // and stacked it takes all of it, otherwise about half.
                    sizes="(max-height: 520px) 42vw, (max-width: 820px) 100vw, 50vw"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                />
                <div className="BenefitIntro__photo__overlay" />
            </motion.div>

            <motion.p
                className="BenefitIntro__origin"
                initial={{ opacity: 0 }}
                animate={go ? { opacity: 1 } : undefined}
                transition={{ duration: 0.75, ease: GLIDE, delay: 0.65 }}
                {...editable(doc, "items.2.label", "text")}
            >
                {said.origin}
            </motion.p>

            {/* The page below this is long and every part of it answers a
                question this screen deliberately leaves open, so the cue names
                the next section rather than saying "scroll". */}
            <motion.div
                className="BenefitIntro__scroll"
                initial={{ opacity: 0 }}
                animate={go ? { opacity: 1 } : undefined}
                transition={{ duration: 0.75, ease: GLIDE, delay: 0.75 }}
            >
                <motion.span
                    className="BenefitIntro__scroll__arrow"
                    {...(calm ? {} : SCROLL_NUDGE)}
                >
                    <Arrow direction="down" />
                </motion.span>
                <span
                    className="BenefitIntro__scroll__text"
                    {...editable(doc, "items.3.label", "text")}
                >
                    {said.scrollCue}
                </span>
            </motion.div>
        </section>
    );
}
