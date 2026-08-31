/**
 * Fixture blocks for /recenze and /recenze/[slug]. Same contract as ./seed.js,
 * which spreads this into its own `siteCopy` list: wrapper keys are
 * underscore-prefixed, `data` is the document body, and every value shape is one
 * `src/cms/core/fieldTypes.js` accepts.
 *
 * Its own file rather than four more blocks in seed.js, on the argument
 * ./seedAbout.js makes: an array edited from four sides at once is a merge
 * conflict per block. The seam is one import and one spread.
 *
 * NO STRING THAT REACHES A PAGE WAS TYPED HERE. Every one was read out of the
 * JSX that ships it —
 * ReviewsHero, ReviewWall, AddReview and AdvisorCard — by a generator that refuses
 * any value carrying a quote, a backslash or a non-breaking space, so nothing
 * here can be a character no diff will show. The only hand-written strings are
 * the two `title`s that name a block in the Studio's list and are on neither
 * page. With these loaded, both
 * routes render exactly the pages they render without them; that is the
 * acceptance test for this file.
 *
 * PUBLISHED, for the reason seedAbout.js gives: the public site reads `data` on
 * published rows only, and a draft here would leave both pages on their
 * fallbacks.
 *
 * The `*…*` highlight convention is deliberately not used. Nothing on either
 * page draws an accent span — the hero's two-line paragraph goes through
 * `f.rawLines`, which splits the stored string at its breaks and decodes
 * nothing — so an asterisk would go on the page as an asterisk.
 *
 * WHAT IS NOT HERE, and why each is a document rather than page copy:
 *
 *   a review's words        the customer's. The wall annotates a card as a whole
 *                           `review` document narrowed to moderation; nobody on
 *                           this side may rewrite one.
 *   a consultant's name,    theirs. The card's `<h1>`, its motto and its counts
 *   motto, portrait, counts are fields of the consultant document and open that
 *                           document's own form.
 *   the two counters        "14 recenzí" and "14 / 14" are computed from how many
 *                           reviews came back, so there is no stored value under
 *                           them.
 *   the three form labels   each is `Vaše jméno<em>*</em>` in one element: the
 *                           words have no element of their own, and storing the
 *                           element whole would put the asterisk into the copy
 *                           and drop its `<em>` on the first save.
 *   the thanks panel        it renders only after a successful POST, so no
 *                           editing surface reaches it.
 */

/** One item of a positional list: a label, and nothing else these blocks use. */
const item = (label) => ({ lead: '', label, value: '', note: '' })

/** A hand-broken value, as siteCopy stores one: its lines joined by `\n`. */
const broken = (...parts) => parts.join('\n')

/**
 * The envelope, so four blocks do not restate it four times. `_id` is in its own
 * namespace (`siteCopy-rec…`) because seed.js's own list and the other four
 * seed files are numbered independently and a collision would silently drop one
 * of them.
 */
const block = (id, key, data) => ({
    _id: `siteCopy-rec${id}`,
    _status: 'published',
    _createdAt: '2026-08-28T11:00:00.000Z',
    _updatedAt: '2026-08-28T11:00:00.000Z',
    data: { page: 'recenze', headline: '', body: '', items: [], ...data, key },
})

export const seedReviewsCopy = [
    /* The head. Three fields for three elements, which is the whole rule this
     * block is built on: the eyebrow is a <span>, the wordmark is TextPressure's
     * own box, and the sentence under the rule is one <p> with a hard break in
     * it. `title` carries the eyebrow because it is also the name an editor
     * reads in the Studio's list — the arrangement the patička's address column
     * already uses — and `headline` carries the break as the `\n` siteCopy.js
     * documents. */
    block(1, 'recenze.hero', {
        title: 'Recenze',
        // The wordmark. `body` rather than an item: it is read plain, and
        // TextPressure sets one character per <span>, so a break in it would be
        // a lettered <span> holding whitespace.
        body: 'Co o nás říkají',
        headline: broken('Každou z nich napsal někdo,', 'kdo si nás vybral.'),
    }),
    /* The word that closes the wall. Two items and only ever one of them on
     * screen — the grid says "everything" when it has run out of reviews and
     * "loading" while the next batch is on its way — so the element carries the
     * address of whichever it is showing. `title` is the name in the Studio's
     * list and is not on the page. */
    block(2, 'recenze.zed', {
        title: 'Zeď recenzí',
        items: [item('To je zatím všechno'), item('Načítám další…')],
    }),
    /* The ask, and the sheet behind it. `title` is the sheet's own eyebrow,
     * `body` the line under the send button, and the three items are the words
     * on the two buttons plus the one the send button wears while a submission
     * is in flight. The three field labels are absent — see the head of this
     * file. */
    block(3, 'recenze.formular', {
        title: 'Recenze',
        body: 'Recenze se zveřejní až po schválení.',
        items: [item('Napsat recenzi'), item('Odeslat'), item('Odesílám…')],
    }),
    /* The one consultant's card, which is /recenze/[slug]. Everything here is
     * the PAGE's copy and not the person's: it is the same words on all ten
     * cards, edited once. The city is the office's, not a field of whoever is
     * on screen — it is the same for everybody the group has. */
    block(4, 'recenze.poradce', {
        title: 'Napište recenzi',
        body: 'Recenze se zveřejní až po schválení.',
        items: [item('Písek'), item('Odeslat recenzi'), item('Odesílám…')],
    }),
]

export default seedReviewsCopy
