// Živý náhled povrchu — jeden atribut, dvě strany. docs/I18N.md §7.3.
//
// Povrch (modál, accordion, seznam) jde přeložit i zavřený: Studio ho vybere ze
// seznamu a otevře nad stránkou popup, viz ./surfaceList.js a site/surfaces.js.
// Tenhle soubor řeší jen tu dobrovolnou nadstavbu — když chce někdo modál při
// editaci VIDĚT otevřený:
//
//     const studioOpen = useStudioSurface('cookies')
//     <CookieModal open={open || studioOpen} … />
//
// ---------------------------------------------------------------------------
// Proč atribut a ne modulová proměnná jako v ./mode.js
//
// `isEditMode()` čte příznak, který si stránka nastaví sama (viz ./arm.js).
// Tady si ho nastavit nemůže: KDO povrch edituje, ví Studio, a to běží v jiném
// JS realmu — překryv i popup jsou mountované hostitelem z jeho vlastního
// bundlu (viz overlay/mount.jsx). Hostitel nedosáhne do registru modulů rámu
// a nedonutí ho překreslit, ani kdyby dosáhl.
//
// Co ale sdílejí, je DOM rámu. Takže hostitel napíše jméno povrchu na
// `documentElement` rámu a stránka ho čte ze svého vlastního realmu přes
// `MutationObserver`. Jeden atribut, jedno jméno, žádný kanál navíc.
//
// ---------------------------------------------------------------------------
// Proč to na veřejném webu vždycky vrátí `false`, a to bez „dávej pozor"
//
// Tři vlastnosti, stejné tři jako v ./mode.js, a drží je stejné uspořádání:
//
//   1. Veřejné HTML nesmí nést nic z editace. Hodnota se čte POUZE z efektu,
//      a efekty na serveru neběží — takže žádný serverový render, ani ten
//      v náhledu, nemůže vidět `true`.
//   2. Veřejný bundle nesmí nést editační plochu. Tenhle soubor sahá na
//      `react` a na `../preview/frame.js`, což je seznam řetězců. Nic z
//      `overlay/` — viz pravidlo v ./index.js.
//   3. Náhled nesmí hlásit neshodu při hydrataci. První klientský render vrací
//      `false`, tedy přesně to, co vykreslil server; atribut se projeví až
//      o render později, stejně jako `data-cms-*`.
//
// `isEditFrame()` je navíc druhá polovina Contract 0: samotný atribut v DOM
// nestačí, dokument musí být zároveň rámovaný hostitelem Studia. Osm znaků
// napsaných do veřejné adresy tedy neotevře nic.

import { useEffect, useState } from "react"

import { SURFACE_ROOT_ATTR } from "./attrs.js"
import { isEditMode } from "./mode.js"
import { isEditFrame } from "../preview/frame.js"

/**
 * Kde jméno editovaného povrchu leží — na `<html>` rámované stránky.
 *
 * Na `documentElement`, ne na `body`: `body` přepisují animační knihovny
 * a scroll-lock modálů, `documentElement` nikdo z nich nesahá. Prázdná hodnota
 * se nepíše, atribut se rovnou odebírá — „přítomný a prázdný" by se musel
 * testovat dvakrát, stejně jako u `MARK_ATTR` v ./attrs.js.
 */
export const SURFACE_ATTR = "data-cms-surface"

/**
 * Hostitelská polovina: „teď se edituje tenhle povrch".
 *
 * Volá to Studio (EditView) na okno rámu. `null` nebo prázdný řetězec znamená
 * „žádný", takže zavření popupu je totéž volání s `null` a nepotřebuje druhou
 * funkci.
 *
 * Ticho při chybě je schválně. Rám může být zrovna uprostřed navigace a jeho
 * dokument čtení odmítne; živý náhled modálu není důvod shodit obrazovku, se
 * kterou se zrovna pracuje, a další `load` přinese další dokument.
 *
 * @param {Window|null} frameWindow  okno rámované stránky (same-origin)
 * @param {string|null} name         jméno povrchu, nebo `null`
 */
export function announceStudioSurface(frameWindow, name) {
    try {
        const root = frameWindow?.document?.documentElement
        if (!root) return
        const named = typeof name === "string" ? name.trim() : ""
        if (named) root.setAttribute(SURFACE_ATTR, named)
        else root.removeAttribute(SURFACE_ATTR)
    } catch {
        /* viz výš */
    }
}

/** Co je na `<html>` napsané teď. Mimo prohlížeč nic. */
const surfaceNow = () => {
    if (typeof document === "undefined") return ""
    return document.documentElement?.getAttribute(SURFACE_ATTR) || ""
}

/**
 * Edituje Studio zrovna tenhle povrch?
 *
 * Na veřejném webu VŽDYCKY `false` — viz hlavičku souboru. V rámu Studia
 * `true` po tu dobu, co je nad stránkou otevřený popup toho povrchu.
 *
 * Sleduje se `MutationObserver`em, ne jednorázovým čtením: editor otevře modál,
 * přepne na jiný, zavře ho — a stránka se mezitím nenačítá znovu. Pozorovatel
 * je jeden na komponentu a filtrovaný na jediný atribut, takže ho nebudí ani
 * překryv, ani animace stránky.
 *
 * @param {string} name  jméno z `defineSurface({ name })`
 * @returns {boolean}
 */
export function useStudioSurface(name) {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        // Obojí naráz: bez rámu Studia se nečte vůbec, takže na veřejném webu
        // stojí efekt na prvním řádku a stav zůstává `false`.
        if (!isEditFrame()) return undefined

        const wanted = typeof name === "string" ? name.trim() : ""
        if (!wanted) return undefined

        const read = () => setOpen(surfaceNow() === wanted)
        read()

        const root = typeof document === "undefined" ? null : document.documentElement
        if (!root || typeof MutationObserver === "undefined") return undefined

        const observer = new MutationObserver(read)
        observer.observe(root, { attributes: true, attributeFilter: [SURFACE_ATTR] })
        return () => {
            observer.disconnect()
            // Odmountovaná komponenta nemá co tvrdit; a kdyby se tatáž vrátila,
            // efekt si hodnotu přečte znovu prvním `read()`.
            setOpen(false)
        }
    }, [name])

    return open
}

export default useStudioSurface

/**
 * Obal povrchu, do kterého se má výběr uzavřít.
 *
 *     const open = useStudioSurface('cookies')
 *     <div {...surfaceRoot('cookies')}>…modál…</div>
 *
 * Bez něj hledá překryv editovatelné prvky po celé stránce a najde i to, co
 * leží POD otevřeným modálem — patičku, hero, cokoli, co `_app` kreslí dál.
 * Editor to vidí jako rámeček kolem něčeho, na co se nedívá.
 *
 * Za `isEditMode()` jako všechno ostatní v téhle rodině. Nejdřív to tu stálo
 * natvrdo, s odůvodněním, že hranice musí platit dřív než první klik — jenže to
 * neobstojí: povrch ohlašuje Studio, a to až dávno po hydrataci rámu. Zato
 * nepodmíněná verze psala `data-cms-surface-root` do DOMu každému návštěvníkovi,
 * který si otevřel menu, a veřejná stránka nemá nést z editace nic.
 */
export function surfaceRoot(name) {
    if (!isEditMode()) return {}
    const named = typeof name === "string" ? name.trim() : ""
    return named ? { [SURFACE_ROOT_ATTR]: named } : {}
}
