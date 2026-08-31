// What the patička reads — SERVER ONLY.
//
// The one block that belongs to no page. `_app` renders `<SiteFooter />` under
// every route, and `_app` has no data fetching in the Pages Router that does not
// cost the whole site its static generation (`App.getInitialProps` opts every
// page out of it). So the block travels the only way it can: each page's own
// `getStaticProps` puts it in `props.footer`, and `_app` reads it off
// `pageProps`. A page that has no `getStaticProps` hands down nothing and the
// footer renders the copy it ships with — which is the same fallback every
// section of this site already has, not a new rule.
//
// **The single-line rule stands; the claim is wired anyway, a line at a time.**
// `@/cms/edit/overlay/text.js` is still single-line by design — Enter commits,
// and the value it stores is `textContent`, where a `<br>` is nothing at all —
// so annotating an element that holds a hard line break would weld its two lines
// together on the first save. That has not changed and was re-checked. What
// changed is where the break lives: the claim and its call to action are now one
// item per line, and the component sets each line in its own `<span>` with the
// `<br />` between the spans rather than inside one. Nothing about the editor had
// to move, and no line an editor clicks holds a break.
//
// Three blocks, not one. `global.footer` is the address column on the right;
// `global.footer.claim` is the half on the left, which is the one set with hard
// breaks; `global.footer.links` is the telephone, the e-mail and the two social
// buttons, because a target is not copy and the two halves of a link are edited
// by two different affordances. `global.contact` is the sheet the navigation
// opens — under every route for the same reason the patička is.

import { GLOBAL_COPY_KEYS } from '@/cms/visualEditing'

// One place decides which of the three readers answers a call — published,
// draft or a moment in the archive. See ./archive.js.
import { readerFor, viewOf } from './archive.js'
import { getAssistant, getSiteCopy } from './content.js'

export const FOOTER_KEY = GLOBAL_COPY_KEYS.footer
export const GLOBAL_KEYS = GLOBAL_COPY_KEYS

// Which item is which line of the footer. The block is a list, so the lines are
// addressed by position, and this is where the positions are named.
//
// The component still spells them as literals — `items.1.label` in the
// annotation — and it has to: this module is server-only and `SiteFooter` is on
// every public route, so it cannot import the names. They agree in one
// direction (this reader turns positions into named props) and the annotation is
// the one place the number is repeated; the comment in the component points
// back here.
export const FOOTER_LINES = Object.freeze({
    contactLead: 0,
    address: 1,
    legal: 2,
})

/** Which item of `global.footer.claim` is which line. */
export const CLAIM_LINES = Object.freeze({
    claimFrom: 0,
    claimCount: 2,
    ctaFrom: 2,
    ctaCount: 2,
    // The button beside them. /kontakt is a path on this site, so its words are
    // editable and its target is not — there is nowhere to store one and nothing
    // that would read it.
    button: 4,
})

/** Which item of `global.footer.links` is which link. */
export const FOOTER_LINKS = Object.freeze({
    telephone: 0,
    email: 1,
    facebook: 2,
    instagram: 3,
})

/** Which item of `global.contact` is which label of the contact sheet. */
export const CONTACT_LINES = Object.freeze({
    name: 0,
    email: 1,
    phone: 2,
    dialPrefix: 3,
    timeLead: 4,
    timeFrom: 5,
    timeTo: 6,
    consent: 7,
    // The word inside the consent line that links to the policy. /ochrana-soukromi
    // is a path on this site: words only.
    consentMore: 8,
    submit: 9,
    orDirectly: 10,
    // Appended, not slotted in where it reads on the sheet — which is between
    // the preferred hour and the consent line. These are positions in an array
    // an editor has already filled in: giving the message the index it looks
    // like it deserves would have moved the four labels after it down by one
    // and left the consent line printed on the submit button.
    message: 11,
})

/**
 * The patička's copy, or an empty shape.
 *
 * Called by every page's `getStaticProps`. `draft` and `at` are the caller's
 * switches on exactly the terms ./page.js sets out: the public build calls it
 * with no arguments and therefore cannot reach a draft, an old version, or carry
 * a document id.
 *
 * @param {{ draft?: boolean, at?: string|null }} [options]
 */
// Spread-or-nothing, exactly as aboutUs.js and homepage.js do it: the id is only
// ever attached by the draft reader, so the public page cannot carry one.
const docOf = (draft, block) => (draft && block?.id ? { docId: block.id } : {})

/** A slice of a block's labels, by position, without closing gaps. */
const labelsAt = (block, from, count) =>
    Array.from({ length: count }, (_, i) => (block?.items || [])[from + i]?.label || '')

/** One item's label and target — the two halves of a link. */
const linkAt = (block, index) => {
    const item = (block?.items || [])[index]
    return { text: item?.label || '', href: item?.value || '' }
}

export const getFooterContent = async ({ draft = false, at = null } = {}) => {
    const read = readerFor({ draft, at })
    const copy = await getSiteCopy({ page: 'global', read })
    const block = copy[FOOTER_KEY] || null
    const claim = copy[GLOBAL_KEYS.footerClaim] || null
    const links = copy[GLOBAL_KEYS.footerLinks] || null

    const labels = (block?.items || []).map((item) => item.label || '')

    return {
        // The heading over the address. `title` rather than an item because it
        // is the block's own name in the Studio's list as well as the words on
        // the page, and having both be the same string is the point of `title`.
        where: block?.title || '',
        contactLead: labels[FOOTER_LINES.contactLead] || '',
        address: labels[FOOTER_LINES.address] || '',
        legal: labels[FOOTER_LINES.legal] || '',
        ...docOf(draft, block),
        // The left half of the top row. Its own block, its own id: the element
        // that writes a field has to name the document the field is in.
        claim: {
            lines: labelsAt(claim, CLAIM_LINES.claimFrom, CLAIM_LINES.claimCount),
            cta: labelsAt(claim, CLAIM_LINES.ctaFrom, CLAIM_LINES.ctaCount),
            button: labelsAt(claim, CLAIM_LINES.button, 1)[0],
            ...docOf(draft, claim),
        },
        // The four links out. Both halves travel for all of them — these four
        // print their own words as well as going somewhere.
        links: {
            telephone: linkAt(links, FOOTER_LINKS.telephone),
            email: linkAt(links, FOOTER_LINKS.email),
            facebook: linkAt(links, FOOTER_LINKS.facebook),
            instagram: linkAt(links, FOOTER_LINKS.instagram),
            ...docOf(draft, links),
        },
    }
}

/**
 * The contact sheet's own copy, on exactly the terms the patička's is read.
 *
 * A second query rather than a second return value from the one above, because
 * the two are handed to two different components through two different props and
 * a caller that wants only one should not have to know the other exists. Both
 * read the same six `page: 'global'` rows; on the file store that is a read of a
 * small array, and on Supabase two `select`s a page is built from twice a day.
 *
 * The person on the right of the sheet is NOT here. She is her own document
 * (`assistant`) and opens as her own form — see `getAssistant` in ./content.js
 * and the `editableDoc` call in the component.
 *
 * @param {{ draft?: boolean, at?: string|null }} [options]
 */
export const getContactContent = async ({ draft = false, at = null } = {}) => {
    const read = readerFor({ draft, at })
    const copy = await getSiteCopy({ page: 'global', read })
    const block = copy[GLOBAL_KEYS.contact] || null

    return {
        eyebrow: block?.title || '',
        // Plain reading. `body` is richText and this is set into a paragraph
        // that carries no markup of its own.
        claim: block?.bodyText || '',
        // By position and without closing gaps: every one of these is a named
        // label and a blank one must stay blank rather than promote the next.
        labels: labelsAt(block, 0, Object.keys(CONTACT_LINES).length),
        ...docOf(draft, block),
    }
}

// ISR, on the same terms as the homepage's: copy an editor changes a few times a
// year, and `revalidate` is what lets a publish reach the public site without a
// deploy.
const REVALIDATE_SECONDS = 600

/**
 * A whole `getStaticProps` for a page that renders nothing of its own.
 *
 * Most routes of this site are a `<Head>` and an empty `<main>` right now, and
 * the only content on them is the patička. Each still needs its own
 * `getStaticProps` — that is the only channel `_app` has — and eighteen
 * hand-written copies of the same six lines is eighteen places for the draft
 * switch to be forgotten on one of them. So it is written once:
 *
 *     import { footerStaticProps } from "@/cms/server/site"
 *     export const getStaticProps = footerStaticProps
 *
 * Assigned to a named export rather than re-exported, because Next detects
 * `getStaticProps` by static analysis of the page module and `export const` is
 * the form it is certain to see. The import costs the page nothing in the
 * browser: the SSG transform drops `getStaticProps` and the imports only it
 * uses from the client bundle.
 *
 * A page with content of its own writes its own and calls `getFooterContent`
 * alongside its own reader — see /o-nas.
 */
export const footerStaticProps = async (context) => {
    // One call, three readers. `viewOf` turns Next's preview cookie into either
    // draft mode or an archived moment, and a request carrying neither — every
    // public request — gets the published site. See ./archive.js.
    const view = viewOf(context)
    // Three things travel with every page rather than one now: the patička, the
    // contact sheet's copy and the person it is addressed to. The sheet is
    // opened from the navigation and the navigation is mounted in _app — it has
    // no props of its own to read any of them from. A page that writes its own
    // getStaticProps has to call all three alongside its own reader; see /o-nas
    // and /recenze.
    const [footer, contact, assistant] = await Promise.all([
        getFooterContent(view),
        getContactContent(view),
        getAssistant({ read: readerFor(view) }),
    ])
    return { props: { footer, contact, assistant }, revalidate: REVALIDATE_SECONDS }
}
