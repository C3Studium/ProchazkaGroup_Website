// The page's arrow, drawn rather than typed. Every arrow on it used to be a
// glyph — ↓ ↗ → — which meant its weight, its proportions and its optical
// centre came from whichever font happened to resolve that codepoint, and none
// of the three agreed with each other or with the hairline rules they sit
// beside. This is one shape, stroked in currentColor at a weight that matches
// those rules, and it turns rather than being redrawn per direction.
//
// Sized in `em`, so it takes the font-size of whatever it is dropped into and
// every existing call site keeps the size it already had.
export default function Arrow({ direction = "right", className = "" }) {
    return (
        <svg
            className={`arrowIcon arrowIcon--${direction} ${className}`.trim()}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M3.5 12h16" />
            <path d="M13.5 5.5 20 12l-6.5 6.5" />
        </svg>
    );
}

// The nudge every "scroll down" cue on the page runs. Exported rather than
// written out four times: they are the same gesture and there is no reading of
// the page on which one of them should drift out of step with the others.
//
// It travels between +5 and -5 rather than from 0, so the arrow's rest position
// is the middle of the movement and the cue reads as hovering rather than as
// being tugged downwards. Eased at both ends — a linear shuttle reads as a
// mechanism, and this is meant to read as breathing.
export const SCROLL_NUDGE = {
    animate: { y: [5, -5] },
    transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatType: "reverse",
        ease: [0.45, 0, 0.55, 1],
    },
};
