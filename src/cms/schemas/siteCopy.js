// siteCopy — keyed blocks of page copy.
//
// The hard part of this type is that the copy it has to hold is not one shape.
// Looking at what is actually in src/constants today:
//
//   StatbarData     { value: '12',    barkingPoint: '7',    name: 'Let na trhu' }
//   offerStats      { value: '3000+', breakingPoint: '2500', name: '...' }
//   IntroRects      { number: '1/3',  header: '...',  content: '...' }
//   valuesTheWay    { number: '01',   text: '...' }
//   dataR           { rate: '8', rateText: 'z deseti', text: '...' }
//   deals           { number: '01', contentD: '...', contentG: '...' }
//
// Six different field names for the same three ideas: a short lead-in, a label,
// and a body. Giving each of them its own content type would be six schemas
// that an editor cannot tell apart, and modelling the union would produce a
// form with fifteen mostly-empty inputs.
//
// So the type is a keyed block with a title, an optional body, and a repeatable
// list of { lead, label, value, note }. Every one of the shapes above maps onto
// that: StatbarData is lead='' label='Let na trhu' value='12' note='7';
// IntroRects is lead='1/3' label='Staňte se součástí programu' value=<content>.
// The component decides how to render its own key — which it already does.
//
// `key` is the contract with the code. It is what a component looks up, so it
// is required and should be treated as an identifier an editor does not rename
// casually.
//
// It is NOT a slug, though it was declared as one and this comment used to say
// so. The core's slug check is /^[a-z0-9]+(?:-[a-z0-9]+)*$/ — no dots — while
// the keys the code actually looks up are dotted: `index.offers` and
// `index.who-we-are` are declared in @/cms/visualEditing, and the field's own
// description gave `index.statbar` as the example. The type contradicted every
// other statement about it, and the contradiction was invisible until a
// document carrying a real key was published: 422, "Jen malá písmena, číslice
// a pomlčky." Reading and patching such a block worked, so the two homepage
// blocks could be edited on the page and then never published.
//
// A string with the dotted pattern spelled out, therefore. Segments of
// lowercase letters and digits, joined by a dot or a hyphen — which accepts
// every key in the fixtures and both keys the visual editing surfaces name.

import { defineField, defineType } from '../core/index.js'
import site from '../site/config.js'

/**
 * Stránky, které si o texty říkají — každá hodnota `copy` z konfigurace webu
 * a hodnota globálů, pod jedním jménem každá.
 *
 * Prázdný seznam je poctivá odpověď na konfiguraci, kde žádná stránka `copy`
 * nedeklaruje: dokud stránka o texty neřekne, nemá blok kam patřit.
 */
const PAGE_OPTIONS = (() => {
    const seen = new Map()
    for (const page of site?.pages || []) {
        if (page?.copy && !seen.has(page.copy)) seen.set(page.copy, page.title || page.copy)
    }
    const globals = site?.globals?.copy
    if (globals && !seen.has(globals)) seen.set(globals, 'Napříč webem')
    return [...seen].map(([value, title]) => ({ value, title }))
})()

import { HIGHLIGHT } from './marks.js'

/**
 * A question and its answer — the pair, declared once.
 *
 * The FAQ exists in two shapes and they are the same two fields:
 * a document per question (this type), and the homepage's block, where the five
 * questions are an array on one siteCopy document so that one `list` popup can
 * open the whole thing (EDIT-SURFACES, round four §6). Exporting the pair is
 * what keeps that from becoming two declarations of "a Q&A" that agree until
 * somebody widens one of them — `defineField` is idempotent, so the same frozen
 * descriptors are safe to hand to a second type.
 *
 * The bounds are the document's own and are deliberately not relaxed for the
 * array: a question too short to be a question is one wherever it is stored.
 */
export const QNA_PAIR_FIELDS = Object.freeze([
    defineField({
        name: 'question',
        title: 'Otázka',
        type: 'string',
        validation: (rule) => rule.required().min(5).max(300),
    }),
    defineField({
        name: 'answer',
        title: 'Odpověď',
        type: 'text',
        options: { rows: 8 },
        validation: (rule) => rule.required().min(10).max(3000),
    }),
])

export default defineType({
    name: 'siteCopy',
    title: 'Texty na webu',
    icon: 'text',
    fields: [
        defineField({
            name: 'key',
            title: 'Klíč',
            type: 'string',
            description: 'Kterým se blok hledá v kódu, např. "index.statbar". Nepřejmenovávat bez úpravy komponenty.',
            validation: (rule) =>
                rule
                    .required()
                    .max(96)
                    .regex(
                        /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/,
                        'Jen malá písmena, číslice, tečky a pomlčky — např. "index.offers".',
                    ),
        }),
        defineField({
            name: 'page',
            title: 'Stránka',
            type: 'select',
            // Volby se čtou z konfigurace webu, ne z pevného seznamu.
            //
            // `page` je to, podle čeho `getSiteCopy` filtruje bloky jedné route,
            // takže seznam musí odpovídat tomu, co stránky deklarují jako `copy`.
            // Napsaný natvrdo popisoval jeden konkrétní web a v jiném projektu
            // znamenal, že vlastní stránku nejde naplnit textem: select odmítne
            // hodnotu, která v něm není, hláškou "Neplatná volba" — a nikdo
            // nehledá příčinu v knihovně.
            options: { list: PAGE_OPTIONS },
            initialValue: PAGE_OPTIONS[0]?.value ?? 'index',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'title',
            title: 'Nadpis',
            type: 'string',
            validation: (rule) => rule.required().max(200),
        }),
        // The one element on a block whose lines are broken by hand.
        //
        // Four of them on the homepage — the hero's <h1>, the Benefit-program
        // paragraph, "Prohlédněte si další recenze" and "Máte nějaký dotaz?" —
        // and every one was reported as "nejde editovat", because each is a
        // single element holding a `<br />` and the overlay flattens an element
        // to `textContent`, which welds `A<br />B` into "AB" (EDIT-SURFACES,
        // round four §1). The stored representation of a break is `\n`.
        //
        // `text` rather than `string` so the break is typeable in the Studio's
        // form as well as on the page: a `string` renders an <input>, which has
        // no way to hold one. It is read with `stringValue`, never `plainText` —
        // `\s` in JavaScript matches `\n`, so the plain reading would collapse
        // exactly the character this field exists to carry.
        //
        // It carries the same accent as a copy line, because the hero's own
        // heading has one ("už přes *jednu dekádu*"). Multi-line and marked do
        // not compose through `decode`/`encode`, which split on whitespace and
        // would weld the lines back together, so both halves of the round trip
        // go through `decodeLines` / `encodeLines` in ./marks.js and neither
        // ever sees a break.
        defineField({
            name: 'headline',
            title: 'Text se zalomením',
            type: 'text',
            options: { rows: 4, mark: HIGHLIGHT.name },
            description: 'Jeden prvek na stránce, jehož řádky jsou zalomené natvrdo. Enter = nový řádek. Text mezi hvězdičkami se zvýrazní.',
            validation: (rule) => rule.max(400),
        }),
        /**
         * Zvýrazněný konec nadpisu, jako vlastní pole.
         *
         * Doteď byla zvýrazněná část schovaná uvnitř `headline` mezi hvězdičkami.
         * Fungovalo to, ale editor neměl kde ji upravit samostatně a nebylo kam
         * napsat druhou variantu — a přesně to je tu potřeba: „už přes JEDNU
         * DEKÁDU" se má střídat s „už přes 12 LET".
         *
         * Takže dvě pole místo jednoho řetězce: `headline` nese text a `accent`
         * jeho zvýrazněný konec. Jedna položka = obarvený span jako dřív, víc
         * položek = psací animace, která mezi nimi přepíná. Komponenta rozhodne
         * podle počtu, ne podle přepínače, který by šlo zapomenout přepnout.
         *
         * Připojuje se NA KONEC nadpisu. Zvýraznění uprostřed nebo na začátku —
         * což jsou tři popisky v `index.offers` — zůstává hvězdičkám: „rozděl na
         * dvě části" u nich nedává smysl, protože části jsou tři.
         */
        defineField({
            name: 'accent',
            title: 'Zvýrazněný konec',
            type: 'array',
            of: [{ type: 'string' }],
            description:
                'Připojí se na konec textu se zalomením a zvýrazní se. Jedna položka = barevný text. ' +
                'Dvě a více = psací animace, která je střídá.',
            validation: (rule) => rule.max(6),
        }),
        defineField({
            name: 'body',
            title: 'Text',
            type: 'richText',
            description: 'Volitelný delší text pod nadpisem.',
        }),
        // Added when the homepage was wired: several blocks on the index page
        // are a photo plus its copy (Offers, WhoWeAre), and the photo had
        // nowhere to live — `partner.logo` and `offer.image` are the wrong
        // types for it and `items` holds only strings. Optional, so every
        // existing document stays valid; a block that has no photo renders the
        // one in the component, as it did before.
        defineField({
            name: 'image',
            title: 'Obrázek',
            type: 'image',
            description: 'Volitelná fotka bloku. Prázdné = zůstane obrázek zabudovaný v komponentě.',
        }),
        // A block that owns SEVERAL photographs, as one field.
        //
        // The card deck in "Pro naše klienty" is one component dealing three
        // pictures, and the client asked for one popup over the set — reorder by
        // drag and drop, replace one, add, remove (EDIT-SURFACES, round four §3).
        // That is the `imageSet` kind, and until this field existed it had no
        // target anywhere in the project: `image` above is one file, `items`
        // holds only strings, and three blocks with one photo each is three
        // popups, which is the thing that was reported as wrong.
        //
        // An array OF IMAGES rather than of objects, deliberately. The popup
        // reorders assets; a member with fields of its own would need a form
        // inside the popup and would stop being a set of pictures. What travels
        // with a picture instead of beside it is its `alt`, which is a key of
        // the asset value and is what `fieldPatch` already lets an editor reach
        // (`gallery.0.alt`).
        //
        // The deck's captions stay on their own blocks and are paired to a
        // photograph by the asset it is, not by its position — see `deckCards`
        // in server/site/homepage.js, and the note there about what this model
        // cannot do.
        defineField({
            name: 'gallery',
            title: 'Sada obrázků',
            type: 'array',
            of: [{ type: 'image' }],
            description: 'Několik fotek jednoho bloku, v pořadí, v jakém je blok vykresluje. Prázdné = zůstanou obrázky zabudované v komponentě.',
            validation: (rule) => rule.max(12),
        }),
        defineField({
            name: 'items',
            title: 'Položky',
            type: 'array',
            description: 'Statistiky, kroky, odrážky — podle toho, co blok vykresluje.',
            of: [
                {
                    type: 'object',
                    fields: [
                        defineField({
                            name: 'lead',
                            title: 'Číslo / štítek',
                            type: 'string',
                            description: 'Např. "01", "1/3", "8".',
                            validation: (rule) => rule.max(24),
                        }),
                        defineField({
                            name: 'label',
                            title: 'Popisek',
                            type: 'string',
                            // Some blocks render part of a line in the accent
                            // colour. Nothing in this type expresses inline
                            // emphasis and a whole rich-text field per line
                            // would be worse, so the convention is asterisks.
                            //
                            // Declared, not left to be recognised. This option is
                            // the single statement that this field carries
                            // emphasis: the site layer reads it to decode the
                            // stored string (server/site/homepage.js) and to put
                            // the mark's name in the element's annotation, and the
                            // overlay reads it back off that annotation to offer
                            // mark/unmark on a selection. Delete it and the line
                            // becomes plain text everywhere at once — which is the
                            // property that makes it a declaration rather than a
                            // hint. See ./marks.js.
                            options: { mark: HIGHLIGHT.name },
                            description: 'Text mezi hvězdičkami se zvýrazní: "máme *slevy*".',
                            validation: (rule) => rule.required().max(200),
                        }),
                        defineField({
                            name: 'value',
                            title: 'Hodnota / obsah',
                            type: 'text',
                            options: { rows: 3 },
                            validation: (rule) => rule.max(1000),
                        }),
                        defineField({
                            name: 'note',
                            title: 'Doplněk',
                            type: 'string',
                            description: 'Druhá hodnota, kterou některé bloky potřebují (např. výchozí bod animace čísla).',
                            validation: (rule) => rule.max(200),
                        }),
                    ],
                },
            ],
        }),
        // The FAQ, as a list of pairs rather than as a positional list of
        // strings.
        //
        // The homepage's questions were `items[]` with the question in `label`
        // and its answer in `value` — which works, and which a popup cannot
        // present: the form beside a question would say "Popisek" and "Hodnota /
        // obsah", and the pair would be two addresses an editor has to keep in
        // step by counting. Round four asks for one `list` popup opening either
        // a pair or the whole array, with reorder, add and remove; that needs
        // members that name what they hold.
        //
        // The member's fields are `qna`'s own, imported rather than restated —
        // the type that already models a question and its answer is the one
        // model there should be. See ./qna.js.
        //
        // Optional, and read behind the old shape rather than instead of it:
        // a block written before this field still renders its `items`. See
        // `questionPairs` in server/site/homepage.js.
        defineField({
            name: 'questions',
            title: 'Otázky a odpovědi',
            type: 'array',
            of: [{ type: 'object', name: 'pair', title: 'Otázka', fields: [...QNA_PAIR_FIELDS] }],
            description: 'Dvojice otázka + odpověď, v pořadí, v jakém je blok vykresluje.',
            validation: (rule) => rule.max(30),
        }),
    ],
    preview: (doc) => ({
        title: doc?.title || doc?.key?.current || doc?.key || 'Bez názvu',
        subtitle: `${doc?.page || '—'} · ${(doc?.items || []).length} položek`,
        media: null,
    }),
    orderings: [
        { name: 'page', title: 'Podle stránky', by: [{ field: 'page', direction: 'asc' }, { field: 'key', direction: 'asc' }] },
        { name: 'key', title: 'Podle klíče', by: [{ field: 'key', direction: 'asc' }] },
    ],
})
