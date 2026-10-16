// Skóre stránky z PageSpeed Insights (Lighthouse).
//
// Clarity říká, jak se lidé chovají. Tohle říká, jak je na tom sama stránka:
// výkon v prohlížeči, SEO, přístupnost, správné postupy. Jsou to dvě různé
// otázky a dva různé zdroje; slévat je do jednoho čísla by zakrylo, co se
// zhoršilo.
//
// Měření trvá — Google stránku doopravdy načte a odsimuluje. Deset až třicet
// sekund je běžné, takže se odpověď drží v paměti a neměří se na každé
// otevření obrazovky.
//
// Klíč není povinný: bez něj Google měří taky, jen s nižším limitem. Proto se
// nevyžaduje a chybí-li, řekne se to až když limit dojde.

import { CmsError } from '../errors.js'

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

// Naměřeno: mobilní běh nad prochazkagroup.cz trval Googlu 127 sekund. Limit
// je tedy nad tím, ne pod — smyslem je utnout viselec, ne poctivě pomalé měření.
const REQUEST_TIMEOUT_MS = 180_000
const TTL_MS = 6 * 60 * 60 * 1000       // šest hodin; skóre se přes den nemění

const cache = new Map()

/** Kategorie, které Lighthouse vrací a které dávají smysl ukázat. */
const CATEGORIES = ['performance', 'seo', 'accessibility', 'best-practices']

const LABELS = {
    performance: 'Výkon',
    seo: 'SEO',
    accessibility: 'Přístupnost',
    'best-practices': 'Správné postupy',
}

/** Lighthouse vrací 0–1; lidé čtou 0–100. */
const score = (value) => (typeof value === 'number' ? Math.round(value * 100) : null)

/**
 * Skóre jedné adresy.
 *
 * @param {object} options
 * @param {string} options.url       Veřejná adresa; Google na ni musí dosáhnout.
 * @param {'mobile'|'desktop'} [options.strategy]
 */
export const fetchPageSpeed = async ({ url, strategy = 'mobile' }) => {
    if (!url || !/^https?:\/\//.test(url)) {
        throw new CmsError('invalid', 'Chybí veřejná adresa webu (NEXT_PUBLIC_SITE_URL).')
    }
    // Localhost Google nezměří — a je lepší to říct rovnou než po třiceti
    // sekundách čekání na chybu odjinud.
    if (/localhost|127\.0\.0\.1|\.local(\b|:)/.test(url)) {
        throw new CmsError('invalid', 'PageSpeed měří jen veřejně dostupné adresy, ne localhost.')
    }

    const key = `${url}:${strategy}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.payload, fromCache: true }

    const endpoint = new URL(ENDPOINT)
    endpoint.searchParams.set('url', url)
    endpoint.searchParams.set('strategy', strategy)
    for (const category of CATEGORIES) endpoint.searchParams.append('category', category)
    const apiKey = String(process.env.PAGESPEED_API_KEY || '').trim()
    if (apiKey) endpoint.searchParams.set('key', apiKey)

    // Lighthouse načítá měřenou stránku doopravdy, takže odpověď chodí v desítkách
    // sekund — u pomalého webu i přes dvě minuty. Bez vlastního limitu by
    // požadavek visel, dokud ho neutne platforma, a editor by se místo hlášky
    // díval na "Měří se…" až do vypršení celého požadavku.
    let res
    try {
        res = await fetch(endpoint, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    } catch (error) {
        if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
            throw new CmsError(
                'server',
                'PageSpeed neodpovědělo do tří minut. Měření běží na straně Googlu a u pomalé ' +
                    'stránky se nestihne; zkus počítač místo mobilu, nebo to zopakuj později.',
            )
        }
        throw error
    }
    if (res.status === 429) {
        throw new CmsError('conflict', 'PageSpeed odmítlo kvůli limitu. Nastav PAGESPEED_API_KEY nebo zkus později.')
    }
    if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new CmsError('server', `PageSpeed odpovědělo ${res.status}. ${detail.slice(0, 120)}`)
    }

    const body = await res.json()
    const lighthouse = body?.lighthouseResult ?? {}
    const audits = lighthouse.audits ?? {}

    const payload = {
        url,
        strategy,
        measuredAt: lighthouse.fetchTime ?? new Date().toISOString(),
        scores: CATEGORIES.map((id) => ({
            id,
            label: LABELS[id],
            value: score(lighthouse.categories?.[id]?.score),
        })),
        // Čtyři míry, které Lighthouse počítá do výkonu. Bez nich je skóre
        // jedno číslo, se kterým se nedá nic dělat.
        vitals: [
            ['largest-contentful-paint', 'Největší vykreslení'],
            ['cumulative-layout-shift', 'Posun rozvržení'],
            ['total-blocking-time', 'Blokující čas'],
            ['speed-index', 'Rychlost vykreslení'],
        ]
            .map(([id, label]) => ({ id, label, value: audits[id]?.displayValue ?? null }))
            .filter((vital) => vital.value),
    }

    cache.set(key, { at: Date.now(), payload })
    return { ...payload, fromCache: false }
}

export const clearPageSpeedCache = () => cache.clear()
