"use client";

import { useState } from "react";
import { motion, useTransform } from "framer-motion";
import { At, Be, Ch, Cz, De, Es, Fr, Gr, Hr, Hu, It, Pl, Ro, Si, Sk, Ua } from "react-flag-icons";

import { CONTEXT_PATHS, MAP, MARKETS } from "./europe";

// The map.
//
// No mapping library: the outlines are Natural Earth's, public domain,
// projected once by scripts/make-europe.mjs and shipped as thirty kilobytes of
// SVG path — the whole continent, not only the sixteen countries we are in. A
// map that is looked at rather than panned does not need d3-geo, topojson and a
// tile source.
//
// ── how a country grows ────────────────────────────────────────────────
//
// The wall of boxes redistributes shares: the block reached for takes more of
// its row and its row-mates give exactly that much up. Countries cannot be
// given shares — they are not a row — so the same sentence is written with the
// tools a map has: the one reached for is SCALED, about its own middle, and the
// ones near it are MOVED out of its way and shrink a little.
//
// Scaled, not deformed. An earlier version pushed every point of every shape
// away from the country being reached for, which kept the borders shared and
// left no gaps — and turned Czechia into a blob. A country has to stay the
// shape of that country; a map whose outlines are approximate is not a map, it
// is a diagram of one. So the shapes are rigid and what moves is where they
// are, which does open a hairline of ground along a border for as long as the
// pointer is there. That reads as the country lifting off the map, which is
// what it is doing.

// Named one by one rather than through the package's namespace: it carries two
// hundred and sixty-nine flags and we are in sixteen countries.
const FLAGS = { AT: At, BE: Be, CH: Ch, CZ: Cz, DE: De, ES: Es, FR: Fr, GR: Gr,
    HR: Hr, HU: Hu, IT: It, PL: Pl, RO: Ro, SI: Si, SK: Sk, UA: Ua };

// The house physics, from the roster wall in the menu.
const REACH = { type: "spring", stiffness: 150, damping: 26, restDelta: 0.001 };

// How far a neighbour is moved out of the way, in the map's own units, and how
// quickly that falls off with distance: hardest for the country next door,
// nothing at all across the continent.
const PUSH = 62;
const FALLOFF = 165;

// What the flag and its date need inside the country, in map units. A country
// grows by whatever it is short of that — and never by less than a fifth,
// because a country that does not visibly move has not answered the pointer.
//
// Roughly five flags across and five deep, which is what it was against the old
// frame too. It is written in map units and the map now holds the whole
// continent rather than our own sixteen countries, so the same numbers would
// have been asking a country to grow to a size the flag no longer needs — and
// every small one would have sat pinned to the ceiling below. Czechia opens at
// 1.5, which is what it opened at before any of this.
const NEEDS = { w: 73, h: 57 };
const scaleFor = ([w, h]) =>
    Math.min(3.2, Math.max(1.22, NEEDS.w / w, NEEDS.h / h));

// The flag, at the size the map is actually being drawn. It was a fixed 26px,
// which on the 850px desktop map is three per cent of the continent and on a
// phone's 366px one is seven — sixteen flags the size of the countries they
// stand on, printed over each other across central Europe.
//
// Held in proportion, everything else follows for free: what a country has to
// grow to hold its own flag and date is the same fraction of the map at every
// size, so the scale that opens it needs no adjusting at all.
//
// The number that matters is not how big a flag is but how much of a country it
// covers. On the frame this map started life with, twenty-six pixels of flag sat
// on a hundred and eighteen of Czechia; a frame that now runs from Iceland to
// the Urals holds the same share at twelve, and the map being drawn at the
// height of the screen puts that back at around twenty-four real pixels. The
// ceiling is only there to stop a very tall screen printing a postage stamp on
// Slovenia — it is not the size, the share is.
const FLAG_OF = 12 / 850;
const flagFor = (width) => Math.round(Math.min(34, Math.max(10, width * FLAG_OF)));

export default function EuropeMap({ ride, at, step, width = 850, caption = false, coarse = false, ground = false }) {
    const [held, setHeld] = useState(-1);
    const flagW = flagFor(width);

    // Drawn on as it arrives, country by country in the order they were opened.
    const drawn = useTransform(ride, [at, at + step * 1.6], [0, 1]);

    // And the continent under them wipes on first, west to east, before the
    // first market lights. The countries always staged themselves; everything
    // they stand on simply appeared with the box, which made the map read as a
    // picture being faded up with one animated thing inside it.
    const sweep = useTransform(drawn, [0, 0.44], [0, MAP.w], { clamp: true });

    const market = held >= 0 ? MARKETS[held] : null;

    return (
        // Ground rather than picture: it is the size of the screen and it has no
        // edge, because the stylesheet fades all four of them out. See
        // EuropeMap--ground.
        <div className={`EuropeMap${caption ? " EuropeMap--read" : ""}${ground ? " EuropeMap--ground" : ""}`}>
            {/* Its own proportions, from the projection: the flags are placed
                in percentages of this box, so it has to be exactly the map's
                shape or every flag lands off its country. */}
            <div className="EuropeMap__frame" style={{ aspectRatio: `${MAP.w} / ${MAP.h}` }}>
                <svg
                    className="EuropeMap__plate"
                    viewBox={`0 0 ${MAP.w} ${MAP.h}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    {/* Everything else in the frame, at the faintest weight the
                        site draws. A map with only our own countries on it is
                        not a map, it is a diagram — and they have to give way
                        with the rest, or the country that grows grows over
                        Serbia. */}
                    <defs>
                        <clipPath id="EuropeMap__sweep">
                            <motion.rect x="0" y="0" height={MAP.h} width={sweep} />
                        </clipPath>
                    </defs>

                    <g className="EuropeMap__context" clipPath="url(#EuropeMap__sweep)">
                        {CONTEXT_PATHS.map((d, i) => (
                            <path key={i} d={d} />
                        ))}
                    </g>

                    <g className="EuropeMap__markets">
                        {MARKETS.map((market, i) => (
                            <Country
                                key={market.iso}
                                market={market}
                                index={i}
                                drawn={drawn}
                                held={held === i}
                                from={held >= 0 ? MARKETS[held] : null}
                                coarse={coarse}
                                onHold={() => setHeld(i)}
                                onLeave={() => setHeld((v) => (v === i ? -1 : v))}
                                onTap={() => setHeld((v) => (v === i ? -1 : i))}
                            />
                        ))}
                    </g>
                </svg>

                {/* The flags, on the countries. Their own layer over the map
                    rather than inside it, because a flag is a picture at a
                    fixed size and everything inside the svg is in map units. */}
                <div className="EuropeMap__flags">
                    {MARKETS.map((market, i) => (
                        <Flag
                            key={market.iso}
                            market={market}
                            index={i}
                            drawn={drawn}
                            held={held === i}
                            from={held >= 0 ? MARKETS[held] : null}
                            flagW={flagW}
                            coarse={coarse}
                            onHold={() => setHeld(i)}
                            onLeave={() => setHeld((v) => (v === i ? -1 : v))}
                            onTap={() => setHeld((v) => (v === i ? -1 : i))}
                        />
                    ))}
                </div>
            </div>

            {/* The name and the date, under the map rather than on it.
                Sixteen countries on 366 pixels of continent leave Slovenia
                nine pixels across, and a date printed inside it is a smudge —
                so on a phone the map answers in a line of type beside itself,
                which is also the one place there is room to say WHICH country
                has just been touched. */}
            {caption ? (
                <p className="EuropeMap__read__line" aria-live="polite">
                    {market ? (
                        <>
                            <span className="EuropeMap__read__name">{market.name}</span>
                            <span className="EuropeMap__read__year">{market.year ?? "—"}</span>
                        </>
                    ) : (
                        <span className="EuropeMap__read__hint">
                            Ťukněte na zemi a uvidíte, odkdy tam jsme
                        </span>
                    )}
                </p>
            ) : null}
        </div>
    );
}

function Country({ market, index, drawn, held, from, coarse, onHold, onLeave, onTap }) {
    // Its own slice of the drawing. Sixteen countries over the run, in the
    // order they were opened, so the map fills the way the history reads.
    const share = index / MARKETS.length;
    const shown = useTransform(drawn, [share * 0.9, share * 0.9 + 0.12], [0, 1]);

    let scale = 1;
    let dx = 0;
    let dy = 0;
    if (held) {
        scale = scaleFor(market.box);
    } else if (from) {
        const vx = market.at[0] - from.at[0];
        const vy = market.at[1] - from.at[1];
        const dist = Math.hypot(vx, vy) || 1;
        const force = Math.exp(-dist / FALLOFF);
        dx = (vx / dist) * PUSH * force;
        dy = (vy / dist) * PUSH * force;
        scale = 1 - 0.08 * force;
    }

    // Czechia is lit before anybody touches anything: this page is the Czech
    // branch's, and sixteen equal countries on a map say the opposite.
    const home = market.iso === "CZ";

    return (
        <motion.path
            className={`EuropeMap__market${home ? " is-home" : ""}${held ? " is-held" : ""}${from && !held ? " is-dim" : ""}`}
            d={market.d}
            style={{ opacity: shown }}
            // Scaled about its own middle: `transform-box: fill-box` in the
            // stylesheet puts the origin in the shape rather than in the svg's
            // corner, so the country grows where it stands.
            animate={{ scale, x: dx, y: dy }}
            transition={REACH}
            // A finger gets a toggle instead of enter and leave — see
            // useCoarsePointer in the band. Without it the first country
            // touched is lifted off the map for good, and the date belonging
            // to every other one is unreachable.
            onPointerEnter={coarse ? undefined : onHold}
            onPointerLeave={coarse ? undefined : onLeave}
            onClick={coarse ? onTap : undefined}
        />
    );
}

function Flag({ market, index, drawn, held, from, flagW = 26, coarse, onHold, onLeave, onTap }) {
    const Mark = FLAGS[market.iso];
    const share = index / MARKETS.length;
    const shown = useTransform(drawn, [share * 0.9, share * 0.9 + 0.12], [0, 1]);

    // Carried on the same field as the borders under it, so a flag stays on its
    // own country while that country is being pushed aside.
    let dx = 0;
    let dy = 0;
    if (from && !held) {
        const vx = market.at[0] - from.at[0];
        const vy = market.at[1] - from.at[1];
        // The same push the border under it is given, so a flag stays on its
        // own country while that country is getting out of the way.
        const dist = Math.hypot(vx, vy) || 1;
        const force = Math.exp(-dist / FALLOFF);
        dx = (vx / dist) * PUSH * force;
        dy = (vy / dist) * PUSH * force;
    }

    return (
        <motion.button
            type="button"
            className={`EuropeMap__flag${held ? " is-held" : ""}${from && !held ? " is-dim" : ""}`}
            style={{
                left: `${(market.at[0] / MAP.w) * 100}%`,
                top: `${(market.at[1] / MAP.h) * 100}%`,
                opacity: shown,
            }}
            animate={{
                x: `calc(-50% + ${dx.toFixed(1)}px)`,
                y: `calc(-50% + ${dy.toFixed(1)}px)`,
                scale: held ? 1.35 : 1,
            }}
            transition={REACH}
            // On a fine pointer the flag stays out of the way and the country
            // under it is the target, which is the bigger shape and the one
            // that lights. A finger cannot be that accurate: Slovenia is nine
            // pixels across on a phone and the flag standing on it is eleven,
            // so on touch the flag is the tap target and the stylesheet gives
            // it the pointer back.
            onPointerEnter={coarse ? undefined : onHold}
            onPointerLeave={coarse ? undefined : onLeave}
            onClick={coarse ? onTap : undefined}
            // And focus is a third way in, which on a finger is not a third
            // way in at all: a tap on a button fires focus BEFORE click, so
            // focus opened the country and the click that followed toggled it
            // straight shut again — the first tap on every flag did nothing
            // and the second one worked. Keyboard only, where it is the whole
            // of the interaction.
            onFocus={coarse ? undefined : onHold}
            onBlur={coarse ? undefined : onLeave}
        >
            <span className="EuropeMap__flag__mark">
                {Mark ? <Mark width={flagW} height={Math.round((flagW * 19) / 26)} /> : null}
            </span>
            {/* The year, inside the country's own outline — which is why the
                country swells as much as it does. Only on the one being reached
                for: sixteen dates at once is a map nobody can read. */}
            <motion.span
                className="EuropeMap__flag__year"
                // In proportion with the flag it hangs under, for the same
                // reason: a fixed 0.82rem date is wider than Switzerland.
                style={{ fontSize: `${((flagW / 26) * 0.82).toFixed(2)}rem` }}
                animate={{ opacity: held ? 1 : 0, y: held ? 0 : 3 }}
                transition={{ duration: held ? 0.4 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
                {market.year ?? "—"}
            </motion.span>
        </motion.button>
    );
}
