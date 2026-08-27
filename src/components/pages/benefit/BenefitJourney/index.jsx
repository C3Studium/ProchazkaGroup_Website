"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import { CURTAIN, ENTERS, PHOTO, RISE, group } from "@/components/common/ui/entrance";

// 02 — Jak to funguje.
//
// Three steps, three landscape rows, read downwards in the homepage's open
// grammar: nothing sits in a border-box. Each row is a photograph uncovered
// without a frame, the words beside it, an oversized ghost numeral over the
// copy, and ONE baseline hairline under the row that draws itself in from the
// copy's side — the rules articulate the space, they never enclose it.
//
// Between the rows, the WhoWeAre handoff: a single straight vertical hairline
// standing at the exact x where the next row's baseline will start its draw.
// Row one's baseline runs out to that edge, the vertical drops through the
// gap, the next baseline grows back out of the same x — one thread, and the
// reason three steps this far apart still read as one journey. The programme
// cannot be entered at step two, and the thread says so.
//
// Nothing here is pinned and nothing follows the scroll except the drifts.
// Each row arrives once, the way every section on this site arrives — see
// entrance.js — and is then still for as long as anyone wants to read it.

const STEPS = [
    {
        id: "klient",
        n: "02.01",
        label: "Vstupní podmínka",
        // Deliberately blunt, and deliberately first. Every softer wording of
        // this reads as a preference rather than a condition, and somebody
        // finds out the truth only once they have brought us a name.
        title: "Staňte se klientem.",
        body: "Do programu se nedá přihlásit zvenčí. První krok proto není doporučení, ale vaše vlastní schůzka a váš vlastní finanční plán.",
        note: "Říkáme to rovnou, ať to nikoho nepřekvapí až u odměny.",
        photo: {
            src: "/assets/backgrounds/deskWork_2000.webp",
            alt: "Poradce Procházka Group při práci nad finančním plánem",
            position: "center",
        },
    },
    {
        id: "doporuceni",
        n: "02.02",
        label: "Doporučení",
        title: "Doporučte někoho, komu to pomůže.",
        body: "Nejde o počty. Jde o jednoho člověka, o kterém víte, že řeší hypotéku, pojištění nebo úspory, které stojí na místě.",
        note: "Doporučení, ze kterého dotyčný nic nemá, nechceme. Nemá cenu pro něj ani pro vás.",
        photo: {
            src: "/assets/backgrounds/onPhone_2000.webp",
            alt: "Klientka Procházka Group telefonuje",
            position: "center",
        },
    },
    {
        id: "odmena",
        n: "02.03",
        label: "Naše práce",
        title: "Zbytek je naše práce.",
        body: "Ozveme se mu, sejdeme se s ním a odvedeme stejnou práci jako u vás. Když se stane naším klientem, odměnu dostanete vy.",
        note: "Poukaz z našeho žebříčku odměn. Žádná hotovost, žádné provize.",
        photo: {
            src: "/assets/backgrounds/callBGShelf.webp",
            alt: "Poradce Procházka Group telefonuje v kanceláři",
            position: "center 35%",
        },
    },
];

// How each row stands: how tall in screens, which side its photograph is on,
// how much of the row the photograph takes — deliberately unlike each other,
// a run of identical bands is a spreadsheet.
const PLAN = [
    { h: 0.62, side: "right", photo: 0.57 },
    { h: 0.56, side: "left", photo: 0.53 },
    { h: 0.62, side: "right", photo: 0.59 },
];

// Which side a row's words stand on — the opposite of its photograph, and the
// side its baseline draws from.
const copySide = (plan) => (plan.side === "right" ? "left" : "right");

export default function BenefitJourney() {
    return (
        <section className="BenefitJourney">
            <motion.header
                className="BenefitJourney__head"
                variants={group()}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.p className="BenefitJourney__eyebrow" variants={RISE}>
                    <em>02</em> Jak to funguje
                </motion.p>
                <motion.h2 className="BenefitJourney__title" variants={RISE}>
                    Tři kroky
                </motion.h2>
                <motion.span
                    className="BenefitJourney__rule"
                    variants={{
                        hidden: { scaleX: 0 },
                        shown: { scaleX: 1, transition: { duration: 1, ease: CURTAIN } },
                    }}
                    aria-hidden="true"
                />
                <motion.p className="BenefitJourney__lead" variants={RISE}>
                    Program má tři kroky a jdou v tomhle pořadí — žádný se nedá přeskočit.
                </motion.p>
            </motion.header>

            {STEPS.map((step, i) => (
                <Row
                    key={step.id}
                    step={step}
                    ord={String(i + 1).padStart(2, "0")}
                    plan={PLAN[i]}
                    // The vertical thread through the gap below this row stands
                    // at the x the NEXT row's baseline draws from. No gap after
                    // the last row, so no thread.
                    drop={i < PLAN.length - 1 ? copySide(PLAN[i + 1]) : null}
                />
            ))}
        </section>
    );
}

// One step, unboxed: the photograph on one side, the words on the other under
// an oversized ghost numeral, and one hairline under the whole row growing out
// of the copy's edge — the only line the row owns.
function Row({ step, ord, plan, drop }) {
    // The picture drifts inside its own crop as the row goes by — the crop
    // does not move, the words barely do, and nothing reflows. It only moves
    // while the page does, so a reader who has stopped is looking at
    // something that has stopped.
    const box = useRef(null);
    const { scrollYProgress } = useScroll({
        target: box,
        offset: ["start end", "end start"],
    });
    const drift = useSpring(scrollYProgress, {
        stiffness: 90,
        damping: 26,
        restDelta: 0.001,
    });
    // Translate and scale on the same motion style, so framer composes them.
    // Scaled a little past its box so the drift has somewhere to go — 1.22
    // rather than 1.2 for a rounding margin.
    const shift = useTransform(drift, [0, 1], ["-10%", "10%"]);
    const copyY = useTransform(drift, [0, 1], [22, -22]);

    return (
        <motion.article
            className={`BenefitJourney__row is-photo-${plan.side}`}
            ref={box}
            style={{ height: `${plan.h * 100}vh` }}
            variants={group()}
            initial="hidden"
            whileInView="shown"
            viewport={ENTERS}
        >
            {/* Uncovered bottom-up, never slid — see PHOTO in entrance.js. No
                frame around it: on desktop it bleeds a little taller than the
                row, which is what says "open" instead of "cell". */}
            <motion.div
                className="BenefitJourney__shot"
                style={{ width: `${plan.photo * 100}%` }}
                variants={PHOTO}
            >
                <motion.div
                    className="BenefitJourney__shot__img"
                    style={{ y: shift, scale: 1.22 }}
                >
                    <Image
                        src={step.photo.src}
                        alt={step.photo.alt}
                        fill
                        sizes="(max-width: 900px) 100vw, 60vw"
                        quality={80}
                        style={{ objectFit: "cover", objectPosition: step.photo.position }}
                    />
                </motion.div>
                <span className="BenefitJourney__shot__scrim" aria-hidden="true" />
            </motion.div>

            <motion.div
                className="BenefitJourney__copy"
                style={{ width: `${(1 - plan.photo) * 100}%`, y: copyY }}
            >
                {/* The step's numeral at FirstTime-stat scale — light, big and
                    half-there, the row's only large form besides the title. */}
                <motion.span className="BenefitJourney__ord" variants={RISE} aria-hidden="true">
                    {ord}
                </motion.span>
                <motion.p className="BenefitJourney__n" variants={RISE}>
                    {step.n} <span>{step.label}</span>
                </motion.p>
                <motion.h3 className="BenefitJourney__statement" variants={RISE}>
                    {step.title}
                </motion.h3>
                <motion.p className="BenefitJourney__body" variants={RISE}>
                    {step.body}
                </motion.p>
                <motion.p className="BenefitJourney__note" variants={RISE}>
                    {step.note}
                </motion.p>
            </motion.div>

            {/* The row's one rule: a baseline under everything, drawn from the
                copy's side — transform-origin lives in styles.scss, keyed off
                which side the photograph took. */}
            <motion.span
                className="BenefitJourney__baseline"
                variants={{
                    hidden: { scaleX: 0 },
                    shown: {
                        scaleX: 1,
                        transition: { duration: 1.1, ease: CURTAIN, delay: 0.2 },
                    },
                }}
                aria-hidden="true"
            />

            {/* The thread to the next step: one straight vertical hairline the
                height of the gap, standing where the next baseline will start,
                dropped top→down once the baseline has reached it. */}
            {drop ? (
                <motion.span
                    className={`BenefitJourney__drop is-at-${drop}`}
                    variants={{
                        hidden: { scaleY: 0 },
                        shown: {
                            scaleY: 1,
                            transition: { duration: 0.9, ease: CURTAIN, delay: 0.5 },
                        },
                    }}
                    aria-hidden="true"
                />
            ) : null}
        </motion.article>
    );
}
