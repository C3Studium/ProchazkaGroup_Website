// What a page's configuration says it READS — the other half of ./fields.js.
//
// PURE and ISOMORPHIC on the same terms as fields.js and define.js: no DOM, no
// port, no filesystem. It is imported by the Studio (a browser) and by nothing
// on a public route, which is what keeps it out of the site's bundle.
//
// ---------------------------------------------------------------------------
// Why this file exists
//
// A component annotates an element with a hand-written address —
// `editable(questionsDoc, "items.0.label", "text")` — and that address is a
// third statement about the same field, beside the schema and beside
// `cms.config.js`. Two of the three are checked against each other by the code
// that runs; the third is checked by nobody, and it has already been wrong:
// when the Q&A pairs moved out of `items[]` into `questions[]`, the config and
// the site layer were updated and one component was not. The save returned 200,
// wrote `items.0.label` — a field the schema still has — and nothing read it.
//
// So the question this file answers is not "does the field exist" (it did) but
// **"is the field among what this page actually reads"**. `cms.config.js`
// declares that, per block, as a set of readers; each reader knows which
// document paths it takes its answer from, and that is what `declaredReads`
// turns back into paths.
//
// ---------------------------------------------------------------------------
// Why the BODY is an argument
//
// Two readers choose their source at runtime. `f.pairs()` reads `questions[]`
// when the block has any and `items[]` when it does not; `f.rawLines()` reads
// the named field when it is set and a positional fallback when it is not. A
// static answer would therefore have to declare BOTH shapes as read — and
// `items.0.label` would then be "read", which is exactly the address that was
// broken. The reads are resolved against the stored body instead, so the answer
// is what this page reads from THIS store, which is the only question worth
// asking.
//
// ---------------------------------------------------------------------------
// What it refuses to guess
//
// `defineCustom` and `f.from` are arbitrary functions, and no analysis of a
// function body is going to be right. A custom block is RUN, once, against a
// recording proxy of the copy map, so what it touched is observed rather than
// inferred; anything else opaque marks its key `opaque`, and a caller must then
// treat an unmatched annotation on that document as unknown rather than wrong.
// A guard that guesses here would produce the one thing that makes it
// worthless — a warning on correct code.

/** The `*` of a wildcard path, the spelling `@/cms/schemas/marks` already uses. */
const WILDCARD = '*'

const segmentsOf = (path) => String(path || '').split('.')

const isIndex = (segment) => /^\d+$/.test(segment)

/**
 * Do an annotation's path and a declared path describe the same place?
 *
 * Prefix-wise in BOTH directions, because the two are not always the same
 * length and both differences are legitimate. `editableList(doc, "questions")`
 * names the whole array the popup edits while the config declares
 * `questions.*.question` — the annotation is shorter. `f.image()` declares
 * `image` while an annotation could name a key inside it — the annotation is
 * longer. What matters is that no segment they BOTH have contradicts the other,
 * which is what caught the real bug: `items` and `questions` differ at segment
 * zero.
 *
 * A `*` matches any segment on either side. An index does not match another
 * index: `items.7.label` against a declared `items.0.label` is a line the page
 * does not draw, and that is worth hearing about.
 */
export const pathsMeet = (annotation, declared) => {
    const a = segmentsOf(annotation)
    const d = segmentsOf(declared)
    const shared = Math.min(a.length, d.length)
    for (let i = 0; i < shared; i += 1) {
        if (a[i] === d[i]) continue
        if (a[i] === WILDCARD || d[i] === WILDCARD) continue
        return false
    }
    return shared > 0
}

/**
 * The field descriptor a dotted path names in a type, or `null`.
 *
 * The same walk `markAtPath` makes (@/cms/schemas/marks), with one segment kind
 * it does not need: a literal index. An annotation addresses `items.3.label`
 * because that is where the value is stored; the schema has one member
 * descriptor for the whole array, so `3` and `*` are the same step.
 *
 * Deliberately about the SCHEMA and not about the body. A field that is simply
 * unset is the commonest thing in this store — the component falls back to its
 * shipped copy and the page is correct — so "there is no value at this path"
 * must never be a finding.
 */
export const fieldAtPath = (type, path) => {
    let node = type
    for (const segment of segmentsOf(path)) {
        if (!node) return null
        if (segment === WILDCARD || isIndex(segment)) {
            const members = node.members?.length ? node.members : node.of ? [node.of] : []
            node = members.length === 1 ? members[0] : null
            continue
        }
        node = (node.fields || []).find((field) => field.name === segment) || null
    }
    return node || null
}

/* -------------------------------------------------------------------------- */
/*  readers -> paths                                                          */
/* -------------------------------------------------------------------------- */

/** "read nothing from the body": provenance and metadata readers. */
const NOTHING = []

/**
 * `OPAQUE` is not "reads nothing" — it is "this reader's reads cannot be known".
 * The difference decides whether an unmatched annotation is a finding or a
 * shrug, and conflating the two is how a guard starts crying wolf.
 */
export const OPAQUE = Symbol('cms.site.reads.opaque')

const range = (from, count) => Array.from({ length: count }, (_, i) => from + i)

/** The same emptiness test `getSiteCopy` applies before `f.pairs` sees a block. */
const storedPairs = (body, field) =>
    (Array.isArray(body?.[field]) ? body[field] : []).filter((pair) => pair?.question)

const stringish = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value))

/**
 * Which document paths one reader takes its answer from.
 *
 * `body` is the STORED body, not the shaped block, because that is what an
 * annotation addresses — an editor's save writes `items.3.label` into the
 * document. The two names that differ are stated here rather than anywhere
 * else: `f.plain()` answers with the shaped `bodyText`, which is the plain
 * reading of the stored richText field `body`.
 */
const pathsOfReader = (reader, body) => {
    switch (reader?.kind) {
        case 'text':
        case 'lines':
        case 'image':
            return [reader.path]
        // `bodyText` is a reading of `body`; the field an editor writes is `body`.
        case 'plain':
            return ['body']
        case 'label':
            return [`items.${reader.index}.label`]
        case 'value':
            return [`items.${reader.index}.value`]
        case 'lead':
            return [`items.${reader.index}.lead`]
        case 'labels':
            return reader.count === undefined
                ? [`items.${WILDCARD}.label`]
                : range(reader.from, reader.count).map((i) => `items.${i}.label`)
        case 'labelsCompact':
            return [`items.${WILDCARD}.label`]
        case 'rows': {
            const picks = reader.pick || ['label']
            if (reader.count === undefined) return picks.map((key) => `items.${WILDCARD}.${key}`)
            return range(reader.from, reader.count).flatMap((i) => picks.map((key) => `items.${i}.${key}`))
        }
        case 'link':
            return [`items.${reader.index}.label`, `items.${reader.index}.value`]
        case 'markedLabels':
            return [`${reader.path}.${WILDCARD}.label`]
        // Conditional: the named field when it holds something, the fallback's
        // own paths when it does not. Declaring both would make an address the
        // page has stopped drawing look like one it still draws.
        case 'rawLines':
            return stringish(body?.[reader.path])
                ? [reader.path]
                : [reader.path, ...(reader.fallback ? pathsOfReader(reader.fallback, body) : [])]
        case 'pairs': {
            const prefer = reader.prefer
            const keys = ['question', 'answer']
            if (storedPairs(body, prefer).length) return keys.map((key) => `${prefer}.${WILDCARD}.${key}`)
            return [`${reader.fallback}.${WILDCARD}.label`, `${reader.fallback}.${WILDCARD}.value`]
        }
        // Provenance and metadata. `markName` reads the SCHEMA's `options.mark`,
        // not the body, so it is not evidence that anything renders that path —
        // whichever reader actually draws the line declares it.
        case 'docId':
        case 'pairsField':
        case 'markName':
        case 'constant':
            return NOTHING
        default:
            return OPAQUE
    }
}

/* -------------------------------------------------------------------------- */
/*  custom blocks, observed rather than guessed                               */
/* -------------------------------------------------------------------------- */

/**
 * Run a `defineCustom` resolver against a proxy that remembers what it touched.
 *
 * Two levels deep and no further, which is exactly what an address needs: the
 * key of the copy map is the document, the first property on the block is the
 * field, and everything below that is inside one field's value. `deckCards`
 * reads `copy[K.clients].gallery` and `copy[cardKey].image.src`; the first two
 * steps are recorded and the third is left to the real object.
 *
 * `ownKeys` is the escape: a resolver that enumerates the copy map has told us
 * nothing about which documents it cares about, so everything becomes opaque
 * rather than everything becoming "not read".
 */
const recordCustom = (block, copy, typeNamed) => {
    const touched = new Map()
    let enumerated = false

    const note = (key, field) => {
        if (!touched.has(key)) touched.set(key, new Set())
        if (field) touched.get(key).add(field)
    }

    const blockProxy = (key, value) =>
        new Proxy(value, {
            get(target, prop) {
                if (typeof prop === 'string') note(key, prop)
                return target[prop]
            },
        })

    const copyProxy = new Proxy(copy, {
        get(target, prop) {
            if (typeof prop !== 'string') return target[prop]
            note(prop, null)
            const value = target[prop]
            return value && typeof value === 'object' ? blockProxy(prop, value) : value
        },
        ownKeys(target) {
            enumerated = true
            return Reflect.ownKeys(target)
        },
    })

    let threw = false
    try {
        // `draft: true`, because that is the branch an annotated page renders
        // and the branch that reads the ids the annotations carry.
        block.resolve({ copy: copyProxy, sources: {}, draft: true, typeNamed })
    } catch {
        // A resolver that cannot run against this store has told us nothing
        // about it. Its documents become opaque, which is the answer that
        // produces no warning rather than a wrong one.
        threw = true
    }

    return { touched, enumerated, threw }
}

/* -------------------------------------------------------------------------- */

const entryFor = (byKey, key) => {
    if (!byKey.has(key)) byKey.set(key, { paths: new Set(), opaque: false, declared: true })
    return byKey.get(key)
}

/**
 * Every siteCopy document a page's configuration reads, and which paths of it.
 *
 * @param {object} page   one entry of `site.pages`
 * @param {Record<string, object>} copy  stored bodies, keyed by the document's
 *                                       `key` field — the same map shape
 *                                       `getSiteCopy` answers with, but raw
 * @returns {Map<string, {paths: Set<string>, opaque: boolean}>}
 */
export const declaredReads = (page, copy = {}) => {
    const byKey = new Map()
    let allOpaque = false

    const addReaders = (key, fields) => {
        const entry = entryFor(byKey, key)
        for (const reader of Object.values(fields || {})) {
            const paths = pathsOfReader(reader, copy[key])
            if (paths === OPAQUE) {
                entry.opaque = true
                continue
            }
            for (const path of paths) entry.paths.add(path)
        }
    }

    for (const block of page?.blocks || []) {
        if (block.kind === 'block') {
            addReaders(block.key, block.fields)
            continue
        }
        if (block.kind === 'blocks') {
            for (const key of block.keys) addReaders(key, block.fields)
            continue
        }
        // A `list` reads documents of another type through `sources`; those are
        // not siteCopy blocks and have no key in this map. The caller recognises
        // them by the document's own type — see `checkAnnotations`.
        if (block.kind === 'list') continue

        const { touched, enumerated, threw } = recordCustom(block, copy, () => null)
        if (enumerated) allOpaque = true
        for (const [key, fields] of touched) {
            const entry = entryFor(byKey, key)
            // Touched but nothing read off it: either the body is absent from
            // this map or the resolver took a branch that never looked. Neither
            // is evidence about what it reads.
            if (threw || !fields.size) entry.opaque = true
            for (const field of fields) entry.paths.add(field)
        }
    }

    if (allOpaque) for (const entry of byKey.values()) entry.opaque = true
    return byKey
}

/* -------------------------------------------------------------------------- */
/*  the check                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Why one annotation was not judged, or how it failed.
 *
 * Everything that is not `broken` is silence. The list is long on purpose: the
 * expensive failure mode of a guard like this is a warning on correct code, and
 * every entry below is a shape that is correct and would otherwise look wrong.
 */
export const OK = 'ok'
/** No field at all — `editableDoc`, which targets the whole document. */
export const WHOLE_DOCUMENT = 'document'
/** The document is reached through `sources`; its shaping is a typed reader. */
export const FROM_SOURCE = 'source'
/** `_app` renders it under every route; no page declares the globals' fields. */
export const FROM_GLOBALS = 'globals'
/** Read by a resolver this file will not guess about. */
export const OPAQUE_READ = 'opaque'
/** The route is not in `cms.config.js` at all. */
export const NO_PAGE = 'no-page'
/** A siteCopy block of this page that no block on it declares. */
export const UNDECLARED = 'undeclared'

export const MISSING_DOCUMENT = 'missing-document'
export const NOT_IN_SCHEMA = 'not-in-schema'
export const NOT_READ = 'not-read'

const BROKEN = new Set([MISSING_DOCUMENT, NOT_IN_SCHEMA, NOT_READ])

export const isBroken = (finding) => BROKEN.has(finding.status)

/**
 * Judge one annotation.
 *
 * @param {{docId: string, field: string, kind: string, role: string, where: string}} annotation
 * @param {object} ctx
 * @param {(id: string) => ({type: string, body: object}|null)} ctx.documentOf
 * @param {(name: string) => object|null} ctx.typeOf
 * @param {Map} ctx.reads   the answer of `declaredReads` for this route
 * @param {boolean} ctx.hasPage
 */
export const checkAnnotation = (annotation, { documentOf, typeOf, reads, hasPage }) => {
    const finding = { ...annotation, status: OK, message: '' }

    const document = documentOf(annotation.docId)
    if (!document) {
        finding.status = MISSING_DOCUMENT
        finding.message = `dokument "${annotation.docId}" neexistuje`
        return finding
    }
    finding.type = document.type
    finding.key = document.body?.key || null

    if (!annotation.field) {
        finding.status = WHOLE_DOCUMENT
        return finding
    }

    // Check one: does the address name anything in the type it is written
    // against? Cheap, and it is what catches a typo and a rename.
    const type = typeOf(document.type)
    if (type && !fieldAtPath(type, annotation.field)) {
        finding.status = NOT_IN_SCHEMA
        finding.message = `pole "${annotation.field}" v typu "${document.type}" neexistuje`
        return finding
    }

    if (document.type !== 'siteCopy') {
        finding.status = FROM_SOURCE
        return finding
    }
    if (document.body?.page === 'global') {
        finding.status = FROM_GLOBALS
        return finding
    }
    if (!hasPage) {
        finding.status = NO_PAGE
        return finding
    }

    const entry = reads.get(finding.key)
    if (!entry) {
        finding.status = UNDECLARED
        finding.message = `blok "${finding.key}" na této stránce nečte žádná sekce konfigurace`
        return finding
    }
    if (entry.opaque) {
        finding.status = OPAQUE_READ
        return finding
    }

    // Check two, and the one that matters. The field resolved and validated;
    // the question is whether anything on this page still puts it on screen.
    for (const declared of entry.paths) {
        if (pathsMeet(annotation.field, declared)) return finding
    }

    finding.status = NOT_READ
    finding.declared = [...entry.paths].sort()
    finding.message =
        `pole "${annotation.field}" bloku "${finding.key}" tato stránka nečte` +
        (finding.declared.length ? ` — čte ${finding.declared.join(', ')}` : ' — nečte z něj nic')
    return finding
}

/** Every annotation of one page, judged. */
export const checkAnnotations = (annotations, ctx) =>
    annotations.map((annotation) => checkAnnotation(annotation, ctx))

/** A one-line count of a page's findings, by status. */
export const tally = (findings) => {
    const counts = {}
    for (const finding of findings) counts[finding.status] = (counts[finding.status] || 0) + 1
    return counts
}
