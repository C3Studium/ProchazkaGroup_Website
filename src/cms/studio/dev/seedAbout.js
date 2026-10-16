/**
 * Fixture blocks for /o-nas and for the two shared surfaces `_app` renders under
 * every route — the patička and the contact sheet. Same contract as ./seed.js,
 * which spreads this into its own `siteCopy` list: wrapper keys are
 * underscore-prefixed, `data` is the document body, and every value shape is one
 * `src/cms/core/fieldTypes.js` accepts.
 *
 * Its own file rather than eleven more blocks in seed.js, because seed.js was
 * being extended for the homepage at the same time and a two-thousand-line array
 * edited from both ends is a merge conflict per block. The single seam is the
 * spread in seed.js.
 *
 * EVERY string below is the value the component already falls back to, copied
 * rather than rewritten, and every image points at the file the component
 * already names. That is the acceptance test for this file: with these
 * documents loaded, /o-nas renders exactly the page it rendered without them.
 * They are PUBLISHED for the same reason — the public site reads `data` on
 * published rows only, and a draft here would leave the page on its fallbacks.
 *
 * The `*…*` highlight convention is deliberately not used anywhere in here.
 * Nothing on /o-nas or in the patička draws an accent span, so an asterisk would
 * go on the page as an asterisk. See the note at the head of
 * `@/cms/server/site/aboutUs.js`.
 */

/* ---------------------------------------------------------------- assets -- */

/**
 * The four photographs of the history, as the image field holds them: the whole
 * asset object, not a reference to one.
 *
 * They are NOT in `seedAssets` — that array lives in seed.js and putting them
 * there is a second edit to the file this one exists to leave alone. The
 * consequence is exact and small: an editor replacing one of these picks from
 * the library or uploads a new file, and these four are not among the library's
 * own rows until somebody uploads them. Nothing else reads an asset by id.
 */
const HISTORY_PHOTOS = [
    {
        id: 'asset-history-1',
        url: '/assets/backgrounds/wheels/questRoom.webp',
        mime: 'image/webp',
        alt: '',
        filename: 'questRoom.webp',
    },
    {
        id: 'asset-history-2',
        url: '/assets/backgrounds/wheels/mainOffice.webp',
        mime: 'image/webp',
        alt: '',
        filename: 'mainOffice.webp',
    },
    {
        id: 'asset-history-3',
        url: '/assets/backgrounds/wheels/family.webp',
        mime: 'image/webp',
        alt: '',
        filename: 'family.webp',
    },
    {
        id: 'asset-history-4',
        url: '/assets/backgrounds/secondOffice_1300.webp',
        mime: 'image/webp',
        alt: '',
        filename: 'secondOffice_1300.webp',
    },
]

/**
 * The four panels say the same two sentences today — they are the shape the real
 * history will take, not the history (see the note on MILESTONES in the
 * component). Copied here verbatim, placeholder and all: this file's job is to
 * reproduce the page, not to improve it.
 */
const HISTORY_DATE = '2023-11-15 | Annual Company Meeting'
const HISTORY_BODY =
    'A weekend retreat focused on team-building activities to strengthen collaboration ' +
    'and communication among team members.'

/** One item, with the three fields no block below uses left empty. */
const line = (label, extra = {}) => ({ lead: '', label, value: '', note: '', ...extra })

/**
 * A link, as siteCopy can hold one: the words in `label`, the target in `value`.
 *
 * `value` rather than a `url` field of its own, deliberately. The item shape is
 * `{ lead, label, value, note }` and `value` is already "Hodnota / obsah" — a
 * `text` field with no format of its own — so a target fits it without changing
 * a schema every existing document is validated against. The check that matters
 * is not the schema's anyway: `@/cms/edit/overlay/href.js` holds the accept list
 * (/path, https://, mailto:, tel:) and runs on the value an editor types.
 *
 * `label` is filled even where nothing renders it — an icon has no words on
 * screen — because it is `required()` in the schema and publish() validates the
 * whole body. An item with an empty label is a block that cannot be published.
 */
const link = (label, value) => ({ lead: '', label, value, note: '' })

/* ------------------------------------------------------------- documents -- */

export const seedAboutCopy = [
    /* ---- /o-nas ---------------------------------------------------------- */

    /* The threshold between the team and the history. Its `title` is the block's
     * name in the Studio and is NOT rendered — the heading is two items, because
     * it is set with a hard line break and each line has to be an element of its
     * own before it can be clicked. Same for the paragraph under it and for the
     * three words inside the hold button. */
    {
        _id: 'siteCopy-a1',
        _status: 'published',
        _createdAt: '2026-08-21T09:00:00.000Z',
        _updatedAt: '2026-08-21T09:00:00.000Z',
        data: {
            key: 'o-nas.prompt',
            page: 'o-nas',
            title: 'Pokračovat na historii',
            body: '',
            items: [
                // 0–1  the question
                line('Máte zájem pokračovat dál?'),
                line('Podívejte se na naši historii.'),
                // 2–4  the three lines under it
                line('Od modestních začátků'),
                line('pro vytváření hodnoty'),
                line('našim klientům'),
                // 5–7  the words inside the button you hold
                line('Podržte'),
                line('pro'),
                line('pokračování'),
            ],
        },
    },

    /* The showcase's two pieces of copy that belong to the section rather than to
     * a card: the call to action every card carries, and the six values the
     * travelling discs are lettered with. The standing note under the cards is
     * `o-nas.showcase` in seed.js and stays there. */
    {
        _id: 'siteCopy-a2',
        _status: 'published',
        _createdAt: '2026-08-21T09:02:00.000Z',
        _updatedAt: '2026-08-21T09:02:00.000Z',
        data: {
            key: 'o-nas.showcase.values',
            page: 'o-nas',
            title: 'Karty — tlačítko a hodnoty',
            body: '',
            items: [
                // 0  the button on all three cards. Its target is /kontakt — a
                //    path on this site — so only the words are editable and the
                //    target is not stored here at all.
                line('Zájem o pozici'),
                // 1–6  the discs, in the order they are lettered
                line('Poctivost'),
                line('Odbornost'),
                line('Tým'),
                line('Růst'),
                line('Důvěra'),
                line('Výsledky'),
            ],
        },
    },

    /* Every link on /o-nas that leaves the site. They are one block because they
     * are one kind of thing — words plus a target — and because three of the four
     * are icons with no words on screen, which is a shape the copy blocks above
     * have no room for. */
    {
        _id: 'siteCopy-a3',
        _status: 'published',
        _createdAt: '2026-08-21T09:04:00.000Z',
        _updatedAt: '2026-08-21T09:04:00.000Z',
        data: {
            key: 'o-nas.links',
            page: 'o-nas',
            title: 'Odkazy mimo web',
            body: '',
            items: [
                // 0  the rotating badge over the hero. The trailing space is the
                //    ring's own: the sentence is set twice round a circle and the
                //    space is what keeps the two apart.
                link('Nahlášení pojistného - Nahlášení pojistného - ', 'https://www.pojistnehlaseni.cz/'),
                // 1–3  the three icons beside a colleague's portrait. Their words
                //      are never on screen, so the label is what the Studio's list
                //      calls them.
                link('E-mail', 'mailto:asistentka.prochazka@ovbone.cz'),
                link('Facebook', 'https://www.facebook.com/prochazkagroup'),
                link('Instagram', 'https://www.instagram.com/prochazkagroup'),
            ],
        },
    },

    /* One block per panel of the history, because each panel owns a photograph
     * and siteCopy holds a single `image`. The order is
     * ABOUT_COPY_KEYS.historyPanels, and it is the order they are ridden through.
     *
     * `title` is the dateline the panel prints, `body` its paragraph, and
     * `items[0].label` the numeral set large behind both. The numeral is a
     * position in a fixed list of four — the track's width is computed from it —
     * so an editor may change what it says, not how many there are. */
    ...HISTORY_PHOTOS.map((photo, index) => ({
        _id: `siteCopy-a${4 + index}`,
        _status: 'published',
        _createdAt: '2026-08-21T09:06:00.000Z',
        _updatedAt: '2026-08-21T09:06:00.000Z',
        data: {
            key: `o-nas.history.0${index + 1}`,
            page: 'o-nas',
            title: HISTORY_DATE,
            body: HISTORY_BODY,
            image: { ...photo },
            items: [line(`0${index + 1}`)],
        },
    })),

    /* ---- under every route ----------------------------------------------- */

    /* The left half of the patička's top row. Separate from `global.footer`,
     * which is the address column on the right: they are two blocks of copy that
     * happen to sit side by side, and the claim is the only one of the two set
     * with hard line breaks. Each line is an item for exactly that reason. */
    {
        _id: 'siteCopy-a8',
        _status: 'published',
        _createdAt: '2026-08-21T09:08:00.000Z',
        _updatedAt: '2026-08-21T09:08:00.000Z',
        data: {
            key: 'global.footer.claim',
            page: 'global',
            title: 'Patička — tvrzení',
            body: '',
            items: [
                // 0–1  the claim
                line('Jsme odhodláni vám zlehčit'),
                line('finanční aspekt života.'),
                // 2–3  the two lines beside the button
                line('Kdykoliv jste připraveni,'),
                line('my jsme taky.'),
                // 4  the button. /kontakt is a path on this site, so its words are
                //    editable and its target is not.
                line('Spojit'),
            ],
        },
    },

    /* The patička's four outward links. Same argument as `o-nas.links`: a target
     * is not copy, and two of these four have no words on screen that the site
     * would recognise as a label. */
    {
        _id: 'siteCopy-a9',
        _status: 'published',
        _createdAt: '2026-08-21T09:10:00.000Z',
        _updatedAt: '2026-08-21T09:10:00.000Z',
        data: {
            key: 'global.footer.links',
            page: 'global',
            title: 'Patička — odkazy',
            body: '',
            items: [
                // 0–1  the telephone and the e-mail print their own target, so
                //      here the label and the value say the same thing twice —
                //      once as words and once as a link.
                link('+420 777 898 157', 'tel:+420777898157'),
                link('ovb.asistenka@ovbmail.cz', 'mailto:ovb.asistenka@ovbmail.cz'),
                // 2–3  the two social buttons
                link('Facebook', 'https://www.facebook.com/prochazka.group'),
                link('Instagram', 'https://www.instagram.com/prochazka.group/'),
            ],
        },
    },

    /* The contact sheet the navigation opens. Everything on it except the person
     * on the right, who is her own document (`assistant`) and opens as her own
     * form — see the editableDoc() call in the component.
     *
     * The non-breaking space in item 3 is the markup's own (`+420&nbsp;|`) and is
     * load-bearing, which is why these lines are read as `title` / `items[].label`
     * rather than through `plainText()`. */
    {
        _id: 'siteCopy-a10',
        _status: 'published',
        _createdAt: '2026-08-21T09:12:00.000Z',
        _updatedAt: '2026-08-21T09:12:00.000Z',
        data: {
            key: 'global.contact',
            page: 'global',
            title: 'Spojme se',
            body: 'Napište nám a ozveme se vám zpátky — obvykle do jednoho pracovního dne.',
            items: [
                // 0–2  the three required inputs. The asterisk after each is drawn
                //      by the component and is not part of the label.
                line('Jméno'),
                line('Email'),
                line('Telčíslo'),
                // 3  the dial prefix in front of the telephone input
                line('+420 |'),
                // 4–6  the preferred-time row
                line('Preferovaný čas hovoru'),
                line('Od'),
                line('Do'),
                // 7–8  the consent line and the word that links to the policy.
                //      /ochrana-soukromi is a path on this site: words only.
                line('Kliknutím na tlačítko souhlasíte ke zpracování vašich osobních údajů'),
                line('více'),
                // 9  the submit button
                line('Poslat zprávu'),
                // 10  the line over her own address and telephone
                line('Nebo rovnou'),
            ],
        },
    },
]

export default seedAboutCopy
