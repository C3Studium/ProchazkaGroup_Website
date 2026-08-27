// The page-to-page transition — the preloader's grammar, compressed to ~3.2s.
// A click anywhere on an internal link (page body, navbar, menu panel) is
// intercepted in the capture phase: the page eases out (fade + a breath of
// scale, navbar rides its own hold out), the box field fades up with the
// DESTINATION page's box lit and named, the route swaps invisibly under it,
// and then the same window reveal the preloader ends with opens onto the new
// page — ground first, words at 55% of the opening, navbar at the end.
//
// Shared machinery (slots, layout, scales, the MaskReveal window, the
// pathname->name map) is imported from the PreLoader; the veil only owns the
// click interception, the route swap and its shorter clock.
import { animate, motion, motionValue, useAnimationFrame } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useGlobalContext } from "@/context/LoadProvider";
import { NavPages } from "@/constants/common";
import {
    ACTIVE_GLIDE,
    BYSTANDER,
    CURTAIN,
    FINAL_GLIDE,
    MaskReveal,
    SLOTS,
    liveRects,
    nameForPath,
    scaleOf,
} from "@/components/common/PreLoader";

// The veil's clock: cover 550ms (page out, boxes up, route swap under it),
// walk 1100ms (destination lit), final 400ms (brake + winner), then the
// shared 1.25s window. ~3.3s door to door.
const T_COVER = 550;
const T_WALK = 1100;
const T_FINAL = 400;

export default function PageVeil() {
    const router = useRouter();
    const { setGate } = useGlobalContext();
    // "idle" | "cover" | "walk" | "final" | "reveal"
    const [phase, setPhase] = useState("idle");
    const [job, setJob] = useState(null); // { href, name, destSlot }
    const [hots, setHots] = useState(null);
    const [vp, setVp] = useState(null);
    const [winner, setWinner] = useState(null);
    const [maskRect, setMaskRect] = useState(null);
    const phaseRef = useRef("idle");
    phaseRef.current = phase;
    const boxRefs = useRef([]);
    // The label's last defence (mirrors the preloader): the lit box may
    // straddle a screen edge, so each label can slide inside its box just far
    // enough to stay readable. The shift is derived per frame from the same
    // rects as the geometry.
    const labelRefs = useRef([]);
    const labelW = useRef(SLOTS.map(() => 0));
    const labelX = useRef(null);
    const labelY = useRef(null);
    if (!labelX.current) {
        labelX.current = SLOTS.map(() => motionValue(0));
        labelY.current = SLOTS.map(() => motionValue(0));
    }
    const restOp = useRef(SLOTS.map(() => 0.2));
    const enterOrder = useRef(SLOTS.map((_, i) => i));
    const scales = useRef(null);
    const rectMVs = useRef(null);
    if (!scales.current) {
        scales.current = SLOTS.map(() => ({ w: motionValue(1), h: motionValue(1) }));
        rectMVs.current = SLOTS.map(() => ({
            x: motionValue(0),
            y: motionValue(0),
            w: motionValue(0),
            h: motionValue(0),
        }));
    }

    // Anywhere on the page: an internal link click becomes a veil run.
    useEffect(() => {
        const onClick = (e) => {
            const a = e.target && e.target.closest && e.target.closest("a[href]");
            if (!a) return;
            if (
                a.target === "_blank" ||
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0
            )
                return;
            // Contact-trigger anchors open the ContactModal in the bubble
            // phase — the veil must let them pass or it would tear the sheet
            // down with a phantom navigation. Same for anything explicitly
            // opting out.
            if (
                a.hasAttribute("data-contact-trigger") ||
                a.closest("[data-contact-trigger]") ||
                a.hasAttribute("data-no-veil")
            )
                return;
            const href = a.getAttribute("href");
            if (!href || !href.startsWith("/")) return;
            if (href.split("#")[0] === window.location.pathname) return;
            if (document.documentElement.hasAttribute("data-preload")) return;
            if (phaseRef.current !== "idle") {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            begin(href);
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const begin = (href) => {
        const path = href.split("#")[0].split("?")[0];
        const name = nameForPath(path);
        const pi = NavPages.findIndex((pg) => pg.href === path);
        let destSlot = pi >= 0 ? SLOTS.findIndex((sl) => sl.page === pi) : -1;
        if (destSlot < 0) {
            // a page outside the navbar borrows a central page box for its name
            destSlot = SLOTS.findIndex((sl) => sl.page === 4);
        }
        // fresh randomness per run
        const ord = SLOTS.map((_, i) => i);
        for (let i = ord.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ord[i], ord[j]] = [ord[j], ord[i]];
        }
        enterOrder.current = ord;
        restOp.current = SLOTS.map(() => 0.15 + Math.random() * 0.1);
        scales.current.forEach((sc) => {
            sc.w.set(1);
            sc.h.set(1);
        });
        setVp({ w: window.innerWidth, h: window.innerHeight });
        setWinner(null);
        setMaskRect(null);
        if (window.lenis) window.lenis.stop();
        // scale the old page out around what the visitor is looking at
        const mainEl = document.querySelector("main");
        if (mainEl) {
            const y = window.scrollY + window.innerHeight / 2;
            mainEl.style.transformOrigin = `50% ${y}px`;
        }
        document.documentElement.setAttribute("data-veil", "1");
        setGate("hold");
        setJob({ href, name, destSlot });
        setPhase("cover");
    };

    // The clock.
    useEffect(() => {
        if (phase === "cover" && job) {
            const t = setTimeout(() => {
                // swap the route while nothing can be seen
                router.push(job.href);
                setHots({ primary: job.destSlot, others: [] });
                setPhase("walk");
            }, T_COVER);
            return () => clearTimeout(t);
        }
        if (phase === "walk" && job) {
            const t = setTimeout(() => {
                // brake everything, pick the window near the centre
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                // A tiny mute frame makes a degenerate window (and can't
                // carry the destination's name) — a qualifying candidate is
                // a PAGE box, or a mute at least a fifth of the screen's
                // short side. The pick stays random among the qualifiers.
                const minWin = Math.min(window.innerWidth, window.innerHeight) * 0.2;
                const cand = [];
                const qual = [];
                let best = null;
                SLOTS.forEach((sl, si) => {
                    const el = boxRefs.current[si];
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    const dx = Math.abs((r.left + r.right) / 2 - cx);
                    const dy = Math.abs((r.top + r.bottom) / 2 - cy);
                    const d = Math.hypot(dx, dy);
                    if (!best || d < best.d) best = { si, d };
                    if (dx < window.innerWidth * 0.22 && dy < window.innerHeight * 0.24) {
                        cand.push(si);
                        if (sl.page != null || (r.width >= minWin && r.height >= minWin))
                            qual.push(si);
                    }
                });
                const pool = qual.length ? qual : cand;
                const pick = pool.length
                    ? pool[Math.floor(Math.random() * pool.length)]
                    : best
                      ? best.si
                      : 0;
                setWinner(pick);
                setHots({ primary: pick, others: [], final: true });
                // stage one for the NEW page's media
                setGate("ground");
                setPhase("final");
            }, T_WALK);
            return () => clearTimeout(t);
        }
        if (phase === "final") {
            const t = setTimeout(() => {
                const el = boxRefs.current[winner != null ? winner : 0];
                if (el) {
                    const r = el.getBoundingClientRect();
                    setMaskRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
                }
                setPhase("reveal");
            }, T_FINAL);
            return () => clearTimeout(t);
        }
    }, [phase, job, winner, router, setGate]);

    // Fresh page starts at its top — under the veil, never seen.
    useEffect(() => {
        const done = () => {
            window.scrollTo(0, 0);
            if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
        };
        router.events.on("routeChangeComplete", done);
        return () => router.events.off("routeChangeComplete", done);
    }, [router.events]);

    // Label widths, re-measured when the run's cast can change (one layout
    // read per change, never per frame).
    useEffect(() => {
        SLOTS.forEach((_, si) => {
            const el = labelRefs.current[si];
            if (el) labelW.current[si] = el.offsetWidth;
        });
    }, [job, winner, phase]);

    // Scale drivers + per-frame layout — the preloader's exact engine.
    useEffect(() => {
        if (phase === "idle" || phase === "reveal") return;
        const current = phase === "walk" || phase === "final" ? hots : null;
        SLOTS.forEach((_, si) => {
            const t = scaleOf(si, current);
            const act =
                current && (current.primary === si || current.others.includes(si));
            const tr =
                current && current.final ? FINAL_GLIDE : act ? ACTIVE_GLIDE : BYSTANDER;
            animate(scales.current[si].w, t.w, tr);
            animate(scales.current[si].h, t.h, tr);
        });
    }, [hots, phase]);

    useAnimationFrame(() => {
        if (!vp || phase === "idle" || phase === "reveal") return;
        const rects = liveRects({ w: vp.w * 0.92, h: vp.h }, (si) => ({
            w: scales.current[si].w.get(),
            h: scales.current[si].h.get(),
        }));
        rects.forEach((r, si) => {
            const m = rectMVs.current[si];
            m.x.set(r.x);
            m.y.set(r.y);
            m.w.set(r.w);
            m.h.set(r.h);
            // Slide the label only as far as the screen demands: centred
            // when the box is fully on, pushed inward when it is not.
            const lw = labelW.current[si];
            if (lw) {
                const cx = r.x + r.w / 2;
                const lo = 10 - (cx - lw / 2);
                const hi = vp.w - 10 - (cx + lw / 2);
                labelX.current[si].set(lo > 0 ? lo : hi < 0 ? hi : 0);
                // Same clamp vertically (stage top is 2vh below the screen).
                const cy = r.y + r.h / 2 + vp.h * 0.02;
                const up = 14 - cy;
                const dn = vp.h - 14 - cy;
                labelY.current[si].set(up > 0 ? up : dn < 0 ? dn : 0);
            }
        });
    });

    const finish = () => {
        const html = document.documentElement;
        html.removeAttribute("data-veil");
        html.removeAttribute("data-preload-reveal");
        setPhase("idle");
        setJob(null);
        setHots(null);
        setTimeout(() => window.lenis && window.lenis.start(), 350);
    };

    if (phase === "idle" || !vp) return null;

    const isActive = (si) => hots != null && hots.primary === si;

    return (
        <div className="PGLoad PGLoad--live PGVeil" aria-hidden="true">
            <div className="PGLoad__stage">
                {SLOTS.map((sl, i) => (
                    <motion.div
                        key={i}
                        ref={(el) => (boxRefs.current[i] = el)}
                        className="PGLoad__box"
                        style={{
                            left: rectMVs.current[i].x,
                            top: rectMVs.current[i].y,
                            width: rectMVs.current[i].w,
                            height: rectMVs.current[i].h,
                        }}
                    >
                        <motion.div
                            className="PGLoad__box__skin"
                            initial={{ opacity: 0 }}
                            animate={
                                phase === "reveal"
                                    ? { opacity: 0, transition: { duration: i === winner ? 0.1 : 0.35, ease: CURTAIN, delay: i === winner ? 0 : 0.04 + i * 0.02 } }
                                    : { opacity: isActive(i) ? 0.4 : restOp.current[i], transition: { duration: 0.45, ease: CURTAIN, delay: phase === "cover" ? 0.08 + enterOrder.current.indexOf(i) * 0.018 : 0 } }
                            }
                        >
                            <motion.div
                                className="PGLoad__box__marks"
                                initial={false}
                                animate={{ opacity: isActive(i) && phase !== "reveal" ? 1 : 0 }}
                                transition={{ duration: 0.5, ease: CURTAIN }}
                            >
                                <span className="PGLoad__mark PGLoad__mark--tl" />
                                <span className="PGLoad__mark PGLoad__mark--tr" />
                                <span className="PGLoad__mark PGLoad__mark--br" />
                                <span className="PGLoad__mark PGLoad__mark--bl" />
                            </motion.div>
                        </motion.div>
                        {job && (i === job.destSlot || i === winner) && job.name && (
                            // OUTSIDE the skin: the skin clips its overflow,
                            // and a screen-edge-clamped label must be free to
                            // cross its own box's hairline. The 0.4 restores
                            // the half-light the skin used to lend it.
                            <motion.span
                                className="PGLoad__box__label"
                                initial={false}
                                animate={
                                    isActive(i) && phase !== "reveal"
                                        ? { opacity: 0.4, y: 0, transition: { duration: 0.5, ease: CURTAIN, delay: 0.1 } }
                                        : { opacity: 0, y: 10, transition: { duration: 0.35, ease: CURTAIN } }
                                }
                            >
                                <motion.span
                                    className="PGLoad__box__label__txt"
                                    ref={(el) => (labelRefs.current[i] = el)}
                                    style={{ x: labelX.current[i], y: labelY.current[i] }}
                                >
                                    {job.name}
                                </motion.span>
                            </motion.span>
                        )}
                    </motion.div>
                ))}
            </div>
            {phase === "reveal" && maskRect && (
                <MaskReveal rect={maskRect} onGo={() => setGate("go")} onDone={finish} />
            )}
        </div>
    );
}
