"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// The page's cursor: a dot, and four corner marks that close around it over
// anything that can be used.
//
// The marks are always the same size — twenty-eight pixels, whether what is
// underneath is a small button or a photograph half the screen wide. An earlier
// version stretched the cursor to the element's exact box and became its
// border, which worked on a button and was absurd on a picture: a rectangle
// snapping four hundred pixels across the screen is a large event for a hover.
// Nothing here changes size, and nothing on the page moves to meet it.
//
// The button keeps its own corners and does its own thing on hover. These are
// the cursor's, they belong to the cursor, and they leave with it.
//
// Targets opt in with `data-cursor`, so elements mounted later are picked up
// for free — the listener is on the window and resolves through `closest`. The
// attribute's value says what to do: `frame` closes the marks, `hold` hides the
// cursor altogether for an element that draws its own.
export default function Cursor() {
    // Answered at the first render rather than corrected from the effect below.
    //
    // It used to start false and be put right after mount, which is fine on the
    // machine this was drawn on and wrong on the device it matters for: the
    // markup shipped in the server's HTML, so a phone painted a ring and a dot
    // in the top-left corner and then took them away again when hydration
    // caught up. A cursor, briefly, on a device that has no pointer to put one
    // on. `_app` loads this with `ssr: false` so there is no server render to
    // disagree with — see the note there.
    const [touch, setTouch] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches,
    );
    const [visible, setVisible] = useState(false);
    // null, "frame", or "hold". Two of the three draw something; the third is
    // the cursor getting out of the way.
    const [mode, setMode] = useState(null);
    const modeRef = useRef(null);
    // What the marks are standing on, in words, when the target says so. Only
    // the reviews use it: a card that opens looks exactly like a card that does
    // not, and there the marks alone are not an answer.
    const [label, setLabel] = useState("");
    const labelRef = useRef("");

    const x = useMotionValue(-100);
    const y = useMotionValue(-100);
    // Softer and heavier than it was, and damped hard enough that it never
    // overshoots on the way: it should read as the pointer dragging something
    // behind it, not as a second pointer keeping up. The damping ratio here is
    // about 2.3 — comfortably past critical — so the lag is all trail and no
    // wobble, which is what separates this from a cursor that feels loose.
    const FOLLOW = { stiffness: 280, damping: 58, mass: 0.55 };
    const px = useSpring(x, FOLLOW);
    const py = useSpring(y, FOLLOW);

    useEffect(() => {
        const coarse = window.matchMedia("(hover: none)").matches;
        setTouch(coarse);
        if (coarse) return;

        const onMove = (event) => {
            x.set(event.clientX);
            y.set(event.clientY);
            setVisible(true);

            const hit = event.target instanceof Element
                ? event.target.closest("[data-cursor]")
                : null;
            // `hold` means the element is drawing its own progress round itself
            // and the cursor is to stand down — two things saying the same thing
            // in the same place is one too many.
            const next = hit ? (hit.getAttribute("data-cursor") || "frame") : null;
            if (next !== modeRef.current) {
                modeRef.current = next;
                setMode(next);
            }
            const word = hit ? (hit.getAttribute("data-cursor-label") || "") : "";
            if (word !== labelRef.current) {
                labelRef.current = word;
                setLabel(word);
            }
        };

        const onOut = () => setVisible(false);

        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("mouseleave", onOut);

        return () => {
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("mouseleave", onOut);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (touch) return null;

    return (
        <div className="cursor" aria-hidden="true">
            <motion.div
                className={`cursor__mark${mode === "frame" ? " is-active" : ""}`}
                style={{ left: px, top: py, opacity: visible && mode !== "hold" ? 1 : 0 }}
            >
                <span className="cursor__dot" />
                <span className="cursor__corner cursor__corner--tl" />
                <span className="cursor__corner cursor__corner--tr" />
                <span className="cursor__corner cursor__corner--bl" />
                <span className="cursor__corner cursor__corner--br" />
                <span className={`cursor__label${label ? " is-on" : ""}`}>{label}</span>
            </motion.div>
        </div>
    );
}
