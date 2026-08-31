import Image from "next/image";
import GridDistortion from "@/components/common/ui/GridDistortion";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { RiStackLine, RiShakeHandsLine, RiBarChartGroupedLine } from "@remixicon/react";
import RotatingButton from "@/components/common/ui/stickyButtons/buttons/RotatingButton";
import { trackEvent } from "@/hooks/trackEvent";
import { useGlobalContext } from "@/context/LoadProvider";
import { editable, editableLink } from "@/cms/edit";
import { externalClass } from "@/components/common/ui/externalLink";
import {
    HERO_PINS_AT,
    geometryFor,
    showcaseProgressFromHero,
    useStackScale,
} from "@/components/pages/aboutUs/aboutStack";

// The heading, the three marks and the photograph come from the CMS (siteCopy
// "o-nas.hero" — see @/cms/server/site/aboutUs). Everything below is what the
// section shipped with and what it falls back to: an empty database, a missing
// table or a failed query all leave it rendering exactly what it rendered
// before any of this was wired.

const FALLBACK_TITLE = "O nás";

// The three things the page wants said before anything else. Icons rather than
// numbers: none of these is a statistic, and setting them as one would promise
// a figure the line does not carry.
//
// The icon is the half that stays here. It is a React component picked in this
// file, and the count is fixed by the layout below it — so the CMS supplies the
// words for the marks that exist and nothing else, merged by position.
const MARKS = [
    { Icon: RiStackLine, label: "13 let praxe" },
    { Icon: RiShakeHandsLine, label: "Individuální přístup" },
    { Icon: RiBarChartGroupedLine, label: "Výsledky" },
];

const FALLBACK_PHOTO = {
    src: "/assets/backgrounds/conferenceFront.webp",
    alt: "Školení týmu Procházka Group",
};

// The badge that rotates over the photograph. It goes off this site, so both
// halves are the editor's: the words that ride round the ring and the address
// they lead to. They live in `o-nas.links` rather than in the hero's own block —
// see ABOUT_LINKS in @/cms/server/site/aboutUs, which names the positions the
// annotation below spells as literals.
//
// The trailing space is the ring's own. The sentence is set twice round the
// circle and the space is what keeps the end of one from touching the start of
// the next; a save that drops it closes that gap by a character, because the
// in-place editor trims what it stores.
const FALLBACK_BADGE = {
    text: "Nahlášení pojistného - Nahlášení pojistného - ",
    href: "https://www.pojistnehlaseni.cz/",
};

// Decelerating glide — the same curve SplitText uses, so anything that enters
// on mount here settles the way the rest of the redesign does.
const GLIDE = [0.22, 1, 0.36, 1];

// The hero's own travel ends where it pins — its second screen is fully in
// place by then. The box around it is taller, because the stage inside it stays
// pinned well past the point where its own motion is finished (see
// styles.scss). Everything below still reads on the hero's own 0→1, and this is
// the one place that knows the difference.
const HERO_END = HERO_PINS_AT;

// About-page hero. A viewport and a half: the title sits in the middle of the
// first screen, the photo starts directly under it and breaks the fold, and
// the last 18vh of the stage are empty on purpose (see styles.scss).
//
// Because the photo is above the fold at rest, it reveals on mount alongside
// the title rather than on scroll — a scroll-driven mask would leave a visible
// blank rectangle sitting under the title on a page nobody has scrolled yet.
// Only the marks at its foot, which start below the fold, are scroll-driven.
//
// It carries no background of its own — not a fill and not a wash. The shader
// ground mounted in _app sits behind every page and is left to do the whole
// job; anything laid over it here, however translucent, only flattens it.
//
// `docId` is the siteCopy block this section's copy came from, and it arrives
// only inside the Studio's editing frame (see @/cms/server/site/aboutUs). It is
// spread onto elements that already exist, as attributes — nothing here gains a
// wrapper, a class, a style or a transform, because this section's timeline is
// measured against boxes that must stay exactly where they are.
export default function AboutHero({ title: cmsTitle, marks: cmsMarks, photo: cmsPhoto, badge: cmsBadge, docId }) {
    const sectionRef = useRef(null);
    const { gate } = useGlobalContext();
    const go = gate === "go";
    // The ground stage: true from the moment the preloader's window is
    // about to open ("ground") and ever after ("go") — the photo has to be
    // standing before the reveal, so it alone enters on this.
    const ground = gate !== "hold";

    const title = cmsTitle?.trim() ? cmsTitle.trim() : FALLBACK_TITLE;
    const photo = cmsPhoto?.src ? cmsPhoto : FALLBACK_PHOTO;

    // Each half falls back on its own: a block that fills in only the address
    // keeps the words the ring shipped with.
    const badgeText = cmsBadge?.text ? cmsBadge.text : FALLBACK_BADGE.text;
    const badgeHref = cmsBadge?.href?.trim() ? cmsBadge.href.trim() : FALLBACK_BADGE.href;

    // The words are merged onto the icons by position, and the icons decide how
    // many there are. A block with fewer lines than icons leaves the rest saying
    // what they said before; a block with more has the extra ones dropped.
    const marks = MARKS.map((mark, index) => ({
        ...mark,
        label: cmsMarks?.[index]?.trim() ? cmsMarks[index].trim() : mark.label,
    }));

    // A list item has to exist in the block before it can be addressed, so the
    // marks are only clickable when the CMS actually supplied them — the same
    // rule Offers' copy lines follow. The title and the photograph have no such
    // problem: they are fields of the block whether or not they are filled in.
    const marksDocId = cmsMarks?.length ? docId : null;

    // The track this hero erases itself against, at whatever width the screen
    // rides it — the same hook the showcase reads, which is the whole point of
    // the hook. Two answers here and the shared edge stops being shared.
    const scale = useStackScale();
    const geo = useMemo(() => geometryFor(scale), [scale]);

    // Measured against the section, which is deliberately NOT the thing that is
    // pinned — the stage inside it is. A sticky element's rect freezes the
    // moment it pins, so measuring against it would freeze the scroll with it.
    const { scrollYProgress: raw } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });

    // Rescaled to the hero's own life, so every range below is still written
    // against 0→1 of the hero rather than against the taller box it sits in.
    const heroProgress = useTransform(raw, [0, HERO_END], [0, 1]);

    // How the hero leaves, and it is not a fade.
    //
    // MemberShowcase arrives across this screen from the right — first by
    // growing its first card out of the bottom-right corner, then by riding the
    // whole track left. The hero is erased from the right edge by exactly the
    // amount that track covers, so the two share one moving edge: the hero is
    // whole to the left of it and gone to the right of it, with no gap opening
    // between them and no overlap where both are visible at once.
    //
    // That overlap is what a crossfade here actually looked like — the hero's
    // classroom photograph still legible through the copy sitting on top of it
    // — and it is why this reads the track's own position rather than a pair of
    // hand-set numbers. There is nothing here to keep in step: it is the same
    // description of where the track is that moves the track.
    const clearWipe = useTransform(raw, (value) => {
        const covered = 100 - geo.trackXAt(showcaseProgressFromHero(value));
        return `inset(0% ${Math.min(100, Math.max(0, covered)).toFixed(2)}% 0% 0%)`;
    });

    // The marks leave under their own steam, ahead of that edge.
    //
    // A wipe is the right way to take a photograph off a screen: it is a solid
    // block and a straight edge crossing it reads as a cut. It is the wrong way
    // to take words off one. The three marks sit at the far left, so the edge
    // reaches them last and reaches them slowly — long enough to stand there
    // slicing "Individuální přístup" down the middle of a letter.
    //
    // So they go before it arrives: gone by the time the edge is at 40vw, which
    // is a comfortable margin above the 3.5vw where they start. They drift left
    // as they fade, the way the thing erasing them is travelling, rather than
    // dimming where they stand.
    const marksLeaving = useTransform(raw, (value) => {
        const edge = geo.trackXAt(showcaseProgressFromHero(value));
        // 1 while the edge is still well clear of them, 0 once it is on them
        return Math.min(1, Math.max(0, (edge - 40) / 22));
    });
    const marksExitX = useTransform(marksLeaving, [0, 1], ["-4vw", "0vw"]);


    const progress = useSpring(heroProgress, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });

    // Layered drift: the title leaves fastest, the photo trails it, the rails
    // barely move. Small distances — this is depth, not travel — and scaled to
    // the 50vh the section actually travels, or the parallax outruns the scroll.
    const yTitle = useTransform(progress, [0, 1], ["0vh", "-8vh"]);
    const yBadge = useTransform(progress, [0, 1], ["0vh", "-5vh"]);
    const yPhoto = useTransform(progress, [0, 1], ["0vh", "-3vh"]);
    const yMarks = useTransform(progress, [0.2, 1], ["2vh", "-1vh"]);

    // The title dims rather than disappears: it is still the page's heading
    // while the photo is on screen, just no longer the thing being read. It
    // never leaves the viewport within the section's 50vh, so it settles at a
    // readable grey rather than fading out.
    const titleOpacity = useTransform(progress, [0.2, 0.8], [1, 0.35]);

    // The badge sits at 45vh and the navbar is fixed, so left alone the two
    // collide head-on partway through the section. It clears itself before
    // contact rather than sliding under the nav's own text.
    const badgeOpacity = useTransform(progress, [0.45, 0.62], [1, 0]);

    // The right-hand rail is the one line that runs the whole section, so it
    // draws with the scroll rather than on mount. It starts already spanning
    // the first viewport — a rail that stopped short beside the title would
    // read as a broken line rather than as one still being drawn — and reaches
    // the section's bottom edge as the marks arrive.
    const railDraw = useTransform(progress, [0, 0.7], [0.68, 1]);
    const marksOpacityIn = useTransform(progress, [0.14, 0.42], [0, 1]);

    // Arriving and leaving are two separate schedules on the same element, and
    // whichever is further along wins — multiplied rather than sequenced, which
    // would need a third value to say which of them is in charge.
    const marksOpacity = useTransform(
        () => marksOpacityIn.get() * marksLeaving.get(),
    );

    const handleInsuranceReportingClick = () => {
        trackEvent("insurance_reporting_clicked", {
            button_text: "Nahlášení Pojistného",
            button_location: "about_rotating_button",
            external_link: "https://www.pojistnehlaseni.cz/",
            timestamp: new Date().toISOString(),
            page_section: "about_hero",
        });
    };

    return (
        <section className="AboutHero" ref={sectionRef}>
            <motion.div className="AboutHero__stage" style={{ clipPath: clearWipe }}>
            {/* Structural rules. The two short ones at the top and the left
                stub frame the title's room; the long right-hand rail ties both
                viewports together. */}
            <motion.div
                className="AboutHero__line AboutHero__line--railLeft"
                initial={{ scaleY: 0 }}
                animate={go ? { scaleY: 1 } : undefined}
                transition={{ duration: 0.83, ease: GLIDE, delay: 0.05 }}
            />
            <motion.div
                className="AboutHero__line AboutHero__line--topLeft"
                initial={{ scaleX: 0 }}
                animate={go ? { scaleX: 1 } : undefined}
                transition={{ duration: 0.9, ease: GLIDE, delay: 0.18 }}
            />
            <motion.div
                className="AboutHero__line AboutHero__line--topRight"
                initial={{ scaleX: 0 }}
                animate={go ? { scaleX: 1 } : undefined}
                transition={{ duration: 0.9, ease: GLIDE, delay: 0.23 }}
            />
            <motion.div
                className="AboutHero__line AboutHero__line--railRight"
                style={{ scaleY: railDraw }}
            />

            <motion.h1 className="AboutHero__title" style={{ y: yTitle, opacity: titleOpacity }}>
                {/* The span, not the h1: the overlay outlines what it selects
                    and edits it in place, and the tight box is the one whose
                    line breaks are the truth. */}
                <motion.span
                    {...editable(docId, "title", "text")}
                    initial={{ y: "0.32em", opacity: 0 }}
                    animate={go ? { y: "0em", opacity: 1 } : undefined}
                    transition={{ duration: 0.98, ease: GLIDE, delay: 0.13 }}
                >
                    {title}
                </motion.span>
            </motion.h1>

            <motion.div
                className="AboutHero__line AboutHero__line--titleUnder"
                initial={{ scaleX: 0 }}
                animate={go ? { scaleX: 1 } : undefined}
                transition={{ duration: 1.05, ease: GLIDE, delay: 0.35 }}
            />

            <motion.div className="AboutHero__badge" style={{ y: yBadge, opacity: badgeOpacity }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={go ? { opacity: 1, scale: 1 } : undefined}
                    transition={{ duration: 0.75, ease: GLIDE, delay: 0.43 }}
                >
                    {/* The <Link>, not the ring inside it: the ring is one
                        <span> per letter, each turned by its own transform, and
                        an annotation on it would name an element that is a
                        thirtieth of the word. `items.0.*` is ABOUT_LINKS.badge —
                        see @/cms/server/site/aboutUs.

                        Target only, which is the same reading the homepage's
                        identical badge already has (MainIntro). The words are
                        not editable IN PLACE because there is nowhere here to
                        put a caret: `RotatingButton` sets one <span> per letter
                        and turns each by its own `rotate()`, and the sentence is
                        set twice round the ring with a trailing space that the
                        in-place editor trims — so an in-place save shortens the
                        gap between the two passes by a character every time it
                        is taken. The label stays editable in the Studio's own
                        form, where it is one input.

                        The class states where it goes, so nothing downstream has
                        to pick the href apart again — see ui/externalLink. */}
                    <Link
                        {...editableLink(cmsBadge?.docId, { href: "items.0.value" })}
                        href={badgeHref}
                        className={externalClass(badgeHref) || undefined}
                        onClick={handleInsuranceReportingClick}
                        aria-label="Nahlášení pojistného"
                        data-cursor="frame"
                    >
                        <RotatingButton text={badgeText} />
                    </Link>
                </motion.div>
            </motion.div>

            {/* Opens from its top edge, the same direction the title rose
                from, and lands after it — the rule between the two is drawn by
                the time this starts moving. */}
            {/* The box, not the <Image> inside it: the picture and the wash over
                it are the same photograph, so the thing an editor means by
                "this photo" is the box that holds both. */}
            <motion.div
                {...editable(docId, "image", "image")}
                className="AboutHero__photo"
                style={{ y: yPhoto }}
                initial={{ clipPath: "inset(100% 0% 0% 0%)", scale: 1.06 }}
                animate={ground ? { clipPath: "inset(0% 0% 0% 0%)", scale: 1 } : undefined}
                transition={{ duration: 1.13, ease: GLIDE, delay: gate === "go" ? 0.6 : 0 }}
            >
                {/* The <Image> is not replaced by the canvas, it is what the
                    canvas is laid over — and what stays if this browser has no
                    WebGL to give. See GridDistortion. */}
                <GridDistortion imageSrc={photo.src} cellSize={46}>
                    <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill={true}
                        priority={true}
                        quality={90}
                        sizes="(max-width: 820px) 100vw, 45vw"
                        placeholder="blur"
                        blurDataURL="data:image/webp"
                        style={{ objectFit: "cover", objectPosition: "center" }}
                    />
                </GridDistortion>
                <div className="AboutHero__photo__overlay" />
            </motion.div>

            <motion.ul
                className="AboutHero__marks"
                style={{ y: yMarks, x: marksExitX, opacity: marksOpacity }}
            >
                {marks.map(({ Icon, label }, index) => (
                    <li className="AboutHero__mark" key={label}>
                        <Icon className="AboutHero__mark__icon" size={30} aria-hidden="true" />
                        <span
                            {...editable(marksDocId, `items.${index}.label`, "text")}
                            className="AboutHero__mark__label"
                        >
                            {label}
                        </span>
                    </li>
                ))}
            </motion.ul>
            </motion.div>
        </section>
    );
}
