// Which routes a document is on — PURE and ISOMORPHIC, on ./define.js's terms.
//
// This is the half of "a publish reaches the site" that must not be a table.
// The obvious implementation is a map from document to routes written by hand,
// and it is wrong for one reason: it is correct on the day it is typed and
// silently wrong the first time somebody adds a page. Silently, because a route
// missing from such a table does not throw — it just keeps serving what it was
// serving, for as long as the ISR window, and nobody finds out until a visitor
// mentions the old telephone number.
//
// So the answer is derived from the same declarations the READER uses:
//
//   `copy: 'index'`                  -> getSiteCopy({ page: 'index' })
//   `sources: { reviews: {…} }`      -> getApprovedReviews(…)
//   `includes: ['/']`                -> getHomepageContent() inside another page
//   `globals`                        -> what _app puts under every route
//
// Add a page to cms.config.js and it is revalidated; leave one out and this
// module cannot invent it. That is the trade, and it is the right way round:
// the failure mode of an undeclared page is the one the site has today.
//
// The document's own BODY is the second input, and only its published half is
// ever passed in — see server/revalidate.js. Nothing here reads a draft.

/**
 * Does the query a source declares hold this document?
 *
 * `kind` is the only filter that changes the answer for a whole page: the orbit
 * on / is `kind: 'financial'`, so a local discount partner is not on it, and the
 * roster is `kind: 'consultant'`, so the Benefit Program row is not a colleague.
 *
 * An ABSENT kind counts as a match. The readers each supply their own default
 * for it (`stringValue(data.kind, 'financial')`), and repeating those defaults
 * here would be a second copy of them to keep in step; being wrong in this
 * direction costs one page render, and being wrong in the other costs ten
 * minutes of a page that says the wrong thing.
 */
export const sourceHolds = (source, type, body) => {
    if (source.type !== type) return false
    if (!source.kind) return true
    return !body?.kind || body.kind === source.kind
}

/** Every source of a page whose query holds this document, by name. */
const holdingSources = (page, type, body) =>
    Object.entries(page.sources).filter(([, source]) => sourceHolds(source, type, body)).map(([name]) => name)

/** The copy query of a page reads every siteCopy block of one `page` value. */
const copyHolds = (page, type, body) => Boolean(page.copy) && type === 'siteCopy' && body?.page === page.copy

/**
 * The routes a document is on, as concrete addresses.
 *
 * @param {object} site        the loaded configuration (`@/cms/site/config`)
 * @param {object} doc         `{ type, body }` — the PUBLISHED body, never a draft
 * @returns {{ everywhere: boolean, paths: string[], dynamic: string[],
 *             unresolved: string[] }}
 *
 * `dynamic` is the subset of `paths` that came from a `[segment]` route. The
 * caller needs it apart: those pages are `fallback: 'blocking'`, so one that
 * nobody has requested does not exist yet, and regenerating it would be building
 * a page on the off-chance rather than refreshing a stale one.
 *
 * `everywhere` means the document is part of what `_app` renders under every
 * route; the caller expands that against the routes that actually regenerate,
 * because which those are is a fact about the filesystem rather than about the
 * configuration (server/pages.js).
 *
 * `unresolved` names dynamic routes that hold the document but cannot say at
 * which address. It is reported rather than dropped for the same reason
 * server/pages.js reports a route in one place and not the other.
 */
export const routesForDocument = (site, doc = {}) => {
    const { type, body = {} } = doc
    const globals = site.globals

    const nothing = { everywhere: false, paths: [], dynamic: [], unresolved: [] }
    if (!type) return nothing

    // Global first, and as a whole answer: a block under every route cannot also
    // be "on" a page, and asking each page about it would answer "no" everywhere.
    if (copyHolds(globals, type, body)) return { ...nothing, everywhere: true }
    if (Object.values(globals.sources).some((source) => sourceHolds(source, type, body))) {
        return { ...nothing, everywhere: true }
    }

    const paths = new Set()
    const dynamic = new Set()
    const unresolved = new Set()
    // Which pages hold the document by their own reads. Kept as a set of routes
    // rather than resolved straight to paths, because `includes` is answered
    // against routes and a page may be reached twice.
    const holders = new Set()

    for (const page of site.pages) {
        const sources = holdingSources(page, type, body)
        if (!sources.length && !copyHolds(page, type, body)) continue
        holders.add(page.route)

        if (!page.route.includes('[')) {
            paths.add(page.route)
            continue
        }
        // A template. Its concrete addresses are whatever `paths` makes of this
        // document — one consultant is one page, and a body with no slug is a
        // consultant who has no page yet rather than an error.
        let named = false
        for (const name of sources) {
            const resolve = page.paths[name]
            if (!resolve) continue
            named = true
            for (const path of [].concat(resolve(body) || [])) {
                if (typeof path !== 'string' || !path.startsWith('/')) continue
                paths.add(path)
                dynamic.add(path)
            }
        }
        if (!named) unresolved.add(page.route)
    }

    // A page that renders another page's content is stale for exactly the same
    // publishes. Transitive, and guarded, so a pair of pages including each
    // other is a shorter list rather than a hang.
    let grew = true
    while (grew) {
        grew = false
        for (const page of site.pages) {
            if (holders.has(page.route)) continue
            if (!page.includes.some((route) => holders.has(route))) continue
            holders.add(page.route)
            grew = true
            if (page.route.includes('[')) unresolved.add(page.route)
            else paths.add(page.route)
        }
    }

    return { everywhere: false, paths: [...paths], dynamic: [...dynamic], unresolved: [...unresolved] }
}

/**
 * Every dynamic page of the configuration, with the source each one's addresses
 * come from.
 *
 * Used only for the `everywhere` case: the patička is on a consultant's page
 * too, and the only way to name those pages is to read the consultants. The
 * caller does the reading — this stays pure.
 *
 * @returns {{ route: string, source: string, query: object, resolve: Function }[]}
 */
export const dynamicPages = (site) =>
    site.pages
        .filter((page) => page.route.includes('['))
        .flatMap((page) =>
            Object.entries(page.paths).map(([source, resolve]) => ({
                route: page.route,
                source,
                query: page.sources[source],
                resolve,
            })),
        )
