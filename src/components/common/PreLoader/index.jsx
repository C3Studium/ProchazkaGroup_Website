// The first-load curtain. Plays on every FULL document load (reload and hard
// reload included — <html> ships with data-preload="1" from _document) and
// never on client-side route changes. TRANSPARENT: the shader ground shows
// through; heroes and the navbar hold their entrances behind it.
//
// Composition: EIGHT squares — one per navbar page, in NavPages order — set
// in a fixed three-band layout (designed, not random). The active box
// stretches wide, pushing its bandmates apart symmetrically, and shows the
// page it stands for: the navbar's own photo and the page's name. The walk
// visits every page once. Bottom-left the wordmark (small line over the
// oversized name, written character by character), a 10px loading bar along
// the bottom and a 0-100% counter on the right, both advancing with random
// stalls on a ~6s clock. At 100% the middle square becomes the page's
// clip-path window and opens over 2.5s — the gate flips as it starts, so the
// hero runs its entrance inside the growing window.
import { animate, motion, motionValue, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useGlobalContext } from "@/context/LoadProvider";
// Who, if anyone, is framing this document. Already in the public bundle —
// `_app`'s edit arming imports the same module — so this costs nothing to a
// visitor. See the bypass below.
import { isEditSurfaceFrame } from "@/cms/preview/frame";
import { NavPages } from "@/constants/common";

export const CURTAIN = [0.22, 1, 0.36, 1];
// The window's own curve: leans in the same as before (the start reads
// right), but the landing is tightened — less deceleration, no long tail.
export const REVEAL = [0.8, 0, 0.2, 1];
// The glide the boxes move on: a long, soft in-out tween — the growth is a
// slow breath, and because it is LONGER than the gap between visits, one
// box is still settling while the next is already growing. Nothing snaps.
// Two speeds — but the speeds live on each box's SCALE, not on its
// rectangle. Every frame the layout is recomputed from the current scales,
// so the flush chain (and the no-overlap guarantee) is an invariant of the
// geometry, not a hope about synchronized tweens: the bystanders drift at a
// quarter of their old pace, the active box moves determined, and nothing
// can ever intersect because positions are DERIVED, never interpolated.
export const BYSTANDER = { duration: 7.6, ease: [0.5, 0.05, 0.15, 1] };
export const ACTIVE_GLIDE = { duration: 1.35, ease: [0.3, 0.05, 0.1, 1] };
// The last second: everything brakes to rest on this curve while the chosen
// box swells — the composition stops breathing and points.
export const FINAL_GLIDE = { duration: 1.05, ease: [0.22, 1, 0.36, 1] };
const FINAL_W = 1.5;
const FINAL_H = 1.42;
// The active box grows in BOTH axes — square-first, massive — and the mass
// comes from somewhere: its immediate bandmates shrink hard, the far ones a
// touch, the other bands give up a little height. The boxes are LARGE at
// rest now, so the growth itself can stay modest. Conservation as theatre.
const WGROW = 1.75;
const HGROW = 1.62;
const CO_GROW = 1.18;
const SHRINK_ADJ = 0.72;
const SHRINK_FAR = 0.9;
const BAND_GIVE = 0.94;
const lerp = (a, b, t) => a + (b - a) * t;

// The designed layout: three bands of squares (sizes in vh, so a square is a
// square at any aspect), each band anchored at its own x (vw), boxes mostly
// flush on shared hairlines with only a breath of air where noted. Boxes take
// pages in NavPages order, reading order; the middle of the middle band
// (index 4) is the future window.
// All gaps are ZERO: within a band the chain is flush, so contact never
// breaks no matter who grows or shrinks — a shrunk box still hangs on its
// neighbour's edge. Bands anchor to their top or bottom line so uneven
// heights meet at corners. Eleven slots for eight pages: three of them are
// EMPTY (page: null), set SMALL (k) — mute little frames between the big
// ones; they can glow as co-actives but never speak. The composition fills
// the WHOLE screen, and its ends run past the edges — the first band starts
// off-screen left, the widest one runs off-screen right.
// Enough slots to cover the WHOLE screen: every band runs edge past edge,
// the eight pages spaced out by a crowd of mute frames, many of them tiny.
// The PAGE boxes live in the central slots of every band — the mute frames
// take the edges — so the names always play out around the middle of the
// screen and the finale's window is never far from where the eye already is.
const BANDS = [
    { size: 30, x: -6, align: "b", slots: [{ p: null, k: 0.4 }, { p: null, k: 0.6 }, { p: 0 }, { p: null, k: 0.35 }, { p: 1 }, { p: null, k: 0.5 }, { p: 2 }, { p: null, k: 0.55 }, { p: null, k: 0.65 }] },
    { size: 40, x: -5, align: "t", slots: [{ p: null, k: 0.3 }, { p: null, k: 0.45 }, { p: 3 }, { p: 4 }, { p: 5 }, { p: null, k: 0.4 }, { p: null, k: 0.35 }] },
    { size: 26, x: -4, align: "t", slots: [{ p: null, k: 0.7 }, { p: null, k: 0.8 }, { p: null, k: 0.5 }, { p: 6 }, { p: null, k: 0.65 }, { p: 7 }, { p: null, k: 0.9 }, { p: null, k: 0.75 }, { p: null, k: 0.7 }] },
];

// The same 25 slots, re-dressed for other screens. Every variant keeps the
// band structure and the page positions IDENTICAL to BANDS — SLOTS (and the
// motion values keyed to its indices) never changes — and only re-dresses
// sizes, anchors and the mute frames' k. Two extra fields:
//   unit: "w" sizes the band against viewport WIDTH instead of height
//         (portrait screens: a square measured in vh outgrows the narrow
//         side; measured in vw it scales with it),
//   c: 1  centres the band's rest chain on the stage, with x as a vw
//         OFFSET from centre instead of an absolute left anchor.
// Portrait (phones upright, tablets upright): a centred strip of small
// squares — the stack no longer fills the height (liveRects centres the
// rest stack vertically), the bands still run past both side edges, the
// pages still hold the middle of the screen.
const BANDS_PORTRAIT = [
    // The top band carries the two LONGEST page names on its edge slots
    // ("Hlavní stránka", "Benefit program") — its outer mutes collapse to
    // slivers so the rest chain just spans the screen and an edge page's
    // label survives even while the previous active is still relaxing fat.
    { size: 23, unit: "w", x: 0, align: "b", c: 1, slots: [{ p: null, k: 0.12 }, { p: null, k: 0.15 }, { p: 0 }, { p: null, k: 0.35 }, { p: 1 }, { p: null, k: 0.5 }, { p: 2 }, { p: null, k: 0.15 }, { p: null, k: 0.12 }] },
    { size: 36, unit: "w", x: 0, align: "t", c: 1, slots: [{ p: null, k: 0.3 }, { p: null, k: 0.45 }, { p: 3 }, { p: 4 }, { p: 5 }, { p: null, k: 0.4 }, { p: null, k: 0.35 }] },
    { size: 22, unit: "w", x: -2, align: "t", c: 1, slots: [{ p: null, k: 0.7 }, { p: null, k: 0.8 }, { p: null, k: 0.5 }, { p: 6 }, { p: null, k: 0.65 }, { p: 7 }, { p: null, k: 0.9 }, { p: null, k: 0.75 }, { p: null, k: 0.7 }] },
];
// Short-and-wide (phone landscape): the vh sizes still fill the height
// correctly, but the desktop chains come up short of the right edge — so
// the EDGE mutes fatten until every band bleeds past both sides again.
const BANDS_WIDE = [
    { size: 30, x: -2, align: "b", c: 1, slots: [{ p: null, k: 0.8 }, { p: null, k: 0.9 }, { p: 0 }, { p: null, k: 0.35 }, { p: 1 }, { p: null, k: 0.5 }, { p: 2 }, { p: null, k: 0.85 }, { p: null, k: 0.95 }] },
    { size: 40, x: 1, align: "t", c: 1, slots: [{ p: null, k: 0.7 }, { p: null, k: 0.85 }, { p: 3 }, { p: 4 }, { p: 5 }, { p: null, k: 0.8 }, { p: null, k: 0.75 }] },
    { size: 26, x: -1, align: "t", c: 1, slots: [{ p: null, k: 1.1 }, { p: null, k: 0.95 }, { p: null, k: 0.5 }, { p: 6 }, { p: null, k: 0.65 }, { p: 7 }, { p: null, k: 0.9 }, { p: null, k: 0.9 }, { p: null, k: 1.05 }] },
];
// Mid-width landscape (tablets on their side, small laptop windows): the
// desktop chains keep their k but CENTRE — the fixed left anchors were
// tuned for ~1500px and push the last page boxes off the right edge here.
const BANDS_MID = [
    { size: 30, x: 2, align: "b", c: 1, slots: BANDS[0].slots },
    { size: 40, x: 1, align: "t", c: 1, slots: BANDS[1].slots },
    { size: 26, x: -1, align: "t", c: 1, slots: BANDS[2].slots },
];
// Which dress the layout wears, from the viewport liveRects is given (the
// callers pass the stage width, vp.w * 0.92). Portrait wins over short.
export function bandsFor(vp) {
    if (vp.w < vp.h) return BANDS_PORTRAIT;
    if (vp.h < 480) return BANDS_WIDE;
    if (vp.w < 1150) return BANDS_MID;
    return BANDS;
}

// pathname -> the name the finale wears. The nav pages carry their own
// hrefs; the routes outside the navbar are listed by hand. A nested path
// falls back to its section (an advisor card reads as Recenze).
const PATH_NAMES = [
    ...NavPages.filter((pg) => pg.href).map((pg) => ({ path: pg.href, name: pg.text })),
    { path: "/cookies", name: "Cookies" },
    { path: "/ochrana-soukromi", name: "Ochrana soukromí" },
];
export function nameForPath(path) {
    const exact = PATH_NAMES.find((e) => e.path === path);
    if (exact) return exact.name;
    const section = PATH_NAMES.find(
        (e) => e.path !== "/" && path.startsWith(e.path + "/"),
    );
    return section ? section.name : null;
}
// Flattened slot list: [{band, idx, page, k}]
export const SLOTS = [];
BANDS.forEach((b, bi) =>
    b.slots.forEach((sl, i) =>
        SLOTS.push({ band: bi, idx: i, page: sl.p, k: sl.k || 1 }),
    ),
);

// Per-slot scale under the current actives: the primary is massive, the
// co-actives swell, anyone directly beside an active shrinks hard, the rest
// of an active band gives a little, untouched bands barely breathe.
export function scaleOf(slotIdx, hots) {
    if (!hots) return { w: 1, h: 1 };
    if (slotIdx === hots.primary)
        return hots.final ? { w: FINAL_W, h: FINAL_H } : { w: WGROW, h: HGROW };
    if (hots.others.includes(slotIdx)) return { w: CO_GROW, h: CO_GROW };
    const me = SLOTS[slotIdx];
    const actives = [hots.primary, ...hots.others].filter((a) => a != null);
    let adjacent = false;
    let bandActive = false;
    for (const a of actives) {
        const sl = SLOTS[a];
        if (sl.band === me.band) {
            bandActive = true;
            if (Math.abs(sl.idx - me.idx) === 1) adjacent = true;
        }
    }
    if (adjacent) return { w: SHRINK_ADJ, h: SHRINK_ADJ };
    if (bandActive) return { w: SHRINK_FAR, h: SHRINK_FAR };
    return { w: 0.96, h: BAND_GIVE };
}

// Absolute rects (px, stage coords) from the CURRENT per-slot scales.
// Both axes move; each band re-centres around its rest anchor horizontally
// and the whole stack re-centres vertically, so the push goes every way.
export function liveRects(vp, getScale) {
    const vh = vp.h / 100;
    const vw = vp.w / 100;
    const B = bandsFor(vp);
    // k comes from the ACTIVE variant, not from SLOTS — the slot list is
    // stable, its dress is per-viewport.
    const kOf = (sl) => B[sl.band].slots[sl.idx].k || 1;
    const sizeOf = (b) => b.size * (b.unit === "w" ? vw : vh);
    const scales = SLOTS.map((_, si) => getScale(si));
    // A band is as tall as its tallest LIVE box (each box's own base size k
    // times its current scale).
    const bandHeights = B.map((b, bi) => {
        const inBand = SLOTS.map((sl, si) =>
            sl.band === bi ? kOf(sl) * scales[si].h : 0,
        );
        return sizeOf(b) * Math.max(...inBand);
    });
    const restTotal = B.reduce((a, b) => a + sizeOf(b), 0);
    const liveTotal = bandHeights.reduce((a, b) => a + b, 0);
    const rects = [];
    // A rest stack SHORTER than the stage (the portrait strip) centres in
    // it; the desktop stack is exactly 96vh tall, so this pad is zero there
    // and the layout is byte-identical to before.
    const pad = Math.max(0, (vp.h * 0.96 - restTotal) / 2);
    let y = pad - (liveTotal - restTotal) / 2;
    B.forEach((band, bi) => {
        const s = sizeOf(band);
        const slots = SLOTS.map((sl, si) => ({ ...sl, si })).filter((sl) => sl.band === bi);
        let restW = 0;
        let liveW = 0;
        for (const sl of slots) {
            restW += s * kOf(sl);
            liveW += s * kOf(sl) * scales[sl.si].w;
        }
        const x0 = band.c ? (vp.w - restW) / 2 + band.x * vw : band.x * vw;
        let x = x0 - (liveW - restW) / 2;
        const bandH = bandHeights[bi];
        for (const sl of slots) {
            const w = s * kOf(sl) * scales[sl.si].w;
            const h = s * kOf(sl) * scales[sl.si].h;
            // "b" sits on the band's floor (touching the band below), "t"
            // hangs from its ceiling (touching the band above) — the flush x
            // chain keeps in-band contact, these keep the cross-band ones.
            const top = band.align === "t" ? y : y + (bandH - h);
            rects.push({ x, y: top, w, h });
            x += w - 1;
        }
        y += bandH - 1;
    });
    return rects;
}

const EYEBROW = "Finance a vzdělání";
const NAME = "Procházka Group";

function CharLine({ text, className, phase, baseIn, baseOut }) {
    return (
        <span className={className}>
            {text.split("").map((ch, ci) => (
                <motion.span
                    key={ci}
                    className="PGLoad__ch"
                    initial={{ opacity: 0, y: "0.45em" }}
                    animate={
                        phase === "mask"
                            ? { opacity: 0, y: "-0.35em", transition: { duration: 0.35, ease: CURTAIN, delay: baseOut + ci * 0.014 } }
                            : { opacity: 1, y: "0em", transition: { duration: 0.7, ease: CURTAIN, delay: baseIn + ci * 0.03 } }
                    }
                >
                    {ch === " " ? " " : ch}
                </motion.span>
            ))}
        </span>
    );
}

// The window: the winner's rectangle handed to the page itself — written as
// INLINE styles straight onto <main> (one element's style mutation per
// frame; the old CSS-var route on <html> recalced the whole document and
// stuttered). And the page arrives through a ZOOM: <main> starts scaled to
// roughly the window's own size (~0.2-0.4), anchored at the window's centre,
// and eases back to 1 exactly as the window opens. The 1.15 head-start on
// the scale keeps the page strictly LARGER than the hole the whole way
// (both edges move linearly on the same curve and only meet at 1), so the
// window never shows past the page's rim.
export function MaskReveal({ rect, onGo, onDone }) {
    const m = useMotionValue(0);
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

    const fL = useTransform(m, (v) => lerp(rect.left, 0, v));
    const fT = useTransform(m, (v) => lerp(rect.top, 0, v));
    const fW = useTransform(m, (v) => lerp(rect.width, vw, v));
    const fH = useTransform(m, (v) => lerp(rect.height, vh, v));
    // The hairline frame is barely there at all: it starts at a quarter
    // light and is GONE by a third of the opening.
    const fO = useTransform(m, [0, 0.35], [0.25, 0]);

    useEffect(() => {
        const mainEl = document.querySelector("main");
        document.documentElement.setAttribute("data-preload-reveal", "1");
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // A GENTLE arrival, not a matching one: the page rides in from 0.8 —
        // always far larger than the window — and settles to 1 as the clip
        // opens. Just an accent of scale, never a second reveal.
        const s0 = 0.8;
        const write = (v) => {
            if (!mainEl) return;
            const T = lerp(rect.top, 0, v);
            const L = lerp(rect.left, 0, v);
            const R = lerp(vw - rect.right, 0, v);
            const B = lerp(vh - rect.bottom, 0, v);
            mainEl.style.clipPath = `inset(${T}px ${R}px ${B}px ${L}px)`;
            const sc = lerp(s0, 1, v);
            mainEl.style.transform = sc >= 0.999 ? "" : `scale(${sc})`;
            // The window's content fades up over the first quarter of the
            // opening — the page was already rasterized at opacity 0, so
            // this is pure compositor work.
            mainEl.style.opacity = String(Math.min(1, v * 4));
        };
        if (mainEl) {
            mainEl.style.transformOrigin = `${cx}px ${cy}px`;
        }
        write(0);
        // The words don't wait for the door: stage two fires while the
        // window is still finishing its travel, so the slow content entrance
        // is already breathing as the clip lands.
        let went = false;
        const un = m.on("change", (v) => {
            write(v);
            if (!went && v >= 0.55) {
                went = true;
                if (onGo) onGo();
            }
        });
        const c = animate(m, 1, {
            duration: 1.25,
            ease: REVEAL,
            onComplete: onDone,
        });
        return () => {
            c.stop();
            un();
            if (mainEl) {
                mainEl.style.clipPath = "";
                mainEl.style.transform = "";
                mainEl.style.transformOrigin = "";
                mainEl.style.opacity = "";
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <motion.div
            className="PGLoad__frame"
            style={{ left: fL, top: fT, width: fW, height: fH, opacity: fO }}
        />
    );
}

// The stall-broken loading schedule: ~6s of advancing runs and pauses.
function buildSchedule() {
    const rand = (a, b) => a + Math.random() * (b - a);
    const total = 6000;
    const segs = [];
    let t = 0;
    while (t < total) {
        const stall = segs.length > 0 && Math.random() < 0.38;
        const dur = stall ? rand(260, 720) : rand(420, 1050);
        segs.push({ dur, gain: stall ? 0 : rand(6, 22) });
        t += dur;
    }
    const tSum = segs.reduce((a, s) => a + s.dur, 0);
    const gSum = segs.reduce((a, s) => a + s.gain, 0);
    let acc = 0;
    let p = 0;
    const schedule = segs.map((s) => {
        const seg = { t0: acc, t1: acc + (s.dur / tSum) * total, p0: p, p1: p + (s.gain / gSum) * 100 };
        acc = seg.t1;
        p = seg.p1;
        return seg;
    });
    return { schedule, total };
}

export default function Preloader() {
    const { setGate } = useGlobalContext();
    // "off" | "run" | "mask"
    const [phase, setPhase] = useState("off");
    const [hots, setHots] = useState(null);
    const [plan, setPlan] = useState(null);
    const [vp, setVp] = useState(null);
    const [maskRect, setMaskRect] = useState(null);
    const [winner, setWinner] = useState(null);
    const [hereName, setHereName] = useState(null);
    const boxRefs = useRef([]);
    // The label's last defence: the active box may straddle a screen edge
    // (an earlier active in the band relaxes SLOWLY and keeps pushing), so
    // each label can slide inside its box just far enough to stay readable.
    // The shift is derived per frame from the same rects as the geometry.
    const labelRefs = useRef([]);
    const labelW = useRef(SLOTS.map(() => 0));
    const labelX = useRef(null);
    const labelY = useRef(null);
    if (!labelX.current) {
        labelX.current = SLOTS.map(() => motionValue(0));
        labelY.current = SLOTS.map(() => motionValue(0));
    }
    // One pair of scale drivers per slot, and one rect quad per slot the
    // per-frame layout writes into — geometry as data flow, not as tweens.
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
    const enterOrder = useRef(SLOTS.map((_, i) => i));
    // Rest opacities: each idle box holds its own faint value — the cluster
    // reads as a thought of a background, not a set of panels.
    const restOp = useRef(SLOTS.map(() => 0.2));
    const doneRef = useRef(false);
    const pct = useMotionValue(0);
    const barX = useTransform(pct, (v) => v / 100);
    const pctText = useTransform(pct, (v) => `${Math.round(v)} %`);

    // Activation: freeze scroll, take the viewport, build the clock.
    useEffect(() => {
        if (!document.documentElement.hasAttribute("data-preload")) return;
        // Two ways past the curtain, one code path.
        //
        //   ?nopl=1                 test bypass (responsive / visual verification
        //                           would otherwise pay the full 9s per load).
        //   the editing surface     the Studio's /studio/edit reloads its frame on
        //                           every page switch, every Obnovit and every
        //                           draft/published toggle, and 2.5s of entrance
        //                           each time is a tax on the work. /studio/preview
        //                           is NOT bypassed: a visitor sees the curtain, so
        //                           the surface whose job is faithfulness shows it.
        //
        // Both drop the attribute and flip the gate by hand, because the gate was
        // read off that attribute one render ago (see LoadProvider) and nothing
        // else would ever release the heroes.
        try {
            if (new URLSearchParams(window.location.search).has("nopl") || isEditSurfaceFrame()) {
                document.documentElement.removeAttribute("data-preload");
                setGate("go");
                return;
            }
        } catch (e) {}
        // The entrance is a random scatter, not a reading-order sweep.
        const ord = SLOTS.map((_, i) => i);
        for (let i = ord.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ord[i], ord[j]] = [ord[j], ord[i]];
        }
        enterOrder.current = ord;
        restOp.current = SLOTS.map(() => 0.15 + Math.random() * 0.1);
        try {
            setHereName(nameForPath(window.location.pathname));
        } catch (e) {}
        setPlan(buildSchedule());
        setVp({ w: window.innerWidth, h: window.innerHeight });
        window.scrollTo(0, 0);
        let tries = 0;
        const grab = setInterval(() => {
            if (window.lenis) {
                window.lenis.scrollTo(0, { immediate: true });
                window.lenis.stop();
                clearInterval(grab);
            } else if (++tries > 100) clearInterval(grab);
        }, 30);
        setPhase("run");
        return () => clearInterval(grab);
    }, []);

    // The loading clock: percent follows the schedule; at 100% the winner is
    // measured, the gate flips, the window starts opening.
    useEffect(() => {
        if (phase !== "run" || !plan) return;
        let raf;
        let picked = false;
        let warmed = false;
        let pickedSlot = null;
        const t0 = performance.now();
        const tick = (now) => {
            const t = now - t0;
            const seg =
                plan.schedule.find((s) => t >= s.t0 && t < s.t1) ||
                plan.schedule[plan.schedule.length - 1];
            const u = Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0)));
            pct.set(t >= plan.total ? 100 : lerp(seg.p0, seg.p1, u));
            // One second before the end: choose the window — a RANDOM box
            // from around the centre — brake everything else to rest, and
            // let only the chosen one swell.
            if (!picked && t >= plan.total - 1000) {
                picked = true;
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                // A tiny mute frame makes a degenerate window (and can't
                // carry the finale's name) — a qualifying candidate is a
                // PAGE box, or a mute at least a fifth of the screen's
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
                pickedSlot = pool.length
                    ? pool[Math.floor(Math.random() * pool.length)]
                    : best
                      ? best.si
                      : 0;
                setWinner(pickedSlot);
                setHots({ primary: pickedSlot, others: [], final: true });
            }
            // Stage one of the handoff, a beat before the window opens: the
            // heroes' GROUND (photos, shaders, apertures) enters now, so the
            // image is already standing when the window opens. The words,
            // buttons and navbar wait for stage two, after the reveal.
            if (!warmed && t >= plan.total - 400) {
                warmed = true;
                setGate("ground");
            }
            if (t < plan.total) raf = requestAnimationFrame(tick);
            else {
                const el = boxRefs.current[pickedSlot != null ? pickedSlot : 0];
                if (el) {
                    const r = el.getBoundingClientRect();
                    setMaskRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
                }
                setPhase("mask");
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [phase, plan, pct, setGate]);

    // The visit: a RANDOM handful of pages (never dutifully all of them),
    // ending ALWAYS on the page the visitor is actually loading — the
    // sequence lands where they land. Each visit brings company: one or two
    // random co-actives (an empty frame may glow too). The glide is longer
    // than the cadence, so the motion never stops and never snaps.
    useEffect(() => {
        if (phase !== "run" || !plan) return;
        const here = (() => {
            try {
                const path = window.location.pathname;
                const pi = NavPages.findIndex((pg) => pg.href === path);
                if (pi < 0) return null;
                const si = SLOTS.findIndex((sl) => sl.page === pi);
                return si < 0 ? null : si;
            } catch (e) {
                return null;
            }
        })();
        let pool = SLOTS.map((sl, si) => (sl.page != null ? si : null)).filter(
            (v) => v != null && v !== here,
        );
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const pages = pool.slice(0, 4 + Math.floor(Math.random() * 2));
        if (here != null) pages.push(here);
        const lead = 600;
        const per = (plan.total - lead - 1100) / pages.length;
        const timers = pages.map((slot, k) =>
            setTimeout(() => {
                const pool = SLOTS.map((_, si) => si).filter((si) => si !== slot);
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                setHots({ primary: slot, others: pool.slice(0, 1 + Math.floor(Math.random() * 2)) });
            }, lead + k * per),
        );
        return () => timers.forEach(clearTimeout);
    }, [phase, plan]);

    // Label widths, re-measured when a visit or the finale can change the
    // text (one layout read per change, never per frame).
    useEffect(() => {
        SLOTS.forEach((_, si) => {
            const el = labelRefs.current[si];
            if (el) labelW.current[si] = el.offsetWidth;
        });
    }, [hots, winner, hereName, phase]);

    // Scale targets: each box animates its own multiplier at its own pace.
    useEffect(() => {
        if (phase === "off") return;
        const current = phase === "run" ? hots : null;
        SLOTS.forEach((_, si) => {
            const t = scaleOf(si, current);
            const act =
                current && (current.primary === si || current.others.includes(si));
            const tr =
                current && current.final
                    ? FINAL_GLIDE
                    : act
                      ? ACTIVE_GLIDE
                      : BYSTANDER;
            animate(scales.current[si].w, t.w, tr);
            animate(scales.current[si].h, t.h, tr);
        });
    }, [hots, phase]);

    // The per-frame layout: read every scale, lay the bands out flush, write
    // the rectangles. Contact is exact on every single frame.
    useAnimationFrame(() => {
        if (!vp || phase !== "run") return;
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
        if (doneRef.current) return;
        doneRef.current = true;
        // Stage two: the reveal is done — now the words and buttons come,
        // and the navbar with them (its CSS hold releases with the
        // attribute below).
        setGate("go");
        const html = document.documentElement;
        html.removeAttribute("data-preload");
        html.removeAttribute("data-preload-reveal");
        setPhase("off");
        setTimeout(() => window.lenis && window.lenis.start(), 900);
    };

    if (phase === "off" || !vp) return <div className="PGLoad" aria-hidden="true" />;

    const isActive = (si) =>
        phase === "run" &&
        hots != null &&
        (hots.primary === si || hots.others.includes(si));

    return (
        <div className="PGLoad PGLoad--live" aria-hidden="true">
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
                                phase === "mask"
                                    ? { opacity: 0, transition: { duration: i === winner ? 0.12 : 0.4, ease: CURTAIN, delay: i === winner ? 0 : 0.05 + enterOrder.current.indexOf(i) * 0.04 } }
                                    : { opacity: isActive(i) ? 0.4 : restOp.current[i], transition: { duration: 0.9, ease: CURTAIN, delay: hots == null ? 0.1 + enterOrder.current.indexOf(i) * 0.05 : 0 } }
                            }
                        >
                            <motion.div
                                className="PGLoad__box__marks"
                                initial={false}
                                animate={{ opacity: isActive(i) ? 1 : 0 }}
                                transition={{ duration: 0.6, ease: CURTAIN }}
                            >
                                <span className="PGLoad__mark PGLoad__mark--tl" />
                                <span className="PGLoad__mark PGLoad__mark--tr" />
                                <span className="PGLoad__mark PGLoad__mark--br" />
                                <span className="PGLoad__mark PGLoad__mark--bl" />
                            </motion.div>
                        </motion.div>
                        {(sl.page != null || (i === winner && hereName)) && (
                            // OUTSIDE the skin: the skin clips its overflow,
                            // and a screen-edge-clamped label must be free to
                            // cross its own box's hairline. The 0.4 restores
                            // the half-light the skin used to lend it.
                            <motion.span
                                className="PGLoad__box__label"
                                initial={false}
                                animate={
                                    phase === "run" && hots != null && hots.primary === i
                                        ? { opacity: 0.4, y: 0, transition: { duration: 0.7, ease: CURTAIN, delay: 0.15 } }
                                        : { opacity: 0, y: 10, transition: { duration: i === winner ? 0.12 : 0.5, ease: CURTAIN } }
                                }
                            >
                                <motion.span
                                    className="PGLoad__box__label__txt"
                                    ref={(el) => (labelRefs.current[i] = el)}
                                    style={{ x: labelX.current[i], y: labelY.current[i] }}
                                >
                                    {hots && hots.final && i === winner && hereName
                                        ? hereName
                                        : sl.page != null
                                          ? NavPages[sl.page].text
                                          : hereName}
                                </motion.span>
                            </motion.span>
                        )}
                    </motion.div>
                ))}
            </div>

            <p className="PGLoad__word">
                <CharLine text={EYEBROW} className="PGLoad__line PGLoad__line--eyebrow" phase={phase} baseIn={0.15} baseOut={0} />
                <CharLine text={NAME} className="PGLoad__line PGLoad__line--name" phase={phase} baseIn={0.3} baseOut={0.06} />
            </p>

            <motion.p
                className="PGLoad__pct"
                initial={{ opacity: 0 }}
                animate={
                    phase === "mask"
                        ? { opacity: 0, transition: { duration: 0.35, ease: CURTAIN } }
                        : { opacity: 1, transition: { duration: 0.7, ease: CURTAIN, delay: 0.5 } }
                }
            >
                <motion.span>{pctText}</motion.span>
            </motion.p>

            <motion.div
                className="PGLoad__bar"
                initial={{ opacity: 0 }}
                animate={
                    phase === "mask"
                        ? { opacity: 0, transition: { duration: 0.35, ease: CURTAIN } }
                        : { opacity: 1, transition: { duration: 0.7, ease: CURTAIN, delay: 0.4 } }
                }
            >
                <motion.div className="PGLoad__bar__fill" style={{ scaleX: barX }} />
            </motion.div>

            {phase === "mask" && maskRect && (
                <MaskReveal rect={maskRect} onGo={() => setGate("go")} onDone={finish} />
            )}
        </div>
    );
}
