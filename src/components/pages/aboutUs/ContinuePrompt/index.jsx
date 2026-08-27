import { motion } from "framer-motion";
import HoldButton from "@/components/common/ui/HoldButton";
import { ENTERS, RISE, group } from "@/components/common/ui/entrance";
import { editable } from "@/cms/edit";

const COPY = group(0.05);

// Every line here comes from the CMS (siteCopy "o-nas.prompt" — see
// @/cms/server/site/aboutUs, where PROMPT_LINES names the positions this file
// spells as literals). These are the words it shipped with and what it falls
// back to, line by line: an empty database leaves the section saying exactly
// what it said before any of this was wired.
//
// One item per LINE rather than one per block of copy, and each line set in its
// own <span> with the <br /> between the spans rather than inside one. Both
// halves of that are the same decision: the in-place editor stores
// `textContent`, where a <br> is nothing at all, so an element holding a hard
// break would have its two lines welded together the first time anybody saved
// it. The spans are bare and inline and no rule in this section's stylesheet
// selects on `span`, so nothing about the layout changes.
const FALLBACK = {
    heading: ["Máte zájem pokračovat dál?", "Podívejte se na naši historii."],
    body: ["Od modestních začátků", "pro vytváření hodnoty", "našim klientům"],
    hold: ["Podržte", "pro", "pokračování"],
};

/** The stored line if there is one, the shipped one otherwise. */
const merge = (from, fallback) =>
    fallback.map((line, index) => (from?.[index]?.trim() ? from[index].trim() : line));

// The hinge between the team and the history: a question, and one thing to do
// about it. Short on purpose — it is a threshold, not a section, and a threshold
// that takes up a screen stops being one.
//
// Holding the button is what asks for the history. The prompt does not know what
// that is; it calls `onContinue` and the page decides.
export default function ContinuePrompt({ onContinue, onArm, copy, docId }) {
    const heading = merge(copy?.heading, FALLBACK.heading);
    const body = merge(copy?.body, FALLBACK.body);
    const hold = merge(copy?.hold, FALLBACK.hold);

    // The three words inside the button, as attributes for its own <span>s —
    // PROMPT_LINES.holdFrom is 5. Built once here rather than inside the button,
    // which has no idea what a document is.
    const holdProps = hold.map((_, index) => editable(docId, `items.${5 + index}.label`, "text"));

    return (
        <motion.section
            className="ContinuePrompt"
            initial="hidden"
            whileInView="shown"
            viewport={ENTERS}
            // Reaching the threshold is what arms the history — the page mounts
            // it, out of the flow and invisible, so that it has nothing left to
            // fetch by the time anyone holds the button. See the about page.
            onViewportEnter={onArm}
            // Its way out. It does not merely fade: it takes its own height with
            // it, so that the history rising into the space it leaves is one
            // continuous movement rather than a fade, a wait, and a jump.
            exit={{
                opacity: 0,
                y: -30,
                height: 0,
                minHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                transition: { duration: 0.55, ease: [0.5, 0, 0.75, 0] },
            }}
        >
            <motion.div className="ContinuePrompt__copy" variants={COPY}>
                <motion.h2 variants={RISE}>
                    {heading.map((line, index) => (
                        <span key={index}>
                            {index > 0 && <br />}
                            <span {...editable(docId, `items.${index}.label`, "text")}>{line}</span>
                        </span>
                    ))}
                </motion.h2>
                <motion.div className="ContinuePrompt__rule" variants={RISE} />
                <motion.p variants={RISE}>
                    {/* PROMPT_LINES.bodyFrom is 2 — the two lines of the question
                        above come first in the same list. */}
                    {body.map((line, index) => (
                        <span key={index}>
                            {index > 0 && <br />}
                            <span {...editable(docId, `items.${2 + index}.label`, "text")}>{line}</span>
                        </span>
                    ))}
                </motion.p>
                <motion.div className="ContinuePrompt__rule" variants={RISE} />
            </motion.div>

            <motion.div className="ContinuePrompt__action" variants={RISE}>
                <HoldButton label={hold} labelProps={holdProps} onComplete={onContinue} />
            </motion.div>
        </motion.section>
    );
}
