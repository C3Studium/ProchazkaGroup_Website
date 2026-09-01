// Vpravení stylů Studia do stínového rootu.
//
// CSS Modules míří do `document.head`. Stínový root tam nevidí — selektor
// z vnějšího dokumentu se přes hranici nedostane —, takže by se Studio uvnitř
// vykreslilo úplně bez stylů. Pravidla se do něj musí vložit.
//
// Vybírají se PODLE HASHOVANÝCH JMEN TŘÍD, ne zkopírováním celé hlavičky.
// A je to ten podstatný rozdíl: adoptovat všechno by dovnitř pustilo přesně
// to, kvůli čemu se hranice staví. Selektory jako `body *` nebo `.obal .věc`
// uvnitř nic nenajdou (jejich předci leží venku), ale `button { … }`,
// `input { … }` a `* { … }` ano — tedy Tailwind preflight a resety, což je
// celý ten problém.
//
// Hashované jméno třídy je naopak znak, který nemůže patřit nikomu jinému:
// je to otisk našeho souboru. Seznam jmen dodává ./index.js, který píše
// skript, ať se nerozejde s tím, co v balíčku opravdu je.

import { classNames } from "./index.js"

/** `.hash` — tečka je podstatná: holý otisk se může trefit i uvnitř jiného slova. */
const markers = () => classNames().map((name) => `.${name}`)

const matches = (selector, list) => list.some((marker) => selector.includes(marker))

/**
 * Projde seznam pravidel a vybere naše — i uvnitř `@media`, `@supports`
 * a `@layer`, jejichž obal se zachová.
 *
 * `@keyframes` se sbírají zvlášť, do `frames`. Mají `cssRules`, ale nemají
 * `selectorText`; rekurze do nich najde kroky s `keyText`, nic z nich
 * nesebere a `if (!inner.length)` je zahodí. Ve Studiu je sedm animací —
 * spinner by se netočil, toasty naskakovaly bez náběhu, modály bez prolnutí.
 * Nic by nespadlo, jen by to vypadalo zaseknuté.
 */
const collect = (rules, list, out, frames) => {
    for (const rule of Array.from(rules || [])) {
        if (typeof rule.selectorText === "string") {
            if (matches(rule.selectorText, list)) out.push(rule.cssText)
            continue
        }
        if (typeof rule.name === "string" && rule.cssRules) {
            frames.set(rule.name, rule.cssText)
            continue
        }
        if (rule.cssRules?.length) {
            const inner = []
            collect(rule.cssRules, list, inner, frames)
            if (!inner.length) continue
            const prelude = rule.cssText.slice(0, rule.cssText.indexOf("{")).trim()
            out.push(`${prelude} {\n${inner.join("\n")}\n}`)
        }
    }
}

/**
 * Jména animací, na které naše pravidla opravdu odkazují.
 *
 * Filtrovat podle toho, jestli stylopis dal i nějaké naše pravidlo, nestačí:
 * v produkci Next slévá všechno CSS do jednoho souboru, takže by ta podmínka
 * platila pro balík, ve kterém jsou i animace hostitele. Jméno je jediný znak,
 * který drží.
 */
const animationNames = (css) => {
    const names = new Set()
    for (const match of css.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) {
        for (const part of match[1].split(",")) {
            for (const token of part.trim().split(/\s+/)) {
                // Přeskočit trvání, prodlevu, křivku a klíčová slova — jméno je
                // to, co nezačíná číslicí a není známé klíčové slovo.
                if (/^[\d.]/.test(token)) continue
                if (/^(normal|reverse|alternate|infinite|both|forwards|backwards|none|running|paused|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|var|cubic-bezier|steps)\b/.test(token)) continue
                if (token.includes("(")) continue
                names.add(token.replace(/^["']|["']$/g, ""))
            }
        }
    }
    return names
}

/** Všechna pravidla Studia z `doc`, jako text. */
export const studioCss = (doc = typeof document === "undefined" ? null : document) => {
    if (!doc) return ""
    const list = markers()
    const out = []
    const frames = new Map()
    for (const sheet of Array.from(doc.styleSheets)) {
        let rules = null
        try {
            rules = sheet.cssRules
        } catch {
            // Stylopis z jiného původu se přečíst nedá. Nic našeho odtud
            // nepochází, takže není o co přijít.
            continue
        }
        if (rules) collect(rules, list, out, frames)
    }

    const css = out.join("\n")
    const used = animationNames(css)
    const keyframes = [...frames.entries()]
        .filter(([name]) => used.has(name))
        .map(([, text]) => text)

    return keyframes.length ? `${css}\n${keyframes.join("\n")}` : css
}

/**
 * Vloží styly do stínového rootu a vrátí počet pravidel.
 *
 * Konstruovaný stylopis, když to prohlížeč umí — je sdílený, nemusí se
 * parsovat znovu a nezanáší do stromu uzel navíc. Jinak `<style>`, což je
 * pomalejší, ne horší.
 */
export const adoptStudioCss = (root, hostCss, doc) => {
    const css = `${hostCss}\n${studioCss(doc)}`
    const owner = root.ownerDocument || doc || document
    try {
        const sheet = new (owner.defaultView.CSSStyleSheet)()
        sheet.replaceSync(css)
        root.adoptedStyleSheets = [sheet]
        return sheet.cssRules.length
    } catch {
        let node = root.querySelector("style[data-valecms-css]")
        if (!node) {
            node = owner.createElement("style")
            node.setAttribute("data-valecms-css", "")
            root.appendChild(node)
        }
        node.textContent = css
        return node.sheet?.cssRules?.length || 0
    }
}
