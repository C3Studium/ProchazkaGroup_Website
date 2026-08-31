// One reader for every page — SERVER ONLY.
//
// This replaces the per-page seams. `homepage.js` was 512 lines of "which item
// of which block is which prop"; all of that is now `cms.config.js`, and what is
// left here is the part that genuinely needs a server: choosing a reader,
// running the page's queries in parallel, and handing the answers to the pure
// resolver in `@/cms/site`.
//
// Everything `read.js` promises still holds and is still the reason this is
// safe to ship: every read below swallows its own failure and answers empty, so
// an empty CMS, an absent table and an unreachable database all produce a page
// identical to the one the components ship with. Nothing in a configuration can
// weaken that — a block whose document is missing resolves to the same empty
// strings the hand-written seam produced.
//
// Everything returned is plain JSON: no `undefined`, no Dates, no class
// instances. getStaticProps rejects all three, and a section that receives a
// half-shape cannot tell it from real content.

import { markAtPath } from '@/cms/schemas/marks'
import siteCopy from '@/cms/schemas/siteCopy'
import site from '@/cms/site/config'
import { pageFor, resolvePage } from '@/cms/site'
import { HOMEPAGE_COPY_KEYS } from '@/cms/visualEditing'

import { readerFor } from './archive.js'
import { getApprovedReviews, getAssistant, getConsultants, getPartners, getSiteCopy } from './content.js'

/**
 * Which schema type a block's `type` name means.
 *
 * The modules are imported DIRECTLY rather than looked up in the core's
 * registry, the same way the seam this file replaced reached for `siteCopy` and
 * the way `content.js` reaches for `displayNameOf`. Two reasons, and the
 * second is the load-bearing one:
 *
 *   - this is a pure read of a frozen field descriptor, and the registry is the
 *     server's own bookkeeping rather than the site's;
 *   - `server/resetTypes.js` and `studio/dev/resetTypes.js` each call
 *     `clearTypes()` before importing `@/cms/schemas`, and whichever evaluates
 *     second in a process clears a registry the already-evaluated barrel cannot
 *     repopulate. A public page must not be able to lose its highlight marks
 *     because an editor opened the Studio in the same Node process.
 *
 * Only `siteCopy` is listed because only `siteCopy` blocks read fields; the
 * other types are `sources`, and their shaping is `content.js`'s. An unknown
 * name answers `null`, which `markAtPath` reads as "no mark" — the page still
 * renders its words.
 */
const TYPES = Object.freeze({ siteCopy })

const typeNamed = (name) => TYPES[name] || null

/**
 * Which typed reader answers a source of a given type.
 *
 * The map is the whole of the coupling between a configuration and the site's
 * data access. Each entry is one of `content.js`'s shapers, which is where
 * every normalisation, filter and fallback the site depends on lives — a
 * configuration cannot bypass them, only name one.
 *
 * `read` is threaded rather than chosen inside, because it is the single switch
 * the Studio's preview flips: draft mode swaps `readPublished` for
 * `readEditable`, the Archive swaps in a moment-bound `readAt`, and the shaping
 * runs unchanged over whichever bodies come back.
 */
const SOURCE_READERS = Object.freeze({
    partner: (options, read) => getPartners({ ...options, read }),
    review: (options, read) => getApprovedReviews({ ...options, read }),
    consultant: (options, read) => getConsultants({ ...options, read }),
    assistant: (options, read) => getAssistant({ ...options, read }),
})

// One warning per unknown route per process, on the same terms read.js reports
// a missing table: a dev server rendering a page repeatedly should say this once.
const reported = new Set()

const report = (message) => {
    if (reported.has(message)) return
    reported.add(message)
    console.warn(`[cms] ${message}`)
}

/**
 * Everything a route's sections need, in one round trip.
 *
 * Fetched in parallel because the queries are independent and the page is only
 * as fast as its slowest read; each one already swallows its own failure, so
 * `Promise.all` cannot reject here.
 *
 * `draft` and `at` are the only levers, and they change exactly one thing each:
 * which reader the shaping runs over. A public page calls this with no options
 * and therefore cannot ever reach a draft or an old version, no matter what the
 * Studio does — the switch is the caller's, and the callers that flip it take
 * their answer from `viewOf(context)`, which reads Next's signed preview cookie
 * and nothing a visitor can type. See ./archive.js.
 *
 * `at` wins over `draft` when both are set, because the cookie that carries a
 * moment carries draft mode's flag underneath it; the ordering lives in
 * `readerFor` so no caller has to know that.
 *
 * The list limits a moment is replayed with are TODAY'S — `cms.config.js` is
 * code and no revision records what it said. `getArchiveMoment` returns the
 * limits being applied so the screen can name them; there is no way to recover
 * the true ones from the database, and pretending otherwise is the failure this
 * whole design is written against.
 *
 * An unconfigured route answers `{}` rather than throwing. Every section on this
 * site owns its own fallback, so `{}` is a page that renders the copy it ships
 * with — which is the same answer an empty CMS gives, and the right one for a
 * route somebody added a file for and has not described yet.
 *
 * @param {string} route
 * @param {{ draft?: boolean, at?: string|null }} [options]
 */
export const getPageContent = async (route, { draft = false, at = null } = {}) => {
    const page = pageFor(site, route)
    if (!page) {
        report(`route "${route}" není v cms.config.js — stránka se vykreslí s obsahem zabudovaným v komponentách.`)
        return {}
    }

    const read = readerFor({ draft, at })
    const names = Object.keys(page.sources)

    const [copy, ...lists] = await Promise.all([
        page.copy ? getSiteCopy({ page: page.copy, read }) : Promise.resolve({}),
        ...names.map((name) => {
            const { type, ...options } = page.sources[name]
            const reader = SOURCE_READERS[type]
            if (!reader) {
                report(`typ "${type}" nemá čtečku; zdroj "${name}" na "${route}" zůstane prázdný.`)
                return Promise.resolve([])
            }
            return reader(options, read)
        }),
    ])

    const sources = {}
    names.forEach((name, index) => {
        sources[name] = lists[index]
    })

    // `draft` and not `draft || at`: the flag decides whether the shapes carry
    // document ids for the editing overlay, and the archive is a record with
    // nothing to edit. Passing it here would put `data-cms-*` into a document
    // that must never be armed.
    return resolvePage(page, { copy, sources, draft, typeNamed })
}

/**
 * The homepage, under the name three routes already import it by.
 *
 * `/`, `/nabidka` and `/benefit-program` all call this — the latter two render
 * homepage sections — and `src/pages/index.js` is one of the files this build
 * is not allowed to touch. So the name survives as what it always was: this
 * page's reader, now one line of it.
 */
export const getHomepageContent = (options) => getPageContent('/', options)

/**
 * "a *b* c" -> [["a", false], ["b", true], ["c", false]].
 *
 * The decode half of the mark `siteCopy`'s `items[].label` declares, kept under
 * the name the rest of the project knows it by. The configuration reaches the
 * same declaration through `f.markedLabels`; this export exists for the seed,
 * which round-trips its fixtures through it to prove the stored strings decode
 * back to the components' hardcoded fallbacks character for character.
 */
export const parseHighlights = (line) => markAtPath(siteCopy, 'items.*.label').decode(line)

/** The homepage's block keys, under the name the site layer already uses. */
export const COPY_KEYS = HOMEPAGE_COPY_KEYS
