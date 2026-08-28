"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { CURTAIN, ENTERS, RISE, group } from "@/components/common/ui/entrance";
import { rootRamp } from "@/helpers/checkViewport";

// What people said, as a wall that will not hold still.
//
// The offer above this is deliberately motionless — it is the part with the
// reading in it. This is the opposite end of the same page: nobody reads a wall
// of testimonials front to back, they take one in and believe there are more.
// So it drifts. Columns run at their own speeds and in alternating directions,
// the whole plane is turned away from the reader and leans with the pointer,
// and reaching for a card brings it forward and stops the column it is in.
//
// The cards are different sizes because the reviews are different lengths —
// the same rule the reviews page uses, and the reason an uneven wall here is
// honest rather than decorative. See sizeOf in pages/reviews/ReviewWall.

// What size cell a review earns, in pixels of column. The reviews page divides
// the same four ways; here there is only one axis to spend it on, so the bands
// come out as heights.
const HEIGHTS = { sm: 172, tall: 220, wide: 274, xl: 344 };

const sizeOf = (message) => {
    const n = (message || "").length;
    if (n > 300) return "xl";
    if (n > 170) return "wide";
    if (n > 90) return "tall";
    return "sm";
};

// How much faster or slower than the others a column runs. Off the golden
// ratio so no two are alike and the pattern never comes back round.
const rateOf = (index, variance) => 1 + variance * (((index * 0.6180339887 + 0.35) % 1) * 2 - 1);

// The heights above are in real pixels, and everything they hold is in rem —
// the column they are drawn in, the tag, the quotation, the name under it. Past
// 1921 across the root font size ramps and all of that gets up to a third
// bigger; the card does not, and a card the size it was for 1920 with 1920's
// text set a third larger inside it is a card with its last line cut off,
// because the face hides its overflow.
//
// rootRamp is that growth — see helpers/checkViewport, which is where the one
// copy of it lives. It is 1 at 1920 and below, where nothing about this wall
// moves.

const GAP = 22;
// Pixels a second. It was 26, which on a card two hundred tall is eight seconds
// to go by — slow enough that the wall read as standing still and only moving
// if you watched it. A belt has to be running.
const SPEED = 62;
// What is left of that for a reader who has asked for less movement. Not
// nothing: a wall that is plainly built to drift and does not read as broken
// rather than as calm, and this is a slow pan across a dim surface, not a
// carousel snapping between slides. Quarter speed is the reduction.
const QUIET = 0.25;
// How far apart the columns' speeds are. Wide, because a wall where every
// column runs at the same rate is one thing sliding, not five.
const VARIANCE = 0.5;
const LEAN = 7;

export default function ReviewDrift({ reviews = [] }) {
    const wall = useRef(null);
    const plane = useRef(null);
    const tracks = useRef([]);
    const frame = useRef(null);

    const offsets = useRef([]);
    const speeds = useRef([]);
    const held = useRef(-1);
    const aim = useRef({ x: 0, y: 0 });
    const leant = useRef({ x: 0, y: 0 });
    const last = useRef(null);

    const [columns, setColumns] = useState(4);
    const [unit, setUnit] = useState(1);
    const [height, setHeight] = useState(760);
    const [reach, setReach] = useState(null);
    const [still, setStill] = useState(false);

    // Whether there is a pointer that can hover at all. Read after mount rather
    // than during the first render, so the server and the client agree on the
    // same markup and only then does the flag flip — the shape Colleagues,
    // WhoWeAre and the reviews page all use.
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        setIsTouch(window.matchMedia("(hover: none)").matches);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const read = () => setStill(mq.matches);
        read();
        mq.addEventListener("change", read);
        return () => mq.removeEventListener("change", read);
    }, []);

    useEffect(() => {
        const read = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setColumns(w < 620 ? 2 : w < 1000 ? 3 : w < 1420 ? 4 : 5);
            // A card is a fixed number of pixels tall, and on a phone held
            // sideways the tallest of them is the whole viewport: one card per
            // column, most of it inside the mask, and a wall that reads as
            // empty. The card shrinks rather than the wall growing — a taller
            // wall would only be more scrolling past the same two cards.
            //
            // ...and the other way at the top end, where the card has to grow
            // to hold type that already has. See ROOT.
            setUnit((h < 560 ? 0.56 : w < 620 ? 0.76 : 1) * rootRamp(w));
        };
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, []);

    // The card sizes at this viewport, gap included. Everything downstream —
    // the length of one pass, how many passes fill the plane, the height each
    // card is drawn at — is measured off these two and nothing else, so there
    // is one place where a card's size is decided.
    const gap = Math.round(GAP * unit);
    const sizes = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(HEIGHTS).map(([key, px]) => [key, Math.round(px * unit)]),
            ),
        [unit],
    );

    useEffect(() => {
        const box = wall.current;
        if (!box) return undefined;
        // Quantised. The wall is sized in vh and a viewport that shifts by a
        // fraction of a pixel — a scrollbar arriving, a browser chrome that
        // grows and shrinks as you scroll — would otherwise report a new height
        // on every frame, and everything downstream of it is rebuilt when it
        // does.
        const ro = new ResizeObserver(([entry]) => {
            const next = Math.round((entry.contentRect.height || 760) / 8) * 8;
            setHeight((prev) => (prev === next ? prev : next));
        });
        ro.observe(box);
        return () => ro.disconnect();
    }, []);

    // Dealt round the columns rather than sliced into them, so a long review
    // and a short one never end up stacked in the same place twice.
    const cols = useMemo(() => {
        const out = Array.from({ length: columns }, () => []);
        reviews.slice(0, 24).forEach((review, i) => out[i % columns].push(review));
        return out.map((col) => (col.length ? col : reviews.slice(0, 1)));
    }, [reviews, columns]);

    // How much plane every column has to fill. Set once for all of them rather
    // than left to come out of whichever happens to be longest — that was the
    // bug: the plane took its height from the tallest column, and the two
    // shortest ended 550 and 624 pixels above its foot. A gap walked up those
    // columns once per pass, which is exactly what a loop that does not loop
    // looks like.
    //
    // A third again as tall as the wall, because the plane is scaled up, tipped
    // and pushed back, and its corners reach past the box it is drawn in.
    const span = Math.round(height * 1.35);

    // How tall one pass of each column is, and how many passes it takes to fill
    // that. Enough for the span and one whole pass on top of it, so the window
    // is still covered at the moment before the offset wraps.
    const meta = useMemo(
        () =>
            cols.map((col) => {
                const run = col.reduce((sum, r) => sum + sizes[sizeOf(r.message)] + gap, 0);
                return { run, copies: Math.max(2, Math.ceil((span + run) / run)) };
            }),
        [cols, span, sizes, gap],
    );

    const rates = useMemo(
        () => cols.map((_, c) => SPEED * rateOf(c, VARIANCE) * (c % 2 === 0 ? 1 : -1)),
        [cols],
    );

    // Set up once per shape of wall, and *kept* across a re-measure rather than
    // rebuilt. This was assigning fresh offsets and zero velocities every time
    // `meta` changed identity — which is every time the observed height moves —
    // so on any machine whose viewport is not perfectly steady the belts were
    // being put back to the start and stopped, over and over. What comes out of
    // that is a wall that does not move.
    useEffect(() => {
        meta.forEach((m, c) => {
            const before = offsets.current[c];
            offsets.current[c] =
                before === undefined
                    ? m.run * ((c * 0.37) % 1)
                    : ((before % m.run) + m.run) % m.run;
            if (speeds.current[c] === undefined) speeds.current[c] = 0;
        });
        offsets.current.length = meta.length;
        speeds.current.length = meta.length;
    }, [meta]);

    useEffect(() => {
        const step = (ts) => {
            if (last.current === null) last.current = ts;
            const dt = Math.min(0.05, Math.max(0, ts - last.current) / 1000);
            last.current = ts;

            // The plane leans towards the pointer, damped rather than followed:
            // a wall that snapped to the cursor would be a wall being dragged.
            //
            // And it does not lean at all for a reader who has asked for less
            // movement. It was leaning either way, which had it suppressing the
            // slow, continuous, predictable motion and keeping the one that
            // follows the cursor about — the wrong way round.
            const want = still ? 0 : 1;
            const ease = 1 - Math.exp(-dt / 0.14);
            leant.current.x += (aim.current.x * LEAN * want - leant.current.x) * ease;
            leant.current.y += (-aim.current.y * LEAN * want - leant.current.y) * ease;
            if (plane.current) {
                plane.current.style.transform =
                    `translate(-50%, -50%) scale(1.2) ` +
                    `rotateX(${13 + leant.current.y}deg) rotateY(${-13 + leant.current.x}deg) ` +
                    // In rem, with the perspective it is seen under and the
                    // raise an active card takes — see styles.scss. How far
                    // back the plane stands is part of the same scene and has
                    // to grow with it, or the wall is pushed proportionally
                    // less far away on a screen where it is bigger.
                    `translateZ(-6.875rem)`;
            }

            for (let c = 0; c < tracks.current.length; c += 1) {
                const m = meta[c];
                const el = tracks.current[c];
                if (!m || !el) continue;
                {
                    // The column under the pointer comes to a stop rather than
                    // cutting out — the card being read should not be sliding
                    // out from under the eye that is reading it.
                    const want = held.current === c ? 0 : rates[c] * (still ? QUIET : 1);
                    const grip = 1 - Math.exp(-dt / (want === 0 ? 0.18 : 0.3));
                    speeds.current[c] += (want - speeds.current[c]) * grip;
                    const next = (offsets.current[c] ?? 0) + speeds.current[c] * dt;
                    offsets.current[c] = ((next % m.run) + m.run) % m.run;
                }
                el.style.transform = `translate3d(0, ${-(offsets.current[c] ?? 0)}px, 0)`;
            }

            frame.current = requestAnimationFrame(step);
        };

        frame.current = requestAnimationFrame(step);
        return () => {
            if (frame.current) cancelAnimationFrame(frame.current);
            frame.current = null;
            last.current = null;
        };
    }, [meta, rates, still]);

    const follow = useCallback(
        (e) => {
            // A finger crossing the wall is a scroll, not a look. Leaning
            // towards it makes the plane swing under the very gesture that is
            // moving the page — and there is no pointerleave after a tap to put
            // it back, so it would swing once and stay swung.
            if (isTouch) return;
            const box = wall.current?.getBoundingClientRect();
            if (!box) return;
            aim.current = {
                x: (e.clientX - box.left) / box.width - 0.5,
                y: (e.clientY - box.top) / box.height - 0.5,
            };
        },
        [isTouch],
    );

    const leave = useCallback(() => {
        aim.current = { x: 0, y: 0 };
        held.current = -1;
        setReach(null);
    }, []);

    // Reaching, where there is nothing to reach with.
    //
    // On a pointer machine a card comes forward because the cursor is over it
    // and goes back because the cursor left. A tap has only the first half of
    // that: iOS fires the enter and never the leave, so a card brought forward
    // by a finger would stay forward and the column it is in would stay stopped
    // — for the rest of the visit. So touch gets the gesture it can actually
    // finish: a tap takes a card, a second tap on it puts it back, a tap on
    // another card moves the hold, and a tap on the wall between them lets go.
    //
    // One handler on the wall rather than one per card: there are up to a
    // hundred and twenty cards on this plane and only one of them can be held.
    const tap = useCallback(
        (e) => {
            if (!isTouch) return;
            const card = e.target?.closest?.("[data-card]");
            if (!card) {
                leave();
                return;
            }
            // Worked out here rather than inside the state updater: which
            // column is stopped is a ref, and writing a ref from an updater is
            // a side effect in a function React is free to call twice.
            const id = card.dataset.card;
            const next = reach === id ? null : id;
            held.current = next === null ? -1 : Number(card.dataset.col);
            setReach(next);
        },
        [isTouch, leave, reach],
    );

    if (!reviews.length) return null;

    return (
        // The gap goes to the stylesheet rather than being written down in both
        // places. A column loops by wrapping its offset against the height of
        // one pass, worked out here from the card heights and this gap — if the
        // rendered card is not exactly that tall the wrap lands short and the
        // whole column jolts once per pass, which is what it was doing.
        <section className="RevDrift" style={{ "--rd-gap": `${gap}px` }}>
            {/* The offer's own hairline, carried in: down the margin from where
                the chart left off, in at the section number, and stopped. The
                wall above is threaded with these and without one this section
                begins from nothing. */}
            <motion.span
                className="RevDrift__thread"
                style={{ height: "44%" }}
                variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1 } }}
                transition={{ duration: 1.4, ease: CURTAIN }}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
                aria-hidden="true"
            />
            <motion.span
                className="RevDrift__thread__in"
                style={{ top: "44%", width: "calc(6vw - 1px)" }}
                variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
                transition={{ duration: 0.9, ease: CURTAIN, delay: 0.5 }}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
                aria-hidden="true"
            />
            <motion.span
                className="RevDrift__thread__stop"
                style={{ top: "44%" }}
                variants={{ hidden: { opacity: 0, scale: 0.4 }, shown: { opacity: 1, scale: 1 } }}
                transition={{ duration: 0.6, ease: CURTAIN, delay: 1.1 }}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
                aria-hidden="true"
            />

            <motion.header
                className="RevDrift__head"
                variants={group()}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.p className="RevDrift__n" variants={RISE}>
                    08
                </motion.p>
                <motion.h2 className="RevDrift__title" variants={RISE}>
                    Co o nás říkají
                </motion.h2>
                <motion.p className="RevDrift__lead" variants={RISE}>
                    Přes tři tisíce domácností. Tohle je jich pár.
                    <Link href="/recenze" className="RevDrift__more">
                        Všechny recenze
                    </Link>
                </motion.p>
            </motion.header>

            {/* The wall arrives a column at a time, from the outside in — the
                belts are already running when it does, so what comes up is a
                thing in motion rather than a still that starts moving. */}
            <motion.div
                className="RevDrift__wall"
                ref={wall}
                onPointerMove={follow}
                onPointerLeave={leave}
                onClick={tap}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
                variants={{ shown: { transition: { staggerChildren: 0.09 } } }}
                role="group"
                aria-label="Recenze klientů"
            >
                {/* The perspective lives here and the mask lives on the box
                    outside it. One element carrying both is one element that a
                    compositor may decide to draw once and keep — see the note
                    in the stylesheet. */}
                <div className="RevDrift__view">
                <motion.div
                    className="RevDrift__plane"
                    ref={plane}
                    style={{ height: `${span}px` }}
                    variants={{ shown: { transition: { staggerChildren: 0.09 } } }}
                >
                    {cols.map((col, c) => (
                        <motion.div
                            className="RevDrift__col"
                            key={c}
                            variants={{
                                hidden: { opacity: 0, y: 54 },
                                shown: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        duration: 1.15,
                                        ease: CURTAIN,
                                        delay: 0.06 * Math.abs(c - (columns - 1) / 2),
                                    },
                                },
                            }}
                        >
                            <div
                                className="RevDrift__track"
                                // The two numbers the wrap depends on, on the
                                // element itself: how many cards make one pass
                                // and how tall that pass is meant to be. They
                                // are the only thing that can put a jolt in the
                                // loop, so they are worth being able to read.
                                data-per={col.length}
                                data-run={meta[c]?.run}
                                ref={(el) => {
                                    tracks.current[c] = el;
                                }}
                            >
                                {Array.from({ length: meta[c]?.copies || 2 }).map((_, pass) =>
                                    col.map((review, i) => (
                                        <Card
                                            key={`${c}-${pass}-${i}`}
                                            id={`${c}-${pass}-${i}`}
                                            col={c}
                                            review={review}
                                            height={sizes[sizeOf(review.message)] + gap}
                                            touch={isTouch}
                                            active={reach === `${c}-${pass}-${i}`}
                                            // A column loops by drawing itself
                                            // several times over. Only the first
                                            // pass is read out; the rest are the
                                            // same words again and a reader who
                                            // cannot see them should not be told
                                            // each one four times.
                                            echo={pass > 0}
                                            onReach={() => {
                                                held.current = c;
                                                setReach(`${c}-${pass}-${i}`);
                                            }}
                                            onLeave={leave}
                                        />
                                    )),
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
                </div>
            </motion.div>
        </section>
    );
}

function Card({ id, col, review, height, touch, active, echo, onReach, onLeave }) {
    const size = sizeOf(review.message);

    return (
        <div
            className={`RevDrift__card is-${size}${active ? " is-active" : ""}`}
            // The unit, gap included: `box-sizing: border-box` is on for the
            // whole site, so a height with padding under it is the height, and
            // the gap has to be part of the number rather than added to it.
            style={{ height: `${height}px` }}
            // What the wall's own tap handler reads off whatever was under the
            // finger. Which card, and which column to stop.
            data-card={id}
            data-col={col}
            // Not a button: reaching for one brings it forward and that is all
            // it does. Fourteen duplicated tab stops that lead nowhere is worse
            // than none.
            aria-hidden={echo || undefined}
            // Hover only where a pointer can leave again — see `tap` above.
            onPointerEnter={touch ? undefined : onReach}
            onPointerLeave={touch ? undefined : onLeave}
        >
            <span className="RevDrift__card__face">
                <span className="RevDrift__marks" aria-hidden="true">
                    <i /><i /><i /><i />
                </span>

                {review.hashtag ? (
                    <span className="RevDrift__card__tag">#{review.hashtag}</span>
                ) : null}

                <p className="RevDrift__card__text">{review.message}</p>

                <span className="RevDrift__card__by">
                    <span className="RevDrift__card__who">{review.customerName}</span>
                    {review.consultantName ? (
                        <span className="RevDrift__card__for">{review.consultantName}</span>
                    ) : null}
                </span>
            </span>
        </div>
    );
}
