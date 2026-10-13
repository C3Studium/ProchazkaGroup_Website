// /api/news — novinky a nastavení jejich widgetu, pro plovoucí okno na webu.
//
//   GET /api/news  →  { widget: {...}, items: [{ id, title, summary, date, message, link }] }
//
// Veřejné a jen ke čtení: vrací výhradně publikované dokumenty (stejné čtení,
// jakým web plní stránky, src/cms/server/site/read.js) a jen pole, která okno
// ukazuje.
//
// Za běhu, ne při buildu stránek. Stránky jsou statické s revalidací po deseti
// minutách, takže novinka zapsaná do props by se na každé stránce objevila
// jindy. Tady stačí jedna krátká cache na CDN (minuta) a nová novinka nebo
// přesunutý widget jsou vidět při dalším načtení.

import { NEWS_WIDGET_POSITIONS } from '@/content/types/newsWidget'
import { documentId, readPublished, stringValue } from '@/cms/server/site'

const POSITIONS = new Set(NEWS_WIDGET_POSITIONS.map((p) => p.value))

/** Co platí, dokud ve Studiu není publikovaný dokument „Widget novinek". */
export const WIDGET_DEFAULTS = Object.freeze({
    enabled: true,
    position: 'bottom-right',
    bubble: 'Podívejte se na novinky na trhu',
    heading: 'Novinky na trhu',
    intro: '',
})

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Odkaz, který smí do `href`: http(s) nebo cesta na webu. Nic jiného (javascript: apod.). */
const safeHref = (value) => {
    const href = stringValue(value).trim()
    if (!href) return null
    if (href.startsWith('/') && !href.startsWith('//')) return href
    try {
        const url = new URL(href)
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
    } catch {
        return null
    }
}

const widgetFrom = (data) => {
    if (!data) return { ...WIDGET_DEFAULTS }
    return {
        enabled: data.enabled !== false,
        position: POSITIONS.has(data.position) ? data.position : WIDGET_DEFAULTS.position,
        bubble: stringValue(data.bubble).trim() || WIDGET_DEFAULTS.bubble,
        heading: stringValue(data.heading).trim() || WIDGET_DEFAULTS.heading,
        intro: stringValue(data.intro).trim(),
    }
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const [widgetRows, newsRows] = await Promise.all([
        readPublished({ type: 'newsWidget', perPage: 1 }),
        readPublished({ type: 'news', sort: { field: 'data.date', direction: 'desc' }, perPage: 200, withIds: true }),
    ])

    const items = newsRows
        .map((data) => {
            const date = stringValue(data.date)
            const href = safeHref(data.linkUrl)
            return {
                id: documentId(data) || `${date}-${stringValue(data.title)}`,
                title: stringValue(data.title).trim(),
                summary: stringValue(data.summary).trim(),
                date: DATE.test(date) ? date : null,
                message: stringValue(data.message).trim(),
                link: href ? { href, label: stringValue(data.linkLabel).trim() || 'Zjistit víc' } : null,
            }
        })
        .filter((item) => item.title && item.date)

    // Minuta na CDN, potom ještě pět minut starší odpověď, zatímco se načítá
    // nová. Okno novinek není nic, co by muselo být aktuální na vteřinu.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ widget: widgetFrom(widgetRows[0]), items })
}
