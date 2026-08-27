import { useEffect, useRef, useState } from "react";
import {
    AnimatePresence,
    MotionConfig,
    motion,
    useScroll,
    useSpring,
} from "framer-motion";

import { CookiesSections } from "@/constants/cookiesTerms";
import CookiesModem from "@/components/modems/Cookies";
import CornerButton from "@/components/common/ui/CornerButton";
import { useGlobalContext } from "@/context/LoadProvider";
import { CURTAIN, ENTERS, RISE, group } from "@/components/common/ui/entrance";

// /cookies — the legal page, restyled into the site's own grammar.
//
// The page exists to be read, so the layout is a reading layout: one measured
// column of legal copy hanging from a left vertical rule, each section marked
// the way every numbered thing on this site is marked — an oversized ghost
// numeral over an uppercase light heading (see BenefitJourney, FirstTime).
// Nothing sits in a border-box; hairlines articulate the space instead.
//
// Beside the copy, a sticky index. It is the section tracker the old page
// already had — the same midpoint test, the same ids — redrawn quiet: numbers
// and titles, the active one lit with a small accent square.
//
// At the foot, the page's one action: the preference manager, under its own
// labelled block. The modem itself (@/components/modems/Cookies) is mounted
// exactly as before — same props, same AnimatePresence — and only given an
// overlay shell from this page's stylesheet; its internals are its own.
//
// MotionConfig reducedMotion="user" strips the transforms from every entrance
// for readers who asked for that — things land, near instantly — without
// branching the first render on a media query. The two travelling lights are
// CSS and die under the same preference in styles.scss.

// A rule that draws itself in — scaleX for horizontals, scaleY for verticals —
// on the site's one curve. The origin lives in styles.scss, at the junction
// the line grows out of.
const DRAW_X = {
    hidden: { scaleX: 0 },
    shown: { scaleX: 1, transition: { duration: 1, ease: CURTAIN } },
};

const ord = (i) => String(i + 1).padStart(2, "0");

export default function CookiesContent() {
    const { gate } = useGlobalContext();
    const go = gate === "go";
    const [activeSection, setActiveSection] = useState(CookiesSections[0].id);
    const [isOpen, setIsOpen] = useState(false);
    const sectionRefs = useRef([]);
    const bodyRef = useRef(null);

    // The left rule the sections hang from is also the page's progress: it
    // draws downwards as the reading column goes by, and is done when the
    // column is.
    const { scrollYProgress } = useScroll({
        target: bodyRef,
        offset: ["start 0.7", "end 0.7"],
    });
    const railDraw = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    // The tracker the old page had — the section under the middle of the
    // screen is the active one — with one repair: the active section is the
    // last one whose head has passed the midpoint, so the margins between
    // sections belong to the section above them instead of to nobody.
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;
            let current = CookiesSections[0].id;

            for (let i = 0; i < sectionRefs.current.length; i++) {
                const section = sectionRefs.current[i];
                if (section) {
                    const sectionTop =
                        section.getBoundingClientRect().top + window.scrollY;
                    if (sectionTop <= scrollPosition) {
                        current = CookiesSections[i].id;
                    }
                }
            }

            setActiveSection(current);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Through Lenis when it is there, so the glide is the site's own; native
    // smooth scroll otherwise. Landing a little above the section keeps its
    // numeral clear of the viewport's edge.
    const handleLinkClick = (id) => {
        const section = document.getElementById(id);
        if (!section) return;
        if (typeof window !== "undefined" && window.lenis) {
            window.lenis.scrollTo(section, { offset: -window.innerHeight * 0.16 });
        } else {
            section.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <MotionConfig reducedMotion="user">
            <section className="CookiesContent">
                {/* ── the head ──────────────────────────────────────────── */}
                <motion.header
                    className="CookiesContent__head"
                    variants={group(0.13)}
                    initial="hidden"
                    animate={go ? "shown" : undefined}
                >
                    <motion.p className="CookiesContent__eyebrow" variants={RISE}>
                        <em>§</em> Zásady cookies
                    </motion.p>
                    <motion.h1 className="CookiesContent__title" variants={RISE}>
                        Co jsou cookies
                        <span>a jak je používáme.</span>
                    </motion.h1>
                    <motion.span
                        className="CookiesContent__rule"
                        variants={DRAW_X}
                        aria-hidden="true"
                    />
                    <motion.p className="CookiesContent__lead" variants={RISE}>
                        Zde si můžete nastavit, ke kterým budeme mít přístup.
                    </motion.p>
                </motion.header>

                {/* ── the reading column and its index ──────────────────── */}
                <div className="CookiesContent__body" ref={bodyRef}>
                    <motion.nav
                        className="CookiesContent__index"
                        aria-label="Obsah"
                        variants={group()}
                        initial="hidden"
                        whileInView="shown"
                        viewport={ENTERS}
                    >
                        <div className="CookiesContent__index__inner">
                            <motion.p className="CookiesContent__index__label" variants={RISE}>
                                Obsah
                            </motion.p>
                            <ul>
                                {CookiesSections.map((section, i) => {
                                    const isActive = activeSection === section.id;
                                    return (
                                        <motion.li key={section.id} variants={RISE}>
                                            <a
                                                href={`#${section.id}`}
                                                className={isActive ? "is-active" : undefined}
                                                aria-current={isActive ? "true" : undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleLinkClick(section.id);
                                                }}
                                            >
                                                <span
                                                    className="CookiesContent__index__mark"
                                                    aria-hidden="true"
                                                />
                                                <span className="CookiesContent__index__num">
                                                    {ord(i)}
                                                </span>
                                                <span className="CookiesContent__index__title">
                                                    {section.title}
                                                </span>
                                            </a>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </div>
                    </motion.nav>

                    <div className="CookiesContent__sections">
                        {/* the rail: drawn by the reader's own progress */}
                        <motion.span
                            className="CookiesContent__rail"
                            style={{ scaleY: railDraw }}
                            aria-hidden="true"
                        />

                        {CookiesSections.map((section, i) => (
                            <motion.article
                                key={section.id}
                                id={section.id}
                                className="CookiesContent__section"
                                ref={(el) => (sectionRefs.current[i] = el)}
                                variants={group()}
                                initial="hidden"
                                whileInView="shown"
                                viewport={ENTERS}
                            >
                                <motion.span
                                    className="CookiesContent__section__tick"
                                    variants={DRAW_X}
                                    aria-hidden="true"
                                />
                                <motion.span
                                    className="CookiesContent__section__num"
                                    variants={RISE}
                                    aria-hidden="true"
                                >
                                    {ord(i)}
                                </motion.span>
                                <motion.h2 variants={RISE}>{section.title}</motion.h2>
                                {section.content && (
                                    <motion.p variants={RISE}>{section.content}</motion.p>
                                )}
                            </motion.article>
                        ))}
                    </div>
                </div>

                {/* ── the action ────────────────────────────────────────── */}
                <motion.div
                    className="CookiesContent__manage"
                    variants={group()}
                    initial="hidden"
                    whileInView="shown"
                    viewport={ENTERS}
                >
                    <motion.span
                        className="CookiesContent__manage__rule"
                        variants={DRAW_X}
                        aria-hidden="true"
                    />
                    <motion.p className="CookiesContent__eyebrow" variants={RISE}>
                        <em>§</em> Správa předvoleb
                    </motion.p>
                    <motion.h2 className="CookiesContent__manage__title" variants={RISE}>
                        Chcete si přenastavit vaše cookies?
                    </motion.h2>
                    <motion.div className="CookiesContent__manage__cta" variants={RISE}>
                        <CornerButton onClick={() => setIsOpen(true)}>
                            Nastavit
                        </CornerButton>
                    </motion.div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {isOpen && (
                        <CookiesModem setSettings={setIsOpen} settings={isOpen} />
                    )}
                </AnimatePresence>
            </section>
        </MotionConfig>
    );
}
