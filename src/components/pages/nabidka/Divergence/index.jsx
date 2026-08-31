"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    motion,
    useMotionTemplate,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";

import { ENTERS, RISE, group } from "@/components/common/ui/entrance";
import { YEARS, CURVES, VIEW, RULES, lineOf, areaOf, readAt, upAt, yearAt } from "./content";

// The page's last word, and the only thing on it you can take hold of.
//
// One board and twenty years, drawn twice. The chart draws itself across the
// years rather than down them — it is a time series, and a time series that
// arrives from the top is a wipe over a picture where it could have been the
// years going by. The head of the drawing is a line you can take hold of and
// scrub, and the two figures ride on it: whatever year it stands on, that is
// what the same money is worth in each of the two futures.
//
// Scroll draws it; the reader can move it; and then scroll goes on drawing it
// from wherever they left it. That last part is the whole trick. The scroll
// does not own a position, it owns *what is left* — so a reader who drags the
// head most of the way to the end has only a little remaining and the rest of
// the page finishes it slowly, and one who drags it back to the start has it
// all to do again and it goes quickly. Either way it is complete by the time
// the board is done, which a bar that snapped back or one that simply stopped
// would not be.

const PATHS = {
    inflace: lineOf(CURVES.inflace),
    bezLine: lineOf(CURVES.bez),
    bezArea: areaOf(CURVES.bez),
    sLine: lineOf(CURVES.s),
    sArea: areaOf(CURVES.s),
};

// Where in the section's scroll the drawing runs.
const DRIVE = [0.08, 0.68];

// Where in the section's scroll the board builds itself. Off the scroll and
// not off `whileInView`: this section is two and a half screens tall and its
// board is pinned inside it, so "twenty per cent of it is on screen" happens
// long before the board is — measured, the whole arrival had already played
// out above the fold. This fires when the board pins, because that is what it
// is keyed to.
const BUILD = [0, 0.06];

export default function Divergence() {
    const section = useRef(null);
    const board = useRef(null);

    // How much of the board is drawn, 0 at the first year and 1 at the last.
    const cut = useMotionValue(0);
    const eased = useSpring(cut, { stiffness: 300, damping: 36, restDelta: 0.0008 });

    const [holding, setHolding] = useState(false);
    const [year, setYear] = useState(YEARS[0]);
    // Whether there is a pointer that can hover at all. Read after mount rather
    // than during the first render, so the server and the client agree on the
    // same markup and only then does the flag flip — the shape Colleagues and
    // WhoWeAre use.
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        setIsTouch(window.matchMedia("(hover: none)").matches);
    }, []);
    // Near the far edge the figures have nowhere to go, so they change sides.
    const [late, setLate] = useState(false);
    const [reads, setReads] = useState({ s: 100, bez: 100 });

    // Where the reader last left it, and how far through the drive that was.
    // The scroll works out the rest from these two numbers and nothing else.
    const anchor = useRef({ at: 0, drive: 0 });

    // A finger that lands on the board has not necessarily come to scrub it —
    // most of the time it has come to scroll the page, and the board is simply
    // what happens to be under the thumb. So on a coarse pointer a touch does
    // not move the head: it arms one, and the head only starts following once
    // the finger has committed to going sideways. `touch-action: pan-y` in the
    // stylesheet is the other half of this — the browser keeps vertical for
    // itself and cancels the gesture the moment it decides that is what it is.
    const armed = useRef(null);

    const { scrollYProgress } = useScroll({
        target: section,
        offset: ["start start", "end end"],
    });

    useMotionValueEvent(scrollYProgress, "change", (v) => {
        if (holding) return;
        const s = Math.max(0, Math.min(1, (v - DRIVE[0]) / (DRIVE[1] - DRIVE[0])));
        const { at, drive } = anchor.current;
        // Ahead of where they left it, what is left of the board is spread over
        // what is left of the drive; behind it, what they had is given back over
        // what they had. Both reduce to a straight line when nothing has been
        // touched, which is why the first pass looks like nothing clever.
        const next =
            s >= drive
                ? drive >= 1
                    ? at
                    : at + (1 - at) * ((s - drive) / (1 - drive))
                : drive <= 0
                  ? at
                  : at * (s / drive);
        cut.set(next);
    });

    // The two figures and the year are read off the head, not off the scroll:
    // the head is the thing that has a position.
    useMotionValueEvent(eased, "change", (t) => {
        // Each of these is set to what it should be rather than to something
        // new, which is what lets React stop here on most frames. setYear and
        // setLate already did: a year is a number and `t > 0.74` is a boolean,
        // and setting either to the value it already holds is a bail-out.
        //
        // setReads did not, because an object literal is never equal to the
        // last one however identical its contents — so a component of ~370
        // lines was reconciled on every frame of the scroll to arrive at the
        // same two integers it already had. The figures are rounded to whole
        // percent and only change some tens of times across the whole board,
        // so the fresh object is built only when one of them has moved.
        setYear(yearAt(t));
        setLate(t > 0.74);
        const s = Math.round(readAt(CURVES.s, t));
        const bez = Math.round(readAt(CURVES.bez, t));
        setReads((prev) => (prev.s === s && prev.bez === bez ? prev : { s, bez }));
    });

    const put = useCallback(
        (clientX) => {
            const box = board.current?.querySelector(".Divergence__plot")?.getBoundingClientRect();
            if (!box) return;
            cut.set(Math.max(0, Math.min(1, (clientX - box.left) / box.width)));
        },
        [cut],
    );

    // How far sideways a finger has to go before the board takes it as a scrub.
    const COMMIT = 8;

    const grab = (e) => {
        // The grip is unambiguous wherever it is touched — it is the handle,
        // and nothing else on the board is. Everywhere else on a coarse
        // pointer, wait and see.
        const onGrip = Boolean(e.target?.closest?.(".Divergence__grip"));
        armed.current = isTouch && !onGrip ? { x: e.clientX, live: false } : null;
        setHolding(true);
        if (!armed.current) put(e.clientX);
    };

    // Listening on the window rather than the handle: a pointer that leaves the
    // board mid-drag is still dragging, and the head should follow it to the
    // edge and wait there.
    useEffect(() => {
        if (!holding) return;
        const move = (e) => {
            const wait = armed.current;
            if (wait && !wait.live) {
                if (Math.abs(e.clientX - wait.x) < COMMIT) return;
                wait.live = true;
            }
            put(e.clientX);
        };
        const drop = () => {
            setHolding(false);
            armed.current = null;
            // What they left, and where the page was when they left it. Every
            // later frame of scroll is measured from here.
            const s = Math.max(
                0,
                Math.min(1, (scrollYProgress.get() - DRIVE[0]) / (DRIVE[1] - DRIVE[0])),
            );
            anchor.current = { at: cut.get(), drive: s };
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", drop);
        window.addEventListener("pointercancel", drop);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", drop);
            window.removeEventListener("pointercancel", drop);
        };
    }, [holding, put, cut, scrollYProgress]);

    const step = (delta) => {
        const next = Math.max(0, Math.min(1, cut.get() + delta));
        cut.set(next);
        const s = Math.max(
            0,
            Math.min(1, (scrollYProgress.get() - DRIVE[0]) / (DRIVE[1] - DRIVE[0])),
        );
        anchor.current = { at: next, drive: s };
    };

    // Where the head stands, what is drawn behind it, and how high up the plot
    // each of the two figures rides — all four off the one number.
    const pct = useTransform(eased, (v) => v * 100);
    const rest = useTransform(eased, (v) => (1 - v) * 100);
    const sUp = useTransform(eased, (v) => upAt(readAt(CURVES.s, v)) * 100);
    const bezUp = useTransform(eased, (v) => upAt(readAt(CURVES.bez, v)) * 100);
    // Not one fade over the whole thing: the frame comes up out of its own
    // foot, the paper inside it follows, and the curves are the last thing to
    // appear on it — the order somebody would draw it in.
    const build = useSpring(useTransform(scrollYProgress, BUILD, [0, 1], { clamp: true }), {
        stiffness: 180,
        damping: 30,
        restDelta: 0.001,
    });
    const frameIn = build;
    const frameUp = useTransform(build, [0, 1], [0.84, 1]);
    const paperIn = useTransform(build, [0.28, 0.78], [0, 1], { clamp: true });
    const inkIn = useTransform(build, [0.5, 1], [0, 1], { clamp: true });
    const inkUp = useTransform(build, [0.5, 1], [16, 0], { clamp: true });

    const at = useMotionTemplate`${pct}%`;
    const drawn = useMotionTemplate`inset(0 ${rest}% 0 0)`;
    const sTop = useMotionTemplate`${sUp}%`;
    const bezTop = useMotionTemplate`${bezUp}%`;

    return (
        <section className="Divergence" ref={section}>
            <motion.div
                className="Divergence__stick"
                variants={group()}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <header className="Divergence__head">
                    <motion.p className="Divergence__n" variants={RISE}>
                        07
                    </motion.p>
                    <motion.h2 className="Divergence__title" variants={RISE}>
                        Stejné peníze, dvakrát
                    </motion.h2>
                    <motion.p className="Divergence__lead" variants={RISE}>
                        Sto korun odložených dnes. Táhněte za linku a projděte si těch
                        dvacet let rok po roce.
                    </motion.p>
                </header>

                <motion.div
                    className={`Divergence__board${holding ? " is-held" : ""}`}
                    ref={board}
                    onPointerDown={grab}
                    style={{ opacity: frameIn, scaleY: frameUp }}
                >
                    <span className="Divergence__marks" aria-hidden="true">
                        <i className="Divergence__marks__tl" />
                        <i className="Divergence__marks__tr" />
                        <i className="Divergence__marks__bl" />
                        <i className="Divergence__marks__br" />
                    </span>

                    <motion.div style={{ opacity: paperIn }}>
                        <Ground />
                    </motion.div>

                    <motion.div className="Divergence__plot" style={{ opacity: inkIn, y: inkUp }}>
                        {/* Where it is going, at the weight of a pencil line. */}
                        <Curves tone="ahead" />
                        {/* And where it has got to. */}
                        <motion.div className="Divergence__ink" style={{ clipPath: drawn }}>
                            <Curves tone="ink" />
                        </motion.div>

                        <motion.div
                            className={`Divergence__hand${holding ? " is-held" : ""}${late ? " is-late" : ""}`}
                            style={{ left: at }}
                        >
                            <span className="Divergence__hand__rule" />

                            <motion.span
                                className="Divergence__read Divergence__read--s"
                                style={{ top: sTop }}
                            >
                                <i />
                                <b>{reads.s} %</b>
                            </motion.span>
                            <motion.span
                                className="Divergence__read Divergence__read--bez"
                                style={{ top: bezTop }}
                            >
                                <i />
                                <b>{reads.bez} %</b>
                            </motion.span>

                            <button
                                type="button"
                                className="Divergence__grip"
                                role="slider"
                                aria-label="Projít roky"
                                aria-valuemin={YEARS[0]}
                                aria-valuemax={YEARS[YEARS.length - 1]}
                                aria-valuenow={year}
                                aria-valuetext={`${year}`}
                                onKeyDown={(e) => {
                                    if (e.key === "ArrowLeft") step(-0.05);
                                    if (e.key === "ArrowRight") step(0.05);
                                }}
                            >
                                <i />
                                <i />
                                <i />
                            </button>

                            <span className="Divergence__year">{year}</span>
                        </motion.div>
                    </motion.div>
                </motion.div>

                <motion.footer className="Divergence__foot" variants={RISE}>
                    <span className="Divergence__key">
                        <i className="Divergence__key__dash" /> Inflace
                    </span>
                    <span className="Divergence__key">
                        <i className="Divergence__key__plain" /> Bez nás
                    </span>
                    <span className="Divergence__key">
                        <i className="Divergence__key__ours" /> S naším servisem
                    </span>
                    <span className="Divergence__note">Ilustrativní čísla</span>
                </motion.footer>
            </motion.div>
        </section>
    );
}

// The board's own graph paper, and the years along the bottom. Set as HTML
// rather than inside the stretched SVG, so the type keeps its proportions
// whatever shape the board ends up.
function Ground() {
    return (
        <div className="Divergence__ground" aria-hidden="true">
            <div className="Divergence__rules">
                {RULES.map((r) => (
                    <span key={r.v} style={{ top: `${(r.y / VIEW.h) * 100}%` }}>
                        {r.v} %
                    </span>
                ))}
            </div>

            <div className="Divergence__years">
                {YEARS.filter((_, i) => i % 2 === 0).map((yr) => (
                    <span key={yr}>{yr}</span>
                ))}
            </div>
        </div>
    );
}

function Curves({ tone }) {
    return (
        <svg
            className={`Divergence__svg is-${tone}`}
            viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {RULES.map((r) => (
                <line
                    key={r.v}
                    x1="0"
                    x2={VIEW.w}
                    y1={r.y}
                    y2={r.y}
                    className="Divergence__rule"
                    vectorEffect="non-scaling-stroke"
                />
            ))}
            <path d={PATHS.sArea} className="Divergence__area Divergence__area--s" />
            <path d={PATHS.inflace} className="Divergence__inflace" vectorEffect="non-scaling-stroke" />
            <path d={PATHS.bezLine} className="Divergence__line Divergence__line--bez" vectorEffect="non-scaling-stroke" />
            <path d={PATHS.sLine} className="Divergence__line Divergence__line--s" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}
