// This site, as a configuration.
//
// The CMS under `src/cms` is the library; this file is the one description of
// what THIS site is made of. A page is a route, the documents it holds, and
// where each document's fields land in the props its sections receive. Adding a
// page is an entry here plus a file in `src/pages`; `src/cms/server/pages.js`
// joins the two and reports a route that is in one and not the other.
//
// **Read `src/cms/site/fields.js` before changing a reader.** Several of the
// choices below are load-bearing and were paid for: which alt an image gets,
// whether a run of labels is padded or truncated, which order keys come out in.
// The comments say which.
//
// **Declaration order is output order.** These props are serialised into the
// `__NEXT_DATA__` of a statically generated public page, so the order blocks and
// fields are written in is bytes on the wire. The blocks below are in the order
// the homepage's old hand-written seam emitted them, and the acceptance test for
// this whole exercise is that the rendered page did not change by one byte.
//
// **The document keys are not declared here.** They live in
// `@/cms/visualEditing`, which is zero-dependency and importable from a browser
// bundle, because the Studio needs the same strings to decide whether a document
// opens as a form or as a pointer at the page. One definition, and this file is
// written against it rather than restating it.

import {
    defineBlock,
    defineBlockList,
    defineCustom,
    defineList,
    definePage,
    defineSite,
    f,
    OMIT,
} from '@/cms/site'
import { ABOUT_COPY_KEYS, HOMEPAGE_COPY_KEYS } from '@/cms/visualEditing'

const K = HOMEPAGE_COPY_KEYS
const A = ABOUT_COPY_KEYS

/* -------------------------------------------------------------------------- */
/*  The three shape mismatches on the homepage that the reader vocabulary does */
/*  not absorb. Each says what the mismatch is and why it is real.             */
/* -------------------------------------------------------------------------- */

/**
 * The ring's fourteen logos.
 *
 * A bare URL to a visitor and an entry that names its partner to an editor: the
 * id is what turns a picture on a path into that partner's own document, and a
 * visitor has nothing to open. Wrapping all fourteen in objects on the public
 * page would put fourteen more objects in the `__NEXT_DATA__` of every homepage
 * response in exchange for a key nothing there reads.
 *
 * A per-document reader cannot express "a string here and an object there", and
 * it should not: the two answers are different types, and that is this one
 * component's own bargain rather than a pattern to generalise.
 *
 * A partner with no logo is dropped rather than rendered empty — a broken image
 * on the ring is worse than a shorter ring.
 */
const orbitLogo = (partner, { draft }) => {
    if (!partner.logo?.src) return OMIT
    return draft && partner.id ? { src: partner.logo.src, id: partner.id } : partner.logo.src
}

/**
 * A quote, as ReviewsPreview draws it.
 *
 * Both strings are composed out of two fields each, which is why they are a
 * function and not two readers: `tag` drops the ordinal because the section
 * numbers each quote from its position in the pool and prints the category
 * after it — "#poradce", not "01#poradce" — and `author` drops the city the
 * placeholder line promises ("| Jméno a město - klienta") because `review` has
 * a customer name and nothing geographic. The city is dropped rather than
 * invented.
 *
 * Nothing composed here has one field behind it, so nothing here can be edited
 * in place; the section annotates a quote as a whole document instead, and
 * clicking it opens the form an editor already knows from Schvalování recenzí.
 */
const reviewQuote = (review, { draft }) => ({
    tag: `#${review.hashtag}`,
    text: review.message,
    author: `| ${review.customerName}`,
    ...(draft && review.id ? { docId: review.id } : {}),
})

/**
 * The three cards of the deck: one component, three photographs, one popup.
 *
 * The mismatch is real and is not one block's shape: `index.clients.gallery` is
 * the set an editor reorders, while the caption printed under a card is still
 * its own block's `title` — a caption is copy and the set is pictures. So four
 * documents meet on three cards, and which caption belongs to which picture is
 * a pairing that has to be made across them.
 *
 * It is made on the ASSET rather than on the position. Reordering the set moves
 * a photograph past a caption that never moved, and matching by index would
 * hand card two's words to card one's picture the first time anybody dragged
 * anything.
 *
 * What that cannot do, stated rather than hidden: a picture REPLACED in the set
 * matches nothing and falls back to the caption standing in its position. That
 * is the right answer for a swap and the wrong one for an insert, and the model
 * has no way to tell them apart — the fix is a caption that travels inside the
 * member, which stops the field being a set of images and stops the popup being
 * `imageSet`. Left as it is deliberately; see EDIT-SURFACES round four §3.
 *
 * With no set stored, the deck is read exactly as it was before the field
 * existed — one block per card, photograph and caption together. Missing blocks
 * stay in the list as nulls so the component can merge by index; dropping them
 * would shift card three's photo onto card two.
 */
const deckCards = ({ copy, draft }) => {
    const blocks = K.clientCards.map((key) => copy[key] || null)
    const panel = copy[K.clients] || null
    const set = panel?.gallery || []
    // `alt=""` on every card: the caption is printed directly under the picture,
    // and repeating it in an alt attribute is the same words once for a reader
    // and once for a screen reader. The same refusal `f.image({ alt: 'none' })`
    // makes for the dotaz block.
    const docOf = (block) => (draft && block?.id ? { docId: block.id } : {})

    if (!set.length) {
        return blocks.map((block) =>
            block
                ? {
                    caption: block.title || '',
                    photo: block.image ? { src: block.image.src, alt: '' } : null,
                    ...docOf(block),
                }
                : null,
        )
    }

    const taken = new Set()
    return set.map((photo, index) => {
        let at = blocks.findIndex((block, i) => !taken.has(i) && block?.image?.src === photo.src)
        if (at < 0 && !taken.has(index)) at = index
        if (at >= 0) taken.add(at)
        const block = at >= 0 ? blocks[at] : null
        return {
            caption: block?.title || '',
            photo: { src: photo.src, alt: '' },
            // The caption's document, which is the card's own block ...
            ...docOf(block),
            // ... and the set's, which is the panel's. Two documents meet on one
            // card and the annotations are for different things: the words
            // belong to the card, the picture belongs to the deck.
            ...(draft && panel?.id ? { setDocId: panel.id, setField: 'gallery' } : {}),
        }
    })
}

/* -------------------------------------------------------------------------- */

const homepage = definePage({
    route: '/',
    title: 'Úvodní stránka',
    // Every siteCopy block of this page, in one round trip, keyed by `key`.
    copy: 'index',
    sources: {
        // Only the financial institutions: the orbit is the "which markets can
        // we quote from" strip, not the local discount partners.
        partners: { type: 'partner', kind: 'financial' },
        reviews: { type: 'review', limit: 12 },
        // "Benefit Program" is a row of this type and not a person.
        consultants: { type: 'consultant', kind: 'consultant' },
    },
    blocks: [
        // MainIntro.
        //
        // The <h1> is `headline`, not an item and not the block's `title`: it is
        // one element holding three `<br />`s and one accented run. `title`
        // stays what it is for this block — the name an editor reads in the
        // Studio's list — because it is not on the page.
        //
        // The "Máme více než / 3000 klientů" line is still absent: it is set
        // with a `<br />` too, and it is the aside rather than the heading, so
        // it wants a second hand-broken element that this type has one of.
        //
        //   items[0]  "Scroll down"
        //   items[1]  the pojistné badge — label is its aria-label, value its
        //             target. The ring's letters are one <span> each, so the
        //             link is annotated as an icon: target only.
        //   items[2]  the Recenze button's words
        defineBlock({
            at: 'hero',
            key: K.hero,
            title: 'Úvodní obrazovka',
            fields: {
                heading: f.lines('headline'),
                photo: f.image(),
                scrollHint: f.label(0),
                badge: f.link(1),
                reviewsCta: f.label(2),
                docId: f.docId(),
            },
        }),
        // The three panels of the horizontal ride land under one key, because
        // one component renders all of them and passing four props through it
        // would put the seam's shape in `src/pages/index.js`.
        //
        //   items[0..3]  the four stats, label AND value
        //   items[4]     the lead paragraph
        //   items[5]     the heading
        //   items[6]     "Scroll down"
        //   items[7]     the Mám zájem button's words
        defineBlock({
            at: 'horizontal.firstTime',
            key: K.firstTime,
            title: 'Poprvé u nás',
            fields: {
                stats: f.rows({ from: 0, count: 4, pick: ['value', 'label'] }),
                lead: f.label(4),
                heading: f.label(5),
                scrollHint: f.label(6),
                cta: f.label(7),
                docId: f.docId(),
            },
        }),
        // The paragraph is ONE element — two SplitTexts with a `<br />` between
        // them — stored as one string with a `\n` in it, in `headline`. `lines`
        // is that string cut at the break, which is what the component renders
        // and what it rendered before this field existed.
        //
        //   items[0]  "Benefit program."   } the pre-`headline` address of
        //   items[1]  the sentence under it } the same two lines
        //   items[2]  the Zobrazit button's words
        //   items[3]  "Scroll down"
        defineBlock({
            at: 'horizontal.clients',
            key: K.clients,
            title: 'Pro naše klienty',
            fields: {
                heading: f.text('title'),
                paragraph: f.lines('headline'),
                // Padded, not truncated: these two are named positions standing
                // in for one hand-broken value, and a blank first line must stay
                // blank rather than promote the second into its place.
                lines: f.rawLines('headline', { fallback: f.labels({ from: 0, count: 2, pad: true }) }),
                cta: f.label(2),
                scrollHint: f.label(3),
                docId: f.docId(),
            },
        }),
        defineCustom({ at: 'horizontal.cards', title: 'Balíček fotek', resolve: deckCards }),
        //   items[0]  the Zobrazit button's words
        defineBlock({
            at: 'horizontal.join',
            key: K.join,
            title: 'Přidejte se k nám',
            fields: {
                heading: f.text('title'),
                // Plain reading: the paragraph is sliced per word by SplitText,
                // and a `<p>` in the middle of that is a bug you only see in the
                // browser.
                text: f.plain(),
                photo: f.image(),
                cta: f.label(0),
                docId: f.docId(),
            },
        }),
        // Declared before the block below because `partnerLogos` is the first
        // key `offers` emits, and declaration order is output order.
        defineList({ at: 'offers.partnerLogos', source: 'partners', shape: orbitLogo, title: 'Loga partnerů' }),
        defineBlock({
            at: 'offers',
            key: K.offers,
            title: 'Nabídky',
            fields: {
                copyLines: f.markedLabels(),
                photo: f.image(),
                // The word the section spells out a character at a time. It is
                // the block's own `title`, which was already stored and simply
                // never read — the section had it hardcoded twice over.
                title: f.text('title'),
                docId: f.docId(),
                // Which mark the copy lines carry, for the annotation the
                // overlay reads. Draft-only, and after `docId` because that is
                // the order the hand-written seam emitted them in.
                copyMark: f.markName('items.*.label'),
            },
        }),
        defineBlock({
            at: 'whoWeAre',
            key: K.whoWeAre,
            title: 'Kdo jsme',
            fields: {
                text: f.plain(),
                photo: f.image(),
                docId: f.docId(),
            },
        }),
        defineList({ at: 'reviews', source: 'reviews', shape: reviewQuote, title: 'Recenze' }),
        // The section's heading is `headline` — "Prohlédněte si další<br />
        // recenze". The two typed links beside it are still absent: their words
        // are a typing animation between two stored strings, so the DOM never
        // holds a settled value for an in-place editor to read back.
        //
        //   items[0]  the aside's number, label AND value
        //   items[1]  "Scroll down"
        defineBlock({
            at: 'reviewsCopy',
            key: K.reviews,
            title: 'Recenze — okolí',
            fields: {
                heading: f.lines('headline'),
                asideValue: f.value(0),
                asideLabel: f.label(0),
                scrollHint: f.label(1),
                docId: f.docId(),
            },
        }),
        // Rendered by ChooseAdvisor, which keeps its own hardcoded placeholder
        // for the empty case. Archived consultants are already absent — the
        // typed reader goes through `listPublished` and the RLS policy repeats
        // the condition — so nothing downstream has to filter them again.
        defineList({ at: 'consultants', source: 'consultants', title: 'Poradci' }),
        //   items[0]  "Kde nás najdete |"
        //   items[1]  the street address
        //   items[2]  "Potřebujete poradit? | 8-16"
        //   items[3]  the office telephone — label is what is printed, value is
        //             the tel: target
        //   items[4]  the claim above the form
        //   items[5]  "Zavolejte nebo napište"
        //   items[6]  the city under the selected advisor's name
        defineBlock({
            at: 'advisorsCopy',
            key: K.advisors,
            title: 'Zvolit poradce',
            fields: {
                whereHead: f.label(0),
                address: f.label(1),
                helpLine: f.label(2),
                phone: f.link(3),
                claim: f.label(4),
                callText: f.label(5),
                city: f.label(6),
                docId: f.docId(),
            },
        }),
        //   items[0]  "Vyplňte formu"
        //   items[1]  "Preferovaný čas hovoru"
        //   items[2]  "Od"
        //   items[3]  "Do"
        //   items[4]  the "více" link's words
        //   items[5]  the submit button's words
        //
        // The three required labels are absent: each is `Jméno<Req />&nbsp;|`,
        // and the asterisk and the rule are drawn by elements inside the label
        // rather than characters in it — an in-place edit would read them back
        // as part of the word and store "Jméno* |".
        defineBlock({
            at: 'advisorFormCopy',
            key: K.advisorForm,
            title: 'Zvolit poradce — formulář',
            fields: {
                heading: f.label(0),
                timeLabel: f.label(1),
                timeFrom: f.label(2),
                timeTo: f.label(3),
                moreLabel: f.label(4),
                submit: f.label(5),
                docId: f.docId(),
            },
        }),
        //   items[0]  the Kontakt tab
        //   items[1]  the QNA tab
        //   items[2]  "Odpověď"
        defineBlock({
            at: 'qna',
            key: K.qna,
            title: 'Dotazy — úvod',
            fields: {
                // "Máte nějaký<br />dotaz?"
                heading: f.lines('headline'),
                text: f.plain(),
                // The photo sits beside the block's own heading, so the title in
                // an alt attribute would be the same words twice. See
                // `f.image`'s note on why `getSiteCopy`'s alt is refused here.
                photo: f.image({ alt: 'none' }),
                contactTab: f.label(0),
                qnaTab: f.label(1),
                answerHeading: f.label(2),
                docId: f.docId(),
            },
        }),
        // The pairs, held together because that is what they are, and because
        // the answer on screen is whichever question is open — so both addresses
        // have to fall out of one index. `field` is which array they came from,
        // so the popup that opens the block whole writes back to the shape that
        // is actually stored.
        defineBlock({
            at: 'qna.questions',
            key: K.qnaQuestions,
            title: 'Dotazy — otázky',
            fields: {
                items: f.pairs(),
                docId: f.docId(),
                field: f.pairsField(),
            },
        }),
        //   items[0..3]  Jméno / Email / Tel. číslo / Subjekt
        //   items[4]     the "+420" prefix
        //   items[5]     "Téma:"
        //   items[6..11] the six topic buttons
        //   items[12]    "Vaše zpráva:"
        //   items[13]    the GDPR line
        //   items[14]    the "více" link's words
        //   items[15]    the send button's words
        //
        // The message the box opens with is the block's `body`, not an item: a
        // textarea's value is not a text node and has no element on the page,
        // and the Studio locks a whole field at a time — with it on an item it
        // would have been editable nowhere at all.
        defineBlock({
            at: 'qna.form',
            key: K.qnaForm,
            title: 'Dotazy — formulář',
            fields: {
                fieldLabels: f.labels({ from: 0, count: 4 }),
                prefix: f.label(4),
                topicsLabel: f.label(5),
                topics: f.labels({ from: 6, count: 6 }),
                messageHeading: f.label(12),
                message: f.plain(),
                gdpr: f.label(13),
                moreLabel: f.label(14),
                submit: f.label(15),
                docId: f.docId(),
            },
        }),
    ],
})

/* -------------------------------------------------------------------------- */
/*  /o-nas                                                                    */
/* -------------------------------------------------------------------------- */
//
// Three things about this page are decided here and nowhere else.
//
// **The CMS supplies copy for the sections that exist; it does not decide how
// many there are.** /o-nas is one continuous scroll timeline: the hero erases
// itself against the showcase track's position, and that track's width is
// `TRACK_VW` in `aboutStack.js` — three pairs, computed. A fourth card in the
// CMS would not appear at the end of the track, it would move the seam the hero
// is clipped to. So the showcase and the history are `defineBlockList` over a
// fixed, declared key list: an editor changes what a card says, not how many
// cards the page has, and adding one is a code change as it was before.
//
// **`items[].label` carries a highlight mark on the homepage and not here.**
// The mark is declared on the field (siteCopy's `options.mark`) and honoured by
// whichever component decodes it — Offers does, because it renders an accent
// span. Nothing on /o-nas does, so nothing here reads it: these lines go through
// `f.labels` / `f.labelsCompact`, which render the stored string verbatim, and
// `editable()` emits no `data-cms-mark`. The overlay then offers plain-text
// editing and no *Zvýraznit* button, which is the truth about what these lines
// can show.
//
// **The roster in Colleagues is the consultant type, not a siteCopy block.** A
// consultant has to open their own popup, a popup needs a document id, and an
// id can only come from the document. Who is on the page is decided by `status`
// and `archived_at` and by nothing declared here: the typed reader goes through
// `listPublished`, and the RLS policy on cms_document repeats both conditions.
// An eleventh consultant therefore appears the moment they are published, in the
// place their `order` gives them — the opposite of the rule the showcase and the
// history follow, and the right way round for this one: those are fixed-length
// lists the scroll geometry is computed from, and this is a list of people whose
// length is the thing that changes.

/** Which item of `o-nas.links` is which link. */
export const ABOUT_LINKS = Object.freeze({
    // The rotating badge over the hero -> pojistnehlaseni.cz
    badge: 0,
    // The three icons under a colleague's portrait — the office's accounts, the
    // same three whoever is selected. The fourth, the telephone, is not here and
    // never will be: it is the selected person's own number, a field of their
    // consultant document, edited in the popup that document opens.
    colleagueEmail: 1,
    colleagueFacebook: 2,
    colleagueInstagram: 3,
})

/** Which item of `o-nas.showcase.values` is which. */
export const SHOWCASE_VALUES = Object.freeze({
    // The call to action on all three cards, once — it is the same words in all
    // three, so it is one field and editing it moves all of them.
    cta: 0,
    // The six lettered discs, in the order they are read.
    valuesFrom: 1,
    valueCount: 6,
})

/** Which item of `o-nas.prompt` is which line. */
export const PROMPT_LINES = Object.freeze({
    headingFrom: 0,
    headingCount: 2,
    bodyFrom: 2,
    bodyCount: 3,
    holdFrom: 5,
    holdCount: 3,
})

/**
 * One colleague, as the panel draws them.
 *
 * The filter is here rather than in the component: a person with no photograph
 * would put an empty frame on the panel, and deciding that is shaping, not
 * rendering. It drops nobody today.
 *
 * `docId` comes FIRST in this one, which is the order the hand-written seam
 * emitted it in and therefore the order these objects are serialised in.
 */
const colleague = (person, { draft }) => {
    if (!person.name || !person.portrait?.src) return OMIT
    return {
        ...(draft && person.id ? { docId: person.id } : {}),
        name: person.name,
        motto: person.motto,
        phone: person.phone,
        portrait: person.portrait,
        // The second photograph, shown when the pointer rests on the one already
        // up. Empty for everyone imported from the live `people` table — it has
        // a single image column — and the panel simply does not turn over for
        // them, which is what it already did for the six people in
        // src/constants/people.js with no `srcAlt`.
        portraitAlt: person.portraitDetail,
    }
}

const aboutUs = definePage({
    route: '/o-nas',
    title: 'O nás',
    copy: 'o-nas',
    sources: {
        consultants: { type: 'consultant', kind: 'consultant' },
    },
    blocks: [
        defineBlock({
            at: 'hero',
            key: A.hero,
            title: 'Úvod stránky',
            fields: {
                title: f.text('title'),
                // Compact: these are three marks, a list whose length is its
                // content, so a blank item is not a mark and must not leave one.
                marks: f.labelsCompact(),
                photo: f.image(),
                docId: f.docId(),
            },
        }),
        // The badge is a link and links live in their own block, so it carries
        // that block's document id rather than the hero's — the element has to
        // name the document it writes to.
        defineBlock({
            at: 'hero.badge',
            key: A.links,
            title: 'Odkazy mimo web',
            fields: {
                text: f.label(ABOUT_LINKS.badge),
                href: f.value(ABOUT_LINKS.badge),
                docId: f.docId(),
            },
        }),
        defineBlock({
            at: 'showcase',
            key: A.showcase,
            title: 'Karty — společná poznámka',
            fields: {
                // The standing note under all three cards. Plain reading,
                // because it is rendered into a paragraph carrying no markup.
                footnote: f.plain(),
                docId: f.docId(),
            },
        }),
        // The button and the six discs belong to the section rather than to any
        // card, and they are a second block rather than more items on the one
        // above: that note is the section's own voice and these are labels.
        defineBlock({
            at: 'showcase.extras',
            key: A.showcaseValues,
            title: 'Karty — tlačítko a hodnoty',
            fields: {
                cta: f.label(SHOWCASE_VALUES.cta),
                values: f.labels({ from: SHOWCASE_VALUES.valuesFrom, count: SHOWCASE_VALUES.valueCount, pad: true }),
                docId: f.docId(),
            },
        }),
        defineBlockList({
            at: 'showcase.members',
            keys: A.showcaseMembers,
            title: 'Karty',
            fields: {
                label: f.text('title'),
                // The card's ordinal. Stored as the item's `lead` — which is
                // what that field is for — rather than as a second title.
                index: f.lead(0),
                // Plain reading for the same reason WhoWeAre's is: SplitText
                // slices this per word, and a `<p>` in the middle of it is a bug
                // you only see in the browser.
                quote: f.plain(),
                photo: f.image(),
                docId: f.docId(),
            },
        }),
        defineBlock({
            at: 'colleagues',
            key: A.colleagues,
            title: 'Naši kolegové',
            fields: {
                // The heading is set as two lines, each with its own rule drawn
                // under it, so it is stored as two items rather than one string
                // split on a space: each line is an element an editor can click,
                // and a field can only be written by one element.
                headingLines: f.labelsCompact(),
                docId: f.docId(),
            },
        }),
        // The three icons beside the portrait. Targets only — an icon has no
        // words on screen to edit — so what travels is the href and the block to
        // write it to.
        defineBlock({
            at: 'colleagues.links',
            key: A.links,
            title: 'Odkazy mimo web',
            fields: {
                email: f.value(ABOUT_LINKS.colleagueEmail),
                facebook: f.value(ABOUT_LINKS.colleagueFacebook),
                instagram: f.value(ABOUT_LINKS.colleagueInstagram),
                docId: f.docId(),
            },
        }),
        defineList({ at: 'colleagues.roster', source: 'consultants', shape: colleague, title: 'Kolegové' }),
        // The threshold between the team and the history: a question in two
        // lines, three lines under it, and the three words inside the button
        // that is held. All nine are hard line breaks in the component, so each
        // one is its own item — an element can only write one field, and a <br>
        // is nothing at all to the in-place editor (it reads `textContent`).
        // Padded, because every one of these positions is named.
        defineBlock({
            at: 'prompt',
            key: A.prompt,
            title: 'Pokračovat na historii',
            fields: {
                heading: f.labels({ from: PROMPT_LINES.headingFrom, count: PROMPT_LINES.headingCount, pad: true }),
                body: f.labels({ from: PROMPT_LINES.bodyFrom, count: PROMPT_LINES.bodyCount, pad: true }),
                hold: f.labels({ from: PROMPT_LINES.holdFrom, count: PROMPT_LINES.holdCount, pad: true }),
                docId: f.docId(),
            },
        }),
        defineBlockList({
            at: 'history',
            keys: A.historyPanels,
            title: 'Historie',
            fields: {
                // The numeral set large behind the panel. A position in a list of
                // four the track's width is computed from, so an editor changes
                // what it says and not how many there are.
                numeral: f.label(0),
                date: f.text('title'),
                // Plain reading: it is drawn out from behind its own edge by a
                // clip-path, and a `<p>` inside that `<p>` is a bug you only see
                // in the browser.
                body: f.plain(),
                // `alt: 'own'` refuses the block's title as a stand-in alt: the
                // title here is the panel's dateline, and a date is not a
                // description of a picture. These four ship `alt=""` and keep
                // doing so.
                photo: f.image({ alt: 'own' }),
                docId: f.docId(),
            },
        }),
    ],
})

export default defineSite({
    pages: [homepage, aboutUs],
})
