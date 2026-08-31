import Image from "next/image";
import GridDistortion from "@/components/common/ui/GridDistortion";
import { useEffect, useMemo, useRef, useState } from "react";
import { cubicBezier, motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
import CornerButton from "@/components/common/ui/CornerButton";
import Arrow from "@/components/common/ui/Arrow";
import SplitText from "@/components/common/ui/SplitText";
import Circles from "@/components/pages/aboutUs/MemberShowcase/Circles";
import { editable, editableLink } from "@/cms/edit";
import {
    GROW_TO,
    SEAM_VW,
    SQUEEZE_FROM,
    geometryFor,
    useStackScale,
} from "@/components/pages/aboutUs/aboutStack";

// The geometry lives in ../aboutStack.js, not here. It stopped being this
// section's private business the moment the hero began erasing itself against
// the track's position: both files now read the same description of where the
// track is, which is the only reason the two edges cannot come apart.

// The timeline, in two beats off one scroll.
//
//   0 → 0.5   the first card OPENS out of the bottom-right corner of the screen
//             and crosses most of it, coming to rest just left of centre. Half
//             the section's scroll for 72vw of travel — about half the pace of
//             the ride that follows, because this is the part meant to be
//             watched rather than travelled through.
//   0 → 0.38  the first pair RISES to the full height of the viewport, on its
//             own shorter window, so the panel is still coming up while it is
//             already crossing. It reaches the ceiling only once its leading
//             edge has passed 60% of the screen.
//   → 1       nothing grows any more. The track rides left, carrying the
//             reader through the rest of it.
//
// The rise is on the PAIR rather than on the card, so the card and the
// photograph beside it come up as one block. On the card alone it would leave a
// step along the top edge between the two for as long as the rise lasted.
//
// The card really does change size — it is a box with `overflow: hidden` around
// content held at its final width, so the copy is uncovered by the box opening
// rather than being scaled, and nothing reflows as it goes.
//
// GROW_TO is shared with the hero, which clears itself against this same
// timeline (see ../aboutStack.js).

// the page's own glide — everything on this page arrives on it
const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// The copy and the three photographs come from the CMS — one siteCopy block per
// card ("o-nas.showcase.*") plus one for the standing note ("o-nas.showcase").
// See @/cms/server/site/aboutUs. Everything below is what the section shipped
// with and what it falls back to when that returns nothing.
//
// The number of cards is NOT the CMS's to decide: the track is `TRACK_VW` wide
// and the hero clips itself against a seam computed from three pairs, so a
// fourth block would not appear at the end of the ride, it would move the seam.
// The blocks are merged onto this list by position and the extras are dropped.

// Standing note under every card. It is the same sentence in all three because
// it is the section's own voice, not the speaker's — the quote above it changes,
// this does not.
const FOOTNOTE = "Dáváme šanci novým kolegům vybudovat si úspěšné podnikání ve financích. Učíme je pracovat poctivě, efektivně a se smyslem.";

const MEMBERS = [
    {
        id: "zalozeni",
        index: "01",
        label: "Založení",
        quote: "Založil jsem tým, který dnes tvoří už přes 10 profesionálů a všichni sdílíme stejnou vizi",
        photo: {
            src: "/assets/backgrounds/callBG.webp",
            alt: "Václav Procházka v kanceláři",
        },
    },
    {
        id: "kolegove",
        index: "02",
        label: "Kolegové",
        quote: "Těší mě vidět mé spolupracovníky vítězit a plnit si své cíle v životě s finanční nezávislostí.",
        photo: {
            src: "/assets/backgrounds/workingHours.webp",
            alt: "Konzultace v kanceláři Procházka Group",
        },
    },
    {
        id: "hodnoty",
        index: "03",
        label: "Hodnoty",
        quote: "V našem týmu jsme zasadili pevné zásady a hodnoty, které nás nesou kupředu k úspěchům",
        photo: {
            src: "/assets/backgrounds/conference2.webp",
            alt: "Školení týmu Procházka Group",
        },
    },
];

// How long a card takes to say itself, as a fraction of the whole timeline.
// The last card starts reading at 0.756, which is what caps this: any longer
// and its footnote would still be arriving at a progress the ride never gets to.
const WINDOW = 0.22;

// The first card is the exception. It is not passed at speed like the other
// two — it spends the whole opening crossing the screen — so its copy is given
// the length of that opening rather than a card's usual window.
const FIRST_WINDOW = GROW_TO * 0.9;

// Where each card starts reading. The first one reads while it is growing, so
// it starts at zero. Every other one starts just after its leading edge crosses
// the right edge of the screen — which is a point on the ride, not on the whole
// timeline, so it has to be mapped back through the beat it belongs to.
//
// One WINDOW later each card is close to the middle of the screen, so all three
// finish saying themselves as they arrive at centre and none is ever caught
// still assembling itself while it is the thing being looked at.
const revealStart = (geo, index) =>
    index === 0 ? 0.02 : geo.progressAtTrackX(100 - geo.PAIR_VW * index);

const revealSpan = (index) => (index === 0 ? FIRST_WINDOW : WINDOW);

// The six values the travelling discs carry. They belong to the section rather
// than to the third card: the discs set off from the first one, and by the time
// a word is legible on any of them they have crossed the whole track.
const VALUES = ["Poctivost", "Odbornost", "Tým", "Růst", "Důvěra", "Výsledky"];

// The words on the button every card carries. One string for all three, because
// it is the same offer three times — the same argument the footnote above is one
// field for. Its target is /kontakt, a path on this site, so only the words are
// the editor's; the routing is the site's own.
const CTA = "Zájem o pozici";

// Own component so each card can hold its own transforms — hooks cannot be
// called from inside a map. `progress` is not the same value for every card:
// the first one is timed against the section opening, the rest against the ride
// (see the call site).
//
// `docId` is the card's own siteCopy block, `footDocId` the section's standing
// note and `extrasDocId` the block holding the button and the discs' words. All
// three arrive only inside the Studio's editing frame. They are spread onto
// elements that already exist — no wrapper, no class, no style — with one
// exception noted at the eyebrow below.
const MemberCard = ({ member, progress: ride, copyProgress: copyRide, from, span, growth, markRef, footnote, cta, docId, footDocId, extrasDocId }) => {
    // The rules under the copy and down the card's trailing edge draw as the
    // card arrives, in the order the eye follows them. All of it is written as
    // fractions of the card's own window, so the first card — which gets a much
    // longer one — keeps the same internal rhythm rather than a stretched copy
    // of somebody else's timings.
    const ruleDraw = useTransform(ride, [from, from + span * 0.64], [0, 1]);
    const edgeDraw = useTransform(ride, [from + span * 0.12, from + span * 0.82], [0, 1]);

    const ctaOpacity = useTransform(ride, [from + span * 0.3, from + span * 0.79], [0, 1]);
    const ctaY = useTransform(ride, [from + span * 0.3, from + span * 0.79], ["3vh", "0vh"]);
    const footOpacity = useTransform(ride, [from + span * 0.54, from + span], [0, 1]);

    return (
        // The outer box is the one that changes size; everything inside it is
        // held at the card's final width, anchored to its bottom-right corner,
        // so the growth uncovers the copy instead of stretching it.
        <motion.article className="MemberShow__card" style={growth}>
            <div className="MemberShow__card__inner">
            {/* The one added element on this page: the label needs a box of its
                own, because the eyebrow also holds the ordinal and an editor
                saving the eyebrow would store "01 Založení" into the label. An
                unstyled inline <span> inside an inline <span> — no rule in this
                section's stylesheet selects on `span`, and the ordinal stays out
                of the CMS on purpose (it is a position in a fixed list of
                three, not something anybody means to type). */}
            <span className="MemberShow__card__eyebrow">
                {/* The ordinal is the card's own `lead` — a position in a list
                    of three the track's width is computed from, so an editor
                    changes what it says and not how many there are. */}
                <em {...editable(docId, "items.0.lead", "text")}>{member.index}</em>{" "}
                <span {...editable(docId, "title", "text")}>{member.label}</span>
            </span>

            <h2 {...editable(docId, "body", "text")} className="MemberShow__card__quote">
                <SplitText
                    text={member.quote}
                    progress={copyRide}
                    from={from}
                    to={from + span * 0.72}
                    window={0.12}
                    rise="0.4em"
                />
            </h2>

            <motion.div
                className="MemberShow__line MemberShow__line--underQuote"
                style={{ scaleX: ruleDraw }}
            />

            <motion.div className="MemberShow__card__cta" style={{ opacity: ctaOpacity, y: ctaY }}>
                {/* Words only. The target is a path on this site, which is the
                    site's own routing rather than content — see `editableLink`'s
                    three shapes. `items.0.label` is SHOWCASE_VALUES.cta in
                    @/cms/server/site/aboutUs; all three cards carry the same
                    field, so editing one moves all of them. */}
                <CornerButton
                    {...editableLink(extrasDocId, { text: "items.0.label" })}
                    href="/kontakt"
                >
                    {cta}
                    <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                </CornerButton>
            </motion.div>

            {/* Empty on purpose, and handed upwards by ref. It is the room
                between the call to action and the footnote; the discs rest in
                it on their way through, and in the third card it is the box
                they are finally let loose inside — its walls, measured off this
                element, are the walls they bounce off. */}
            <div className="MemberShow__card__mark" ref={markRef} />

            {/* All three carry the same field of the same block, because they
                are the same sentence — editing one is editing the note, and the
                other two follow on the next render. */}
            <motion.p
                {...editable(footDocId, "body", "text")}
                className="MemberShow__card__foot"
                style={{ opacity: footOpacity }}
            >
                {footnote}
            </motion.p>

            {/* Runs down the card's trailing edge, where the photograph begins —
                the seam between the two is a drawn line, not a colour change. */}
            <motion.div
                className="MemberShow__line MemberShow__line--edge"
                style={{ scaleY: edgeDraw }}
            />
            </div>
        </motion.article>
    );
};

// Sticky horizontal showcase: three speakers, each a card of copy followed by a
// photograph, laid end to end on a track wider than the screen.
//
// One motion, not two. The track begins a full screen to the right of the
// viewport and travels left at a constant rate until its last photograph is
// flush with the right edge — 228vw of travel, of which the first 100vw is the
// section arriving and the remaining 128vw is the reader moving through it.
// Those are the same movement and there is no seam between them, because there
// is nothing to seam: no mask opens, no panel expands. The section is off to
// the right, and then it is here.
//
// It arrives over the hero, which is pinned and standing still behind it (see
// AboutHero's stylesheet) — this section is pulled up 200vh so its pin begins
// exactly where the hero's own motion ends.
//
// The pin at the far end is meant to go unnoticed, which is a matter of what
// happens there rather than of the pinning: the content keeps travelling out of
// frame as the section unpins, instead of stopping dead the instant the track
// runs out. See the release below.
export default function MemberShowcase({ members: cmsMembers, footnote: cmsFootnote, extras, docId }) {
    const targetRef = useRef(null);

    // Merged by position onto the three the section owns. Every field falls back
    // on its own, so a block that fills in only its quote keeps the label and
    // the photograph the card shipped with.
    const members = MEMBERS.map((member, index) => {
        const block = cmsMembers?.[index] || null;
        return {
            ...member,
            index: block?.index?.trim() ? block.index.trim() : member.index,
            label: block?.label?.trim() ? block.label.trim() : member.label,
            quote: block?.quote?.trim() ? block.quote.trim() : member.quote,
            photo: block?.photo?.src ? block.photo : member.photo,
            docId: block?.docId,
        };
    });

    const footnote = cmsFootnote?.trim() ? cmsFootnote.trim() : FOOTNOTE;
    const cta = extras?.cta?.trim() ? extras.cta.trim() : CTA;

    // Six discs, and the count is the section's rather than the CMS's: the room
    // they are let loose in is one card's mark and six is what fits in it at the
    // size they are drawn. Merged by position, extras dropped, each falling back
    // on its own word.
    const values = VALUES.map((value, index) =>
        extras?.values?.[index]?.trim() ? extras.values[index].trim() : value,
    );

    // Below 820px the track does not ride and nothing is pinned — the pairs
    // simply stack down the page (styles.scss). Every reveal below is keyed to
    // a horizontal progress that, in that layout, never happens: leave them
    // wired to it and the stacked page is a column of empty panels. So the
    // layout has to be known here too, not only in the stylesheet.
    //
    // A phone held SIDEWAYS is not in that set any more: it rides, like the
    // desktop. It used to stack on a height arm, because at 390px tall the
    // card's column of copy was taller than the viewport it would be pinned to
    // and the discs' room — the leftover between the button and the footnote —
    // collapsed to a box six 74px discs could not be put back inside. Both are
    // now answered in the stylesheet's own phs-h block, which shrinks the column
    // and the discs to that screen instead of giving up the ride on it. A
    // landscape phone is a small laptop and reads like one.
    //
    // MUST match the media list on the stacked block in styles.scss and the two
    // in AboutHero/styles.scss, which carries the reason: the hero and this
    // section pin together or stack together, never one each. See that block
    // for what the three arms are and why they are equal to the two they
    // replace minus phs-h.
    //
    // Starts false and is corrected on mount: the server has no viewport to
    // measure, and rendering the desktop assumption on both sides is what keeps
    // the markup identical across hydration.
    // How wide the ride is here — 1 everywhere, 2 on a tablet upright, where a
    // 44vw card is 360px and the pair reads as a column beside a strip. The hook
    // is in aboutStack because the hero and the discs read the same answer and
    // three answers to one question is the seam coming apart. See geometryFor.
    const scale = useStackScale();
    const geo = useMemo(() => geometryFor(scale), [scale]);

    const [stacked, setStacked] = useState(false);
    useEffect(() => {
        const query = window.matchMedia(
            "(max-width: 479px), (max-width: 599.98px) and (orientation: portrait), (max-width: 820px) and (min-height: 521px) and (orientation: landscape), (max-height: 520px) and (orientation: portrait)",
        );
        const sync = () => setStacked(query.matches);
        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    // What every reveal reads in the stacked layout: already arrived.
    const settled = useMotionValue(1);

    // One per card. The discs read all three: two are the rests they pass
    // through, the third is the box they end up loose in. Held here rather
    // than measured from a copy of the layout, so the rooms follow the cards.
    const markRefs = useRef([]);

    // 0 where the section pins — which is where the hero stops moving — and 1
    // where it lets go.
    const { scrollYProgress: rideRaw } = useScroll({
        target: targetRef,
        offset: ["start start", "end end"],
    });

    // Read from the shared description rather than restated as a keyframe list.
    // The hero erases itself against this same function, so the two are not two
    // curves that have to be kept in agreement — they are one curve, used twice.
    const x = useTransform(rideRaw, (p) => `${geo.trackXAt(p).toFixed(3)}vw`);

    // The first card's box, opening out of the bottom-right corner. Only the
    // first pair grows; the rest are their full size from the moment they exist.
    const growWidth = useTransform(rideRaw, (p) => `${(geo.growthAt(p) * geo.CARD_VW).toFixed(3)}vw`);
    const growHeight = useTransform(rideRaw, (p) => `${(geo.heightAt(p) * 100).toFixed(3)}vh`);

    // The scrim comes up with the growth. It has to: this section's box starts
    // 200vh above where it is used, so at the top of the page its top edge is
    // already lying across the middle of the hero's screen, and a band that is
    // painted before the section it belongs to has arrived is just a stripe on
    // somebody else's section.
    const scrimOpacity = useTransform(rideRaw, [0, GROW_TO], [0, 1]);

    const ride = useSpring(rideRaw, {
        stiffness: 260,
        damping: 42,
        restDelta: 0.0005,
    });

    // The copy runs on a softer spring than the rules: letting the words trail
    // the scroll a little is most of what makes the reveal feel fluid.
    const copyRide = useSpring(rideRaw, {
        stiffness: 110,
        damping: 30,
        restDelta: 0.0005,
    });

    // How the section is taken off the screen: it is squeezed out.
    //
    // Colleagues' two halves close on the seam from either side, and this clips
    // inwards to exactly their inner edges — so the strip of showcase still
    // showing shrinks to nothing at the moment they meet. Not a fade and not a
    // slide away: the same movement, seen from this side of it.
    //
    // Both ends read GLIDE and the seam is the shared constant, which is what
    // keeps the cut welded to the edge doing the cutting.
    const squeeze = useTransform(rideRaw, (p) => {
        const e = GLIDE(clamp01((p - SQUEEZE_FROM) / (1 - SQUEEZE_FROM)));
        return `inset(0% ${((100 - SEAM_VW) * e).toFixed(2)}% 0% ${(SEAM_VW * e).toFixed(2)}%)`;
    });

    return (
        <section className="MemberShow" ref={targetRef}>
            <div className="MemberShow__sticky">
                <motion.div className="MemberShow__viewport" style={{ clipPath: squeeze }}>
                    <motion.div
                        className="MemberShow__track"
                        style={{ x, width: `${geo.TRACK_VW}vw` }}
                    >
                        {members.map((member, index) => (
                            <motion.div
                                className="MemberShow__pair"
                                key={member.id}
                                style={stacked || index !== 0 ? undefined : { height: growHeight }}
                            >
                                <MemberCard
                                    member={member}
                                    progress={stacked ? settled : ride}
                                    copyProgress={stacked ? settled : copyRide}
                                    from={stacked ? 0 : revealStart(geo, index)}
                                    span={stacked ? 1 : revealSpan(index)}
                                    growth={
                                        stacked || index !== 0
                                            ? undefined
                                            : { width: growWidth }
                                    }
                                    markRef={(node) => {
                                        markRefs.current[index] = node;
                                    }}
                                    footnote={footnote}
                                    cta={cta}
                                    docId={member.docId}
                                    footDocId={docId}
                                    extrasDocId={extras?.docId}
                                />

                                {/* The box, not the <Image>: the picture and the
                                    wash over it are the same photograph. */}
                                <div
                                    {...editable(member.docId, "image", "image")}
                                    className="MemberShow__photo"
                                >
                                    <GridDistortion imageSrc={member.photo.src} cellSize={46}>
                                        <Image
                                            src={member.photo.src}
                                            alt={member.photo.alt}
                                            fill={true}
                                            // 85 is not one of the qualities
                                            // next.config.mjs allows, and an
                                            // unlisted quality is a build error
                                            // rather than a rounding.
                                            quality={80}
                                            // The photograph is a 32vw column
                                            // in the ride and the full page
                                            // width whenever the layout stacks
                                            // — every arm of the stacked query,
                                            // or 34vw was what a phone
                                            // downloaded for a 100vw picture.
                                            // A phone on its side is no longer
                                            // one of those arms: it rides, so
                                            // it wants the column, and asking
                                            // it for 100vw was three times the
                                            // bytes for the same 182px box.
                                            sizes="(max-width: 479px) 100vw, (max-width: 820px) and (min-height: 521px) 100vw, (max-height: 520px) and (orientation: portrait) 100vw, 34vw"
                                            style={{ objectFit: "cover", objectPosition: "center" }}
                                        />
                                    </GridDistortion>
                                    <div className="MemberShow__photo__overlay" />
                                </div>
                            </motion.div>
                        ))}

                        {/* Placed in the track, not on the screen: they travel
                            forward through it while it travels back, and the
                            room they land in rides along with the card that
                            owns it. */}
                        <Circles
                            progress={rideRaw}
                            labels={values}
                            markRefs={markRefs}
                            docId={extras?.docId}
                            // The discs fly along this track, so they have to be
                            // handed the same track. Their hops used to be
                            // computed at module scope, which was fine while
                            // there was one geometry and is not now.
                            geo={geo}
                        />
                    </motion.div>

                    {/* The photographs are bright interiors and the navbar is
                        fixed and white, so without this the site's own name and
                        menu are lost every time one rides underneath them. */}
                    <motion.div
                        className="MemberShow__scrim"
                        style={{ opacity: scrimOpacity }}
                        aria-hidden="true"
                    />
                </motion.div>
            </div>
        </section>
    );
}
