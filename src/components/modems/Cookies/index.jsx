import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import CornerButton from "@/components/common/ui/CornerButton";
import Grid from "@/components/common/grid";
import { useCookies } from "@/context/CookiesProvider";
import { editable, editableIn, editableList, surfaceRoot } from "@/cms/edit";

/**
 * Co modál říká, když CMS mlčí.
 *
 * Tytéž věty, jaké tu stály natvrdo — nejsou to náhražky, je to poslední síť.
 * Prázdný blok v CMS by jinak znamenal modál bez popisků, a souhlas s cookies
 * bez vysvětlení není souhlas.
 */
const FALLBACK = {
    eyebrow: "Správa předvoleb",
    title: "Nastavení cookies",
    close: "Zavřít nastavení cookies",
    lead:
        "Zde můžete upravit své preference ohledně cookies. " +
        "Nezbytné cookies jsou vždy povoleny pro správné fungování webu.",
    always: "vždy zapnuto",
    providers: "Poskytovatelé",
    cookies: "Cookies",
    save: "Uložit",
};

/**
 * Popisky kategorií z CMS, napasované na kategorie z kódu POŘADÍM.
 *
 * Kategorie má technický klíč (`necessary`, `analytics`, …) a podle něj se
 * ukládá souhlas — ten se tedy překládat nesmí a v CMS vůbec není. Do bloku
 * jde jen název a popis, a spojkou je pozice v seznamu.
 *
 * Z toho plyne jediné pravidlo, které se dá porušit: **pořadí položek v CMS
 * musí odpovídat pořadí kategorií v CookiesProvider.** Přehodit je znamená
 * dát analytickým cookies popis marketingových. Kdo by to chtěl přeuspořádat,
 * musí přehodit obojí.
 */
const labelAt = (items, index, key, zaloha) => {
    const item = Array.isArray(items) ? items[index] : null
    const value = key === "label" ? item?.label : item?.value
    return (typeof value === "string" && value.trim()) || zaloha
}

/**
 * Záloha se přebíjí jen tím, co něco říká.
 *
 * `{ ...FALLBACK, ...copy }` tu bývalo a bylo to o jeden krok krátké: prázdný
 * řetězec z CMS je taky hodnota, takže vymazané pole ve Studiu nespadlo na
 * zálohu, ale vyrobilo v modálu prázdné místo. U souhlasu s cookies je to
 * horší než jinde — kategorie bez popisu není informovaný souhlas.
 */
const withFallback = (zaloha, copy) => {
    const out = { ...zaloha }
    for (const [key, value] of Object.entries(copy || {})) {
        if (typeof value === "string" ? value.trim() : value) out[key] = value
    }
    return out
}

// The cookie-preferences sheet, opened from /cookies (and, when it is mounted,
// from the consent bar). Its job is unchanged — it reads COOKIE_CATEGORIES,
// keeps a local copy of the visitor's answers and writes them through
// savePreferences — and every line of that logic below is the logic it always
// had. What changed is the shape it is poured into.
//
// The old markup let the decorative <Grid> sit as a SIBLING of the content
// inside a flex row, so the shader ate 40–60% of the width at every size and
// the copy was squeezed into whatever was left (on a 390px phone: a 221px
// column, with the save button pushed 125px below the fold and unreachable).
// The grid is now background — absolutely positioned, pointer-events: none —
// and the sheet owns the whole width.
//
// The overlay conventions this site learned the hard way, all present here:
//   · the SCROLLER is an inner element (.CookiesModem__scroll), never the
//     sheet itself, so the header and the two controls stay put;
//   · the close is pinned to the SHEET, not to the scrolling content, so on a
//     390px-tall landscape phone the way out cannot scroll away;
//   · overscroll-behavior: contain, so a flick at the end of the list does not
//     drag the page behind it;
//   · Escape closes, and a tap on the backdrop beside the sheet closes;
//   · lenis is stopped while the sheet is up, and restarted on the way out.

const modemAnim = {
    open: {
        x: "0",
        opacity: 1,
        transition: {
            duration: 0.6,
            ease: [0.76, 0, 0.24, 1]
        },
    },
    closed: {
        x: "100%",
        opacity: 0,
        transition: {
            duration: 0.6,
            ease: [0.76, 0, 0.24, 1]
        },
    }
}

export default function CookiesModem({ setSettings, settings, open, copy = null, studioRoot = null }) {
    const { COOKIE_CATEGORIES, preferences, savePreferences } = useCookies();
    // `copy` je blok `global.cookies`; `doc` je jeho dokument, aby šlo klikat.
    const t = withFallback(FALLBACK, copy)
    const doc = copy?.id || null
    const items = copy?.items || []
    // Popisky kolem kategorií jsou druhý blok (`global.cookies.popisky`) a jedou
    // uvnitř téže odpovědi — viz `getCookiesContent`. Vlastní dokument, tedy
    // i vlastní `edit`: prvek musí pojmenovat blok, do kterého zapisuje.
    const chrome = withFallback(FALLBACK, copy?.chrome)
    const editChrome = editableIn(copy?.chrome?.id || null)
    const [localPreferences, setLocalPreferences] = useState(preferences);
    const setOpen = typeof setSettings === "function" ? setSettings : open;

    // The one place that knows how this thing goes away, so the close button,
    // Escape and the backdrop cannot drift apart. Held in a ref because the
    // effect below must not re-subscribe every render.
    const closeRef = useRef(null);
    closeRef.current = () => setOpen && setOpen(false);

    const handleToggle = (categoryId) => {
        if (COOKIE_CATEGORIES[categoryId].required) return;

        setLocalPreferences(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    // Unchanged: the visitor's answers are written exactly as before. The sheet
    // then leaves, because savePreferences only closes the provider's OWN modal
    // flag — the caller's `settings` is a separate piece of state, and without
    // this the tap looked like it had done nothing at all.
    const handleSave = () => {
        savePreferences(localPreferences);
        closeRef.current();
    };

    // Escape closes on a keyboard; lenis is held still underneath so a wheel or
    // a thumb that gets past the sheet does not scroll the page behind it.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") closeRef.current();
        };
        window.addEventListener("keydown", onKey);

        const lenis = typeof window !== "undefined" ? window.lenis : null;
        lenis?.stop?.();

        return () => {
            window.removeEventListener("keydown", onKey);
            lenis?.start?.();
        };
    }, []);

    return (
        <motion.section
            {...surfaceRoot(studioRoot)}
            className="CookiesModem"
            initial={{ x: "100%", opacity: 0 }}
            animate="open"
            exit="closed"
            variants={modemAnim}
            role="dialog"
            aria-modal="true"
            aria-label={t.title}
            // Only a tap that lands on the cover itself — never one that
            // bubbled out of the sheet — is a tap on the backdrop.
            onClick={(e) => { if (e.target === e.currentTarget) closeRef.current(); }}
        >
            <Grid className="CookiesModem__grid" opacity={0.35} />

            <div className="CookiesModem__sheet">
                <header className="CookiesModem__head">
                    <div>
                        {/* Bez anotace, a je to oprava: dřív tu stálo
                            `items.0.lead` na bloku kategorií — pole, které
                            nikdo nečte, takže úprava ve Studiu zmizela. Slova
                            jsou navíc holý textový uzel vedle `<em>§</em>`, a
                            překryv ukládá `textContent`, takže by první uložení
                            značku sežralo. Upravují se ve formuláři povrchu
                            „Nastavení cookies — popisky". */}
                        {/* Slova ve vlastním <span>, a je to jediný důvod, proč tu ten <span>
                            je: `§` je značka, ne text, a uložení přes `textContent`
                            celého odstavce by ji smazalo. Takhle překryv označí jen
                            ta slova a `<em>` zůstane mimo. */}
                        <p className="CookiesModem__eyebrow">
                            <em>§</em>{" "}
                            <span {...editChrome("items.0.label")}>{chrome.eyebrow}</span>
                        </p>
                        <h3 {...editable(doc, "title")}>{t.title}</h3>
                    </div>
                    <button
                        type="button"
                        className="CookiesModem__close"
                        onClick={() => closeRef.current()}
                        aria-label={chrome.close}
                    >
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                    </button>
                </header>

                <p className="CookiesModem__lead" {...editable(doc, "body")}>
{t.lead}
                </p>

                <div className="CookiesModem__scroll">
                    {/* Celé pole naráz, ne jednotlivé popisky: modál je při editaci zavřený
                            a co není vidět, to překryv myší nenajde. `editableList`
                            otevře položky v okně nad stránkou — viz hlavička
                            src/cms/edit/overlay/ListModule.jsx. */}
                        <ul className="CookiesModem__options" {...editableList(doc, "items")}>
                        {Object.entries(COOKIE_CATEGORIES).map(([id, category], index) => (
                            <li key={id} className="CookiesModem__option">
                                <label className="CookiesModem__switch">
                                    <input
                                        type="checkbox"
                                        checked={localPreferences[id]}
                                        onChange={() => handleToggle(id)}
                                        disabled={category.required}
                                    />
                                    <span className="CookiesModem__track" aria-hidden="true">
                                        <span className="CookiesModem__knob" />
                                    </span>
                                    <span className="CookiesModem__name">
                                        {labelAt(items, index, "label", category.name)}
                                        {category.required && (
                                            <em
                                                className="CookiesModem__always"
                                                {...editChrome("items.1.label")}
                                            >
                                                {chrome.always}
                                            </em>
                                        )}
                                    </span>
                                </label>

                                <p className="CookiesModem__desc">{labelAt(items, index, "value", category.description)}</p>

                                <dl className="CookiesModem__meta">
                                    {/* Jedno pole, čtyři prvky: totéž návěští
                                        stojí u každé kategorie, takže úprava
                                        jednoho pohne všemi. Stejné uspořádání
                                        jako `dealLabel` na /nabidky. */}
                                    <div>
                                        <dt {...editChrome("items.2.label")}>{chrome.providers}</dt>
                                        <dd>{category.providers.join(", ")}</dd>
                                    </div>
                                    <div>
                                        <dt {...editChrome("items.3.label")}>{chrome.cookies}</dt>
                                        <dd>{category.cookies.join(", ")}</dd>
                                    </div>
                                </dl>
                            </li>
                        ))}
                    </ul>
                </div>

                <footer className="CookiesModem__foot">
                    {/* CornerButton předává atributy na samotné tlačítko,
                        takže slova JSOU uložená hodnota — stejně jako u tlačítka
                        „Spravovat" na /cookies. */}
                    <CornerButton onClick={handleSave} {...editChrome("items.4.label")}>{chrome.save}</CornerButton>
                </footer>
            </div>
        </motion.section>
    );
}
