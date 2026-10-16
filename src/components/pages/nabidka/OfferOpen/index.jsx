"use client";

import { motion } from "framer-motion";

import SplitText from "@/components/common/ui/SplitText";
import { CURTAIN, ENTERS, group } from "@/components/common/ui/entrance";
import { editable } from "@/cms/edit";

// Uncovered rather than raised — the site's own gesture for a photograph (see
// PHOTO in entrance.js), applied to a sentence. A line of type that fades up
// has no direction; one that is wiped on has the page's own, and the seam above
// it has just travelled the same way.
const WIPE = {
    hidden: { clipPath: "inset(0% 0% 100% 0%)", opacity: 0 },
    shown: {
        clipPath: "inset(0% 0% 0% 0%)",
        opacity: 1,
        transition: { duration: 1.15, ease: CURTAIN },
    },
};

// And the second half a beat behind the first, so the sentence turns rather
// than arriving all at once.
const WIPE_LATE = {
    hidden: { clipPath: "inset(0% 0% 100% 0%)", opacity: 0 },
    shown: {
        clipPath: "inset(0% 0% 0% 0%)",
        opacity: 1,
        transition: { duration: 1.15, ease: CURTAIN, delay: 0.22 },
    },
};

// The threshold into the offer.
//
// This was a plane of twelve photographs held at an angle and swept in a frame
// at a time. It was a good figure and it belonged to a different site: this one
// is a dark ground, hairlines, letterspaced caps and one accent, and it has
// never once shown a contact sheet. An entrance that has to be explained is not
// an entrance.
//
// So: a line of type on the ground, arriving the way every other section on the
// site arrives — see entrance.js, which the advisor CTA, the questions block
// and the footer all share. Nothing here is pinned and nothing is driven by the
// scroll, because the whole point of what follows is that it holds still.

// What this section says with no CMS behind it. Three positions, each its own
// element: the numeral, and the two halves of the sentence — which are two
// stored strings rather than one `headline` with a break in it, because the
// line breaks with a block child and the overlay reads a block child as a line
// of its own rather than as a `<br>` inside one value.
const SHIPPED = {
    n: "03 — 06",
    first: "Poradenství není produkt.",
    second: "Je to plán, který někdo hlídá.",
};

/**
 * @param {object} [copy] the `nabidka.predel` block, from `getPageContent`.
 */
export default function OfferOpen({ copy = {} }) {
    const docId = copy.docId;
    const n = copy.n || SHIPPED.n;
    const first = copy.first || SHIPPED.first;
    const second = copy.second || SHIPPED.second;

    return (
        <section className="OfferOpen">
            <motion.div
                className="OfferOpen__body"
                variants={group()}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.p
                    {...editable(docId, "items.0.label", "text")}
                    className="OfferOpen__n"
                    variants={WIPE}
                >
                    {n}
                </motion.p>

                {/* A motion element, though it animates nothing itself.
                    Variants pass down the motion tree and not the DOM tree: a
                    plain h2 in the middle of the chain breaks it, and the two
                    halves below never hear that the section arrived. */}
                <motion.h2 className="OfferOpen__line">
                    <motion.span
                        {...editable(docId, "items.1.label", "text")}
                        className="OfferOpen__line__part"
                        variants={WIPE}
                    >
                        {first}
                    </motion.span>
                    <motion.span
                        {...editable(docId, "items.2.label", "text")}
                        className="OfferOpen__line__part OfferOpen__line__soft"
                        variants={WIPE_LATE}
                    >
                        {second}
                    </motion.span>
                </motion.h2>

                <motion.span
                    className="OfferOpen__rule"
                    variants={{
                        hidden: { scaleX: 0 },
                        shown: { scaleX: 1, transition: { duration: 1.1, ease: CURTAIN } },
                    }}
                    aria-hidden="true"
                />
            </motion.div>
        </section>
    );
}
