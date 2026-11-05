// Komprese a převod do WebP při nahrání do knihovny médií.
//
// Redaktor nahraje fotku z telefonu nebo foťáku — JPEG o 6 MB a 6000 px — a web
// by ji jinak vozil tak, jak přišla (next/image ji sice zmenší pro <img>, ale
// shader na fotkách a odkazy mimo next/image berou originál). Tady se proto
// každý rastrový obrázek při nahrání:
//
//   - otočí podle EXIF (fotka z telefonu na výšku zůstane na výšku),
//   - zmenší tak, aby delší strana měla nejvýš MAX_EDGE px (nikdy nezvětší),
//   - převede do WebP a zahodí metadata (GPS z telefonu na web nepatří).
//
// Co se NEpřevádí: SVG a PDF (nejsou rastr), GIF (může být animovaný), AVIF
// (komprimuje líp než WebP — převod by soubor zvětšil) a animované WebP.
// Už hotové WebP, které je malé a v limitu, zůstane bajt po bajtu stejné —
// opakovaná ztrátová komprese by jen ubírala kvalitu.
//
// sharp je závislost projektu (používá ho next/image) a načítá se líně, stejně
// jako v media.js. Když chybí nebo selže, nahraje se originál: komprese je
// úspora, ne podmínka nahrání.

export const MAX_EDGE = 2560
// WebP pod touhle velikostí a v limitu rozměrů se nechává být.
const KEEP_WEBP_BELOW = 1.5 * 1024 * 1024
const PHOTO = { quality: 82, smartSubsample: true, effort: 4 }
// PNG bývá grafika s průhledností (loga, ikony): vyšší kvalita a plná alfa,
// ať se hrany nerozmažou.
const GRAPHIC = { quality: 88, alphaQuality: 100, smartSubsample: true, effort: 5 }

const CONVERTIBLE = new Set(['image/jpeg', 'image/png', 'image/webp'])

const loadSharp = async () => {
    try {
        const { default: sharp } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'sharp')
        return sharp
    } catch {
        return null
    }
}

/** `dovolena.JPG` -> `dovolena.webp`. */
export const webpName = (filename) => `${String(filename || 'file').replace(/\.[^.]*$/, '') || 'file'}.webp`

/**
 * Zmenšené WebP, nebo null, když se má uložit originál.
 *
 * @returns {Promise<null | { bytes: Buffer, mime: 'image/webp', width: number, height: number }>}
 */
export const optimizeRaster = async (buffer, mime) => {
    if (!CONVERTIBLE.has(mime)) return null

    const sharp = await loadSharp()
    if (!sharp) return null

    try {
        const meta = await sharp(buffer, { failOn: 'none' }).metadata()
        // Animace (víc snímků) by převod zploštil na první snímek.
        if ((meta.pages || 1) > 1) return null

        // EXIF 5–8 znamená otočení o 90°, takže šířka a výška se po narovnání
        // prohodí.
        const turned = (meta.orientation || 1) >= 5
        const width = turned ? meta.height : meta.width
        const height = turned ? meta.width : meta.height
        const longEdge = Math.max(width || 0, height || 0)
        const oversized = longEdge > MAX_EDGE
        const rotated = (meta.orientation || 1) > 1

        if (mime === 'image/webp' && !oversized && !rotated && buffer.length <= KEEP_WEBP_BELOW) {
            return null
        }

        const { data, info } = await sharp(buffer, { failOn: 'none' })
            .rotate()
            .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
            .webp(mime === 'image/png' ? GRAPHIC : PHOTO)
            .toBuffer({ resolveWithObject: true })

        // Z WebP vyšlo větší WebP: převod nic nedal, nech originál (pokud
        // nebyl potřeba kvůli rozměrům nebo otočení).
        if (mime === 'image/webp' && !oversized && !rotated && data.length >= buffer.length) return null

        return { bytes: data, mime: 'image/webp', width: info.width, height: info.height }
    } catch {
        return null
    }
}
