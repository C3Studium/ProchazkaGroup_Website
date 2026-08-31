'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RiPhoneLine } from '@remixicon/react'

import CornerMarks from '@/components/common/ui/CornerMarks'
import { CURTAIN } from '@/components/common/ui/entrance'
import { FALLBACK_ROSTER, dial } from '@/constants/roster'
import { usePhoneOrTabletUpright } from '@/helpers/usePhone'

// The roster, inside the menu's own panel.
//
// It was a sheet of its own for a while, over the top of everything, and the
// way back from it was closing it. Here it is the second thing the panel can be
// showing: the box grows, the bento leaves, this arrives in its place, and BACK
// is a word in the rail rather than a dismissal.
//
// A wall of blocks that give each other room.
//
// Not a grid, and not a shove either. Re-weighting a grid's tracks moved every
// block in the row AND the column, however far away. Translating the neighbours
// out of the way fixed that and introduced its own problem: blocks slid, which
// reads as the wall coming apart rather than as one block taking room from the
// others.
//
// So nothing here moves. Blocks GROW AND SHRINK. The one being reached for takes
// more of its row and its row-mates give exactly that much up — which is what
// flex does natively, so the row stays full to its edges at every frame with no
// gaps to close and nothing to overlap. It is also why this is flex and not a
// grid: a grid track is shared down a whole column, a flex line only by the
// blocks in it, so the effect stays where the pointer is.

// The lead's share of the wall's width. Big, and deliberately not more: at a
// third he was the only thing at his own scale and everyone else read as a
// footnote to him.
const LEAD_BASIS = 25;

// How many shares the reached-for block asks for, where every block is one at
// rest. The row has to find the extra half from its own members.
const GROW = 1.5;

// ...and how much taller its row gets. Portraits, so the vertical is worth more
// — but the other row is still holding faces and names, so this is the smaller
// of the two moves.
const GROW_ROW = 1.24;

// The floor, in pixels, under any block's width. This is the bounds part: a
// share is meaningless without knowing how wide the row actually is, and a
// portrait squeezed under about a hundred and thirty pixels is a sliver with a
// nose in it.
const MIN_PX = 132;

/**
 * What each block in one row is worth, given which of them is being reached for.
 *
 * The extra the active block wants is taken from the others in proportion to how
 * close they are — its neighbour gives up the most and the far end of the row
 * barely notices. Nobody goes below `floor`, and whatever the floor refuses to
 * give is simply not taken: the active block ends up with what the row could
 * spare rather than with what it asked for, which is the difference between a
 * layout that redistributes and one that overflows.
 */
const shares = (count, active, floor) => {
    if (count <= 0) return [];
    if (active < 0 || active >= count) return Array(count).fill(1);
    if (count === 1) return [1];

    const weights = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
        if (i === active) { weights.push(0); continue; }
        const w = 1 / Math.pow(Math.abs(i - active), 1.35);
        weights.push(w);
        total += w;
    }

    const wanted = GROW - 1;
    const out = weights.map((w, i) =>
        (i === active ? 0 : Math.max(floor, 1 - wanted * (w / total))));

    const freed = out.reduce((sum, v, i) => (i === active ? sum : sum + (1 - v)), 0);
    out[active] = 1 + freed;
    return out;
};

/** The rows the roster splits into, everyone except the lead. */
const rowsOf = (count) => {
    const others = Math.max(0, count - 1);
    if (!others) return [];
    const top = Math.ceil(others / 2);
    return [top, others - top].filter(Boolean);
};

// Which edge a portrait unfolds from, so a block opens towards the middle of the
// wall rather than all of them doing the same thing.
const opensFor = (row, col, colCount) => {
    if (col === 0) return 'left';
    if (col === colCount - 1) return 'right';
    return row === 0 ? 'top' : 'bottom';
};

// The reveal, built out of transforms only: an outer layer slides in from the
// edge while the inner one slides the opposite way by exactly as much, so the
// portrait never moves relative to its block — what moves is the edge that
// uncovers it. `clip-path` would be re-rasterised on the main thread every
// frame, inside a block whose own width is being animated at the same time.
const OUTER = {
    left: { x: '-100%', y: '0%' },
    right: { x: '100%', y: '0%' },
    top: { x: '0%', y: '-100%' },
    bottom: { x: '0%', y: '100%' },
};

const INNER = {
    left: { x: '100%', y: '0%' },
    right: { x: '-100%', y: '0%' },
    top: { x: '0%', y: '100%' },
    bottom: { x: '0%', y: '-100%' },
};

const REST = { x: '0%', y: '0%' };

const MASK = { duration: 0.7, ease: CURTAIN };
const PUSH = { duration: 1.15, ease: CURTAIN };
const CALM = { duration: 0.28, ease: CURTAIN };

const outerPose = (opens, open, calm) => ({
    ...(open ? REST : OUTER[opens]),
    transition: calm ? CALM : MASK,
});

const innerPose = (opens, open, calm) => ({
    ...(open ? REST : INNER[opens]),
    scale: calm ? 1 : open ? 1 : 1.06,
    transition: calm ? CALM : { x: MASK, y: MASK, scale: PUSH },
});

// The house physics, from /nabidka: two springs of different stiffness, so one
// axis leads and the other trails it by a few frames. Written there as the
// reason "the three cells read as pushing each other apart rather than as one
// number being scrubbed".
const WIDTH_SPRING = { type: 'spring', stiffness: 150, damping: 26, restDelta: 0.001 };
const HEIGHT_SPRING = { type: 'spring', stiffness: 210, damping: 24, restDelta: 0.001 };
const CALM_SIZE = { duration: 0.24, ease: CURTAIN };

// The same optimiser every picture on the site goes through — 384 is one of
// Next's default `imageSizes`, and an unlisted width is refused.
const thumb = (src) => `/_next/image?url=${encodeURIComponent(src)}&w=384&q=60`;

// And the one the record wears on a tall phone, where it stops being a thumbnail
// beside a name and becomes the whole panel — 396 CSS pixels across at 430, which
// is 1188 of them on a phone that draws three to one. 384 there is a portrait you
// can see the compression in. 828 is one of Next's default `deviceSizes` and
// covers two-to-one at that width; 80 is in `images.qualities` in next.config.mjs,
// and a quality that is not listed there is quietly served as a neighbouring one.
const shot = (src) => `/_next/image?url=${encodeURIComponent(src)}&w=828&q=80`;

const wallIn = {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 0.4, ease: CURTAIN } },
    exit: { opacity: 0, transition: { duration: 0.22, ease: CURTAIN } },
};

// ── the phone, held upright ──
//
// A wall of blocks trading width with each other needs width to trade, and a
// phone has 294 of it. So on a phone the wall stops being a wall: the ten of
// them become a sheet of 3:4 miniatures and the one that is chosen is drawn out
// of it at a size worth looking at, in a panel underneath — the picture, the
// name, the motto, the number. Everything below is that branch; the composition
// above is untouched and is what every other screen still gets.
//
// Which phone that is — and the bound behind it — now lives in
// @/helpers/usePhone, because this is no longer the only place that asks: the
// same sheet is drawn on /o-nas and in the benefit programme's enrolment, and
// three copies of one media query is three answers to what a phone is. That
// module's string is the TWIN of the stylesheet's phone block; the stylesheet
// lays the tiles out, the hook decides what a tile IS.
//
// `eager` is answered at the first render rather than from an effect, which is
// the one place this departs from the panel around it. It can be, and it has to
// be: this component is behind `{menu && …}` in the navbar and only ever mounts
// from a tap, so there is no server render of it for a first answer to disagree
// with. Answering `false` first the way the panel does would mean one committed
// render of the desktop wall — ten <Image>s a phone asks the network for and
// then throws away, and ten subtrees React tears down to swap an <a> for a
// <button>.

export default function Advisors({ roster, calm, touch, onPick }) {
    const [hovered, setHovered] = useState(0);
    // Upright and no wider than a tablet. The sheet a phone gets is the sheet a
    // tablet upright wants too, only bigger — see PHONE_OR_TABLET_UPRIGHT in
    // @/helpers/usePhone, which is its own constant rather than a wider PHONE
    // because two other components read that one and neither wants this.
    const phone = usePhoneOrTabletUpright({ eager: true });
    const people = useMemo(() => (roster?.length ? roster : FALLBACK_ROSTER), [roster]);
    const [lead, ...rest] = people;

    const rowSizes = useMemo(() => rowsOf(people.length), [people.length]);
    const rows = useMemo(() => {
        let at = 0;
        return rowSizes.map((n) => {
            const slice = rest.slice(at, at + n).map((person, i) => ({ person, index: at + i + 1 }));
            at += n;
            return slice;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [people, rowSizes]);

    // ── the bounds ──
    //
    // A share is a number with no units and the floor under a block is in
    // pixels, so the engine cannot decide how much a row can spare without
    // knowing how wide that row actually is. Each row hands its own width back
    // through a ref, remeasured whenever the panel changes size — which it does,
    // because arriving here is the panel growing.
    //
    // `offsetWidth` and not a rect: the rect is the box after transforms, and a
    // row measured mid-animation would feed its own movement back into the sums.
    const rowRefs = useRef([]);
    const [rowWidths, setRowWidths] = useState([]);

    const measure = useCallback(() => {
        setRowWidths(rowRefs.current.map((el) => (el ? el.offsetWidth : 0)));
    }, []);

    useLayoutEffect(() => {
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        rowRefs.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [measure, people.length]);

    // Which row holds the block being reached for, and where in it.
    const at = useMemo(() => {
        if (hovered <= 0) return { row: -1, col: -1 };
        let seen = 0;
        for (let r = 0; r < rowSizes.length; r++) {
            if (hovered - 1 < seen + rowSizes[r]) return { row: r, col: hovered - 1 - seen };
            seen += rowSizes[r];
        }
        return { row: -1, col: -1 };
    }, [hovered, rowSizes]);

    // Who the panel at the bottom is showing. `hovered` opens at 0, so arriving
    // on a phone the lead is already down there — the sheet opens on somebody
    // rather than on an empty frame waiting to be filled.
    const nowIndex = hovered >= 0 && hovered < people.length ? hovered : 0;
    const now = people[nowIndex];

    const block = (person, index, opens, share) => {
        const isOpen = hovered === index;
        const href = dial(person.tel);

        // On a phone a tile only chooses. The number it would have dialled is
        // in the panel at the bottom, on a target built to be hit, so a tile
        // that also dialled would be two ways to ring the same person and one
        // of them sixty pixels wide — with a double-tap-to-zoom living in the
        // same gesture. A <button> and not a tel: link with its default
        // prevented: a link that never navigates is a lie told to everybody who
        // is not looking at the screen.
        const Tile = phone ? 'button' : 'a';
        const tileProps = phone
            ? {
                type: 'button',
                // The name is the whole of what this control is for; the ordinal
                // is decoration and the rest of the record has moved downstairs.
                'aria-label': person.name,
                'aria-pressed': isOpen,
                onClick: () => setHovered(index),
            }
            : {
                href,
                // These are tel: links, and on touch the hover cannot have
                // happened first. So the tap is the reach: the first tap on
                // a closed block opens it — portrait, motto, number — and
                // only a tap on the block already open places the call.
                // Ringing somebody because a thumb brushed their face is
                // the one thing this wall must not do.
                onClick: (e) => {
                    if (touch && !isOpen) {
                        e.preventDefault();
                        setHovered(index);
                        return;
                    }
                    onPick?.(e);
                },
                // Keyboard preview only: on touch a tap fires focus BEFORE
                // click, and an unguarded focus would select the block
                // mid-tap — turning the first tap into the call.
                onFocus: () => { if (!touch) setHovered(index); },
            };

        return (
            <motion.div
                key={person.name}
                className={`navAdv__cell${isOpen ? ' is-open' : ''}`}
                style={{ flexBasis: 0 }}
                animate={{ flexGrow: share }}
                transition={calm ? CALM_SIZE : WIDTH_SPRING}
                onPointerEnter={() => { if (!touch) setHovered(index); }}
            >
                <Tile
                    className="navAdv__cell__link"
                    data-cursor="frame"
                    data-marks
                    {...tileProps}
                >
                    {/* The face at rest. A wall of dark rectangles with a name at
                        the bottom is not a roster — this is the same portrait
                        held right back, so the wall reads as people before
                        anything is reached for, and the unfolding copy arrives
                        over it at full strength. A background rather than a
                        second <Image>: the URL is the one Next's optimiser
                        serves the layer above, so the browser decodes it once.

                        On a phone it is not held back and there is no layer
                        above: this one picture is the miniature, and it is the
                        same file the panel at the bottom enlarges. One request
                        per advisor for both, instead of the two the wall asks
                        for — a 46vw <Image> and this, at different widths. */}
                    <span
                        className="navAdv__ghost"
                        aria-hidden="true"
                        style={{ backgroundImage: `url(${thumb(person.src)})` }}
                    />

                    {/* The unfold is the wall's own gesture and it has nothing
                        left to do here: what a tile opens into is the panel
                        downstairs, not itself. Not rendered rather than hidden,
                        because a hidden <img> is still fetched — ten portraits a
                        phone would pay for and never draw. */}
                    {!phone && (
                        <motion.span
                            className="navAdv__shot"
                            aria-hidden="true"
                            initial={outerPose(opens, false, calm)}
                            animate={outerPose(opens, isOpen, calm)}
                        >
                            <motion.span
                                className="navAdv__shot__in"
                                initial={innerPose(opens, false, calm)}
                                animate={innerPose(opens, isOpen, calm)}
                            >
                                <Image
                                    src={person.src}
                                    alt=""
                                    fill
                                    sizes="(max-width: 900px) 46vw, 22vw"
                                    quality={80}
                                    // Portraits, and the faces are in the top third
                                    // of every one of them. Centred, a block this
                                    // tall crops them at the chin.
                                    style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
                                />
                            </motion.span>
                        </motion.span>
                    )}

                    <span className="navAdv__scrim" aria-hidden="true" />
                    <CornerMarks />

                    <span className="navAdv__ord" aria-hidden="true">
                        <span className="navAdv__tick" />
                        {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* The record itself is downstairs on a phone. Left in the
                        tile it would be a name, a motto and a number set in a
                        column 59px wide — and the stylesheet would have to hide
                        what the markup had already paid to lay out. */}
                    {!phone && (
                        <span className="navAdv__foot">
                            <span className="navAdv__name">{person.name}</span>
                            <span className="navAdv__moto" aria-hidden="true">
                                <span>{person.moto}</span>
                            </span>
                            {href && (
                                <span className="navAdv__tel">
                                    <RiPhoneLine size={14} aria-hidden="true" />
                                    {person.tel}
                                </span>
                            )}
                        </span>
                    )}
                </Tile>
            </motion.div>
        );
    };

    return (
        <motion.div
            className="navAdv"
            variants={wallIn}
            initial="initial"
            animate="enter"
            exit="exit"
            // On touch the pointer "leaves" as the finger lifts, which would
            // hand the selection straight back to the lead.
            onPointerLeave={() => { if (!touch) setHovered(0); }}
        >
            {/* A box that exists on a phone and nowhere else: off it the
                stylesheet gives this `display: contents` and the lead and the
                rows go on being the flex children of .navAdv they have always
                been. On a phone it is what the tiles are gridded into, and it
                has to be an element of its own because the panel below is its
                sibling — gridded from .navAdv itself, the panel would have been
                a member of the same grid and the tiles would have had to scroll
                past it. */}
            <div className="navAdv__wall">
            {/* The lead. One block, its own width, and he does not take part in
                the rows' arithmetic — what he gives up when somebody else is
                reached for is nothing, because he is not in their row. */}
            {lead && (
                <motion.div
                    className="navAdv__lead"
                    style={{ flexBasis: 0 }}
                    animate={{ flexGrow: hovered === 0 ? LEAD_BASIS * GROW_ROW : LEAD_BASIS }}
                    transition={calm ? CALM_SIZE : WIDTH_SPRING}
                >
                    {block(lead, 0, 'left', 1)}
                </motion.div>
            )}

            <div className="navAdv__rest">
                {rows.map((row, r) => {
                    // What one block may not be squeezed below, as a share of an
                    // even row — the bounds, in the engine's own units.
                    const width = rowWidths[r] || 0;
                    const even = width / Math.max(1, row.length);
                    const floor = even ? Math.min(0.95, MIN_PX / even) : 0.55;
                    const spread = shares(row.length, at.row === r ? at.col : -1, floor);

                    return (
                        <motion.div
                            key={`row-${r}`}
                            ref={(el) => { rowRefs.current[r] = el; }}
                            className="navAdv__row"
                            style={{ flexBasis: 0 }}
                            animate={{ flexGrow: at.row === r ? GROW_ROW : 1 }}
                            transition={calm ? CALM_SIZE : HEIGHT_SPRING}
                        >
                            {row.map(({ person, index }, c) =>
                                block(person, index, opensFor(r, c, row.length), spread[c]))}
                        </motion.div>
                    );
                })}
            </div>
            </div>

            {/* ── the one that is chosen ──

                Underneath the sheet, and that placement is the argument rather
                than an accident of source order. The number is the only thing in
                this whole component anybody taps on purpose, and the bottom of a
                phone is the part of it a thumb reaches without the hand moving:
                the faces are for the eyes and go where reading starts, the
                number is for the thumb and goes where the thumb already is.

                Keyed on the name so a pick replays the entrance instead of
                cross-fading two copies of a record.

                Two sources for the one picture, handed over as custom properties
                rather than as a background, because the stylesheet has two
                layouts for this panel and they do not want the same file: a
                thumbnail beside a name on a short phone, the whole panel on a
                tall one. A custom property is not fetched until a declaration
                actually in play uses it, so naming both here costs nothing —
                only the one its media query reaches is ever asked for. The short
                one is the file the tile overhead is already showing, so on that
                phone there is nothing to wait for at all. */}
            {phone && now && (
                <div className="navAdv__now" aria-live="polite">
                    <motion.div
                        key={now.name}
                        className="navAdv__now__in"
                        initial={{ opacity: 0, y: calm ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: calm ? 0.16 : 0.34, ease: CURTAIN }}
                    >
                        <span
                            className="navAdv__now__shot"
                            aria-hidden="true"
                            style={{
                                '--shot': `url(${thumb(now.src)})`,
                                '--shot-lg': `url(${shot(now.src)})`,
                            }}
                        />

                        <div className="navAdv__now__text">
                            <span className="navAdv__now__ord" aria-hidden="true">
                                <span className="navAdv__tick" />
                                {String(nowIndex + 1).padStart(2, '0')}
                            </span>
                            <span className="navAdv__now__name">{now.name}</span>
                            <span className="navAdv__now__moto">{now.moto}</span>
                            {dial(now.tel) && (
                                <a
                                    className="navAdv__now__tel"
                                    href={dial(now.tel)}
                                    data-cursor="frame"
                                    onClick={(e) => onPick?.(e)}
                                >
                                    <RiPhoneLine size={16} aria-hidden="true" />
                                    {now.tel}
                                </a>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
