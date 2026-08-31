// Which documents are edited by clicking the page, and where.
//
// Zero dependencies on purpose. Three places need this answer and they live on
// opposite sides of every boundary in the project:
//
//   the site layer   decides whether to hand a section the document id that
//                    makes its copy clickable (server, draft mode only)
//   the Studio       decides whether a document opens as a form or as a
//                    read-only preview pointing at the page (browser)
//   the save path    has nothing to look up here, and that is deliberate — see
//                    the note at the bottom
//
// A second copy of these key strings in the Studio would be the drift COPY_KEYS
// was created to prevent, and importing the server's homepage.js into a browser
// bundle is not possible. So the strings live here, importable from anywhere.

/**
 * The siteCopy keys the homepage renders. `src/cms/server/site/homepage.js`
 * re-exports these as COPY_KEYS, which is the name the rest of the site layer
 * already knows them by.
 */
export const HOMEPAGE_COPY_KEYS = Object.freeze({
    hero: 'index.hero',
    whoWeAre: 'index.who-we-are',
    firstTime: 'index.first-time',
    clients: 'index.clients',
    // The deck in the "Pro naše klienty" panel: three pictures, each with its
    // own caption. siteCopy holds one `image` per block, so one block per card
    // is the only shape in which the three are separately replaceable — the
    // same argument ABOUT_COPY_KEYS.showcaseMembers is a list for. The ORDER is
    // the order they are dealt in.
    clientCards: Object.freeze([
        'index.clients.karta-1',
        'index.clients.karta-2',
        'index.clients.karta-3',
    ]),
    join: 'index.join',
    offers: 'index.offers',
    reviews: 'index.reviews',
    advisors: 'index.advisors',
    // The contact form beside the advisor list, and the one under the QNA
    // switch, are their own blocks rather than a tail of items on the section
    // above them. Both are a dozen labels an editor reads as a form, and an
    // index map that long is a list nobody can check — see the maps in
    // `server/site/homepage.js`, which are already at the limit of what a
    // positional list can carry.
    advisorForm: 'index.advisors.formular',
    qna: 'index.qna',
    qnaQuestions: 'index.qna.otazky',
    qnaForm: 'index.qna.formular',
})

/**
 * The siteCopy keys /o-nas renders. Same contract, same reason for living here:
 * `src/cms/server/site/aboutUs.js` is server-only and the Studio has to be able
 * to recognise the same documents from a browser bundle.
 *
 * `showcaseMembers` is a list rather than a single key because the section is
 * three cards and each card owns a photograph. siteCopy holds one `image` per
 * block, so one block per card is the only shape in which the three photos are
 * separately editable — and the ORDER of this array is the order the cards are
 * rendered in, which is why it is a frozen array and not a set of loose keys.
 */
export const ABOUT_COPY_KEYS = Object.freeze({
    hero: 'o-nas.hero',
    showcase: 'o-nas.showcase',
    showcaseMembers: Object.freeze([
        'o-nas.showcase.zalozeni',
        'o-nas.showcase.kolegove',
        'o-nas.showcase.hodnoty',
    ]),
    // The button every card carries and the six words the travelling discs are
    // lettered with. A block of its own rather than a tail of items on
    // `showcase`, whose one item is the standing note under all three cards:
    // that note is the section's own voice and these are not.
    showcaseValues: 'o-nas.showcase.values',
    colleagues: 'o-nas.colleagues',
    prompt: 'o-nas.prompt',
    // Every link on this page that leaves the site — the rotating badge over the
    // hero and the three icons beside a colleague's portrait. One block, because
    // a target is not copy and three of the four have no words on screen at all.
    // Buttons pointing at a path on THIS site are deliberately absent: their
    // words live with the copy they sit in, and their target is the site's own
    // routing rather than content.
    links: 'o-nas.links',
    // One block per panel of the history, in the order they are ridden through.
    // Each owns a photograph and siteCopy holds a single `image`, so this is the
    // only shape in which the four are separately replaceable — the same
    // argument `showcaseMembers` is a list for.
    historyPanels: Object.freeze([
        'o-nas.history.01',
        'o-nas.history.02',
        'o-nas.history.03',
        'o-nas.history.04',
    ]),
})

/**
 * The siteCopy keys /cookies renders. Same contract, same reason for living
 * here.
 *
 * `sections` is a list for a different reason than `showcaseMembers` is: not
 * because each member owns a photograph — none of these has one — but because
 * each is a heading and a paragraph of a legal notice, and a notice is amended
 * one clause at a time. One block per section is the coarsest shape in which an
 * editor can change a sentence in the middle of §7 without retyping §6, and the
 * finest one that does not chop a paragraph into a form. The ORDER is the order
 * they are read, and the anchor each hangs on (`#about`, `#necessary`) stays in
 * `src/constants/cookiesTerms.js` — an id is an address, not copy.
 */
export const COOKIES_COPY_KEYS = Object.freeze({
    hero: 'cookies.hero',
    // The word over the sticky index, alone in its own block. It cannot ride on
    // `cookies.hero`: that block's items ARE the heading's two lines, edited as
    // one array whose length is part of the edit, and a third item would be a
    // third line of the `<h1>`.
    index: 'cookies.obsah',
    sections: Object.freeze([
        'cookies.sekce.01',
        'cookies.sekce.02',
        'cookies.sekce.03',
        'cookies.sekce.04',
        'cookies.sekce.05',
        'cookies.sekce.06',
        'cookies.sekce.07',
        'cookies.sekce.08',
        'cookies.sekce.09',
        'cookies.sekce.10',
    ]),
    manage: 'cookies.sprava',
})

/**
 * The siteCopy keys /ochrana-soukromi renders. Same contract as the two above.
 *
 * `sections` is a list of nine because the page is nine sections, and the
 * granularity stops at the section deliberately. A privacy notice is read and
 * amended as prose: whoever edits it changes a sentence in the middle of a
 * clause, so the unit is a heading and its body — never a field per sentence,
 * which would put eleven boxes in front of somebody holding one paragraph. One
 * block each rather than nine pairs on one block is what puts those nine
 * headings in the Studio's list, where they read as the page's own contents.
 *
 * Each KEY names the section's anchor, and the anchor itself stays in
 * `src/constants/cookiesTerms.js` — an id is an address, not copy, and #rights
 * has to keep landing whatever an editor retitles that section to. The ORDER is
 * the order the sections are read, and it is what pairs this list with
 * `PrivacySections`: position, not name, exactly as /o-nas's history panels are
 * paired with the milestones they fill in.
 *
 * How many sections there are is NOT an editor's decision, for the same reason
 * it is not on /o-nas: the ids are anchors old links point at, and the index
 * beside the text is drawn from the same fixed list. Adding a tenth section is a
 * code change, as it was before.
 */
export const PRIVACY_COPY_KEYS = Object.freeze({
    // The head, and the one word over the index with it. The index's heading
    // rides here rather than in a block of its own because this block's items
    // are NAMED POSITIONS (PRIVACY_HERO in cms.config.js) rather than an array
    // whose length is part of the edit — a seventh named position is a seventh
    // element on the page, not a seventh line of the <h1>.
    hero: 'ochrana-soukromi.hero',
    sections: Object.freeze([
        'ochrana-soukromi.privacy',
        'ochrana-soukromi.data',
        'ochrana-soukromi.use',
        'ochrana-soukromi.sharing',
        'ochrana-soukromi.legal-basis',
        'ochrana-soukromi.retention',
        'ochrana-soukromi.rights',
        'ochrana-soukromi.international',
        'ochrana-soukromi.dpo',
    ]),
})

/**
 * The siteCopy keys /recenze and /recenze/[slug] render. One map for two routes,
 * because they are one subject and share a `page` value: what is edited here is
 * the copy AROUND the reviews, and the reviews themselves are documents that are
 * moderated rather than rewritten.
 *
 * The line this map is drawn along, and the reason it is short: a review's words
 * are the customer's, and a consultant's name, motto, portrait and counts are
 * fields of the consultant document. Neither is page copy, and neither gets a
 * block here — the wall annotates a card as a whole `review` narrowed to
 * moderation, the card's heading annotates the `consultant`, and both open forms
 * an editor already knows.
 *
 * `poradce` is the one that is not on a page but on TEN: /recenze/[slug] is a
 * template, so this block's words are the same words on every consultant's card
 * and editing it once moves all of them. That is the point of it being page copy
 * rather than something each person carries.
 */
export const REVIEWS_COPY_KEYS = Object.freeze({
    hero: 'recenze.hero',
    // The one line the wall says for itself, at the end of the grid.
    wall: 'recenze.zed',
    // The button that asks, and the sheet behind it. Its own block rather than
    // more items on `wall`, because AddReview is its own component and a block
    // is what a component is handed.
    form: 'recenze.formular',
    // /recenze/[slug]. The office's city, the ask over the form, and the words
    // on the send button.
    advisor: 'recenze.poradce',
})

/**
 * The siteCopy keys /nabidka renders — the largest page on this site, and the
 * only one whose sections are six different kinds of thing.
 *
 * Two lists here rather than one, and the difference between them is the whole
 * model of this page.
 *
 * `chain` is one block per rung of the offer — a heading and its sentence
 * together, in the order OfferGrid draws them. The same granularity /cookies'
 * sections use, for the same reason: a rung is read and amended as one thought,
 * and a field per clause puts three boxes in front of somebody holding one line.
 * How MANY rungs there are is not an editor's decision — `PLAN` in OfferGrid is
 * written against their indices — so a fifteenth is a code change, and the KEY
 * is the rung's own number because that number is on the page and in the list.
 *
 * The three counts of the statistics band are the OPPOSITE case and are one
 * block with three items, `realitaCisla`. Nothing about them can be annotated:
 * the figure sits beside a `/10` inside its own element, the sentence and the
 * two words are each drawn twice — on the tile and in the open cell — and a
 * third time in the paragraph at the foot that reads the set out for a screen
 * reader. A field is written by one element, so all four strings of all three
 * are edited in the form, and a form is where a set of statistics belongs.
 */
export const OFFER_COPY_KEYS = Object.freeze({
    hero: 'nabidka.hero',
    // The statistics band: its own labels, the three counts, and the statement
    // it ends on. Three blocks because they are three kinds of thing — a set of
    // labels, a set of statistics and a closing sentence — and because only the
    // first and the last have anything on the page to click.
    realita: 'nabidka.realita',
    realitaCisla: 'nabidka.realita.cisla',
    realitaZaver: 'nabidka.realita.zaver',
    // The line of type that turns the page downwards, between the band and the
    // offer.
    predel: 'nabidka.predel',
    chain: Object.freeze([
        'nabidka.blok.03',
        'nabidka.blok.03.01',
        'nabidka.blok.03.02',
        'nabidka.blok.03.03',
        'nabidka.blok.04',
        'nabidka.blok.04.01',
        'nabidka.blok.04.02',
        'nabidka.blok.05',
        'nabidka.blok.05.01',
        'nabidka.blok.05.02',
        'nabidka.blok.05.03',
        'nabidka.blok.06',
        'nabidka.blok.06.01',
        'nabidka.blok.06.02',
    ]),
    // The board of two futures, and the head of the wall of reviews. The cards
    // on that wall are `review` documents and are not this page's copy.
    graf: 'nabidka.graf',
    recenze: 'nabidka.recenze',
})

/**
 * The siteCopy keys /nabidky renders — the ride through the local partners and
 * what each one gives a client.
 *
 * One block per chapter, for the reason ABOUT_COPY_KEYS.historyPanels is a list:
 * each owns a photograph and siteCopy holds a single `image`, so this is the
 * only shape in which the four are separately replaceable. The ORDER is the
 * order they are ridden through.
 *
 * How many there are is NOT an editor's decision. The section's measuring height
 * is `100 + last * RUN` vh and every value on the page is a fraction of it, so a
 * fifth block would not add a chapter at the end — it would move the seam the
 * whole timeline is measured against. A fifth partner is a code change, exactly
 * as /o-nas's showcase is.
 *
 * `sekce` holds the two words that belong to the section rather than to a
 * partner: the mark over the ride and the label standing over all four deal
 * plates. The link out to a partner is deliberately NOT here — both its words
 * and its target are on the chapter's own block, because it leaves the site for
 * one named partner and a target is per-partner.
 */
export const PARTNERS_COPY_KEYS = Object.freeze({
    sekce: 'nabidky.sekce',
    chapters: Object.freeze([
        'nabidky.partner.01',
        'nabidky.partner.02',
        'nabidky.partner.03',
        'nabidky.partner.04',
    ]),
})

/**
 * The siteCopy keys /benefit-program renders.
 *
 * One block per section, because that is what a section of this page is: a
 * reader's question and its answer, written as one thought. The exception is
 * `steps`, which is a list for the reason every list here is one — each of the
 * three owns a photograph.
 *
 * `cesta` is the smallest block on the site and says the most about where the
 * line is drawn. Section 03 is a ride past twelve vouchers whose heading, whose
 * total and whose four level markers are ARITHMETIC over the component's own
 * TIERS and LEVELS. Three strings on it are words rather than sums, and those
 * three are what the block holds; storing any of the others would be storing a
 * value the page recomputes on the next render, which an editor would change,
 * publish, and watch change back.
 *
 * `otazka` and `prihlaseni` are two blocks and one component, and they are two
 * because BenefitBothWin exports two: the doubt and its answer are one movement,
 * the way in is another, and the belt of reviews now runs between them.
 */
export const BENEFIT_COPY_KEYS = Object.freeze({
    intro: 'benefit-program.uvod',
    journey: 'benefit-program.kroky',
    steps: Object.freeze([
        'benefit-program.kroky.01',
        'benefit-program.kroky.02',
        'benefit-program.kroky.03',
    ]),
    ride: 'benefit-program.cesta',
    doubt: 'benefit-program.otazka',
    reviews: 'benefit-program.recenze',
    enroll: 'benefit-program.prihlaseni',
})

/**
 * The patička, which is not a page: `_app` renders it under every route, so the
 * block is `page: 'global'` and every page's own reader hands it down. See
 * `src/cms/server/site/footer.js`.
 */
export const FOOTER_COPY_KEY = 'global.footer'

/**
 * The rest of what `_app` renders under every route, on the same terms.
 *
 * `global.footer` is the address column on the right of the patička. The claim
 * on the left is a second block rather than more items on that one because it is
 * the only half of the row set with hard line breaks, and every one of its lines
 * has to be an element of its own before it can be clicked. The links are a third
 * because a target is not copy.
 *
 * `global.contact` is the sheet the navigation opens. It travels the same way
 * the patička does — on every page's props — because the bar that opens it is
 * mounted outside any page and has none of its own.
 */
export const GLOBAL_COPY_KEYS = Object.freeze({
    footer: FOOTER_COPY_KEY,
    footerClaim: 'global.footer.claim',
    footerLinks: 'global.footer.links',
    contact: 'global.contact',
})

/**
 * One entry per document whose editing has moved onto the page.
 *
 * `fields` is not decoration: it is what the Studio shows an editor in place of
 * the form ("these four lines and this photo are edited on the page"), and it is
 * the list to check against when asking whether a given field still needs a form
 * input. A field of a listed type that is NOT in here — siteCopy's `key`, `page`
 * and `title` on these two blocks — has no element on the page to click, so it
 * keeps its input.
 */
export const VISUAL_SURFACES = Object.freeze([
    // Only WHOLLY page-owned fields are listed, and that is why `items.*.label`
    // is absent from half the homepage's blocks.
    //
    // The Studio locks by the HEAD of the path (`items`), not by the wildcard,
    // so listing `items.*.label` takes the input away from every member of the
    // list — and several of these lists hold one line that has no element on the
    // page: a CornerButton's words, which cannot carry an attribute because the
    // component forwards no rest props. Hiding that line's input would leave it
    // editable nowhere at all.
    //
    // `index.first-time` has no entry for the same reason taken to its end: its
    // only page-owned field is `items`, and one of its eight members is such a
    // button. An entry listing nothing would tell an editor the block is edited
    // on the page and then show them no fields, which is worse than the plain
    // form they get without one.
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.hero,
        page: '/',
        // Not "Úvod stránky": /o-nas's hero is already called that, and the two
        // sit next to each other in a list an editor scans by name.
        section: 'Úvodní obrazovka',
        fields: Object.freeze([
            { path: 'image', kind: 'image', label: 'Fotka bloku' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.clients,
        page: '/',
        section: 'Pro naše klienty',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis panelu' },
        ]),
    },
    ...HOMEPAGE_COPY_KEYS.clientCards.map((key, index) => ({
        type: 'siteCopy',
        key,
        page: '/',
        section: `Fotka v balíčku ${index + 1}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Popisek fotky' },
            { path: 'image', kind: 'image', label: 'Fotka' },
        ]),
    })),
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.join,
        page: '/',
        section: 'Přidejte se k nám',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis panelu' },
            { path: 'body', kind: 'text', label: 'Text panelu' },
            { path: 'image', kind: 'image', label: 'Fotka bloku' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.offers,
        page: '/',
        section: 'Nabídky',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis sekce' },
            { path: 'items.*.label', kind: 'text', label: 'Řádky textu' },
            { path: 'image', kind: 'image', label: 'Fotka bloku' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.reviews,
        page: '/',
        section: 'Recenze — okolí',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Popisky' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.advisors,
        page: '/',
        section: 'Zvolit poradce',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Popisky sloupce' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.advisorForm,
        page: '/',
        section: 'Zvolit poradce — formulář',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Popisky formuláře' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.qna,
        page: '/',
        section: 'Dotazy — úvod',
        fields: Object.freeze([
            { path: 'body', kind: 'text', label: 'Text pod nadpisem' },
            { path: 'items.*.label', kind: 'text', label: 'Přepínač a popisky' },
            { path: 'image', kind: 'image', label: 'Fotka bloku' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.qnaQuestions,
        page: '/',
        section: 'Dotazy — otázky',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Otázky' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.qnaForm,
        page: '/',
        section: 'Dotazy — formulář',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Popisky formuláře' },
        ]),
    },
    {
        type: 'siteCopy',
        key: HOMEPAGE_COPY_KEYS.whoWeAre,
        page: '/',
        section: 'Kdo jsme',
        fields: Object.freeze([
            { path: 'body', kind: 'text', label: 'Text bloku' },
            { path: 'image', kind: 'image', label: 'Fotka bloku' },
        ]),
    },
    {
        type: 'siteCopy',
        key: ABOUT_COPY_KEYS.hero,
        page: '/o-nas',
        section: 'Úvod stránky',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis' },
            { path: 'items.*.label', kind: 'text', label: 'Tři odrážky' },
            { path: 'image', kind: 'image', label: 'Fotka bloku' },
        ]),
    },
    {
        type: 'siteCopy',
        key: ABOUT_COPY_KEYS.showcase,
        page: '/o-nas',
        section: 'Karty — společná poznámka',
        fields: Object.freeze([
            { path: 'body', kind: 'text', label: 'Poznámka pod kartami' },
        ]),
    },
    // The three cards. Identical shape, so the entries are generated from the
    // key list rather than typed out three times — a copy-pasted block is how
    // the third card ends up describing the second one's fields.
    ...ABOUT_COPY_KEYS.showcaseMembers.map((key, index) => ({
        type: 'siteCopy',
        key,
        page: '/o-nas',
        section: `Karta ${index + 1}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Štítek karty' },
            { path: 'body', kind: 'text', label: 'Citace' },
            { path: 'image', kind: 'image', label: 'Fotka karty' },
        ]),
    })),
    {
        type: 'siteCopy',
        key: ABOUT_COPY_KEYS.showcaseValues,
        page: '/o-nas',
        section: 'Karty — tlačítko a hodnoty',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Tlačítko a hodnoty' },
        ]),
    },
    {
        type: 'siteCopy',
        key: ABOUT_COPY_KEYS.colleagues,
        page: '/o-nas',
        section: 'Naši kolegové',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Řádky nadpisu' },
        ]),
    },
    {
        type: 'siteCopy',
        key: ABOUT_COPY_KEYS.prompt,
        page: '/o-nas',
        section: 'Pokračovat na historii',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Všechny řádky' },
        ]),
    },
    {
        // Nothing listed, and that is the rule at the head of this list rather
        // than an omission: `items` is one field, listing any path into it locks
        // the whole array's input, and three of these four items are icons whose
        // label is never on the page. Hiding those would leave them editable
        // nowhere at all.
        type: 'siteCopy',
        key: ABOUT_COPY_KEYS.links,
        page: '/o-nas',
        section: 'Odkazy mimo web',
        fields: Object.freeze([]),
    },
    ...ABOUT_COPY_KEYS.historyPanels.map((key, index) => ({
        type: 'siteCopy',
        key,
        page: '/o-nas',
        section: `Historie ${index + 1}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Datum panelu' },
            { path: 'body', kind: 'text', label: 'Text panelu' },
            { path: 'items.*.label', kind: 'text', label: 'Číslo panelu' },
            { path: 'image', kind: 'image', label: 'Fotka panelu' },
        ]),
    })),
    // /cookies. Every field of every block on this page is on the page, which is
    // what a legal notice looks like when it is modelled at section granularity:
    // there is no positional list here holding a line that has no element.
    {
        type: 'siteCopy',
        key: COOKIES_COPY_KEYS.hero,
        page: '/cookies',
        section: 'Úvod stránky',
        fields: Object.freeze([
            // Two items, drawn as the two lines of the `<h1>` and edited as one
            // block — `editableLines` over `items.*.label`. Both are on the
            // page, so locking the array's input takes nothing away.
            { path: 'items.*.label', kind: 'text', label: 'Nadpis stránky' },
            { path: 'body', kind: 'text', label: 'Věta pod nadpisem' },
        ]),
    },
    {
        type: 'siteCopy',
        key: COOKIES_COPY_KEYS.index,
        page: '/cookies',
        section: 'Obsah — popisek',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Popisek nad obsahem' },
        ]),
    },
    // The ten sections, generated from the key list for the reason the showcase's
    // three cards are: a copy-pasted entry is how the seventh one ends up
    // describing the sixth one's fields.
    ...COOKIES_COPY_KEYS.sections.map((key, index) => ({
        type: 'siteCopy',
        key,
        page: '/cookies',
        section: `Oddíl ${String(index + 1).padStart(2, '0')}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis oddílu' },
            { path: 'body', kind: 'text', label: 'Text oddílu' },
        ]),
    })),
    {
        type: 'siteCopy',
        key: COOKIES_COPY_KEYS.manage,
        page: '/cookies',
        section: 'Správa předvoleb',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis panelu' },
            // The one item is the button's words. A real `<button>` opening the
            // preference modem, so it has no target — `editableLink` would offer
            // one and there would be nowhere to store it.
            { path: 'items.*.label', kind: 'text', label: 'Text tlačítka' },
        ]),
    },
    // /ochrana-soukromi, on the same terms as /cookies above: every field of
    // every block is on the page, because a legal notice modelled at section
    // granularity has no positional list holding a line with no element.
    {
        type: 'siteCopy',
        key: PRIVACY_COPY_KEYS.hero,
        page: '/ochrana-soukromi',
        section: 'Úvod stránky',
        fields: Object.freeze([
            // Six named positions, every one of them its own element: the
            // eyebrow's tag, the three lines of the `<h1>`, the line under the
            // rule, and the word over the index. Each is annotated separately —
            // `items.*.label` here only says the array is edited on the page,
            // which it entirely is. The block's `title` is deliberately NOT
            // listed: it is the eyebrow's words, which are a bare text node
            // with no element to click, so it keeps its input in the form.
            { path: 'items.*.label', kind: 'text', label: 'Řádky úvodu' },
        ]),
    },
    // The nine sections, generated from the key list rather than typed out nine
    // times — a copy-pasted entry is how the sixth one ends up describing the
    // fifth one's fields.
    ...PRIVACY_COPY_KEYS.sections.map((key, index) => ({
        type: 'siteCopy',
        key,
        page: '/ochrana-soukromi',
        section: `Oddíl ${String(index + 1).padStart(2, '0')}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis oddílu' },
            { path: 'body', kind: 'text', label: 'Text oddílu' },
        ]),
    })),
    // /recenze. Two of these three list `items.*.label` and one does not, and the
    // difference is the rule at the head of this list rather than an oversight:
    // locking the array's input takes the form away from every member, and both
    // of these blocks hold a line that is on the page only while a request is in
    // flight — the wall's "Načítám další…" and the sheet's "Odesílám…". Hiding
    // those would leave them editable nowhere at all.
    {
        type: 'siteCopy',
        key: REVIEWS_COPY_KEYS.hero,
        page: '/recenze',
        // Not "Úvod stránky": three other pages already have one, and they sit
        // next to each other in a list an editor scans by name.
        section: 'Recenze — úvod',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Popisek nad nadpisem' },
            { path: 'body', kind: 'text', label: 'Nadpis stránky' },
            { path: 'headline', kind: 'text', label: 'Věta pod čarou' },
        ]),
    },
    {
        type: 'siteCopy',
        key: REVIEWS_COPY_KEYS.wall,
        page: '/recenze',
        section: 'Zeď recenzí',
        // Nothing listed, for the reason above: one of the two items is the word
        // the grid wears while the next batch is arriving.
        fields: Object.freeze([]),
    },
    {
        type: 'siteCopy',
        key: REVIEWS_COPY_KEYS.form,
        page: '/recenze',
        section: 'Napsat recenzi',
        fields: Object.freeze([
            // Both inside the sheet, which opens on a click — the same terms
            // /o-nas's history panels are listed on.
            { path: 'title', kind: 'text', label: 'Popisek nad formulářem' },
            { path: 'body', kind: 'text', label: 'Věta pod tlačítkem' },
        ]),
    },
    {
        type: 'siteCopy',
        key: REVIEWS_COPY_KEYS.advisor,
        // A template, so there is no single address to send an editor to. Any
        // consultant's page shows this block; the roster is on /o-nas.
        page: '/recenze',
        section: 'Karta poradce',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis nad formulářem' },
            { path: 'body', kind: 'text', label: 'Věta pod tlačítkem' },
        ]),
    },
    // /nabidka. Three of its nine blocks have no entry at all, and each absence
    // is the rule at the head of this list rather than an omission.
    //
    // `nabidka.realita` holds one item whose words are a bare text node between
    // the tick and the source, so it has no element; the Studio locks by the HEAD
    // of the path, so an entry naming `items.*.label` would take that line's input
    // away and leave it editable nowhere. `nabidka.realita.cisla` is wholly off
    // the page — every one of its twelve strings is drawn twice or three times,
    // and a field is written by one element. An entry listing nothing would tell
    // an editor the block is edited on the page and then show them no fields,
    // which is worse than the plain form they get without one.
    {
        type: 'siteCopy',
        key: OFFER_COPY_KEYS.hero,
        page: '/nabidka',
        section: 'Úvodní obrazovka',
        fields: Object.freeze([
            // The <h1> — two lines and one accented run in one element — is
            // `headline` and is edited on the page; so are both items, the
            // button's words and the scroll hint. `title` is deliberately NOT
            // listed: it is the eyebrow's words, a bare text node beside the
            // tick with no element to click, so it keeps its input in the form.
            { path: 'headline', kind: 'text', label: 'Nadpis stránky' },
            { path: 'body', kind: 'text', label: 'Věta pod nadpisem' },
            { path: 'items.*.label', kind: 'text', label: 'Tlačítko a nápověda' },
        ]),
    },
    {
        type: 'siteCopy',
        key: OFFER_COPY_KEYS.realitaZaver,
        page: '/nabidka',
        section: 'Realita — závěr',
        fields: Object.freeze([
            { path: 'body', kind: 'text', label: 'Věta, na které sekce končí' },
            { path: 'items.*.label', kind: 'text', label: 'Věta pod pravítkem' },
        ]),
    },
    {
        type: 'siteCopy',
        key: OFFER_COPY_KEYS.predel,
        page: '/nabidka',
        section: 'Předěl k nabídce',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Číslo a obě půlky věty' },
        ]),
    },
    // The fourteen rungs of the offer, generated from the key list rather than
    // typed out fourteen times — a copy-pasted entry is how the ninth one ends
    // up describing the eighth one's fields. Every field of every one of them is
    // on the page, which is what this part of the page is: a heading, a number
    // and a sentence, each its own element.
    ...OFFER_COPY_KEYS.chain.map((key) => ({
        type: 'siteCopy',
        key,
        page: '/nabidka',
        section: `Nabídka ${key.slice('nabidka.blok.'.length)}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis' },
            { path: 'body', kind: 'text', label: 'Text' },
            { path: 'items.*.label', kind: 'text', label: 'Číslo' },
        ]),
    })),
    {
        type: 'siteCopy',
        key: OFFER_COPY_KEYS.graf,
        page: '/nabidka',
        section: 'Graf — stejné peníze',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis' },
            { path: 'body', kind: 'text', label: 'Text pod nadpisem' },
            { path: 'items.*.label', kind: 'text', label: 'Číslo a poznámka' },
        ]),
    },
    {
        type: 'siteCopy',
        key: OFFER_COPY_KEYS.recenze,
        page: '/nabidka',
        section: 'Recenze — úvod',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis' },
            { path: 'items.*.label', kind: 'text', label: 'Číslo a odkaz' },
            // `body` is absent for the same reason the hero's `title` is: it is
            // the sentence before the link, a bare text node sharing its
            // paragraph with it, so it has no element and keeps its input.
        ]),
    },
    // /nabidky. The section's own two words, then one block per chapter.
    {
        type: 'siteCopy',
        key: PARTNERS_COPY_KEYS.sekce,
        page: '/nabidky',
        section: 'Partneři — okolí',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Popisek sekce' },
            // The one item is the label over every deal plate. Four elements
            // carry it and all four write here, which is the arrangement the
            // showcase's shared button already has.
            { path: 'items.*.label', kind: 'text', label: 'Popisek nad slevou' },
        ]),
    },
    // The four chapters, generated from the key list rather than typed out four
    // times — a copy-pasted entry is how the third one ends up describing the
    // second one's fields.
    ...PARTNERS_COPY_KEYS.chapters.map((key, index) => ({
        type: 'siteCopy',
        key,
        page: '/nabidky',
        section: `Partner ${String(index + 1).padStart(2, '0')}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Jméno partnera' },
            { path: 'body', kind: 'text', label: 'Věta pod jménem' },
            { path: 'image', kind: 'image', label: 'Fotka kapitoly' },
            // `items` is deliberately absent, and it is the rule at the head of
            // this list rather than an omission: five of its six members are on
            // the page and `items.0.label` — the tag beside the ordinal — is a
            // bare text node sharing its paragraph with the `<em>` and the rule.
            // The Studio locks by the HEAD of the path, so naming any member
            // takes that one line's input away and leaves it editable nowhere.
        ]),
    })),
    // /benefit-program.
    {
        type: 'siteCopy',
        key: BENEFIT_COPY_KEYS.intro,
        page: '/benefit-program',
        section: 'Úvodní obrazovka programu',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis' },
            { path: 'body', kind: 'text', label: 'Věta pod nadpisem' },
            { path: 'image', kind: 'image', label: 'Fotka bloku' },
            // `items` is deliberately absent: the words beside the gift icon are
            // a bare text node sharing their `<span>` with it, and locking the
            // array would take that one line's input away — see the rule at the
            // head of this list.
        ]),
    },
    {
        type: 'siteCopy',
        key: BENEFIT_COPY_KEYS.journey,
        page: '/benefit-program',
        section: 'Tři kroky — úvod',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis sekce' },
            { path: 'body', kind: 'text', label: 'Věta pod nadpisem' },
        ]),
    },
    ...BENEFIT_COPY_KEYS.steps.map((key, index) => ({
        type: 'siteCopy',
        key,
        page: '/benefit-program',
        section: `Krok ${String(index + 1).padStart(2, '0')}`,
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis kroku' },
            { path: 'body', kind: 'text', label: 'Text kroku' },
            { path: 'image', kind: 'image', label: 'Fotka kroku' },
        ]),
    })),
    {
        // The one block of these two pages whose whole array is on the page —
        // three items, three labels, three elements — so locking it takes
        // nothing away. `title` is not listed because it is not rendered: it is
        // the block's name in the Studio's list, the arrangement /o-nas's
        // `o-nas.prompt` already uses.
        type: 'siteCopy',
        key: BENEFIT_COPY_KEYS.ride,
        page: '/benefit-program',
        section: 'Cesta za odměnami',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Řádky sekce' },
        ]),
    },
    {
        type: 'siteCopy',
        key: BENEFIT_COPY_KEYS.doubt,
        page: '/benefit-program',
        section: 'Otázka a odpověď',
        fields: Object.freeze([
            { path: 'body', kind: 'text', label: 'Věta pod oběma sloupci' },
            // `title` is the question itself, which TextPressure sets a character
            // at a time — the words on screen are markup the component generates,
            // so there is nothing there to click and the form keeps its input.
        ]),
    },
    {
        type: 'siteCopy',
        key: BENEFIT_COPY_KEYS.reviews,
        // Nothing listed, on the terms the rule at the head of this list sets:
        // this block's array holds the eyebrow's ordinal and its words on the
        // same item, and only the ordinal has an element. Locking the array
        // would leave those words editable nowhere.
        page: '/benefit-program',
        section: 'Recenze — úvod',
        fields: Object.freeze([]),
    },
    {
        type: 'siteCopy',
        key: BENEFIT_COPY_KEYS.enroll,
        page: '/benefit-program',
        section: 'Jak se přihlásit',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis sekce' },
        ]),
    },
    {
        type: 'siteCopy',
        key: GLOBAL_COPY_KEYS.footer,
        // Under every route, so there is no single page to send an editor to.
        // The homepage is where they will already be.
        page: '/',
        section: 'Patička',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis adresy' },
            { path: 'items.*.label', kind: 'text', label: 'Řádky patičky' },
        ]),
    },
    {
        type: 'siteCopy',
        key: GLOBAL_COPY_KEYS.footerClaim,
        page: '/',
        section: 'Patička — tvrzení',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Řádky tvrzení' },
        ]),
    },
    {
        // The two social buttons print their own label and the telephone and the
        // e-mail print their own target, so both halves are on the page.
        type: 'siteCopy',
        key: GLOBAL_COPY_KEYS.footerLinks,
        page: '/',
        section: 'Patička — odkazy',
        fields: Object.freeze([
            { path: 'items.*.label', kind: 'text', label: 'Popisky odkazů' },
            { path: 'items.*.value', kind: 'link', label: 'Cíle odkazů' },
        ]),
    },
    {
        type: 'siteCopy',
        key: GLOBAL_COPY_KEYS.contact,
        page: '/',
        section: 'Kontaktní formulář',
        fields: Object.freeze([
            { path: 'title', kind: 'text', label: 'Nadpis' },
            { path: 'body', kind: 'text', label: 'Text pod nadpisem' },
            { path: 'items.*.label', kind: 'text', label: 'Popisky formuláře' },
        ]),
    },
])

/** `{ current }` or a bare string -> string. Same leniency as the core's slug. */
const keyOf = (value) => {
    if (value && typeof value === 'object') return String(value.current ?? '')
    return typeof value === 'string' ? value : ''
}

/**
 * The surface a document body belongs to, or `null`.
 *
 * Takes the body rather than the envelope because the two callers hold
 * different things — the Studio has `draft ?? data`, the site layer has a
 * shaped block — and both have the key.
 */
export const surfaceFor = (type, body) => {
    const key = keyOf(body?.key)
    if (!type || !key) return null
    return VISUAL_SURFACES.find((entry) => entry.type === type && entry.key === key) || null
}

/** Does this type have any visual surface at all? Cheap enough to call per row. */
export const typeHasSurfaces = (type) => VISUAL_SURFACES.some((entry) => entry.type === type)

// Why the save path does not consult this file.
//
// It would be an obvious place to enforce "only these fields may be patched
// visually", and that check would be worth almost nothing: the route already
// requires an editor session, and an editor may change any field of any document
// through the form editor. A whitelist here would not be a security boundary,
// only a second list to keep in step with the schema. What the route enforces
// instead is the thing that actually matters — the write lands in `draft`, and
// the value passes the field's own validation.
