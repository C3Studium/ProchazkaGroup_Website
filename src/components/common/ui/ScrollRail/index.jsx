"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";

// Kde na stránce jsem, jako pravítko po pravé straně.
//
// Je to nástroj z benefit programu (BenefitRide) postavený na výšku: hairline,
// akcentová výplň podle postupu a řada čárek, které se vlní kolem toho místa,
// kde zrovna jsme. Tam měří třicet doporučení, tady celou stránku.
//
// TŘI VĚCI, KTERÉ UMÍ A ORIGINÁL NE.
//
// Vlna jde i za kurzorem, nejen za scrollem. Když na lištu najedeš, přesune se
// na prst a jde za ním; jakmile odjedeš, vrátí se tam, kde doopravdy jsi. Je to
// ta samá vlna, jen jí velí něco jiného — proto je `focus` jedna hodnota a ne
// dvě, které by se přebíjely.
//
// Klik kamkoli odscrolluje na to místo, a dělá to Lenis, ne prohlížeč: web má
// vlastní hladký scroll a `window.scrollTo` by proti němu přetahoval.
//
// A je to `pointerdown` plus tažení, takže se dá po liště jet jako po posuvníku.
//
// KDE SE NEKRESLÍ. Na dotyku. Vlna za kurzorem tam nemá co sledovat, klik na
// pár pixelů širokou lištu je na prst zbytečně jemný cíl a na telefonu by ta
// lišta jen ukrajovala z šířky, které je málo. Rozhoduje se to jednou, v efektu
// — server o žádném ukazovátku neví, takže první klientský render musí říct to
// samé co on: nic.

// Třicet čtyři čárek. Originál jich má třicet, ale ten měří třicet doporučení
// a každá čárka JE jedno; tady nepočítají nic a je to jen hustota rastru, takže
// je jich tolik, aby na běžně vysoké liště vyšly řádově po deseti pixelech.
const TICKS = 34;
const AT = Array.from({ length: TICKS }, (_, i) => (i + 0.5) / TICKS);

// Šířka zvonu kolem ohniska, ve zlomcích celé lišty. Stejná jako u originálu:
// vlna má být znát jako vlna, ne jako jedna svítící čárka.
const REACH = 0.085;

// Scroll jede na pružině, ne napřímo. Stejné hodnoty jako `glided` v BenefitRide
// — lišta a ta sekce mají pod prstem působit stejně.
const GLIDE = { stiffness: 90, damping: 24, restDelta: 0.0004 };

/**
 * Jedna čárka pravítka.
 *
 * Roste doleva z lišty podle toho, jak blízko je ohnisku — zvon, ne skok.
 * Čte `focus` přes `useTransform`, takže se při scrollu ani pohybu myši
 * nepřekresluje: hodnota jde rovnou do stylu a React se o tom nedozví.
 */
function Tick({ focus, at }) {
    const bell = useTransform(focus, (p) => {
        const d = Math.abs(p - at) / REACH;
        return Math.max(0, 1 - d * d);
    });
    const stretch = useTransform(bell, (b) => 0.22 + b * 0.78);
    const glow = useTransform(bell, (b) => 0.2 + b * 0.65);

    return (
        <motion.span
            className="ScrollRail__tick"
            style={{ top: `${(at * 100).toFixed(2)}%`, scaleX: stretch, opacity: glow }}
        />
    );
}

export default function ScrollRail() {
    const railRef = useRef(null);
    const dragging = useRef(false);
    const hovering = useRef(false);

    // Ukazovátko, a zvlášť klidový režim. Obojí se čte až v efektu, aby se
    // první klientský render shodl se serverem.
    const [pointer, setPointer] = useState(false);
    const [calm, setCalm] = useState(false);

    useEffect(() => {
        const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
        const still = window.matchMedia("(prefers-reduced-motion: reduce)");
        const read = () => { setPointer(fine.matches); setCalm(still.matches); };
        read();
        fine.addEventListener("change", read);
        still.addEventListener("change", read);
        return () => {
            fine.removeEventListener("change", read);
            still.removeEventListener("change", read);
        };
    }, []);

    const { scrollYProgress } = useScroll();
    const glided = useSpring(scrollYProgress, GLIDE);
    // V klidovém režimu jde postup napřímo: scroll ho pořád řídí, jen nedojíždí.
    const ride = calm ? scrollYProgress : glided;

    // Ohnisko vlny. Jedna hodnota, dva velitelé — scroll, dokud na liště nikdo
    // není, a prst, jakmile na ní je.
    const focus = useMotionValue(0);
    useMotionValueEvent(ride, "change", (v) => {
        if (!hovering.current && !dragging.current) focus.set(v);
    });
    useEffect(() => { focus.set(ride.get()); }, [focus, ride]);

    /** Kde na liště leží daný bod okna, jako zlomek 0–1. */
    const fractionAt = useCallback((clientY) => {
        const box = railRef.current?.getBoundingClientRect();
        if (!box || !box.height) return null;
        return Math.min(1, Math.max(0, (clientY - box.top) / box.height));
    }, []);

    const goTo = useCallback((fraction) => {
        const reach = document.documentElement.scrollHeight - window.innerHeight;
        if (reach <= 0) return;
        const target = fraction * reach;
        // Lenis, ne window.scrollTo: stránka má vlastní hladký scroll a nativní
        // skok by se s ním přetahoval o stejnou hodnotu.
        if (window.lenis) window.lenis.scrollTo(target, { duration: calm ? 0 : 1.1 });
        else window.scrollTo({ top: target, behavior: calm ? "auto" : "smooth" });
    }, [calm]);

    const onMove = useCallback((event) => {
        const f = fractionAt(event.clientY);
        if (f === null) return;
        focus.set(f);
        if (dragging.current) goTo(f);
    }, [fractionAt, focus, goTo]);

    const onDown = useCallback((event) => {
        const f = fractionAt(event.clientY);
        if (f === null) return;
        dragging.current = true;
        railRef.current?.setPointerCapture?.(event.pointerId);
        focus.set(f);
        goTo(f);
    }, [fractionAt, focus, goTo]);

    const onUp = useCallback((event) => {
        dragging.current = false;
        railRef.current?.releasePointerCapture?.(event.pointerId);
    }, []);

    const onLeave = useCallback(() => {
        hovering.current = false;
        if (!dragging.current) focus.set(ride.get());
    }, [focus, ride]);

    if (!pointer) return null;

    return (
        <div
            ref={railRef}
            className="ScrollRail"
            // Není to ovládání pro odečítač obrazovky: je to obraz toho, kde na
            // stránce jsme, a skočit jinam jde klávesnicí i bez něj. Nabízet ho
            // jako druhý posuvník by znamenalo cíl navíc, který nikam nevede.
            aria-hidden="true"
            onPointerEnter={() => { hovering.current = true; }}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerCancel={onUp}
        >
            <span className="ScrollRail__line" />

            {/* Kudy už jsme prošli. Vždycky podle scrollu, nikdy podle kurzoru —
                je to údaj, ne odpověď na to, kam se zrovna dívá myš. */}
            <motion.span className="ScrollRail__fill" style={{ scaleY: ride }} />

            {AT.map((at) => (
                <Tick key={at} focus={focus} at={at} />
            ))}
        </div>
    );
}
