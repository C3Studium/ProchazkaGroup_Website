import { useScroll, useSpring } from "framer-motion";

// Spring-smoothed scroll progress for a section, used to draw its structural
// lines in as it enters. Default range: 0 when the section's top edge is at
// the bottom of the viewport, 1 once it reaches the top.
export function useSectionProgress(ref, offset = ["start end", "start start"]) {
    const { scrollYProgress } = useScroll({ target: ref, offset });

    return useSpring(scrollYProgress, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });
}
