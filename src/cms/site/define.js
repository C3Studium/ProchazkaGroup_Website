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
// stating because the obvious `import schemas from '../schemas/index.js'` is a trap:
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
 *
 * `reads(ctx)` is the second thing every use owes, and it is the price of the
 * escape hatch rather than an extra. A lambda's addresses cannot be recovered
 * from the lambda, so a custom block that does not declare them makes its
 * page's annotations unverifiable — `@/cms/audit` says which page and which
 * block, and turns its config check off there rather than guess. The shape is
 * `[{ key, paths }]`: which siteCopy documents this reaches past the declared
 * blocks, and what it takes out of each.
 */
export const defineCustom = (config) => {
    const { at, resolve, reads = null, title = '' } = config || {}
    if (!at) fail('vlastní blok musí mít "at".')
    if (typeof resolve !== 'function') fail(`"resolve" u "${at}" musí být funkce.`)
    if (reads && typeof reads !== 'function') fail(`"reads" u "${at}" musí být funkce.`)
    return Object.freeze({ kind: 'custom', at, resolve, reads, title })
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
 *
 * `includes` names routes whose CONTENT this one renders as well as its own —
 * /nabidka and /benefit-program both call `getHomepageContent()` for the advisor
 * block at their foot. Declared rather than inferred, because the only other
 * place it is written down is inside those two `getStaticProps` bodies, and a
 * publish that reaches / and not them is exactly the silent staleness this
 * declaration exists to stop. See ./deps.js.
 *
 * `paths` is how a DYNAMIC route names its concrete addresses:
 * `{ <source name>: (body) => "/recenze/novak-jan" }`. A page whose route holds
 * a `[segment]` has no single address to regenerate, and the mapping from a
 * document to its own URL is the same one `getStaticPaths` makes — so it is
 * declared here, once, instead of being re-derived by whoever needs it.
 */
export const definePage = (config) => {
    const { route, title = '', copy = null, sources = {}, blocks = [], includes = [], paths = null } = config || {}
    if (typeof route !== 'string' || !route.startsWith('/')) {
        fail(`stránka musí mít "route" začínající lomítkem (má "${route}").`)
    }
    for (const [name, source] of Object.entries(sources)) {
        checkTypeName(source?.type, `zdroj "${name}" na "${route}"`)
    }
    for (const included of includes) {
        if (typeof included !== 'string' || !included.startsWith('/')) {
            fail(`"includes" na "${route}" musí být route začínající lomítkem (má "${included}").`)
        }
    }
    for (const [name, resolve] of Object.entries(paths || {})) {
        if (!sources[name]) fail(`"paths.${name}" na "${route}" míří na zdroj, který stránka nedeklaruje.`)
        if (typeof resolve !== 'function') fail(`"paths.${name}" na "${route}" musí být funkce.`)
    }
    // A route with a `[segment]` is a template, and a template cannot be
    // regenerated — only its concrete addresses can. Refused at declaration time
    // rather than discovered at publish time, when the answer would be a page
    // that quietly keeps the old content.
    if (route.includes('[') && !Object.keys(paths || {}).length) {
        fail(`dynamická route "${route}" musí mít "paths" — jinak není jak zjistit její konkrétní adresy.`)
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
        includes: Object.freeze([...includes]),
        paths: Object.freeze({ ...(paths || {}) }),
    })
}

/**
 * What `_app` renders under every route, and therefore what no page declares.
 *
 * The patička, the contact sheet and the person it is addressed to are on all of
 * /, /o-nas, /recenze, /nabidka … — `_app` mounts them and `_app` has no data
 * fetching of its own, so every page's `getStaticProps` hands them down (see
 * server/site/footer.js). There is no page to name them, which is exactly why
 * they are declared here: a publish of the footer touches every route that
 * regenerates, and the alternative to saying so is a list of routes copied by
 * hand into a second file.
 *
 * `copy` is the siteCopy `page` value those blocks carry ("global"); `sources`
 * are the other types on the same terms as a page's.
 */
export const defineGlobals = (config) => {
    const { copy = null, sources = {} } = config || {}
    for (const [name, source] of Object.entries(sources)) {
        checkTypeName(source?.type, `globální zdroj "${name}"`)
    }
    return Object.freeze({ copy, sources: Object.freeze({ ...sources }) })
}

/** The whole site. One of these, exported from `cms.config.js`. */
export const defineSite = (config) => {
    const pages = freezeList([...(config?.pages || [])])
    const routes = new Set()
    for (const page of pages) {
        if (routes.has(page.route)) fail(`dvě stránky se stejnou route: ${page.route}.`)
        routes.add(page.route)
    }
    // Checked here rather than in definePage: a page cannot see its siblings,
    // and a typo in `includes` would otherwise be a route that silently never
    // gets regenerated.
    for (const page of pages) {
        for (const included of page.includes) {
            if (!routes.has(included)) {
                fail(`"${page.route}" deklaruje includes "${included}", což není stránka v konfiguraci.`)
            }
        }
    }
    return Object.freeze({ __cmsSite: true, pages, globals: config?.globals || defineGlobals({}) })
}

// --- reading the configuration ------------------------------------------------

/** The page declared for a route, or `null`. */
export const pageFor = (site, route) => site.pages.find((page) => page.route === route) || null

/** Every siteCopy key a page declares, in declaration order. */
export const copyKeysOf = (page) =>
    (page?.blocks || []).filter((block) => block.kind === 'block').map((block) => block.key)

/**
 * What a page READS out of the document under one siteCopy key — the same
 * declaration, asked as addresses instead of as values.
 *
 * The answer is the union over every entry that names the key, because a key can
 * legitimately be on a page twice: /o-nas reads `o-nas.links` once for the
 * hero's badge and again for the three icons under a portrait, and an element
 * annotating either is right.
 *
 * `block` is that key's body — shaped (`getSiteCopy`) on the server, the stored
 * draft in the Studio. Both answer the two questions any reader asks of it,
 * which are whether `questions` holds anything and whether `headline` is set.
 *
 * Three answers, and the caller must keep them apart:
 *
 *   `{ known: false }`   no entry on this page reads this document. Globals, a
 *                        source row, a document a custom block reaches without
 *                        saying so — nothing to compare against, and NOT a
 *                        finding.
 *   `{ opaque: true }`   an entry reads it through a lambda. Unverifiable, said
 *                        out loud rather than guessed at.
 *   `{ paths }`          the addresses, `*` for one member of a list.
 */
export const readsAt = (page, key, block, ctx = {}) => {
    const paths = new Set()
    let known = false
    let opaque = false

    const fold = (fields) => {
        known = true
        for (const reader of Object.values(fields)) {
            const answer = reader.reads ? reader.reads(block, ctx) : null
            if (!answer) {
                opaque = true
                continue
            }
            for (const path of answer) paths.add(path)
        }
    }

    for (const entry of page?.blocks || []) {
        if (entry.kind === 'block' && entry.key === key) fold(entry.fields)
        else if (entry.kind === 'blocks' && entry.keys.includes(key)) fold(entry.fields)
        else if (entry.kind === 'custom') {
            for (const declared of (entry.reads ? entry.reads(ctx) : null) || []) {
                if (declared.key !== key) continue
                known = true
                for (const path of declared.paths || []) paths.add(path)
            }
        }
    }
    return { known, opaque, paths }
}

/** The custom blocks of a page that do not say what they read. */
export const undeclaredCustom = (page) =>
    (page?.blocks || []).filter((block) => block.kind === 'custom' && !block.reads).map((block) => block.at)

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
