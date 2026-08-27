"use client";

import { cubicBezier, motion } from "framer-motion";
import TextPressure from "@/components/common/ui/TextPressure";
import { useGlobalContext } from "@/context/LoadProvider";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// The page's opener. The wordmark treatment from the patička is used once more
// here and for the same reason it works down there: the word is the subject, so
// letting the reader push it about is the one interaction the heading can carry
// without becoming a control.
export default function ReviewsHero({ count = 0 }) {
    const { gate } = useGlobalContext();
    const go = gate === "go";
    return (
        <header className="RevHero">
            <motion.span
                className="RevHero__eyebrow"
                initial={{ opacity: 0, y: "0.7em" }}
                animate={go ? { opacity: 1, y: "0em" } : undefined}
                transition={{ duration: 0.6, ease: GLIDE, delay: 0.08 }}
            >
                Recenze
            </motion.span>

            {/* Its own box, not the whole header — the letters answer the
                pointer, and a hero-sized catchment would have them reacting to
                a hand that is nowhere near them. */}
            <motion.div
                className="RevHero__word"
                initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
                animate={go ? { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" } : undefined}
                transition={{ duration: 0.9, ease: GLIDE, delay: 0.15 }}
            >
                <TextPressure text="Co o nás říkají" size={8.4} />
            </motion.div>

            <motion.div
                className="RevHero__foot"
                initial={{ opacity: 0 }}
                animate={go ? { opacity: 1 } : undefined}
                transition={{ duration: 0.68, ease: GLIDE, delay: 0.35 }}
            >
                <motion.span
                    className="RevHero__rule"
                    initial={{ scaleX: 0 }}
                    animate={go ? { scaleX: 1 } : undefined}
                    transition={{ duration: 0.83, ease: GLIDE, delay: 0.3 }}
                />
                <p className="RevHero__line">
                    Každou z nich napsal někdo,<br />kdo si nás vybral.
                </p>
                <span className="RevHero__count">
                    {String(count).padStart(2, "0")}<em> recenzí</em>
                </span>
            </motion.div>
        </header>
    );
}
