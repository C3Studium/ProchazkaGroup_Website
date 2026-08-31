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

import { displayNameOf, reviewSubjectType } from '@/cms/site/types'
import { countsFor } from '../reactions.js'

import { documentId, imageValue, numberValue, plainText, readPublished, slugValue, stringValue } from './read.js'

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

// --- partner ----------------------------------------------------------------

/**
 * Partners in editor order. `kind` splits the financial institutions the group
 * can quote from ("financial") from the local businesses giving clients a
 * discount ("local") — see partner.js.
 *
 * @returns {Promise<{id?, name, slug, kind, logo, url, description, order}[]>}
 */
export const getPartners = async ({ kind, limit = 100, read = readPublished } = {}) => {
    const rows = await read({
        type: 'partner',
        filters: kind ? { 'data.kind': kind } : undefined,
        sort: { field: 'data.order', direction: 'asc' },
        perPage: limit,
    })

    return rows
        // `active` is the editor's "show this on the web" switch. Absent means
        // an older document written before the field existed, which should show.
        .filter((data) => data.active !== false)
        .map((data) => ({
            // The row this partner came from, so a logo on the orbit can be
            // clicked and open that partner's own form (EDIT-SURFACES, round
            // four §4). Absent on every public read, on the terms `provenance`
            // states above — the ring is fourteen pictures to a visitor.
            ...provenance(data),
            name: stringValue(data.name),
            slug: slugValue(data.slug),
            kind: stringValue(data.kind, 'financial'),
            logo: imageValue(data.logo, stringValue(data.name)),
            url: stringValue(data.url),
            description: stringValue(data.description),
            order: numberValue(data.order, 100),
        }))
        // The query orders on data->order, which is jsonb ordering; sorting the
        // page again here is cheap and makes the result independent of it.
        .sort((a, b) => a.order - b.order)
}

// --- review -----------------------------------------------------------------

/**
 * Approved reviews only. `approved` is the field that exists precisely so that
 * a submission is not on the site the moment it is inserted (review.js), so it
 * is filtered in the query AND asserted again below — the filter goes through
 * `data->>approved`, and a document written with the string "false" would pass
 * a text comparison this side of it.
 *
 * @returns {Promise<{customerName, consultantName, message, hashtag, likes, order}[]>}
 */
export const getApprovedReviews = async ({ limit = 12, hashtag, read = readPublished } = {}) => {
    const rows = await read({
        type: 'review',
        filters: {
            'data.approved': true,
            ...(hashtag ? { 'data.hashtag': hashtag } : {}),
        },
        sort: { field: 'data.order', direction: 'asc' },
        perPage: limit,
        // The one published read that carries ids — see read.js. Without it a
        // card has no name to send when somebody agrees with it.
        withIds: true,
    })

    const reviews = rows
        .filter((data) => data.approved === true || data.approved === 'true')
        .map((data) => ({
            ...provenance(data),
            customerName: stringValue(data.customerName),
            consultantName: stringValue(data.consultantName),
            message: stringValue(data.message),
            hashtag: stringValue(data.hashtag, 'poradce'),
            likes: numberValue(data.likes, 0),
            order: numberValue(data.order, 0),
        }))
        .filter((review) => review.message)

    /**
     * `likes` above is the BASELINE — the count carried over from the old
     * database — and what a reader should see is that plus every vote since.
     * The votes live in `cms_reaction` rather than in the document, because
     * publishing overwrites `data` and would throw them away; migrations/0012
     * says it in full.
     *
     * One query for the whole page rather than one per card. Failure is
     * swallowed: a wall that renders with slightly low numbers is better than a
     * wall that does not render, and the counter is not what the page is for.
     */
    try {
        const counts = await countsFor('review', reviews.map((review) => review.id))
        for (const review of reviews) review.likes += counts.get(review.id) || 0
    } catch (error) {
        console.warn(`[cms] počty „líbí se" se nenačetly — ${String(error?.message || error)}`)
    }

    return reviews
}

// --- assistant --------------------------------------------------------------

/**
 * The one person the contact sheet in the navigation is addressed to.
 *
 * Answers with nulls rather than nothing when the row is missing, so the sheet
 * can render its own empty state instead of the caller having to decide what an
 * absent assistant looks like. One row is expected; the first by `order` wins.
 *
 * @returns {Promise<{name, role, phone, email, photo}|null>}
 */
export const getAssistant = async ({ read = readPublished } = {}) => {
    const rows = await read({
        type: 'assistant',
        sort: { field: 'data.order', direction: 'asc' },
        perPage: 1,
    })

    const data = rows[0]
    if (!data) return null

    const name = stringValue(data.name)
    return {
        // Her own row, so the contact sheet can open her own form when an editor
        // clicks the half of it she is on. Absent on every public read — see
        // `provenance` above.
        ...provenance(data),
        name,
        role: stringValue(data.role),
        phone: stringValue(data.phone),
        email: stringValue(data.email),
        photo: imageValue(data.photo, name),
    }
}

// --- consultant -------------------------------------------------------------

/**
 * Consultants in editor order. "Benefit Program" is in this type too and is not
 * a person — `kind: 'program'` — so anything rendering a list of people should
 * pass `kind: 'consultant'` rather than filter on the name.
 *
 * Archived consultants are absent, and not because of anything written here:
 * `readPublished` goes through `listPublished`, which filters
 * `archived_at is null`, and the RLS policy on cms_document repeats the
 * condition — so the anon key cannot return an archived row whatever this file
 * asks for. See migrations/0003_cms_document_archive.sql.
 *
 * `name` is composed from the three stored parts by the schema's own
 * `displayName` (src/content/types/consultant.js), reached through
 * `displayNameOf` — so the string a component prints and the string the
 * Studio shows in its list come from one function rather than two that agree
 * until someone edits one of them.
 *
 * @returns {Promise<{name, academicTitle, firstName, lastName, slug, kind, motto,
 *                    story, portrait, portraitDetail, phone, email, order,
 *                    likes, reviewCount}[]>}
 */
export const getConsultants = async ({ kind, limit = 50, read = readPublished } = {}) => {
    const rows = await read({
        type: 'consultant',
        filters: kind ? { 'data.kind': kind } : undefined,
        sort: { field: 'data.order', direction: 'asc' },
        perPage: limit,
        // The second published read that carries ids, for the same reason the
        // reviews one does: a visitor pressing „líbí se" on a colleague has to
        // name which colleague. See read.js.
        withIds: true,
    })

    const people = rows
        .map((data) => {
            const name = displayNameOf(reviewSubjectType, data)
            return {
                ...provenance(data),
                name,
                academicTitle: stringValue(data.academicTitle),
                firstName: stringValue(data.firstName),
                lastName: stringValue(data.lastName),
                slug: slugValue(data.slug),
                kind: stringValue(data.kind, 'consultant'),
                motto: stringValue(data.motto),
                story: stringValue(data.story),
                // Two photographs, two fields, each named for where it appears.
                // The second is empty for everyone migrated from `people`,
                // which has one photo column — the migration does not invent
                // one, so a component reading it must expect null.
                portrait: imageValue(data.portrait, name),
                portraitDetail: imageValue(data.portraitDetail, name),
                phone: stringValue(data.phone),
                email: stringValue(data.email),
                order: numberValue(data.order, 100),
                // Flattened out of `stats` because the section that renders
                // them prints two numbers next to two icons and has no use for
                // the nesting. Read-only in the Studio: the site increments
                // them, an editor does not type them.
                likes: numberValue(data.stats?.likes, 0),
                reviewCount: numberValue(data.stats?.reviewCount, 0),
            }
        })
        .filter((consultant) => consultant.name)
        .sort((a, b) => a.order - b.order)

    // Same arrangement as the reviews above: `likes` so far is the BASELINE
    // carried over from the old database, and the votes since live in
    // `cms_reaction` — see migrations/0012 for why they are not in the document.
    try {
        const counts = await countsFor('consultant', people.map((person) => person.id))
        for (const person of people) person.likes += counts.get(person.id) || 0
    } catch (error) {
        console.warn(`[cms] počty „líbí se" u poradců se nenačetly — ${String(error?.message || error)}`)
    }

    return people
}
