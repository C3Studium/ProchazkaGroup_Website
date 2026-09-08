import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const alphabet = [
    { letter: "A", index: 0 },
    { letter: "Á", index: 1 },
    { letter: "B", index: 2 },
    { letter: "C", index: 3 },
    { letter: "Č", index: 4 },
    { letter: "D", index: 5 },
    { letter: "Ď", index: 6 },
    { letter: "E", index: 7 },
    { letter: "É", index: 8 },
    { letter: "Ě", index: 9 },
    { letter: "F", index: 10 },
    { letter: "G", index: 11 },
    { letter: "H", index: 12 },
    { letter: "I", index: 13 },
    { letter: "Í", index: 14 },
    { letter: "J", index: 15 },
    { letter: "K", index: 16 },
    { letter: "L", index: 17 },
    { letter: "M", index: 18 },
    { letter: "N", index: 19 },
    { letter: "Ň", index: 20 },
    { letter: "O", index: 21 },
    { letter: "Ó", index: 22 },
    { letter: "P", index: 23 },
    { letter: "Q", index: 24 },
    { letter: "R", index: 25 },
    { letter: "Ř", index: 26 },
    { letter: "S", index: 27 },
    { letter: "Š", index: 28 },
    { letter: "T", index: 29 },
    { letter: "Ť", index: 30 },
    { letter: "U", index: 31 },
    { letter: "Ú", index: 32 },
    { letter: "Ů", index: 33 },
    { letter: "V", index: 34 },
    { letter: "W", index: 35 },
    { letter: "X", index: 36 },
    { letter: "Y", index: 37 },
    { letter: "Ý", index: 38 },
    { letter: "Z", index: 39 },
    { letter: "Ž", index: 40 },
    { letter: "", index: 41 },
    { letter: " ", index: 42 },
];
const findAlphabetIndex = (char) => {
    const normalized = typeof char === "string" ? char.toUpperCase() : "";
    const found = alphabet.find((item) => item.letter === normalized);
    if (found) return found.index;
    const fallback = alphabet.find((item) => item.letter === "");
    return fallback ? fallback.index : 26;
};

// x2 must sit in [0,1]: framer hands opacity tweens to WAAPI, and WAAPI
// (unlike the JS interpolator this curve was written for) rejects a bezier
// with an out-of-range x — which threw mid-swap and broke the menu text.
const SPIN_EASE = [0.6, 0.05, 0, 0.9];

// One column of the word: a 1ch window the alphabet track scrolls behind.
// The window itself is animated too — a column that has no letter in the new
// word closes to zero width on the same clock the others spin on, so the word
// (and whatever button wears it) changes width as one continuous gesture
// instead of snapping when the letter count changes.
const AlphabetChar = ({ char, duration = 0.5 }) => {
    const index = findAlphabetIndex(char);
    const size = { duration, ease: SPIN_EASE };
    const trackRef = useRef(null);

    // How far the track has to travel to bring this letter into the window —
    // measured off the letter, not calculated from its position in the alphabet.
    //
    // It was `-(index * 100)%`, and that asks two independent parts of the
    // engine for the same length: the transform resolves a percentage of the
    // track's used height, while the letters are a stack of `1em` cells laid
    // out one after another. Whenever those two disagree — and they may, since
    // one is a single multiplication and the other is forty-three roundings —
    // the error is multiplied by the index. Blink lands both on the same value
    // at every width and pixel ratio measured, so it never showed there; on
    // WebKit it did, and it showed on the highest index in the word: Z is 39th
    // in this alphabet, against 25 for R and 1 for Á. Reported as the Z of
    // PROCHÁZKA sitting high with the Ž behind it creeping into view, which is
    // what a few pixels of drift look like when the window only has a couple to
    // give (see the trim in styles.scss).
    //
    // The difference between the two rects is the letter's offset inside the
    // track, and it is invariant under the track's own transform — both boxes
    // carry it — so this can be read at any point in the spin and needs no
    // co-ordination with the animation.
    const [offset, setOffset] = useState(null);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const measure = () => {
            const cell = track.children[index];
            if (!cell) return;
            const box = track.getBoundingClientRect();
            // A column inside a `display: none` branch — the third word of the
            // bar is one on a phone — measures zero for everything. Taking that
            // as an offset would park every letter on A.
            if (!box.height) return;
            const next = cell.getBoundingClientRect().top - box.top;
            setOffset((prev) => (prev !== null && Math.abs(prev - next) < 0.01 ? prev : next));
        };

        measure();

        // The offsets are all multiples of the cell, so they move whenever the
        // cell does: a breakpoint changing the type size, the root ramp past
        // 1920, an orientation change. Observing the track catches each of
        // those without listening for any of them by name.
        const watch = new ResizeObserver(measure);
        watch.observe(track);
        // And once more when the web font lands, which changes the cell height
        // under a layout that has already been measured against the fallback.
        document.fonts?.ready?.then(measure).catch(() => {});

        return () => watch.disconnect();
    }, [index]);

    // The arithmetic is still what the server renders and what the first client
    // frame uses; the effect above replaces it before the spin is over. Keeping
    // it means a column with nothing to measure yet is never parked on A.
    const translateY = offset === null ? `${-(index * 100)}%` : -offset;

    return (
        <motion.span
            className="scrollToText__char"
            initial={{ width: "0ch", marginLeft: "0rem", marginRight: "0rem", opacity: 0 }}
            animate={{ width: "1ch", marginLeft: "0.15rem", marginRight: "0.15rem", opacity: 1 }}
            exit={{ width: "0ch", marginLeft: "0rem", marginRight: "0rem", opacity: 0 }}
            transition={size}
        >
            <motion.span
                ref={trackRef}
                className="scrollToText__char__track"
                animate={{ y: translateY }}
                transition={{ duration, ease: SPIN_EASE }}
            >
                {alphabet.map((item) => (
                    <span key={`${item.letter}-${item.index}`} className="scrollToText__char__letter">
                        {item.letter}
                    </span>
                ))}
            </motion.span>
        </motion.span>
    );
};

export const ScrollToText = ({ text = "", duration = 0.6 }) => {
    const chars = useMemo(() => text.split(""), [text]);

    return (
        <p className="scrollToText">
            {/* Keyed by POSITION, not by letter: when the word changes, each
                column that survives spins its track to the new letter instead
                of being torn down, and only the head-count difference enters
                or leaves — through the width animation above. */}
            <AnimatePresence initial={false}>
                {chars.map((char, index) => (
                    <AlphabetChar
                        key={index}
                        char={char}
                        duration={duration}
                    />
                ))}
            </AnimatePresence>
        </p>
    );
};
