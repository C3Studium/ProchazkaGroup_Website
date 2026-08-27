// The site's own routes, read off the filesystem — SERVER ONLY.
//
// The preview's navigator has to list the pages an editor can move between, and
// there is exactly one authority on what those are: the files in src/pages.
// A hardcoded array is correct on the day it is typed and wrong the first time
// somebody adds a route, and wrong quietly — the page exists, the tool simply
// never mentions it. So this reads the directory Next itself routes from.
//
// What the filesystem cannot say is what a page is CALLED and what it holds, and
// that is `cms.config.js`. The two are joined below: the configuration supplies
// the title, and a route present in one and absent from the other is reported
// rather than dropped, in both directions.
//
// Called from getStaticProps on /studio/preview only. `output: 'standalone'`
// ships the files the tracer saw imported and a readdir is invisible to it, so
// next.config.mjs names src/pages in outputFileTracingIncludes; if that is ever
// removed the fallback below keeps the tool usable rather than empty.

import fs from 'node:fs'
import path from 'node:path'

import site from '@/cms/site/config'

const PAGES_DIR = path.join(process.cwd(), 'src', 'pages')

// Not routes of the site: the API surface, the admin, and the framework's own
// entry points. `studio` also has to go — the preview listing itself is a hall
// of mirrors, and the mirror rewrite would happily render one inside the other.
const SKIP_DIRS = new Set(['api', 'studio'])

// Nothing an editor navigates to on purpose.
const SKIP_ROUTES = new Set(['/404', '/500', '/_error'])

const PAGE_FILE = /\.(jsx?|tsx?)$/

/**
 * The page's own <title>, when it is a plain string.
 *
 * A label taken from the page is the label the page already calls itself, which
 * beats prettifying a slug. Deliberately shallow: the match stops at the first
 * brace or backtick, so a title built from data — the twelve consultant pages
 * on `main` write `{`${personData.name} | …`}` — yields nothing and falls
 * through to the slug rather than to a fragment of source code.
 *
 * `$` is in the excluded class for exactly that case, and its absence was a
 * bug: after the optional `{`` prefix matched, the class happily consumed the
 * `$` of `${…}` and stopped at the `{` after it, so the match was the one
 * character "$" — truthy, not the brand, and therefore accepted as the page's
 * name. Eleven of the twenty-two rows of the navigator on `main` were titled
 * "$". On this branch those routes do not exist and the bug is latent; the
 * character class is one place, so it is fixed here rather than left for
 * whoever restores them.
 */
const TITLE = /<title>\s*(?:\{\s*[`'"])?([^<>{}`'"$]*)/

// Every page in this project puts the brand in its title, at either end and
// sometimes in the middle. The brand is not what distinguishes one row of a
// navigator from another, so it goes.
const BRAND = /procházka\s*group|ovb\s*allfinanz/i

const titleOf = (file) => {
    let source = ''
    try {
        source = fs.readFileSync(file, 'utf8')
    } catch {
        return null
    }
    const raw = TITLE.exec(source)?.[1]
    if (!raw) return null
    const part = raw
        .split('|')
        .map((piece) => piece.trim())
        .find((piece) => piece && !BRAND.test(piece))
    return part || null
}

/** "ochrana-soukromi" -> "Ochrana soukromi". The floor, never the first choice. */
const fromSlug = (segment) =>
    segment
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

const walk = (dir, segments, out) => {
    let entries = []
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
        return out
    }

    for (const entry of entries) {
        // A dynamic segment cannot be previewed without being told which
        // document to fill it with, and nothing in the tool knows that yet.
        if (entry.name.startsWith('[') || entry.name.startsWith('_')) continue

        if (entry.isDirectory()) {
            if (segments.length === 0 && SKIP_DIRS.has(entry.name)) continue
            walk(path.join(dir, entry.name), [...segments, entry.name], out)
            continue
        }

        if (!entry.isFile() || !PAGE_FILE.test(entry.name)) continue

        const base = entry.name.replace(PAGE_FILE, '')
        const parts = base === 'index' ? segments : [...segments, base]
        const route = `/${parts.join('/')}`.replace(/\/+$/, '') || '/'
        if (SKIP_ROUTES.has(route)) continue

        const file = path.join(dir, entry.name)
        out.push({
            path: route,
            // The homepage's title is a keyword line rather than a name, and the
            // Studio has always called this page "Úvodní stránka".
            label: route === '/' ? 'Úvodní stránka' : titleOf(file) || fromSlug(parts[parts.length - 1]),
            // Nested routes are folded into one collapsible row by the navigator:
            // twelve consultant pages listed flat bury the eight that are the
            // site.
            group: parts.length > 1 ? parts[0] : null,
        })
    }

    return out
}

// One warning per mismatch per process. A route in the configuration with no
// file, or a file with no configuration, is a real state of the project and both
// halves are legitimate for a while — a page can exist before anyone describes
// its content, and a configuration entry can be written before the route is. So
// it is REPORTED, in both directions, rather than silently dropped from either.
const reported = new Set()

const report = (message) => {
    if (reported.has(message)) return
    reported.add(message)
    console.warn(`[cms] ${message}`)
}

/**
 * The filesystem's routes joined to the configuration's pages.
 *
 * The configuration's title wins where there is one: it is the name an editor
 * gave the page, and it beats both the `<title>` the page ships for a search
 * engine and a prettified slug. `configured` is the join's answer, and the
 * navigator can show an unconfigured route as exactly that — previewable, with
 * nothing yet to edit on it.
 */
const join = (routes, site) => {
    const configured = new Map(site.pages.map((page) => [page.route, page]))
    const found = new Set()

    const list = routes.map((entry) => {
        const page = configured.get(entry.path)
        if (page) found.add(entry.path)
        else report(`route "${entry.path}" existuje v src/pages, ale není v cms.config.js.`)
        return {
            ...entry,
            label: page?.title || entry.label,
            configured: Boolean(page),
        }
    })

    for (const page of site.pages) {
        if (found.has(page.route)) continue
        report(`cms.config.js popisuje route "${page.route}", ke které v src/pages není soubor.`)
        // Listed anyway, and flagged. Dropping it is how a typo in a route stays
        // invisible: the Studio would show a shorter list and nothing would say
        // which entry went missing.
        list.push({
            path: page.route,
            label: page.title || page.route,
            group: null,
            configured: true,
            missing: true,
        })
    }

    return list
}

// Read once per process in production; re-read every time in development, where
// adding a page and not seeing it appear would be the wrong lesson to teach.
let cached = null

/**
 * Every previewable route of the public site, sorted with the homepage first and
 * grouped routes after the flat ones.
 *
 * @returns {{ path: string, label: string, group: string | null,
 *             configured: boolean, missing?: true }[]}
 */
export const listSitePages = () => {
    if (cached && process.env.NODE_ENV === 'production') return cached

    const pages = walk(PAGES_DIR, [], [])

    // Never answer with nothing. An empty navigator reads as "this tool is
    // broken"; the homepage alone reads as "that is all it found", which is at
    // least true and still leaves the preview working.
    const list = join(
        pages.length ? pages : [{ path: '/', label: 'Úvodní stránka', group: null }],
        site,
    )

    list.sort((a, b) => {
        if (a.path === '/') return -1
        if (b.path === '/') return 1
        const depth = (a.group ? 1 : 0) - (b.group ? 1 : 0)
        if (depth !== 0) return depth
        return a.path.localeCompare(b.path, 'cs')
    })

    cached = list
    return list
}
