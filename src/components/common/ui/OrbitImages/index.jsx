"use client";

// Port of Dominik Koch's OrbitImages (https://x.com/dominikkoch), converted to
// JS and framer-motion. The items ride the path unconditionally; what the
// caller drives from scroll is the stage around them.
//
// The ring is a real circle laid flat in space and tipped towards the camera,
// not an ellipse. The oval you see is the projection, which means depth is
// genuine: a logo on the near side is closer to the lens and comes out larger
// and moving faster than one on the far side, for nothing. Flattening an
// ellipse with scaleY looks similar in a still frame and reads as a conveyor
// belt in motion, because everything on it is the same size however far away
// it is meant to be.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";

// Where on the path an item is nearest the camera. The path starts at the left
// of the circle and sweeps under it, so a quarter of the way round is the point
// that the tip brings towards the lens: dead centre of the frame, largest, and
// moving fastest. Items are uncovered against their arrival there.
const NEAR_POINT = 25;

function generateEllipsePath(cx, cy, rx, ry) {
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
}

function generateCirclePath(cx, cy, r) {
    return generateEllipsePath(cx, cy, r, r);
}

/**
 * One entry of `images`, in either shape it may arrive in.
 *
 * The ring shipped taking bare URL strings and still takes them. An entry may
 * instead be an object, which is how a logo gets an identity: `attrs` is spread
 * onto the `<img>` and is where the visual editor's annotation for the document
 * behind that logo arrives — the ring itself knows nothing about a CMS, and
 * should not, since it is a port of somebody else's component.
 *
 * Both shapes are accepted rather than one being migrated to, because the caller
 * and its data change on different days: the fallback list a section falls back
 * to is bare strings, and a CMS that has not yet learned to send an id must not
 * be able to empty the ring.
 *
 * Nothing downstream reads any of this. The entry resolves to the same `src`
 * either way, `attrs` never reaches the path, the timeline or the transform
 * chain, and the rendered element is identical but for the attributes — which is
 * the whole argument for annotating with attributes in the first place.
 */
function orbitEntry(entry) {
    if (typeof entry === "string") return entry ? { src: entry, attrs: null } : null;
    const src = typeof entry?.src === "string" ? entry.src : "";
    return src ? { src, attrs: entry.attrs || null } : null;
}




function OrbitItem({
    item, index, totalItems, path, itemWidth, itemHeight, rotation,
    progress, fill, spin, aspect, size, span, tilt, open, lead,
}) {
    // Slots run backwards round the path. Advancing the ring moves items
    // forward along it, so the one that arrives next at a fixed point is the
    // one behind — laying them out in index order would bring them to the
    // centre as 0, n-1, n-2 and so on. Reversed, they arrive in the order they
    // are listed.
    const slot = fill ? -(index / totalItems) * 100 : 0;

    // Two ways in, whichever is further along. While the ring is edge-on the
    // items are uncovered by arriving at the near point, so each one lights up
    // a little way out and is already travelling by the time it is big enough
    // to read — nothing appears in the middle of the frame. Once the ring opens
    // there is no near point to arrive at, so the rest come up together.
    const arriveSpin = NEAR_POINT - slot;
    const arriving = useTransform(spin, [arriveSpin - lead, arriveSpin - lead * 0.35], [0, 1]);
    const opacity = useTransform([arriving, open], ([a, o]) => Math.max(a, o));
    // `span` is the share of the path the items are spread over. At 1 they ring
    // the whole orbit; below 0.5 they all sit on a single arc of it, which is
    // the only way to get a genuine straight line out of a flattened ellipse —
    // flatten one with items all the way round and the near and far arcs
    // collapse onto each other, so logos from opposite sides of the orbit land
    // on top of one another.
    //
    // `spin` is an extra, scroll-driven shove along the path on top of the
    // steady turn — the ring can be made to sweep hard through one phase of the
    // timeline without touching the base animation's duration.
    const offsetPercent = useTransform([progress, spin, span], ([p, extra, sp]) => (
        (((p + extra + slot * sp) % 100) + 100) % 100
    ));
    const offsetDistance = useTransform(offsetPercent, (v) => `${v}%`);


    // Two corrections, both applied here rather than on the stage.
    //
    // `aspect` is the stage's scaleX/scaleY, on Y only: when the ring is scaled
    // unevenly the items ride that distortion, and undoing it leaves each logo
    // square-on however oval the ring is.
    //
    // `size` is the logo's own scale, independent of the ring's. Without it a
    // logo is locked to the ring's width, so stretching the orbit out to fly
    // past the camera would blow the wordmarks up by the same factor and they
    // would overlap end to end however far apart their slots were. With it the
    // ring can be made enormous while the logos stay a readable size, which is
    // what puts real gaps between them.
    const scaleX = size;
    const scaleY = useTransform([size, aspect], ([s, a]) => s * a);

    // Billboard: undo the ring's tip so the logo stays square to the camera
    // while its position keeps the full projection. Without it the wordmarks
    // lie down flat with the ring and become unreadable edge-on.
    // Exact only because the ring carries no z-roll of its own — that lives on
    // a wrapper outside the perspective, so this is a straight cancellation
    // rather than two rotations that nearly undo each other.
    const faceCamera = useTransform(tilt, (t) => -t);

    // The order of these two matters and is easy to get backwards. The ring's
    // tilt has to be undone *outside* the scale, not inside it: a rotation
    // sandwiched inside an uneven scale is a shear, and the wordmarks come out
    // visibly slanted while the ring is open. Counter-rotating on the element
    // that rides the path, and scaling on the one within it, leaves the whole
    // chain a similarity at every point of the timeline.
    return (
        <motion.div
            className="orbit-item"
            style={{
                width: itemWidth,
                height: itemHeight,
                offsetPath: `path("${path}")`,
                offsetRotate: "0deg",
                offsetAnchor: "center center",
                offsetDistance,
                rotate: -rotation,
                rotateX: faceCamera,
                opacity,
            }}
        >
            <motion.div
                className="orbit-item__inner"
                style={{ scaleX, scaleY }}
            >
                {item}
            </motion.div>
        </motion.div>
    );
}

export default function OrbitImages({
    images = [],
    altPrefix = "Logo partnera",
    shape = "ellipse",
    baseWidth = 1400,
    radiusX = 700,
    radiusY = 170,
    radius = 300,
    rotation = -8,
    duration = 40,
    itemSize = 64,
    itemWidth,
    itemHeight,
    direction = "normal",
    fill = true,
    className = "",
    showPath = false,
    pathColor = "rgba(255, 255, 255, 0.18)",
    pathWidth = 1,
    easing = "linear",
    paused = false,
    responsive = true,
    spinBoost,      // MotionValue — extra travel along the path, in path %
    sizeFix,        // MotionValue — logo scale, independent of the ring's
    spanFactor,     // MotionValue — share of the path the items occupy
    openProgress,   // MotionValue 0..1 — brings up whatever has not arrived yet
    driftFactor,    // MotionValue 0..1 — how much of the steady turn is running
    revealLead = 12, // path %, how far ahead of the centre an item lights up
    tiltX,          // MotionValue (deg) — how far the ring is tipped from flat
    perspective,    // MotionValue (px) — lens distance; lower is a wider lens
    aspectFix,      // MotionValue — stage scaleX/scaleY, undone on each item
    pathProgress,   // MotionValue 0..1 — draws the track round
    pathOpacity,    // MotionValue — lets the track fade independently
}) {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(null);

    const designCenter = baseWidth / 2;

    const path = useMemo(() => (
        shape === "circle"
            ? generateCirclePath(designCenter, designCenter, radius)
            : generateEllipsePath(designCenter, designCenter, radiusX, radiusY)
    ), [shape, designCenter, radiusX, radiusY, radius]);

    useLayoutEffect(() => {
        if (!responsive || !containerRef.current) return;
        const updateScale = () => {
            if (!containerRef.current) return;
            setScale(containerRef.current.clientWidth / baseWidth);
        };
        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [responsive, baseWidth]);

    // The steady turn accumulates rather than looping a tween. A repeating
    // animation starts when the component mounts, so by the time the section is
    // scrolled to, the ring is at whatever angle the clock happens to have
    // reached — and an opening that puts a particular logo at the centre needs
    // to know where the ring is. `drift` gates it: at 0 the position is the
    // scroll's alone and therefore the same every time; brought up later, the
    // orbit is alive again without ever having moved unbidden.
    const progress = useMotionValue(0);
    const rate = (direction === "reverse" ? -100 : 100) / Math.max(duration, 0.01);

    useAnimationFrame((_, delta) => {
        if (paused) return;
        const gate = drift ? drift.get() : 1;
        if (gate <= 0) return;
        progress.set(progress.get() + (delta / 1000) * rate * gate);
    });

    // stand-alone fallbacks: track fully drawn, no extra spin, no distortion
    const settled = useMotionValue(1);
    const noSpin = useMotionValue(0);
    const pathDraw = pathProgress ?? settled;
    const size = sizeFix ?? settled;
    const span = spanFactor ?? settled;
    const flat = useMotionValue(0);
    const tilt = tiltX ?? flat;
    const open = openProgress ?? settled;
    const drift = driftFactor ?? null;
    const spin = spinBoost ?? noSpin;
    const aspect = aspectFix ?? settled;

    // The alt stays positional even when the entry knows the partner's name.
    // The whole stage is `aria-hidden`, so nothing here is ever announced; what
    // a name in the alt would change is the rendered HTML, and a logo's identity
    // now travels in the annotation, where something actually reads it.
    // `attrs` first, so an entry cannot overwrite the src, the alt or the class.
    const items = images
        .map(orbitEntry)
        .filter(Boolean)
        .map(({ src, attrs }, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} {...attrs} src={src} alt={`${altPrefix} ${index + 1}`} draggable={false} className="orbit-image" />
        ));

    return (
        <motion.div
            ref={containerRef}
            className={`orbit-container ${className}`.trim()}
            style={{ width: "100%", aspectRatio: "1 / 1", perspective }}
            aria-hidden="true"
        >
            <div
                className="orbit-scaling-container orbit-scaling-container--responsive"
                style={{
                    width: baseWidth,
                    height: baseWidth,
                    transform: scale !== null ? `translate(-50%, -50%) scale(${scale})` : undefined,
                    visibility: scale === null ? "hidden" : undefined,
                }}
            >
                <motion.div
                    className="orbit-rotation-wrapper"
                    style={{ rotate: rotation, rotateX: tilt }}
                >
                    {showPath && (
                        <svg width="100%" height="100%" viewBox={`0 0 ${baseWidth} ${baseWidth}`} className="orbit-path-svg">
                            <motion.path
                                d={path}
                                fill="none"
                                stroke={pathColor}
                                strokeWidth={pathWidth / (scale ?? 1)}
                                style={{ pathLength: pathDraw, opacity: pathOpacity }}
                            />
                        </svg>
                    )}

                    {items.map((item, index) => (
                        <OrbitItem
                            key={index}
                            item={item}
                            index={index}
                            totalItems={items.length}
                            path={path}
                            itemWidth={itemWidth ?? itemSize}
                            itemHeight={itemHeight ?? itemSize}
                            rotation={rotation}
                            progress={progress}
                            fill={fill}
                            spin={spin}
                            aspect={aspect}
                            size={size}
                            span={span}
                            tilt={tilt}
                            open={open}
                            lead={revealLead}
                        />
                    ))}
                </motion.div>
            </div>
        </motion.div>
    );
}
