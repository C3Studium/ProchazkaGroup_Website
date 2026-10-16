// Které routy web doopravdy má, přečtené z disku.
//
// Konfigurace CMS říká, které stránky drží obsah; souborový systém říká, které
// stránky existují. Rozejít se můžou v obou směrech a obojí bolí jinak: stránka
// bez deklarace se needituje a publikace ji nepřegeneruje, deklarace bez stránky
// míří na adresu, která vrátí 404. Tenhle modul umí přečíst jednu z těch dvou
// stran; porovnání dělá `valecms pages`.
//
// Umí obě konvence Next.js a všechna čtyři místa, kam je projekt může dát:
// `pages/`, `src/pages/`, `app/`, `src/app/`. Kdyby existovaly obě, vyhrává ta
// kořenová — to není preference, ale pravidlo Next.js.
//
// Bez závislostí a bez bundleru, protože z toho čte i CLI.

import fs from 'node:fs'
import path from 'node:path'

const PAGE_FILE = /\.(jsx?|tsx?)$/
const APP_ENTRY = /^page\.(jsx?|tsx?)$/

/** Adresáře, které nejsou stránkami webu. */
const SKIP_DIRS = new Set(['api', 'studio', 'node_modules'])

/** Routy, které Next obsluhuje sám. */
const SKIP_ROUTES = new Set(['/404', '/500', '/_error'])

/**
 * Kde tenhle projekt drží routy, a podle které konvence.
 *
 * @returns {{ dir: string, rel: string, router: 'pages'|'app' }|null}
 */
export const routesRoot = (root = process.cwd()) => {
    const candidates = [
        ['pages', 'pages'],
        ['src/pages', 'pages'],
        ['app', 'app'],
        ['src/app', 'app'],
    ]
    for (const [rel, router] of candidates) {
        const dir = path.join(root, rel)
        if (fs.existsSync(dir)) return { dir, rel, router }
    }
    return null
}

/** `[slug]` a `[...vse]` jsou segmenty, které se dozví adresu až za běhu. */
const isDynamic = (segment) => typeof segment === 'string' && segment.startsWith('[')

/** Skupiny `(marketing)` route neovlivňují a soukromé `_slozky` se nevykreslují. */
const isIgnoredDir = (name) =>
    SKIP_DIRS.has(name) || name.startsWith('_') || name.startsWith('.')

const routeOf = (segments) => '/' + segments.join('/')

const walkPages = (dir, segments, out) => {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }

    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (isIgnoredDir(entry.name)) continue
            walkPages(full, [...segments, entry.name], out)
            continue
        }
        if (!PAGE_FILE.test(entry.name)) continue
        const base = entry.name.replace(PAGE_FILE, '')
        if (base.startsWith('_')) continue
        const parts = base === 'index' ? segments : [...segments, base]
        const route = parts.length ? routeOf(parts) : '/'
        if (SKIP_ROUTES.has(route)) continue
        out.push({ route, file: full, dynamic: parts.some(isDynamic) })
    }
    return out
}

const walkApp = (dir, segments, out) => {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }

    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (isIgnoredDir(entry.name)) continue
            // Skupina `(marketing)` route nemění — segment se do adresy nepočítá.
            // Totéž paralelní slot `@dashboard`: je to místo v layoutu, ne kus
            // adresy. Bez tohohle se u účtu vypsalo osm rout jako
            // `/[countryCode]/account/@dashboard/orders`, což není URL a nikdo
            // to do konfigurace deklarovat nemá.
            const invisible = /^\(.*\)$/.test(entry.name) || entry.name.startsWith('@')
            const next = invisible ? segments : [...segments, entry.name]
            walkApp(full, next, out)
            continue
        }
        if (!APP_ENTRY.test(entry.name)) continue
        const route = segments.length ? routeOf(segments) : '/'
        if (SKIP_ROUTES.has(route)) continue
        out.push({ route, file: full, dynamic: segments.some(isDynamic) })
    }
    return out
}

/**
 * Každá routa, kterou projekt na disku má.
 *
 * @returns {{ router: 'pages'|'app'|null, rel: string|null,
 *             routes: Array<{ route: string, file: string, dynamic: boolean }> }}
 */
/**
 * Dynamický segment, kterým začíná KAŽDÁ routa, nebo null.
 *
 * `app/[countryCode]/…` u Medusy, `app/[locale]/…` u vícejazyčného webu.
 * Adresa úvodní stránky pak není `/`, ale `/cz`, a to je rozdíl, na kterém
 * stojí náhled: kdo deklaruje `/`, pošle rám na cestu, která neexistuje.
 *
 * Hledá se jen tehdy, když ho mají opravdu všechny — jedna routa mimo něj
 * znamená, že to není prefix webu, ale obyčejná dynamická sekce.
 */
export const commonPrefix = (routes) => {
    if (!routes.length) return null
    const first = routes[0].route.split('/')[1]
    if (!first || !isDynamic(first)) return null
    return routes.every((entry) => entry.route.split('/')[1] === first) ? `/${first}` : null
}

export const discoverRoutes = (root = process.cwd()) => {
    const found = routesRoot(root)
    if (!found) return { router: null, rel: null, routes: [] }

    const walk = found.router === 'app' ? walkApp : walkPages
    const routes = walk(found.dir, [], [])
    routes.sort((a, b) => (a.route === '/' ? -1 : b.route === '/' ? 1 : a.route.localeCompare(b.route, 'cs')))

    // Paralelní sloty jsou jedna adresa, ne tři.
    //
    // `app/[countryCode]/account/@dashboard/page.tsx`, `.../@login/page.tsx`
    // a `.../@verifyEmail/page.tsx` obsluhují `/cz/account` — slot je místo
    // v layoutu, ne kus cesty. Segment se do routy nezapočítává (viz walkApp),
    // takže z nich vyjde třikrát táž adresa a `valecms pages` nabízel
    // deklarovat účet třikrát.
    //
    // Vyhrává kandidát BEZ slotu, ať `file` ukazuje na soubor, který se dá
    // otevřít a přečíst — `@dashboard/page.tsx` je jen jedna ze tří větví.
    const bySlot = (entry) => (entry.file.includes(`${path.sep}@`) ? 1 : 0)
    const best = new Map()
    for (const entry of routes) {
        const held = best.get(entry.route)
        if (!held || bySlot(entry) < bySlot(held)) best.set(entry.route, entry)
    }

    return { router: found.router, rel: found.rel, routes: [...best.values()] }
}
