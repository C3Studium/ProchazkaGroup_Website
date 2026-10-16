"use client";

import { isGroundCovered, subscribeGround } from "../pageGround";
import { useRef, useEffect, useState } from "react";

const FALLOFF_CURVES = {
    linear: (t) => t,
    smooth: (t) => t * t * (3 - 2 * t),
    sharp: (t) => t * t * t,
};

const hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = parseInt(v.slice(0, 6), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

// A lattice that only exists where the pointer has just been: cells brighten as
// it passes, hold, and fade. Ported from the supplied component; the algorithm
// is unchanged. Two things had to be adapted for a page-wide layer.
//
// The pointer is read off `window` rather than off the container. The original
// listens on its own element, which works for a panel you can put the mouse in
// — but this layer sits behind the whole page and must be `pointer-events:
// none`, or it would swallow every hover on the site. An element that ignores
// the pointer never hears about it either, so the listener goes on the window
// and the canvas, being fixed to the viewport, can take client coordinates as
// its own.
//
// And it sleeps. The loop stops itself the moment no cell is lit and is woken
// by the next pointer move, so a still cursor costs nothing — which matters
// here in a way it does not in a demo, because the page already has a
// full-screen raymarch running behind this.
// Whether some section is covering the page's ground. The lattice keeps being
// woken by the pointer while it is scrolled over, so left alone it draws a
// full-screen grid behind four screens of opaque photographs — and it was the
// whole of the worst frame times measured on /nabidka's closing wipe.
// See ui/pageGround.js.
export default function CursorGrid({
    cellSize = 70,
    color = "#D946EF",
    radius = 140,
    falloff = "smooth",
    holdTime = 400,
    fadeDuration = 800,
    lineWidth = 1.2,
    maxOpacity = 1,
    fillOpacity = 0,
    gridOpacity = 0,
    cellRadius = 0,
    clickPulse = true,
    pulseSpeed = 600,
    className = "",
}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const propsRef = useRef({});
    // Whether this device has a pointer that hovers. Read at the first render
    // rather than from an effect, which this may do because it is only ever
    // loaded with `ssr: false` — there is no server render to disagree with.
    const [fine] = useState(
        () => typeof window === "undefined" || !window.matchMedia("(hover: none)").matches,
    );
    const coveredRef = useRef(false);

    const wakeRef = useRef(null);

    // Told by whichever section is covering the ground, because this cannot
    // work it out for itself: the pointer keeps waking it while it is being
    // scrolled over, so it draws a full-screen lattice behind opaque
    // photographs for as long as they last.
    useEffect(() => {
        coveredRef.current = isGroundCovered();
        return subscribeGround((covered) => {
            coveredRef.current = covered;
            if (!covered) wakeRef.current?.();
        });
    }, []);

    propsRef.current = {
        cellSize, color, radius, falloff, holdTime, fadeDuration, lineWidth,
        maxOpacity, fillOpacity, gridOpacity, cellRadius, clickPulse, pulseSpeed,
    };

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        // Touch hygiene: the lattice is pointer history and nothing else — a
        // device with no hovering pointer has no history for it to draw, so
        // nothing is wired at all: no listeners, no ResizeObserver, no rAF.
        //
        // The canvas used to stay in the tree anyway, on the grounds that the
        // first client render had to match the server's. It never had to: this
        // component is only ever reached through a `dynamic(..., ssr: false)`
        // in _app, so there is no server render to match. What a phone actually
        // got was a full-screen canvas element that could never draw a pixel —
        // see the guard on the render itself now.
        if (window.matchMedia("(hover: none)").matches) return;

        const ctx = canvas.getContext("2d");
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Grid state: one alpha + timestamp pair per cell, indexed row-major.
        let cols = 0;
        let rows = 0;
        let offX = 0;
        let offY = 0;
        let alphas = new Float32Array(0);
        let touched = new Float64Array(0);
        let w = 0;
        let h = 0;
        const pulses = [];
        let raf = 0;
        let running = false;
        let lastFrame = 0;

        const rebuild = () => {
            const p = propsRef.current;
            w = container.offsetWidth;
            h = container.offsetHeight;
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cols = Math.ceil(w / p.cellSize) + 1;
            rows = Math.ceil(h / p.cellSize) + 1;
            // Center the lattice so edge cells crop evenly on both sides
            offX = (w - cols * p.cellSize) / 2;
            offY = (h - rows * p.cellSize) / 2;
            alphas = new Float32Array(cols * rows);
            touched = new Float64Array(cols * rows);
        };

        const cellCenter = (i) => {
            const p = propsRef.current;
            const cx = offX + (i % cols) * p.cellSize + p.cellSize / 2;
            const cy = offY + Math.floor(i / cols) * p.cellSize + p.cellSize / 2;
            return [cx, cy];
        };

        // Light up every cell whose center falls inside the radius, with the
        // configured falloff curve mapping distance to brightness.
        const energize = (x, y, boost) => {
            const p = propsRef.current;
            const r = Math.max(p.radius, 1);
            const ease = FALLOFF_CURVES[p.falloff] ?? FALLOFF_CURVES.linear;
            const now = performance.now();
            const minCol = Math.max(0, Math.floor((x - r - offX) / p.cellSize));
            const maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / p.cellSize));
            const minRow = Math.max(0, Math.floor((y - r - offY) / p.cellSize));
            const maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / p.cellSize));
            for (let cRow = minRow; cRow <= maxRow; cRow++) {
                for (let cCol = minCol; cCol <= maxCol; cCol++) {
                    const i = cRow * cols + cCol;
                    const [cx, cy] = cellCenter(i);
                    const dist = Math.hypot(cx - x, cy - y);
                    if (dist > r) continue;
                    const level = ease(1 - dist / r) * p.maxOpacity * (boost ?? 1);
                    if (level > alphas[i]) {
                        alphas[i] = level;
                        touched[i] = now;
                    } else if (level > 0) {
                        touched[i] = now;
                    }
                }
            }
        };

        const draw = (now) => {
            const p = propsRef.current;
            const dt = Math.min(now - lastFrame, 50);
            lastFrame = now;
            ctx.clearRect(0, 0, w, h);
            const [cr, cg, cb] = hexToRgb(p.color);

            // Optional faint static lattice
            if (p.gridOpacity > 0) {
                ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.gridOpacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let cCol = 0; cCol <= cols; cCol++) {
                    const x = Math.round(offX + cCol * p.cellSize) + 0.5;
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, h);
                }
                for (let cRow = 0; cRow <= rows; cRow++) {
                    const y = Math.round(offY + cRow * p.cellSize) + 0.5;
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                }
                ctx.stroke();
            }

            // Expanding click pulses hand their energy to cells as they pass
            for (let pi = pulses.length - 1; pi >= 0; pi--) {
                const pulse = pulses[pi];
                const age = (now - pulse.t0) / 1000;
                const ringR = age * p.pulseSpeed;
                if (ringR > Math.hypot(w, h)) {
                    pulses.splice(pi, 1);
                    continue;
                }
                const band = p.cellSize;
                const minCol = Math.max(0, Math.floor((pulse.x - ringR - band - offX) / p.cellSize));
                const maxCol = Math.min(cols - 1, Math.floor((pulse.x + ringR + band - offX) / p.cellSize));
                const minRow = Math.max(0, Math.floor((pulse.y - ringR - band - offY) / p.cellSize));
                const maxRow = Math.min(rows - 1, Math.floor((pulse.y + ringR + band - offY) / p.cellSize));
                for (let cRow = minRow; cRow <= maxRow; cRow++) {
                    for (let cCol = minCol; cCol <= maxCol; cCol++) {
                        const i = cRow * cols + cCol;
                        const [cx, cy] = cellCenter(i);
                        const dist = Math.hypot(cx - pulse.x, cy - pulse.y);
                        if (Math.abs(dist - ringR) < band / 2 && p.maxOpacity > alphas[i]) {
                            alphas[i] = p.maxOpacity;
                            touched[i] = now;
                        }
                    }
                }
            }

            let anyVisible = pulses.length > 0;
            const fadeStep = dt / Math.max(p.fadeDuration, 16);
            const half = p.cellSize / 2;

            for (let i = 0; i < alphas.length; i++) {
                let a = alphas[i];
                if (a <= 0) continue;
                if (now - touched[i] > p.holdTime) {
                    a = Math.max(0, a - fadeStep);
                    alphas[i] = a;
                    if (a <= 0) continue;
                }
                anyVisible = true;

                const [cx, cy] = cellCenter(i);
                const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, p.cellSize);
                gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
                gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

                const x = cx - half + 0.5;
                const y = cy - half + 0.5;
                const s = p.cellSize - 1;

                ctx.beginPath();
                if (p.cellRadius > 0) {
                    ctx.roundRect(x, y, s, s, p.cellRadius);
                } else {
                    ctx.rect(x, y, s, s);
                }
                if (p.fillOpacity > 0) {
                    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a * p.fillOpacity})`;
                    ctx.fill();
                }
                ctx.strokeStyle = gradient;
                ctx.lineWidth = p.lineWidth;
                ctx.stroke();
            }

            if (coveredRef.current) {
                running = false;
                return;
            }

            if (anyVisible) {
                raf = requestAnimationFrame(draw);
            } else {
                running = false;
                if (propsRef.current.gridOpacity <= 0) ctx.clearRect(0, 0, w, h);
            }
        };

        const wake = () => {
            if (running || coveredRef.current) return;
            running = true;
            lastFrame = performance.now();
            raf = requestAnimationFrame(draw);
        };
        wakeRef.current = wake;

        // The canvas is fixed to the viewport, so client coordinates are already
        // its coordinates — the rect is read anyway rather than assumed, so this
        // still holds if the layer is ever mounted somewhere that scrolls.
        const toLocal = (e) => {
            const rect = canvas.getBoundingClientRect();
            return [e.clientX - rect.left, e.clientY - rect.top];
        };

        const onPointerMove = (e) => {
            const [x, y] = toLocal(e);
            energize(x, y);
            wake();
        };

        const onPointerDown = (e) => {
            if (!propsRef.current.clickPulse) return;
            const [x, y] = toLocal(e);
            pulses.push({ x, y, t0: performance.now() });
            wake();
        };

        const ro = new ResizeObserver(() => {
            rebuild();
            wake();
        });
        ro.observe(container);
        rebuild();
        wake();

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerdown", onPointerDown, { passive: true });

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerdown", onPointerDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cellSize]);

    // Repaint static layers when visual props change while idle
    useEffect(() => {
        wakeRef.current?.();
    }, [gridOpacity, color, lineWidth, maxOpacity, fillOpacity, cellRadius]);

    // Nothing at all where there is no pointer. The effects above already
    // decline to wire anything up on touch, so what this removes is a
    // full-screen canvas and its backing store, sitting in the tree of every
    // phone on the site to draw a lattice that can never be lit.
    if (!fine) return null;

    return (
        <div ref={containerRef} className={["cursorGrid", className].filter(Boolean).join(" ")}>
            <canvas ref={canvasRef} className="cursorGrid__canvas" />
        </div>
    );
}
