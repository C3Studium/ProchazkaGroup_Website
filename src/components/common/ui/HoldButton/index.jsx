"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

// How long the press has to be held, and how quickly it gives up if it is not.
const HOLD = 1.5;
const RELEASE = 0.32;

// Geometry of the ring, in its own viewBox. The stroke is drawn on the circle's
// path, so the dash length below is its circumference and nothing else.
const SIZE = 200;
const R = 92;
const CIRCUMFERENCE = 2 * Math.PI * R;

// A button you hold rather than click.
//
// At rest it is a hairline circle with the instruction inside it. Held, the
// hairline goes out and a stroke runs round the same path from nothing to the
// whole way — the ring is the progress, so there is no second indicator
// anywhere, and letting go before it closes rewinds it.
//
// The pointer is deliberately not drawn over this one: it carries
// `data-cursor="hold"`, which the page's cursor reads as "stand down". The ring
// is what the hand is doing here, and the cursor's own marks closing on top of
// it would be two things saying the same thing in the same place.
//
// `onComplete` is the seam. Nothing is wired to it yet — what happens after the
// hold is the caller's business, and the button's job ends at telling it.
// `labelProps` is attributes for the label's lines, one entry per line, index
// aligned with `label`. It exists so the words inside this button can be
// annotated for the visual editor without the button knowing what a CMS is —
// each line is already its own <span>, so this puts attributes on elements that
// exist rather than adding any. See @/cms/edit.
export default function HoldButton({
    label = ["Podržte", "pro", "pokračování"],
    labelProps = [],
    onComplete,
    className = "",
}) {
    const [held, setHeld] = useState(false);
    const runningRef = useRef(null);

    // 0 at rest, 1 when the hold is complete. One value drives the ring, the
    // fading hairline and the squeeze on the text, so they cannot disagree.
    const press = useMotionValue(0);

    const dashOffset = useTransform(press, (p) => CIRCUMFERENCE * (1 - p));
    // The hairline is only there while nothing is happening to it.
    const restRing = useTransform(press, [0, 0.06], [1, 0]);
    // Down at a constant rate under the thumb, because the descent is the
    // waiting — an eased one would read as the button settling and then holding
    // still, which is the opposite of what is going on.
    const textScale = useTransform(press, [0, 1], [1, 0.88]);

    const stop = useCallback(() => {
        runningRef.current?.stop();
        runningRef.current = null;
    }, []);

    const start = useCallback(() => {
        if (held) return;
        setHeld(true);
        stop();
        runningRef.current = animate(press, 1, {
            duration: HOLD * (1 - press.get()),
            ease: "linear",
            onComplete: () => {
                runningRef.current = null;
                onComplete?.();
            },
        });
    }, [held, onComplete, press, stop]);

    const cancel = useCallback(() => {
        if (!held) return;
        setHeld(false);
        stop();
        // Back on a spring rather than a reverse of the way down: letting go is
        // a release, and a release has some give in it.
        runningRef.current = animate(press, 0, {
            type: "spring",
            stiffness: 420,
            damping: 30,
            mass: 0.6,
            restDelta: 0.001,
        });
    }, [held, press, stop]);

    // A pointer that goes up outside the button still ends the hold — otherwise
    // dragging off it leaves the ring running with nothing pressing on it.
    useEffect(() => {
        if (!held) return;
        window.addEventListener("pointerup", cancel);
        window.addEventListener("pointercancel", cancel);
        return () => {
            window.removeEventListener("pointerup", cancel);
            window.removeEventListener("pointercancel", cancel);
        };
    }, [held, cancel]);

    useEffect(() => () => runningRef.current?.stop(), []);

    return (
        <button
            type="button"
            className={["holdButton", className].filter(Boolean).join(" ")}
            data-cursor="hold"
            aria-label={label.join(" ")}
            onPointerDown={start}
            onPointerLeave={cancel}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") start(); }}
            onKeyUp={cancel}
        >
            <svg className="holdButton__ring" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
                {/* the hairline it sits inside when nothing is happening */}
                <motion.circle
                    className="holdButton__ring__rest"
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={R}
                    style={{ opacity: restRing }}
                />
                {/* ...and the one that runs, from the top, clockwise */}
                <motion.circle
                    className="holdButton__ring__run"
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={R}
                    strokeDasharray={CIRCUMFERENCE}
                    style={{ strokeDashoffset: dashOffset }}
                />
            </svg>

            <motion.span className="holdButton__label" style={{ scale: textScale }}>
                {label.map((line, i) => (
                    <span key={i} {...(labelProps[i] || null)}>{line}</span>
                ))}
            </motion.span>
        </button>
    );
}
