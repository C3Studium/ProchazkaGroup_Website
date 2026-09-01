// Kdo vzal `position: fixed` slib, na kterém stojí celé rozvržení.
//
// Kořen Studia i kořen overlaye jsou `position: fixed; inset: 0`, a všechno
// nad nimi z toho odvozuje, že `100%` znamená okno — scrim, `max-height: 100%`
// na dialogu, lišta s tlačítky ořezu. Stačí ale, aby kterýkoli PŘEDEK měl
// `transform`, `filter`, `backdrop-filter`, `perspective`, `contain`,
// `will-change` nebo `container-type`, a ten prvek se stane *containing
// blockem*: fixní potomek se pak měří proti němu, ne proti oknu.
//
// Nespadne nic. Jen se všechno tiše zmenší nebo posune, a příznaky vypadají
// jako chyba dialogu — dialog menší než okno, uříznutá spodní lišta, panely,
// které nemají podle čeho poznat svou výšku. Hledá se to pak v CSS dialogu,
// kde příčina není. (Přesně tohle stálo jedno kolo hledání.)
//
// Expozice je malá: overlay se portáluje do `body`, takže nad ním jsou jen
// `html` a `body`. Nulová ale není — knihovna na přechody stránek, která dá
// `transform` na `body`, to spustí. A kořen Studia v App Routeru sedí uvnitř
// `app/layout.tsx`, takže tam nad ním může být cokoli.
//
// Proto se to jen ohlásí, neopravuje. Přesunout Studio jinam by ten příznak
// schovalo a příčinu nechalo být — a hostitel, který si `transform` dal na
// `body`, o tom má vědět.

const TRAPS = ["transform", "filter", "backdropFilter", "perspective", "contain", "willChange", "containerType"]

/** `div#page.wrap` — ať je poznat, o který prvek jde. */
const describe = (el) => {
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : ""
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}`
}

const trapping = (style, prop) => {
    const value = style[prop]
    if (!value || value === "none" || value === "normal" || value === "auto") return null
    // `contain: size` ani `style` containing block nedělá; dělají to jen tyhle.
    if (prop === "contain" && !/paint|layout|strict|content/.test(value)) return null
    // `will-change` platí jen pro vlastnosti, které samy containing block dělají.
    if (prop === "willChange" && !/transform|filter|perspective/.test(value)) return null
    return value
}

/**
 * Projde předky a nahlásí, co ruší `position: fixed`.
 *
 * Druhá kontrola je měření: i když se viník nenajde podle vlastnosti — třeba
 * proto, že ho způsobilo něco, co sem nikdo nedopsal — šířka kořene, která
 * se nerovná šířce okna, o tom řekne stejně spolehlivě.
 *
 * @param {HTMLElement|null} root  kořen Studia nebo overlaye
 * @param {string} [label]         co se hlásí, kvůli srozumitelnosti hlášky
 */
export const reportFixedTrap = (root, label = "Studio") => {
    if (!root || typeof getComputedStyle !== "function") return null

    for (let el = root.parentElement; el; el = el.parentElement) {
        const style = getComputedStyle(el)
        for (const prop of TRAPS) {
            const value = trapping(style, prop)
            if (!value) continue
            console.error(
                `[cms] ${describe(el)} má ${prop}: ${value} — tím se z kořene ${label} stává prvek `
                    + `měřený proti němu, ne proti oknu. Dialogy budou menší než okno a panely uvnitř `
                    + `nebudou mít podle čeho poznat výšku. Na routě /studio ten obal nepoužívej.`,
            )
            return { node: el, prop, value }
        }
    }

    // Měření jako druhá kontrola — kdyby viníka způsobilo něco, co v seznamu
    // výš není.
    //
    // Porovnává se s `documentElement.clientWidth`, ne s `window.innerWidth`:
    // overlay běží v dokumentu rámované stránky, kde je `innerWidth` šířkou
    // RÁMU, ne okna prohlížeče. S `innerWidth` hlásil overlay past pokaždé,
    // když měl náhled jinou šířku než okno — tedy skoro vždycky.
    const viewport = root.ownerDocument?.documentElement?.clientWidth || 0
    const width = Math.round(root.getBoundingClientRect().width)
    if (viewport && width && Math.abs(width - viewport) > 1) {
        console.error(
            `[cms] Kořen ${label} je ${width}px široký, ale výřez má ${viewport}px. `
                + `Něco nad ním ruší position: fixed — hledej transform, filter, contain nebo `
                + `container-type na html, body nebo na obalu layoutu.`,
        )
        return { node: root.parentElement, prop: "width", value: `${width}px` }
    }

    return null
}
