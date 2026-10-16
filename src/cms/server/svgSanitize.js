// SVG na vstupu: propustit kresbu, zahodit všechno ostatní.
//
// SVG není obrázek, je to dokument. Umí `<script>`, `on*` obsluhy, `<a
// href="javascript:…">`, `<foreignObject>` s celým HTML uvnitř, `<use>` na cizí
// doménu i `<!ENTITY>`, kterou jde přečíst soubor ze serveru. Uložit ho tak,
// jak přišel, a servírovat z domény webu, znamená dát redaktorovi možnost
// spustit cizí kód komukoli, kdo tu adresu otevře.
//
// Přes `<img src>` se nic z toho nespustí — v obrázkovém kontextu prohlížeč
// skripty i odkazy zháší. Jenže ta adresa je pořád adresa: stačí ji otevřít
// přímo, a to je jedno kliknutí. Proto se čistí při nahrání, ne až při
// vykreslení: uložené bajty jsou jediné místo, kde se to dá zaručit pro
// všechny způsoby, jakými se k souboru dá dostat.
//
// Seznam je BÍLÝ, ne černý. Černý seznam se poráží tím, že se najde jméno,
// které na něm není — a jmen přibývá s každou verzí SVG. Bílý seznam se poráží
// jen tím, že do něj někdo něco přidá, což je vidět v diffu.
//
// Co tohle NEUMÍ: rozebrat SVG jako XML se vším všudy. Je to textová filtrace
// nad tvarem, který produkují Figma, Illustrator a Inkscape. Konstrukce, které
// tenhle kód nepozná, se zahazují — to je bezpečná strana omylu, ale znamená
// to, že exotické SVG může přijít o část kresby. Kdo potřebuje víc, ať to
// nahraje jako .webp.

/** Značky, které kreslí. Nic z toho neumí navigovat ani spustit kód. */
const TAGS = new Set([
    'svg', 'g', 'defs', 'symbol', 'title', 'desc', 'metadata', 'style',
    'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'textPath',
    'linearGradient', 'radialGradient', 'stop', 'pattern', 'mask', 'clipPath',
    'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
    'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight',
    'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
    'feGaussianBlur', 'feMerge', 'feMergeNode', 'feMorphology',
    'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
    'feTurbulence',
    'marker', 'switch',
    // `use` a `feImage` tu NEJSOU: obojí je k něčemu jen s `href`, a ten se
    // nepropouští (viz ATTRS). Nechat je znamená prázdnou značku, která nic
    // nekreslí a jen mate toho, kdo se do vyčištěného souboru podívá.
])

/**
 * Atributy, které popisují vzhled.
 *
 * `href` a `xlink:href` tu SCHVÁLNĚ nejsou, ani kvůli `<use>`. Odkaz uvnitř
 * dokumentu (`#id`) je legitimní, ale odlišit ho od `javascript:`, `data:` a
 * cizí domény znamená psát parser adres — a ten je přesně to místo, kde se
 * takové filtry prolamují. `<use href="#ikona">` proto neprojde; kdo skládá
 * ikony ze symbolů, ať je nahraje rozbalené.
 */
const ATTRS = new Set([
    'id', 'class', 'style', 'transform', 'viewBox', 'xmlns', 'version',
    'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    'd', 'points', 'pathLength',
    'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
    'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
    'stroke-miterlimit', 'opacity', 'color', 'stop-color', 'stop-opacity', 'offset',
    'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor',
    'dominant-baseline', 'letter-spacing', 'word-spacing', 'writing-mode',
    'gradientUnits', 'gradientTransform', 'spreadMethod',
    'patternUnits', 'patternContentUnits', 'patternTransform',
    'maskUnits', 'maskContentUnits', 'clipPathUnits', 'clip-rule', 'clip-path', 'mask',
    'filter', 'filterUnits', 'primitiveUnits', 'result', 'in', 'in2',
    'stdDeviation', 'values', 'type', 'mode', 'operator', 'k1', 'k2', 'k3', 'k4',
    'dx', 'dy', 'flood-color', 'flood-opacity', 'radius', 'scale', 'baseFrequency',
    'numOctaves', 'seed', 'tableValues', 'slope', 'intercept', 'amplitude', 'exponent',
    'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'markerUnits',
    'preserveAspectRatio', 'overflow', 'display', 'visibility', 'shape-rendering',
    'vector-effect', 'paint-order', 'mix-blend-mode', 'isolation',
])

/** Hodnota atributu, která se nesmí dostat dovnitř — a nesmí se hádat po částech. */
const DANGEROUS_VALUE = /(?:javascript|vbscript|livescript|data)\s*:/i

const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '')

/** Značky i s obsahem, které se mažou celé. */
const dropWholly = (text) => {
    let out = text
    for (const tag of ['script', 'foreignObject', 'animate', 'animateTransform', 'animateMotion', 'set', 'handler', 'iframe', 'audio', 'video', 'image']) {
        out = out
            .replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, 'gi'), '')
            .replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '')
    }
    return out
}

/** Atributy jedné značky, profiltrované. */
const cleanAttributes = (raw) => {
    const kept = []
    // name="…" | name='…' | name=neuvozovkované | name
    const pattern = /([:A-Za-z_][-:.\w]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g
    let match
    while ((match = pattern.exec(raw))) {
        const name = match[1]
        const value = match[2] ?? match[3] ?? match[4] ?? ''
        // `on*` nikdy, ani `onload`, ani `ONLOAD`, ani `on-cokoli-příštího`.
        if (/^on/i.test(name)) continue
        if (!ATTRS.has(name)) continue
        if (DANGEROUS_VALUE.test(value)) continue
        // `style` může nést `url(javascript:…)` i `expression(…)`.
        if (name === 'style' && /(expression|url\s*\(\s*['"]?\s*(?:javascript|data))/i.test(value)) continue
        kept.push(`${name}="${value.replace(/"/g, '&quot;')}"`)
    }
    return kept
}

/**
 * Vyčištěné SVG, nebo `null`, když z něj po vyčištění nic nezbylo.
 *
 * @param {string|Buffer} input
 * @returns {string|null}
 */
export const sanitizeSvg = (input) => {
    const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input || '')

    // Doctype a entity ven bez ptaní: `<!ENTITY xxe SYSTEM "file:///etc/passwd">`
    // je čtení souborů ze serveru, ne kresba. Nic legitimního je nepotřebuje.
    if (/<!ENTITY/i.test(text) || /<!DOCTYPE/i.test(text)) {
        const withoutDoctype = text.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
        if (/<!ENTITY/i.test(withoutDoctype)) return null
        return sanitizeSvg(withoutDoctype)
    }

    let out = dropWholly(stripComments(text))
    // Instrukce pro zpracování — `<?xml-stylesheet href="…"?>` umí načíst cizí
    // dokument. Deklarace `<?xml …?>` se maže s nimi; k vykreslení není nutná.
    out = out.replace(/<\?[\s\S]*?\?>/g, '')

    out = out.replace(/<\s*(\/?)\s*([A-Za-z][-\w:]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (whole, slash, tag, attrs) => {
        if (!TAGS.has(tag)) return ''
        if (slash) return `</${tag}>`
        const cleaned = cleanAttributes(attrs)
        const selfClosing = /\/\s*$/.test(attrs)
        return `<${tag}${cleaned.length ? ' ' + cleaned.join(' ') : ''}${selfClosing ? '/' : ''}>`
    })

    // `<style>` uvnitř SVG projde jako značka, ale její OBSAH je CSS, kde
    // `url(javascript:…)` a `@import` platí taky.
    out = out.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (whole, open, css, close) =>
        /(expression|@import|url\s*\(\s*['"]?\s*(?:javascript|data|https?))/i.test(css) ? '' : whole)

    return /<svg[\s>]/i.test(out) ? out.trim() : null
}
