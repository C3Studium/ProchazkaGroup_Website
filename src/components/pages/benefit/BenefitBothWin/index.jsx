"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RiArrowDownSLine, RiPhoneLine } from "@remixicon/react";
import TextPressure from "@/components/common/ui/TextPressure";
import { CURTAIN, ENTERS } from "@/components/common/ui/entrance";
import ChooseAdvisor from "@/components/pages/index/ChooseAdvisor";
import { usePhone } from "@/helpers/usePhone";
import { editable } from "@/cms/edit";

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

// Copy comes from the CMS — `benefit-program.otazka` for the doubt and its
// answer, `benefit-program.prihlaseni` for the way in (see cms.config.js).
// These are the words the two sections ship with and what every field falls
// back to on its own, so an empty CMS renders exactly this page.
const DOUBT = {
    // The `<em>` of the eyebrow. The words beside it are a bare text node in the
    // same paragraph and have no element of their own — see the eyebrow below.
    ord: "05",
    eyebrow: "Otázka, kterou si položí každý",
    // TextPressure sets this a character at a time, so the words on screen are
    // markup the component generates rather than a text node anything can
    // annotate. It is edited in the Studio's form.
    question: "Prodávám tím své známé?",
    themLabel: "Ten, koho doporučíte",
    themBody: "Dostane schůzku a plán jako každý náš klient. Nic neplatí a nic si nemusí koupit.",
    youLabel: "Vy, kdo doporučujete",
    youBody: "Poukaz dostanete až ve chvíli, kdy se z doporučení stane klient. Ne za jméno. Za výsledek.",
    both: "Obojí platí zároveň. Jinak by ten program nedával smysl.",
};

const ENROLL = {
    ord: "07",
    eyebrow: "Jak se přihlásit",
    title: "Do programu se nedá přihlásit zvenčí. Je pro naše klienty.",
    clientQ: "Už jste klient?",
    clientBig: "Mám poradce",
    clientCap: "Řekněte si o vstup na příští schůzce",
    newQ: "Ještě ne?",
    newBig: "První schůzka",
    newCap: "Začněte vlastním finančním plánem",
};

/** A CMS string when there is one, the shipped one otherwise. */
const say = (value, shipped) => (value?.trim() ? value.trim() : shipped);

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

export default function BenefitBothWin({ copy = {} }) {
    const doc = copy.docId;
    const said = {
        ord: say(copy.ord, DOUBT.ord),
        eyebrow: say(copy.eyebrow, DOUBT.eyebrow),
        question: say(copy.question, DOUBT.question),
        themLabel: say(copy.themLabel, DOUBT.themLabel),
        themBody: say(copy.themBody, DOUBT.themBody),
        youLabel: say(copy.youLabel, DOUBT.youLabel),
        youBody: say(copy.youBody, DOUBT.youBody),
        both: say(copy.both, DOUBT.both),
    };

    return (
        <section className="BenBothWin">
            {/* 05 — the doubt, on its own stage with air around it */}
            <motion.div
                className="BenBothWin__doubt"
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                {/* The `<em>` carries its own annotation; the words beside it
                    are a bare text node sharing this paragraph with it, so they
                    are `items.0.label` and are edited in the form. The
                    separating space rides INSIDE the expression — as a literal
                    it would be a second text child, and React marks the boundary
                    between two adjacent text children with a `<!-- -->` the
                    markup does not need. */}
                <motion.p className="BenBothWin__eyebrow" variants={riseAt(0)}>
                    <em {...editable(doc, "items.0.lead", "text")}>{said.ord}</em>{` ${said.eyebrow}`}
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
                    <TextPressure text={said.question} size={5.5} />
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
                    <motion.h3 className="BenBothWin__label" variants={riseAt(0.95)} {...editable(doc, "items.1.label", "text")}>{said.themLabel}</motion.h3>
                    <motion.p variants={riseAt(1.05)} {...editable(doc, "items.1.value", "text")}>
                        {said.themBody}
                    </motion.p>
                </motion.div>

                <motion.div className="BenBothWin__side BenBothWin__side--you">
                    <motion.h3 className="BenBothWin__label" variants={riseAt(1.1)} {...editable(doc, "items.2.label", "text")}>{said.youLabel}</motion.h3>
                    <motion.p variants={riseAt(1.2)} {...editable(doc, "items.2.value", "text")}>
                        {said.youBody}
                    </motion.p>
                </motion.div>

                <motion.span
                    className="BenBothWin__rule BenBothWin__rule--answerClose"
                    variants={drawX(1.4, 1.0)}
                />
                <motion.p className="BenBothWin__both" variants={riseAt(1.75)} {...editable(doc, "body", "text")}>
                    {said.both}
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

/** `+420 776 157 476` -> `+420776157476`, which is what a tel: href wants. */
const telHref = (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;

// ── the client's answer, on a phone held upright ──
//
// Ten names in a column with the advisor they choose a screen below them is a
// table of contents with the contents somewhere else: measured at 320×568, rows
// of 53px make 530 of list inside a branch 1031 tall, so a name and the face it
// belongs to could never be on the screen at once.
//
// So on a phone this branch takes the shape the roster already has twice — in
// navbar/body/advisors, where it was worked out, and in pages/aboutUs/Colleagues,
// where it was applied to a page section rather than to a modal. Ten 3:4
// miniatures five across, held back and desaturated at rest, the chosen one at
// full colour, and that person's record underneath at a size worth looking at.
// It is the same ten people; they should not meet three designs for them on one
// site. See styles.scss for the geometry and for what is deliberately different.
//
// The miniature goes through the same optimiser at the same width and quality as
// the other two, so the URL is identical and a phone that has opened the menu or
// read /o-nas draws this sheet with nothing to fetch. A portrait that is not a
// local path is left alone: `/_next/image` refuses a host that is not in
// `remotePatterns`, and one unoptimised request is a better answer than a tile
// with no face in it — these come from the CMS, where the path is an editor's.
const thumb = (src) =>
    (src && src.startsWith("/") ? `/_next/image?url=${encodeURIComponent(src)}&w=384&q=60` : src);

/**
 * The number, as the thing to do.
 *
 * Off a phone it is what it has always been — the line of type this answer sets
 * at 4rem, which is a target a mouse has no trouble with. On a phone it is a
 * button: there is no form in this branch, the whole screen is "choose your
 * person, then ring them", and the note under it says exactly that. So the call
 * is not a distraction from a submit here, it is the submit, and it is drawn
 * with the weight of one.
 *
 * No `aria-label`. The roster labels its own telephone "Zavolat: <jméno>"
 * because there the target is an icon with no words in it; here the button says
 * "Zavolat" and then reads the number out, and a label would replace both with
 * less. Who it rings is the <h3> directly above it, inside the same panel.
 */
function CallLink({ phone, tel }) {
    const number = tel || OFFICE_PHONE;

    return (
        <a
            className={`BenBothWin__reply__phone${phone ? " BenBothWin__mini__call" : ""}`}
            href={telHref(number)}
            data-cursor="frame"
        >
            {phone ? (
                <>
                    <span className="BenBothWin__mini__call__do">
                        <RiPhoneLine size={17} aria-hidden="true" />
                        Zavolat
                    </span>
                    <span className="BenBothWin__mini__call__no">{number}</span>
                </>
            ) : (
                number
            )}
        </a>
    );
}

export function BenefitEnroll({ consultants = [], advisorsCopy = {}, advisorFormCopy = {}, copy = {} }) {
    const doc = copy.docId;
    const said = {
        ord: say(copy.ord, ENROLL.ord),
        eyebrow: say(copy.eyebrow, ENROLL.eyebrow),
        title: say(copy.title, ENROLL.title),
        clientQ: say(copy.clientQ, ENROLL.clientQ),
        clientBig: say(copy.clientBig, ENROLL.clientBig),
        clientCap: say(copy.clientCap, ENROLL.clientCap),
        newQ: say(copy.newQ, ENROLL.newQ),
        newBig: say(copy.newBig, ENROLL.newBig),
        newCap: say(copy.newCap, ENROLL.newCap),
    };

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
    // The chosen consultant, resolved once. The clamp is not optional: `pick` is
    // an index into a list that a re-render can hand back shorter than the one
    // that was tapped. Used by the two controls a phone on its side gets — the
    // picker and the telephone mark — which both need the same person and would
    // otherwise resolve them separately.
    const chosen = consultants.length
        ? consultants[Math.min(pick, consultants.length - 1)]
        : null;
    const canHover = useMedia(FINE);
    // Whether the client's answer is drawn as a sheet of faces rather than as a
    // list of names — see the note above `thumb`. Without `eager`, because this
    // section is server-rendered: the first client render has to agree with
    // markup written where there was no viewport to measure. Nothing is lost by
    // it, either, since the branch it decides is behind a tap on the fork and
    // the effect has run long before anybody gets there.
    const phone = usePhone();
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
                    {/* The eyebrow, on the same terms as the doubt's above. */}
                    <motion.p className="BenBothWin__eyebrow" variants={riseAt(0.75)}>
                        <em {...editable(doc, "items.0.lead", "text")}>{said.ord}</em>{` ${said.eyebrow}`}
                    </motion.p>
                    <motion.h2 variants={riseAt(0.9)} {...editable(doc, "title", "text")}>
                        {said.title}
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
                                    <span className="BenBothWin__forkCard__q" {...editable(doc, "items.1.lead", "text")}>{said.clientQ}</span>
                                    <span className="BenBothWin__forkCard__big" {...editable(doc, "items.1.label", "text")}>{said.clientBig}</span>
                                    <span className="BenBothWin__forkCard__cap" {...editable(doc, "items.1.value", "text")}>
                                        {said.clientCap}
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
                                    <span className="BenBothWin__forkCard__q" {...editable(doc, "items.2.lead", "text")}>{said.newQ}</span>
                                    <span className="BenBothWin__forkCard__big" {...editable(doc, "items.2.label", "text")}>{said.newBig}</span>
                                    <span className="BenBothWin__forkCard__cap" {...editable(doc, "items.2.value", "text")}>
                                        {said.newCap}
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
                                and underlined by a drawn accent.

                                Not annotated, and not fed from the block above
                                either. The first of the two REPRINTS the tile's
                                own words, and a field is written by one element;
                                the second is the switch's own shorter phrasing of
                                the other tile. Both are mounted from component
                                state, so no server render — and therefore no
                                deliberate scan — ever reaches them. */}
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
                                            {/* The same list either way — ten
                                                options in a listbox — and only
                                                what an option SHOWS changes. On
                                                a phone it is a miniature with
                                                its ordinal on it and the name
                                                has moved into the record below,
                                                so the control has to say who it
                                                is some other way; everywhere
                                                else the name is the whole of
                                                what the row is and a label would
                                                only repeat it. */}
                                            {/* The page runs its own smooth
                                                scrolling, and Lenis takes every
                                                wheel and every drag unless an
                                                element asks for it by name. The
                                                list is capped at 95vh and
                                                scrolls (see styles.scss), and
                                                without this that scroll could
                                                not be operated: measured at
                                                1250×677, a wheel over the list
                                                moved it 0px and the page 480.
                                                NOT on a phone, where the same
                                                <ul> is a two-row sheet of faces
                                                that does not scroll — the
                                                attribute there would take the
                                                page's own scroll away from a
                                                thumb resting on a portrait. */}
                                            <ul
                                                className="BenBothWin__mini__list"
                                                role="listbox"
                                                aria-label="Váš poradce"
                                                {...(phone ? {} : { "data-lenis-prevent": "" })}
                                            >
                                                {consultants.map((c, i) => (
                                                    <li key={c.slug || c.name || i}>
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={pick === i}
                                                            aria-label={phone ? c.name : undefined}
                                                            className={`BenBothWin__mini__row${pick === i ? " is-on" : ""}`}
                                                            onClick={() => setPick(i)}
                                                            onPointerEnter={() => canHover && setPick(i)}
                                                            data-cursor="frame"
                                                        >
                                                            {/* A background and not an
                                                                <Image>, so it is the very
                                                                URL the navigation's roster
                                                                and /o-nas ask for — and so
                                                                that on every screen where
                                                                the sheet is not drawn there
                                                                is nothing to fetch. A hidden
                                                                <img> would still be ten
                                                                requests. */}
                                                            {phone ? (
                                                                <>
                                                                    <span
                                                                        className="BenBothWin__mini__face"
                                                                        aria-hidden="true"
                                                                        style={{ backgroundImage: `url(${thumb(c.portrait?.src)})` }}
                                                                    />
                                                                    <span className="BenBothWin__mini__ord" aria-hidden="true">
                                                                        {String(i + 1).padStart(2, "0")}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {c.name}
                                                                    <span className="BenBothWin__mini__sq" aria-hidden="true" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                            {/* The same ten people again, as
                                                the one control a phone lying
                                                down can afford: the OS wheel,
                                                over ten names, in one tap. The
                                                list above needs 663px of a
                                                320px-tall screen; this needs 44,
                                                and it is the choice the homepage
                                                CTA already makes on the same
                                                screen (see index/ChooseAdvisor)
                                                — the same ten people should not
                                                meet a fourth design for them.
                                                Its look is the shared
                                                `pickField`, in
                                                styles/system/_controls.scss.

                                                It writes the same `pick` the
                                                rows write, so the portrait, the
                                                name and the number answer a turn
                                                of the wheel exactly as they
                                                answer a tap on a row.

                                                In the markup at every width and
                                                switched by the stylesheet, the
                                                way the CTA's is: nothing is
                                                worked out at runtime, so there
                                                is no second paint and no flash
                                                of the wrong control — and a
                                                `display: none` control is out of
                                                the accessibility tree as well as
                                                off the screen, so a reader is
                                                never offered the roster twice.

                                                A native <select> rather than a
                                                listbox of our own: it is the only
                                                control that hands a phone its own
                                                picker, and the roles, the focus
                                                trapping and the type-ahead a
                                                hand-rolled one owes are all had
                                                from the platform for nothing. */}
                                            <label className="BenBothWin__mini__pick">
                                                <span className="BenBothWin__mini__pick__label">Váš poradce</span>
                                                <span className="BenBothWin__mini__pick__field">
                                                    <select
                                                        className="BenBothWin__mini__pick__select"
                                                        value={Math.min(pick, consultants.length - 1)}
                                                        onChange={(event) => setPick(Number(event.target.value))}
                                                    >
                                                        {consultants.map((c, i) => (
                                                            <option key={c.slug || c.name || i} value={i}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <RiArrowDownSLine
                                                        className="BenBothWin__mini__pick__chevron"
                                                        size={20}
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            </label>
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
                                                            // The phone condition first, and it is
                                                            // the phone's alone: this box stops
                                                            // being a thumbnail beside a name there
                                                            // and becomes the whole record, 84vw of
                                                            // the screen. The two behind it are
                                                            // untouched, and a landscape phone —
                                                            // which is under 900 on width and keeps
                                                            // the old composition — still reads the
                                                            // 60vw it always did.
                                                            sizes="(max-width: 600px) and (orientation: portrait) 86vw, (max-width: 900px) 60vw, 22vw"
                                                            style={{ objectFit: "cover", objectPosition: "top center" }}
                                                        />
                                                    </div>
                                                ) : null}
                                                {/* The call as a mark, beside
                                                    the face — the CTA's
                                                    `ChooseAdvisor__iconCall`
                                                    doing the same job in this
                                                    section's accent, off the
                                                    shared `callIcon` in
                                                    styles/system/_controls.scss.
                                                    Only a phone on its side ever
                                                    sees it: upright, the record
                                                    below is a full-bleed portrait
                                                    with a full-width bar on its
                                                    floor and there is nothing for
                                                    a second target to improve.

                                                    A separate element and not
                                                    CallLink restyled, for the
                                                    reason the CTA gives: what
                                                    changes is the CONTENT — a
                                                    glyph where the digits were —
                                                    and no rule can swap a text
                                                    node for an SVG.

                                                    Same fallback as CallLink, so
                                                    the two can never point at
                                                    different numbers, and an
                                                    `aria-label` because it prints
                                                    no words at all: it states the
                                                    number, so a reader hears what
                                                    is about to be rung. */}
                                                <a
                                                    href={telHref(chosen?.phone || OFFICE_PHONE)}
                                                    className="cornerButton BenBothWin__mini__iconCall"
                                                    aria-label={`Zavolat na ${chosen?.phone || OFFICE_PHONE}`}
                                                    data-cursor="frame"
                                                >
                                                    <span className="corner corner--tl" />
                                                    <span className="corner corner--tr" />
                                                    <span className="corner corner--bl" />
                                                    <span className="corner corner--br" />
                                                    <RiPhoneLine size={22} aria-hidden="true" />
                                                </a>
                                                <p className="BenBothWin__mini__eyebrow">Váš poradce</p>
                                                <h3 className="BenBothWin__mini__name">
                                                    {consultants[Math.min(pick, consultants.length - 1)]?.name}
                                                </h3>
                                                {/* Source order is the wide screen's: the number
                                                    reads as the answer to the name and the note
                                                    closes the panel. On a phone the record lies on
                                                    the portrait and the button is the floor of it,
                                                    so the note goes above — done with `order` in
                                                    the stylesheet rather than with a second
                                                    subtree, because it is the same four things in
                                                    a different arrangement. */}
                                                <CallLink
                                                    phone={phone}
                                                    tel={consultants[Math.min(pick, consultants.length - 1)]?.phone}
                                                />
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
                                            {/* The same button, and it has to be: with nobody
                                                published this IS the answer, so it cannot be the
                                                one place on a phone where the number goes back to
                                                being a line of type. */}
                                            <CallLink phone={phone} tel={OFFICE_PHONE} />
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
