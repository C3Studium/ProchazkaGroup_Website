"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

// What happens between two sections.
//
// The page had eight of them stacked end to end, each arriving by fading up,
// and a fade is not a transition — it is the absence of one. Every seam here
// gets the same thing instead: a hairline leaves the section above at one
// point, crosses the gap, and lands on the section below at another, drawing
// itself as the seam goes by. It is the offer wall's own connector, which ties
// its rows together, promoted to tie the sections together.
//
// Drawn by scroll rather than on arrival, so the line is being laid down at
// exactly the pace the reader is travelling and stops when they stop.
export default function Seam({ from = 0.5, to = 0.5, bend = 0.5, tall = 18 }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const drawn = useSpring(
        useTransform(scrollYProgress, [0.18, 0.62], [0, 1], { clamp: true }),
        { stiffness: 220, damping: 34, restDelta: 0.001 },
    );
    const land = useTransform(drawn, [0.86, 1], [0, 1], { clamp: true });

    const d = `M${(from * 100).toFixed(2)},0 V${(bend * 100).toFixed(2)} H${(to * 100).toFixed(
        2,
    )} V100`;

    return (
        <div
            className="Seam"
            ref={ref}
            // Height and the landing dot are both derived from props that only
            // exist here, and both have to survive a stylesheet that changes
            // the side padding at narrow widths — so the numbers are handed to
            // CSS as custom properties and CSS does the arithmetic against
            // whichever padding is in force. See --seam-pad in styles.scss.
            //
            // The dot used to be positioned as `${to}%` of this box plus a flat
            // 6vw margin, which is the padding added rather than the inset
            // applied: the path lands at 6vw + to x (100% - 12vw) and the dot
            // sat 91px to the right of it at 1512, on a seam that goes straight
            // down the middle. It only agreed with the line at to = 0.
            style={{ "--seam-tall": tall, "--seam-to": to }}
            aria-hidden="true"
        >
            <svg className="Seam__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* The same line twice, a hair apart — one line seen from
                    slightly the wrong place, which is the cheapest depth there
                    is and the offer wall's own trick. */}
                <motion.path
                    d={`M${((from + 0.008) * 100).toFixed(2)},0 V${((bend + 0.05) * 100).toFixed(
                        2,
                    )} H${((to + 0.008) * 100).toFixed(2)} V100`}
                    className="Seam__ghost"
                    vectorEffect="non-scaling-stroke"
                    style={{ pathLength: drawn }}
                />
                <motion.path
                    d={d}
                    className="Seam__line"
                    vectorEffect="non-scaling-stroke"
                    style={{ pathLength: drawn }}
                />
                <path d={d} className="Seam__walk" vectorEffect="non-scaling-stroke" />
            </svg>

            <motion.span className="Seam__stop" style={{ opacity: land, scale: land }} />
        </div>
    );
}
