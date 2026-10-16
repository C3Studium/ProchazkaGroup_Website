// The readers a page's configuration is written in.
//
// PURE and ISOMORPHIC. Nothing here touches the filesystem, the database or the
// DOM, and nothing imports `@/cms/server` — that is what lets `cms.config.js`
// be read by the Studio in a browser as well as by the site layer on a server.
// The reading of *documents* stays where it was (server/site/read.js, and the
// typed shapers in server/site/content.js); what lives here is the second half
// of the old per-page files: turning one shaped block into the props a section
// receives.
//
// A reader is `{ kind, read(block, ctx), reads(block, ctx) }`. `block` is the shaped siteCopy
// block `getSiteCopy` answers with — already normalised, so `image` is
// `{src, alt}` and `bodyText` is the plain reading — or `null` when the CMS
// holds nothing for that key. `ctx` carries `{ draft, type }`: whether editing
// is armed, and the schema type the block is an instance of, which is how a
// mark is read off the field that declares it instead of being restated here.
//
// Every reader must survive `block === null`. That is the fallback rule from
// read.js arriving at its last mile: a page with no CMS behind it gets the same
// empty strings the hand-written seams produced, and every section renders the
// copy it ships with.
//
// ---------------------------------------------------------------------------
// `reads` — the same fact, said as addresses
//
// `read` answers with a VALUE; `reads` answers with the **stored paths that
// value came out of**, in the vocabulary a `data-cms-field` is written in:
// `items.3.label`, `headline`, `body`, `questions`. Nothing on the render path
// calls it. It exists so that a check can ask the one question that costs a
// morning when nobody asks it — *is the address on this element still an address
// this page reads* — without a second file restating what each reader does. That
// second file is exactly how the bug it guards against happened: the pairs moved
// out of `items[]` and the configuration was updated while a component kept
// writing to `items.0.label`, which still existed, still validated, and was read
// by nobody.
//
// Two of them depend on the block, and that is the whole reason `reads` takes
// one rather than being a constant on the reader: `pairs` reads `questions` when
// there are any and `items` when there are not, and `rawLines` reads its own
// path when it is set and the fallback's when it is not. A static answer would
// have to name both shapes, which would have declared the historical bug legal.
//
// `null` means "cannot say" — see `from`. A caller must treat it as unverifiable
// rather than as empty, because empty reads as "this page reads nothing here".
// `*` is one member of a list, the same spelling `@/cms/schemas/marks` uses.

import { decodeLines, markAtPath } from '../schemas/marks.js'

/**
 * "do not emit this key at all", as a value.
 *
 * The old seams wrote `...(draft && id ? { mark } : {})` a dozen times, and the
 * spread was the point rather than the style: these props are serialised into
 * the `__NEXT_DATA__` of a statically generated public page, so a key that is
 * always present and always null would change the bytes of every response in
 * exchange for a value nothing on the public site reads. A reader that answers
 * OMIT produces no key. Absent means absent.
 */
export const OMIT = Symbol('cms.site.omit')

const define = (kind, meta, read, reads) => Object.freeze({ kind, ...meta, read, reads })

const itemsOf = (block) => block?.items || []

/** `[from, from + count)`, for the readers that address a run of positions. */
const range = (from, count) => Array.from({ length: count }, (_, i) => from + i)

/** Every label in order, empties kept — the position IS the address. */
const labelsOf = (block) => itemsOf(block).map((item) => item.label || '')

// --- plain values ------------------------------------------------------------

/**
 * One already-shaped key of the block: `title`, `headline`, `bodyText`.
 *
 * `getSiteCopy` has done the normalising, so this is a property access with a
 * floor under it. The floor is `''` and not `undefined` because getStaticProps
 * refuses `undefined` and a section receiving a half-shape cannot tell it from
 * real content.
 */
export const text = (path = 'title') =>
    define('text', { path }, (block) => block?.[path] || '', () => [path])

/**
 * The block's body WITHOUT its markup.
 *
 * `body` is richText — an HTML string — and every consumer of it on this site
 * splits the prose per character or per word for a reveal. Handing those a
 * `<p>` is a bug you only see in the browser, so what travels is the plain
 * reading `getSiteCopy` computed alongside it.
 */
// `reads` answers `body` and not `bodyText`: the plain reading is something
// `getSiteCopy` computed, and `body` is the field an editor writes and an
// element annotates.
export const plain = () => define('plain', { path: 'bodyText' }, (block) => block?.bodyText || '', () => ['body'])

/** `items[index].label`, or `''`. */
export const label = (index) =>
    define('label', { index }, (block) => itemsOf(block)[index]?.label || '', () => [`items.${index}.label`])

/** `items[index].value`, or `''`. */
export const value = (index) =>
    define('value', { index }, (block) => itemsOf(block)[index]?.value || '', () => [`items.${index}.value`])

/** `items[index].lead`, or `''` — the short ordinal some blocks carry. */
export const lead = (index) =>
    define('lead', { index }, (block) => itemsOf(block)[index]?.lead || '', () => [`items.${index}.lead`])

/**
 * A run of labels.
 *
 * Two semantics, and the difference is not cosmetic. `pad: false` (the default)
 * is `labels.slice(from, from + count)` — a shorter list when the block holds
 * fewer items, which is what a *list* of things is. `pad: true` always answers
 * `count` entries, which is what a run of NAMED positions is: a blank line
 * three must stay blank rather than promote line four into its place, because
 * the next save would then write four's words over three's.
 *
 * Both existed in the hand-written seams, under two names that did not say
 * which was which (`labels(...).slice(...)` on the homepage, `labelsAt` in
 * footer.js and aboutUs.js). Naming the choice is the point of the option.
 */
export const labels = ({ from = 0, count, pad = false } = {}) =>
    define('labels', { from, count, pad }, (block) => {
        if (count === undefined) return labelsOf(block)
        if (!pad) return labelsOf(block).slice(from, from + count)
        const list = itemsOf(block)
        return Array.from({ length: count }, (_, i) => list[from + i]?.label || '')
    },
    // The declared RANGE, not the range the block happens to be long enough to
    // fill. A run of named positions reads position three whether or not
    // anything is stored there, and an element annotated on an empty one is
    // right — that is the annotation an editor uses to put something there.
    () => (count === undefined ? ['items.*.label'] : range(from, count).map((i) => `items.${i}.label`)))

/**
 * Every label the block holds, EMPTIES DROPPED.
 *
 * The opposite of `labels({ pad: true })` and the choice matters: this is for a
 * list whose length is the content — the two lines of a heading, the three
 * marks under a hero — where a blank item is not a line and must not leave a
 * hole. Anywhere the positions are named, use `labels` and keep the gaps.
 */
export const labelsCompact = () =>
    define('labelsCompact', {}, (block) => itemsOf(block).map((item) => item.label).filter(Boolean), () => ['items.*.label'])

/**
 * A run of items, reduced to the named keys — the shape a stat row renders.
 *
 * `pick` is an array rather than a set so the KEY ORDER of the answer is the
 * declaration's. These objects reach `__NEXT_DATA__` verbatim.
 */
export const rows = ({ from = 0, count, pick = ['label'] } = {}) =>
    define('rows', { from, count, pick }, (block) => {
        const slice = count === undefined
            ? itemsOf(block).slice(from)
            : itemsOf(block).slice(from, from + count)
        return slice.map((item) => {
            const row = {}
            for (const key of pick) row[key] = item?.[key] || ''
            return row
        })
    },
    () => (count === undefined
        ? pick.map((key) => `items.*.${key}`)
        : range(from, count).flatMap((i) => pick.map((key) => `items.${i}.${key}`))))

// --- links -------------------------------------------------------------------

/**
 * One item's two halves: the words on screen and where they point.
 *
 * `keys` because the two seams disagreed about the naming — the homepage's
 * badge is `{ label, href }` and /o-nas's is `{ text, href }` — and both are
 * read by components this build may not touch. The disagreement is preserved
 * rather than unified, and it is visible here instead of in two files.
 */
export const link = (index, { keys = ['label', 'href'] } = {}) =>
    define('link', { index, keys }, (block) => {
        const item = itemsOf(block)[index]
        return { [keys[0]]: item?.label || '', [keys[1]]: item?.value || '' }
    },
    // `keys` renames the two halves on the way OUT; what is read is still one
    // item's label and value, and those are the addresses an element carries.
    () => [`items.${index}.label`, `items.${index}.value`])

// --- images ------------------------------------------------------------------

/**
 * The block's photograph, with the alt `getSiteCopy` gave it.
 *
 * `alt: 'none'` refuses that alt and ships `alt=""`, and it is not a
 * convenience. `getSiteCopy` falls an EMPTY asset alt back to the block's
 * TITLE, which is right for a photograph that is the subject of its block and
 * wrong wherever the title is already on the page next to the picture: the
 * deck's cards print their caption directly under the photo, and the dotaz
 * block's photo sits beside its own heading. A title in an alt attribute is
 * then the same words twice, once for a reader and once for a screen reader.
 * Both shipped `alt=""` before this file existed and both still do.
 *
 * `alt: 'own'` is the third case, which /o-nas's history needs: accept an alt
 * an editor actually wrote on the asset, refuse the title standing in for one.
 * A dateline is not a description of a picture.
 */
export const image = ({ path = 'image', alt = 'inherit', sizes = null } = {}) =>
    define('image', { path, alt, sizes }, (block) => {
        const picture = block?.[path]
        if (!picture) return null
        // Jak velký se obrázek vykreslí, se deklaruje TADY, ne u assetu.
        //
        // Soubor má jednu skutečnou velikost; použití jich má tolik, kolikrát
        // je použitý. Totéž logo je 200 px v patičce a 50 px v navigaci, a
        // stejná fotka je 2560 px v hlavičce a 100 px v seznamu. Uložit to
        // k assetu znamená zvolit jednu z nich a druhou zkazit.
        //
        // Není to ani nastavení pro editora: `sizes` říká prohlížeči, kterou
        // variantu má stáhnout, ne jak má stránka vypadat. Vzhled zůstává v CSS.
        const framed = sizes ? { ...picture, sizes } : picture
        if (alt === 'none') return { ...framed, alt: '' }
        if (alt === 'own') {
            const own = picture.alt && picture.alt !== block?.title ? picture.alt : ''
            return { ...framed, alt: own }
        }
        return framed
    },
    () => [path])

// --- hand-broken and marked copy ---------------------------------------------

/**
 * The block's one hand-broken element: what is stored, and what a component
 * draws.
 *
 * `text` is the value with its breaks and without the mark's encoding — the
 * string an in-place editor puts in the element and reads back out of it.
 * `lines` is the same value already cut at every `\n` and decoded a line at a
 * time, which is the only order those two operations compose in: the mark's
 * word split treats `\n` as ordinary whitespace, so decoding first would return
 * one welded line. See `decodeLines` in @/cms/schemas/marks.
 *
 * `mark` travels draft-only and as a spread, on the terms OMIT states.
 */
export const lines = (path = 'headline') =>
    define('lines', { path }, (block, ctx) => {
        const mark = markAtPath(ctx.type, path)
        const decoded = decodeLines(mark, block?.[path] || '')
        return {
            text: decoded.map((parts) => parts.map(([piece]) => piece).join(' ')).join('\n'),
            lines: decoded,
            ...(ctx.draft && block?.id && mark.name ? { mark: mark.name } : {}),
        }
    },
    () => [path])

/**
 * The accented tail of a heading, as its own value.
 *
 * The half of a headline that is painted in the accent colour, kept apart from
 * the half that is not. One entry is a coloured span; several are the same span
 * typing itself out and swapping — "už přes JEDNU DEKÁDU" becoming "už přes 12
 * LET" and back.
 *
 * Why a field of its own rather than the asterisks the rest of the marked copy
 * uses: a mark inside a string can say WHICH words are accented and nothing
 * else. It has nowhere to put a second wording, and an editor who wants to
 * change just the accent has to find it inside a paragraph and keep the pairing
 * intact. Two values, two inputs.
 *
 * Always the tail. An accent at the front or in the middle is three parts, not
 * two, and those keep the mark convention — `index.offers` has three of them.
 *
 * @returns {string[]} the alternatives, in order; empty when the block has none
 */
export const accent = (path = 'accent') =>
    define('accent', { path }, (block) => {
        const stored = block?.[path]
        if (!Array.isArray(stored)) return typeof stored === 'string' && stored.trim() ? [stored.trim()] : []
        return stored.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    },
    () => [path])

/**
 * The raw lines of a hand-broken value — the string cut at its breaks, nothing
 * decoded.
 *
 * The Benefit-program paragraph is rendered as two SplitTexts with a `<br />`
 * between them, and it was two `items` before `headline` existed. `fallback` is
 * how a store written before the field still renders: the old address is read
 * behind the new one rather than instead of it.
 */
export const rawLines = (path = 'headline', { fallback = null } = {}) =>
    define('rawLines', { path, fallback }, (block, ctx) => {
        const stored = block?.[path]
        if (stored) return String(stored).split('\n')
        return fallback ? fallback.read(block, ctx) : []
    },
    // Which of the two addresses is live depends on the store, exactly as the
    // read does. Naming both unconditionally would say the old positional
    // addresses are still read on a block that has moved off them — which is
    // the shape of the bug this whole facility exists to catch.
    (block, ctx) => (block?.[path] ? [path] : [path, ...(fallback?.reads?.(block, ctx) || [])]))

/**
 * Every marked label of the block, decoded into the runs a component renders.
 *
 * "a *b* c" -> [["a", false], ["b", true], ["c", false]]. Which mark, and
 * whether there is one at all, is read off the field's own `options.mark`
 * (@/cms/schemas/siteCopy) rather than restated — delete the declaration and
 * these lines become plain text everywhere at once.
 *
 * Empty results are dropped: a blank item is not a line of copy.
 */
export const markedLabels = ({ path = 'items' } = {}) =>
    define('markedLabels', { path }, (block, ctx) => {
        const mark = markAtPath(ctx.type, `${path}.*.label`)
        return itemsOf(block)
            .map((item) => mark.decode(item.label))
            .filter((parts) => parts.length)
    },
    () => [`${path}.*.label`])

/** The name of the mark a field declares, draft-only. What the overlay reads. */
export const markName = (path) =>
    define('markName', { path }, (block, ctx) => {
        const mark = markAtPath(ctx.type, path)
        return ctx.draft && block?.id && mark.name ? mark.name : OMIT
    },
    // A field's declaration about itself, not a value read out of the document.
    // Nothing on the page can be annotated with it, so it addresses nothing.
    () => [])

// --- pairs -------------------------------------------------------------------

/**
 * Question and answer pairs, from the named field when there is one and from
 * the positional list when there is not.
 *
 * Both shapes say the same thing; only one of them can be put in front of an
 * editor as "a question and its answer" (siteCopy.js). Reading the old one
 * behind the new is what keeps a store written before the field from emptying
 * the accordion.
 */
export const pairs = ({ prefer = 'questions', fallback = 'items', keys = ['q', 'a'] } = {}) =>
    define('pairs', { prefer, fallback, keys }, (block) => {
        const named = block?.[prefer] || []
        if (named.length) return named.map((pair) => ({ [keys[0]]: pair.question, [keys[1]]: pair.answer }))
        return itemsOf(block).map((item) => ({ [keys[0]]: item.label || '', [keys[1]]: item.value || '' }))
    },
    // ONE of the two arrays, decided the way `read` decides it. This is the
    // reader the historical bug was standing on: a block whose pairs live in
    // `questions` reads nothing at `items.0.label`, and answering with both
    // shapes here would make that annotation look correct forever.
    //
    // The array itself rather than its leaves, because the whole of it is read:
    // an element may address the array (`questions`), one member (`questions.3`)
    // or a member's field, and all three are on the branch this names.
    (block) => [block?.[prefer]?.length ? prefer : fallback])

/**
 * WHICH of those two arrays the block is actually stored in, draft-only.
 *
 * The popup that opens the pair list whole has to write back to the shape that
 * is really there, and the answer above deliberately hides which one that was.
 */
export const pairsField = ({ prefer = 'questions', fallback = 'items' } = {}) =>
    define('pairsField', { prefer, fallback }, (block, ctx) =>
        ctx.draft && block?.id ? (block[prefer]?.length ? prefer : fallback) : OMIT,
    // The NAME of a field, which is a fact about the block rather than content
    // out of it. `pairs` above already declares the branch that is read.
    () => [])

// --- provenance --------------------------------------------------------------

/**
 * The document a section may write back to, or no key at all.
 *
 * Two gates, and both are "off" for a public page: `draft` is the caller's
 * switch and only /studio/preview under the draft-mode cookie turns it on, and
 * `id` is only ever attached by `readEditable` (server/site/draft.js), so even
 * a caller that lied about `draft` would find nothing here to hand over.
 *
 * Declared explicitly, in the position it occupies in the answer, rather than
 * appended by the resolver. The whole point of a declarative page is that the
 * shape it produces is readable off the page's own configuration.
 */
export const docId = () =>
    define('docId', {}, (block, ctx) => (ctx.draft && block?.id ? block.id : OMIT),
    // Provenance, not content: it is the document's own identity travelling
    // beside the words. Nothing on the page addresses it as a field.
    () => [])

/** A constant. Rare, and better than a component hardcoding one. */
export const constant = (literal) => define('constant', { literal }, () => literal, () => [])

/**
 * The escape hatch: an arbitrary pure function of the block.
 *
 * Deliberately last and deliberately plain. A reader kind exists for anything
 * two blocks share; `from` is for the ones that are genuinely one block's own
 * shape, and every use of it in `cms.config.js` carries a comment saying which
 * mismatch it is absorbing. `draftOnly` folds in the commonest of those — a key
 * that must not reach a public page — so the lambda does not have to repeat the
 * two-gate test.
 */
export const from = (read, { draftOnly = false } = {}) =>
    define('from', { draftOnly }, (block, ctx) => {
        if (draftOnly && !(ctx.draft && block?.id)) return OMIT
        return read(block, ctx)
    },
    // A lambda's addresses cannot be recovered from the lambda. `null` rather
    // than `[]`, so a check reads it as "this block cannot be verified" and says
    // so, instead of reading it as "this block reads nothing" and calling every
    // element on it broken.
    () => null)

/** The namespace the config is written against. */
export const f = Object.freeze({
    accent,
    constant,
    docId,
    from,
    image,
    label,
    labels,
    labelsCompact,
    lead,
    lines,
    link,
    markName,
    markedLabels,
    pairs,
    pairsField,
    plain,
    rawLines,
    rows,
    text,
    value,
})

export default f
