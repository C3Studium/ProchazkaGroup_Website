"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

import { useDialPrefixes } from "@/context/DialPrefixProvider";

// Předvolba před telefonním číslem, jako vlastní rozbalovací seznam.
//
// Drží si třídu `prefix` po prvku, který nahradil, a to je celá integrační
// strategie: tři formuláře si `.telRow .prefix` stylují samy — kontaktní arch
// 0,9rem v 55% bílé, poradenský formulář na úvodní stránce a QnA formulář každý
// po svém — a dědění po nich je to, co dovolí jednomu komponentu stát ve všech
// třech, aniž by se kterýkoli z nich překresloval.
//
// PROČ NE NATIVNÍ SELECT. Byl, a fungoval. Co na něm nešlo: rozbalený seznam
// kreslí operační systém a nejde mu říct nic — ani písmo, ani barvu, ani šířku.
// Na tmavém webu to byl bílý systémový obdélník, na telefonu kolo přes půl
// obrazovky. Zavřený ovladač se stylovat dal, otevřený ne, a rozbalený seznam je
// přesně to, co si tu člověk prohlíží.
//
// CO UKAZUJE ZAVŘENÝ. Jen předvolbu, nic víc.
//
// Název země v zavřeném ovladači byl první pokus a byl špatně: „+420 Česko" je
// skoro polovina řádku, na kterém má stát telefonní číslo. Země je v rozbaleném
// seznamu, kde si ji člověk vybírá, a v `aria-label`, kde si ji přečte odečítač
// obrazovky. Na řádku zůstane číslo.
//
// ODKUD SEZNAM. Z @/context/DialPrefixProvider, který ho bere z propů stránky —
// tedy ze Studia, blok `global.dial-prefixes`. Země se přidávají a přerovnávají
// tam, ne tady. Když databáze neodpoví, provider vrátí seznam ze
// @/constants/dialPrefixes a formuláře fungují dál.
export default function DialPrefix({
    value,
    onChange,
    name = "dial",
    // Svislice, kterou dva z těch formulářů kreslí za předvolbou. Patří k
    // linkování toho pole, ne k tomuhle ovladači, takže se předává a nepředpokládá
    // — QnA formulář ji nemá.
    separator = false,
    size = 16,
    ...rest
}) {
    const prefixes = useDialPrefixes();
    const [open, setOpen] = useState(false);
    // Kterým směrem se seznam otevře — viz efekt níž.
    const [dropUp, setDropUp] = useState(false);
    const [inner, setInner] = useState(prefixes[0]?.code || "");
    const listId = useId();

    const rootRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);

    // Řízený tam, kde si formulář drží hodnoty, neřízený tam, kde ne — QnA
    // formulář čte pole při odeslání z DOMu a nemá kam tohle uložit.
    const controlled = value !== undefined;
    const current = controlled ? value : inner;

    const selectedIndex = useMemo(() => {
        const at = prefixes.findIndex((entry) => entry.code === current);
        return at >= 0 ? at : 0;
    }, [prefixes, current]);

    // Uložená hodnota, která v seznamu není, se srovná na první položku.
    //
    // Tři formuláře si výchozí předvolbu nastavují z @/constants/dialPrefixes,
    // jeden z nich v konstantě mimo komponentu, kde se na hook nedosáhne. Když
    // se seznam ve Studiu přerovná nebo se z něj Česko vyhodí, ukazoval by
    // ovladač první položku seznamu, ale formulář by odeslal tu starou. Tohle je
    // ta jedna věta, která to drží spolu — a je tady, ne ve třech formulářích,
    // protože je to vlastnost seznamu, ne kteréhokoli z nich.
    useEffect(() => {
        if (!prefixes.length) return;
        if (prefixes.some((entry) => entry.code === current)) return;
        const first = prefixes[0].code;
        if (!controlled) setInner(first);
        onChange?.({ target: { name, value: first } });
        // `current` schválně mimo závislosti: efekt ho opravuje, a kdyby na něm
        // visel, opravoval by sám sebe.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefixes]);

    // Na čem stojí zvýraznění v rozbaleném seznamu. Odděleně od vybrané
    // hodnoty: šipkami se po seznamu chodí, aniž by se cokoli měnilo, dokud se
    // nepotvrdí — jinak by projetí seznamu přepsalo pole pokaždé.
    const [active, setActive] = useState(selectedIndex);

    const commit = useCallback(
        (index) => {
            const entry = prefixes[index];
            if (!entry) return;
            if (!controlled) setInner(entry.code);
            // Tvar, na který jsou ty formuláře zvyklé z <select>: sahají na
            // `event.target.value`, takže se jim předá objekt, který ho má.
            onChange?.({ target: { name, value: entry.code } });
            setOpen(false);
            buttonRef.current?.focus();
        },
        [prefixes, controlled, onChange, name],
    );

    // Zavřít kliknutím vedle a únikovou klávesou. `pointerdown`, ne `click`:
    // arch pod tím má vlastní posluchače a klik, který seznam zavírá, nemá
    // zároveň něco pod ním spustit.
    useEffect(() => {
        if (!open) return;

        const onAway = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                setOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", onAway, true);
        document.addEventListener("keydown", onKey, true);
        return () => {
            document.removeEventListener("pointerdown", onAway, true);
            document.removeEventListener("keydown", onKey, true);
        };
    }, [open]);

    // Otevřený seznam začíná na tom, co je vybrané, a rovnou to ukáže — deset
    // zemí se nemusí vejít do výšky, kterou seznam má.
    useEffect(() => {
        if (!open) return;
        setActive(selectedIndex);
        const list = listRef.current;
        list?.children?.[selectedIndex]?.scrollIntoView({ block: "nearest" });
        // Klávesnice musí po otevření skončit na seznamu, jinak by šipky patřily
        // pořád tlačítku pod ním a seznam by se jimi nedal projít.
        list?.focus({ preventScroll: true });
    }, [open, selectedIndex]);

    // Nahoru, když dole není místo.
    //
    // Telefonní pole stojí ve všech třech formulářích dole — v kontaktním archu
    // pod jménem a e-mailem, na úvodní stránce pod výběrem poradce. Naměřeno na
    // svislém tabletu 203px a na telefonu 194px seznamu pod spodní hranou
    // obrazovky, tedy osm zemí ze třinácti mimo obraz a nic, co by na ně
    // doscrollovalo: seznam scrolluje uvnitř sebe, ne stránku.
    //
    // Měří se po otevření a proti skutečné výšce seznamu, ne proti odhadu —
    // strop výšky je jiný na každém breakpointu a jiný, když seznam ve Studiu
    // povyroste o další zemi.
    useEffect(() => {
        if (!open) return;
        const list = listRef.current;
        const button = buttonRef.current;
        if (!list || !button) return;

        const decide = () => {
            const box = button.getBoundingClientRect();
            const needs = list.offsetHeight;
            const below = window.innerHeight - box.bottom;
            const above = box.top;
            // Nahoru jen když se dole opravdu nevejde A nahoře je líp. Seznam,
            // který se nevejde ani jinam, zůstane dole, kde ho člověk čeká.
            setDropUp(below < needs + 12 && above > below);
        };

        decide();
        window.addEventListener("resize", decide);
        return () => window.removeEventListener("resize", decide);
    }, [open, prefixes.length]);

    const onButtonKey = (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
        }
    };

    const onListKey = (event) => {
        const last = prefixes.length - 1;
        if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(last, i + 1)); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
        else if (event.key === "Home") { event.preventDefault(); setActive(0); }
        else if (event.key === "End") { event.preventDefault(); setActive(last); }
        else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); commit(active); }
        else if (event.key === "Tab") setOpen(false);
    };

    useEffect(() => {
        if (!open) return;
        listRef.current?.children?.[active]?.scrollIntoView({ block: "nearest" });
    }, [open, active]);

    const selected = prefixes[selectedIndex];

    return (
        <span
            className={`prefix DialPrefix${open ? " is-open" : ""}${dropUp ? " is-up" : ""}`}
            ref={rootRef}
        >
            {/* Hodnota pro formuláře, které odesílají DOM a ne stav. */}
            <input type="hidden" name={name} value={current} readOnly />

            <button
                ref={buttonRef}
                type="button"
                className="DialPrefix__button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                // Zavřený ovladač ukazuje jen číslo, takže samotné „+421" je
                // všechno, co by odečítač přečetl. Tohle je ta chybějící půlka.
                aria-label={`Předvolba země: ${selected?.label || selected?.code || ""}`}
                data-cursor="frame"
                onClick={() => setOpen((was) => !was)}
                onKeyDown={onButtonKey}
                {...rest}
            >
                <span className="DialPrefix__code">{selected?.code}</span>
                <RiArrowDownSLine className="DialPrefix__chevron" size={size} aria-hidden="true" />
            </button>

            {open ? (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    tabIndex={-1}
                    className="DialPrefix__list"
                    aria-activedescendant={`${listId}-${active}`}
                    // Arch pod tím scrolluje sám a Lenis polyká kolečko i tah
                    // prstem — bez tohohle by se delší seznam nedal projet.
                    data-lenis-prevent
                    onKeyDown={onListKey}
                >
                    {prefixes.map((entry, index) => (
                        <li
                            key={entry.iso || entry.code || index}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === selectedIndex}
                            className={`DialPrefix__option${index === active ? " is-active" : ""}`}
                            data-cursor="frame"
                            onPointerEnter={() => setActive(index)}
                            onClick={() => commit(index)}
                        >
                            <span className="DialPrefix__option__code">{entry.code}</span>
                            <span className="DialPrefix__option__name">{entry.label}</span>
                        </li>
                    ))}
                </ul>
            ) : null}

            {separator ? <span className="DialPrefix__rule">|</span> : null}
        </span>
    );
}
