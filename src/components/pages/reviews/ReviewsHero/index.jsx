"use client";

import { Fragment } from "react";
import { cubicBezier, motion } from "framer-motion";
import TextPressure from "@/components/common/ui/TextPressure";
import { editable } from "@/cms/edit";
import { useGlobalContext } from "@/context/LoadProvider";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// What this header says when the CMS says nothing — a missing table, an empty
// database, or a store written before this block existed. In one place so the
// fallbacks read as the document they are rather than as defaults scattered
// through the markup. `seedReviewsPage.js` was generated out of these exact
// strings; changing one here without changing it there makes the page say two
// different things depending on whether a query answered.
const SHIPPED = {
    eyebrow: "Recenze",
    word: "Co o nás říkají",
    line: ["Každou z nich napsal někdo,", "kdo si nás vybral."],
};

// The page's opener. The wordmark treatment from the patička is used once more
// here and for the same reason it works down there: the word is the subject, so
// letting the reader push it about is the one interaction the heading can carry
// without becoming a control.
//
// @param {object} [copy] this block, from `getPageContent("/recenze")`. Absent
//   or half-read is the ordinary case rather than an error: every line falls
//   back to what the component ships with.
export default function ReviewsHero({ count = 0, copy = {} }) {
    const { gate } = useGlobalContext();
    const go = gate === "go";
    const docId = copy.docId;
    const eyebrow = copy.eyebrow || SHIPPED.eyebrow;
    const word = copy.word || SHIPPED.word;
    const line = copy.line?.length ? copy.line : SHIPPED.line;
    return (
        <header className="RevHero">
            <motion.span
                className="RevHero__eyebrow"
                initial={{ opacity: 0, y: "0.7em" }}
                animate={go ? { opacity: 1, y: "0em" } : undefined}
                transition={{ duration: 0.6, ease: GLIDE, delay: 0.08 }}
                {...editable(docId, "title", "text")}
            >
                {eyebrow}
            </motion.span>

            {/* Its own box, not the whole header — the letters answer the
                pointer, and a hero-sized catchment would have them reacting to
                a hand that is nowhere near them. */}
            {/* The annotation is on this box and not on the word inside it:
                TextPressure sets one `<span>` per letter and forwards no rest
                props, so the box that holds the whole word is the only element
                whose text is the stored value. The overlay flattens an element
                to a single text node while it is being edited and moves the
                originals back afterwards — which is what WhoWeAre's
                per-character reveal already relies on. */}
            <motion.div
                className="RevHero__word"
                initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
                animate={go ? { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" } : undefined}
                transition={{ duration: 0.9, ease: GLIDE, delay: 0.15 }}
                {...editable(docId, "body", "text")}
            >
                <TextPressure text={word} size={8.4} />
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
                {/* One element holding a hard break, so one stored string with
                    a `\n` in it — the shape every hand-broken element on this
                    site has. One `<br />` between lines and no wrapper, because
                    the annotation goes on the element that holds them. */}
                <p className="RevHero__line" {...editable(docId, "headline", "text")}>
                    {line.map((text, at) => (
                        <Fragment key={at}>{at > 0 ? <br /> : null}{text}</Fragment>
                    ))}
                </p>
                {/* Unannotated, and it has to be: the number is how many
                    reviews came back rather than a stored value, and the word
                    beside it is an `<em>` whose text begins with a space —
                    which a contentEditable will not hand back unchanged. */}
                <span className="RevHero__count">
                    {String(count).padStart(2, "0")}<em> recenzí</em>
                </span>
            </motion.div>
        </header>
    );
}
