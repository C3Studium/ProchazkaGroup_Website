"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

// Rozbalovací seznam webu. Jeden, pro všechna místa, kde se z něčeho vybírá.
//
// Vzniklo to jako předvolba telefonu a ukázalo se, že to samé chtějí i tři
// výběry poradce — na úvodní stránce, v benefit programu a ve formuláři recenze.
// Ty tři byly nativní <select>, a proto vypadaly jinak než zbytek webu: rozbalený
// seznam kreslí operační systém a nejde mu říct vůbec nic. Na tmavé stránce to
// byl bílý systémový obdélník.
//
// CO SE TÍM ZTRÁCÍ, a stojí za to to vědět. Nativní select dává zadarmo věci,
// které jsou tady dopsané ručně: role pro odečítač obrazovky, klávesnici,
// a na telefonu systémové kolo. To poslední je jediná skutečná ztráta — na
// dotyku je platformní kolo lepší než jakýkoli vlastní seznam. Zbytek je níž:
// role listbox/option, aria-activedescendant, šipky, Home/End, Enter, Escape,
// zavření klikem vedle a otevření nahoru, když dole není místo.
//
// CO SI KAŽDÉ MÍSTO ŘÍDÍ SAMO. Zavřený ovladač dědí typ, barvu i velikost po
// formuláři, ve kterém stojí — přes třídu, kterou dostane v `className`. Tenhle
// soubor kreslí jen rozbalený seznam, protože ten je všude stejný a nikde
// k dědění není co.
export default function Dropdown({
    // { value, label, hint?, disabled? } — `label` je to, co se ukáže zavřené,
    // `hint` volitelný druhý sloupec v seznamu (předvolba používá kód a název
    // země).
    options = [],
    value,
    // Na čem to otevírá, když si hodnotu nedrží volající.
    defaultValue,
    onChange,
    name,
    placeholder = "",
    className = "",
    // Co přečte odečítač obrazovky místo samotné hodnoty. Zavřený ovladač
    // ukazuje jen vybranou položku a ta sama o sobě nemusí říct, čeho se týká.
    label,
    size = 16,
    // Šířka číselného sloupce v seznamu; jen tam, kde položky mají `hint`.
    align = false,
    children,
    ...rest
}) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const [inner, setInner] = useState(defaultValue ?? options[0]?.value);
    const listId = useId();

    const rootRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);

    const controlled = value !== undefined;
    const current = controlled ? value : inner;

    const selectedIndex = useMemo(() => {
        const at = options.findIndex((entry) => String(entry.value) === String(current));
        return at >= 0 ? at : -1;
    }, [options, current]);

    const [active, setActive] = useState(Math.max(0, selectedIndex));

    const commit = useCallback(
        (index) => {
            const entry = options[index];
            if (!entry || entry.disabled) return;
            if (!controlled) setInner(entry.value);
            // Tvar, na který jsou formuláře zvyklé z <select>: sahají na
            // `event.target.value`, takže dostanou objekt, který ho má.
            onChange?.({ target: { name, value: entry.value } });
            setOpen(false);
            buttonRef.current?.focus();
        },
        [options, controlled, onChange, name],
    );

    // Zavřít klikem vedle a únikovou klávesou. `pointerdown`, ne `click`:
    // pod tím bývá arch s vlastními posluchači a klik, který seznam zavírá, nemá
    // zároveň spustit něco pod ním.
    useEffect(() => {
        if (!open) return undefined;

        const onAway = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            setOpen(false);
            buttonRef.current?.focus();
        };

        document.addEventListener("pointerdown", onAway, true);
        document.addEventListener("keydown", onKey, true);
        return () => {
            document.removeEventListener("pointerdown", onAway, true);
            document.removeEventListener("keydown", onKey, true);
        };
    }, [open]);

    // Otevřený seznam začíná na tom, co je vybrané, a rovnou to ukáže.
    useEffect(() => {
        if (!open) return;
        const at = Math.max(0, selectedIndex);
        setActive(at);
        const list = listRef.current;
        list?.children?.[at]?.scrollIntoView({ block: "nearest" });
        // Klávesnice musí po otevření skončit na seznamu, jinak by šipky patřily
        // pořád tlačítku pod ním.
        list?.focus({ preventScroll: true });
    }, [open, selectedIndex]);

    // Nahoru, když dole není místo. Měří se proti skutečné výšce seznamu, ne
    // proti odhadu: strop je jiný na každém breakpointu a jiný, když položek
    // přibude.
    useEffect(() => {
        if (!open) return undefined;
        const list = listRef.current;
        const button = buttonRef.current;
        if (!list || !button) return undefined;

        const decide = () => {
            const box = button.getBoundingClientRect();
            const needs = list.offsetHeight;
            const below = window.innerHeight - box.bottom;
            // Nahoru jen když se dole opravdu nevejde A nahoře je líp.
            setDropUp(below < needs + 12 && box.top > below);
        };

        decide();
        window.addEventListener("resize", decide);
        return () => window.removeEventListener("resize", decide);
    }, [open, options.length]);

    useEffect(() => {
        if (!open) return;
        listRef.current?.children?.[active]?.scrollIntoView({ block: "nearest" });
    }, [open, active]);

    const step = useCallback(
        (from, dir) => {
            const n = options.length;
            for (let i = 1; i <= n; i++) {
                const at = from + dir * i;
                if (at < 0 || at >= n) break;
                if (!options[at]?.disabled) return at;
            }
            return from;
        },
        [options],
    );

    const onButtonKey = (event) => {
        if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return;
        event.preventDefault();
        setOpen(true);
    };

    const onListKey = (event) => {
        const last = options.length - 1;
        if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => step(i, 1)); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => step(i, -1)); }
        else if (event.key === "Home") { event.preventDefault(); setActive(step(-1, 1)); }
        else if (event.key === "End") { event.preventDefault(); setActive(step(last + 1, -1)); }
        else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); commit(active); }
        else if (event.key === "Tab") setOpen(false);
    };

    const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

    return (
        <span
            className={`Dropdown${open ? " is-open" : ""}${dropUp ? " is-up" : ""}${className ? ` ${className}` : ""}`}
            ref={rootRef}
        >
            {/* Hodnota pro formuláře, které odesílají DOM a ne stav. */}
            {name ? <input type="hidden" name={name} value={current ?? ""} readOnly /> : null}

            <button
                ref={buttonRef}
                type="button"
                className="Dropdown__button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-label={label}
                data-cursor="frame"
                onClick={() => setOpen((was) => !was)}
                onKeyDown={onButtonKey}
                {...rest}
            >
                <span className={`Dropdown__value${selected ? "" : " is-empty"}`}>
                    {selected ? selected.label : placeholder}
                </span>
                <RiArrowDownSLine className="Dropdown__chevron" size={size} aria-hidden="true" />
            </button>

            {open ? (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    tabIndex={-1}
                    className={`Dropdown__list${align ? " is-aligned" : ""}`}
                    aria-activedescendant={`${listId}-${active}`}
                    // Arch i stránka pod tím scrollují a Lenis polyká kolečko
                    // i tah prstem — bez tohohle by se delší seznam nedal projet.
                    data-lenis-prevent
                    onKeyDown={onListKey}
                >
                    {options.map((entry, index) => (
                        <li
                            key={`${entry.value}-${index}`}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === selectedIndex}
                            aria-disabled={entry.disabled || undefined}
                            className={`Dropdown__option${index === active ? " is-active" : ""}${entry.disabled ? " is-disabled" : ""}`}
                            data-cursor="frame"
                            onPointerEnter={() => { if (!entry.disabled) setActive(index); }}
                            onClick={() => commit(index)}
                        >
                            <span className="Dropdown__option__label">{entry.label}</span>
                            {entry.hint ? <span className="Dropdown__option__hint">{entry.hint}</span> : null}
                        </li>
                    ))}
                </ul>
            ) : null}

            {children}
        </span>
    );
}
