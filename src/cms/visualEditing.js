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
