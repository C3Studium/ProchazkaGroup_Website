"use client";

import { useEffect, useRef } from "react";

// A picture that changes a cell at a time.
//
// Three versions, and the two it went through are worth stating because each was
// beaten by the same misconception.
//
// The first built this out of DOM: one absolutely-positioned span per cell, each
// carrying the incoming photograph as a background offset to its own square,
// each on its own transition-delay. A hundred and sixty composited layers
// appearing on staggered timers is a great deal of work for the compositor, and
// every one of them was painting a slice of the same large image.
//
// The second was one canvas and a loop: draw the outgoing picture, then draw the
// incoming one once per cell with a source rectangle and a `globalAlpha`. A
// hundred and ninety-eight `drawImage` calls a frame. Profiled over a sweep of
// the roster it was 1226ms out of the 1323ms that hovering the list cost at all
// — ninety-three per cent of it, against about a hundred for React's entire
// render pass.
//
// Cutting the call count did not help: four full-canvas calls measured 3057ms,
// worse than the hundred and ninety-eight small ones. The calls were never the
// cost. The cost is resampling a six-megapixel photograph down to the box, and
// the loop was doing it on every frame of every run.
//
// So this one scales each photograph to the box ONCE, when it arrives, and every
// frame after that is a one-to-one copy. What varies per frame is an eighteen by
// eleven mask — one pixel per cell, a hundred and ninety-eight bytes — scaled up
// with smoothing off, so a mask pixel becomes a hard-edged cell. That is also
// what retired the one-pixel overlap the old loop needed to hide its seams.
const COLS = 18;
const ROWS = 11;
// What share of the run one cell's own fade takes; the rest is the stagger.
//
// This is the dial that decides whether a run reads as a dissolve or as
// PIXELS. At 0.35 a cell spends a third of the whole run fading, so at any
// moment a wide band of the grid is half-turned and the edge between the two
// pictures is a soft gradient. Take it down and each cell flips in a fraction of
// the run instead: the front becomes a hard edge of whole squares, which is the
// thing anyone means when they call this effect pixelated.
const CELL_SHARE = 0.35;

const ORDERS = {
    diagonalTR: (c, r) => (COLS - 1 - c) + r,
    diagonalTL: (c, r) => c + r,
    diagonalBR: (c, r) => (COLS - 1 - c) + (ROWS - 1 - r),
    diagonalBL: (c, r) => c + (ROWS - 1 - r),
};
// A sweep with the edge broken up.
//
// The four diagonals are clean wipes and `shuffle` is pure noise; both read as
// a pattern the moment you have seen them twice. This is the diagonal with each
// cell's place in the queue nudged by up to a third of the run, so the front
// still crosses the grid in a direction but arrives as a ragged edge that
// scatters ahead of and behind itself. It is what the navbar opens on.
//
// The nudge is a hash of the cell's own coordinates rather than Math.random():
// the same grid gives the same scatter every time, so a run interrupted and
// restarted does not re-deal the cells it had already turned over.
const drift = (c, r) => {
    const base = (c + r) / (COLS - 1 + ROWS - 1);
    const hash = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
    return base * 0.72 + (hash - Math.floor(hash)) * 0.28;
};

const ORDER_NAMES = [...Object.keys(ORDERS), "shuffle", "shuffle"];

// Each cell's place in the queue, 0..1.
const rankCells = (name) => {
    const total = COLS * ROWS;
    if (name === "drift") {
        const at = new Float32Array(total);
        let max = 0;
        for (let i = 0; i < total; i++) {
            at[i] = drift(i % COLS, Math.floor(i / COLS));
            if (at[i] > max) max = at[i];
        }
        // Normalised, or the last cells never reach the end of the run and the
        // picture finishes with a corner of itself missing.
        for (let i = 0; i < total; i++) at[i] /= max;
        return at;
    }
    if (name === "shuffle") {
        const order = Array.from({ length: total }, (_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        const at = new Float32Array(total);
        order.forEach((cell, rank) => { at[cell] = rank / (total - 1); });
        return at;
    }
    const fn = ORDERS[name] ?? ORDERS.diagonalTR;
    const max = COLS - 1 + ROWS - 1;
    const at = new Float32Array(total);
    for (let i = 0; i < total; i++) at[i] = fn(i % COLS, Math.floor(i / COLS)) / max;
    return at;
};

// The source rectangle that fills a box of `w × h` from an image, cover-style.
const coverRect = (img, w, h) => {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    return { sx: (img.width - sw) / 2, sy: (img.height - sh) / 2, sw, sh };
};

// Decoded once per source and kept. Hovering a portrait on and off asks for the
// same two files over and over, and a fresh `new Image()` each time meant every
// swap waited on a `load` event — cheap, because the bytes are in the HTTP
// cache, but not free, and never at a predictable moment. Two in flight at once
// could also land out of order and leave the later request showing the earlier
// picture.
const decoded = new Map();
const load = (src) => {
    const held = decoded.get(src);
    if (held) return held;
    const pending = new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => { decoded.delete(src); resolve(null); };
        img.src = src;
    });
    decoded.set(src, pending);
    return pending;
};

// `resolution` scales the canvas's backing store against its box. It is 1
// everywhere it matters — the roster on /o-nas is looked at directly and wants
// every pixel it can have.
//
// The navbar's ground wants the opposite. It is a tone across the whole screen
// behind a menu, and at 1 it was a full-screen canvas repainting sixty times a
// second for the length of every turnover. At 0.15 the backing store is a
// fortieth of the pixels and the browser stretches it back up to the box, which
// is also where its softness comes from: an upscaled raster is blurred for
// free, so nothing has to ask for `filter: blur()` over the whole viewport.
// `order` names the sequence the cells turn over in. Left out, it is picked at
// random per run, which is what the roster on /o-nas wants — running down a
// list of eleven people should not turn each one over the same way.
export default function PixelReveal({ src, alt = "", duration = 850, className = "", resolution = 1, order, cellShare = CELL_SHARE }) {
    const hostRef = useRef(null);
    const canvasRef = useRef(null);
    // Read inside the loop, which does not re-run when this changes — and must
    // not, because tearing the canvas down mid-transition is what the whole
    // imperative swap below exists to avoid.
    const orderRef = useRef(order);
    orderRef.current = order;
    // Everything the loop needs, off React: it runs per frame and none of it
    // should cost a render.
    const state = useRef({ fromImg: null, toImg: null, ranks: null, t0: 0, raf: 0, size: [0, 0], p: 1, token: 0, share: cellShare });
    // Read by the loop, which does not re-run when this changes — and must not,
    // because tearing the canvas down mid-transition is what the imperative swap
    // below exists to avoid.
    state.current.share = cellShare;

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;
        const ctx = canvas.getContext("2d");
        const s = state.current;
        let alive = true;

        // The three buffers, all kept at the display's device size so that every
        // per-frame copy between them is one-to-one:
        //   base — the outgoing picture, or a snapshot of an interrupted run
        //   next — the incoming picture
        //   cut  — `next` with this frame's mask applied
        const base = document.createElement("canvas");
        const next = document.createElement("canvas");
        const cut = document.createElement("canvas");
        const baseCtx = base.getContext("2d");
        const nextCtx = next.getContext("2d");
        const cutCtx = cut.getContext("2d");

        // The grid's state, one pixel per cell — smaller than a favicon. Only
        // its alpha channel is ever read, so the colour is set once, here.
        const mask = document.createElement("canvas");
        mask.width = COLS;
        mask.height = ROWS;
        const maskCtx = mask.getContext("2d");
        const maskData = maskCtx.createImageData(COLS, ROWS);
        for (let i = 0; i < COLS * ROWS; i++) {
            maskData.data[i * 4] = 255;
            maskData.data[i * 4 + 1] = 255;
            maskData.data[i * 4 + 2] = 255;
        }

        // The expensive operation, and the reason it is in its own function: it
        // is called when a picture arrives and when the box changes size, and at
        // no other time.
        const fit = (target, tctx, img) => {
            if (!img || !canvas.width) return;
            target.width = canvas.width;
            target.height = canvas.height;
            const { sx, sy, sw, sh } = coverRect(img, canvas.width, canvas.height);
            tctx.globalCompositeOperation = "source-over";
            tctx.imageSmoothingEnabled = true;
            tctx.imageSmoothingQuality = "high";
            tctx.drawImage(img, sx, sy, sw, sh, 0, 0, target.width, target.height);
        };

        // A straight copy of one buffer onto another at the same size.
        const copy = (target, tctx, source) => {
            if (!source.width) return;
            target.width = source.width;
            target.height = source.height;
            tctx.globalCompositeOperation = "source-over";
            tctx.drawImage(source, 0, 0);
        };

        const show = (buffer) => {
            const [w, h] = s.size;
            if (!buffer.width) return;
            ctx.drawImage(buffer, 0, 0, buffer.width, buffer.height, 0, 0, w, h);
        };

        // `p` is the run's progress. At 1 the incoming picture is simply shown.
        function paint(p) {
            const [w, h] = s.size;
            if (!w || !h) return;
            if (p >= 1) {
                if (next.width) show(next);
                return;
            }
            if (base.width) show(base);
            else ctx.clearRect(0, 0, w, h);
            if (!s.ranks || !next.width) return;

            const px = maskData.data;
            const share = s.share || CELL_SHARE;
            for (let i = 0; i < COLS * ROWS; i++) {
                const local = (p - s.ranks[i] * (1 - share)) / share;
                px[i * 4 + 3] = local <= 0 ? 0 : local >= 1 ? 255 : (local * 255) | 0;
            }
            maskCtx.putImageData(maskData, 0, 0);

            if (cut.width !== canvas.width || cut.height !== canvas.height) {
                cut.width = canvas.width;
                cut.height = canvas.height;
            }
            cutCtx.globalCompositeOperation = "source-over";
            cutCtx.clearRect(0, 0, cut.width, cut.height);
            cutCtx.drawImage(next, 0, 0);
            // Keep the incoming picture only where the mask has alpha, and take
            // the mask's alpha with it — which is the per-cell fade. Smoothing
            // off, so one mask pixel is one cell with a hard edge.
            cutCtx.globalCompositeOperation = "destination-in";
            cutCtx.imageSmoothingEnabled = false;
            cutCtx.drawImage(mask, 0, 0, COLS, ROWS, 0, 0, cut.width, cut.height);
            show(cut);
        }

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2) * resolution;
            // offsetWidth/Height, not getBoundingClientRect: the rect is the
            // box *after* every ancestor transform, so a scaled parent made the
            // canvas size itself to the scaled result and then be scaled again.
            const r = { width: host.offsetWidth, height: host.offsetHeight };
            if (!r.width || !r.height) return;
            s.size = [r.width, r.height];
            canvas.width = Math.round(r.width * dpr);
            canvas.height = Math.round(r.height * dpr);
            canvas.style.width = `${r.width}px`;
            canvas.style.height = `${r.height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // The buffers are sized to the display, so they are redrawn with it.
            // A resize landing mid-run redraws `base` from the outgoing file
            // rather than from the blend it was showing — the alternative is
            // keeping a full-size copy alive for a case that is one frame of one
            // resize, and the picture is correct either way.
            fit(next, nextCtx, s.toImg);
            fit(base, baseCtx, s.fromImg || s.toImg);
            // Whatever the run is up to, not the end of it: `paint(1)` here
            // finished any transition a resize happened to land in.
            paint(s.p);
        };

        const frame = (now) => {
            if (!alive) return;
            const p = Math.min(1, (now - s.t0) / duration);
            s.p = p;
            paint(p);
            if (p < 1) {
                s.raf = requestAnimationFrame(frame);
            } else {
                s.fromImg = s.toImg;
                copy(base, baseCtx, next);
                s.raf = 0;
            }
        };

        const observer = new ResizeObserver(resize);
        observer.observe(host);

        // First picture: no transition, just draw it.
        load(src).then((img) => {
            if (!alive) return;
            s.fromImg = img;
            s.toImg = img;
            resize();
        });

        host.__pixelSwap = (nextSrc) => {
            // Only the most recently asked-for picture may take the screen. A
            // hover that changes its mind twice while a file is still decoding
            // used to let the abandoned one arrive last and win.
            const token = ++s.token;
            load(nextSrc).then((img) => {
                if (!alive || !img || token !== s.token) return;
                if (s.toImg === img && s.raf === 0) return;

                // Carry on from what is actually visible.
                //
                // This is the hover bug this replaced. The outgoing picture was
                // only advanced when a run reached its end, so interrupting one
                // — moving off a portrait before it had finished turning over —
                // started the next run from a picture that had not been on the
                // screen for some time, and the visible one vanished in a single
                // frame. Worst on the common case: hover on, hover off, where
                // the two were then the same file and the second portrait simply
                // blinked out.
                if (s.raf) copy(base, baseCtx, canvas);

                s.fromImg = s.toImg;
                s.toImg = img;
                fit(next, nextCtx, img);
                s.ranks = rankCells(orderRef.current || ORDER_NAMES[Math.floor(Math.random() * ORDER_NAMES.length)]);
                s.t0 = performance.now();
                s.p = 0;
                cancelAnimationFrame(s.raf);
                s.raf = requestAnimationFrame(frame);
            });
        };

        return () => {
            alive = false;
            observer.disconnect();
            cancelAnimationFrame(s.raf);
            delete host.__pixelSwap;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration, resolution]);

    // The swap is driven imperatively so a change of `src` does not re-run the
    // effect and tear the canvas down mid-transition.
    const lastSrc = useRef(src);
    useEffect(() => {
        if (src === lastSrc.current) return;
        lastSrc.current = src;
        hostRef.current?.__pixelSwap?.(src);
    }, [src]);

    return (
        <div ref={hostRef} className={["pixelReveal", className].filter(Boolean).join(" ")} role="img" aria-label={alt}>
            <canvas ref={canvasRef} className="pixelReveal__canvas" />
        </div>
    );
}
