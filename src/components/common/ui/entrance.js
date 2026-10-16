import { cubicBezier } from "framer-motion";

// How a section arrives. Written once and shared, because three of them use it
// now — the advisor CTA, the questions-and-contact block and the footer — and
// three copies of a curve is three chances for them to drift.
//
// Everything rises the same short distance on the same easing, and the delay
// between one thing and the next is what makes it read as a section settling
// rather than a block being switched on.
export const CURTAIN = cubicBezier(0.22, 1, 0.36, 1);

export const RISE = {
    hidden: { opacity: 0, y: 24 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: CURTAIN } },
};

// A picture is not raised, it is uncovered — bottom-up, the same way the hero's
// photo and the reviews' copy open. Something that slides has to slide from
// somewhere, and for a photograph there is nowhere for it to have been.
export const PHOTO = {
    hidden: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
    shown: {
        opacity: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        transition: { duration: 0.95, ease: CURTAIN },
    },
};

// One group's worth of stagger. The delay differs per group at the call site,
// so a section's parts start in reading order rather than all together.
export const group = (delay = 0) => ({
    hidden: {},
    shown: { transition: { staggerChildren: 0.07, delayChildren: delay } },
});

// What every one of these sections passes to `whileInView`. Once only: an entry
// that replays every time the reader scrolls back up is not an entry.
export const ENTERS = { once: true, amount: 0.2 };
