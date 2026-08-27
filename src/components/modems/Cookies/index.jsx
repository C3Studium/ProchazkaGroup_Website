import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import CornerButton from "@/components/common/ui/CornerButton";
import Grid from "@/components/common/grid";
import { useCookies } from "@/context/CookiesProvider";

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

export default function CookiesModem({ setSettings, settings, open }) {
    const { COOKIE_CATEGORIES, preferences, savePreferences } = useCookies();
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
            className="CookiesModem"
            initial={{ x: "100%", opacity: 0 }}
            animate="open"
            exit="closed"
            variants={modemAnim}
            role="dialog"
            aria-modal="true"
            aria-label="Nastavení cookies"
            // Only a tap that lands on the cover itself — never one that
            // bubbled out of the sheet — is a tap on the backdrop.
            onClick={(e) => { if (e.target === e.currentTarget) closeRef.current(); }}
        >
            <Grid className="CookiesModem__grid" opacity={0.35} />

            <div className="CookiesModem__sheet">
                <header className="CookiesModem__head">
                    <div>
                        <p className="CookiesModem__eyebrow"><em>§</em> Správa předvoleb</p>
                        <h3>Nastavení cookies</h3>
                    </div>
                    <button
                        type="button"
                        className="CookiesModem__close"
                        onClick={() => closeRef.current()}
                        aria-label="Zavřít nastavení cookies"
                    >
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                    </button>
                </header>

                <p className="CookiesModem__lead">
                    Zde můžete upravit své preference ohledně cookies.
                    Nezbytné cookies jsou vždy povoleny pro správné fungování webu.
                </p>

                <div className="CookiesModem__scroll">
                    <ul className="CookiesModem__options">
                        {Object.entries(COOKIE_CATEGORIES).map(([id, category]) => (
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
                                        {category.name}
                                        {category.required && (
                                            <em className="CookiesModem__always">vždy zapnuto</em>
                                        )}
                                    </span>
                                </label>

                                <p className="CookiesModem__desc">{category.description}</p>

                                <dl className="CookiesModem__meta">
                                    <div>
                                        <dt>Poskytovatelé</dt>
                                        <dd>{category.providers.join(", ")}</dd>
                                    </div>
                                    <div>
                                        <dt>Cookies</dt>
                                        <dd>{category.cookies.join(", ")}</dd>
                                    </div>
                                </dl>
                            </li>
                        ))}
                    </ul>
                </div>

                <footer className="CookiesModem__foot">
                    <CornerButton onClick={handleSave}>Uložit</CornerButton>
                </footer>
            </div>
        </motion.section>
    );
}
