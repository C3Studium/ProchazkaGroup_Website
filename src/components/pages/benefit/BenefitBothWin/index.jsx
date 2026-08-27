"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TextPressure from "@/components/common/ui/TextPressure";
import { CURTAIN, ENTERS } from "@/components/common/ui/entrance";
import ChooseAdvisor from "@/components/pages/index/ChooseAdvisor";

// 05 — the doubt, and 06 — how to get in. Two movements of one section, built
// from the grammars this site already speaks rather than from panels:
//
// The question is the page's real objection — "Prodávám tím své známé?" — and
// it gets the treatment the site reserves for a headline that answers the
// hand: TextPressure, the patička's and the reviews hero's pressure-sensitive
// word. The reader pushes the doubt around; it thickens under their pointer
// and relaxes when they leave. Without a pointer it simply stands light.
//
// The answer is set in the homepage's structural grammar (FirstTime): no
// boxes, hairline rules that are grid items and draw themselves in — each
// line arriving before the rule that grows out of its junction. A horizontal
// rule draws left to right; the divider drops from its midpoint; the two
// columns rise once their rules exist; a closing rule grows outward from the
// divider's foot and carries the verdict under both columns at once.
//
// The vertical axis then continues down — the WhoWeAre handoff, kept inside
// one component — into 06, where the same drawn-rule grammar splits the two
// ways in: two tiles that trade the row under the pointer, each a button.

// Rules draw, words rise — each on its own beat of a shared clock, so the
// sequence reads in the order the lines cause each other.
const drawX = (delay, duration = 0.95) => ({
    hidden: { scaleX: 0 },
    shown: { scaleX: 1, transition: { duration, ease: CURTAIN, delay } },
});

const drawY = (delay, duration = 0.8) => ({
    hidden: { scaleY: 0 },
    shown: { scaleY: 1, transition: { duration, ease: CURTAIN, delay } },
});

const riseAt = (delay) => ({
    hidden: { opacity: 0, y: 24 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: CURTAIN, delay } },
});

// The question is uncovered bottom-up, the way the reviews hero uncovers its
// word — a pressure word cannot arrive from anywhere, it can only appear.
const UNCOVER = {
    hidden: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
    shown: {
        opacity: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        transition: { duration: 1.1, ease: CURTAIN, delay: 0.2 },
    },
};

// One media query, read the hydration-safe way: false on the server and on the
// first client render, then the truth. Every branch below is written so that
// the desktop answer is also a legal phone answer for one frame — nothing is
// hidden or measured off it — so the correction is invisible.
function useMedia(query) {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const sync = () => setOn(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, [query]);
    return on;
}

// A pointer that can hover. TWIN of `@include fine-pointer` in styles.scss:
// every hover affordance there is gated by the same test, because a tap fires
// pointerenter with no pointerleave and a hover-driven state latches forever.
const FINE = "(hover: hover) and (pointer: fine)";

export default function BenefitBothWin() {
    return (
        <section className="BenBothWin">
            {/* 05 — the doubt, on its own stage with air around it */}
            <motion.div
                className="BenBothWin__doubt"
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.p className="BenBothWin__eyebrow" variants={riseAt(0)}>
                    <em>05</em> Otázka, kterou si položí každý
                </motion.p>
                {/* One line at every width, deliberately. Breaking it in two on
                    a phone and setting each half larger reads better and was
                    built — and then taken out again: TextPressure derives its
                    size from window.innerWidth at mount, and re-mounting it on
                    a media change means re-measuring at whatever the layout is
                    doing at that instant. This page briefly widens to over
                    1100px while the reviews belt lays its track out, and the
                    word came back sized for a viewport three times the phone's
                    and stayed that way. A wordmark that never wraps must be
                    measured once, on a layout that has settled. */}
                <motion.div className="BenBothWin__question" variants={UNCOVER}>
                    <TextPressure text="Prodávám tím své známé?" size={5.5} />
                </motion.div>
            </motion.div>

            {/* The answer: two truths divided by one drawn line, then a verdict
                that holds under both. Rules first, words after their rule. */}
            <motion.div
                className="BenBothWin__answer"
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.span
                    className="BenBothWin__rule BenBothWin__rule--answerTop"
                    variants={drawX(0, 1.05)}
                />
                <motion.span
                    className="BenBothWin__rule BenBothWin__rule--answerDivider"
                    variants={drawY(0.6, 0.85)}
                />

                <motion.div className="BenBothWin__side BenBothWin__side--them">
                    <motion.h3 className="BenBothWin__label" variants={riseAt(0.95)}>Ten, koho doporučíte</motion.h3>
                    <motion.p variants={riseAt(1.05)}>
                        Dostane schůzku a plán jako každý náš klient.
                        Nic neplatí a nic si nemusí koupit.
                    </motion.p>
                </motion.div>

                <motion.div className="BenBothWin__side BenBothWin__side--you">
                    <motion.h3 className="BenBothWin__label" variants={riseAt(1.1)}>Vy, kdo doporučujete</motion.h3>
                    <motion.p variants={riseAt(1.2)}>
                        Poukaz dostanete až ve chvíli, kdy se z doporučení
                        stane klient. Ne za jméno. Za výsledek.
                    </motion.p>
                </motion.div>

                <motion.span
                    className="BenBothWin__rule BenBothWin__rule--answerClose"
                    variants={drawX(1.4, 1.0)}
                />
                <motion.p className="BenBothWin__both" variants={riseAt(1.75)}>
                    Obojí platí zároveň. Jinak by ten program nedával smysl.
                </motion.p>
            </motion.div>

        </section>
    );
}

// The way in, as its own mount. It was the second movement of this file's
// section until the reviews moved between them: the page now reads doubt →
// what people say → how to get in, and the join travels with the invitation
// rather than with the question. Same classes, same stylesheet, renumbered.
// The office line, as ChooseAdvisor states it — mirrored here rather than
// imported so the small answer does not drag the whole section in for one
// constant.
const OFFICE_PHONE = "+420 776 157 476";

// The fork's physics — the navbar wall's numbers, two members wide.
const FORK_SPRING = { type: "spring", stiffness: 150, damping: 26, restDelta: 0.001 };
const FORK_GROW = 1.35;
const FORK_FLOOR = 0.72;

export function BenefitEnroll({ consultants = [], advisorsCopy = {}, advisorFormCopy = {} }) {
    // The two cards are a QUESTION now. Answering one replaces them with the
    // thing that actually helps that person: a client gets the phone line and
    // one sentence — no form to fill for somebody who already has an advisor —
    // and everyone else gets the homepage's whole advisor block, docked onto
    // this section's axis by the same drawn rules. "Zpět" is a word, the way
    // the navbar's roster goes back — not a dismissal.
    const [path, setPath] = useState(null);
    // The client's compact picker: which advisor is chosen. First by default —
    // a list nobody has touched should already be showing somebody real. On a
    // pointer the panel follows the hand — hovering a row is already the
    // preview, the navbar roster's manner — and a click is the same choice
    // made explicit (and the only way in for touch and keyboard).
    const [pick, setPick] = useState(0);
    const canHover = useMedia(FINE);
    // Which card is being reached for: the hovered one takes room, the other
    // gives exactly that up — the navbar wall two members wide.
    const [reach, setReach] = useState(-1);
    const grown = FORK_GROW;
    const shares =
        reach < 0
            ? [1, 1]
            : reach === 0
              ? [grown, 2 - grown < FORK_FLOOR ? FORK_FLOOR : 2 - grown]
              : [2 - grown < FORK_FLOOR ? FORK_FLOOR : 2 - grown, grown];

    return (
        <section className="BenBothWin BenBothWin--enroll" aria-label="Jak se přihlásit">
            {/* 07 — the way in. The vertical axis carries on down out of the
                answer's junction; the way WhoWeAre hands its connector to
                FirstTime, held here inside one component. */}
            <motion.div
                className="BenBothWin__join"
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.span
                    className="BenBothWin__rule BenBothWin__rule--connector"
                    variants={drawY(0, 0.65)}
                />
                <motion.span
                    className="BenBothWin__rule BenBothWin__rule--joinTop"
                    variants={drawX(0.55, 1.0)}
                />

                <motion.div className="BenBothWin__joinHead">
                    <motion.p className="BenBothWin__eyebrow" variants={riseAt(0.75)}>
                        <em>07</em> Jak se přihlásit
                    </motion.p>
                    <motion.h2 variants={riseAt(0.9)}>
                        Do programu se nedá přihlásit zvenčí.
                        Je pro naše klienty.
                    </motion.h2>
                </motion.div>

                <motion.span
                    className="BenBothWin__rule BenBothWin__rule--joinMid"
                    variants={drawX(1.15, 1.0)}
                />
                {/* The divider belongs to the QUESTION — two paths, one line
                    between them. Whichever answer opens is one thing, and the
                    axis it needs is its own short drop, not a rule through the
                    middle of its words. */}
                {path === null ? (
                    <motion.span
                        className="BenBothWin__rule BenBothWin__rule--joinDivider"
                        variants={drawY(1.65, 0.85)}
                    />
                ) : null}

                <AnimatePresence mode="wait" initial={false}>
                    {path === null ? (
                        <motion.div
                            key="fork"
                            className="BenBothWin__fork"
                            onPointerLeave={() => setReach(-1)}
                            exit={{ opacity: 0, y: -14, transition: { duration: 0.3, ease: CURTAIN } }}
                        >
                            {/* Two tiles in the offer page's clothing — hairline
                                frames sharing one edge, a big statement and a
                                caps label — with the navbar wall's trade under
                                the pointer. The whole tile is the button. */}
                            <motion.button
                                type="button"
                                className="BenBothWin__forkCard"
                                style={{ flexBasis: 0 }}
                                animate={{ flexGrow: shares[0] }}
                                transition={FORK_SPRING}
                                onPointerEnter={() => canHover && setReach(0)}
                                onClick={() => setPath("client")}
                                data-cursor="frame"
                                data-cursor-label="Vybrat"
                            >
                                <motion.span
                                    className="BenBothWin__forkCard__body"
                                    animate={{ scale: reach === 0 ? 1.08 : 1 }}
                                    transition={FORK_SPRING}
                                >
                                    <span className="BenBothWin__forkCard__q">Už jste klient?</span>
                                    <span className="BenBothWin__forkCard__big">Mám poradce</span>
                                    <span className="BenBothWin__forkCard__cap">
                                        Řekněte si o vstup na příští schůzce
                                    </span>
                                    {/* `data-cursor-label` says "Vybrat" inside
                                        the ring the custom cursor draws, and a
                                        thumb never sees either. On a coarse
                                        pointer the word is printed instead, so
                                        the tile still says it is a choice. */}
                                    <span className="BenBothWin__forkCard__tap" aria-hidden="true">
                                        Vybrat
                                    </span>
                                </motion.span>
                            </motion.button>

                            <motion.button
                                type="button"
                                className="BenBothWin__forkCard"
                                style={{ flexBasis: 0 }}
                                animate={{ flexGrow: shares[1] }}
                                transition={FORK_SPRING}
                                onPointerEnter={() => canHover && setReach(1)}
                                onClick={() => setPath("new")}
                                data-cursor="frame"
                                data-cursor-label="Vybrat"
                            >
                                <motion.span
                                    className="BenBothWin__forkCard__body"
                                    animate={{ scale: reach === 1 ? 1.08 : 1 }}
                                    transition={FORK_SPRING}
                                >
                                    <span className="BenBothWin__forkCard__q">Ještě ne?</span>
                                    <span className="BenBothWin__forkCard__big">První schůzka</span>
                                    <span className="BenBothWin__forkCard__cap">
                                        Začněte vlastním finančním plánem
                                    </span>
                                    {/* `data-cursor-label` says "Vybrat" inside
                                        the ring the custom cursor draws, and a
                                        thumb never sees either. On a coarse
                                        pointer the word is printed instead, so
                                        the tile still says it is a choice. */}
                                    <span className="BenBothWin__forkCard__tap" aria-hidden="true">
                                        Vybrat
                                    </span>
                                </motion.span>
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="answers"
                            className="BenBothWin__reply"
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: CURTAIN } }}
                            exit={{ opacity: 0, transition: { duration: 0.25 } }}
                        >
                            <motion.span
                                className="BenBothWin__rule BenBothWin__rule--replyDrop"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1, transition: { duration: 0.7, ease: CURTAIN } }}
                            />

                            {/* The choice stays present as a switch — the QnA
                                block's gesture in this section's clothing: two
                                caps words on one hairline, the active one lit
                                and underlined by a drawn accent. */}
                            <div className="BenBothWin__switch" role="tablist" aria-label="Jak se přihlásit">
                                {[
                                    ["client", "Mám poradce"],
                                    ["new", "Ještě nemám"],
                                ].map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={path === key}
                                        className={`BenBothWin__switch__opt${path === key ? " is-on" : ""}`}
                                        onClick={() => setPath(key)}
                                        data-cursor="frame"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {path === "client" ? (
                                <div className="BenBothWin__mini">
                                    {/* The section's axis, carried on: the
                                        connector above runs on the content's
                                        centre line, the reply's drop lands on
                                        the switch, and this spine takes it
                                        down between the list and the chosen
                                        advisor. A node marks the junction —
                                        the same square the page's joins use. */}
                                    <motion.span
                                        className="BenBothWin__mini__spine"
                                        initial={{ scaleY: 0 }}
                                        animate={{ scaleY: 1, transition: { duration: 0.9, ease: CURTAIN, delay: 0.25 } }}
                                        aria-hidden="true"
                                    />
                                    <span className="BenBothWin__mini__node" aria-hidden="true" />
                                    <motion.span
                                        className="BenBothWin__mini__topline"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1, transition: { duration: 0.9, ease: CURTAIN, delay: 0.4 } }}
                                        aria-hidden="true"
                                    />
                                    {(consultants.length ? consultants : null) ? (
                                        <>
                                            <ul className="BenBothWin__mini__list" role="listbox" aria-label="Váš poradce">
                                                {consultants.map((c, i) => (
                                                    <li key={c.slug || c.name || i}>
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={pick === i}
                                                            className={`BenBothWin__mini__row${pick === i ? " is-on" : ""}`}
                                                            onClick={() => setPick(i)}
                                                            onPointerEnter={() => canHover && setPick(i)}
                                                            data-cursor="frame"
                                                        >
                                                            {c.name}
                                                            <span className="BenBothWin__mini__sq" aria-hidden="true" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="BenBothWin__mini__who">
                                                {/* The consultant's portrait, from the same
                                                    Studio record the classic CTA reads — the
                                                    first of the consultant's two photos, a
                                                    cutout on white. */}
                                                {consultants[Math.min(pick, consultants.length - 1)]?.portrait?.src ? (
                                                    <div className="BenBothWin__mini__photo">
                                                        <Image
                                                            src={consultants[Math.min(pick, consultants.length - 1)].portrait.src}
                                                            alt={consultants[Math.min(pick, consultants.length - 1)].portrait.alt
                                                                || consultants[Math.min(pick, consultants.length - 1)].name
                                                                || ""}
                                                            fill
                                                            sizes="(max-width: 900px) 60vw, 22vw"
                                                            style={{ objectFit: "cover", objectPosition: "top center" }}
                                                        />
                                                    </div>
                                                ) : null}
                                                <p className="BenBothWin__mini__eyebrow">Váš poradce</p>
                                                <h3 className="BenBothWin__mini__name">
                                                    {consultants[Math.min(pick, consultants.length - 1)]?.name}
                                                </h3>
                                                <a
                                                    className="BenBothWin__reply__phone"
                                                    href={`tel:${(consultants[Math.min(pick, consultants.length - 1)]?.phone || OFFICE_PHONE).replace(/[^\d+]/g, "")}`}
                                                    data-cursor="frame"
                                                >
                                                    {consultants[Math.min(pick, consultants.length - 1)]?.phone || OFFICE_PHONE}
                                                </a>
                                                <p className="BenBothWin__mini__note">
                                                    Řekněte si o vstup na příští schůzce — nebo
                                                    zavolejte rovnou.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        // No consultants published: the office
                                        // line stands in, so the answer never
                                        // renders empty.
                                        <div className="BenBothWin__mini__who BenBothWin__mini__who--lone">
                                            <p className="BenBothWin__reply__note">
                                                Řekněte si o vstup na příští schůzce. A jestli
                                                nechcete čekat:
                                            </p>
                                            <a
                                                className="BenBothWin__reply__phone"
                                                href={`tel:${OFFICE_PHONE.replace(/[^\d+]/g, "")}`}
                                                data-cursor="frame"
                                            >
                                                {OFFICE_PHONE}
                                            </a>
                                            <p className="BenBothWin__reply__hours">Po–Pá, 8–16</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="BenBothWin__ctaDock">
                                    <ChooseAdvisor
                                        consultants={consultants}
                                        copy={advisorsCopy}
                                        formCopy={advisorFormCopy}
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </section>
    );
}
