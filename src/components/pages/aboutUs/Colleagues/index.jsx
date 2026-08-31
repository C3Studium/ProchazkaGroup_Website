import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PixelReveal from "@/components/common/ui/PixelReveal";
import { animate, cubicBezier, motion, useInView, useMotionValue, useScroll, useTransform } from "framer-motion";
import { RiPhoneLine, RiMailLine, RiFacebookLine, RiInstagramLine } from "@remixicon/react";
import { ARRIVE_TO } from "@/components/pages/aboutUs/aboutStack";
import { FALLBACK_ROSTER, dial } from "@/constants/roster";
import { PHONE_LANDSCAPE, usePhoneOrTabletUpright } from "@/helpers/usePhone";
import { editable, editableDoc, editableLink, isEditMode } from "@/cms/edit";

// The heading comes from the CMS (siteCopy "o-nas.colleagues" — see
// @/cms/server/site/aboutUs), one item per line. These are the two lines the
// section shipped with and what it falls back to.
const FALLBACK_HEADING = ["Naši", "kolegové"];

// The three icons under the portrait that go somewhere fixed. They are targets
// and nothing else — an icon has no words on screen to edit — so they are read
// out of `o-nas.links` (ABOUT_LINKS in @/cms/server/site/aboutUs names the
// positions this file spells as literals below).
//
// The fourth icon, the telephone, is deliberately not among them and is not a
// link annotation at all: it dials the selected colleague's own number, which
// is a field of that person's consultant document, so it is edited in the popup
// their row opens rather than as a target on this block.
const FALLBACK_LINKS = {
    email: "mailto:asistentka.prochazka@ovbone.cz",
    facebook: "https://www.facebook.com/prochazkagroup",
    instagram: "https://www.instagram.com/prochazkagroup",
};

// the page's own glide — away quickly, then a long approach
const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// ...and its mirror, for the one thing this section does in reverse: leaving.
const DEPART = cubicBezier(0.5, 0, 0.75, 0);

// The roster this section falls back to, and the mottos that go with it, are
// shared with the advisors sheet the navigation opens — see
// @/constants/roster. Two copies of a fallback is two rosters that agree until
// somebody edits one.

// One person, from either source, with the ordinal the list draws beside them.
// The ordinal is a position and not content: it is computed here from where the
// person stands, so adding an eleventh renumbers rather than needing a field.
const numbered = (list) =>
    list.map((entry, index) => ({ ...entry, index: String(index + 1).padStart(2, "0") }));

// A consultant document, flattened to the five things this section draws. The
// rest of the record is what the popup is for.
const fromCms = (person) => ({
    name: person.name,
    moto: person.motto,
    src: person.portrait?.src,
    srcAlt: person.portraitAlt?.src || null,
    tel: person.phone,
    docId: person.docId,
});

// ── the phone, held upright ──
//
// Ten names in a column and the person they select a screen below them is not a
// roster on a phone, it is a table of contents with the contents somewhere else:
// measured at 390×844, the list ran 4049→4727 and the panel it drives began at
// 4761, so a name and the face it belongs to could not be on the screen at once.
//
// So on a phone this takes the shape the navigation's own roster now has — see
// src/components/common/navbar/body/advisors, where it was worked out. Ten 3:4
// miniatures, five across, and the one that is chosen fills the panel underneath
// at a size worth looking at. It is the same ten people; they should not meet
// two designs for them on one site.
//
// Which phone that is — and the bound behind it — lives in @/helpers/usePhone,
// alongside the argument for 600 and for reading orientation as well as width.
// It is the twin of this stylesheet's own phone block, and the pair has to
// agree: the stylesheet lays the tiles out and the hook decides what a tile IS.
// Disagreeing, they produce either a sheet of faces with a name-list's markup in
// it or a panel downstairs that nothing names.
//
// Read without `eager`, so it starts false and is corrected after mount — the
// shape this file already uses for `isTouch` below and for the same reason: this
// section is server-rendered, so the first client render has to agree with
// markup written where there is no viewport to measure. The ten thumbnails are
// therefore never asked for on anything that is not a phone.

// The miniature a tile shows, through the same optimiser and at the same width
// and quality the navigation's roster asks for — so the URLs are identical and a
// phone that has opened the menu draws this sheet with no request at all.
//
// A portrait that is not a local path is left alone: `/_next/image` refuses a
// host that is not in `remotePatterns`, and one unoptimised request is a better
// answer than a tile with no face in it. The roster only ever draws the local
// fallback; this section can be handed a portrait from the CMS.
const thumb = (src) =>
    (src && src.startsWith("/") ? `/_next/image?url=${encodeURIComponent(src)}&w=384&q=60` : src);

// One row. Own component so each can carry its own rule and its own slice of
// the detail pass — hooks cannot be called from inside a map.
// One row's arrival. It used to be tied to the section's scroll pass, which
// meant the names were drawn out over most of a pinned scroll and the list stood
// half empty until the reader had worked their way down it. They come in on
// their own now, once, as soon as the section is on screen — the roster is the
// thing the section is for, and it should be readable the moment it appears.
const ROW = {
    hidden: { opacity: 0, x: "-1.4vw" },
    shown: (i) => ({
        opacity: 1,
        x: "0vw",
        transition: { duration: 0.5, delay: 0.06 * i, ease: GLIDE },
    }),
};

const ROW_RULE = {
    hidden: { scaleX: 0 },
    shown: (i) => ({
        scaleX: 1,
        transition: { duration: 0.6, delay: 0.06 * i + 0.08, ease: GLIDE },
    }),
};

// Memoised, and it earns it. `active` changes on exactly two rows per hover —
// the one being left and the one being taken — while the other eight have
// nothing new to say. Without this, moving down the roster re-rendered all ten,
// twenty framer components in all, ten times over.
//
// `person` and `index` come out of one memoised array that only changes when the
// roster does, so the memo holds as long as `onSelect` does, which is what the
// `useCallback` in the section below is for.
const NameRow = memo(function NameRow({ person, index, active, phone, onSelect }) {
    // Bound here rather than upstream. A `() => setSelected(i)` written into the
    // map would be a new function on every render of the section, which is
    // precisely the prop a memo cannot survive — the rows would all re-render
    // anyway and the memo would be decoration.
    const select = useCallback(() => onSelect(index), [onSelect, index]);

    return (
        // The whole row, as that person's own document. Not the name, the motto
        // and the portrait separately: they are three fields of one record, so
        // the thing to open is the record's own form — the same argument
        // partners, offers and reviews already follow.
        //
        // On the <li> rather than on the button inside it, so the rule under the
        // name is inside the target too and the hit test cannot land between
        // them. Nothing is emitted outside the Studio's editing frame.
        //
        // Handed down on `person` rather than called here, and that is not
        // tidiness. Editing is armed from an effect (see @/cms/edit/arm), which
        // re-renders the page — but this component is memoised and the rows are
        // memoised elements, so with the call inside here nothing about the
        // props changed when the flag flipped, the memo held, and the ten rows
        // stayed unannotated while everything unmemoised on the page had its
        // attributes. Measured: 1 document annotation where there should have
        // been 11. Building the attributes into the roster makes arming a change
        // to `person`, which is a prop, which the memo does notice.
        <li className="Colleagues__row" {...person.cms}>
            <motion.button
                type="button"
                className={`Colleagues__name ${active ? "is-active" : ""}`.trim()}
                custom={index}
                variants={ROW}
                data-cursor="frame"
                // Pointer and keyboard reach the same thing: hovering a name
                // shows that person, and so does tabbing to it.
                onMouseEnter={select}
                onFocus={select}
                onClick={select}
                aria-pressed={active}
                // On a phone the tile is a face and two digits; the name it
                // stands for has moved downstairs into the panel, so the control
                // has to say who it is some other way. Off a phone the name is
                // right there in the button and a label would only repeat it.
                aria-label={phone ? person.name : undefined}
            >
                {/* The miniature. A background rather than an <Image> because it
                    is then the very URL the navigation's roster asks for and the
                    browser has usually already decoded it — and because off a
                    phone this element is not rendered at all, which is what
                    keeps ten thumbnails off every other screen. A hidden <img>
                    would still be fetched. */}
                {phone && (
                    <span
                        className="Colleagues__face"
                        aria-hidden="true"
                        style={{ backgroundImage: `url(${thumb(person.src)})` }}
                    />
                )}
                <span className="Colleagues__name__index">{person.index}</span>
                <span className="Colleagues__name__who">{person.name}</span>
            </motion.button>
            <motion.div
                className="Colleagues__line Colleagues__line--row"
                custom={index}
                variants={ROW_RULE}
            />
        </li>
    );
});

// "Naši kolegové": the roster on one half, the person on the other.
//
// It arrives by closing. The list comes in from the left edge and the panel
// from the right, and they meet on the seam — while MemberShowcase, still
// pinned behind them, is clipped inwards to exactly their inner edges and is
// gone at the moment they touch. Neither section fades; one is squeezed out by
// the other arriving, which is the same event described from two sides.
//
// Then it holds. The stage stays pinned for another eighty viewport-heights
// while the detail is drawn in — the rails, the rule under each name, the marks
// framing the portrait. Built rather than switched on.
export default function Colleagues({ headingLines, links: cmsLinks, roster: cmsRoster, docId, dismissed = false }) {
    const heading = headingLines?.length ? headingLines : FALLBACK_HEADING;
    // Each target falls back on its own, so a block that fills in only one of
    // them leaves the other two pointing where they pointed.
    const links = {
        email: cmsLinks?.email?.trim() || FALLBACK_LINKS.email,
        facebook: cmsLinks?.facebook?.trim() || FALLBACK_LINKS.facebook,
        instagram: cmsLinks?.instagram?.trim() || FALLBACK_LINKS.instagram,
    };
    const linksDocId = cmsLinks?.docId;
    // A list item has to exist in the block before it can be addressed — the
    // same rule Offers' copy lines follow.
    const headingDocId = headingLines?.length ? docId : null;

    // Not the thing that is pinned: the stage inside it is. A sticky element's
    // rect freezes the moment it pins, so measuring against it would freeze the
    // scroll with it.
    const sectionRef = useRef(null);
    const { scrollYProgress: raw } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });

    // A second reading of the same section, over the hundred viewport-heights
    // `raw` cannot see. `raw` is spent — pinned at 1 — from the moment the stage
    // stops travelling, and the stage is still filling the screen for a whole
    // viewport after that. This one runs 0 while the stage is fully on the
    // screen to 1 when its bottom edge has passed the top of it, so it is
    // exactly a measure of how far out of sight the section is.
    const { scrollYProgress: pass } = useScroll({
        target: sectionRef,
        offset: ["end end", "end start"],
    });

    // Who is on the page is the CMS's answer, whole. Not merged field by field
    // onto the constant the way the showcase merges its three cards: those are
    // three fixed positions the layout is computed from, and this is a list of
    // people where position 4 in one source and position 4 in the other are not
    // the same person. One source or the other, and the constant is what an
    // empty CMS looks like.
    //
    // `editing` is in the dependencies for the reason spelled out on NameRow:
    // it goes false -> true one render after hydration, and rebuilding the
    // roster is what carries that through the two memos below.
    const editing = isEditMode();
    const roster = useMemo(
        () => numbered(cmsRoster?.length ? cmsRoster.map(fromCms) : FALLBACK_ROSTER)
            .map((entry) => ({ ...entry, cms: editableDoc(entry.docId, "consultant") })),
        [cmsRoster, editing],
    );

    const [selected, setSelected] = useState(0);
    // Clamped rather than reset: the roster can get shorter — somebody is
    // archived while an editor is looking at the preview — and an index off the
    // end would be a property access on undefined in the panel below.
    const person = roster[Math.min(selected, roster.length - 1)];

    // Whether there is a pointer that can hover at all. The portrait's second
    // pose is turned over by the pointer resting on it, and on a touch screen
    // that gesture does not exist — a tap fires enter and leave in one breath,
    // which flashed the pose for a frame and put it back. Hydration-safe: the
    // server and the first client render agree on the desktop branch, and the
    // flag flips after mount (the same shape WhoWeAre uses).
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        setIsTouch(window.matchMedia("(hover: none)").matches);
    }, []);

    // Whether the list is a list or a contact sheet — see the note above the
    // PHONE constant. It is a separate question from `isTouch`: a tablet is
    // touched and keeps the list, and a phone is a phone whether or not the
    // browser will admit to a coarse pointer.
    // Upright and no wider than a tablet — the twin of the stylesheet's block
    // for this component. A tablet upright reads the same sheet of faces, so
    // it has to build the same tiles.
    const phone = usePhoneOrTabletUpright();

    // ── and whether it is that same phone lying down ──
    //
    // A third question, and none of the three answers it. `isTouch` is about a
    // pointer, `phone` is about the upright composition, and this is about one
    // attribute on one element: on a phone held sideways the roster below is
    // given its own overflow (see `phs-h` in the stylesheet), and a scroll
    // container inside a Lenis page has to say so or Lenis takes the gesture
    // and scrolls the document instead — the list never moves. It is the same
    // reason ContactModal's sheet and the review sheet carry the attribute.
    //
    // Read here rather than through `usePhoneAny`, and that is the point of the
    // distinction spelled out in @/helpers/usePhone: PHONE_ANY is also the
    // upright phone, where this <ul> is a grid of ten tiles that does not
    // scroll at all — the attribute there would take the page's own scroll away
    // from the reader over a sheet of faces and give it to nothing.
    //
    // Starts false and is corrected after mount, the shape `isTouch` above uses
    // and for its reason: this section is server-rendered, and the first client
    // render has to agree with markup written where there was no viewport.
    const [sideways, setSideways] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(PHONE_LANDSCAPE);
        const read = () => setSideways(mq.matches);
        read();
        mq.addEventListener("change", read);
        return () => mq.removeEventListener("change", read);
    }, []);

    // Which portrait of the selected person is showing. Only some of them have
    // a second one (see people.js); for the rest this stays on the first, and
    // the pixel swap still runs when the selection moves to someone else.
    const [alternate, setAlternate] = useState(false);

    // One function for all ten rows, for the life of the section. This is the
    // half of the memo above that lives up here: the rows can only skip a render
    // if every prop they are handed is the one they were handed last time.
    //
    // It also puts the pose back. On desktop that is a no-op — the pointer has
    // to leave the portrait to reach the list, so `alternate` is already false —
    // but on touch there is no leave, and without this the second pose of one
    // person was carried over onto the next.
    const select = useCallback((index) => {
        setSelected(index);
        setAlternate(false);
    }, []);

    // The names do not wait for the scroll pass any more — they run once, as
    // soon as the list is on screen.
    const namesRef = useRef(null);
    const namesSeen = useInView(namesRef, { once: true, amount: 0.1 });

    const shownSrc = (alternate && person.srcAlt) || person.src;

    // Two acts, and they overlap on purpose. GLIDE front-loads the arrival, so
    // the halves are visually in place a long way before ARRIVE_TO is reached;
    // waiting for it to finish before starting to draw left the two panels
    // standing on the screen empty for the better part of a viewport.
    const arrive = useTransform(raw, [0, ARRIVE_TO], [0, 1]);
    const detail = useTransform(raw, [ARRIVE_TO * 0.42, 0.86], [0, 1]);

    // How far the section has stood aside for the history below it. `dismissed`
    // is the hold on the prompt having completed; this is the section's answer
    // to it, and it is deliberately the section's own entry run backwards rather
    // than a fade. The two halves arrived by closing on each other, so they
    // leave by parting again — the reader is watching the same gesture undone,
    // which reads as this section handing the page over rather than as it being
    // switched off.
    const leave = useMotionValue(0);

    // It comes back if the reader goes back for it — standing aside is about
    // where the page's attention is, not a deletion.
    //
    // Asymmetric on purpose, and latched.
    //
    // Going out is unconditional: the hold has completed, and the section leaves
    // whatever the scroll happens to be doing. Coming back has to be earned — it
    // is not "the section is on the screen", because when the button is held the
    // section is still seven tenths on the screen (measured: `pass` is 0.30 at
    // that moment, and the page has not begun moving towards the history yet).
    // Testing that directly turned the departure into a wobble: out, half back,
    // out again, as the scroll carried the reader down past the threshold.
    //
    // So it is a round trip. The section has to leave the screen first; only
    // after that does coming back onto it mean the reader has come back FOR it.
    // And once it has returned it stays — scrolling down to the history a second
    // time is reading, not dismissing.
    //
    // An earlier attempt asked `raw`, which cannot answer any of this: `raw` is
    // spent at 1 across the whole viewport-height in which the stage leaves the
    // screen, so the section only returned once the reader had scrolled the
    // better part of two screens up past it — until then they were rolling back
    // through a section that was simply blank. That is the bug this replaces.
    useEffect(() => {
        let target = null;
        const to = (v) => {
            if (v === target) return;
            target = v;
            // Out on the page's leaving curve and back on its arriving one.
            // GLIDE is heavily front-loaded — a quarter of a second into it the
            // halves were already three quarters of the way off and the stage a
            // quarter opaque, which read as a flinch rather than a withdrawal.
            // Departures on this site ease *in*: they start where they stood and
            // gather speed, and this is the same curve the prompt above leaves on.
            animate(leave, v, v
                ? { duration: 1.1, ease: DEPART }
                : { duration: 0.75, ease: GLIDE });
        };
        if (!dismissed) {
            to(0);
            return;
        }
        to(1);
        let gone = false;
        let returned = false;
        return pass.on("change", (v) => {
            if (returned) return;
            if (v >= 0.92) gone = true;
            if (gone && v < 0.55) {
                returned = true;
                to(0);
            }
        });
    }, [dismissed, leave, pass]);

    // The halves close. Each is off its own edge by its own width, so this is a
    // real translation to zero rather than a mask — the same decision the
    // showcase's entry made, and for the same reason. `leave` pushes them back
    // out along the very same path.
    const listX = useTransform([arrive, leave], ([a, l]) => `${-100 * (1 - a) - 100 * l}%`);
    const panelX = useTransform([arrive, leave], ([a, l]) => `${100 * (1 - a) + 100 * l}%`);

    // Late, and only to take the seam between them with it — by the time this
    // bites, the halves are most of the way off their own edges and there is
    // little left on the stage to fade.
    const stageOpacity = useTransform(leave, [0.55, 1], [1, 0]);

    // Keyed to how far it has actually gone, not to whether it was asked to go:
    // hung on `dismissed` this stayed off after the section had come back, and
    // the roster was on the screen and unclickable.
    const stagePointer = useTransform(leave, (l) => (l > 0.02 ? "none" : "auto"));

    // The seam is drawn last and from the middle out, because it is the mark of
    // where the two halves met rather than a border either of them brought.
    const seamDraw = useTransform(detail, [0, 0.3], [0, 1]);
    const railDraw = useTransform(detail, [0.06, 0.44], [0, 1]);
    const overHeadingDraw = useTransform(detail, [0.02, 0.38], [0, 1]);
    const headingOpacity = useTransform(detail, [0, 0.22], [0, 1]);
    const headingRuleDraw = useTransform(detail, [0.08, 0.4], [0, 1]);
    const frameOpacity = useTransform(detail, [0.4, 0.72], [0, 1]);
    const metaOpacity = useTransform(detail, [0.52, 0.84], [0, 1]);

    // Written once rather than rebuilt on every hover. A fresh object literal in
    // `style` is a changed prop as far as framer is concerned, so these three —
    // the ones carrying the section's own movement — were being re-read every
    // time somebody moved down the list.
    const stageStyle = useMemo(
        () => ({ opacity: stageOpacity, pointerEvents: stagePointer }),
        [stageOpacity, stagePointer],
    );
    const listStyle = useMemo(() => ({ x: listX }), [listX]);
    const panelStyle = useMemo(() => ({ x: panelX }), [panelX]);

    // The roster's markup depends on the selection and on nothing else, and the
    // heading's on neither. Holding each behind its own dependencies means a
    // change of pose on the portrait — which is a state change on this component
    // — leaves both of them alone entirely.
    const rows = useMemo(
        () => roster.map((entry, index) => (
            <NameRow
                // The document, where there is one — two people can be set the
                // same name and a duplicate key stops a row being drawn.
                key={entry.docId || `${entry.name}-${index}`}
                person={entry}
                index={index}
                active={index === selected}
                phone={phone}
                onSelect={select}
            />
        )),
        // `phone` is in here for the reason spelled out on NameRow: it goes
        // false → true one render after mount, and rebuilding these elements is
        // the only thing that carries the change through the memo.
        [roster, selected, select, phone],
    );

    return (
        <section className="Colleagues" ref={sectionRef}>
            {/* The section keeps its 260vh whether or not it has stood aside:
                the scroll pass above is measured against it, and collapsing it
                would drag the history out from under whoever was reading it. */}
            <motion.div
                className="Colleagues__stage"
                style={stageStyle}
            >
                <motion.div className="Colleagues__list" style={listStyle}>
                    <motion.div
                        className="Colleagues__line Colleagues__line--rail"
                        style={{ scaleY: railDraw }}
                    />
                    <motion.div
                        className="Colleagues__line Colleagues__line--overHeading"
                        style={{ scaleX: overHeadingDraw }}
                    />

                    {/* Each line, not the whole heading: the two lines are
                        separate boxes with no whitespace between them, so the
                        heading's `textContent` is "Našikolegové" and annotating
                        it would store that. */}
                    <motion.h2 className="Colleagues__heading" style={{ opacity: headingOpacity }}>
                        {heading.map((word, index) => (
                            // `key` BEFORE the spread, and it has to be: with a
                            // spread ahead of it the JSX transform cannot hoist
                            // it out of the props object, so React sees a list
                            // child with no key at all. Measured — one console
                            // error on this page, and it is the only ordering in
                            // this file that matters.
                            <span
                                // By position rather than by word: the words are
                                // the editor's, and two lines set the same would
                                // be a duplicate key and a line that stops being
                                // drawn. The heading is a fixed two and never
                                // reorders.
                                key={index}
                                {...editable(headingDocId, `items.${index}.label`, "text")}
                                className="Colleagues__heading__line"
                            >
                                {word}
                                <motion.i style={{ scaleX: headingRuleDraw }} aria-hidden="true" />
                            </span>
                        ))}
                    </motion.h2>

                    {/* The roster. On a phone lying down this box is also the
                        scroller — see `sideways` above for why the attribute is
                        conditional rather than simply always on. */}
                    <motion.ul
                        className="Colleagues__names"
                        ref={namesRef}
                        initial="hidden"
                        animate={namesSeen ? "shown" : "hidden"}
                        {...(sideways ? { "data-lenis-prevent": "" } : null)}
                    >
                        {rows}
                    </motion.ul>
                </motion.div>

                <motion.div className="Colleagues__panel" style={panelStyle}>
                    {/* The portraits are cut out against white, so a dark panel
                        cannot simply take them: multiplying them into it would
                        take the person with the background. What they sit on is
                        a pool of light instead — feathered, roughly their own
                        footprint — so the multiply still has something to work
                        against while the panel around it stays the same
                        material as the cards above. */}
                    <div className="Colleagues__pool" aria-hidden="true" />

                    {/* One picture, swapped a cell at a time rather than ten
                        of them stacked and crossfaded. Moving to another name
                        changes it; resting on the one already showing turns it
                        over to that person's second portrait, where there is
                        one. Both go through the same grid, so a change of
                        person and a change of pose read as the same gesture. */}
                    <div
                        // The selected person's document again, and deliberately
                        // the same one their row carries: two entry points into
                        // one form, the way the FAQ's question and its block are
                        // two entry points into one list. The portrait, the motto
                        // and the counter beside it are all fields of the record
                        // this opens, so clicking any of them should land in the
                        // same place as clicking the name.
                        {...person.cms}
                        className="Colleagues__portrait"
                        // It turns over under the pointer, so the pointer should
                        // say so before it does.
                        data-cursor="frame"
                        // With a pointer, resting on the picture turns it over
                        // and leaving puts it back. On touch neither gesture
                        // exists — enter and leave arrive together on a tap and
                        // the pose flashed for a frame — so there a tap toggles
                        // it instead, and stays until the next tap or the next
                        // person.
                        onPointerEnter={isTouch ? undefined : () => setAlternate(true)}
                        onPointerLeave={isTouch ? undefined : () => setAlternate(false)}
                        onClick={isTouch ? () => setAlternate((v) => !v) : undefined}
                    >
                        <PixelReveal src={shownSrc} alt={person.name} />
                    </div>

                    {/* Four marks rather than a box: the frame says where to
                        look without drawing a line across the person. */}
                    <motion.div className="Colleagues__frame" style={{ opacity: frameOpacity }} aria-hidden="true">
                        <span className="Colleagues__frame__corner Colleagues__frame__corner--tl" />
                        <span className="Colleagues__frame__corner Colleagues__frame__corner--tr" />
                        <span className="Colleagues__frame__corner Colleagues__frame__corner--bl" />
                        <span className="Colleagues__frame__corner Colleagues__frame__corner--br" />
                    </motion.div>

                    <motion.div className="Colleagues__meta" style={{ opacity: metaOpacity }}>
                        <span className="Colleagues__counter">
                            <em>{person.index}</em> / {String(roster.length).padStart(2, "0")}
                        </span>
                        {/* Whose face this is. Everywhere else the list is
                            standing beside this panel and the name is already on
                            the screen, twice the size of anything a caption
                            would be — saying it again under the picture would be
                            labelling something the reader is looking at the
                            label for. On a phone the list is a sheet of faces
                            with two digits on them, so this is the only place
                            anybody is named at all. */}
                        {phone && <span className="Colleagues__who">{person.name}</span>}
                        <p className="Colleagues__moto">{person.moto}</p>
                    </motion.div>

                    <motion.ul className="Colleagues__links" style={{ opacity: metaOpacity }}>
                        <li>
                            <a href={dial(person.tel)} aria-label={`Zavolat: ${person.name}`} data-cursor="frame">
                                <RiPhoneLine size={20} />
                            </a>
                        </li>
                        {/* Targets only, which is the shape `editableLink` gives
                            an element with no words on it: `items.N.value` is
                            ABOUT_LINKS in @/cms/server/site/aboutUs. The
                            telephone above carries no annotation on purpose: it
                            is a field of the selected person's own document and
                            is edited in the popup the panel opens, not here. */}
                        <li>
                            <a
                                {...editableLink(linksDocId, { href: "items.1.value" })}
                                href={links.email}
                                aria-label={`Napsat: ${person.name}`}
                                data-cursor="frame"
                            >
                                <RiMailLine size={20} />
                            </a>
                        </li>
                        <li>
                            <a
                                {...editableLink(linksDocId, { href: "items.2.value" })}
                                href={links.facebook}
                                aria-label="Facebook"
                                data-cursor="frame"
                            >
                                <RiFacebookLine size={20} />
                            </a>
                        </li>
                        <li>
                            <a
                                {...editableLink(linksDocId, { href: "items.3.value" })}
                                href={links.instagram}
                                aria-label="Instagram"
                                data-cursor="frame"
                            >
                                <RiInstagramLine size={20} />
                            </a>
                        </li>
                    </motion.ul>
                </motion.div>

                <motion.div
                    className="Colleagues__line Colleagues__line--seam"
                    style={{ scaleY: seamDraw }}
                />
            </motion.div>
        </section>
    );
}
