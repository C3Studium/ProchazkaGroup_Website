import Image from "next/image";
import { useEffect, useState } from "react";
import GridDistortion from "@/components/common/ui/GridDistortion";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { editable } from "@/cms/edit";

// Copy and photo come from the CMS (siteCopy "index.who-we-are" — see
// @/cms/server/site). These are what the section shipped with and what it falls
// back to whenever that returns nothing.
const FALLBACK_TEXT = "Jsme skupina lidí, která pomáhá vám lidem se dostat z finančních situací a nebo i vás i seznámit jak náš systém v republice funguje, na co si dát pozor, čemu se vyhnout, a tvoříme pro vás pomocnou ruku, které se můžete chytit a vybudovat si vlastní finanční zabezpečení do budoucnosti";

const FALLBACK_PHOTO = {
    src: "/assets/backgrounds/conferenceFront.webp",
    alt: "Přednáška Procházka Group",
};

// One progress source spans BOTH phases of this section:
//   0    → the section is still below the fold
//   0.48 → it has fully covered the hero (92vh of scroll)
//   1    → it has scrolled off the top (192vh of scroll)
// Everything below is keyed to that scale, so the entry and the exit are one
// continuous motion rather than two animations fighting for the same value.
const COVERED = 0.48;

// Character reveal: each character fades 0.2 → 1 inside its own slice of this
// range, staggered by position. The slices overlap, so it reads as one wave.
const REVEAL_FROM = 0.135;
const REVEAL_TO = 0.455;
const CHAR_WINDOW = 0.086;

// One character. Own component so each can hold its own transform — hooks
// can't be called from inside a map.
const RevealChar = ({ char, progress, start, end }) => {
    const opacity = useTransform(progress, [start, end], [0.2, 1]);
    return <motion.span style={{ opacity }}>{char}</motion.span>;
};

// `docId` is the siteCopy block this section's copy came from, and it arrives
// only inside the Studio preview (see @/cms/server/site/homepage). It is spread
// onto two elements that already exist, as attributes — nothing here gains a
// wrapper, a class, a style or a transform, because this section's timeline is
// measured against boxes that must stay exactly where they are.
//
// Both annotations are unconditional on the text and photo being the CMS's:
// `body` and `image` are fields of the block whether or not they are filled in,
// so an editor looking at the copy the component shipped with can click it and
// replace it. That is not true of a list item, which has to exist before it can
// be addressed — see Offers.
export default function WhoWeAre({ scrollTarget, text: cmsText, photo: cmsPhoto, docId }) {
    // Resolved up front: the reveal below slices its window by character count,
    // so the text has to be settled before any of that is computed.
    const TEXT = cmsText?.trim() ? cmsText.trim() : FALLBACK_TEXT;
    const photo = cmsPhoto?.src ? cmsPhoto : FALLBACK_PHOTO;

    // On touch there is no pointer to push the distortion around — a finger
    // crossing the photo is a scroll, and reacting to it makes the picture
    // shudder under the very gesture that is supposed to move the page. So the
    // canvas never mounts there: the plain <Image> IS the fallback layer the
    // effect renders anyway, and skipping the wrapper also skips a WebGL
    // context the phone is better off keeping. Hydration-safe: the server and
    // the first client render both take the desktop branch, and the state
    // flips after mount.
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        setIsTouch(window.matchMedia("(hover: none)").matches);
    }, []);

    const { scrollYProgress } = useScroll({
        target: scrollTarget,
        offset: ["start start", "end start"],
    });

    const progress = useSpring(scrollYProgress, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });

    // The photo gets a much softer spring than everything else: its mask and
    // drift trail the scroll noticeably, which is what makes the reveal read
    // as gliding rather than scrubbing.
    const photoProgress = useSpring(scrollYProgress, {
        stiffness: 70,
        damping: 26,
        restDelta: 0.0005,
    });

    // Rides 18vh below its resting place and closes the gap on a decelerating
    // curve — most of the cover happens in the first half of the scroll.
    const ySection = useTransform(progress, [0, COVERED / 2, COVERED], ["18vh", "5vh", "0vh"]);

    // Content trails the panel edge on the way in, then drifts on out ahead of
    // it — text and photo at different rates, so the exit keeps some depth.
    const yContent = useTransform(progress, [0.1, 0.41, 0.55, 1], ["9vh", "0vh", "0vh", "-7vh"]);
    const yPhoto = useTransform(photoProgress, [0.1, 0.41, 0.55, 1], ["14vh", "0vh", "0vh", "-4vh"]);

    // on the way out the text settles back towards its unread state
    const textExitOpacity = useTransform(progress, [0.6, 0.95], [1, 0.35]);

    // Lines draw in as the section settles, in the order the eye follows them:
    // the connector down first, then the horizontal out of their crossing.
    // longer, later windows — both still finishing as the section lands (0.48)
    const connectorDraw = useTransform(progress, [0.1, 0.42], [0, 1]);
    const textUnderDraw = useTransform(progress, [0.26, 0.52], [0, 1]);

    // Photo grows out of its bottom-right corner towards the top-left: both
    // the top and left insets open from 100% to 0%.
    const photoClip = useTransform(photoProgress, (value) => {
        const t = Math.min(1, Math.max(0, (value - 0.12) / (0.41 - 0.12)));
        const cut = ((1 - t) * 100).toFixed(2);
        return `inset(${cut}% 0% 0% ${cut}%)`;
    });

    // pre-compute each character's slice of the reveal
    const words = TEXT.split(" ");
    const totalChars = TEXT.replace(/ /g, "").length;
    const travel = REVEAL_TO - REVEAL_FROM - CHAR_WINDOW;
    let charIndex = 0;

    return (
        <motion.section className="WhoWeAre" style={{ y: ySection }}>
            <motion.div className="WhoWeAre__text" style={{ y: yContent, opacity: textExitOpacity }}>
                {/* The paragraph, not the panel around it: the overlay outlines
                    what it selects and edits it in place, and the tight box is
                    the one whose line breaks are the truth. `body` is the
                    block's rich-text field; what is rendered here is its plain
                    reading, because the reveal below splits it per character. */}
                <p {...editable(docId, "body", "text")}>
                    {words.map((word, wordIndex) => (
                        <span className="word" key={`${word}-${wordIndex}`}>
                            {Array.from(word).map((char, i) => {
                                const start = REVEAL_FROM + (charIndex / (totalChars - 1)) * travel;
                                charIndex += 1;
                                return (
                                    <RevealChar
                                        key={i}
                                        char={char}
                                        progress={progress}
                                        start={start}
                                        end={start + CHAR_WINDOW}
                                    />
                                );
                            })}
                            {wordIndex < words.length - 1 ? " " : ""}
                        </span>
                    ))}
                </p>
            </motion.div>

            <motion.div
                {...editable(docId, "image", "image")}
                className="WhoWeAre__photo"
                style={{ y: yPhoto, clipPath: photoClip }}
            >
                {(() => {
                    // The same optimised <Image> either way — with the
                    // distortion it is the fallback layer under the canvas,
                    // without it it is simply the photo. `sizes` covers the
                    // stacked layout, where the picture runs the full column.
                    const picture = (
                        <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill={true}
                            quality={90}
                            sizes="(max-width: 820px) 92vw, 40vw"
                            placeholder="blur"
                            blurDataURL="data:image/webp"
                            style={{
                                objectFit: "cover",
                                objectPosition: "center",
                            }}
                        />
                    );
                    return isTouch ? (
                        picture
                    ) : (
                        <GridDistortion imageSrc={photo.src} alt={photo.alt} cellSize={52}>
                            {picture}
                        </GridDistortion>
                    );
                })()}
            </motion.div>

            {/* Connecting lines draw themselves in: the connector runs DOWN to
                the section's bottom edge, where FirstTime's top line picks it
                up and grows outwards from that same point. The horizontal
                below the text grows out of its crossing with the connector. */}
            <motion.div
                className="WhoWeAre__line WhoWeAre__line--connector"
                style={{ scaleY: connectorDraw }}
            />
            <motion.div
                className="WhoWeAre__line WhoWeAre__line--textUnder"
                style={{ scaleX: textUnderDraw }}
            />
        </motion.section>
    );
}
