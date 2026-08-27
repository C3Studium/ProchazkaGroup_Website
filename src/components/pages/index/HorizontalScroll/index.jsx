import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
    cubicBezier,
    motion,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";

// the hand-off lifts away gathering speed, so it reads as being let go
const RELEASE = cubicBezier(0.5, 0, 0.75, 0.2);
import { RiBox3Line } from "@remixicon/react";
import CornerButton from "@/components/common/ui/CornerButton";
import GridDistortion from "@/components/common/ui/GridDistortion";
import Arrow, { SCROLL_NUDGE } from "@/components/common/ui/Arrow";
import CardSwap, { Card } from "@/components/common/ui/CardSwap";
import SplitText from "@/components/common/ui/SplitText";
import FirstTime from "@/components/pages/index/FirstTime";
import { CONTACT_TRIGGER } from "@/components/common/ContactModal/open";
import { editable, editableLink, editableSet } from "@/cms/edit";

// The copy and the photographs of all three panels come from the CMS (siteCopy
// "index.first-time", "index.clients", "index.clients.karta-*" and "index.join"
// — see @/cms/server/site). Everything below is what the section shipped with
// and what it falls back to: an empty database, a missing table or a failed
// query all leave it rendering exactly what it rendered before any of this was
// wired.
//
// These point at 900px copies in /wheels: the cards render at ~420px and the
// originals are 6000×4000, which stutters the page when they decode. (The folder
// is still called wheels because that is what stood here before the deck did.)
//
// THREE cards, and the count is this file's: CardSwap deals a fixed stack and
// the deck's geometry is measured against it. The CMS supplies each card's
// picture and caption, merged on by position.
const clientPhotos = [
    { id: "cs-1", image: "/assets/backgrounds/wheels/family.webp", alt: "", caption: "Rodinné finance" },
    { id: "cs-2", image: "/assets/backgrounds/wheels/questRoom.webp", alt: "", caption: "Naše kancelář" },
    { id: "cs-3", image: "/assets/backgrounds/wheels/mainOffice.webp", alt: "", caption: "Konzultace" },
];

const CLIENTS = {
    heading: "Pro naše klienty",
    lines: ["Benefit program.", "Stačí, aby se z vašeho doporučení stal nový klient, a peníze jsou vaše. Vyhráváte jak vy tak i druhý."],
    cta: "Zobrazit",
    scrollHint: "Scroll down",
};

const JOIN = {
    heading: "Přidejte se k nám",
    text: "Skrze finanční sektor umožňujeme vyvíjet nové úspěšné příběhy, a to nejen ty vaše. Společně měníme každodenní sny ve skutečnost.",
    cta: "Zobrazit",
    photo: { src: "/assets/backgrounds/Trophies_03.webp", alt: "Ocenění Procházka Group" },
};

// The deck's geometry at full size. CardSwap takes numbers, not CSS, so the
// responsive sizing has to be computed — see useDeckLayout below.
const DECK_DESKTOP = { width: 500, height: 400, cardDistance: 60, verticalDistance: 70 };

// CardSwap is sized in pixel numbers (they land as inline styles), so media
// queries cannot reach it and the deck was one size at every viewport: 500px
// of card on a 390px phone, 400px of card height on a 390px-tall landscape
// phone. This measures the viewport and hands CardSwap a deck cut for it.
//
// Hydration-safe: the server renders the desktop deck and the first client
// render matches it; the real viewport is read only inside the effect. The
// state is compared before it is set, so the resize listener (mobile URL bars
// fire it constantly) re-renders nothing unless the deck actually changes.
function useDeckLayout() {
    const [layout, setLayout] = useState(DECK_DESKTOP);

    useEffect(() => {
        const measure = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            let next;

            if (w <= 820) {
                // Stacked layout: the deck is the column's width, fan included —
                // the fan leans right by ~2 card distances, so the card itself
                // gets ~72vw and the whole deck stays inside the viewport.
                const width = Math.round(Math.min(Math.max(w * 0.72, 240), 420));
                next = {
                    width,
                    height: Math.round(width * 0.8),
                    cardDistance: Math.round(width * 0.1),
                    verticalDistance: Math.round(width * 0.12),
                };
            } else if (h <= 520) {
                // Phone landscape: the short edge is the constraint.
                const height = Math.round(h * 0.52);
                next = {
                    width: Math.round(height * 1.25),
                    height,
                    cardDistance: 26,
                    verticalDistance: 30,
                };
            } else if (h <= 800 || w < 1200) {
                // Short laptop (1280×720 and kin) and narrow windows just
                // above the stacking cutoff: the full deck grazed the header
                // and lost its back card off the right edge.
                next = { width: 400, height: 320, cardDistance: 48, verticalDistance: 56 };
            } else {
                next = DECK_DESKTOP;
            }

            setLayout((prev) =>
                prev.width === next.width &&
                prev.height === next.height &&
                prev.cardDistance === next.cardDistance &&
                prev.verticalDistance === next.verticalDistance
                    ? prev
                    : next,
            );
        };

        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    return layout;
}

// Whether hovering is a gesture this device has. pauseOnHover is wired to
// mouseenter/mouseleave, and on a touch screen a tap fires the enter with no
// leave to follow — the deck would pause on first touch and never deal again.
// Hydration-safe the same way as the deck: false on the server and the first
// paint, measured in the effect.
function useFinePointer() {
    const [fine, setFine] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(hover: hover) and (pointer: fine)");
        const update = () => setFine(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    return fine;
}

// Sticky horizontal-scroll showcase: the outer section is 300vh tall, the
// sticky viewport pins at the top and the 300vw track slides right-to-left
// as the user scrolls through the section. Three 100vw panels.
// `copy` carries all three panels in one object, because one component renders
// all of them and four props threaded through `src/pages/index.js` would put the
// seam's shape in the page. Each panel's `docId` arrives only inside the
// Studio's editing frame (see @/cms/server/site/homepage); every annotation
// below is spread onto an element that already exists, because this section's
// 300vh/300vw timeline is measured against boxes that must not move.
export default function HorizontalScroll({ copy = {} }) {
    const targetRef = useRef(null);
    const deck = useDeckLayout();
    const finePointer = useFinePointer();
    // Calm, not killed: with reduced motion asked for, the deck still deals —
    // it is how the other two photographs are reached at all — but rarely,
    // as a page turn rather than a performance.
    const reducedMotion = useReducedMotion();

    const clientsCopy = copy.clients || {};
    const clientsDoc = clientsCopy.docId;
    const clients = {
        heading: clientsCopy.heading || CLIENTS.heading,
        // One stored string with a `\n` in it, arriving already cut at the
        // break — the two halves are drawn by two SplitTexts on two different
        // slices of the ride, so they cannot be one call however they are
        // stored. The paragraph is annotated against the whole field.
        lines: CLIENTS.lines.map((line, i) => clientsCopy.lines?.[i] || line),
        cta: clientsCopy.cta || CLIENTS.cta,
        scrollHint: clientsCopy.scrollHint || CLIENTS.scrollHint,
    };

    // Merged by position: a missing block leaves that card saying what it said.
    // `setDocId`/`setField` name the one array field all three pictures come out
    // of — see `deckCards` in @/cms/server/site/homepage — and travel per card
    // because the caption beside each is a different document.
    const cards = clientPhotos.map((card, index) => {
        const block = copy.cards?.[index] || null;
        return {
            ...card,
            image: block?.photo?.src || card.image,
            alt: block?.photo?.alt ?? card.alt,
            caption: block?.caption || card.caption,
            docId: block?.docId,
            setDocId: block?.setDocId,
            setField: block?.setField,
        };
    });

    // The deck's three pictures, as ONE thing an editor can click.
    //
    // They used to be annotated one photograph at a time, which is the shape the
    // data had — three sibling blocks with one `image` each — and the wrong
    // shape for the affordance: reordering the deck is a single change and no
    // element on the page meant "the deck". So the container is annotated
    // instead, `imageSet`, and the popup owns the members.
    //
    // Every card names the same field, so the first that does is the answer.
    // A store written before that field existed names none, and then the
    // per-card annotations below stay: a set annotation pointing at a field that
    // is not there would highlight the deck and offer an edit that could only
    // fail, which is worse than the complaint it answers.
    const deckSet = cards.find((card) => card.setDocId && card.setField) || null;

    const joinCopy = copy.join || {};
    const joinDoc = joinCopy.docId;
    const join = {
        heading: joinCopy.heading || JOIN.heading,
        text: joinCopy.text || JOIN.text,
        cta: joinCopy.cta || JOIN.cta,
        photo: joinCopy.photo?.src ? joinCopy.photo : JOIN.photo,
    };
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start start", "end end"],
    });
    // 3 panels x 100vw -> slide the track left by 200vw over the section scroll
    const x = useTransform(scrollYProgress, [0, 1], ["0vw", "-200vw"]);

    // Separate progress for the approach: 0 when this section's top edge is at
    // the bottom of the viewport, 1 once it reaches the top and pins. Panel 1
    // draws itself in over this, so it is settled before the ride begins.
    const { scrollYProgress: approach } = useScroll({
        target: targetRef,
        offset: ["start end", "start start"],
    });
    const enterProgress = useSpring(approach, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });

    // Line network for panels 2 and 3, drawn against the horizontal ride.
    // The baseline leads; each panel's vertical grows out of its crossing with
    // it (34.5% and 94.6% along the baseline respectively), so the network
    // always reads as one line branching, never as separate strokes.
    const ride = useSpring(scrollYProgress, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });
    const baselineDraw = useTransform(ride, [0.02, 0.94], [0, 1]);
    const clientsVDraw = useTransform(ride, [0.1, 0.7], [0, 1]);
    const joinVDraw = useTransform(ride, [0.64, 1], [0, 1]);

    // extra structure in the panels so they aren't carried by one line each
    // the wheels' photos wipe open on the same schedule as the panel's rules
    const stackReveal = useTransform(ride, [0.03, 0.72], [0, 1]);
    // rules framing the wheels, drawn like every other line
    const frameCrossDraw = useTransform(ride, [0.06, 0.68], [0, 1]);
    const clientsHTopDraw = useTransform(ride, [0.03, 0.58], [0, 1]);
    const clientsVLeftDraw = useTransform(ride, [0.06, 0.64], [0, 1]);
    const clientsHCtaDraw = useTransform(ride, [0.16, 0.76], [0, 1]);
    const joinHTopDraw = useTransform(ride, [0.44, 0.96], [0, 1]);
    const joinVRightDraw = useTransform(ride, [0.52, 1], [0, 1]);

    // The copy runs on a softer spring than the rules: letting the words trail
    // the scroll a little is most of what makes the reveal feel fluid.
    const copyRide = useSpring(scrollYProgress, {
        stiffness: 110,
        damping: 30,
        restDelta: 0.0005,
    });

    // Panel 3 gets its own, softer spring and a longer reveal than panels 1
    // and 2: it is the last thing read before the track releases, so the words
    // want more room to travel than the earlier panels, which are passed at
    // speed.
    const joinCopyRide = useSpring(scrollYProgress, {
        stiffness: 70,
        damping: 28,
        restDelta: 0.0005,
    });

    // panel copy reveals word by word (see SplitText); only the buttons and
    // the photo keep block-level motion
    const clientsCtaY = useTransform(ride, [0.18, 0.68], ["5vh", "0vh"]);
    const clientsCtaOpacity = useTransform(ride, [0.18, 0.68], [0, 1]);

    // panel 3's photo opens with the same diagonal wipe as the WhoWeAre photo
    const joinPhotoClip = useTransform(ride, (value) => {
        const t = Math.min(1, Math.max(0, (value - 0.42) / (0.96 - 0.42)));
        const cut = ((1 - t) * 100).toFixed(2);
        return `inset(${cut}% 0% 0% ${cut}%)`;
    });

    // The track hands over rather than simply stopping: the whole pinned
    // viewport lifts and dissolves as the section below starts its own opening.
    //
    // This needs its own scope. `scrollYProgress` reaches 1 the moment the
    // track unpins, which is before the section below has begun anything — key
    // the release to that and the ride is gone while the screen is still empty.
    // ["end end", "end start"] is exactly the viewport of scroll during which
    // this section leaves and the next one arrives.
    const { scrollYProgress: leaving } = useScroll({
        target: targetRef,
        offset: ["end end", "end start"],
    });
    // Only the content leaves. Both the lift and the fade ride custom
    // properties that only the content blocks read, so the rules are not moved
    // and then moved back — they are never touched at all.
    //
    // The first attempt did lift the whole sticky and pin the rules back with
    // the opposite offset. It looked right and was not: FirstTime rides inside
    // this track as its first panel and its rules carry its own class, so they
    // went with the lift while these stayed, and the two opened a gap exactly
    // where they are supposed to meet. Anything that has to be undone somewhere
    // else is a join waiting to come apart.
    //
    // The lift uses `translate` rather than `transform` so it composes with
    // whatever framer has already put on those elements instead of replacing it.
    // The content keeps going the way the track was carrying it — further left
    // and up — rather than simply dimming in place. A plain opacity fade reads
    // as the panel being switched off; continuing its own travel reads as it
    // being carried out of frame.
    const contentLift = useTransform(leaving, [0.04, 0.6], ["0vh", "-14vh"], { ease: RELEASE });
    const contentShift = useTransform(leaving, [0.04, 0.6], ["0vw", "-9vw"], { ease: RELEASE });
    const contentFade = useTransform(leaving, [0.1, 0.44], [1, 0]);

    return (
        <section ref={targetRef} className="HScroll">
            <motion.div
                className="HScroll__sticky"
                style={{
                    "--hscroll-fade": contentFade,
                    "--hscroll-lift": contentLift,
                    "--hscroll-shift": contentShift,
                }}
            >
                <motion.div className="HScroll__track" style={{ x }}>

                    {/* Continuous baseline: continues FirstTime's bottom line
                        through panels 2 and 3, ending on panel 3's down-line.
                        Draws left→right as the panels ride in. */}
                    <motion.div
                        className="HScroll__line HScroll__baseline"
                        style={{ scaleX: baselineDraw }}
                    />

                    {/* Panel 1 — FirstTime (statistiky), scrollne se in a pak odjíždí doleva */}
                    <FirstTime enterProgress={enterProgress} copy={copy.firstTime} />

                    {/* Panel 2 — Pro naše klienty */}
                    <div className="HScroll__panel HScroll__panel--clients">
                        <h2 {...editable(clientsDoc, "title", "text")} className="HScroll__heading">
                            <SplitText text={clients.heading} progress={copyRide} from={0.02} to={0.52} rise="0.35em" />
                        </h2>
                        <div className="HScroll__info">
                            <RiBox3Line className="HScroll__info__icon" size={26} />
                            {/* The paragraph, not the two SplitTexts inside it —
                                the second of the four "nejde editovat" reports.
                                It is one element holding both lines, and that is
                                exactly what it is now stored as: one `headline`
                                with a `\n` in it, drawn as a `<br />`. The
                                annotation goes here because this is the box, and
                                the two reveals keep their own slices of the ride.

                                No `mark`: this section paints no accent, so
                                offering one would store an encoding that
                                SplitText draws as literal asterisks. */}
                            <p {...editable(clientsDoc, "headline", "text")}>
                                <SplitText text={clients.lines[0]} progress={copyRide} from={0.08} to={0.48} />
                                <br />
                                <SplitText
                                    text={clients.lines[1]}
                                    progress={copyRide}
                                    from={0.12}
                                    to={0.66}
                                />
                            </p>
                        </div>
                        <motion.div
                            className="HScroll__ctaWrap"
                            style={{ y: clientsCtaY, opacity: clientsCtaOpacity }}
                        >
                            {/* Words only. /benefit-program is a path on this
                                site, and it is genuine navigation: the page
                                behind it explains the programme this panel is
                                advertising, which the contact sheet does not. */}
                            <CornerButton
                                {...editableLink(clientsDoc, { text: "items.2.label" })}
                                href="/benefit-program"
                                className="HScroll__cta"
                            >
                                {clients.cta}
                                <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                            </CornerButton>
                        </motion.div>

                        {/* plain rules framing the wheels, same as everywhere else */}
                        <motion.div
                            className="HScroll__line HScroll__line--stackH"
                            style={{ scaleX: frameCrossDraw }}
                        />
                        <motion.div
                            className="HScroll__line HScroll__line--stackV"
                            style={{ scaleY: frameCrossDraw }}
                        />

                        {/* The three discs that used to stack here are gone;
                            this is the same three pictures dealt as a deck, at
                            the component's own size, spacing and timing. */}
                        <motion.div
                            {...(deckSet ? editableSet(deckSet.setDocId, deckSet.setField) : null)}
                            className="HScroll__stack"
                            style={{ opacity: stackReveal }}
                        >
                            <CardSwap
                                pauseOnHover={finePointer}
                                width={deck.width}
                                height={deck.height}
                                cardDistance={deck.cardDistance}
                                verticalDistance={deck.verticalDistance}
                                delay={reducedMotion ? 12000 : 5000}
                            >
                                {cards.map((photo) => (
                                    <Card key={photo.id} data-cursor="frame">
                                        {/* The card, not the canvas: GridDistortion
                                            paints the same file on a plane, so
                                            what an editor means by "this photo"
                                            is the box that owns `imageSrc` — one
                                            file, one field. The caption inside
                                            carries its own annotation and wins
                                            for its own box.

                                            Dropped once the deck is one set: an
                                            inner annotation wins for its own box,
                                            so leaving these would keep selecting
                                            one photograph at a time, which is the
                                            complaint. */}
                                        <div {...(deckSet ? null : editable(photo.docId, "image", "image"))} className="HScroll__card">
                                            <GridDistortion imageSrc={photo.image} cellSize={46}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={photo.image} alt={photo.alt ?? ""} draggable={false} />
                                            </GridDistortion>
                                            <span {...editable(photo.docId, "title", "text")} className="HScroll__card__caption">{photo.caption}</span>
                                        </div>
                                    </Card>
                                ))}
                            </CardSwap>
                        </motion.div>

                        <motion.div
                            className="HScroll__line HScroll__line--v"
                            style={{ scaleY: clientsVDraw }}
                        />
                        <motion.div
                            className="HScroll__line HScroll__line--hTop"
                            style={{ scaleX: clientsHTopDraw }}
                        />
                        <motion.div
                            className="HScroll__line HScroll__line--vLeft"
                            style={{ scaleY: clientsVLeftDraw }}
                        />
                        <motion.div
                            className="HScroll__line HScroll__line--hCta"
                            style={{ scaleX: clientsHCtaDraw }}
                        />

                        <div className="HScroll__scrollHint">
                            <motion.span className="HScroll__scrollHint__arrow" {...SCROLL_NUDGE}>
                                <Arrow direction="down" />
                            </motion.span>
                            <span {...editable(clientsDoc, "items.3.label", "text")}>{clients.scrollHint}</span>
                        </div>
                    </div>

                    {/* Panel 3 — Přidejte se k nám; odsud linky navážou na další sekci */}
                    <div className="HScroll__panel HScroll__panel--join">
                        <motion.div
                            {...editable(joinDoc, "image", "image")}
                            className="HScroll__photo"
                            style={{ clipPath: joinPhotoClip }}
                        >
                            <GridDistortion imageSrc={join.photo.src} cellSize={44}>
                                <Image
                                    src={join.photo.src}
                                    alt={join.photo.alt}
                                    fill={true}
                                    quality={90}
                                    sizes="30vw"
                                    style={{ objectFit: "cover", objectPosition: "center" }}
                                />
                            </GridDistortion>
                        </motion.div>
                        <div className="HScroll__body">
                            <h2 {...editable(joinDoc, "title", "text")} className="HScroll__heading">
                                <SplitText
                                    text={join.heading}
                                    progress={joinCopyRide}
                                    from={0.46}
                                    to={1}
                                    window={0.42}
                                    rise="0.35em"
                                />
                            </h2>
                            <div className="HScroll__info">
                                <RiBox3Line className="HScroll__info__icon" size={26} />
                                <p {...editable(joinDoc, "body", "text")}>
                                    <SplitText
                                        text={join.text}
                                        progress={joinCopyRide}
                                        from={0.5}
                                        to={1}
                                        window={0.44}
                                    />
                                </p>
                            </div>
                            {/* Words only, and no target to edit: this one opens
                                the contact sheet instead of going to /kontakt,
                                which is a route with nothing on it but the
                                patička. The href stays as the no-JavaScript
                                fallback. */}
                            <CornerButton
                                {...editableLink(joinDoc, { text: "items.0.label" })}
                                href="/kontakt"
                                className="HScroll__cta"
                                {...CONTACT_TRIGGER}
                            >
                                {join.cta}
                                <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                            </CornerButton>
                        </div>

                        {/* Vertical line runs to the bottom edge — the section
                            after the horizontal scroll picks it up. */}
                        <motion.div
                            className="HScroll__line HScroll__line--v"
                            style={{ scaleY: joinVDraw }}
                        />
                        <motion.div
                            className="HScroll__line HScroll__line--hTop"
                            style={{ scaleX: joinHTopDraw }}
                        />
                        <motion.div
                            className="HScroll__line HScroll__line--vRight"
                            style={{ scaleY: joinVRightDraw }}
                        />
                    </div>

                </motion.div>
            </motion.div>
        </section>
    );
}
