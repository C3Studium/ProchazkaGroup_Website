// Hledání uzlů, které projde i přes stínovou hranici.
//
// `querySelector` a `closest()` končí na `shadowRoot`: dovnitř nevidí a ven
// z něj nevede. Dokud overlay bydlel celý ve světlém DOM, nikomu to nevadilo.
// Jakmile se kterákoli jeho část přesune do shadow rootu — a to je jediná
// cesta, jak zavřít hostitelské CSS —, přestane se najít sám sobě: panel,
// který se nenajde, nedostane `pointer-events: auto` a čip Upravit přestane
// reagovat. Vyzkoušeno; proto tenhle soubor vznikl dřív než ta změna.
//
// Platí to ale i bez shadow rootu. Hostitel si může kolem editovatelného
// prvku dát vlastní web component, a `closest()` v zámku interakcí ho pak
// nepozná — pravidlo "overlay se nezamyká" se tiše obrátí.
//
// Prochází se jen OTEVŘENÉ rooty (`mode: "open"`). Zavřený je záměrné
// skrytí a obcházet ho není naše věc; ty vlastní si otevřené držíme.

/** Všechny otevřené stínové rooty pod `node`, včetně vnořených. */
const shadowRootsUnder = (node) => {
    const out = []
    const walk = (el) => {
        if (el.shadowRoot) {
            out.push(el.shadowRoot)
            for (const child of el.shadowRoot.querySelectorAll("*")) walk(child)
        }
        for (const child of el.children || []) walk(child)
    }
    if (node?.children) for (const child of node.children) walk(child)
    else if (node?.body) walk(node.body)
    return out
}

/**
 * `querySelector`, který se dívá i do stínových stromů.
 *
 * @param {Document|Element|null} root
 * @param {string} selector
 */
export const deepQuery = (root, selector) => {
    if (!root) return null
    const direct = root.querySelector?.(selector)
    if (direct) return direct
    for (const shadow of shadowRootsUnder(root)) {
        const found = shadow.querySelector(selector)
        if (found) return found
    }
    return null
}

/**
 * Odpovídá cesta události některému ze selektorů?
 *
 * Nahrazuje `event.target.closest(sel)`. `composedPath()` je celá cesta od
 * skutečného cíle po okno, VČETNĚ uzlů uvnitř stínových stromů — a je to
 * jediné, co se k původnímu cíli dostane po tom, co ho hranice přeadresovala
 * na hostitelský prvek.
 *
 * @param {Event} event
 * @param {string} selector
 */
export const pathMatches = (event, selector) => {
    const path = typeof event?.composedPath === "function" ? event.composedPath() : null
    if (path) return path.some((node) => node?.nodeType === 1 && node.matches?.(selector))
    // Prohlížeč bez `composedPath` — pak je `closest()` to nejlepší, co je.
    const target = event?.target
    return Boolean(target && typeof target.closest === "function" && target.closest(selector))
}
