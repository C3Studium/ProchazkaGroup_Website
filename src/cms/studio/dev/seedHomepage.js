/**
 * Fixture blocks for the homepage's sections. Same contract as ./seed.js, which
 * spreads both lists below into its own: wrapper keys are underscore-prefixed,
 * `data` is the document body, and every value shape is one
 * `src/cms/core/fieldTypes.js` accepts.
 *
 * Its own file rather than eleven more blocks in seed.js, on the argument
 * ./seedAbout.js already makes and for the same reason — a two-thousand-line
 * array edited from three sides is a merge conflict per block. The seams are the
 * two spreads in seed.js.
 *
 * EVERY string below is the value the component already falls back to, copied
 * rather than rewritten, and every image points at the file the component
 * already names. That is the acceptance test for this file: with these documents
 * loaded, `/` renders exactly the page it rendered without them. They are
 * PUBLISHED for the same reason — the public site reads `data` on published rows
 * only, and a draft here would leave the page on its fallbacks.
 *
 * The `*…*` highlight convention is used in two blocks: `index.offers` (in
 * seed.js) and this file's `index.hero`, whose <h1> ends on an accented run.
 * Both are fields that DECLARE the mark — `items[].label` and `headline` — and
 * an asterisk in any other field here would go on the page as an asterisk.
 *
 * `headline` holds the one element of a block whose lines are broken by hand.
 * The break is stored as `\n`; four of them are seeded below and each is the
 * element the client reported as "nejde editovat".
 *
 * The index of an item is its address. `src/cms/server/site/homepage.js` states
 * every map, once, next to the shape it produces; the comments below are the
 * same map read from this end, and both are APPEND-ONLY. Inserting a line in the
 * middle of a list moves every line after it onto the wrong element, and nothing
 * fails loudly when it happens — the page simply says the wrong words.
 */

/* ---------------------------------------------------------------- assets -- */

/**
 * The five photographs the rest of the homepage ships with. Rows of the media
 * library, spread into `seedAssets` by seed.js — a block pointing at a file the
 * library has never heard of is the one image in the system that cannot be
 * replaced with a sibling. Dimensions and byte sizes are the files' own.
 */
export const seedHomepageAssets = [
    {
        id: 'asset-32',
        url: '/assets/backgrounds/about.webp',
        width: 6014,
        height: 4016,
        mime: 'image/webp',
        alt: 'Tým Procházka Group',
        filename: 'about.webp',
        size: 1207760,
        createdAt: '2026-08-20T08:10:00.000Z',
    },
    {
        id: 'asset-33',
        url: '/assets/backgrounds/Trophies_03.webp',
        width: 3951,
        height: 5926,
        mime: 'image/webp',
        alt: 'Ocenění Procházka Group',
        filename: 'Trophies_03.webp',
        size: 1072082,
        createdAt: '2026-08-20T08:12:00.000Z',
    },
    // The deck's three. 900px copies rather than the 6000×4000 originals — the
    // cards render at ~420px and decoding the originals stutters the ride.
    {
        id: 'asset-34',
        url: '/assets/backgrounds/wheels/family.webp',
        width: 900,
        height: 600,
        mime: 'image/webp',
        alt: 'Rodina u jednacího stolu',
        filename: 'family.webp',
        size: 50766,
        createdAt: '2026-08-20T08:14:00.000Z',
    },
    {
        id: 'asset-35',
        url: '/assets/backgrounds/wheels/questRoom.webp',
        width: 900,
        height: 600,
        mime: 'image/webp',
        alt: 'Jednací místnost kanceláře',
        filename: 'questRoom.webp',
        size: 25362,
        createdAt: '2026-08-20T08:16:00.000Z',
    },
    {
        id: 'asset-36',
        url: '/assets/backgrounds/wheels/mainOffice.webp',
        width: 900,
        height: 600,
        mime: 'image/webp',
        alt: 'Hlavní kancelář Procházka Group',
        filename: 'mainOffice.webp',
        size: 50172,
        createdAt: '2026-08-20T08:18:00.000Z',
    },
]

const asset = (id) => ({ ...seedHomepageAssets.find((entry) => entry.id === id) })

/** One item of a positional list: a label, and nothing else the block uses. */
const line = (label) => ({ lead: '', label, value: '', note: '' })

/** One item that carries a second string — a stat's figure, a link's target. */
const pair = (label, value) => ({ lead: '', label, value, note: '' })

/** One member of a `questions` array — the pair, named. See schemas/qna.js. */
const qa = (question, answer) => ({ question, answer })

/**
 * The envelope, so eleven blocks do not restate it eleven times. `_id` is in its
 * own namespace (`siteCopy-h…`) because seed.js's own list and seedAbout.js's
 * are numbered independently and a collision would silently drop one of them.
 */
const block = (id, key, data) => ({
    _id: `siteCopy-h${id}`,
    _status: 'published',
    _createdAt: '2026-08-20T08:00:00.000Z',
    _updatedAt: '2026-08-20T08:00:00.000Z',
    data: { page: 'index', body: '', items: [], ...data, key },
})

/* ------------------------------------------------------------- documents -- */

export const seedHomepageCopy = [
    /* MainIntro. The <h1> is here now, in `headline`: a break is `\n` in the
     * store and `<br />` on the page, so an element holding one no longer has to
     * be kept out of the CMS to stop the in-place editor welding its lines.
     * The "Máme více než / 3000 klientů" aside is still absent — it is a second
     * hand-broken element and this type has one. */
    block(1, 'index.hero', {
        title: 'Úvod stránky',
        // The <h1>, exactly as it stands: four lines set with `<br />`, stored
        // with `\n`, and one accented run — the component draws that run with
        // its own class (`.highlighted`), which is why the asterisks are the
        // mark's encoding and not the class name. `title` above is the block's
        // name in the Studio's list and is not on the page.
        headline: 'Budujeme pro lidi\nstabilní a kvalitní\nfinanční poradenství\nuž přes *jednu dekádu*',
        image: asset('asset-32'),
        items: [
            // 0  the hint at the foot of the first screen
            line('Scroll down'),
            // 1  the rotating badge. Its letters are one <span> each, so the
            //    link is annotated as an icon — target only — and the label is
            //    what the link announces to a screen reader.
            pair('Nahlášení pojistného', 'https://www.pojistnehlaseni.cz/'),
            // 2  the Recenze button's words. /recenze is a path on this site, so
            //    its target is routing rather than content and is not stored.
            line('Recenze'),
        ],
    }),

    /* FirstTime — the stats panel, and the first panel of the horizontal ride.
     * Four stats, because the layout is four columns keyed by index
     * (`FirstTime__stat--3`): an editor changes what a stat says, not how many
     * there are. */
    block(2, 'index.first-time', {
        title: 'Jste tu poprvé?',
        items: [
            // 0–3  the stats, figure in `value` and caption in `label`
            pair('Let na trhu', '12'),
            pair('Spokojených klientů', '3000+'),
            pair('partnerských společností', '43'),
            pair('podepsaných smluv', '9000+'),
            // 4  the lead paragraph
            line('Koukněte na to, jak vám můžeme pomoct, protože nejde jen o peníze.'),
            // 5  the heading under it
            line('Jste tu poprvé?'),
            // 6  the scroll hint
            line('Scroll down'),
            // 7  the Mám zájem button's words
            line('Mám zájem'),
        ],
    }),

    /* Panel 2 of the ride. */
    block(3, 'index.clients', {
        title: 'Pro naše klienty',
        // The paragraph, as the one element it is: two SplitTexts in one <p>
        // with a `<br />` between them, so the break is part of the value.
        headline: 'Benefit program.\nStačí, aby se z vašeho doporučení stal nový klient, a peníze jsou vaše. Vyhráváte jak vy tak i druhý.',
        // The deck's three photographs, in the order they are dealt. This is the
        // set the imageSet popup reorders; each card's CAPTION is still its own
        // block below, paired to a picture by the asset rather than by position
        // (see `deckCards` in server/site/homepage.js). The files are the ones
        // the component already names, copied rather than rewritten — 900px
        // copies in /wheels, because the cards render at ~420px.
        gallery: [asset('asset-34'), asset('asset-35'), asset('asset-36')],
        items: [
            // 0–1  the two lines of the paragraph, and the address they had
            //      before `headline` existed. Kept, not deleted: this list is
            //      APPEND-ONLY and emptying either would move the two lines
            //      below onto the wrong elements. `headline` is what is read.
            line('Benefit program.'),
            line('Stačí, aby se z vašeho doporučení stal nový klient, a peníze jsou vaše. Vyhráváte jak vy tak i druhý.'),
            // 2  the Zobrazit button's words
            line('Zobrazit'),
            // 3  the scroll hint
            line('Scroll down'),
        ],
    }),

    /* The deck, one block per card — siteCopy holds a single `image`, so this is
     * the only shape in which the three are separately replaceable. The order is
     * HOMEPAGE_COPY_KEYS.clientCards, which is the order they are dealt in.
     *
     * `title` is the caption printed under the picture. The picture itself is
     * rendered `alt=""` and stays that way: the caption is directly beside it,
     * and repeating it in an alt attribute is the same words twice. See
     * `decorative()` in server/site/homepage.js. */
    block(4, 'index.clients.karta-1', { title: 'Rodinné finance', image: asset('asset-34') }),
    block(5, 'index.clients.karta-2', { title: 'Naše kancelář', image: asset('asset-35') }),
    block(6, 'index.clients.karta-3', { title: 'Konzultace', image: asset('asset-36') }),

    /* Panel 3 of the ride. `body` is stored plain: SplitText slices it per word
     * and a `<p>` in the middle of that is a bug you only see in the browser. */
    block(7, 'index.join', {
        title: 'Přidejte se k nám',
        body: 'Skrze finanční sektor umožňujeme vyvíjet nové úspěšné příběhy, a to nejen ty vaše. Společně měníme každodenní sny ve skutečnost.',
        image: asset('asset-33'),
        items: [
            // 0  the Zobrazit button's words
            line('Zobrazit'),
        ],
    }),

    /* ReviewsPreview's own copy. The quotes are `review` documents and are not
     * here; the section's heading is not here either, for the `<br />` reason
     * given at index.hero, and neither are the two links beside the aside —
     * their words are a typing animation between two stored strings, so the DOM
     * never holds a settled value for an in-place editor to read back. */
    block(8, 'index.reviews', {
        title: 'Prohlédněte si další recenze',
        // The section's heading, with the break where the markup has one. It
        // also holds the Recenze button, whose target is a path on this site and
        // therefore routing rather than content.
        headline: 'Prohlédněte si další\nrecenze',
        items: [
            // 0  the aside, figure in `value` and caption in `label`
            pair('Spokojených klientů', '3000+'),
            // 1  the scroll hint
            line('Scroll down'),
        ],
    }),

    /* ChooseAdvisor's left column and the labels around the chosen advisor. The
     * advisors themselves are `consultant` documents and are not here.
     *
     * The non-breaking space in item 2 is the markup's (`poradit?&nbsp; |`) and
     * is load-bearing: `stringValue` hands the label through untouched, which is
     * why it is read as a label and never through `plainText` — `\s` in
     * JavaScript matches U+00A0, so the plain reading would quietly turn it into
     * an ordinary space. */
    block(9, 'index.advisors', {
        title: 'Zvolit poradce',
        items: [
            // 0–1  where to find the office
            line('Kde nás najdete |'),
            line('Smetanova 78/1, 39701 Písek'),
            // 2–3  the help line and the number it prints. A tel: target leaves
            //      this site, so both the words and the target are stored.
            line('Potřebujete poradit?  | 8-16'),
            pair('+420 776 157 476', 'tel:+420776157476'),
            // 4  the claim above the form
            line('Přidejte se k našim 3000+ klientům, kteří už dávno začali vyhrávat.'),
            // 5  the line over the chosen advisor's telephone
            line('Zavolejte nebo napište'),
            // 6  the city under their name. The office's, not theirs: the
            //    consultant type has no geographic field and inventing one to
            //    fill this line would be inventing data.
            line('Písek'),
        ],
    }),

    /* The form beside the advisor list. Jméno / Email / Telčíslo are absent:
     * each is `Jméno<Req />&nbsp;|`, where the asterisk and the rule are drawn
     * by elements inside the label rather than characters in it, so an in-place
     * edit would read them back as part of the word and store "Jméno* |". */
    block(10, 'index.advisors.formular', {
        title: 'Zvolit poradce — formulář',
        items: [
            // 0  the form's own heading
            line('Vyplňte formu'),
            // 1–3  the preferred-time row
            line('Preferovaný čas hovoru'),
            line('Od'),
            line('Do'),
            // 4  the word that links to the privacy policy. /ochrana-soukromi is
            //    a path on this site: words only, no target.
            line('více'),
            // 5  the submit button
            line('Poslat zprávu'),
        ],
    }),

    /* QnaContact's head and switch. The heading is absent for the `<br />`
     * reason given at index.hero. The photograph is decorative — the heading
     * beside it says what the section is — so it renders `alt=""` and stays
     * that way; see `decorative()` in server/site/homepage.js. */
    block(11, 'index.qna', {
        title: 'Máte nějaký dotaz?',
        headline: 'Máte nějaký\ndotaz?',
        body: 'Některé z nich jsme už zodpověděli. Nebo se nás rovnou zeptejte',
        image: asset('asset-26'),
        items: [
            // 0–1  the two tabs of the switch
            line('Kontakt'),
            line('QNA'),
            // 2  the heading over whichever answer is open
            line('Odpověď'),
        ],
    }),

    /* The five questions, in `questions` rather than in `items`.
     *
     * The pair is the unit here — the answer on screen is whichever question is
     * open — and a positional list cannot say so: it held the question in
     * `label` and the answer in `value`, which is two addresses an editor keeps
     * in step by counting, and a popup rendering that form would label them
     * "Popisek" and "Hodnota / obsah". The array's member is `qna`'s own pair
     * (schemas/qna.js), so one `list` popup can open a question with its answer
     * or the whole array, and reorder, add and remove are the array's own
     * operations rather than something this block has to allow.
     *
     * The words are the ones the component falls back to, copied rather than
     * rewritten. The COUNT is no longer fixed by this file: the panel's height
     * used to be measured against five, and round four asks for add and remove,
     * so what a sixth question does to the layout is the section's problem and
     * not the schema's. */
    block(12, 'index.qna.otazky', {
        title: 'Otázky a odpovědi',
        questions: [
            qa(
                'Jak nás můžete kontaktovat?',
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
            ),
            qa(
                'S jakými společnostmi spolupracujeme?',
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            ),
            qa(
                'S čím se na nás můžete obracet?',
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            ),
            qa(
                'Je tato služba pro klienta zdarma?',
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            ),
            qa(
                'Co je to Benefit program?',
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            ),
        ],
    }),

    /* The contact panel under the switch. Its inputs' placeholders are not here:
     * a placeholder is an attribute rather than a text node, and there is
     * nothing on the page for the overlay to put a caret in. */
    block(13, 'index.qna.formular', {
        title: 'Dotazy — formulář',
        // The message the box opens with. In `body` rather than on an item,
        // because a textarea's value is not a text node and has no element on
        // the page — and `items` is locked in the Studio for this block (see
        // VISUAL_SURFACES), which would have left this string editable nowhere.
        body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        items: [
            // 0–3  the four field labels
            line('Jméno'),
            line('Email'),
            line('Tel. číslo'),
            line('Subjekt'),
            // 4  the dial prefix in front of the telephone input
            line('+420'),
            // 5  the heading over the topic buttons
            line('Téma:'),
            // 6–11  the six topics. Six, because the row's wrap is measured
            //       against them; an editor changes what one says.
            line('Otázky/odpovědi'),
            line('Otázky/odpovědi'),
            line('Otázky/odpovědi'),
            line('Otázky/odpovědi'),
            line('Otázky/odpovědi'),
            line('Kontakt'),
            // 12  the heading over the message box. The message itself is the
            //     block's `body` — see the note above.
            line('Vaše zpráva:'),
            // 13–14  the consent line and the word that links to the policy
            line('Kliknutím na tlačítko souhlasíte ke zpracování vašich osobních údajů'),
            line('více'),
            // 15  the send button
            line('Poslat zprávu'),
        ],
    }),
]

export default seedHomepageCopy
