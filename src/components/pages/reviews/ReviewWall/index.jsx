"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, cubicBezier, motion } from "framer-motion";
import AddReview from "@/components/pages/reviews/AddReview";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// How many arrive at once. A multiple of the widest column count, so a batch
// never leaves the grid ragged while the next one is on its way.
const BATCH = 12;

// What size cell a review earns. The layout is not decided in advance and then
// filled — it comes out of how much each person wrote, which is the only reason
// an uneven grid is honest rather than decorative.
const sizeOf = (message) => {
    const n = (message || "").length;
    if (n > 300) return "xl";   // two columns, two rows
    if (n > 170) return "wide"; // two columns
    if (n > 90) return "tall";  // two rows
    return "sm";
};

// The reviews, as a bento.
//
// Cells of four sizes packed with `grid-auto-flow: dense`, so the grid closes
// its own holes and no two rows line up — the unevenness is the point, and it
// is produced by the copy rather than imposed on it.
//
// Hovering one lifts it and pushes the rest back, and the cursor picks up the
// word "Rozkliknout" while it is over one, because a card that opens looks
// exactly like a card that does not.
//
// Clicking opens the expanding sheet the partners page uses: one `layoutId` on
// the card and one on the name, so it is that card that grows rather than a new
// thing fading in over it.
export default function ReviewWall({ reviews, consultants = [] }) {
    const [count, setCount] = useState(BATCH);
    const [hover, setHover] = useState(null);
    const [open, setOpen] = useState(null);
    const [mounted, setMounted] = useState(false);
    const endRef = useRef(null);

    // Whether there is a pointer that can hover at all, and whether the reader
    // asked for less movement. Both are read after mount rather than during the
    // first render, so the server and the client agree on the same markup and
    // only then does the flag flip — the shape Colleagues and WhoWeAre use.
    const [isTouch, setIsTouch] = useState(false);
    const [calm, setCalm] = useState(false);
    useEffect(() => {
        setIsTouch(window.matchMedia("(hover: none)").matches);
        setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }, []);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return;
        window.lenis?.stop();
        const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
        window.addEventListener("keydown", onKey);
        return () => {
            window.lenis?.start();
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const shown = useMemo(() => reviews.slice(0, count), [reviews, count]);
    const done = count >= reviews.length;

    // Which cards are holding text back.
    //
    // On a pointer machine the cursor says "Rozkliknout" over every card, and
    // that is honest because every card opens. On touch there is no cursor, and
    // printing the word on all fourteen would be fourteen promises of more when
    // only some of them have any. So the cards are asked: a cell whose review
    // does not fit is the one that says so, and the rest stay quiet.
    //
    // Measured rather than guessed from the character count, because the same
    // review clips at four tracks and does not at two.
    const bentoRef = useRef(null);
    const [clipped, setClipped] = useState(() => new Set());
    useEffect(() => {
        const node = bentoRef.current;
        if (!node) return;

        const measure = () => {
            const next = new Set();
            for (const cell of node.querySelectorAll("[data-review]")) {
                const text = cell.querySelector(".RevWall__cell__text");
                if (text && text.scrollHeight - text.clientHeight > 2) next.add(cell.dataset.review);
            }
            // Same answer, same object — otherwise the state change relays out
            // to the observer that produced it and the two of them loop.
            setClipped((prev) =>
                prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next,
            );
        };

        measure();
        const watch = new ResizeObserver(measure);
        watch.observe(node);
        // The face the reviews are set in decides where the lines break, and it
        // is not necessarily loaded when the first measurement runs.
        document.fonts?.ready.then(measure).catch(() => {});
        return () => watch.disconnect();
    }, [shown]);

    // The next batch arrives before the reader gets to the end of this one.
    //
    // This replaced a pager, and the pager was the problem: it sat at the foot
    // of the wall — measured, 201px above the patička — so the two were fighting
    // over the end of the page, and pressing it threw the reader back up to the
    // top of a grid they had just finished reading. Nothing to press now, and
    // the footer is only ever reached once there is genuinely nothing left.
    const more = useCallback(() => {
        setCount((c) => (c >= reviews.length ? c : Math.min(reviews.length, c + BATCH)));
    }, [reviews.length]);

    useEffect(() => {
        const node = endRef.current;
        if (!node || done) return;
        const io = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) more(); },
            // A screen and a half early, so the wall is already longer by the
            // time its old end would have come into view.
            { rootMargin: "0px 0px 150% 0px" },
        );
        io.observe(node);
        return () => io.disconnect();
    }, [more, done, count]);

    return (
        <section className="RevWall">
            {/* Above the wall, not under it: it is the one thing this page asks
                for, and asking at the bottom is asking after the answer. */}
            <div className="RevWall__bar">
                <AddReview consultants={consultants} />
                <span className="RevWall__bar__rule" aria-hidden="true" />
                <span className="RevWall__bar__count">
                    {String(shown.length).padStart(2, "0")}
                    <em> / {String(reviews.length).padStart(2, "0")} recenzí</em>
                </span>
            </div>

            <div className="RevWall__bento" ref={bentoRef}>
                <AnimatePresence mode="popLayout">
                    {shown.map((review, index) => (
                        <motion.article
                            key={review.id}
                            layoutId={`rev-${review.id}`}
                            data-review={review.id}
                            className={`RevWall__cell is-${sizeOf(review.message)}${
                                hover === null ? "" : hover === index ? " is-lifted" : " is-back"
                            }${clipped.has(review.id) ? " is-clipped" : ""}`}
                            data-cursor="frame"
                            data-cursor-label="Rozkliknout"
                            onClick={() => setOpen(review)}
                            // The lift is a pointer resting on a card, and a
                            // finger cannot rest: a tap fires enter and leave in
                            // one breath, so on touch it either flashed for a
                            // frame or — when the sheet opened over the finger
                            // and no leave ever arrived — left the whole wall
                            // dimmed to 0.4 behind it. On touch the tap does the
                            // one thing it means, which is open the review.
                            onPointerEnter={isTouch ? undefined : (e) => {
                                if (e.pointerType !== "mouse") return;
                                setHover(index);
                            }}
                            onPointerLeave={isTouch ? undefined : () => {
                                setHover((p) => (p === index ? null : p));
                            }}
                            initial={calm
                                ? { opacity: 0 }
                                : { opacity: 0, y: 40, filter: "blur(10px)" }}
                            animate={calm
                                ? { opacity: 1 }
                                : { opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={calm
                                ? { opacity: 0 }
                                : { opacity: 0, y: -20, filter: "blur(8px)" }}
                            transition={calm
                                ? { duration: 0.3, ease: "linear" }
                                : { duration: 0.7, ease: GLIDE, delay: (index % BATCH) * 0.04 }}
                        >
                            <span className="RevWall__cell__edge" aria-hidden="true" />
                            <div className="RevWall__cell__in">
                                <div className="RevWall__cell__head">
                                    <span className="RevWall__cell__tag">#{review.hashtag}</span>
                                    <span className="RevWall__cell__idx">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </div>
                                <span className="RevWall__cell__rule" aria-hidden="true" />

                                <motion.p className="RevWall__cell__text" layoutId={`revtext-${review.id}`}>
                                    {review.message}
                                </motion.p>

                                <div className="RevWall__cell__foot">
                                    <motion.span className="RevWall__cell__who" layoutId={`revwho-${review.id}`}>
                                        {review.customerName}
                                    </motion.span>
                                    {review.consultantName && (
                                        <span className="RevWall__cell__for">{review.consultantName}</span>
                                    )}
                                    {/* What the cursor says on a desktop. The
                                        cursor does not exist on touch, and a
                                        cell that clips its review has to say so
                                        somewhere the reader can actually see —
                                        so the word moves into the card. Where
                                        nothing is clipped (the stacked column)
                                        the stylesheet takes it away again. */}
                                    <span className="RevWall__cell__open" aria-hidden="true">
                                        Rozkliknout
                                    </span>
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </AnimatePresence>
            </div>

            {/* What the observer watches. It has no height of its own: the
                margin on the observer is what gives it its reach. */}
            <div className="RevWall__sentinel" ref={endRef} aria-hidden="true" />

            <div className="RevWall__end">
                <span className="RevWall__end__rule" aria-hidden="true" />
                <span className="RevWall__end__word">
                    {done ? "To je zatím všechno" : "Načítám další…"}
                </span>
            </div>

            {mounted && createPortal(
                <AnimatePresence>
                    {open && <ReviewSheet review={open} onClose={() => setOpen(null)} />}
                </AnimatePresence>,
                document.body,
            )}
        </section>
    );
}

function ReviewSheet({ review, onClose }) {
    return (
        <>
            <motion.div
                className="RevSheet__backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: GLIDE }}
                onClick={onClose} aria-hidden="true"
            />
            <div className="RevSheet__wrap" role="dialog" aria-modal="true" aria-label={review.customerName}>
                {/* `data-lenis-prevent` because the page's scroll is stopped
                    while this is open: without it lenis swallows the wheel and
                    the touch drag, and a review long enough to need the sheet's
                    own scrollbar could not be scrolled to its end. */}
                <motion.article className="RevSheet" layoutId={`rev-${review.id}`} data-lenis-prevent>
                    <div className="RevSheet__head">
                        <span className="RevSheet__tag">#{review.hashtag}</span>
                        <button type="button" className="RevSheet__close" onClick={onClose} data-cursor="frame" aria-label="Zavřít">
                            <span /><span />
                        </button>
                    </div>
                    <span className="RevSheet__rule" aria-hidden="true" />

                    <motion.p className="RevSheet__text" layoutId={`revtext-${review.id}`}>
                        {review.message}
                    </motion.p>

                    <div className="RevSheet__foot">
                        <motion.span className="RevSheet__who" layoutId={`revwho-${review.id}`}>
                            {review.customerName}
                        </motion.span>
                        {review.consultantName && (
                            <span className="RevSheet__for">{review.consultantName}</span>
                        )}
                    </div>
                </motion.article>
            </div>
        </>
    );
}
