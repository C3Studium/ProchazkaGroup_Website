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
// A reader is `{ kind, read(block, ctx) }`. `block` is the shaped siteCopy
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

import { decodeLines, markAtPath } from '@/cms/schemas/marks'

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

const define = (kind, meta, read) => Object.freeze({ kind, ...meta, read })

const itemsOf = (block) => block?.items || []

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
    define('text', { path }, (block) => block?.[path] || '')

/**
 * The block's body WITHOUT its markup.
 *
 * `body` is richText — an HTML string — and every consumer of it on this site
 * splits the prose per character or per word for a reveal. Handing those a
 * `<p>` is a bug you only see in the browser, so what travels is the plain
 * reading `getSiteCopy` computed alongside it.
 */
export const plain = () => define('plain', { path: 'bodyText' }, (block) => block?.bodyText || '')

/** `items[index].label`, or `''`. */
export const label = (index) =>
    define('label', { index }, (block) => itemsOf(block)[index]?.label || '')

/** `items[index].value`, or `''`. */
export const value = (index) =>
    define('value', { index }, (block) => itemsOf(block)[index]?.value || '')

/** `items[index].lead`, or `''` — the short ordinal some blocks carry. */
export const lead = (index) =>
    define('lead', { index }, (block) => itemsOf(block)[index]?.lead || '')

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
    })

/**
 * Every label the block holds, EMPTIES DROPPED.
 *
 * The opposite of `labels({ pad: true })` and the choice matters: this is for a
 * list whose length is the content — the two lines of a heading, the three
 * marks under a hero — where a blank item is not a line and must not leave a
 * hole. Anywhere the positions are named, use `labels` and keep the gaps.
 */
export const labelsCompact = () =>
    define('labelsCompact', {}, (block) => itemsOf(block).map((item) => item.label).filter(Boolean))

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
    })

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
    })

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
export const image = ({ path = 'image', alt = 'inherit' } = {}) =>
    define('image', { path, alt }, (block) => {
        const picture = block?.[path]
        if (!picture) return null
        if (alt === 'none') return { src: picture.src, alt: '' }
        if (alt === 'own') {
            const own = picture.alt && picture.alt !== block?.title ? picture.alt : ''
            return { ...picture, alt: own }
        }
        return picture
    })

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
    })

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
    })

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
    })

/** The name of the mark a field declares, draft-only. What the overlay reads. */
export const markName = (path) =>
    define('markName', { path }, (block, ctx) => {
        const mark = markAtPath(ctx.type, path)
        return ctx.draft && block?.id && mark.name ? mark.name : OMIT
    })

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
    })

/**
 * WHICH of those two arrays the block is actually stored in, draft-only.
 *
 * The popup that opens the pair list whole has to write back to the shape that
 * is really there, and the answer above deliberately hides which one that was.
 */
export const pairsField = ({ prefer = 'questions', fallback = 'items' } = {}) =>
    define('pairsField', { prefer, fallback }, (block, ctx) =>
        ctx.draft && block?.id ? (block[prefer]?.length ? prefer : fallback) : OMIT)

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
    define('docId', {}, (block, ctx) => (ctx.draft && block?.id ? block.id : OMIT))

/** A constant. Rare, and better than a component hardcoding one. */
export const constant = (literal) => define('constant', { literal }, () => literal)

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
    })

/** The namespace the config is written against. */
export const f = Object.freeze({
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
