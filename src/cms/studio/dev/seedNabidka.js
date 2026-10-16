/**
 * Fixture blocks for /nabidka. Same contract as ./seed.js, which spreads this
 * into its own `siteCopy` list: wrapper keys are underscore-prefixed, `data` is
 * the document body, and every value shape is one `src/cms/core/fieldTypes.js`
 * accepts.
 *
 * Its own file rather than twenty-one more blocks in seed.js, on the argument
 * ./seedAbout.js and ./seedPrivacy.js already make: a two-thousand-line array
 * edited from five sides is a merge conflict per block. The seam is one spread.
 *
 * **Nothing here was typed.** Every string was READ by a generator out of the
 * file that ships it — the `SHIPPED`/`FALLBACK_*` tables the six sections
 * declare, and `CHAIN` in OfferGrid/content.js — so a fixture cannot come to say
 * something the page does not. This is the largest page on the site; a word
 * changed while moving fourteen thousand characters into a CMS is not a typo,
 * it is a different page. The generator refuses any string carrying a
 * non-breaking space, a backslash or a quote, so nothing here can be a character
 * no diff will show, and it round-trips the hero's `headline` back through
 * `decodeLines` before emitting it — the stored `*…*` has to decode to the runs
 * the component ships, exactly.
 *
 * With these loaded, /nabidka renders exactly the page it renders without them;
 * that is the acceptance test for this file.
 *
 * PUBLISHED, for the reason seedAbout.js gives: the public site reads `data` on
 * published rows only, and a draft here would leave the page on its fallbacks.
 *
 * The `*…*` convention is used ONCE, in the hero's `headline`, because that
 * `<h1>` is the one element on this page that draws an accent run. Everywhere
 * else an asterisk would go on the page as an asterisk.
 *
 * What is NOT here, and why:
 *
 *   the three photographs — the hero's is the first frame of the band below it
 *     and has to stay the identical bitmap (see HANDOFF in OfferHero), and the
 *     other two carry a crop measured for the box the cell is cut into;
 *   the wall's cards — those are `review` documents, somebody else's words,
 *     moderated where they already are rather than on a third page;
 *   the chart's three legends and both `§`-style eyebrows — each is a swatch or
 *     a tick and its word inside one element, so the word has no element of its
 *     own; storing the parent would put the swatch into the copy and drop it on
 *     the first save.
 */

/** One item of a positional list: a label, and nothing else the block uses. */
const line = (label) => ({ lead: '', label, value: '', note: '' })

/**
 * The envelope, so twenty-one blocks do not restate it. `_id` is in its own
 * namespace (`siteCopy-n…`) because seed.js's own list and the four sibling
 * files are numbered independently and a collision would silently drop one.
 */
const block = (id, key, data) => ({
    _id: `siteCopy-n${id}`,
    _status: 'published',
    _createdAt: '2026-08-28T11:00:00.000Z',
    _updatedAt: '2026-08-28T11:00:00.000Z',
    data: { page: 'nabidka', body: '', items: [], ...data, key },
})

export const seedOfferCopy = [
    /* The hero. `title` is the eyebrow's words — a bare text node beside the
     * tick, so nothing on the page can carry their annotation and they are the
     * field that also names the block in the Studio's list. `headline` is the
     * <h1>: one element, one hard break, one accented run. */
    block(1, 'nabidka.hero', {
        title: 'Nabídka',
        headline: 'Nemáte na vaše\nfinance *prostor?*',
        body: 'Každý den, kdy vaše dluhy nebo inflace rostou, ztrácíte peníze, které už nikdy neuvidíte.',
        items: [
            { lead: '', label: 'Spojit se hned', value: '', note: '' },
            { lead: '', label: 'Scroll', value: '', note: '' },
        ],
    }),
    /* The statistics band's own labels. `title` is the question the band is
     * built round: it is drawn a letter at a time by `Written`, which leaves no
     * whitespace between the words in the DOM, so the element cannot be read
     * back and the question is edited in the form. items[0] is the standing
     * label's words, a bare text node between the tick and the source — same
     * refusal. items[1] and [2] are each their own element. */
    block(2, 'nabidka.realita', {
        title: 'Jaká je dneska realita finanční situace domácností v ČR',
        items: [
            { lead: '', label: 'Realita českých domácností', value: '', note: '' },
            { lead: '', label: 'dle statistik ČNB', value: '', note: '' },
            { lead: '', label: 'Dle statistik ČNB', value: '', note: '' },
        ],
    }),
    /* The three counts, as items rather than as three blocks: they are one
     * statement — a funnel the layout is computed from, 8 : 3 : 1 by area — and
     * none of the four strings has an element of its own to click. `text` and
     * `short` are each drawn twice, once on the tile and once in the open cell,
     * and the sentence at the foot reprints all three a third time for a screen
     * reader; a field is written by one element, so all of them are edited here.
     *
     *   lead   the figure                value  the sentence
     *   label  the line under the count  note   what it shrinks to on a tile
     *
     * `title` is not on the page — it is the name an editor reads in the list. */
    block(3, 'nabidka.realita.cisla', {
        title: 'Realita v číslech',
        items: [
            {
                lead: '8',
                label: 'Dluh, o kterém se nemluví, roste sám. Nejdřív pomalu.',
                value: 'domácností je v dluzích nebo je ignoruje',
                note: 'je v dluzích',
            },
            {
                lead: '3',
                label: 'Rozpočet pomáhá. Sám o sobě ale nestačí.',
                value: 'domácností se před dluhy brání rozpočtem a hospodařením',
                note: 'má rozpočet',
            },
            {
                lead: '1',
                label: 'Rozdíl není ve znalostech. Je v tom, že to někdo hlídá.',
                value: 'domácností má profesionála, který se o její finance stará',
                note: 'má poradce',
            },
        ],
    }),
    /* What the band ends on. `title` is the eyebrow's words, a bare text node
     * beside its tick. Both of the other two are drawn by SplitText, which
     * forwards rest props and keeps real spaces between the words, so both are
     * edited on the page. */
    block(4, 'nabidka.realita.zaver', {
        title: 'Co z toho plyne',
        body: 'Vaše starosti s financemi nejsou jen čísla.',
        items: [
            {
                lead: '',
                label: 'Jsou to roky života, které můžete ještě zachránit.',
                value: '',
                note: '',
            },
        ],
    }),
    /* The line of type between the band and the offer. Two stored strings for
     * the sentence rather than one `headline` with a break in it: it breaks with
     * a block child, and the overlay reads a block child as a line of its own
     * rather than as a `<br>` inside one value. `title` is not on the page. */
    block(5, 'nabidka.predel', {
        title: 'Přechod k nabídce',
        items: [
            { lead: '', label: '03 — 06', value: '', note: '' },
            { lead: '', label: 'Poradenství není produkt.', value: '', note: '' },
            { lead: '', label: 'Je to plán, který někdo hlídá.', value: '', note: '' },
        ],
    }),
    /* The offer, as one chain of fourteen rungs read downwards — four headings
     * and the ten blocks that answer them, in the order OfferGrid draws them.
     *
     * One block per rung, and the granularity stops there. A rung is a heading
     * and one sentence; a field per clause would put three boxes in front of
     * somebody holding one line. How MANY rungs there are is not an editor's
     * decision: `PLAN` in OfferGrid is written against their indices, so a
     * fifteenth is a code change, and what a block supplies is words over the
     * ones the component ships with.
     *
     * The KEY is the rung's own number, which is also its first item, because
     * that number is what the page and the Studio's list are both read by. */
    block(6, 'nabidka.blok.03', {
        title: 'Co všechno pro vás vyřešíme',
        body: 'To, co by vám trvalo několik dekád, zvládneme během několika let.',
        items: [
            { lead: '', label: '03', value: '', note: '' },
        ],
    }),
    block(7, 'nabidka.blok.03.01', {
        title: 'Bez stresu a presu',
        body: 'Smlouvy a rezervy sledujeme za vás. Když se objeví něco výhodnějšího, dáme vědět.',
        items: [
            { lead: '', label: '03.01', value: '', note: '' },
        ],
    }),
    block(8, 'nabidka.blok.03.02', {
        title: 'Kontrola nad situací',
        body: 'Přes tři tisíce portfolií hlídáme průběžně. Vy u toho sedět nemusíte.',
        items: [
            { lead: '', label: '03.02', value: '', note: '' },
        ],
    }),
    block(9, 'nabidka.blok.03.03', {
        title: 'Nezávislost na trhu',
        body: 'Nejsme vázaní na jednu společnost ani na banku. Plán je na míru vám, ne produktu.',
        items: [
            { lead: '', label: '03.03', value: '', note: '' },
        ],
    }),
    block(10, 'nabidka.blok.04', {
        title: 'Nejste experti na finanční trh?',
        body: 'Nikdo z nás nemá desítky hodin týdně na sledování trhu. Uděláte jen tolik, abyste si vytvořili rezervy — výsledky profesionálů máte i tak.',
        items: [
            { lead: '', label: '04', value: '', note: '' },
        ],
    }),
    block(11, 'nabidka.blok.04.01', {
        title: 'Trh sledujeme my',
        body: 'Vy si řeknete, kolik chcete odkládat. Kam to půjde a kdy se to má přesunout, je naše práce.',
        items: [
            { lead: '', label: '04.01', value: '', note: '' },
        ],
    }),
    block(12, 'nabidka.blok.04.02', {
        title: 'Rozhodnutí zůstávají vaše',
        body: 'Dostanete čísla a možnosti, ne pokyny. Podepisujete jen to, čemu rozumíte.',
        items: [
            { lead: '', label: '04.02', value: '', note: '' },
        ],
    }),
    block(13, 'nabidka.blok.05', {
        title: 'Jak s námi můžete začít',
        body: 'Tři kroky, které jsou u všech stejné.',
        items: [
            { lead: '', label: '05', value: '', note: '' },
        ],
    }),
    block(14, 'nabidka.blok.05.01', {
        title: 'První schůzka',
        body: 'Projdeme, kde jste teď a co byste chtěli. Nic se nepodepisuje a nic neplatíte.',
        items: [
            { lead: '', label: '05.01', value: '', note: '' },
        ],
    }),
    block(15, 'nabidka.blok.05.02', {
        title: 'Modelování',
        body: 'Postavíme plán na míru a ukážeme, co dělá s vašimi penězi v čase.',
        items: [
            { lead: '', label: '05.02', value: '', note: '' },
        ],
    }),
    block(16, 'nabidka.blok.05.03', {
        title: 'Pravidelný servis',
        body: 'Portfolio hlídáme dál. Změní-li se trh nebo váš život, změní se s ním plán.',
        items: [
            { lead: '', label: '05.03', value: '', note: '' },
        ],
    }),
    block(17, 'nabidka.blok.06', {
        title: 'Co vás to stojí',
        body: 'Vás nic. Platí nás partnerské společnosti, se kterými smlouvu nakonec uzavřete.',
        items: [
            { lead: '', label: '06', value: '', note: '' },
        ],
    }),
    block(18, 'nabidka.blok.06.01', {
        title: 'Schůzka i plán zdarma',
        body: 'Platíte až za produkt, který si vyberete — a ten byste platili tak jako tak.',
        items: [
            { lead: '', label: '06.01', value: '', note: '' },
        ],
    }),
    block(19, 'nabidka.blok.06.02', {
        title: 'Třiačtyřicet partnerů',
        body: 'Protože jich máme tolik, nemáme důvod tlačit vás k jednomu z nich.',
        items: [
            { lead: '', label: '06.02', value: '', note: '' },
        ],
    }),
    /* The board. Its three legends are absent: each is a swatch and its word
     * inside one <span>, so the word has no element of its own. */
    block(20, 'nabidka.graf', {
        title: 'Stejné peníze, dvakrát',
        body: 'Sto korun odložených dnes. Táhněte za linku a projděte si těch dvacet let rok po roce.',
        items: [
            { lead: '', label: '07', value: '', note: '' },
            { lead: '', label: 'Ilustrativní čísla', value: '', note: '' },
        ],
    }),
    /* The head of the review wall. `body` is the sentence before the link — a
     * bare text node sharing its paragraph with it — so it is edited in the
     * form; items[1] is the link's words, which are their own element. The cards
     * below are `review` documents and are not this page's copy. */
    block(21, 'nabidka.recenze', {
        title: 'Co o nás říkají',
        body: 'Přes tři tisíce domácností. Tohle je jich pár.',
        items: [
            { lead: '', label: '08', value: '', note: '' },
            { lead: '', label: 'Všechny recenze', value: '', note: '' },
        ],
    }),
]

export default seedOfferCopy
