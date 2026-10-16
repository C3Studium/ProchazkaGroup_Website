"use client";

import React, {
    Children,
    cloneElement,
    forwardRef,
    isValidElement,
    useEffect,
    useMemo,
    useRef,
} from "react";
import gsap from "gsap";

// A deck that deals itself: the front card drops away, everything behind it
// steps forward one place, and the dropped card slides in at the back.
//
// This is the component as it was given, on GSAP, and the timings, the easing
// and the geometry are all its own. It was ported to framer-motion first, to
// avoid a second animation engine in the bundle, and that was the wrong call:
// framer's `animate()` on a plain DOM element does not keep a record of the
// element's transform between calls the way GSAP does, so chained tweens on the
// same card started from whatever the computed style happened to be and fought
// each other. The deck stuttered. GSAP is built for exactly this — a transform
// record per element, and a timeline with labels — so it does it.
//
// Only the surface is ours: the cards are square-cornered and ruled with the
// page's own hairline rather than rounded and outlined in solid white.
export const Card = forwardRef(({ customClass, ...rest }, ref) => (
    <div
        ref={ref}
        {...rest}
        className={`card ${customClass ?? ""} ${rest.className ?? ""}`.trim()}
    />
));
Card.displayName = "Card";

// How far the front card falls before it starts back, and how much further
// behind the deck it goes on the way. Both were shorter: the return was a single
// diagonal from where the card had dropped to the back slot, and that line runs
// straight through the cards it is supposed to pass behind. Now it drops clear,
// pushes back, comes up, and only then slides forward into place.
const DROP = 640;
const DEPTH = 320;

const makeSlot = (i, distX, distY, total) => ({
    x: i * distX,
    y: -i * distY,
    z: -i * distX * 1.5,
    zIndex: total - i,
});

const placeNow = (el, slot, skew) =>
    gsap.set(el, {
        x: slot.x,
        y: slot.y,
        z: slot.z,
        xPercent: -50,
        yPercent: -50,
        skewY: skew,
        transformOrigin: "center center",
        zIndex: slot.zIndex,
        force3D: true,
    });

const CardSwap = ({
    width = 500,
    height = 400,
    cardDistance = 60,
    verticalDistance = 70,
    delay = 5000,
    pauseOnHover = false,
    onCardClick,
    skewAmount = 6,
    easing = "elastic",
    children,
}) => {
    const config =
        easing === "elastic"
            ? {
                ease: "elastic.out(0.6,0.9)",
                durDrop: 2,
                durMove: 2,
                durReturn: 2,
                promoteOverlap: 0.9,
                returnDelay: 0.05,
            }
            : {
                ease: "power1.inOut",
                durDrop: 0.8,
                durMove: 0.8,
                durReturn: 0.8,
                promoteOverlap: 0.45,
                returnDelay: 0.2,
            };

    const childArr = useMemo(() => Children.toArray(children), [children]);
    const refs = useMemo(
        () => childArr.map(() => React.createRef()),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [childArr.length],
    );

    const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));

    const tlRef = useRef(null);
    const intervalRef = useRef();
    const container = useRef(null);

    useEffect(() => {
        const total = refs.length;
        if (!total) return;
        refs.forEach((r, i) =>
            placeNow(r.current, makeSlot(i, cardDistance, verticalDistance, total), skewAmount),
        );

        const swap = () => {
            if (order.current.length < 2) return;

            const [front, ...rest] = order.current;
            const elFront = refs[front].current;
            const tl = gsap.timeline();
            tlRef.current = tl;

            tl.to(elFront, {
                y: `+=${DROP}`,
                duration: config.durDrop,
                ease: config.ease,
            });

            tl.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);
            rest.forEach((idx, i) => {
                const el = refs[idx].current;
                const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
                tl.set(el, { zIndex: slot.zIndex }, "promote");
                tl.to(
                    el,
                    {
                        x: slot.x,
                        y: slot.y,
                        z: slot.z,
                        duration: config.durMove,
                        ease: config.ease,
                    },
                    `promote+=${i * 0.15}`,
                );
            });

            const backSlot = makeSlot(
                refs.length - 1,
                cardDistance,
                verticalDistance,
                refs.length,
            );
            tl.addLabel("return", `promote+=${config.durMove * config.returnDelay}`);
            tl.call(
                () => {
                    gsap.set(elFront, { zIndex: backSlot.zIndex });
                },
                undefined,
                "return",
            );
            // The way back, in three moves rather than one straight line.
            //
            // First deeper, while it is still below everything — that is what
            // takes it out of the other cards' path instead of through them.
            tl.to(
                elFront,
                {
                    z: backSlot.z - DEPTH,
                    duration: config.durReturn * 0.45,
                    ease: "power2.inOut",
                },
                "return",
            );

            // Then up and across to the back slot, which is the long move and
            // keeps the component's own easing.
            tl.to(
                elFront,
                {
                    x: backSlot.x,
                    y: backSlot.y,
                    duration: config.durReturn * 0.85,
                    ease: config.ease,
                },
                `return+=${config.durReturn * 0.22}`,
            );

            // ...and only once it is there does it come forward into the deck.
            tl.to(
                elFront,
                {
                    z: backSlot.z,
                    duration: config.durReturn * 0.5,
                    ease: "power2.out",
                },
                `return+=${config.durReturn * 0.7}`,
            );

            tl.call(() => {
                order.current = [...rest, front];
            });
        };

        swap();
        intervalRef.current = window.setInterval(swap, delay);

        if (pauseOnHover) {
            const node = container.current;
            const pause = () => {
                tlRef.current?.pause();
                clearInterval(intervalRef.current);
            };
            const resume = () => {
                tlRef.current?.play();
                intervalRef.current = window.setInterval(swap, delay);
            };
            node.addEventListener("mouseenter", pause);
            node.addEventListener("mouseleave", resume);
            return () => {
                node.removeEventListener("mouseenter", pause);
                node.removeEventListener("mouseleave", resume);
                clearInterval(intervalRef.current);
            };
        }
        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing]);

    const rendered = childArr.map((child, i) =>
        isValidElement(child)
            ? cloneElement(child, {
                key: i,
                ref: refs[i],
                style: { width, height, ...(child.props.style ?? {}) },
                onClick: (e) => {
                    child.props.onClick?.(e);
                    onCardClick?.(i);
                },
            })
            : child,
    );

    return (
        <div ref={container} className="card-swap-container" style={{ width, height }}>
            {rendered}
        </div>
    );
};

export default CardSwap;
