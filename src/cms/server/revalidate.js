// Making a publish reach the site — SERVER ONLY.
//
// Every public route of this site is ISR at ten minutes. That is what lets an
// editor change copy without a deploy, and it is also why, until this file
// existed, pressing Publikovat changed a row in a table and nothing else: the
// visitor kept getting the page Next had already rendered, for up to six hundred
// seconds, while the Studio said "Je vidět na webu."
//
// `res.revalidate(path)` is the fix, and the whole difficulty is the argument.
// WHICH path — a homepage block is on /, /nabidka and /benefit-program; the
// patička is on eight routes and ten consultants' pages; a consultant's own page
// is at an address made out of a field of the document. That question is
// answered by `@/cms/site/deps`, from the same declarations the readers use, so
// that adding a page to cms.config.js is the whole of adding it here.
//
// Three things this file owns that the pure half cannot:
//
//   - the ROUTES THAT REGENERATE, which is a fact about src/pages (pages.js);
//   - the concrete addresses of a dynamic route, which need the documents read;
//   - the coalescing, because two publishes a second apart must not render the
//     same page twice when one render would have carried both changes.
//
// Nothing here is reachable from a public page: it is imported by the CMS API
// handler alone, and `res.revalidate` only exists on an API route's response.

import site from '@/cms/site/config'
import { dynamicPages, routesForDocument, sourceHolds } from '@/cms/site'

import { listRegeneratingRoutes } from './pages.js'
import { readPublished } from './site/read.js'

/**
 * Next forwards the caller's `cookie` header into the internal request it makes
 * to re-render the page — on Vercel (`trustHostHeader`) and in dev. The caller
 * here is an editor, and an editor's browser may be carrying Next's draft-mode
 * bypass cookie, set by /api/studio/edit. A regeneration made under that cookie
 * is a render of `readEditable`, which is the Studio preview's content: drafts.
 *
 * So the two cookies come off before the call. Not restored afterwards, because
 * the request is past its own authentication by then and answers nothing but
 * JSON — and a restore would race the coalescing below, which may run a render
 * on behalf of a request that has already been answered.
 *
 * The names are Next's own constants (`COOKIE_NAME_PRERENDER_BYPASS`,
 * `COOKIE_NAME_PRERENDER_DATA`), spelled here rather than imported: they come
 * from an internal path of the framework, and a version that renamed them would
 * change this file from "strips the cookie" to "fails to build".
 */
const DRAFT_COOKIES = /(?:^|;\s*)(?:__prerender_bypass|__next_preview_data)=[^;]*/g

const stripDraftCookies = (req) => {
    const cookie = req?.headers?.cookie
    if (!cookie) return
    const stripped = cookie.replace(DRAFT_COOKIES, '').replace(/^;\s*/, '')
    if (stripped !== cookie) req.headers.cookie = stripped
}

/* -------------------------------------------------------------------------- */
/*  Which paths                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Every concrete address the configuration's dynamic routes currently have.
 *
 * Needed for two cases, and neither of them is the common publish — that one
 * names its own addresses out of its own body, so this costs nothing there.
 *
 *   the globals    the patička is on a consultant's page too.
 *   a copy block   /recenze/[slug] reads `page: 'recenze'` copy, and a block of
 *                  it is on EVERY consultant's page rather than at an address
 *                  derived from itself. `routesForDocument` reports that route
 *                  as `unresolved` — it is pure and cannot read the consultants
 *                  — and this is where the reading happens.
 *
 * `routes` narrows it to the ones actually asked about; with none, every dynamic
 * route answers.
 *
 * `readPublished` rather than the typed reader on purpose: the resolver in
 * cms.config.js is written against a stored body (`body.slug`), which is what a
 * publish hands it, and this has to hand it the same shape. `sourceHolds` is the
 * same predicate that decided the page held the document in the first place.
 */
const allDynamicPaths = async (routes = null) => {
    const out = []
    for (const page of dynamicPages(site)) {
        if (routes && !routes.has(page.route)) continue
        const rows = await readPublished({ type: page.query.type, perPage: 200 })
        for (const body of rows) {
            if (!sourceHolds(page.query, page.query.type, body)) continue
            for (const path of [].concat(page.resolve(body) || [])) {
                if (typeof path === 'string' && path.startsWith('/')) out.push(path)
            }
        }
    }
    return out
}

/**
 * The paths one transition made stale, from the bodies it moved between.
 *
 * BOTH bodies, and that is the point of taking a list: publishing a consultant
 * whose slug changed leaves a page at the old address, and the old address only
 * exists in the body the publish overwrote. Same shape of answer for a
 * `key`/`page` moved from one page of the site to another.
 *
 * Only published bodies are ever passed in (see handlers/documents.js). A draft
 * has no address, because nothing public has ever rendered it.
 */
export const pathsForDocuments = async (docs) => {
    const paths = new Set()
    const dynamic = new Set()
    const unresolved = new Set()
    let everywhere = false

    for (const doc of docs) {
        if (!doc?.type || !doc.body || !Object.keys(doc.body).length) continue
        const answer = routesForDocument(site, doc)
        if (answer.everywhere) everywhere = true
        answer.paths.forEach((path) => paths.add(path))
        answer.dynamic.forEach((path) => dynamic.add(path))
        answer.unresolved.forEach((route) => unresolved.add(route))
    }

    if (everywhere) {
        listRegeneratingRoutes().forEach((path) => paths.add(path))
        for (const path of await allDynamicPaths()) {
            paths.add(path)
            dynamic.add(path)
        }
        unresolved.clear()
    } else if (unresolved.size) {
        // A template that holds the document by its COPY rather than by a source
        // it can resolve an address from. Without this the block on
        // /recenze/[slug] would be published, reported as unresolved by a field
        // nothing reads, and every consultant's page would keep serving the old
        // words for the length of the ISR window — the silent staleness the
        // whole of ./deps.js exists to stop.
        for (const path of await allDynamicPaths(unresolved)) {
            paths.add(path)
            dynamic.add(path)
        }
        unresolved.clear()
    }

    return { paths: [...paths], dynamic, unresolved: [...unresolved], everywhere }
}

/* -------------------------------------------------------------------------- */
/*  Coalescing                                                                */
/* -------------------------------------------------------------------------- */

/**
 * One render per path at a time, and one more only if it would say something new.
 *
 * Clearing the moderation queue is twenty-odd publishes, and every one of them
 * touches /, /recenze, /nabidka and /benefit-program. Four renders each is not a
 * cost anyone has to pay, because a render reads the store when it BEGINS: a
 * change already committed is in every render that has not started yet. So there
 * are two safe answers and one unsafe one —
 *
 *   entry queued, not yet begun     join it: it will read the store after us
 *   entry begun after our commit    join it: it has already read our change
 *   entry begun before our commit   do not: chain a fresh one behind it
 *
 * — and the floor is two renders per path however large the burst: the one
 * already running and the one queued behind it. The floor is not the usual case,
 * because requests arrive spread out rather than together; twenty-two approvals
 * fired at once measured forty renders across the four paths instead of
 * eighty-eight. Every request still returns only when a render containing ITS
 * change has finished, which is what lets the Studio speak in the past tense.
 *
 * The map is per process. On a serverless deployment that means per instance,
 * which is the right granularity anyway: the correctness argument is about
 * whether a render has read a change, and a render is made by one instance.
 */
const inFlight = new Map()

/** @returns {{ promise: Promise<void>, joined: boolean }} */
const revalidateOne = (res, path, committedAt, options) => {
    const current = inFlight.get(path)
    if (current && (!current.startedAt || current.startedAt >= committedAt)) {
        return { promise: current.promise, joined: true }
    }

    // `startedAt` is 0 until the render actually begins, and that is the whole
    // of the rule above: an entry with 0 is one nobody's change can be too late
    // for.
    const entry = { startedAt: 0, promise: null }
    const after = current ? current.promise.then(() => {}, () => {}) : Promise.resolve()
    entry.promise = after
        .then(() => {
            entry.startedAt = Date.now()
            return res.revalidate(path, options)
        })
        .finally(() => {
            if (inFlight.get(path) === entry) inFlight.delete(path)
        })
    inFlight.set(path, entry)
    return { promise: entry.promise, joined: false }
}

// Four at a time. The renders are the site's own pages — a homepage with three
// canvases on it — and firing eighteen of them at one Node process to answer one
// click trades the editor's wait for everyone else's.
const LANES = 4

const runAll = async (paths, run) => {
    const queue = [...paths]
    const done = []
    const failed = []
    // Counted, and printed in the log line below, because "how many pages did
    // that actually re-render" is the question a slow publish raises and the one
    // thing a list of paths cannot answer.
    let joined = 0
    const lane = async () => {
        for (let path = queue.shift(); path; path = queue.shift()) {
            try {
                const attempt = run(path)
                if (attempt.joined) joined += 1
                await attempt.promise
                done.push(path)
            } catch (error) {
                failed.push({ path, message: String(error?.message || error) })
            }
        }
    }
    await Promise.all(Array.from({ length: Math.min(LANES, queue.length) }, lane))
    return { done, failed, joined }
}

/* -------------------------------------------------------------------------- */
/*  The one call the handler makes                                            */
/* -------------------------------------------------------------------------- */

/**
 * Regenerate every page the given transition changed, and say what happened.
 *
 * AWAITED, deliberately. Not awaiting is faster and would let the endpoint
 * answer in the time the database write takes — but then the only sentence the
 * Studio could honestly print is "publikováno, na webu se to objeví brzy", which
 * is the sentence this whole exercise exists to stop needing. The editor is
 * looking at a button they just pressed; a second of spinner buys a true
 * sentence, and the truth is the feature.
 *
 * Never throws. A failed revalidation must not turn a successful publish into an
 * error response — the document IS published, and telling the editor otherwise
 * would have them press the button again. It comes back as `ok: false` with the
 * paths that failed, and the Studio says what that means.
 *
 * @returns {{ ok, paths: string[], failed: {path,message}[],
 *             unresolved: string[], everywhere: boolean, ms: number }}
 */
export const revalidateForDocuments = async (req, res, docs, { at = Date.now() } = {}) => {
    const started = Date.now()
    let plan = { paths: [], dynamic: new Set(), unresolved: [], everywhere: false }
    try {
        plan = await pathsForDocuments(docs)
    } catch (error) {
        // Working out WHERE a document is must not be able to fail a publish.
        console.warn(`[cms] revalidace: nepodařilo se určit stránky (${error?.message || error})`)
        return { ok: false, paths: [], failed: [{ path: '*', message: String(error?.message || error) }], unresolved: [], everywhere: false, ms: Date.now() - started }
    }

    if (!plan.paths.length) {
        return { ok: true, paths: [], failed: [], unresolved: plan.unresolved, everywhere: false, ms: Date.now() - started }
    }

    if (typeof res?.revalidate !== 'function') {
        // Not an API route's response — nothing else calls this today, and a
        // silent no-op is how "it works on my machine" happens.
        return { ok: false, paths: [], failed: plan.paths.map((path) => ({ path, message: 'res.revalidate není k dispozici' })), unresolved: plan.unresolved, everywhere: plan.everywhere, ms: Date.now() - started }
    }

    stripDraftCookies(req)

    const { done, failed, joined } = await runAll(plan.paths, (path) =>
        // `unstable_onlyGenerated` for the consultants' pages: the route is
        // `fallback: 'blocking'`, so a page nobody has asked for yet does not
        // exist, and generating one here would be this endpoint building pages
        // on the off-chance instead of refreshing pages that are stale. It is
        // also what makes a slug that belongs to nobody a no-op rather than a
        // failure — one published consultant has no name and therefore no page.
        revalidateOne(res, path, at, { unstable_onlyGenerated: plan.dynamic.has(path) }),
    )

    const ms = Date.now() - started
    // One line per transition, naming what it touched. A publish of the patička
    // regenerates eighteen pages and an editor's next question is which — this
    // is the answer, in the place the answer belongs.
    console.info(
        `[cms] revalidace: ${done.length}/${plan.paths.length} za ${ms} ms` +
        `${joined ? ` (${joined} sloučeno s běžícím renderem)` : ''}` +
        `${done.length ? ` — ${done.join(', ')}` : ''}` +
        `${failed.length ? ` | selhalo: ${failed.map((entry) => entry.path).join(', ')}` : ''}`,
    )

    return { ok: failed.length === 0, paths: done, failed, joined, unresolved: plan.unresolved, everywhere: plan.everywhere, ms }
}

/** The published body of a document, for `revalidateForDocuments`. */
export const publishedBody = (doc) => (doc ? { type: doc.type, body: doc.data || {} } : null)
