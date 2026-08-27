"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import { CURTAIN, ENTERS, RISE, group } from "@/components/common/ui/entrance";

// Benefit program — 06, what people say, as one horizontal belt.
//
// It sits directly under "Prodávám tím své známé?", and it is the answer to
// it: the people talking here are the ones who were recommended, or did the
// recommending. So it does not stand still like a testimonial wall — it is a
// belt, running right to left the way the ride above ran, and reaching for a
// card stops the belt and grows the card while its neighbours give exactly
// that much up. The same two moves the whole page is built from: belts that
// drift, members that trade a conserved total.
//
// Why the trade is wrap-safe: the belt loops by wrapping its offset against
// the width of one pass, and a hover that changed that width would jolt the
// loop — the voucher belts on /nabidka were debugged for exactly this. Here
// the growth is the navbar's spread(), whose shares sum to the rest total BY
// CONSTRUCTION, and it is applied identically to every copy of the pass — so
// the pass is the same width with a card grown as without, to the pixel, and
// the loop never feels it.

// Twins of the media queries in styles.scss. Every one of these is written out
// there too, against the same numbers, and the two have to move together — the
// card's HEIGHT is decided in CSS and its WIDTH here, so a stop that exists on
// one side and not the other produces a card of the wrong shape rather than a
// card of the wrong size.
//
// The landscape arm is not optional. A phone held sideways is 844 or 932 px
// wide: on width alone it reads as a tablet and gets the tablet composition on
// a viewport 390 px tall. Height is the only thing that tells them apart, and
// 520px clears the tallest phone (430) while staying under the shortest tablet
// (768).
const MQ_PHONE_LAND = "(max-width: 1199.98px) and (max-height: 520px) and (orientation: landscape)";
const MQ_PHONE = "(max-width: 749.98px)";
// 1000, not the md stop at 1200: an iPad in landscape is 1180 wide, and at
// that width the desktop's three-cards-across is the better composition — the
// tablet tier there gives a 684px card with a two-line quote adrift in it. The
// tablet tier is for the portrait slab, 768–1000.
const MQ_TABLET = "(max-width: 999.98px)";
const MQ_COARSE = "(hover: none) and (pointer: coarse)";

const readMode = () => {
    if (window.matchMedia(MQ_PHONE_LAND).matches) return "phland";
    if (window.matchMedia(MQ_PHONE).matches) return "phone";
    if (window.matchMedia(MQ_TABLET).matches) return "tablet";
    return "desk";
};

// What size a card earns — the reviews wall's rule: the layout comes out of
// how much each person wrote, which is the only reason an uneven belt is
// honest rather than decorative. Widths in vw, four tiers, longest last.
//
// The tiers are per-composition because vw is not a constant amount of
// reading. 34vw is a third of a desktop and a comfortable column; 34vw of a
// 390px phone is 133px, which is three words a line and a quote sliced off
// mid-sentence — measured, and it looked like a stack of dominoes rather than
// anything anybody said. On a phone a card is most of the width and the belt
// shows one quote at a time; the SPREAD between the tiers is kept, so the
// belt stays as uneven as the reviews are long.
const SIZES = {
    desk: [21, 25, 29, 34],
    tablet: [40, 46, 52, 58],
    phland: [34, 40, 46, 52],
    phone: [62, 70, 78, 86],
};

const sizeOf = (message, mode) => {
    const tiers = SIZES[mode] || SIZES.desk;
    const n = (message || "").length;
    if (n > 300) return tiers[3];
    if (n > 170) return tiers[2];
    if (n > 90) return tiers[1];
    return tiers[0];
};

// The navbar wall's arithmetic — see BenefitRide, which carries the long note.
const spread = (bases, active, grow, floor) => {
    const n = bases.length;
    if (active < 0 || active >= n || n < 2) return bases;

    const weights = [];
    let wsum = 0;
    for (let i = 0; i < n; i++) {
        if (i === active) { weights.push(0); continue; }
        const w = 1 / Math.pow(Math.abs(i - active), 1.35);
        weights.push(w);
        wsum += w;
    }

    const wanted = (grow - 1) * bases[active];
    const out = bases.map((b, i) =>
        (i === active ? 0 : Math.max(b * floor, b - wanted * (weights[i] / wsum))));

    const freed = out.reduce((sum, v, i) => (i === active ? sum : sum + (bases[i] - v)), 0);
    out[active] = bases[active] + freed;
    return out;
};

const GROW = 1.4;
const FLOOR = 0.66;
const WIDTH_SPRING = { type: "spring", stiffness: 150, damping: 26, restDelta: 0.001 };
const CALM_HOVER = { duration: 0.45, ease: CURTAIN };

// Pixels a second, and what is left of that under reduced motion — the belts
// on /nabidka settled on the same bargain: quarter speed, never a standstill.
const SPEED = 750;
const QUIET = 0.25;
const GAP_VW = 1.1;

// A belt's speed is only meaningful as a fraction of the screen it crosses.
// 750 px/s is half a 1500px desktop a second, which is the pace this was
// tuned at; the same number on a 390px phone is two screens a second, and at
// that rate a quote is gone before it is read. So the cruise is a share of the
// viewport, capped at the figure the desktop already had — from 1210px up the
// cap binds and nothing about the desktop belt changes.
//
// Coarse pointers take a further cut. A mouse can hover to hold a card still
// and read it; a thumb has no such move, so the only thing that can buy a
// touch reader the same time is the belt running slower. It also makes the
// cards aimable: the tap target is the whole card, and at ~170 px/s on a
// phone a 300px card sits under the thumb for the better part of two seconds.
const COARSE_EASE = 0.7;
const cruiseFor = (w, coarse) =>
    Math.min(SPEED, Math.max(200, w * 0.62)) * (coarse ? COARSE_EASE : 1);

export default function BenefitReviews({ reviews = [] }) {
    const trackRef = useRef(null);
    const wallRef = useRef(null);
    const offset = useRef(0);
    const vel = useRef(0);
    const paused = useRef(false);
    // Which way the belt runs: 1 with the page (scrolling down, cards travel
    // left), −1 against it. The last scroll the reader made decides, and the
    // belt keeps that heading until they turn — the velocity ease below is
    // what turns the flip into a swing through zero rather than a cut.
    const dir = useRef(1);
    const lastScrollY = useRef(0);
    // True from the click until the sheet's exit has fully completed. While it
    // is, the loop neither advances nor WRITES: framer's shared-layout
    // projection re-measures on every transform mutation of an ancestor, so a
    // loop that kept writing the same frozen transform each frame held the
    // card→sheet morph in permanent re-measurement — the sheet jittered and
    // its exit could never finish, which read as Escape not working.
    const sheetLive = useRef(false);
    const last = useRef(null);
    const frame = useRef(null);

    const [hot, setHot] = useState(-1);

    // The reviews page's own gesture, brought over: clicking a card opens the
    // card itself into a centred sheet — one layoutId on the card and its
    // words, so it is THAT card that grows rather than a dialog appearing over
    // it. The belt freezes on the spot first: a shared-element morph measures
    // where it started, and a start that is still travelling smears.
    const [open, setOpen] = useState(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return undefined;
        window.lenis?.stop();
        const onKey = (e) => { if (e.key === "Escape") hide(); };
        window.addEventListener("keydown", onKey);
        return () => {
            window.lenis?.start();
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const [calm, setCalm] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => setCalm(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    // Coarse pointer and fine pointer are read as two separate questions
    // rather than one negated. `canHover` gates every hover affordance: on a
    // touch screen a tap raises pointerenter and NEVER the matching
    // pointerleave, so an ungated hover pause on a moving belt latches on the
    // first tap and the belt is frozen for the rest of the visit.
    const [canHover, setCanHover] = useState(false);
    const [coarse, setCoarse] = useState(false);
    useEffect(() => {
        const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
        const rough = window.matchMedia(MQ_COARSE);
        const sync = () => { setCanHover(fine.matches); setCoarse(rough.matches); };
        sync();
        fine.addEventListener("change", sync);
        rough.addEventListener("change", sync);
        return () => {
            fine.removeEventListener("change", sync);
            rough.removeEventListener("change", sync);
        };
    }, []);

    // Which composition the belt is in — see MQ_* above, and their twins in
    // styles.scss. Held as state rather than read per frame so the widths it
    // decides go through one render.
    const [mode, setMode] = useState("desk");
    useEffect(() => {
        const mqs = [MQ_PHONE_LAND, MQ_PHONE, MQ_TABLET].map((q) => window.matchMedia(q));
        const sync = () => setMode(readMode());
        sync();
        mqs.forEach((mq) => mq.addEventListener("change", sync));
        return () => mqs.forEach((mq) => mq.removeEventListener("change", sync));
    }, []);

    // Eight is enough belt: two copies cover any viewport and the pass stays
    // long enough that the same words never show twice at once.
    const cards = useMemo(() => reviews.slice(0, 8), [reviews]);
    const bases = useMemo(() => cards.map((r) => sizeOf(r.message, mode)), [cards, mode]);
    const runVw = useMemo(
        () => bases.reduce((a, b) => a + b, 0) + cards.length * GAP_VW,
        [bases, cards.length],
    );

    // How wide one pass actually is, MEASURED — the distance from the first
    // card of the first copy to the first card of the second. That is the
    // number the loop wraps against, and it has to be the true one: wrap
    // against anything larger and the belt keeps travelling past the end of
    // its own track, so the section shows a strip of cards, then nothing, then
    // cards again. It did exactly that, and on a phone in landscape it was
    // blank for seconds at a time.
    //
    // It used to be arithmetic — the vw the cards add up to, times a px-per-vw
    // read from window.innerWidth once, on mount. Two ways for that to be
    // wrong, and both were: the quantising (innerWidth rounded to the nearest
    // 8) makes the computed pass a few px wider than the laid-out one, so the
    // loop jumped every lap; and a single mount-time read of innerWidth is a
    // guess about a number that changes — mobile emulation, a rotation, a
    // late reflow — with no listener that would ever correct it. Measured, the
    // question does not arise: the pass is whatever the browser laid out, and
    // the mask, the gap and the sub-pixel widths are all already in it.
    //
    // Measured on layout, not per frame. Hover never changes it — spread()
    // conserves the total by construction — so the only things that can are
    // the viewport, the mode, and fonts landing, which is what is watched.
    const runPx = useRef(0);
    const measure = () => {
        const track = trackRef.current;
        if (!track || track.children.length <= cards.length) return;
        const a = track.children[0];
        const b = track.children[cards.length];
        const w = b.offsetLeft - a.offsetLeft;
        if (w > 0) runPx.current = w;
    };

    useEffect(() => {
        // Now, and again on the next frame — the first read happens in the
        // same commit framer writes the widths in, and the second one is the
        // one that is certain to see them.
        measure();
        let raf = requestAnimationFrame(measure);
        // The wall is full-bleed, so it resizes when the viewport does and
        // never when a card grows: exactly the events that change the pass.
        const wall = wallRef.current;
        const ro = wall
            ? new ResizeObserver(() => {
                  cancelAnimationFrame(raf);
                  raf = requestAnimationFrame(() => { raf = requestAnimationFrame(measure); });
              })
            : null;
        if (ro && wall) ro.observe(wall);
        // Switzer landing re-wraps every quote, which moves every offsetLeft.
        document.fonts?.ready?.then(measure).catch(() => {});
        return () => {
            cancelAnimationFrame(raf);
            if (ro) ro.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards.length, mode]);

    // Viewport width, for the cruise. Kept in state off a resize listener
    // rather than read inside the loop, and seeded from the wall itself — the
    // wall is full-bleed, so its laid-out width is the viewport's and is true
    // even where window.innerWidth is not yet.
    const [viewW, setViewW] = useState(0);
    useEffect(() => {
        const read = () => setViewW(wallRef.current?.clientWidth || window.innerWidth);
        read();
        window.addEventListener("resize", read);
        window.addEventListener("orientationchange", read);
        return () => {
            window.removeEventListener("resize", read);
            window.removeEventListener("orientationchange", read);
        };
    }, []);

    useEffect(() => {
        const step = (ts) => {
            if (last.current === null) last.current = ts;
            const dt = Math.min(0.05, Math.max(0, ts - last.current) / 1000);
            last.current = ts;

            // Measured above; the vw arithmetic is only the seed for the first
            // frame or two, before layout has been read.
            const wrapPx = runPx.current || runVw * (window.innerWidth / 100);

            // Read the page's own motion: down keeps the belt running with it,
            // up turns it around. A couple of pixels of dead band, so lenis
            // settling at rest does not keep twitching the heading.
            const sy = window.scrollY;
            const dy = sy - lastScrollY.current;
            lastScrollY.current = sy;
            if (dy > 2) dir.current = 1;
            else if (dy < -2) dir.current = -1;

            // And the reader's pace is the belt's: scroll velocity feeds the
            // target, so a hard scroll slings the cards along with it and a
            // stop settles back to the cruise. The clamp keeps a flung wheel
            // from turning the pass into a blur — and the existing velocity
            // ease is what makes all of it a swell rather than a jerk.
            const sv = dt > 0 ? dy / dt : 0;
            // Clamp raised with the cruise — a boost the cruise swallows is no
            // boost — and now scaled WITH it, because the cruise is no longer
            // one number. A flat ±1200 on a phone belt cruising at 170 px/s is
            // not a swell, it is a different belt.
            const cruise = cruiseFor(viewW || window.innerWidth, coarse);
            const cap = cruise * 1.6;
            const boost = Math.max(-cap, Math.min(cap, sv * 0.5));

            // The belt eases to a stop under the pointer and back up to speed
            // after it — a reader mid-sentence is not scrolled out of it.
            const want = paused.current
                ? 0
                : (cruise * dir.current + boost) * (calm ? QUIET : 1);
            const ease = 1 - Math.exp(-dt / (want === 0 ? 0.2 : 0.3));
            vel.current += (want - vel.current) * ease;

            if (!sheetLive.current) {
                const next = offset.current + vel.current * dt;
                offset.current = wrapPx > 0 ? ((next % wrapPx) + wrapPx) % wrapPx : next;
                if (trackRef.current) {
                    trackRef.current.style.transform = `translate3d(${-offset.current}px, 0, 0)`;
                }
            }
            frame.current = requestAnimationFrame(step);
        };
        frame.current = requestAnimationFrame(step);
        return () => {
            if (frame.current) cancelAnimationFrame(frame.current);
            frame.current = null;
            last.current = null;
        };
    }, [runVw, calm, coarse, viewW]);

    const shares = spread(bases, canHover ? hot : -1, GROW, FLOOR);

    const leave = () => {
        if (!open) paused.current = false;
        setHot(-1);
    };

    const show = (review, lid) => {
        sheetLive.current = true;
        paused.current = true;
        vel.current = 0;
        setOpen({ review, lid });
    };

    // Closing is a fade, not a morph home. The way in morphs — the card grows
    // into the sheet — but a morph BACK has to land on a card that lives in a
    // masked, transformed, previously-moving belt, and framer's shared-layout
    // exit never settled against it: the backdrop finished its exit, the sheet
    // hung mid-projection, and AnimatePresence (which unmounts only when every
    // exit is done) held both forever. So the link is unclipped first — one
    // render with the layoutId gone — and the exit that follows is a plain
    // fade that always completes.
    const hide = () => {
        setOpen((o) => (o ? { ...o, lid: null } : o));
        requestAnimationFrame(() => setOpen(null));
        // Belt handed back on a clock as well as on onExitComplete — the
        // children of this AnimatePresence sit inside a fragment, and a
        // completion callback that depends on how it tracks that is not
        // something the belt's motion should hang from. released() is
        // idempotent; whichever fires first wins and the second is a no-op.
        window.setTimeout(released, 420);
    };

    const released = () => {
        sheetLive.current = false;
        paused.current = false;
    };

    if (!cards.length) return null;

    return (
        <section className="BenReviews" aria-label="Recenze klientů">
            <motion.header
                className="BenReviews__head"
                variants={group()}
                initial="hidden"
                whileInView="shown"
                viewport={ENTERS}
            >
                <motion.p className="BenReviews__eyebrow" variants={RISE}>
                    <em>06</em> Takhle o nás mluví
                </motion.p>
                <motion.p className="BenReviews__lead" variants={RISE}>
                    Recenze klientů — i těch, kteří k nám přišli na doporučení.
                </motion.p>
            </motion.header>

            <div
                className="BenReviews__wall"
                ref={wallRef}
                // Inline, not left to the stylesheet, and this is the whole
                // point of it being inline: until framer writes the cards'
                // widths, a card is as wide as its quote laid out on ONE line,
                // and the track is 27 000px. If the clip is not in force for
                // that window, the browser widens the layout viewport to fit
                // it — measured at 1143px on a 390px phone, for ~150ms — and
                // anything that reads window.innerWidth on mount reads 1143.
                // TextPressure in section 05 does exactly that and sized its
                // question at 21px because of this section. An attribute is in
                // the server's HTML and is therefore in force at the first
                // paint; a class waits for a stylesheet, which in development
                // arrives after hydration. Kept in styles.scss as well — this
                // is a floor, not a replacement.
                //
                // `contain: paint` says the same thing a second way: it
                // promises the browser nothing inside is ever drawn or
                // measured outside, so the overflow cannot reach the document
                // even in the frame the width is being computed in.
                style={{ overflow: "hidden", contain: "paint" }}
                onPointerEnter={() => { if (canHover) paused.current = true; }}
                onPointerLeave={leave}
            >
                <div className="BenReviews__track" ref={trackRef} data-run={Math.round(runVw)}>
                    {[0, 1].map((pass) =>
                        cards.map((review, i) => (
                            <motion.article
                                key={`${pass}-${i}`}
                                layoutId={calm ? undefined : `benrev-${pass}-${i}`}
                                className={`BenReviews__card${canHover && hot === i ? " is-open" : ""}`}
                                style={{ flex: "0 0 auto" }}
                                // The same 27 000px track, addressed at the
                                // source rather than only clipped: framer
                                // writes `initial` into the server's HTML, so
                                // a card is a card-width from the first paint
                                // instead of as wide as its quote on one line.
                                // It is the same value `animate` carries, so
                                // there is no enter animation and the hover
                                // spring is untouched.
                                initial={{ width: `${shares[i]}vw` }}
                                animate={{ width: `${shares[i]}vw` }}
                                transition={calm ? CALM_HOVER : WIDTH_SPRING}
                                onPointerEnter={() => canHover && setHot(i)}
                                onClick={() => show(review, `${pass}-${i}`)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        show(review, `${pass}-${i}`);
                                    }
                                }}
                                role={pass === 0 ? "button" : undefined}
                                tabIndex={pass === 0 ? 0 : undefined}
                                aria-hidden={pass > 0 || undefined}
                                data-cursor="frame"
                                data-cursor-label="Rozkliknout"
                            >
                                {review.hashtag ? (
                                    <span className="BenReviews__tag">#{review.hashtag}</span>
                                ) : null}
                                <motion.p
                                    className="BenReviews__text"
                                    layoutId={calm ? undefined : `benrevtext-${pass}-${i}`}
                                >
                                    {review.message}
                                </motion.p>
                                <span className="BenReviews__by">
                                    <motion.span
                                        className="BenReviews__who"
                                        layoutId={calm ? undefined : `benrevwho-${pass}-${i}`}
                                    >
                                        {review.customerName}
                                    </motion.span>
                                    {review.consultantName ? (
                                        <span className="BenReviews__for">{review.consultantName}</span>
                                    ) : null}
                                    {/* On a mouse the card says what it does through
                                        the cursor — data-cursor-label, below. A thumb
                                        has no cursor, so the same sentence has to be
                                        ON the card or the fact that a clipped quote
                                        can be opened is simply not available to a
                                        touch reader. Rendered always and shown by
                                        media query only, so there is no JS state that
                                        could disagree with the CSS about it. */}
                                    <span className="BenReviews__more">Číst celé</span>
                                </span>
                            </motion.article>
                        )),
                    )}
                </div>
            </div>

            {mounted
                ? createPortal(
                      <AnimatePresence onExitComplete={released}>
                          {open ? (
                              <>
                                  <motion.div
                                      className="BenReviews__backdrop"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      onClick={hide}
                                  />
                                  <div
                                      className="BenReviews__sheetWrap"
                                      role="dialog"
                                      aria-modal="true"
                                      aria-label={open.review.customerName}
                                      onClick={hide}
                                  >
                                      <motion.article
                                          className="BenReviews__sheet"
                                          layoutId={!calm && open.lid ? `benrev-${open.lid}` : undefined}
                                          initial={calm ? { opacity: 0 } : undefined}
                                          animate={calm ? { opacity: 1 } : undefined}
                                          exit={{ opacity: 0, transition: { duration: 0.25 } }}
                                          onClick={(e) => e.stopPropagation()}
                                      >
                                          <div className="BenReviews__sheet__head">
                                              {open.review.hashtag ? (
                                                  <span className="BenReviews__tag">
                                                      #{open.review.hashtag}
                                                  </span>
                                              ) : null}
                                              <button
                                                  type="button"
                                                  className="BenReviews__sheet__close"
                                                  onClick={hide}
                                                  data-cursor="frame"
                                                  aria-label="Zavřít"
                                              >
                                                  ×
                                              </button>
                                          </div>
                                          <motion.p
                                              className="BenReviews__sheet__text"
                                              layoutId={!calm && open.lid ? `benrevtext-${open.lid}` : undefined}
                                          >
                                              {open.review.message}
                                          </motion.p>
                                          <div className="BenReviews__sheet__by">
                                              <motion.span
                                                  className="BenReviews__who"
                                                  layoutId={!calm && open.lid ? `benrevwho-${open.lid}` : undefined}
                                              >
                                                  {open.review.customerName}
                                              </motion.span>
                                              {open.review.consultantName ? (
                                                  <span className="BenReviews__for">
                                                      {open.review.consultantName}
                                                  </span>
                                              ) : null}
                                          </div>
                                      </motion.article>
                                  </div>
                              </>
                          ) : null}
                      </AnimatePresence>,
                      document.body,
                  )
                : null}
        </section>
    );
}

