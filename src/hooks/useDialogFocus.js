import { useEffect, useRef } from "react";

// Fokus u dialogu: při otevření dovnitř, Tab z něj neuteče, po zavření zpátky
// na to, co ho otevřelo. Totéž, co ContactModal a AdvisorModal píšou ručně,
// vytažené do jednoho místa pro ostatní listy.
//
// Co se dá dosáhnout Tabem. `[href]`, ne `a`: kotva bez odkazu není zastávka.
export const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const rootsOf = (container) => {
    const list = typeof container === "function" ? container() : [container?.current];
    return (Array.isArray(list) ? list : [list]).filter(Boolean);
};

// Čím se naposled ovládalo: myší/prstem, nebo klávesnicí. Programový fokus
// po kliknutí kreslí v Chromu prstenec :focus-visible (třeba když klik padl
// na kartu, která sama fokus nebere) — a prstenec patří jen klávesnici.
let pointerLast = false;
if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", () => { pointerLast = true; }, true);
    window.addEventListener("keydown", () => { pointerLast = false; }, true);
}

// Fokus, který po kliknutí prstenec nekreslí: `data-focus-quiet` ho schová
// (globals.scss), dokud prvek fokus nepustí nebo se nesáhne na klávesnici.
const QUIET = "data-focus-quiet";
export const focusQuietly = (el) => {
    if (!el?.focus) return;
    if (pointerLast) {
        el.setAttribute(QUIET, "");
        const clear = () => {
            el.removeAttribute(QUIET);
            el.removeEventListener("blur", clear);
            window.removeEventListener("keydown", clear, true);
        };
        el.addEventListener("blur", clear);
        window.addEventListener("keydown", clear, true);
    }
    el.focus({ preventScroll: true });
};

/**
 * @param {boolean} open
 * @param {object}  options
 * @param {object|Function} options.container  ref na dialog, nebo funkce,
 *   která vrátí pole prvků (past přes víc kořenů, viz navbar)
 * @param {object|false} [options.initialFocus]  ref na prvek, který dostane
 *   fokus; bez něj první zastávka; `false` = fokus nechat, kde je
 * @param {Function} [options.onClose]  Escape zavírá; bez něj Escape neřeší
 * @param {boolean} [options.capture]  Escape v capture fázi a dál nepustit —
 *   pro dialog nad jiným, který tutéž klávesu poslouchá taky
 * @param {boolean} [options.enabled]  `false` ve Studiu, kde se list kreslí sám
 */
export default function useDialogFocus(open, options = {}) {
    // Poslední hodnoty v refu: volající píše funkce inline, a efekt se nemá
    // přihlašovat znovu při každém renderu.
    const opts = useRef(options);
    opts.current = options;
    const enabled = options.enabled !== false;

    // Dovnitř a po zavření zpátky. Až po snímku: prvek, který ještě není
    // rozložený, `focus()` ignoruje. `preventScroll`, protože stránka pod
    // listem je dlouhá časová osa svázaná se scrollem.
    useEffect(() => {
        if (!open || !enabled) return undefined;
        const opener = document.activeElement;
        const frame = requestAnimationFrame(() => {
            const { container, initialFocus } = opts.current;
            if (initialFocus === false) return;
            const roots = rootsOf(container);
            if (roots.some((root) => root.contains(document.activeElement))) return;
            const target =
                initialFocus?.current ||
                roots.flatMap((root) => [...root.querySelectorAll(FOCUSABLE)])
                    .find((el) => el.getClientRects().length > 0);
            focusQuietly(target);
        });
        return () => {
            cancelAnimationFrame(frame);
            if (opener && opener !== document.body && opener.isConnected) {
                focusQuietly(opener);
            }
        };
    }, [open, enabled]);

    // Escape a past na Tab. Pořadí se čte při každém stisku, protože obsah
    // listu se mění (rozbalený seznam, druhý pohled panelu).
    useEffect(() => {
        if (!open || !enabled) return undefined;
        const capture = Boolean(opts.current.capture);
        const onKey = (e) => {
            const { container, onClose } = opts.current;
            if (e.key === "Escape") {
                if (!onClose) return;
                if (capture) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
                onClose();
                return;
            }
            if (e.key !== "Tab" || e.defaultPrevented) return;
            const roots = rootsOf(container);
            if (!roots.length) return;
            const active = document.activeElement;
            const inside = roots.some((root) => root.contains(active));
            // Fokus v jiném modálu nad tímhle (poradce nad panelem menu) je
            // jeho věc — tahat ho odtamtud zpátky by rozbilo jeho vlastní past.
            if (!inside && active?.closest?.('[aria-modal="true"]')) return;
            const stops = roots
                .flatMap((root) => [...root.querySelectorAll(FOCUSABLE)])
                .filter((el) => el.getClientRects().length > 0)
                .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
            if (!stops.length) return;
            const first = stops[0];
            const last = stops[stops.length - 1];
            if (!inside) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus({ preventScroll: true });
            } else if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus({ preventScroll: true });
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus({ preventScroll: true });
            }
        };
        window.addEventListener("keydown", onKey, capture);
        return () => window.removeEventListener("keydown", onKey, capture);
    }, [open, enabled]);
}
