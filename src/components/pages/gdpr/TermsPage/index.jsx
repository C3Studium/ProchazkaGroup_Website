"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { PrivacySections } from "@/constants/cookiesTerms";
import { CURTAIN, ENTERS, RISE, group } from "@/components/common/ui/entrance";
import { useGlobalContext } from "@/context/LoadProvider";

// The privacy page, restated in the site's own grammar: dark ground, open
// layout, hairlines that articulate rather than enclose. Every word of the
// legal text still comes from PrivacySections — this file owns none of it —
// and every section keeps the id it always had, so old #anchors keep landing.
//
// The shape is the BenefitJourney / FirstTime one: an oversized ghost numeral
// marks each section, ONE vertical spine stands at the content column's left
// edge and every section's baseline grows out of it as the section enters.
// The sticky index on the left tracks reading position; the active row is lit
// by a small accent square — the page's one accent, shared only with the
// mailto links inside the legal text itself.
//
// Small screens cannot hold that sidebar. Stacked, the index becomes a
// disclosure at the head of the page: one tappable row that names the section
// you are in, opening onto the full nine. See STACKED_MQ below and the
// `stacked` mixin in styles.scss — the two have to say the same thing.

const ord = (i) => String(i + 1).padStart(2, "0");

// THE JS TWIN of `@mixin stacked` in styles.scss. Both must be changed
// together or the layout and the behaviour disagree.
//
// The height arm is not decoration. A 932×430 phone in landscape clears 900px
// on width while having less viewport height than the index is tall, so a
// width-only gate left it on the desktop composition with a 300px sidebar
// filling the screen and the legal text squeezed into 427px beside it.
const STACKED_MQ = "(max-width: 899.98px), (max-height: 560px)";

// The legal text mentions two addresses (gdpr@ / dpo@prochazkagroup.cz). They
// were dead words in the old rendering; here they become the mailto links a
// reader expects, without a single character of the text changing.
const EMAIL_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

const linkify = (text) =>
    text.split(EMAIL_RE).map((part, i) =>
        i % 2 === 1 ? (
            <a key={i} href={`mailto:${part}`}>
                {part}
            </a>
        ) : (
            part
        ),
    );

export default function TermsContent() {
    const { gate } = useGlobalContext();
    const go = gate === "go";
    const [activeSection, setActiveSection] = useState(PrivacySections[0].id);
    const sectionRefs = useRef([]);

    // Reduced motion, read the way this codebase always reads media queries:
    // state starts false and flips in an effect, so the server render and the
    // first client render agree. Never branched on matchMedia during render.
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const read = () => setReduce(mq.matches);
        read();
        mq.addEventListener("change", read);
        return () => mq.removeEventListener("change", read);
    }, []);

    // The stacking gate, read the same way. `stacked` never decides what is
    // painted — the stylesheet owns that, so nothing can be left invisible if
    // the two ever drift — only what a tap on an index row has to do.
    const [stacked, setStacked] = useState(false);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(STACKED_MQ);
        const read = () => {
            setStacked(mq.matches);
            // Leaving the stacked layout, the disclosure's state is
            // meaningless — the list is a sidebar again and always open.
            if (!mq.matches) setOpen(false);
        };
        read();
        mq.addEventListener("change", read);
        return () => mq.removeEventListener("change", read);
    }, []);

    // Entrances, or their near-instant stand-ins. The reduced variants still
    // travel to the same finished state — opacity 1, y 0, scale 1 — so a
    // preference that flips mid-session leaves nothing stranded half-drawn.
    const rise = reduce
        ? { hidden: { opacity: 0 }, shown: { opacity: 1, y: 0, transition: { duration: 0.01 } } }
        : RISE;
    const drawX = (delay = 0) =>
        reduce
            ? { hidden: { opacity: 0 }, shown: { opacity: 1, scaleX: 1, transition: { duration: 0.01 } } }
            : {
                  hidden: { scaleX: 0 },
                  shown: { scaleX: 1, transition: { duration: 1.1, ease: CURTAIN, delay } },
              };
    const drawY = reduce
        ? { hidden: { opacity: 0 }, shown: { opacity: 1, scaleY: 1, transition: { duration: 0.01 } } }
        : {
              hidden: { scaleY: 0 },
              shown: { scaleY: 1, transition: { duration: 1.6, ease: CURTAIN, delay: 0.15 } },
          };

    // Which section the reader is in: the last one whose top has passed the
    // probe line, a little above the viewport's middle so it agrees with
    // where the index scrolls a clicked section to. "Last whose top passed"
    // rather than "the one straddling", so a probe standing past the final
    // section — in the footer — keeps the final section lit instead of
    // letting go. Lenis drives the native scroll, so window's own scroll
    // event is the right thing to listen to.
    useEffect(() => {
        const handleScroll = () => {
            const probe = window.scrollY + window.innerHeight * 0.35;
            let current = PrivacySections[0].id;
            for (let i = 0; i < sectionRefs.current.length; i++) {
                const el = sectionRefs.current[i];
                if (!el) continue;
                const top = el.getBoundingClientRect().top + window.scrollY;
                if (top <= probe) current = PrivacySections[i].id;
            }
            setActiveSection(current);
        };
        window.addEventListener("scroll", handleScroll);
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Index clicks ask Lenis, because Lenis owns the scroll; the plain
    // href="#id" underneath is what a middle click and no-JS get.
    //
    // The landing point has to clear the fixed navigation, which is ~80px tall
    // at every size. A share of the viewport alone does not: 22% of a 390px
    // landscape phone is 86px, and the heading arrives touching the bar.
    // Where a heading sits in the page, in layout terms. Not
    // getBoundingClientRect: a section that has not entered yet is still held
    // 24px down by its entrance transform, and a rect includes that, so every
    // jump to a section below the fold overshot by exactly the height of the
    // rise it was about to perform. offsetTop is the position the element will
    // have once it has arrived, which is the one being aimed at.
    const layoutTop = (el) => {
        let y = 0;
        for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
        return y;
    };

    // `shrink` is what the page is about to lose ABOVE the target and has not
    // lost yet — see the disclosure below.
    const scrollToId = (id, shrink = 0) => {
        const el = document.getElementById(id);
        if (!el) return;
        const inset = Math.min(Math.max(window.innerHeight * 0.22, 108), 240);
        const top = layoutTop(el) - inset - shrink;
        if (window.lenis) window.lenis.scrollTo(Math.max(0, top), { duration: 1.2 });
        else window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };

    // Stacked, the tap has to close the disclosure AND scroll — and closing it
    // removes some four hundred pixels from above the sections, so a target
    // measured first would land that far short. The scroll is therefore held
    // until the layout that follows the close has been committed, which is
    // exactly what useLayoutEffect is for. The counter is what lets the same
    // row be tapped twice in a row.
    const revealRef = useRef(null);
    const [pending, setPending] = useState(null);
    useLayoutEffect(() => {
        if (!pending) return;
        // The list is still its open height at this instant — the collapse is
        // a 0.45s transition that has not run a frame yet — so the target has
        // to be corrected by exactly what is about to disappear from above it.
        // Measured rather than assumed: it is nine rows of a variable-length
        // list, and lenis is given an absolute position it will keep animating
        // towards while the page shortens underneath it.
        const shrink = revealRef.current ? revealRef.current.getBoundingClientRect().height : 0;
        scrollToId(pending.id, shrink);
        setPending(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pending]);

    const goTo = (id) => {
        if (stacked && open) {
            setOpen(false);
            setPending({ id, n: (pending?.n ?? 0) + 1 });
            return;
        }
        scrollToId(id);
    };

    const activeTitle =
        PrivacySections.find((s) => s.id === activeSection)?.title ?? PrivacySections[0].title;

    return (
        <section className="TermsPage">
            {/* ── the head: the old cover's words, set in the site's type ── */}
            <motion.header
                className="TermsPage__hero"
                variants={group(0.1)}
                initial="hidden"
                animate={go ? "shown" : undefined}
            >
                <motion.p className="TermsPage__eyebrow" variants={rise}>
                    <em>GDPR</em> Ochrana soukromí
                </motion.p>
                <motion.h1 className="TermsPage__title" variants={rise}>
                    <span>Vše o ochraně,</span>
                    <span>použití vašich údajů</span>
                    <span>a informací.</span>
                </motion.h1>
                <motion.span className="TermsPage__rule" variants={drawX(0.08)} aria-hidden="true" />
                <motion.p className="TermsPage__lead" variants={rise}>
                    Detaily a všechny podrobné informace
                </motion.p>
            </motion.header>

            <div className="TermsPage__layout">
                {/* ── the index: sticky beside the text, tracking it ── */}
                <nav
                    className={`TermsPage__index${open ? " is-open" : ""}`}
                    aria-label="Obsah"
                >
                    <motion.div
                        className="TermsPage__index__inner"
                        variants={group(0.1)}
                        initial="hidden"
                        whileInView="shown"
                        viewport={ENTERS}
                    >
                        <motion.p className="TermsPage__index__label" variants={rise}>
                            Obsah
                        </motion.p>

                        {/* Stacked only — the stylesheet hides it beside the
                            sidebar. It names the section the reader is in, so
                            the tracking survives the fold. */}
                        <motion.button
                            type="button"
                            className="TermsPage__index__toggle"
                            variants={rise}
                            aria-expanded={open}
                            aria-controls="TermsPage-index-list"
                            onClick={() => setOpen((o) => !o)}
                        >
                            <span className="TermsPage__index__toggle__label">Obsah</span>
                            <span className="TermsPage__index__toggle__now">{activeTitle}</span>
                            <span className="TermsPage__index__toggle__mark" aria-hidden="true" />
                        </motion.button>

                        <div className="TermsPage__index__reveal" ref={revealRef}>
                            <ol className="TermsPage__index__list" id="TermsPage-index-list">
                                {PrivacySections.map((section, i) => (
                                    <motion.li key={section.id} variants={rise}>
                                        <a
                                            href={`#${section.id}`}
                                            className={activeSection === section.id ? "is-active" : ""}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                goTo(section.id);
                                            }}
                                        >
                                            <span className="TermsPage__index__square" aria-hidden="true" />
                                            <span className="TermsPage__index__n">{ord(i)}</span>
                                            <span className="TermsPage__index__t">{section.title}</span>
                                        </a>
                                    </motion.li>
                                ))}
                            </ol>
                        </div>
                    </motion.div>
                </nav>

                {/* ── the sections, hanging from one vertical spine ── */}
                <div className="TermsPage__sections">
                    <motion.span
                        className="TermsPage__spine"
                        variants={drawY}
                        initial="hidden"
                        whileInView="shown"
                        viewport={{ once: true, amount: 0 }}
                        aria-hidden="true"
                    />

                    {PrivacySections.map((section, i) => (
                        <motion.article
                            key={section.id}
                            className="TermsPage__section"
                            ref={(el) => (sectionRefs.current[i] = el)}
                            variants={group()}
                            initial="hidden"
                            whileInView="shown"
                            viewport={ENTERS}
                        >
                            <motion.span className="TermsPage__ord" variants={rise} aria-hidden="true">
                                {ord(i)}
                            </motion.span>
                            <motion.h2 id={section.id} variants={rise}>
                                {section.title}
                            </motion.h2>
                            {section.content ? (
                                <motion.p className="TermsPage__body" variants={rise}>
                                    {linkify(section.content)}
                                </motion.p>
                            ) : null}
                            {/* The section's one rule: its baseline, grown out
                                of the spine as the section arrives. */}
                            <motion.span
                                className="TermsPage__baseline"
                                variants={drawX(0.25)}
                                aria-hidden="true"
                            />
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
}
