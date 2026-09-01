// Typed reads for the public site — SERVER ONLY.
//
// Each function turns published documents of one type into a plain, serialisable
// shape a page can hand straight to `props`. They are typed in the only sense
// JavaScript offers: the returned shape is fixed and documented, and every field
// is present with a defined value, because getStaticProps refuses `undefined`
// and a component receiving a half-shape cannot tell it from CMS data.
//
// Every one of them returns `[]` / `{}` rather than throwing. See read.js.
//
// Each one takes its row source as `read`, defaulting to `readPublished`. That
// parameter is the whole of the Studio preview's content path: draft mode swaps
// in `readEditable` (draft.js) and the shaping below — which is where every
// normalisation, fallback and filter that the site depends on lives — runs
// unchanged over the unpublished bodies. A second set of "same but for drafts"
// readers would be four more places for the public site's behaviour to drift
// away from what an editor was shown before they published.


import { documentId, imageValue, plainText, readPublished, slugValue, stringValue } from './read.js'

/**
 * The row a body came from, when there is one — as a spread, never as a key
 * holding null.
 *
 * `getSiteCopy` has answered with `id` since the two homepage blocks became
 * clickable; the lists below did not, and a consultant or a review on the page
 * had nothing to name when an editor clicked it. They do now, on exactly the
 * terms `read.js` sets: only `readEditable` attaches `_id`, so a published read
 * produces no key at all.
 *
 * A spread rather than `id: null` because these shapes are serialised into the
 * `__NEXT_DATA__` of a statically generated public page. A key that is always
 * present and always null would change the bytes of every homepage response in
 * exchange for a value nothing on the public site reads — the same argument
 * `editableDoc` in server/site/homepage.js is a spread for.
 */
const provenance = (data) => {
    const id = documentId(data)
    return id ? { id } : {}
}

// --- siteCopy ---------------------------------------------------------------

/**
 * Published copy blocks for one page, keyed by their `key` field — the contract
 * with the code (siteCopy.js), so a component looks up "index.whoWeAre" rather
 * than trusting an array position an editor can reorder.
 *
 * `id` is the document this block came from, and it is null for every read the
 * public site makes — only `readEditable` attaches one. It is here so that the
 * Studio preview can hand a section something to write back to; what decides
 * whether it reaches a component is homepage.js, not this function.
 *
 * @returns {Promise<Record<string, {id, key, title, headline, body, bodyText,
 *                                   image, gallery, questions, items}>>}
 */
export const getSiteCopy = async ({ page = 'index', read = readPublished } = {}) => {
    const rows = await read({
        type: 'siteCopy',
        filters: page ? { 'data.page': page } : undefined,
        sort: { field: 'data.key', direction: 'asc' },
        perPage: 100,
    })

    const blocks = {}
    for (const data of rows) {
        const key = slugValue(data.key)
        if (!key) continue
        blocks[key] = {
            id: documentId(data),
            key,
            title: stringValue(data.title),
            // The block's one hand-broken element, verbatim: `stringValue`, not
            // `plainText`, because the breaks ARE the value. See siteCopy.js.
            headline: stringValue(data.headline),
            // The accented tail of `headline`, as its own value — one entry is a
            // coloured span, several are a typing animation swapping between
            // them. Kept apart from the headline because a mark inside a string
            // can say which words are accented and nothing else; it has nowhere
            // to put a second wording. See `accent` in src/cms/site/fields.js.
            accent: Array.isArray(data.accent)
                ? data.accent.map((entry) => stringValue(entry)).filter(Boolean)
                : [],
            body: stringValue(data.body),
            bodyText: plainText(data.body),
            image: imageValue(data.image, stringValue(data.title)),
            // The set, in editor order. The fallback alt is empty and NOT the
            // block's title, which is the trap `image` above lives with: a title
            // in an alt attribute is the block's heading read out twice, and the
            // one set this field has is a deck whose cards print their caption
            // directly under the picture. An asset with its own alt keeps it.
            gallery: Array.isArray(data.gallery)
                ? data.gallery.map((entry) => imageValue(entry, '')).filter(Boolean)
                : [],
            // Question and answer, named. `items` stays the shape a block
            // written before this field carries; which one a section reads is
            // decided in homepage.js, not here.
            questions: Array.isArray(data.questions)
                ? data.questions
                    .map((pair) => ({
                        question: stringValue(pair?.question),
                        answer: stringValue(pair?.answer),
                    }))
                    .filter((pair) => pair.question)
                : [],
            items: Array.isArray(data.items)
                ? data.items.map((item) => ({
                    lead: stringValue(item?.lead),
                    label: stringValue(item?.label),
                    value: stringValue(item?.value),
                    note: stringValue(item?.note),
                }))
                : [],
        }
    }
    return blocks
}
