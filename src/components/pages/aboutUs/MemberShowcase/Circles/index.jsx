"use client";

import { useEffect, useMemo, useRef } from "react";
import { cubicBezier } from "framer-motion";
import { editable } from "@/cms/edit";
import { GROW_TO, RIDE_END } from "@/components/pages/aboutUs/aboutStack";

// One set of discs for the whole section, in three phases.
//
//   1  They rest stacked and edge-on in the first card's mark — the same
//      silhouette the flat SVG used to draw there — then travel to the second
//      card's mark and settle there, still stacked, and ride along with that
//      card for a while. Two rests, one hop.
//   2  They set off again for the third card, and on the way they turn: from
//      70° over, where a circle projects as a flat ellipse, to face-on, where
//      it is a circle. They arrive spread out as the ring of values.
//   3  They are let go. The scroll stops placing them; they carry their own
//      velocity, cannot leave the room they landed in, and the pointer pushes
//      them around.
//
// Nothing here is positioned in vw. Every anchor — both rests and the room the
// physics runs in — is measured off the card's own mark element through a ref,
// so the discs follow the layout instead of a second copy of it that has to be
// kept in step by hand.

// ---- when ---------------------------------------------------------------
//
// The rests are placed against the cards they belong to rather than chosen:
// the second one is centred on the moment that card's mark crosses the middle
// of the screen, which is where it is being looked at.
const MARK_CENTRE_VW = 8 + 18; // the mark's middle, in from the card's left edge
// Was a module constant, and could be while there was one geometry. The
// track is twice as wide on a tablet upright, so where card two is centred
// depends on which track — see geometryFor in ../../aboutStack.
const card2CentredIn = (geo) =>
    geo.progressAtTrackX(50 - (geo.PAIR_VW + MARK_CENTRE_VW));

// Measured against the RIDE rather than against the whole section, and that is
// not fussiness: the hops are a fixed share of the ride, so if these pads are
// fixed shares of the section instead, every change to the section's length
// silently re-times the discs. Written this way the discs keep their pace
// whatever else is added after them — which is exactly what happened when the
// squeeze was given its own stretch at the end.
const RIDE_SPAN = RIDE_END - GROW_TO;
const hopsIn = (geo) => {
    const c2 = card2CentredIn(geo);

    // Where the flight ends and the discs come loose.
    //
    // On a wide screen that is RIDE_END — the moment the track parks — and the
    // stretch after it is the discs' playground, the part where they are free
    // and the pointer can reach them.
    //
    // A tablet upright rides a track twice as long (see geometryFor) in the same
    // scroll, so the same schedule has the discs crossing twice the distance and
    // still arriving at the last moment of the ride: they are caught mid-flight
    // exactly where they are meant to have settled, and the playground is what
    // gets spent. Ending the flight at 85% of the ride instead of all of it
    // hands that stretch back — the discs land while there is still section left
    // to see them in.
    const end = geo.k > 1 ? GROW_TO + 0.85 * RIDE_SPAN : RIDE_END;

    return {
        HOP_1: [GROW_TO, c2 - 0.158 * RIDE_SPAN],
        REST_2: [c2 - 0.158 * RIDE_SPAN, c2 + 0.132 * RIDE_SPAN],
// The second hop ends where the track parks, so the discs come loose at the
// same moment the room they are in stops moving.
        HOP_2: [c2 + 0.132 * RIDE_SPAN, end],
    };
};

// ---- how they look ------------------------------------------------------
const EDGE_ON_DEG = 70; // past ~72° a 1.4px ring edge-on is more aliasing than object
const PERSPECTIVE = 900; // px, applied per disc — see the note in ../styles.scss
// The two rests are not the same shape. In the first the discs are square on
// top of one another — the flat SVG's silhouette. In the second the pile has
// been knocked askew: it walks sideways as it goes down and every disc carries
// a roll, so the same six objects read as having been handled between the two
// cards rather than teleported.
const STACK_STEP = 15; // px down, per disc, in the first rest
const FAN_STEP_X = 16; // px sideways, per disc, in the second
const FAN_STEP_Y = 17; // px down, per disc, in the second
const FAN_ROLL = -17; // deg, the tilt the whole pile takes on by the second rest
const STACK_SCALE = 0.85;

// Where they come to rest inside the room, as fractions of it. Fixed, not
// scattered at random: a layout recomputed on every render is a layout that
// moves under the reader, and this one is also the physics' opening state.
const REST = [
    { x: 0.16, y: 0.12 },
    { x: 0.58, y: 0.06 },
    { x: 0.82, y: 0.34 },
    { x: 0.4, y: 0.44 },
    { x: 0.08, y: 0.62 },
    { x: 0.62, y: 0.7 },
];

// ---- the physics --------------------------------------------------------
const RESTITUTION = 0.86;
const DAMPING = 0.996;
const HAND_OVER_SPEED = 240; // px/s each disc is given as the scroll lets go
const POINTER_REACH = 190; // px
const POINTER_PUSH = 5200; // px/s² at the centre of that reach
const MAX_SPEED = 1400; // px/s — a ceiling, so a fast pointer cannot fling
const MAX_STEP_MS = 34; // never integrate a frame longer than this

// The page's own glide — the same curve SplitText and the hero settle on. Away
// quickly, then a long approach.
const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const span = (v, [from, to]) => clamp01((v - from) / (to - from));
const smooth = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;

/**
 * The easing has to be put on the SCREEN motion, not on these coordinates.
 *
 * The discs are placed in the track's frame, and the track is sliding the other
 * way while they cross it — over each hop it covers about three quarters of the
 * distance they do. So a curve applied to the local position is not the curve
 * anybody sees: ease the local motion directly and the two add up to something
 * that surges, stalls, and at a smoothstep actually reverses mid-hop, which is
 * how the discs ended up off the left edge of the screen once already.
 *
 * So this asks the opposite question. Given that the track moves linearly
 * through the hop, what local curve makes the SCREEN position follow GLIDE?
 * Subtract the track's share and rescale:
 *
 *     screen(t) = local(t) + track(t),  track linear
 *     want screen(t) = mix(S0, S1, GLIDE(t))
 *     ⇒ local(t) = mix(A, B, f(t)) with f as below
 *
 * It lands on f(0)=0 and f(1)=1 exactly, whatever the two spans are — so the
 * ends stay pinned to the marks and nothing has to be corrected afterwards.
 */
const screenEase = (t, localSpan, trackSpan) => {
    if (!localSpan) return GLIDE(t);
    return ((localSpan + trackSpan) * GLIDE(t) - trackSpan * t) / localSpan;
};

// `docId` is the block the six words came from (`o-nas.showcase.values` — see
// @/cms/server/site/aboutUs) and arrives only inside the Studio's editing frame.
// The frame loop below writes `style.transform` on the disc and `style.opacity`
// on the label every frame; an attribute is neither, so annotating the label
// changes nothing about what this file does.
export default function Circles({ progress, labels = [], markRefs, docId, geo }) {
    // The three moments the discs are timed against, for THIS track. They were
    // module constants; the track has two widths now, so they are read off the
    // geometry the section is riding.
    const { HOP_1, REST_2, HOP_2 } = useMemo(() => hopsIn(geo), [geo]);
    const layerRef = useRef(null);
    const nodeRefs = useRef([]);
    const pointerRef = useRef(null);

    // The simulation's own state. In a ref rather than in React state because
    // it changes every frame and nothing renders from it — the frame loop
    // writes transforms straight onto the nodes.
    const bodies = useRef(labels.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })));
    const loose = useRef(false);

    useEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;

        // Reduced motion suppresses the AUTONOMOUS part of the physics, and
        // nothing else.
        //
        // The discs are still let loose in their room and the pointer still
        // pushes them about — that is motion in direct answer to the reader's
        // own hand, which is not what the preference is about. What it is about
        // is the hand-over impulse: six objects setting off across the screen
        // on their own, unasked. That is the one thing withheld, so with the
        // setting on they sit still until they are touched.
        //
        // The journey is scroll-linked: every frame of it is the reader's own
        // hand on the wheel, which is direct manipulation rather than the kind
        // of motion the preference is about. What the preference is about is
        // the physics — that moves on its own, unasked.
        //
        // The first version took the whole journey away instead, by pinning the
        // discs to their destination. That did not calm the animation down, it
        // deleted it: the destination is a hundred and fifty viewport widths to
        // the right of where the section starts, so for anyone with the setting
        // on, the discs were simply off-screen until the last card arrived and
        // then sat there, still. Which is exactly what it was reported as.
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

        const onPointerMove = (event) => {
            pointerRef.current = { x: event.clientX, y: event.clientY };
        };
        const onPointerLeave = () => {
            pointerRef.current = null;
        };
        // A finger is not a mouse: it leaves the screen without ever leaving
        // the window, so `pointerleave` never fires and the last touch point
        // stayed behind as a phantom cursor, pushing the loose discs away from
        // wherever the reader last tapped for as long as the page was open.
        // The push is meant to answer a pointer that is THERE — so for any
        // pointer that lifts (touch, pen), lifting is leaving. A mouse keeps
        // its position on pointerup, because it is in fact still there.
        const onPointerEnd = (event) => {
            if (event.pointerType !== "mouse") pointerRef.current = null;
        };
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerleave", onPointerLeave);
        window.addEventListener("pointerup", onPointerEnd);
        window.addEventListener("pointercancel", onPointerEnd);

        const write = (i, x, y, tilt, roll, scale, turned, shown) => {
            const node = nodeRefs.current[i];
            if (!node) return;
            // `perspective()` inside the disc's own transform rather than on
            // the layer: the layer is the width of the track, and a perspective
            // declared there is measured from its centre, which is nowhere near
            // any of these. See the note in ../styles.scss.
            // Order matters: the roll has to be applied BEFORE the tilt, so it
            // turns the axis the disc is then laid over about. The other way
            // round it spins the disc inside its own foreshortened plane, which
            // from here is very nearly no change at all.
            node.style.transform =
                `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)` +
                ` perspective(${PERSPECTIVE}px)` +
                ` rotateZ(${roll.toFixed(2)}deg) rotateX(${tilt.toFixed(2)}deg)` +
                ` scale(${scale.toFixed(3)})`;
            node.style.opacity = shown.toFixed(3);
            const label = node.firstElementChild;
            if (label) {
                // The words only become readable once the disc has turned;
                // before that they are painted on an ellipse edge-on to us.
                label.style.opacity = clamp01((turned - 0.6) / 0.35).toFixed(3);
            }
        };

        let frame = 0;
        let last = 0;

        const step = (now) => {
            frame = requestAnimationFrame(step);

            const dt = Math.min(MAX_STEP_MS, last ? now - last : 16) / 1000;
            last = now;

            // Everything is measured, every frame, in the layer's own
            // coordinates. The layer rides inside the track, so this is the one
            // place the track's movement enters the sum — the anchors and the
            // room come out already carrying it.
            const origin = layer.getBoundingClientRect();
            const rooms = markRefs.current.map((node) => {
                if (!node) return null;
                const box = node.getBoundingClientRect();
                return {
                    x: box.left - origin.left,
                    y: box.top - origin.top,
                    w: box.width,
                    h: box.height,
                };
            });
            if (rooms.some((room) => !room || !room.w)) return;

            const node = nodeRefs.current[0];
            const size = node ? node.offsetWidth : 68;
            const radius = size / 2;

            const p = progress.get();
            const list = bodies.current;

            // The stack belongs to the first card's mark and is there to be
            // read long before it sets off — it comes up while that card is
            // still opening, not when the journey starts.
            const shown = clamp01((p - 0.12) / 0.12);

            // The stack sits low and left in whichever mark it is resting in,
            // where the flat SVG used to sit.
            const stackAt = (room) => ({
                x: room.x + room.w * 0.06,
                y: room.y + room.h * 0.34,
            });

            if (p < HOP_2[1]) {
                loose.current = false;

                const a = stackAt(rooms[0]);
                const b = stackAt(rooms[1]);

                // Position and appearance run on different curves, and for
                // different reasons — see `screenEase` above for the position.
                const hop1 = span(p, HOP_1);
                const hop2 = span(p, HOP_2);

                // How far the track itself slides across each hop, in px. This
                // is the share `screenEase` has to take back out.
                const vwPx = window.innerWidth / 100;
                const trackSpan1 = (geo.trackXAt(HOP_1[1]) - geo.trackXAt(HOP_1[0])) * vwPx;
                const trackSpan2 = (geo.trackXAt(HOP_2[1]) - geo.trackXAt(HOP_2[0])) * vwPx;

                list.forEach((body, i) => {
                    // Staggered, just — at a third of this again the group
                    // strung out into a smear instead of reading as a stack.
                    const lag = i * 0.02;
                    const t1 = clamp01((hop1 - lag) / (1 - lag));
                    const t2 = clamp01((hop2 - lag) / (1 - lag));
                    // what the disc looks like, as opposed to where it is
                    const look = smooth(t2);

                    // The three places this disc is ever still: square on the
                    // pile in the first mark, askew on the pile in the second,
                    // and its own seat in the ring.
                    const fromX = a.x;
                    const fromY = a.y + i * STACK_STEP;
                    const restX = b.x + i * FAN_STEP_X;
                    const restY = b.y + i * FAN_STEP_Y;
                    const seat = REST[i % REST.length];
                    const seatX = rooms[2].x + seat.x * (rooms[2].w - size);
                    const seatY = rooms[2].y + seat.y * (rooms[2].h - size);

                    // Hop one: out of the first mark and onto the second.
                    const f1 = screenEase(t1, restX - fromX, trackSpan1);
                    const pileX = mix(fromX, restX, f1);
                    const pileY = mix(fromY, restY, GLIDE(t1))
                        - rooms[0].h * 0.55 * Math.sin(Math.PI * GLIDE(t1));

                    // Hop two: off the second mark and into the ring. It starts
                    // from wherever hop one left the disc, so the two never need
                    // a join — at t2 = 0 this is exactly the line above.
                    const f2 = screenEase(t2, seatX - pileX, trackSpan2);
                    const x = mix(pileX, seatX, f2);
                    const y = mix(pileY, seatY, GLIDE(t2))
                        - rooms[1].h * 0.5 * Math.sin(Math.PI * GLIDE(t2));

                    body.x = x;
                    body.y = y;
                    body.vx = 0;
                    body.vy = 0;

                    write(
                        i,
                        x,
                        y,
                        EDGE_ON_DEG * (1 - look),
                        // The roll is taken on across the first hop and given
                        // back across the second: by the time a disc is facing
                        // us there is nothing left to be at an angle.
                        FAN_ROLL * GLIDE(t1) * (1 - look),
                        STACK_SCALE + (1 - STACK_SCALE) * look,
                        look,
                        shown,
                    );
                });
                return;
            }

            // ---- let go ----
            const room = rooms[2];

            if (!loose.current) {
                loose.current = true;
                // Withheld under reduced motion: with the setting on the discs
                // are loose but at rest, and only the pointer moves them.
                const impulse = reduced.matches ? 0 : HAND_OVER_SPEED;
                list.forEach((body, i) => {
                    // Deterministic rather than random: the same scroll
                    // position should always hand over the same way.
                    const angle = i * 2.3999632; // the golden angle, in radians
                    body.vx = Math.cos(angle) * impulse;
                    body.vy = Math.sin(angle) * impulse;
                });
            }

            const pointer = pointerRef.current;
            const px = pointer ? pointer.x - origin.left : null;
            const py = pointer ? pointer.y - origin.top : null;

            list.forEach((body) => {
                // The pointer pushes rather than drags: a force away from it,
                // strongest under the cursor and gone at the edge of its reach.
                if (px !== null) {
                    const dx = body.x + radius - px;
                    const dy = body.y + radius - py;
                    const dist = Math.hypot(dx, dy) || 0.0001;
                    if (dist < POINTER_REACH) {
                        const falloff = 1 - dist / POINTER_REACH;
                        const push = POINTER_PUSH * falloff * falloff * dt;
                        body.vx += (dx / dist) * push;
                        body.vy += (dy / dist) * push;
                    }
                }

                body.vx *= DAMPING;
                body.vy *= DAMPING;

                const speed = Math.hypot(body.vx, body.vy);
                if (speed > MAX_SPEED) {
                    body.vx = (body.vx / speed) * MAX_SPEED;
                    body.vy = (body.vy / speed) * MAX_SPEED;
                }

                body.x += body.vx * dt;
                body.y += body.vy * dt;

                // The walls of the room, and they are hard: whatever the
                // pointer does, a disc is put back inside before it is drawn.
                const minX = room.x;
                const minY = room.y;
                const maxX = room.x + room.w - size;
                const maxY = room.y + room.h - size;
                if (body.x < minX) {
                    body.x = minX;
                    body.vx = Math.abs(body.vx) * RESTITUTION;
                } else if (body.x > maxX) {
                    body.x = maxX;
                    body.vx = -Math.abs(body.vx) * RESTITUTION;
                }
                if (body.y < minY) {
                    body.y = minY;
                    body.vy = Math.abs(body.vy) * RESTITUTION;
                } else if (body.y > maxY) {
                    body.y = maxY;
                    body.vy = -Math.abs(body.vy) * RESTITUTION;
                }
            });

            // Each other. Equal masses, so an elastic collision is the two
            // velocities swapping their components along the line between them.
            for (let i = 0; i < list.length; i += 1) {
                for (let j = i + 1; j < list.length; j += 1) {
                    const one = list[i];
                    const two = list[j];
                    const dx = two.x - one.x;
                    const dy = two.y - one.y;
                    const dist = Math.hypot(dx, dy) || 0.0001;
                    const overlap = size - dist;
                    if (overlap <= 0) continue;

                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Pushed apart first, or they stick together trading
                    // velocities every frame while still overlapping.
                    one.x -= (nx * overlap) / 2;
                    one.y -= (ny * overlap) / 2;
                    two.x += (nx * overlap) / 2;
                    two.y += (ny * overlap) / 2;

                    const av = one.vx * nx + one.vy * ny;
                    const bv = two.vx * nx + two.vy * ny;
                    const swap = (bv - av) * RESTITUTION;
                    one.vx += nx * swap;
                    one.vy += ny * swap;
                    two.vx -= nx * swap;
                    two.vy -= ny * swap;
                }
            }

            list.forEach((body, i) => write(i, body.x, body.y, 0, 0, 1, 1, 1));
        };

        frame = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerleave", onPointerLeave);
            window.removeEventListener("pointerup", onPointerEnd);
            window.removeEventListener("pointercancel", onPointerEnd);
        };
    }, [progress, labels.length, markRefs]);

    return (
        <div className="MemberShow__circles" ref={layerRef} aria-hidden="true">
            {labels.map((label, i) => (
                <span
                    className="MemberShow__circle"
                    // By position, not by word. The words are the editor's now,
                    // and two discs lettered the same would be one duplicate key
                    // and one disc that stops being drawn. The list is a fixed
                    // six and never reorders, so the index IS the identity.
                    key={i}
                    ref={(el) => {
                        nodeRefs.current[i] = el;
                    }}
                >
                    {/* The label, not the disc: the disc is the object and the
                        word is what is written on it. `items.N.label` is offset
                        by one — SHOWCASE_VALUES.valuesFrom in
                        @/cms/server/site/aboutUs, where item 0 is the cards'
                        button. */}
                    <span
                        {...editable(docId, `items.${i + 1}.label`, "text")}
                        className="MemberShow__circle__label"
                    >
                        {label}
                    </span>
                </span>
            ))}
        </div>
    );
}
