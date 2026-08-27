"use client";

import { cubicBezier, motion, useTransform } from "framer-motion";

// Text split into words, each rising into place on its own slice of a scroll
// progress value. The slices overlap heavily, so it reads as one wave rather
// than as separate words popping in.

// Words glide to a stop instead of arriving at constant speed — without an
// ease here useTransform interpolates linearly, which is what makes a
// scroll-linked reveal feel mechanical.
const GLIDE = cubicBezier(0.22, 1, 0.36, 1);
const FADE = cubicBezier(0.4, 0, 0.2, 1);

const Word = ({ children, progress, start, end, rise }) => {
    // Opacity finishes well before the movement does: the word is already
    // readable while it is still settling, which reads as fluid rather than
    // as "appear, then move".
    const fadeEnd = start + (end - start) * 0.6;

    const opacity = useTransform(progress, [start, fadeEnd], [0, 1], { ease: FADE });
    const y = useTransform(progress, [start, end], [rise, "0em"], { ease: GLIDE });

    return (
        <motion.span className="splitText__word" style={{ opacity, y }}>
            {children}
        </motion.span>
    );
};

export default function SplitText({
    text,
    progress,
    from = 0,
    to = 1,
    // Wide relative to the gap between words on purpose: the more the slices
    // overlap, the more the reveal reads as one continuous motion.
    window: wordWindow = 0.3,
    rise = "0.45em",
    className = "",
    // Forwarded onto the wrapper, and the only reason this component takes rest
    // props at all: a heading revealed word by word is still one editable string,
    // and `editable()` has to be able to put its attributes on something. A
    // spread changes no layout, no timing and no transform — which is the whole
    // argument for annotating with attributes instead of wrapper elements.
    ...rest
}) {
    const words = text.split(" ");
    const travel = Math.max(0.0001, to - from - wordWindow);
    const lastIndex = Math.max(1, words.length - 1);

    return (
        <span {...rest} className={`splitText ${className}`.trim()}>
            {words.map((word, i) => {
                const start = from + (i / lastIndex) * travel;
                return (
                    <span key={`${word}-${i}`}>
                        <Word progress={progress} start={start} end={start + wordWindow} rise={rise}>
                            {word}
                        </Word>
                        {i < words.length - 1 ? " " : ""}
                    </span>
                );
            })}
        </span>
    );
}
