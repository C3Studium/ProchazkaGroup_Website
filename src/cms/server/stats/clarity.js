// Čtení statistik z Microsoft Clarity.
//
// Tag na webu sbírá data sám; tenhle modul je jen čte přes Data Export API.
// Token nesmí do prohlížeče, takže se čte tady a klient dostane hotová čísla.
//
// ## Dvě meze, které tvar tohohle modulu určily
//
// **Deset dotazů na den a projekt.** Není to hodně: každé otevření obrazovky
// statistik by jeden spotřebovalo a po desátém by do konce dne nešlo nic.
// Odpověď se proto drží v paměti a sdílí mezi všemi editory — kdo se podívá
// jako druhý, dostane tu samou.
//
// **Nejvýš tři dny zpět.** API bere `numOfDays` 1 až 3 a nic jiného neumí;
// delší rozsahy jsou v Clarity jen na jejich vlastní nástěnce. Nabízet v CMS
// „30 dní" by znamenalo tlačítko, které vždycky vrátí chybu.
//
// Jeden dotaz se ptá na tři rozměry naráz (země, prohlížeč, zařízení), protože
// každý zvlášť by byl další dotaz z těch deseti.

import { CmsError } from '../errors.js'

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights'

/** Kolik dní API skutečně unese. */
export const MAX_DAYS = 3

const token = () => String(process.env.CLARITY_API_TOKEN || '').trim()

export const hasClarityToken = () => Boolean(token())

export const clarityProjectId = () => String(process.env.CLARITY_PROJECT_ID || '').trim() || null

/* ------------------------------------------------------------------ cache --- */

const TTL_MS = 60 * 60 * 1000        // hodina
const DAILY_LIMIT = 10

const cache = new Map()
let spent = { day: null, count: 0 }

const today = () => new Date().toISOString().slice(0, 10)

const budget = () => {
    if (spent.day !== today()) spent = { day: today(), count: 0 }
    return spent
}

/* ------------------------------------------------------------------ čtení --- */

/**
 * Živé přehledy za posledních `days` dní.
 *
 * @param {object} [options]
 * @param {number} [options.days]      1 až 3; víc API neumí.
 * @param {string[]} [options.dimensions] Nejvýš tři, viz dokumentace Clarity.
 * @returns {Promise<{ metrics: unknown[], cachedAt: string, fromCache: boolean, remaining: number }>}
 */
export const fetchClarity = async ({ days = 1, dimensions = ['Country', 'Browser', 'Device'] } = {}) => {
    if (!hasClarityToken()) {
        throw new CmsError('not_found', 'Chybí CLARITY_API_TOKEN — statistiky se nemají čím ověřit.')
    }

    const numOfDays = Math.min(Math.max(1, Math.round(days)), MAX_DAYS)
    const dims = dimensions.slice(0, 3)
    const key = `${numOfDays}:${dims.join(',')}`

    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS) {
        return { ...hit.payload, fromCache: true, remaining: DAILY_LIMIT - budget().count }
    }

    if (budget().count >= DAILY_LIMIT) {
        // Radši stará data než žádná: prošlá odpověď je pořád odpověď.
        if (hit) return { ...hit.payload, fromCache: true, stale: true, remaining: 0 }
        throw new CmsError('conflict', 'Denní limit dotazů na Clarity je vyčerpaný (10 za den). Zkuste zítra.')
    }

    const url = new URL(ENDPOINT)
    url.searchParams.set('numOfDays', String(numOfDays))
    dims.forEach((dim, i) => url.searchParams.set(`dimension${i + 1}`, dim))

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
    budget().count += 1

    if (res.status === 401 || res.status === 403) {
        throw new CmsError('unauthorized', 'Clarity token odmítnut. Vygeneruj nový v Clarity → Settings → Data Export.')
    }
    if (!res.ok) {
        throw new CmsError('server', `Clarity odpovědělo ${res.status}.`)
    }

    const metrics = await res.json()
    const payload = { metrics, cachedAt: new Date().toISOString(), days: numOfDays, dimensions: dims }
    cache.set(key, { at: Date.now(), payload })

    return { ...payload, fromCache: false, remaining: DAILY_LIMIT - budget().count }
}

/** Pro testy a ruční vyprázdnění. */
export const clearClarityCache = () => { cache.clear(); spent = { day: null, count: 0 } }
