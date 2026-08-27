// The site configuration language — `defineSite` / `definePage` / `defineBlock`.
//
// PURE and ISOMORPHIC, on the same terms as ./fields.js. What this file adds is
// the vocabulary a page is declared in and the resolver that turns a declaration
// plus a set of already-read documents into the props object a page hands to its
// sections. It reads no documents itself; that is the server's half
// (server/site/page.js), and keeping the two apart is what lets the Studio read
// the same configuration in a browser.
//
// **A block names an existing schema type.** `siteCopy`, `partner`,
// `consultant`, `review`, `offer`, `qna` and `assistant` are already
// `defineType`/`defineField` declarations, and a block is a *use* of one of them
// at a place on a page. Nothing here re-describes what a partner is.
//
// The type OBJECT is not reached from here, though, and the reason is worth
// stating because the obvious `import schemas from '@/cms/schemas'` is a trap:
// importing a schema module registers it with the core, and two modules in this
// project call `clearTypes()` before importing that barrel (server/resetTypes.js
// and studio/dev/resetTypes.js). Whichever of them evaluates SECOND in a process
// clears a registry that the already-evaluated barrel will not repopulate. A
// configuration read on the public render path must not be able to arm that, and
// more to the point it must not depend on a registry to render at all. So the
// resolver is injected by whoever calls `resolvePage` — see server/site/page.js,
// which imports the one schema module it needs directly, exactly as the seam it
// replaced did.

import { OMIT } from './fields.js'

const fail = (message) => {
    throw new Error(`[cms.config] ${message}`)
}

/** A block's `type` is a name. Whether it exists is the resolver's question. */
const checkTypeName = (name, where) => {
    if (typeof name !== 'string' || !name) fail(`${where} musí mít "type" — název typu obsahu.`)
    return name
}

const freezeList = (list) => Object.freeze(list.map((entry) => Object.freeze(entry)))

// --- blocks ------------------------------------------------------------------

/**
 * One document, at one place in a page's props.
 *
 * `at` is the dotted path into the answer — `"hero"`, `"horizontal.firstTime"`,
 * `"qna.form"` — and the ORDER blocks are declared in is the order their keys
 * appear in the answer. That is not incidental tidiness: these props are
 * serialised into `__NEXT_DATA__`, so key order is bytes on the wire, and a
 * configuration whose reading order is its output order is one a person can
 * check against a rendered page.
 *
 * `key` is the document's own `key` field, which is the contract with the code
 * (siteCopy.js): a section looks up "index.whoWeAre" rather than trusting an
 * array position an editor can reorder.
 *
 * `fields` maps a prop name to a reader from ./fields.js. A reader answering
 * `OMIT` produces no key at all.
 */
export const defineBlock = (config) => {
    const { at, key, type = 'siteCopy', title = '', fields = {} } = config || {}
    if (!at) fail('blok musí mít "at" — cestu do výsledku stránky.')
    if (!key) fail(`blok "${at}" musí mít "key" — klíč dokumentu.`)
    checkTypeName(type, `blok "${at}"`)
    for (const [name, reader] of Object.entries(fields)) {
        if (typeof reader?.read !== 'function') fail(`pole "${at}.${name}" není čtečka z f.*`)
    }
    return Object.freeze({ kind: 'block', at, key, type, title, fields: Object.freeze({ ...fields }) })
}

/**
 * Several documents of one type, at one place, as an ARRAY — one entry per key.
 *
 * The showcase's three cards, the history's four panels and the deck's three
 * photographs are each one block per member, and they have to be: siteCopy holds
 * a single `image`, so one block per card is the only shape in which the
 * pictures are separately replaceable. The ORDER of `keys` is the order the
 * members are rendered in.
 *
 * A missing document stays in the answer as `null` rather than being dropped.
 * The components merge these onto their own fixed-length lists by index, and
 * closing the gap would move card three's copy onto card two.
 */
export const defineBlockList = (config) => {
    const { at, keys = [], type = 'siteCopy', title = '', fields = {} } = config || {}
    if (!at) fail('seznam bloků musí mít "at".')
    if (!keys.length) fail(`seznam bloků "${at}" musí mít "keys".`)
    checkTypeName(type, `seznam bloků "${at}"`)
    return Object.freeze({ kind: 'blocks', at, keys: Object.freeze([...keys]), type, title, fields: Object.freeze({ ...fields }) })
}

/**
 * A list of documents, at one place in a page's props.
 *
 * `source` names one of the page's queries; the server layer decides which
 * typed reader answers it (server/site/content.js already holds one per type,
 * with every filter and normalisation the site depends on). `shape` is optional
 * and pure — with none, the typed reader's own answer travels unchanged, which
 * is what a roster wants. A `shape` answering `OMIT` drops that entry.
 */
export const defineList = (config) => {
    const { at, source, shape = null, title = '' } = config || {}
    if (!at) fail('seznam musí mít "at".')
    if (!source) fail(`seznam "${at}" musí mít "source".`)
    if (shape && typeof shape !== 'function') fail(`"shape" u "${at}" musí být funkce.`)
    return Object.freeze({ kind: 'list', at, source, shape, title })
}

/**
 * A shape mismatch this vocabulary does not absorb, absorbed in one place.
 *
 * `resolve(ctx)` is a pure function of everything already read — `ctx` is
 * `{ copy, sources, draft, type }` — and it exists so that the two or three
 * genuinely per-page shapes on this site stay visible AS per-page shapes,
 * rather than growing the reader vocabulary a kind at a time until it is a
 * second templating language. Every use must say in a comment which mismatch it
 * is absorbing and why the mismatch is real.
 */
export const defineCustom = (config) => {
    const { at, resolve, title = '' } = config || {}
    if (!at) fail('vlastní blok musí mít "at".')
    if (typeof resolve !== 'function') fail(`"resolve" u "${at}" musí být funkce.`)
    return Object.freeze({ kind: 'custom', at, resolve, title })
}

// --- pages -------------------------------------------------------------------

/**
 * One route of the site.
 *
 * `route` must match a file in `src/pages`; nothing here can check that, and
 * `server/pages.js` reports the mismatch in both directions rather than
 * silently dropping either side.
 *
 * `copy` is the `page` value of the siteCopy blocks this route holds — one
 * query for every block on the page, keyed by `key`, which is why a page with
 * a dozen blocks costs one read and not a dozen.
 *
 * `sources` are the other types the page renders, as `{ name: { type, ... } }`.
 * Everything but `type` is passed to that type's own reader.
 */
export const definePage = (config) => {
    const { route, title = '', copy = null, sources = {}, blocks = [] } = config || {}
    if (typeof route !== 'string' || !route.startsWith('/')) {
        fail(`stránka musí mít "route" začínající lomítkem (má "${route}").`)
    }
    for (const [name, source] of Object.entries(sources)) {
        checkTypeName(source?.type, `zdroj "${name}" na "${route}"`)
    }
    const seen = new Set()
    for (const block of blocks) {
        if (!block?.kind) fail(`blok na "${route}" nevznikl přes defineBlock/defineList/defineCustom.`)
        if (seen.has(block.at)) fail(`na "${route}" jsou dva bloky se stejným "at": ${block.at}.`)
        seen.add(block.at)
        if (block.kind === 'list' && !sources[block.source]) {
            fail(`seznam "${block.at}" na "${route}" čte zdroj "${block.source}", který stránka nedeklaruje.`)
        }
    }
    return Object.freeze({
        route,
        title,
        copy,
        sources: Object.freeze({ ...sources }),
        blocks: freezeList([...blocks]),
    })
}

/** The whole site. One of these, exported from `cms.config.js`. */
export const defineSite = (config) => {
    const pages = freezeList([...(config?.pages || [])])
    const routes = new Set()
    for (const page of pages) {
        if (routes.has(page.route)) fail(`dvě stránky se stejnou route: ${page.route}.`)
        routes.add(page.route)
    }
    return Object.freeze({ pages })
}

// --- reading the configuration ------------------------------------------------

/** The page declared for a route, or `null`. */
export const pageFor = (site, route) => site.pages.find((page) => page.route === route) || null

/** Every siteCopy key a page declares, in declaration order. */
export const copyKeysOf = (page) =>
    (page?.blocks || []).filter((block) => block.kind === 'block').map((block) => block.key)

// --- resolving ----------------------------------------------------------------

/**
 * Put a value at a dotted path, merging rather than replacing an object that is
 * already there.
 *
 * Merging is what lets one place in the answer be built by more than one block —
 * `offers` is the partner orbit AND the block's own copy, and the orbit is
 * declared first because `partnerLogos` is the first key the old seam emitted.
 * Insertion order is preserved by the merge, so declaration order remains
 * output order.
 */
const assignAt = (root, path, value) => {
    const segments = String(path).split('.')
    let node = root
    for (let i = 0; i < segments.length - 1; i += 1) {
        const segment = segments[i]
        if (!node[segment] || typeof node[segment] !== 'object') node[segment] = {}
        node = node[segment]
    }
    const leaf = segments[segments.length - 1]
    const existing = node[leaf]
    const mergeable = (candidate) =>
        candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    if (mergeable(existing) && mergeable(value)) Object.assign(existing, value)
    else node[leaf] = value
}

/** One block's fields, in declaration order, with OMIT answers left out. */
const resolveFields = (fields, block, ctx) => {
    const out = {}
    for (const [name, reader] of Object.entries(fields)) {
        const answer = reader.read(block, ctx)
        if (answer !== OMIT) out[name] = answer
    }
    return out
}

/**
 * A page's props, from its declaration and the documents already read.
 *
 * `copy` is the keyed siteCopy map (`getSiteCopy`), `sources` the named lists.
 * `typeNamed` maps a block's type name to its schema type object, and is the
 * caller's to supply for the reason set out at the head of this file. It may
 * answer `null`: `markAtPath` reads an absent type as "no mark", so a page whose
 * schemas are somehow unreachable still renders its words.
 *
 * Both are the shapes `server/site/content.js` answers with, and this function
 * never asks where they came from — which is exactly what makes the Studio's
 * draft preview and the public build one code path with one argument between
 * them.
 */
export const resolvePage = (page, { copy = {}, sources = {}, draft = false, typeNamed = () => null } = {}) => {
    const out = {}
    for (const block of page.blocks) {
        if (block.kind === 'block') {
            const body = copy[block.key] || null
            const ctx = { draft, type: typeNamed(block.type), copy, sources }
            assignAt(out, block.at, resolveFields(block.fields, body, ctx))
            continue
        }
        if (block.kind === 'blocks') {
            const ctx = { draft, type: typeNamed(block.type), copy, sources }
            assignAt(
                out,
                block.at,
                block.keys.map((key) => (copy[key] ? resolveFields(block.fields, copy[key], ctx) : null)),
            )
            continue
        }
        if (block.kind === 'list') {
            const ctx = { draft, copy, sources }
            const list = sources[block.source] || []
            assignAt(
                out,
                block.at,
                block.shape ? list.map((row) => block.shape(row, ctx)).filter((row) => row !== OMIT) : list,
            )
            continue
        }
        // custom
        assignAt(out, block.at, block.resolve({ copy, sources, draft, typeNamed }))
    }
    return out
}
