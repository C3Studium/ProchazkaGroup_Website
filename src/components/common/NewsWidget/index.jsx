"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, cubicBezier, motion, useReducedMotion } from "framer-motion";
import { RiArrowRightUpLine, RiCloseLine, RiNewspaperLine } from "@remixicon/react";
import { useGlobalContext } from "@/context/LoadProvider";
import { isEditMode } from "@/cms/edit";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// Plovoucí okno novinek.
//
// Tři stavy u okraje obrazovky:
//   1. tlačítko s počtem novinek za poslední měsíc („+10") a vedle něj bublina
//      s výzvou — po načtení webu, až odjede úvodní opona;
//   2. bublinu jde zavřít; tlačítko pak zajede napůl za okraj a vyjede, když
//      na něj najede myš nebo fokus. Zavření si prohlížeč pamatuje, dokud
//      nepřibude novější novinka;
//   3. otevřené okno ve velikosti telefonu — chat, ve kterém jsou novinky
//      zprávami. Na telefonu přes celou obrazovku.
//
// Data a poloha chodí z /api/news za běhu (proč ne při buildu, viz ten soubor).
// Poloha je volba majitele ve Studiu: Obsah → Widget novinek.

const STORAGE_KEY = "pg-news-dismissed";
const MONTH_DAYS = 30;

const RANGES = [
    { id: "all", label: "Vše" },
    { id: "7", label: "7 dní" },
    { id: "30", label: "30 dní" },
    { id: "90", label: "3 měsíce" },
    { id: "custom", label: "Vlastní" },
];

/* ------------------------------------------------------------ datumy -- */

const pad = (n) => String(n).padStart(2, "0");
const isoDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dayFromIso = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};
const daysAgo = (n) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - n);
    return isoDay(date);
};

const LONG = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
const SHORT = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric" });

/** „Dnes", „Včera", jinak „13. října 2026". */
const dayLabel = (iso) => {
    if (iso === daysAgo(0)) return "Dnes";
    if (iso === daysAgo(1)) return "Včera";
    return LONG.format(dayFromIso(iso));
};

const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

/* ------------------------------------------------------- paměť zavření -- */

// Zavřená bublina se pamatuje spolu s datem nejnovější novinky v tu chvíli.
// Jakmile přibude novější, bublina se ukáže znovu — zavřel ji kvůli tomu, co
// už viděl, ne navždy. Úložiště se může nepovést (anonymní okno, blokované
// cookies); pak se bublina jen ukáže při každém načtení, nic se nerozbije.
const readDismissed = () => {
    try {
        return window.localStorage.getItem(STORAGE_KEY) || "";
    } catch {
        return "";
    }
};
const writeDismissed = (value) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
        /* bez paměti to jde taky */
    }
};

/* ------------------------------------------------------------ widget -- */

export default function NewsWidget() {
    const { gate } = useGlobalContext();
    const calm = useReducedMotion() ?? false;
    const [data, setData] = useState(null);
    const [ready, setReady] = useState(false);
    const [open, setOpen] = useState(false);
    const [tucked, setTucked] = useState(false);
    const [bubble, setBubble] = useState(false);
    const launcherRef = useRef(null);

    // Ve Studiu (rám náhledu) widget nepatří přes upravovanou stránku.
    const editing = isEditMode();

    useEffect(() => {
        if (editing) return undefined;
        let alive = true;
        fetch("/api/news")
            .then((response) => (response.ok ? response.json() : null))
            .then((json) => {
                if (alive && json) setData(json);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [editing]);

    const items = data?.items || [];
    const widget = data?.widget;
    const newest = items[0]?.date || "";
    const monthCount = useMemo(() => {
        const since = daysAgo(MONTH_DAYS);
        return items.filter((item) => item.date >= since).length;
    }, [items]);

    // Nástup až po oponě a s chvilkou odstupu, ať se nepere s hero sekcí.
    useEffect(() => {
        if (!data || gate !== "go") return undefined;
        const dismissedAt = readDismissed();
        const seen = Boolean(dismissedAt) && dismissedAt >= newest;
        const timer = window.setTimeout(() => {
            setReady(true);
            setTucked(seen);
            setBubble(!seen);
        }, calm ? 400 : 1600);
        return () => window.clearTimeout(timer);
    }, [data, gate, newest, calm]);

    const closeBubble = useCallback(() => {
        setBubble(false);
        setTucked(true);
        writeDismissed(newest || isoDay(new Date()));
    }, [newest]);

    const openPanel = useCallback(() => {
        setBubble(false);
        setOpen(true);
    }, []);

    const closePanel = useCallback(() => {
        setOpen(false);
        // Kdo okno otevřel, výzvu viděl a nepotřebuje ji znovu.
        setTucked(true);
        writeDismissed(newest || isoDay(new Date()));
        window.requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
    }, [newest]);

    if (editing || !widget?.enabled || !items.length) return null;

    const side = widget.position.endsWith("left") ? "left" : "right";
    const countLabel = monthCount ? `+${monthCount}` : null;

    return (
        <div className={`NewsWidget is-${widget.position} is-${side}${tucked && !open ? " is-tucked" : ""}${ready ? " is-ready" : ""}`}>
            <AnimatePresence>
                {ready && !open && (
                    <motion.div
                        key="dock"
                        className="NewsWidget__dock"
                        initial={{ opacity: 0, x: calm ? 0 : side === "right" ? 24 : -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ duration: calm ? 0.4 : 0.7, ease: GLIDE }}
                    >
                        {/* Zasunutí k okraji je CSS transformace na vnitřním
                            obalu: na `dock` by ji přepsal inline `transform`,
                            kterým framer-motion animuje nástup. */}
                        <div className="NewsWidget__slide">
                        <AnimatePresence>
                            {bubble && (
                                <motion.div
                                    key="bubble"
                                    className="NewsWidget__bubble"
                                    initial={{ opacity: 0, y: calm ? 0 : 8, scale: calm ? 1 : 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: calm ? 1 : 0.96, transition: { duration: 0.25 } }}
                                    transition={{ duration: calm ? 0.4 : 0.6, ease: GLIDE, delay: calm ? 0 : 0.35 }}
                                >
                                    <button type="button" className="NewsWidget__bubble__text" onClick={openPanel} data-cursor="frame">
                                        {widget.bubble}
                                    </button>
                                    <button
                                        type="button"
                                        className="NewsWidget__bubble__close"
                                        onClick={closeBubble}
                                        aria-label="Skrýt výzvu"
                                        data-cursor="frame"
                                    >
                                        <RiCloseLine size={14} aria-hidden="true" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            ref={launcherRef}
                            type="button"
                            className="NewsWidget__launcher"
                            onClick={openPanel}
                            aria-haspopup="dialog"
                            aria-label={`${widget.heading}${monthCount ? `, ${monthCount} ${plural(monthCount, "novinka", "novinky", "novinek")} za poslední měsíc` : ""}`}
                            data-cursor="frame"
                        >
                            <RiNewspaperLine size={22} aria-hidden="true" />
                            {countLabel && <span className="NewsWidget__count" aria-hidden="true">{countLabel}</span>}
                        </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && (
                    <NewsPanel
                        key="panel"
                        widget={widget}
                        items={items}
                        monthCount={monthCount}
                        side={side}
                        calm={calm}
                        onClose={closePanel}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

/* ------------------------------------------------------------- okno -- */

function NewsPanel({ widget, items, monthCount, side, calm, onClose }) {
    const [range, setRange] = useState("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const scrollRef = useRef(null);
    const closeRef = useRef(null);
    const panelRef = useRef(null);

    // Filtr podle data je jen tady, v prohlížeči: novinek je pár desítek a
    // server je vrací všechny najednou.
    const shown = useMemo(() => {
        let lower = "";
        let upper = "";
        if (range === "custom") {
            lower = from;
            upper = to;
        } else if (range !== "all") {
            lower = daysAgo(Number(range));
        }
        return items
            .filter((item) => (!lower || item.date >= lower) && (!upper || item.date <= upper))
            .slice()
            // Jako v chatu: nejstarší nahoře, nejnovější u spodního okraje.
            .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }, [items, range, from, to]);

    // Po otevření a po každé změně filtru dolů, k nejnovější zprávě.
    useEffect(() => {
        const box = scrollRef.current;
        if (!box) return undefined;
        const frame = window.requestAnimationFrame(() => {
            box.scrollTop = box.scrollHeight;
        });
        return () => window.cancelAnimationFrame(frame);
    }, [shown]);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
        const onKey = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    // Den jako oddělovač, jako v chatu.
    const groups = useMemo(() => {
        const out = [];
        for (const item of shown) {
            const last = out[out.length - 1];
            if (last && last.date === item.date) last.items.push(item);
            else out.push({ date: item.date, items: [item] });
        }
        return out;
    }, [shown]);

    const latest = items[0]?.date;

    return (
        <motion.div
            ref={panelRef}
            className="NewsPanel"
            role="dialog"
            aria-modal="false"
            aria-label={widget.heading}
            style={{ transformOrigin: side === "right" ? "100% 100%" : "0% 100%" }}
            initial={{ opacity: 0, y: calm ? 0 : 24, scale: calm ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: calm ? 0 : 16, scale: calm ? 1 : 0.98, transition: { duration: 0.25, ease: GLIDE } }}
            transition={{ duration: calm ? 0.4 : 0.55, ease: GLIDE }}
        >
            <header className="NewsPanel__head">
                <span className="NewsPanel__avatar" aria-hidden="true">PG</span>
                <div className="NewsPanel__who">
                    <h2 className="NewsPanel__title">{widget.heading}</h2>
                    <p className="NewsPanel__status">
                        <span className="NewsPanel__dot" aria-hidden="true" />
                        {monthCount
                            ? `${monthCount} ${plural(monthCount, "novinka", "novinky", "novinek")} za poslední měsíc`
                            : `Naposledy ${latest ? SHORT.format(dayFromIso(latest)) : ""}`}
                    </p>
                </div>
                <button ref={closeRef} type="button" className="NewsPanel__close" onClick={onClose} aria-label="Zavřít novinky" data-cursor="frame">
                    <RiCloseLine size={18} aria-hidden="true" />
                </button>
            </header>

            <div className="NewsPanel__filter" role="group" aria-label="Období">
                <div className="NewsPanel__chips">
                    {RANGES.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`NewsPanel__chip${range === option.id ? " is-on" : ""}`}
                            aria-pressed={range === option.id}
                            onClick={() => setRange(option.id)}
                            data-cursor="frame"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <AnimatePresence initial={false}>
                    {range === "custom" && (
                        <motion.div
                            key="custom"
                            className="NewsPanel__range"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: calm ? 0.3 : 0.4, ease: GLIDE }}
                        >
                            <label className="NewsPanel__date">
                                <span>Od</span>
                                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                            </label>
                            <label className="NewsPanel__date">
                                <span>Do</span>
                                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                            </label>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div ref={scrollRef} className="NewsPanel__scroll" data-lenis-prevent>
                {widget.intro ? (
                    <div className="NewsPanel__msg is-intro">
                        <p className="NewsPanel__text">{widget.intro}</p>
                    </div>
                ) : null}

                {groups.length ? (
                    groups.map((group) => (
                        <section key={group.date} className="NewsPanel__day" aria-label={dayLabel(group.date)}>
                            <span className="NewsPanel__sep">{dayLabel(group.date)}</span>
                            {group.items.map((item, index) => (
                                <motion.article
                                    key={item.id}
                                    className="NewsPanel__msg"
                                    initial={{ opacity: 0, y: calm ? 0 : 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: calm ? 0.3 : 0.45, ease: GLIDE, delay: calm ? 0 : Math.min(index, 4) * 0.04 }}
                                >
                                    <h3 className="NewsPanel__msg__title">{item.title}</h3>
                                    {item.summary ? <p className="NewsPanel__msg__summary">{item.summary}</p> : null}
                                    {item.message ? <p className="NewsPanel__text">{item.message}</p> : null}
                                    <div className="NewsPanel__msg__foot">
                                        {item.link ? (
                                            <a
                                                className="NewsPanel__link"
                                                href={item.link.href}
                                                {...(item.link.href.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                                                data-cursor="frame"
                                            >
                                                {item.link.label}
                                                <RiArrowRightUpLine size={14} aria-hidden="true" />
                                            </a>
                                        ) : <span />}
                                        <time className="NewsPanel__time" dateTime={item.date}>
                                            {SHORT.format(dayFromIso(item.date))}
                                        </time>
                                    </div>
                                </motion.article>
                            ))}
                        </section>
                    ))
                ) : (
                    <p className="NewsPanel__empty">V tomto období žádné novinky. Zkuste delší rozsah.</p>
                )}
            </div>

            <footer className="NewsPanel__foot">
                <span>
                    {range === "all"
                        ? `${items.length} ${plural(items.length, "novinka", "novinky", "novinek")}`
                        : `${shown.length} z ${items.length} ${plural(items.length, "novinky", "novinek", "novinek")}`}
                </span>
                <span>Procházka Group</span>
            </footer>
        </motion.div>
    );
}
