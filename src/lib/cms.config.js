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
    defineGlobals,
    defineList,
    definePage,
    defineSite,
    f,
    OMIT,
} from '@/cms/site'
import {
    ABOUT_COPY_KEYS,
    BENEFIT_COPY_KEYS,
    COOKIES_COPY_KEYS,
    HOMEPAGE_COPY_KEYS,
    OFFER_COPY_KEYS,
    PARTNERS_COPY_KEYS,
    PRIVACY_COPY_KEYS,
    REVIEWS_COPY_KEYS,
} from '@/cms/visualEditing'

const K = HOMEPAGE_COPY_KEYS
const A = ABOUT_COPY_KEYS
const C = COOKIES_COPY_KEYS
const P = PRIVACY_COPY_KEYS
const R = REVIEWS_COPY_KEYS
const B = BENEFIT_COPY_KEYS
const PT = PARTNERS_COPY_KEYS
const N = OFFER_COPY_KEYS

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
                // Zvýrazněný konec nadpisu jako vlastní hodnota — „jednu dekádu"
                // a „přes 12 let", které se střídají. Dřív to byla část stejného
                // řetězce mezi hvězdičkami; tam nebylo kam napsat druhou
                // variantu. Viz `accent` v src/cms/site/fields.js.
                headingAccent: f.accent(),
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
        defineCustom({
            at: 'horizontal.cards',
            title: 'Balíček fotek',
            resolve: deckCards,
            // What the lambda above reaches, said in addresses — four documents
            // that no `defineBlock` on this page names, plus one field of a
            // document that IS named. `index.clients` is declared as
            // `horizontal.clients` for its own copy; the set of photographs on
            // it is read here and nowhere else, and without this line the deck's
            // `gallery` annotation would look like an address the page has
            // stopped reading. See `defineCustom` for why an escape hatch owes
            // this.
            reads: () => [
                ...K.clientCards.map((key) => ({ key, paths: ['title', 'image'] })),
                { key: K.clients, paths: ['gallery'] },
            ],
        }),
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
        // Both only for „líbí se". `id` is normally an editing concern and is
        // withheld from a published page — the exception is written up in
        // server/site/read.js, and it is the same one the review wall has: a
        // visitor pressing the button has to name who they mean.
        id: person.id,
        likes: person.likes,
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

/* -------------------------------------------------------------------------- */
/*  /cookies                                                                   */
/* -------------------------------------------------------------------------- */
//
// A legal notice, and that decides the granularity of everything below.
//
// **A section is a block: one heading, one paragraph, together.** The obvious
// alternative — a field per sentence, or per clause of the list in §5 — reads
// well in a config file and is wrong at the desk: a cookie policy is amended by
// changing a sentence in the middle of a paragraph, and an editor handed eleven
// boxes has to work out which box the sentence is in before they can touch it.
// So `defineBlockList` over ten fixed keys, each `title` + `body`, and the
// coarsest thing that is still separately editable is a whole section.
//
// **The page decides how many sections there are; the CMS decides what they
// say.** The same rule /o-nas's showcase follows, for a different reason: there
// the track's width is computed from the card count, here each section's `id` is
// the anchor its index entry links to (`#about`, `#necessary`) and an anchor is
// an address rather than copy. So the list of ids and their order stay in
// `src/constants/cookiesTerms.js`, an eleventh section is a code change, and
// what a block supplies is words over the ones the component ships with.
//
// **The index is not annotated, and the omission is deliberate.** It prints the
// same ten headings a second time, and a field can be written by one element:
// two elements carrying `cookies.sekce.03 · title` would be two affordances for
// one value, whichever the overlay picked up second. The sections are where the
// words are read, so the sections are where they are edited — and an edit shows
// up in the index the moment the page re-renders, because it is the same string.
//
// **The two `§` eyebrows are absent, and cannot be otherwise today.** Each is
// `<em>§</em>` and its words inside one `<p>`, so the words have no element of
// their own; annotating the paragraph would store the section sign as part of
// the copy and drop its `<em>` on the first save. Giving the words a `<span>`
// would change the markup this page's stylesheet is written against, which the
// acceptance test for this work forbids.

const cookiesPage = definePage({
    route: '/cookies',
    title: 'Zásady cookies',
    copy: 'cookies',
    blocks: [
        // The head. Its `<h1>` is two lines set as a text node and a `<span>` —
        // NOT as one `headline` with a `<br />` in it, which is the shape every
        // other hand-broken heading on this site has. The overlay reads a `<br>`
        // as a break inside one value and a block child as a line of its own, so
        // this heading is two stored strings edited as one block
        // (`editableLines` over `items.*.label`), and `f.labels` pads to the two
        // named positions: a blank first line must stay blank rather than
        // promote the second into its place.
        defineBlock({
            at: 'hero',
            key: C.hero,
            title: 'Úvod stránky',
            fields: {
                heading: f.labels({ from: 0, count: 2, pad: true }),
                // Plain reading: it is set into a paragraph that carries no
                // markup of its own.
                lead: f.plain(),
                docId: f.docId(),
            },
        }),
        // "Obsah", over the sticky index. `title` rather than an item, because
        // it is the block's whole content and therefore also the name an editor
        // reads in the Studio's list — the arrangement the patička's address
        // column already uses.
        defineBlock({
            at: 'index',
            key: C.index,
            title: 'Obsah — popisek',
            fields: {
                label: f.text('title'),
                docId: f.docId(),
            },
        }),
        defineBlockList({
            at: 'sections',
            keys: C.sections,
            title: 'Oddíly',
            fields: {
                heading: f.text('title'),
                // Plain reading again, and here it is load-bearing rather than
                // stylistic: the component renders the paragraph only when there
                // is one, and the second section has a heading and no body. An
                // authored `<p>` wrapper would make that section's body a
                // non-empty string and put an empty paragraph on the page.
                body: f.plain(),
                docId: f.docId(),
            },
        }),
        //   items[0]  the button's words
        defineBlock({
            at: 'manage',
            key: C.manage,
            title: 'Správa předvoleb',
            fields: {
                heading: f.text('title'),
                cta: f.label(0),
                docId: f.docId(),
            },
        }),
    ],
})

/* -------------------------------------------------------------------------- */
/*  /ochrana-soukromi                                                          */
/* -------------------------------------------------------------------------- */
//
// The second legal notice, and it is modelled the way /cookies is because it is
// the same kind of document. What is written there about granularity is written
// once and holds here: **a section is a block — one heading, one paragraph,
// together**. A privacy notice is amended by changing a sentence in the middle
// of a clause, and an editor handed a field per sentence has to find which box
// the sentence is in before they can touch it. Nine keys, `title` + `body`, and
// the coarsest thing that is still separately editable is a whole section.
//
// **The page decides how many sections there are; the CMS decides what they
// say.** Each section's `id` is the anchor its index row links to (`#rights`,
// `#dpo`) and an anchor is an address rather than copy, so the ids and their
// order stay in `src/constants/cookiesTerms.js`. A tenth section is a code
// change, and a block is words over the ones the component ships with.
//
// **The index is not annotated.** It prints the same nine headings a second
// time and a field can be written by one element — see the note in the
// component, which is the same argument /cookies makes.
//
// **The head's eyebrow is two fields and only one of them is on the page.** It
// is `<em>GDPR</em>` and its words in one `<p>`: the tag has an element and can
// carry an annotation, the words are a bare text node and cannot. So the words
// are the block's `title` — the field that is also its name in the Studio's
// list, the arrangement the patička's address column already uses — and they are
// edited in the form. Giving them a `<span>` would change the markup this page's
// stylesheet is written against.

/** Which item of `ochrana-soukromi.hero` is which line. */
export const PRIVACY_HERO = Object.freeze({
    // The accented tag of the eyebrow. Its words are the block's `title`.
    tag: 0,
    // The `<h1>`, one line per `<span>` — the stylesheet sets them as blocks, so
    // the break is the arrangement rather than a character in a value.
    headingFrom: 1,
    headingCount: 3,
    // The line under the rule.
    lead: 4,
    // The word over the sticky index, which the disclosure a phone gets prints a
    // second time. One field, and editing it moves both.
    indexLabel: 5,
})

const privacyPage = definePage({
    route: '/ochrana-soukromi',
    title: 'Ochrana soukromí',
    copy: 'ochrana-soukromi',
    blocks: [
        defineBlock({
            at: 'hero',
            key: P.hero,
            title: 'Úvod stránky',
            fields: {
                tag: f.label(PRIVACY_HERO.tag),
                // The eyebrow's words — see the note above.
                words: f.text('title'),
                // Padded: three NAMED positions, so a blank second line must
                // stay blank rather than promote the third into its place.
                heading: f.labels({ from: PRIVACY_HERO.headingFrom, count: PRIVACY_HERO.headingCount, pad: true }),
                lead: f.label(PRIVACY_HERO.lead),
                indexLabel: f.label(PRIVACY_HERO.indexLabel),
                docId: f.docId(),
            },
        }),
        defineBlockList({
            at: 'sections',
            keys: P.sections,
            title: 'Oddíly',
            fields: {
                heading: f.text('title'),
                // Plain reading: the paragraph carries no markup of its own, and
                // the two e-mail addresses inside it are turned into `mailto:`
                // links by the component from the text itself — an authored `<p>`
                // around it would be a `<p>` inside a `<p>`.
                body: f.plain(),
                docId: f.docId(),
            },
        }),
    ],
})

/* -------------------------------------------------------------------------- */
/*  /recenze and /recenze/[slug]                                              */
/* -------------------------------------------------------------------------- */
//
// These five routes were absent from this file until publishing had to know
// which pages a document is on, and their absence was the reason
// `server/pages.js` printed "route X existuje v src/pages, ale není v
// cms.config.js" five times a render. They were registered with reads and no
// `blocks` — enough for a publish to reach them, nothing for an editor to click.
// The two below now have blocks; /nabidka and /benefit-program still do not.
//
// The rule that kept them honest is unchanged and is one line: **what a page's
// getStaticProps reads, its entry declares.** Nothing derives one from the
// other, and nothing can — a `getStaticProps` is a function body.
//
// What is content on these two, decided here and nowhere else.
//
// **A review's words are never edited here.** They are the customer's. The wall
// annotates a card as its own `review` document narrowed to moderation
// (`ACTIONS_MODERATE`), which is hide and archive and no fields, and the
// Schvalování recenzí queue is where a review is dealt with. There is no block
// below with a review's text in it and there must not be.
//
// **A consultant's own fields belong to the consultant document.** The card's
// `<h1>`, the motto under it, the portrait and the two counts are all fields of
// the person on screen, and clicking any of them opens their form
// (`editableDoc(id, 'consultant')`). Re-annotating a name as page copy would be
// two affordances for one value and a second place to change it.
//
// **What is left is the page's own voice**, and it is what these four blocks
// hold: the head of the wall, the word the grid ends on, the ask and its sheet,
// and the framing on a consultant's card. Both routes carry `copy: 'recenze'`,
// which is what makes `recenze.poradce` one block on ten pages: edited once, it
// moves every consultant's card, and `server/revalidate.js` regenerates all of
// them because `deps.js` reads the same declaration.
//
// **Two counters are absent and cannot be otherwise.** "14 recenzí" under the
// hero and "14 / 14 recenzí" over the grid are computed from how many reviews
// came back, so there is no stored value under either — and the word beside the
// number is an `<em>` whose text begins with a space, which is not a thing an
// in-place editor can hand back unchanged.

const reviewsPage = definePage({
    route: '/recenze',
    title: 'Recenze',
    copy: 'recenze',
    sources: {
        // The wall. Two hundred rather than the homepage's twelve, and the limit
        // does not change which documents are on the page, only how many.
        reviews: { type: 'review', limit: 200 },
        // The names in the form's picker.
        consultants: { type: 'consultant', kind: 'consultant' },
    },
    blocks: [
        // The head. Three fields for three elements and no positional list at
        // all, which is what this block being three separate things looks like:
        // the word over the rule, the wordmark, and the sentence under it.
        defineBlock({
            at: 'hero',
            key: R.hero,
            title: 'Recenze — úvod',
            fields: {
                // The eyebrow. `title` rather than an item, because it is also
                // the name an editor reads in the Studio's list — the
                // arrangement `cookies.obsah` and the patička already use.
                eyebrow: f.text('title'),
                // The wordmark, read PLAIN and not as lines. TextPressure sets
                // one character per `<span>`, so a break inside this value would
                // be a lettered span holding whitespace rather than a new line.
                word: f.plain(),
                // The sentence under the rule: one `<p>` with a hard `<br />` in
                // it, so one stored string cut at its breaks. `rawLines` rather
                // than `lines` deliberately — `lines` decodes the highlight the
                // field declares, and nothing on this page draws an accent span,
                // so an asterisk an editor typed would be eaten instead of
                // printed. Same refusal /o-nas makes for its labels.
                line: f.rawLines('headline'),
                docId: f.docId(),
            },
        }),
        //   items[0]  what the grid says when there is nothing left to load
        //   items[1]  what it says while the next batch is on its way
        //
        // One element shows one of the two, so the element carries the address
        // of whichever it is showing — see the note in ReviewWall. Two fields
        // and one affordance is still one element per field.
        defineBlock({
            at: 'wall',
            key: R.wall,
            title: 'Zeď recenzí',
            fields: {
                endDone: f.label(0),
                endLoading: f.label(1),
                //   items[2]  the question over the like button on every card.
                //             One field, many elements — the same words are
                //             printed on each card and in the opened review, so
                //             editing one moves all of them. Same arrangement
                //             as `nabidky`'s deal label.
                voteAsk: f.label(2),
                docId: f.docId(),
            },
        }),
        //   items[0]  the words on the button that opens the sheet
        //   items[1]  the words on the send button
        //   items[2]  what the send button wears while the POST is in flight
        //
        // The three field labels are absent and cannot be otherwise today: each
        // is `Vaše jméno <em>*</em>` in one `<span>`, so the words have no
        // element of their own and annotating the span would store the asterisk
        // as part of the copy and drop its `<em>` on the first save. The same
        // trap the homepage's advisor form states.
        defineBlock({
            at: 'form',
            key: R.form,
            title: 'Napsat recenzi',
            fields: {
                // The sheet's own eyebrow, on the terms `hero.eyebrow` is title.
                eyebrow: f.text('title'),
                open: f.label(0),
                submit: f.label(1),
                sending: f.label(2),
                // Plain reading: one line of prose under the send button,
                // carrying no markup of its own.
                note: f.plain(),
                docId: f.docId(),
            },
        }),
    ],
})

// One page per consultant — the address the QR code on their business card
// points at. `paths` is what makes this route reachable at all: the route itself
// is a template, and a publish has to name `/recenze/novak-jan`.
//
// A slug CHANGE is the case worth stating. The new address is regenerated from
// the new body and the old one from the body the publish replaced (see
// server/revalidate.js, which reads both) — the old page then renders
// `notFound: true` and stops being a page, which is what the route already does
// for a slug that belongs to nobody. Without the old body it would keep serving
// the consultant under an address the Studio no longer knows about.
const advisorPage = definePage({
    route: '/recenze/[slug]',
    title: 'Poradce',
    // The same `page` value /recenze carries, and that is the whole of how one
    // block reaches ten cards: `getSiteCopy({ page: 'recenze' })` answers with
    // every block of both routes and `resolvePage` takes the one this page
    // declares. It is also what puts these pages in a publish's revalidation
    // set — see `copyHolds` in @/cms/site/deps.
    copy: 'recenze',
    sources: {
        consultants: { type: 'consultant', kind: 'consultant' },
    },
    paths: {
        // The slug field is lenient on the way in — `{ current }` or a bare
        // string, see fieldTypes.js — so it is read rather than accessed. The
        // same normalisation `slugValue` makes in server/site/read.js, spelled
        // again because that module is server-only and this file is not.
        consultants: (body) => {
            const slug = body?.slug && typeof body.slug === 'object' ? body.slug.current : body?.slug
            return slug ? `/recenze/${slug}` : null
        },
    },
    //   items[0]  the office's city, under whoever's name is on the card
    //   items[1]  the words on the send button
    //   items[2]  what it wears while the POST is in flight
    //
    // Every field here is the PAGE's and none of them is the person's. The city
    // is the office's and is the same on all ten cards, which is exactly why it
    // is copy: it is not a fact about the consultant, it is where the group is.
    // The `<h1>`, the motto and the two counts are absent because they ARE the
    // consultant, and clicking one opens their document.
    //
    // The thanks panel is absent too. It renders only after a successful POST,
    // so no editing surface reaches it — putting its words in a block would give
    // an editor fields whose element never exists to click.
    blocks: [
        defineBlock({
            at: 'card',
            key: R.advisor,
            title: 'Karta poradce',
            fields: {
                // The ask over the form. `title` on the terms the two blocks
                // above use it: on the page, and the name in the Studio's list.
                heading: f.text('title'),
                city: f.label(0),
                submit: f.label(1),
                sending: f.label(2),
                note: f.plain(),
                docId: f.docId(),
            },
        }),
    ],
})

/* -------------------------------------------------------------------------- */
/*  /nabidka                                                                   */
/* -------------------------------------------------------------------------- */
//
// The largest page on the site — fourteen thousand characters inside `<main>`,
// which is more than / and /o-nas together — and six sections that are six
// different kinds of thing. Four decisions are made here and nowhere else.
//
// **What is annotated is decided by what has an element, not by what is copy.**
// This page is drawn with ticks, swatches and section signs set INSIDE the
// paragraph they belong to, so a great deal of its prose is a bare text node
// with markup for a sibling. Annotating the parent of one of those stores the
// swatch as part of the copy and drops it on the first save, so those lines are
// the block's `title` — the field that is also its name in the Studio's list,
// the arrangement /ochrana-soukromi's eyebrow already uses — or an ordinary
// item, and either way they are edited in the form. Giving them a `<span>` would
// change the markup this page's four stylesheets are written against.
//
// **A value drawn twice is edited in the form.** The three counts of the
// statistics band print their sentence on the tile AND in the open cell AND a
// third time in the paragraph that reads the set out for a screen reader. A
// field is written by one element; three elements carrying one address are three
// affordances for one value. So `nabidka.realita.cisla` is one block of three
// items with nothing annotated at all, which is also the right shape for it: a
// funnel is a table, and a table belongs in a form.
//
// **The offer is one block per rung, and the page decides how many rungs there
// are.** `PLAN` in OfferGrid is written against `CHAIN`'s indices — which cells
// share a row, how tall each row is, where its connector leaves and lands — so a
// fifteenth rung is a code change and a block supplies words over the ones the
// component ships with. The same bargain /cookies' ten sections make.
//
// **No photograph on this page is editable, and that is one decision rather than
// three.** The hero's is the first frame of the band below it: StatRail's first
// cell draws the identical bitmap, unoptimised, from the same path, and the pin
// change between the two sections is invisible only while they agree. The other
// two carry a crop (`position`) and a framing (`frame`) measured for the box
// that cell is cut down to, so a picture replaced without them is a subject
// standing outside its own window. All five are declared in the components, and
// an editable copy of one half of a pair is a picker that tears the handover.
//
// It ends on the homepage's advisor block — words, consultants and all — because
// it calls `getHomepageContent()` in its own getStaticProps "so the two cannot
// come to say different things". `includes` is that sentence as a declaration:
// whatever makes / stale makes this stale too.

const offerPage = definePage({
    route: '/nabidka',
    title: 'Nabídka',
    copy: 'nabidka',
    includes: ['/'],
    sources: {
        reviews: { type: 'review', limit: 40 },
    },
    blocks: [
        // The hero. The `<h1>` is `headline` — one element holding one hard
        // break and one accented run — and it is the only marked value on this
        // page, so it is the only one read through `f.lines`.
        //
        //   items[0]  the CornerButton's words. Its target is /kontakt, a path
        //             on this site, which is routing rather than content.
        //   items[1]  "Scroll"
        //
        // `title` is the eyebrow's words: a bare text node beside the tick.
        defineBlock({
            at: 'hero',
            key: N.hero,
            title: 'Úvodní obrazovka',
            fields: {
                eyebrow: f.text('title'),
                heading: f.lines('headline'),
                // Plain reading: the sentence is set into a paragraph carrying
                // no markup of its own.
                lead: f.plain(),
                cta: f.label(0),
                scrollHint: f.label(1),
                docId: f.docId(),
            },
        }),
        // The statistics band's own labels.
        //
        //   items[0]  the standing label's words, between the tick and the
        //             source — no element, edited in the form
        //   items[1]  the source beside them
        //   items[2]  the kicker over the question
        //
        // `title` is the question the band is built round. `Written` draws it a
        // letter at a time with no whitespace between the words in the DOM, so
        // the element reads back welded and cannot be annotated.
        defineBlock({
            at: 'rail',
            key: N.realita,
            title: 'Realita — popisky',
            fields: {
                title: f.text('title'),
                label: f.label(0),
                source: f.label(1),
                kicker: f.label(2),
                docId: f.docId(),
            },
        }),
        // The statement the band ends on. Both of its lines are drawn by
        // SplitText, which forwards rest props onto its own wrapper and keeps a
        // real space between the words, so both are edited on the page; the
        // eyebrow's words are a bare text node beside its tick and are `title`.
        defineBlock({
            at: 'rail.close',
            key: N.realitaZaver,
            title: 'Realita — závěr',
            fields: {
                eyebrow: f.text('title'),
                lead: f.plain(),
                body: f.label(0),
                docId: f.docId(),
            },
        }),
        // The three counts, as ROWS of one block. See the note above for why
        // none of the twelve strings can be annotated; `pick` names them in the
        // order the component reads them, and the key order of these objects is
        // this declaration's.
        //
        //   lead   the figure                value  the sentence
        //   label  the line under the count  note   what it shrinks to on a tile
        //
        // No `docId`: nothing on the page annotates this block, so an id here
        // would be provenance travelling to a section with nowhere to put it.
        //
        // One field rather than a bare array, because a block resolves to an
        // OBJECT of its fields — `rail.cells.rows` is the shape, and inventing a
        // fourth block kind so that one path could hold a list would be growing
        // the vocabulary for a single use.
        defineBlock({
            at: 'rail.cells',
            key: N.realitaCisla,
            title: 'Realita — čísla',
            fields: {
                rows: f.rows({ from: 0, count: 3, pick: ['lead', 'label', 'value', 'note'] }),
            },
        }),
        //   items[0]  the numeral
        //   items[1]  the first half of the sentence
        //   items[2]  the second
        //
        // Three items rather than one `headline` with a break in it: the line
        // breaks with a block child, and the overlay reads a block child as a
        // line of its own rather than as a `<br>` inside one value. `title` is
        // not on the page — it is the name in the Studio's list.
        defineBlock({
            at: 'open',
            key: N.predel,
            title: 'Předěl k nabídce',
            fields: {
                n: f.label(0),
                first: f.label(1),
                second: f.label(2),
                docId: f.docId(),
            },
        }),
        // The offer. One block per rung, `title` + `body` + the rung's number,
        // in the order OfferGrid draws them — a heading's lead paragraph and a
        // block's body are the same field, because they are the same thing at
        // two sizes and the component already knows which it is drawing.
        defineBlockList({
            at: 'chain',
            keys: N.chain,
            title: 'Nabídka — bloky',
            fields: {
                n: f.label(0),
                title: f.text('title'),
                // Plain reading: both are set into a paragraph carrying no
                // markup of its own.
                body: f.plain(),
                docId: f.docId(),
            },
        }),
        //   items[0]  the section's numeral
        //   items[1]  the disclaimer at the foot of the board
        //
        // The three legends beside it are absent and cannot be otherwise: each
        // is a swatch and its word inside one `<span>`, so the word has no
        // element of its own.
        defineBlock({
            at: 'chart',
            key: N.graf,
            title: 'Graf — stejné peníze',
            fields: {
                n: f.label(0),
                title: f.text('title'),
                lead: f.plain(),
                note: f.label(1),
                docId: f.docId(),
            },
        }),
        //   items[0]  the section's numeral
        //   items[1]  the link's words. Its target is /recenze, a path on this
        //             site, so only the words travel.
        //
        // `body` is the sentence before that link — a bare text node sharing its
        // paragraph with it — so it is supplied here and edited in the form.
        defineBlock({
            at: 'reviewsCopy',
            key: N.recenze,
            title: 'Recenze — úvod',
            fields: {
                n: f.label(0),
                title: f.text('title'),
                lead: f.plain(),
                more: f.label(1),
                docId: f.docId(),
            },
        }),
        // The wall itself. Declared LAST because the page pulls it off the
        // answer separately, and read through this entry rather than beside it
        // so that the limit is stated once — `sources` above is now the only
        // place /nabidka says how many reviews it shows. No shape: the typed
        // reader's own answer is what the wall renders, and the cards are
        // moderated where they already are rather than on a third page.
        defineList({ at: 'reviews', source: 'reviews', title: 'Recenze' }),
    ],
})

/* -------------------------------------------------------------------------- */
/*  /nabidky                                                                   */
/* -------------------------------------------------------------------------- */
//
// Four partners, ridden through as one sequence, and two decisions.
//
// **A chapter is a block.** Each owns a photograph and siteCopy holds a single
// `image`, so one block per partner is the only shape in which the four
// pictures are separately replaceable — the same argument /o-nas's history
// panels are a list for.
//
// **How many chapters there are is not an editor's decision.** The section's
// measuring height is `100 + last * RUN` vh and every value on the page is a
// fraction of that: the window each chapter opens by, the travel behind it, the
// point the closing sheet arrives at. A fifth block would not add a screen at
// the end, it would move the seam all of them are measured against. So the
// partners stay in `src/constants/nabidkypage.js`, a fifth is a code change, and
// what a block supplies is words over the ones the component ships with.
//
// **The link out lives on the chapter, not on the section.** Its target is that
// partner's own site — one of the four things about a chapter that is genuinely
// its own — and `editableLink` renders a form rather than editing in place,
// which is what lets both halves sit on a button that draws four corner marks
// and an arrow inside itself.
//
// **The eyebrow's tag is absent from the page's editable surface and cannot be
// otherwise today.** It is a bare text node sharing its paragraph with the
// ordinal's `<em>` and a rule, so annotating the paragraph would store both as
// copy and drop them on the first save. It is `items[0].label` and is edited in
// the form. The same refusal /cookies makes for its two `§` eyebrows.

const partnersPage = definePage({
    route: '/nabidky',
    title: 'Partneři',
    copy: 'nabidky',
    blocks: [
        // The mark over the ride and the label over every deal plate. `title`
        // rather than an item for the first, because it is the word on screen
        // AND the name an editor reads in the Studio's list — the arrangement
        // /cookies' `cookies.obsah` already uses.
        //
        //   items[0]  the label standing over all four deal plates. One field,
        //             four elements: the same words are printed on every plate,
        //             so editing one moves all of them.
        defineBlock({
            at: 'section',
            key: PT.sekce,
            title: 'Partneři — okolí',
            fields: {
                label: f.text('title'),
                dealLabel: f.label(0),
                docId: f.docId(),
            },
        }),
        //   items[0]  lead = the ordinal in the eyebrow, label = the tag beside
        //             it, value = where the button goes
        //   items[1]  lead = the figure on the deal plate, label = the rest of
        //             that line. The figure is absent on two of the four and
        //             must stay absent — the component draws no `<em>` for a
        //             blank one.
        //   items[2]  the button's words
        defineBlockList({
            at: 'chapters',
            keys: PT.chapters,
            title: 'Partneři',
            fields: {
                number: f.lead(0),
                tag: f.label(0),
                title: f.text('title'),
                // Plain reading: it is set into a paragraph carrying no markup
                // of its own.
                description: f.plain(),
                href: f.value(0),
                dealFigure: f.lead(1),
                deal: f.label(1),
                visit: f.label(2),
                // `alt: 'own'` refuses the block's title as a stand-in alt: the
                // title here is the partner's name, and a name is not a
                // description of a photograph.
                photo: f.image({ alt: 'own' }),
                docId: f.docId(),
            },
        }),
    ],
})

/* -------------------------------------------------------------------------- */
/*  /benefit-program                                                           */
/* -------------------------------------------------------------------------- */
//
// A page that answers one doubt per section, and that is what decides the
// granularity: **a section is a block**. Not a field per sentence — this page
// argues, and whoever amends it changes a clause in the middle of an argument —
// and not one block for the page, which would put forty boxes in front of
// somebody holding one paragraph.
//
// Three things about it are decided here and nowhere else.
//
// **The three steps are a list over fixed keys, and their number is a code
// change.** `PLAN` in BenefitJourney is indexed by position and holds each
// row's height, which side its photograph takes and the x its baseline draws
// from; the thread between two rows is drawn from the NEXT row's plan. A fourth
// step arriving from a database would have no plan to stand on. Same rule
// /o-nas's showcase follows.
//
// **Section 03 holds three strings and nothing else, deliberately.** Its
// heading is "Cesta za" plus the sum of the component's own TIERS, the
// destination prints that same sum, and each of the four level markers is
// "Úroveň" plus its own number. Storing any of them would be storing a value
// the page recomputes on the next render — an editor would change it, publish,
// and watch it change back. What is left is words: the section's ordinal, the
// destination's label and the sentence under it.
//
// **Four eyebrows are `<em>ordinal</em> words`, and only the ordinal is on the
// editable surface.** The words are a bare text node sharing the paragraph with
// the `<em>`, so annotating the paragraph would store the `<em>` as copy and
// drop it on the first save. Each is `lead` + `label` on one item, the ordinal
// is annotated and the words are edited in the form — the arrangement
// /ochrana-soukromi's eyebrow already uses.
//
// What is NOT here: QnaContact, which this page mounts with no props and which
// therefore renders the copy it ships with. It is the homepage's own three
// blocks, and wiring a second route to them is a separate question from putting
// this page's own words in the CMS — the two would then be one set of answers
// edited from two pages, which is either right or wrong depending on an
// editorial decision nobody has made.

const benefitPage = definePage({
    route: '/benefit-program',
    title: 'Benefit program',
    copy: 'benefit-program',
    includes: ['/'],
    sources: {
        reviews: { type: 'review', limit: 16 },
    },
    blocks: [
        //   items[0]  the eyebrow
        //   items[1]  the figure — `value` is the number, `label` the words
        //             beside the gift icon. Those words share a `<span>` with
        //             the icon and have no element of their own, so they are
        //             edited in the form.
        //   items[2]  the origin line
        //   items[3]  the scroll cue
        defineBlock({
            at: 'intro',
            key: B.intro,
            title: 'Úvodní obrazovka programu',
            fields: {
                eyebrow: f.label(0),
                title: f.text('title'),
                // Plain reading: one sentence set into a paragraph that carries
                // no markup of its own.
                statement: f.plain(),
                figureValue: f.value(1),
                figureLabel: f.label(1),
                origin: f.label(2),
                scrollCue: f.label(3),
                // `alt: 'own'`: this block's title is the `<h1>` — "Doporučte
                // nás" — which is an instruction rather than a description of a
                // photograph.
                photo: f.image({ alt: 'own' }),
                docId: f.docId(),
            },
        }),
        //   items[0]  the eyebrow, lead + label
        defineBlock({
            at: 'journey',
            key: B.journey,
            title: 'Tři kroky — úvod',
            fields: {
                ord: f.lead(0),
                eyebrow: f.label(0),
                title: f.text('title'),
                lead: f.plain(),
                docId: f.docId(),
            },
        }),
        //   items[0]  lead = the row's dotted number, which is a bare text node
        //             beside the label's `<span>` and is edited in the form;
        //             label = the words in that span
        //   items[1]  the aside under the paragraph
        defineBlockList({
            at: 'steps',
            keys: B.steps,
            title: 'Tři kroky',
            fields: {
                n: f.lead(0),
                label: f.label(0),
                title: f.text('title'),
                body: f.plain(),
                note: f.label(1),
                // `alt: 'own'` again: the title is the step's statement.
                photo: f.image({ alt: 'own' }),
                docId: f.docId(),
            },
        }),
        //   items[0]  the section's ordinal
        //   items[1]  the destination's label
        //   items[2]  the sentence under the destination's figure
        //
        // `title` is the block's name in the Studio and is not on the page — see
        // the note above about what this section does not store.
        defineBlock({
            at: 'ride',
            key: B.ride,
            title: 'Cesta za odměnami',
            fields: {
                ord: f.label(0),
                destLabel: f.label(1),
                destNote: f.label(2),
                docId: f.docId(),
            },
        }),
        //   items[0]  the eyebrow, lead + label
        //   items[1]  the left column — label is its heading, value its paragraph
        //   items[2]  the right column, the same way
        defineBlock({
            at: 'doubt',
            key: B.doubt,
            title: 'Otázka a odpověď',
            fields: {
                ord: f.lead(0),
                eyebrow: f.label(0),
                // The question TextPressure sets a character at a time. It is
                // the block's `title` — the field that is also its name in the
                // Studio's list — because the words on screen are markup the
                // component generates and there is no text node to click.
                question: f.text('title'),
                themLabel: f.label(1),
                themBody: f.value(1),
                youLabel: f.label(2),
                youBody: f.value(2),
                both: f.plain(),
                docId: f.docId(),
            },
        }),
        //   items[0]  the eyebrow, lead + label
        //   items[1]  the line under it
        //
        // `title` is the block's name in the Studio and is not on the page. The
        // belt below this head is `review` documents, which are moderated where
        // they already are rather than edited as this page's copy.
        defineBlock({
            at: 'reviewsCopy',
            key: B.reviews,
            title: 'Recenze — úvod',
            fields: {
                ord: f.lead(0),
                eyebrow: f.label(0),
                lead: f.label(1),
                docId: f.docId(),
            },
        }),
        //   items[0]  the eyebrow, lead + label
        //   items[1]  the "Mám poradce" tile — lead is its question, label the
        //             big line, value the caption under it
        //   items[2]  the "První schůzka" tile, the same way
        //
        // What answers a tap on either tile is absent, and it is not an
        // oversight: it is mounted from component state, so no server render
        // reaches it, and its two halves are a consultant's own record and the
        // homepage's advisor block — both already edited where they live.
        defineBlock({
            at: 'enroll',
            key: B.enroll,
            title: 'Jak se přihlásit',
            fields: {
                ord: f.lead(0),
                eyebrow: f.label(0),
                title: f.text('title'),
                clientQ: f.lead(1),
                clientBig: f.label(1),
                clientCap: f.value(1),
                newQ: f.lead(2),
                newBig: f.label(2),
                newCap: f.value(2),
                docId: f.docId(),
            },
        }),
        // The belt. Read through this entry rather than beside it, so the limit
        // is stated once — `sources` above is now the only place this route says
        // how many reviews it shows. No shape: the typed reader's own answer is
        // what the belt renders.
        defineList({ at: 'reviews', source: 'reviews', title: 'Recenze' }),
    ],
})

/* -------------------------------------------------------------------------- */

export default defineSite({
    pages: [homepage, aboutUs, cookiesPage, privacyPage, reviewsPage, advisorPage, offerPage, partnersPage, benefitPage],
    // The patička, the contact sheet and the assistant. `_app` renders all three
    // under every route and `_app` has no data fetching, so each page's own
    // getStaticProps hands them down — see server/site/footer.js. No page
    // declares them because they belong to none, which is precisely why they are
    // declared here: publishing one of them touches every route that regenerates,
    // and that is a thing this file should say out loud rather than something a
    // list of routes somewhere else should imply.
    globals: defineGlobals({
        copy: 'global',
        sources: { assistant: { type: 'assistant' } },
    }),
})
