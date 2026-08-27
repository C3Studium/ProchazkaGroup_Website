import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import RotatingButton from "@/components/common/ui/stickyButtons/buttons/RotatingButton";
import CornerButton from "@/components/common/ui/CornerButton";
import GridDistortion from "@/components/common/ui/GridDistortion";
import Arrow, { SCROLL_NUDGE } from "@/components/common/ui/Arrow";
import Lines, { hasLines } from "@/components/common/ui/lines";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/hooks/trackEvent";
import { useGlobalContext } from "@/context/LoadProvider";
import { externalClass } from "@/components/common/ui/externalLink";
import { editable, editableLink } from "@/cms/edit";

// The photograph, the scroll hint, the badge's target and the Recenze button's
// words come from the CMS (siteCopy "index.hero" — see @/cms/server/site). These
// are what the section shipped with and what it falls back to: an empty
// database, a missing table or a failed query all leave it rendering exactly
// what it rendered before any of this was wired.
const FALLBACK_PHOTO = {
    src: "/assets/backgrounds/about.webp",
    alt: "Tým Procházka Group",
};

// The headline, in the shape the site layer answers with: one entry per line,
// each a run of `[text, marked]`. Written out rather than as a string with `\n`
// in it because this is the fallback — it is not decoded, it IS the decoded
// value, and spelling it this way is the only version of it that cannot drift
// from what the mark's decoder would have produced.
const FALLBACK_HEADING = [
    [["Budujeme pro lidi", false]],
    [["stabilní a kvalitní", false]],
    [["finanční poradenství", false]],
    [["už přes", false], ["jednu dekádu", true]],
];

const FALLBACK_SCROLL_HINT = "Scroll down";
const FALLBACK_BADGE = { label: "Nahlášení pojistného", href: "https://www.pojistnehlaseni.cz/" };
const FALLBACK_REVIEWS_CTA = "Recenze";

// What is NOT read from the CMS here, and why it cannot be.
//
// The "Máme více než / 3000 klientů" line is set with a hard `<br />` and has
// no field: it is the aside rather than the heading, and siteCopy gives a block
// one `headline`. The <h1> had the same problem and no longer does — a break is
// `\n` in the store and `<br />` on the page, the editor is multi-line, and the
// value arrives already cut at the breaks (see @/components/common/ui/lines).

// inset() mask closing bottom-up across a sub-range of the scroll progress.
const useClosingClip = (progress, from, to) =>
    useTransform(progress, (value) => {
        const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
        return `inset(0% 0% ${(t * 100).toFixed(2)}% 0%)`;
    });

// Hero. Pinned (sticky) while WhoWeAre scrolls over it; its layers drift
// upwards at different speeds and the photo/video wipe away bottom-up.
// `scrollTarget` is the shared HeroStack wrapper — the progress source has to
// be a non-sticky element, otherwise its rect freezes once pinned.
// `copy` is the siteCopy block this section's words came from; `copy.docId` is
// the document id and arrives only inside the Studio's editing frame (see
// @/cms/server/site/homepage). Every annotation below is spread onto an element
// that already exists — nothing here gains a wrapper, a class, a style or a
// transform, because this section's timeline is measured against boxes that must
// stay exactly where they are.
// The hero's entrance. Every outer layer here is scroll-driven (y/opacity
// motion values in `style`), so the entrance lives on INNER wrappers — the
// annotated boxes the timeline measures stay exactly where they are — and it
// waits for the preloader gate: on a full document load the curtain plays
// first and `go` flips as it leaves; on client-side navigation `go` is true
// from the first render and this is an ordinary mount entrance.
const ENTER_CURTAIN = [0.22, 1, 0.36, 1];

export default function MainIntro({ scrollTarget, copy = {} }) {
    const videoRef = useRef(null);
    const { gate } = useGlobalContext();
    const go = gate === "go";
    // The photo is the hero's GROUND: it enters at the preloader's first
    // handoff stage, so it is already standing inside the opening window;
    // the words and buttons above wait for `go`, after the reveal.
    const ground = gate !== "hold";

    const docId = copy.docId;
    const photo = copy.photo?.src ? copy.photo : FALLBACK_PHOTO;
    const scrollHint = copy.scrollHint || FALLBACK_SCROLL_HINT;
    const badge = {
        label: copy.badge?.label || FALLBACK_BADGE.label,
        href: copy.badge?.href || FALLBACK_BADGE.href,
    };
    const reviewsCta = copy.reviewsCta || FALLBACK_REVIEWS_CTA;
    // The mark and the lines are resolved apart, and that is not tidiness. The
    // mark is the FIELD's declaration, so it holds whether or not the value
    // arrived — and this fallback carries an accented run of its own. An
    // annotation without the mark makes the overlay read that run as emphasis
    // nobody declared, which it refuses rather than silently deleting: the
    // element would go back to being one of the four that "nejde editovat",
    // reachable only through an empty draft.
    const heading = {
        mark: copy.heading?.mark,
        lines: hasLines(copy.heading?.lines) ? copy.heading.lines : FALLBACK_HEADING,
    };

    const { scrollYProgress } = useScroll({
        target: scrollTarget,
        offset: ["start start", "end end"],
    });

    // Spring-smoothed progress: the layers trail the raw scroll slightly, so
    // they glide instead of snapping frame-to-frame with the wheel.
    const progress = useSpring(scrollYProgress, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });

    // layered parallax: foreground moves most, background least
    const yTitle = useTransform(progress, [0, 0.8], ["0vh", "-22vh"]);
    const yPhoto = useTransform(progress, [0, 0.8], ["0vh", "-18vh"]);
    const yBadge = useTransform(progress, [0, 0.8], ["0vh", "-22vh"]);
    const yReviews = useTransform(progress, [0, 0.8], ["0vh", "-16vh"]);
    const yScroll = useTransform(progress, [0, 0.8], ["0vh", "-10vh"]);
    const yVideo = useTransform(progress, [0, 0.8], ["0vh", "-7vh"]);

    // Each layer dissolves before it can reach the navbar — without this the
    // title just slides under it and collides with the logo.
    //
    // They also have to be gone before WhoWeAre arrives on top at 0.48: that
    // section used to carry an opaque background to hide this one, and it no
    // longer does, because an opaque cover is also a hole in the page's shader
    // ground. The hero now clears itself instead of being painted over.
    const titleOpacity = useTransform(progress, [0.08, 0.3], [1, 0]);
    const badgeOpacity = useTransform(progress, [0.24, 0.42], [1, 0]);
    const reviewsOpacity = useTransform(progress, [0.22, 0.4], [1, 0]);
    const scrollOpacity = useTransform(progress, [0, 0.12], [1, 0]);

    // the photo pushes back into depth while its mask closes
    const photoScale = useTransform(progress, [0, 0.44], [1, 1.06]);
    const photoClip = useClosingClip(progress, 0, 0.44);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 1.5;
        }
    }, []);

    // Handle Reviews link click - track reviews page interest
    const handleReviewsClick = () => {
        trackEvent("reviews_page_clicked", {
            button_text: "Recenze",
            button_location: "homepage_hero_corner_button",
            timestamp: new Date().toISOString(),
            page_section: "main_intro"
        });
    };

    // Handle RotatingButton click - track insurance reporting from homepage
    const handleInsuranceReportingClick = () => {
        trackEvent("insurance_reporting_clicked", {
            button_text: "Nahlášení Pojistného",
            button_location: "homepage_rotating_button",
            external_link: "https://www.pojistnehlaseni.cz/",
            timestamp: new Date().toISOString(),
            page_section: "main_intro"
        });
    };

    return (
        <section className="MainIntro">
            {/* One element holding four lines and one accented run — the first
                of the four "nejde editovat" reports. The annotation is on the
                <h1> itself, which is the box the timeline is measured against;
                the breaks are `\n` in the store and the accent is the mark the
                field declares, so `mark` travels with `docId` and the run
                carries the declared class beside this section's own. */}
            <motion.h1
                {...editable(docId, "headline", "text", heading.mark)}
                className="MainIntro__Title"
                style={{ y: yTitle, opacity: titleOpacity }}
            >
                <motion.span
                    className="MainIntro__enterBlock"
                    initial={{ opacity: 0, y: 34 }}
                    animate={go ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.8, ease: ENTER_CURTAIN, delay: 0.03 }}
                >
                    <Lines lines={heading.lines} markClass="highlighted" />
                </motion.span>
            </motion.h1>

            {/* The frame, not the canvas: GridDistortion paints the same file
                on a plane over the picture, so what an editor means by "this
                photo" is the box that owns `imageSrc` — one file, one field. */}
            <motion.div
                {...editable(docId, "image", "image")}
                className="MainIntro__Image"
                style={{ y: yPhoto, scale: photoScale, clipPath: photoClip }}
            >
                <motion.div
                    className="MainIntro__enterPhoto"
                    initial={{ clipPath: "inset(0% 0% 100% 0%)", scale: 1.06 }}
                    animate={ground ? { clipPath: "inset(0% 0% 0% 0%)", scale: 1 } : undefined}
                    transition={{ duration: 1.05, ease: ENTER_CURTAIN, delay: 0 }}
                >
                <GridDistortion imageSrc={photo.src} cellSize={56}>
                    <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill={true}
                        priority={true}
                        quality={90}
                        sizes="70vw"
                        placeholder="blur"
                        blurDataURL="data:image/webp"
                        style={{
                            objectFit: "cover",
                            objectPosition: "center",
                        }}
                    />
                </GridDistortion>
                <div className="overlay" />
                </motion.div>
            </motion.div>

            {/* Video background parked while the shader is the hero's ground.
                Its container carried an opaque overlay across the whole
                viewport, so nothing behind it was visible. */}
            {/* <motion.div className="MainIntro__Background" style={{ y: yVideo, clipPath: videoClip }}>
                <video
                    ref={videoRef}
                    src="/assets/video/kancl.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="MainIntro__Background__video"
                />
                <div className="overlay" />
            </motion.div> */}

            <motion.div className="MainIntro__Badge" style={{ y: yBadge, opacity: badgeOpacity }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={go ? { opacity: 1, scale: 1 } : undefined}
                    transition={{ duration: 0.7, ease: ENTER_CURTAIN, delay: 0.5 }}
                >
                {/* An icon, in the annotation's sense: the badge's words are one
                    <span> per letter on a rotating ring, each `aria-hidden`,
                    with the whole label carried as the link's `aria-label` — so
                    there is nothing here an in-place editor could put a caret
                    in, and the words stay editable in the Studio's form. It
                    leaves the site, so the target is what is editable, and the
                    element says as much rather than leaving it to be worked out
                    from the href. */}
                <Link
                    {...editableLink(docId, { href: "items.1.value" })}
                    href={badge.href}
                    className={externalClass(badge.href) || undefined}
                    onClick={handleInsuranceReportingClick}
                    aria-label={badge.label}
                    data-cursor="frame"
                >
                    <RotatingButton />
                </Link>
                </motion.div>
            </motion.div>

            <motion.div className="MainIntro__Scroll" style={{ y: yScroll, opacity: scrollOpacity }}>
                <motion.div
                    className="MainIntro__enterStack"
                    initial={{ opacity: 0, y: 12 }}
                    animate={go ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.55, ease: ENTER_CURTAIN, delay: 0.7 }}
                >
                <motion.span className="MainIntro__Scroll__arrow" {...SCROLL_NUDGE}>
                    <Arrow direction="down" />
                </motion.span>
                <span {...editable(docId, "items.0.label", "text")} className="MainIntro__Scroll__text">{scrollHint}</span>
                </motion.div>
            </motion.div>

            <motion.div className="MainIntro__reviews" style={{ y: yReviews, opacity: reviewsOpacity }}>
                <motion.div
                    className="MainIntro__enterRow"
                    initial={{ opacity: 0, y: 14 }}
                    animate={go ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.65, ease: ENTER_CURTAIN, delay: 0.6 }}
                >
                <p>Máme více než<br />3000 klientů</p>
                {/* Words only. /recenze is a path on this site, so the target is
                    routing rather than content — and it is genuine navigation:
                    the reviews page carries the quotes in full, which the
                    contact sheet does not have and is not about. */}
                <CornerButton
                    {...editableLink(docId, { text: "items.2.label" })}
                    href="/recenze"
                    onClick={handleReviewsClick}
                >
                    {reviewsCta}
                    <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                </CornerButton>
                </motion.div>
            </motion.div>
        </section>
    )
}
