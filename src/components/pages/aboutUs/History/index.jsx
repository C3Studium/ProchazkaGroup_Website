"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import GridDistortion from "@/components/common/ui/GridDistortion";
import { animate, cubicBezier, motion, useInView, useMotionValue, useScroll, useTransform } from "framer-motion";
import { editable } from "@/cms/edit";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// A curtain, the way the sections on the home page draw their copy: the line is
// held behind its own left edge and let out. `from`/`to` are where in the
// panel's arrival this particular line takes its turn.
const curtain = (a, from, to) => {
    const t = clamp01((a - from) / (to - from));
    return `inset(-30% ${((1 - t) * 100).toFixed(2)}% -30% 0%)`;
};

// Placeholder milestones — the shape the real history will take, not the
// history. Each carries where its numeral stands, in percentages of the sticky
// viewport, because the numeral does not sit still: it is one mark that walks
// the section, and where its numeral stands.
// Each panel is a composition of its own: where its picture sits, where its
// words sit, where its numeral stands, and which rules frame the three.
//
// The rules are the point of the layout rather than decoration on top of it —
// they are what makes a panel read as a page from a set rather than a slide.
// `v` is a vertical at `x`, running from `from` to `to` in vh; `h` is a
// horizontal at `y` running between two x's in vw. `accent` marks the few that
// are drawn in the highlight colour instead of the hairline white.
//
// The numeral belongs to the panel too. It used to be one mark for the whole
// section that walked from panel to panel and melted from digit to digit; the
// references have nothing of the sort — each page carries its own number, set
// large enough that the panel edge cuts it, so the tail of one shows beside the
// head of the next exactly the way the photographs do.
const MILESTONES = [
    {
        n: "01",
        date: "2023-11-15 | Annual Company Meeting",
        body: "A weekend retreat focused on team-building activities to strengthen collaboration and communication among team members.",
        image: "/assets/backgrounds/wheels/questRoom.webp",
        // Cut by the left edge on purpose.
        numeral: { left: -7, top: 8 },
        layout: {
            photo: { left: 26, top: 10, width: 44, ratio: 16 / 9 },
            copy: { left: 13, top: 60, width: 38, align: "left" },
        },
        rules: [
            { v: 11.5, from: 0, to: 100 },
            { v: 37, from: 0, to: 4 },
            { v: 44, from: 0, to: 52 },
            { h: 4, from: 37, to: 44 },
            { h: 87, from: 5, to: 31 },
            { h: 87, from: 51, to: 72 },
            { v: 64, from: 0, to: 71 },
        ],
    },
    {
        n: "02",
        date: "2023-11-15 | Annual Company Meeting",
        body: "A weekend retreat focused on team-building activities to strengthen collaboration and communication among team members.",
        image: "/assets/backgrounds/wheels/mainOffice.webp",
        numeral: { left: 30, top: 26 },
        layout: {
            photo: { left: 19, top: 36, width: 38, ratio: 16 / 10 },
            copy: { left: 65, top: 20, width: 28, align: "right" },
        },
        rules: [
            { v: 11, from: 0, to: 100 },
            { h: 10, from: 34, to: 96 },
            { v: 60, from: 24, to: 94 },
            { h: 37, from: 96, to: 100 },
            { v: 96, from: 30, to: 44 },
        ],
    },
    {
        n: "03",
        date: "2023-11-15 | Annual Company Meeting",
        body: "A weekend retreat focused on team-building activities to strengthen collaboration and communication among team members.",
        image: "/assets/backgrounds/wheels/family.webp",
        numeral: { left: 40, top: 2 },
        layout: {
            photo: { left: 20, top: 44, width: 40, ratio: 16 / 11 },
            copy: { left: 21, top: 14, width: 46, align: "left" },
        },
        rules: [
            { v: 16.5, from: 0, to: 100 },
            { v: 9, from: 10, to: 40 },
            { h: 11, from: 0, to: 32 },
            { h: 38, from: 16.5, to: 39 },
            { h: 99, from: 0, to: 100, accent: true },
            { v: 99, from: 0, to: 100, accent: true },
        ],
    },
    {
        n: "04",
        date: "2023-11-15 | Annual Company Meeting",
        body: "A weekend retreat focused on team-building activities to strengthen collaboration and communication among team members.",
        image: "/assets/backgrounds/secondOffice_1300.webp",
        numeral: { left: 44, top: 14 },
        layout: {
            photo: { left: 34, top: 9, width: 40, ratio: 16 / 9 },
            copy: { left: 16, top: 66, width: 34, align: "left" },
        },
        rules: [
            { v: 15.5, from: 0, to: 100 },
            { v: 8, from: 0, to: 46 },
            { h: 4, from: 15.5, to: 74 },
            { h: 70, from: 0, to: 16, accent: true },
            { h: 87, from: 15.5, to: 35 },
        ],
    },
];

const LAST = MILESTONES.length - 1;

// The history, ridden sideways.
//
// It is mounted before it is wanted and opened later — `open` is the switch. The
// reason is that mounting it *at* the moment the hold completed put four
// viewports of DOM and four photographs between the reader and the thing they
// had just asked for: measured, the first photograph appeared two seconds after
// the button filled, and its download did not even begin until 700ms into that.
// Mounted early it is `position: fixed`, transparent and untouchable, so it
// costs the page no height and the reader sees nothing — but the browser has the
// images by the time the switch is thrown, and all that is left to do then is
// the animation.
//
// Each panel carries its own number, set large enough that the panel edge cuts
// it — see the note on MILESTONES.
export default function History({ open = true, onReady, panels }) {
    const sectionRef = useRef(null);

    // Merged by position onto the four the section owns, and truncated to them.
    // The track is `LAST * 100vw` wide and every panel's arrival is measured
    // against its own distance from the middle of the screen, so a fifth block
    // would not appear at the end of the ride — it would move the ride. Every
    // field falls back on its own, so a block that fills in only its paragraph
    // keeps the numeral, the dateline and the photograph the panel shipped with.
    const milestones = MILESTONES.map((item, index) => {
        const block = panels?.[index] || null;
        return {
            ...item,
            n: block?.numeral?.trim() ? block.numeral.trim() : item.n,
            date: block?.date?.trim() ? block.date.trim() : item.date,
            body: block?.body?.trim() ? block.body.trim() : item.body,
            image: block?.photo?.src ? block.photo.src : item.image,
            alt: block?.photo?.src ? block.photo.alt || "" : "",
            docId: block?.docId,
        };
    });

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });

    // A panel is one viewport wide, or two on a tablet upright — see the block
    // at the foot of styles.scss, which sets the panel and the track. This is
    // the third number in that set and it is a motion value, so the stylesheet
    // cannot reach it: the travel has to be told separately or the ride stops
    // half way along a track twice as long as it thinks.
    const [panelVw, setPanelVw] = useState(100);
    useEffect(() => {
        const query = window.matchMedia(
            "(min-width: 600px) and (max-width: 900px) and (orientation: portrait)");
        const read = () => setPanelVw(query.matches ? 200 : 100);
        read();
        query.addEventListener("change", read);
        return () => query.removeEventListener("change", read);
    }, []);

    // Panels ride right to left, one panel each.
    const x = useTransform(scrollYProgress, [0, 1], ["0vw", `-${LAST * panelVw}vw`]);

    // Whether the stylesheet has stacked the panels into a column — the same
    // 820px seam as `below-px(820)` in styles.scss. A motion value rather than
    // state, for two reasons: flipping it must not re-render four shader
    // planes, and the transforms that need it (each panel's arrival) can
    // subscribe to it directly. Starts 0 on the server and on first paint,
    // which renders the horizontal composition — the stylesheet is what hides
    // that composition's coordinates on a narrow screen, so nothing flashes.
    const stacked = useMotionValue(0);
    useEffect(() => {
        // The same set the stylesheet stacks on. An upright tablet rides now, so
        // it is not in it — left at a bare 820 this would tell every panel it was
        // in a column while the stylesheet was riding them past.
        const query = window.matchMedia(
            "(max-width: 599.98px), (max-width: 820px) and (orientation: landscape)");
        const read = () => stacked.set(query.matches ? 1 : 0);
        read();
        query.addEventListener("change", read);
        return () => query.removeEventListener("change", read);
    }, [stacked]);

    // What the section does when it is switched on, and then what its first
    // panel does once it has. Two beats, not one: the stage opens, and only then
    // does anything on it arrive. Run together, the first milestone was already
    // finished by the time there was anywhere to see it.
    const intro = useMotionValue(0);

    const opened = () => {
        if (!open) return;
        onReady?.();
        animate(intro, 1, { duration: 1.1, ease: GLIDE });
    };

    // Taking its place in the flow is a layout change the scroll tracker cannot
    // see on its own — it measured the section while it was fixed at one screen
    // tall, and would keep driving the panels off that measurement.
    useEffect(() => {
        if (!open) return;
        const id = requestAnimationFrame(() => {
            window.lenis?.resize?.();
            window.dispatchEvent(new Event("resize"));
        });
        return () => cancelAnimationFrame(id);
    }, [open]);

    return (
        <motion.section
            className={`History${open ? "" : " is-waiting"}`}
            ref={sectionRef}
            aria-hidden={open ? undefined : true}
            // Opened from the middle outwards rather than uncovered upwards.
            // Everything else on the site arrives from below because that is the
            // way the page is read; this is the one section read sideways, and
            // opening it sideways says so before a single panel has moved.
            initial={{ opacity: 0, clipPath: "inset(0% 50% 0% 50%)" }}
            animate={open
                ? { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }
                : { opacity: 0, clipPath: "inset(0% 50% 0% 50%)" }}
            transition={{ duration: 1.15, ease: GLIDE }}
            onAnimationComplete={opened}
        >
            <div className="History__sticky">
                <motion.div className="History__track" style={{ x }}>
                    {/* Keyed by position rather than by numeral: the numeral is
                        the editor's now, and two panels numbered the same would
                        be a duplicate key and a panel that stops being drawn.
                        The list is a fixed four and never reorders. */}
                    {milestones.map((item, index) => (
                        <Panel
                            k={panelVw / 100}
                            key={index}
                            item={item}
                            index={index}
                            progress={scrollYProgress}
                            intro={intro}
                            stacked={stacked}
                            open={open}
                        />
                    ))}
                </motion.div>
            </div>
        </motion.section>
    );
}

// `k` is the panel's width as a multiple of the screen — 1 everywhere, 2 on a
// tablet upright. Every HORIZONTAL coordinate below is written in vw, which is
// the screen and not the panel, so widening the panel moved nothing on its own:
// the composition stayed its old size in the left half of a box twice as big.
// Multiplying them here is what actually scales it.
//
// `top` is deliberately not multiplied. It is vh, and the screen is exactly as
// tall as it was — doubling it would drop every photograph through the floor.
function Panel({ item, index, progress, intro, stacked, open, k = 1 }) {
    // How far this panel is from the middle of the screen, in viewports: 0 when
    // it is centred, 1 when it is a whole screen off to the right, -1 to the
    // left. The track moves by exactly one viewport per step, so this is the
    // panel's real position rather than a guess derived from it.
    //
    // The arrival used to be keyed to the section's own progress — a window cut
    // out of 0..1 for each panel. That is why it read wrong: those windows have
    // nothing to do with where the panel actually is, so a panel could be
    // finished arriving while it was still off screen, and the first one, whose
    // window collapsed to a point, never arrived at all.
    const distance = useTransform(progress, (p) => index - p * LAST);
    const near = useTransform(distance, (d) => Math.abs(d));

    // Stacked in a column (the stylesheet's below-px(820) seam), the panel's
    // real position is vertical and the distance above means nothing — driven
    // by it, a panel would fade out the moment the reader scrolled past the
    // one before it. So in the column each panel arrives the way every other
    // section of the site does: once, when it comes into view. `seen` is that
    // arrival. It waits for `open` as well as the viewport, because while the
    // section is mounted-but-waiting it sits fixed over the screen, invisible,
    // and the observer would count its first panels as "in view" before there
    // is anything to see.
    const panelRef = useRef(null);
    const seen = useMotionValue(0);
    const inView = useInView(panelRef, { amount: 0.2, once: true });
    useEffect(() => {
        if (!inView || !open) return;
        const run = animate(seen, 1, { duration: 0.9, ease: GLIDE });
        return () => run.stop();
    }, [inView, open, seen]);

    // One number for the whole panel: 0 while it is away, 1 once it is here.
    // The first milestone is also held back until the stage has finished
    // opening — otherwise it is complete before anyone can see it. The intro
    // gates the first panel in the column too: it is on screen the moment the
    // section opens, and its pieces should still take their turn.
    const arrive = useTransform([near, intro, seen, stacked], ([n, i, s, st]) => {
        if (st) return index === 0 ? s * i : s;
        const byDistance = 1 - clamp01((n - 0.2) / 0.62);
        return index === 0 ? byDistance * i : byDistance;
    });

    // Every piece takes its own turn out of that one number. This is the home
    // page's idiom rather than a fade: photographs are uncovered, and copy is
    // drawn out from behind its own edge a line at a time.
    const opacity = useTransform(arrive, [0, 0.22], [0, 1]);
    const photoClip = useTransform(arrive, (a) =>
        `inset(0% 0% ${((1 - clamp01(a / 0.72)) * 100).toFixed(2)}% 0%)`);
    // Pushed back a little while it opens, so it settles into place rather than
    // simply being uncovered where it already was.
    const photoScale = useTransform(arrive, [0, 0.72], [1.06, 1], { ease: GLIDE });
    const dateClip = useTransform(arrive, (a) => curtain(a, 0.3, 0.72));
    const dateX = useTransform(arrive, (a) => `${(-(1 - clamp01((a - 0.3) / 0.42)) * 0.5).toFixed(2)}em`);
    const bodyClip = useTransform(arrive, (a) => curtain(a, 0.42, 0.94));
    const bodyX = useTransform(arrive, (a) => `${(-(1 - clamp01((a - 0.42) / 0.52)) * 0.5).toFixed(2)}em`);
    const draw = useTransform(arrive, [0.08, 0.7], [0, 1], { ease: GLIDE });
    // The number drifts a little against its panel, so the layers have depth
    // rather than travelling as one flat card.
    const numeralX = useTransform(distance, [-1, 1], ["-6vw", "6vw"]);

    const { photo, copy } = item.layout;

    return (
        <div className="History__panel" ref={panelRef}>
            {/* The number this page is, behind everything on it. */}
            {/* A position in a fixed list of four the track's width is computed
                from: an editor changes what it says, not how many there are. */}
            <motion.span
                {...editable(item.docId, "items.0.label", "text")}
                className="History__numeral"
                aria-hidden="true"
                style={{
                    opacity,
                    x: numeralX,
                    left: `${item.numeral.left * k}vw`,
                    top: `${item.numeral.top}vh`,
                }}
            >
                {item.n}
            </motion.span>

            {/* Then the rules, so everything else stands on them. */}
            {item.rules.map((rule, i) => (
                <Rule key={i} rule={rule} draw={draw} k={k} />
            ))}

            {/* The box, not the <Image>: the picture and the shader plane laid
                over it are the same photograph, and what an editor means by
                "this photo" is the file both of them sample. */}
            <motion.div
                {...editable(item.docId, "image", "image")}
                className="History__photo"
                data-cursor="frame"
                style={{
                    opacity,
                    clipPath: photoClip,
                    left: `${photo.left * k}vw`,
                    top: `${photo.top}vh`,
                    width: `${photo.width * k}vw`,
                    aspectRatio: String(photo.ratio),
                }}
            >
                <motion.div className="History__photo__inner" style={{ scale: photoScale }}>
                    <GridDistortion imageSrc={item.image} cellSize={46}>
                    <Image
                        src={item.image}
                        alt={item.alt || ""}
                        fill={true}
                        quality={80}
                        sizes="56vw"
                        // The first one is fetched the moment the section is
                        // mounted rather than when it comes into view. While the
                        // section is waiting it sits behind a closed clip-path,
                        // and a lazily loaded image inside one of those is never
                        // requested at all — measured: still `complete: false`
                        // after the wait. Eager is what makes the early mount
                        // buy anything. The other three load on the ride across.
                        priority={index === 0}
                        style={{ objectFit: "cover", objectPosition: "center" }}
                    />
                    </GridDistortion>
                </motion.div>
            </motion.div>

            <div
                className="History__copy"
                style={{
                    left: `${copy.left * k}vw`,
                    top: `${copy.top}vh`,
                    width: `${copy.width * k}vw`,
                    textAlign: copy.align,
                }}
            >
                <motion.span
                    {...editable(item.docId, "title", "text")}
                    className="History__date"
                    style={{ opacity, clipPath: dateClip, x: dateX }}
                >
                    {item.date}
                </motion.span>
                <motion.p
                    {...editable(item.docId, "body", "text")}
                    style={{ opacity, clipPath: bodyClip, x: bodyX }}
                >
                    {item.body}
                </motion.p>
            </div>
        </div>
    );
}

// One rule, drawn in as its panel arrives — from its start, the way every other
// rule on the site is drawn.
function Rule({ rule, draw, k = 1 }) {
    const vertical = rule.v !== undefined;
    const style = vertical
        ? {
            left: `${rule.v * k}vw`,
            top: `${rule.from}vh`,
            height: `${rule.to - rule.from}vh`,
            width: "1px",
            transformOrigin: "center top",
            scaleY: draw,
        }
        : {
            left: `${rule.from * k}vw`,
            top: `${rule.y ?? rule.h}vh`,
            width: `${(rule.to - rule.from) * k}vw`,
            height: "1px",
            transformOrigin: "left center",
            scaleX: draw,
        };

    return (
        <motion.div
            className={`History__rule${rule.accent ? " is-accent" : ""}`}
            style={style}
        />
    );
}
