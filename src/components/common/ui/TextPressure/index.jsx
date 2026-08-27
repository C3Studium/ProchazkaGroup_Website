"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Ported from https://codepen.io/JuanFuentes/full/rgXKGQ. Each letter reads its
// own distance from the pointer and sets its own weight and width, so the word
// thickens and spreads where the hand is and thins away from it.
//
// It runs on Roboto Flex, the variable face the original uses. That is a
// different typeface from the rest of the site, which is set in Switzer — a
// deliberate trade, and a one-line one to undo: Switzer ships a variable cut
// too, but it carries a single axis (`wght` 100–900, checked in its fvar
// table), so on it this is weight alone. Roboto Flex has both weight and width,
// which is what the effect was built on.
//
// The reference also animates an `ital` axis. Roboto Flex does not have one —
// it has `slnt` — so that setting was doing nothing, and it is not here.
//
// Two other differences. It does not inject a `<style>` block with an `@import`
// in it; the face is loaded with the site's other fonts and the rules live in
// styles.scss. And the pointer is read from the word's own box rather than from
// the window, so the letters answer a hand that is on them, not one anywhere in
// the footer — and they relax when it leaves.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Distance in, weight out: on top of the pointer it is `max`, a title's
// half-width away it is `min`.
const byDistance = (distance, reach, min, max) =>
    clamp(max - (max * distance) / reach, min, max);

export default function TextPressure({
    text = "Procházka Group",
    // In vw, so it tracks the viewport the way the rest of the page's type does.
    size = 7,
    minWeight = 120,
    maxWeight = 900,
    minWidth = 60,
    maxWidth = 145,
    // How much of the pointer's move each frame the word takes up. Low is
    // heavy: the letters settle behind the hand rather than snapping to it.
    ease = 0.12,
    className = "",
}) {
    const containerRef = useRef(null);
    const titleRef = useRef(null);
    const charsRef = useRef([]);

    // Where the pointer is, and where the effect has caught up to.
    const pointer = useRef({ x: 0, y: 0 });
    const eased = useRef({ x: 0, y: 0 });

    const [fontSize, setFontSize] = useState(0);
    const chars = Array.from(text);

    // Sized off the viewport rather than stretched to fill the box: the word is
    // a wordmark, not a rule across the footer, and letting it set its own size
    // is what keeps it reading as one.
    const measure = useCallback(() => {
        setFontSize((window.innerWidth * size) / 100);
    }, [size]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // At rest the pointer is nowhere near it, so the word starts light and
        // only thickens once a hand is actually on it.
        const centre = () => {
            const box = container.getBoundingClientRect();
            const away = { x: box.left + box.width / 2, y: box.top + box.height * 6 };
            pointer.current = { ...away };
            eased.current = { ...away };
        };
        centre();
        measure();

        const onMove = (event) => {
            pointer.current.x = event.clientX;
            pointer.current.y = event.clientY;
        };

        // Off the word, the pointer is treated as being a long way off, which
        // is what walks every letter back to its resting weight instead of
        // freezing them wherever the hand left them.
        const onLeave = () => {
            const box = container.getBoundingClientRect();
            pointer.current.x = box.left + box.width / 2;
            pointer.current.y = box.top + box.height * 6;
        };

        container.addEventListener("pointermove", onMove, { passive: true });
        container.addEventListener("pointerleave", onLeave);

        const sizeWatch = new ResizeObserver(measure);
        sizeWatch.observe(container);

        let raf = 0;
        const frame = () => {
            raf = requestAnimationFrame(frame);
            eased.current.x += (pointer.current.x - eased.current.x) * ease;
            eased.current.y += (pointer.current.y - eased.current.y) * ease;

            const title = titleRef.current?.getBoundingClientRect();
            if (!title?.width) return;
            const reach = title.width / 2;

            for (const span of charsRef.current) {
                if (!span) continue;
                const box = span.getBoundingClientRect();
                const dx = eased.current.x - (box.x + box.width / 2);
                const dy = eased.current.y - (box.y + box.height / 2);
                const distance = Math.hypot(dx, dy);
                const weight = Math.round(byDistance(distance, reach, minWeight, maxWeight));
                const wdth = Math.round(byDistance(distance, reach, minWidth, maxWidth));
                const setting = `'wght' ${weight}, 'wdth' ${wdth}`;
                if (span.style.fontVariationSettings !== setting) {
                    span.style.fontVariationSettings = setting;
                }
            }
        };

        // Only while it is on screen. The footer spends most of a visit below
        // the fold, and this loop reads a rect per letter per frame.
        const watcher = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !raf) {
                    centre();
                    raf = requestAnimationFrame(frame);
                } else if (!entry.isIntersecting && raf) {
                    cancelAnimationFrame(raf);
                    raf = 0;
                }
            },
            { threshold: 0 },
        );
        watcher.observe(container);

        return () => {
            container.removeEventListener("pointermove", onMove);
            container.removeEventListener("pointerleave", onLeave);
            sizeWatch.disconnect();
            watcher.disconnect();
            cancelAnimationFrame(raf);
        };
    }, [ease, measure, minWeight, maxWeight, minWidth, maxWidth]);

    return (
        <div ref={containerRef} className={["textPressure", className].filter(Boolean).join(" ")}>
            <span
                ref={titleRef}
                className="textPressure__word"
                style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}
                aria-label={text}
            >
                {chars.map((char, i) => (
                    <span
                        key={i}
                        aria-hidden="true"
                        ref={(el) => { charsRef.current[i] = el; }}
                        className={char === " " ? "textPressure__space" : "textPressure__char"}
                    >
                        {char === " " ? " " : char}
                    </span>
                ))}
            </span>
        </div>
    );
}
