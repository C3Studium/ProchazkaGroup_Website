// Co čte tenhle web — SERVER ONLY.
//
// Čtyři čtenáře typů dokumentů, které existují na tomhle webu a nikde jinde:
// partner, recenze, asistentka, poradce. Dřív bydlely v knihovně, ve
// `@/cms/server/site/content.js`, vedle `getSiteCopy` — a to bylo špatně
// položené: `getSiteCopy` je obecný (blok textu podle klíče), tyhle čtyři ne.
// Jméno „poradce" je slovník jedné firmy a knihovna, která ho vydává, nutí
// každý další web ho mít.
//
// Tvar odpovědi se nezměnil, jen adresa. Importuje se `@/lib/site`.

import { countsFor } from '@/cms/server/reactions.js'
import {
    documentId,
    imageValue,
    numberValue,
    plainText,
    readPublished,
    slugValue,
    stringValue,
} from '@/cms/server/site'
import { displayNameOf, reviewSubjectType } from '@/cms/site/types'
import { rosterFromCms } from '@/constants/roster'

/** Řádek, ze kterého tělo pochází — jako spread, nikdy jako klíč s null. */
const provenance = (data) => {
    const id = documentId(data)
    return id ? { id } : {}
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


/**
 * Poradci tak, jak je kreslí lišta — pro každou stránku, ne jen pro /o-nás.
 *
 * Navigace je namountovaná v `_app` vedle stránky, ne uvnitř ní, takže žádné
 * `getStaticProps` jí nepatří a nemůže si nic načíst sama. Stejná situace jako
 * u patičky a u asistentky, a stejné řešení: každá stránka to veze na svých
 * propech a `_app` to předá dál.
 *
 * Zkrácené na tvar rosteru schválně. `getConsultants` vrací celý dokument
 * včetně příběhu a e-mailu, a to by jelo v propech každé stránky webu kvůli
 * seznamu jmen s fotkou.
 */
export const getRoster = async ({ read = readPublished } = {}) =>
    rosterFromCms(await getConsultants({ kind: 'consultant', read }))
