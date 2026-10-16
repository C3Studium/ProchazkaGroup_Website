/**
 * Fixture blocks for /nabidky and /benefit-program. Same contract as ./seed.js,
 * which spreads this into its own `siteCopy` list: wrapper keys are
 * underscore-prefixed, `data` is the document body, and every value shape is one
 * `src/cms/core/fieldTypes.js` accepts.
 *
 * Its own file rather than nineteen more blocks in seed.js, for the reason
 * ./seedAbout.js states: an array that long edited from both ends at once is a
 * merge conflict per block. The single seam is the spread in seed.js — one
 * import and one line — and that is why the two routes share this file rather
 * than opening two more seams into the same array.
 *
 * **Nothing here was typed.** Every string is generated out of the modules the
 * two pages fall back to — `src/constants/nabidkypage.js` and the plain-data
 * COPY / HEAD / STEPS consts in the five sections — because a fixture that says
 * something slightly different from the component it stands in for is not a
 * seed, it is a second version of the page. With these loaded, both routes
 * render exactly what they render without them; that is the acceptance test for
 * this file.
 *
 * PUBLISHED, for the reason seedAbout.js gives: the public site reads `data` on
 * published rows only, and a draft here would leave both pages on their
 * fallbacks.
 *
 * The `*…*` highlight convention is deliberately not used. Nothing on either
 * route draws an accent span — every line here goes through a reader that
 * renders the stored string verbatim — so an asterisk would go on the page as an
 * asterisk. Same note as at the head of ./seedCookies.js.
 *
 * The photographs are inline asset objects and are NOT in `seedAssets`: that
 * array lives in seed.js and putting them there is a second edit to the file
 * this one exists to leave alone. The consequence is the one ./seedAbout.js
 * names — an editor replacing one of them picks from the library or uploads, and
 * these are not among the library's own rows until somebody does. Nothing else
 * reads an asset by id.
 */

/* --------------------------------------------------------------- /nabidky */

const seedPartnersCopy = [
    /* The two words the section owns rather than a partner: the mark over the
     * ride, which is the block's `title` and therefore also its name in the
     * Studio's list, and the label standing over all four deal plates. The
     * label is ONE field drawn by four elements — editing it moves all of
     * them — which is the bargain /o-nas's showcase already makes for the
     * button its three cards share. */
    {
        _id: "siteCopy-np1",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "nabidky.sekce",
            page: "nabidky",
            title: "Partneři",
            items: [
                { lead: "", label: "Co z toho máte", value: "", note: "" },
            ],
        },
    },
    /* One block per chapter, in the order they are ridden through. Each owns a
     * photograph and siteCopy holds a single `image`, so this is the only shape
     * in which the four are separately replaceable.
     *
     *   title        the partner's name
     *   body         the sentence under it
     *   items[0]     lead = the ordinal in the eyebrow, label = the tag beside
     *                it (a bare text node, edited in the form), value = where
     *                the button goes
     *   items[1]     lead = the figure, label = the rest of the deal line
     *   items[2]     the button's words. Both halves of that link live here
     *                rather than on the section: it leaves the site for one
     *                named partner, and a target is per-partner.
     *
     * The four `alt`s are "Project 01"…"Project 04" because that is what the
     * constant says today. Copied verbatim, placeholder and all: this file's job
     * is to reproduce the page, not to improve it. */
    {
        _id: "siteCopy-np2",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "nabidky.partner.01",
            page: "nabidky",
            title: "Pojistné Hlášení",
            body: "50% sleva na roční předplatné pro všechny klienty Procházka Group.",
            image: { id: "asset-partner-1", url: "/assets/backgrounds/partners/pojistnehlaseni.webp", mime: 'image/webp', alt: "Project 01", filename: "pojistnehlaseni.webp" },
            items: [
                { lead: "01", label: "Pojištění", value: "https://www.pojistnehlaseni.cz/", note: "" },
                { lead: "50 %", label: "sleva na roční předplatné", value: "", note: "" },
                { lead: "", label: "Navštívit stránky", value: "", note: "" },
            ],
        },
    },
    {
        _id: "siteCopy-np3",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "nabidky.partner.02",
            page: "nabidky",
            title: "ElevenCosmetic",
            body: "10% slevu pro naše klienty - na jakýkoliv produkt, který si vyberete.",
            image: { id: "asset-partner-2", url: "/assets/backgrounds/partners/elevencosmetic.webp", mime: 'image/webp', alt: "Project 02", filename: "elevencosmetic.webp" },
            items: [
                { lead: "02", label: "Kosmetika", value: "https://www.elevencosmetic.cz/", note: "" },
                { lead: "10 %", label: "sleva na jakýkoliv produkt", value: "", note: "" },
                { lead: "", label: "Navštívit stránky", value: "", note: "" },
            ],
        },
    },
    {
        _id: "siteCopy-np4",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "nabidky.partner.03",
            page: "nabidky",
            title: "ReKvítka",
            body: "Sleva pro naše klienty ve stavu vyjednávání, brzy bude aktualizováno.",
            image: { id: "asset-partner-3", url: "/assets/backgrounds/partners/rekvitko.webp", mime: 'image/webp', alt: "Project 03", filename: "rekvitko.webp" },
            items: [
                { lead: "03", label: "Květiny", value: "https://re-kvitka.cz/", note: "" },
                { lead: "", label: "Sleva se právě vyjednává", value: "", note: "" },
                { lead: "", label: "Navštívit stránky", value: "", note: "" },
            ],
        },
    },
    {
        _id: "siteCopy-np5",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "nabidky.partner.04",
            page: "nabidky",
            title: "Project 04",
            body: "Stále v přípravě, brzy bude aktualizováno.",
            image: { id: "asset-partner-4", url: "/assets/prebuild/house.webp", mime: 'image/webp', alt: "Project 04", filename: "house.webp" },
            items: [
                { lead: "04", label: "Připravujeme", value: "https://www.google.com", note: "" },
                { lead: "", label: "Brzy bude doplněno", value: "", note: "" },
                { lead: "", label: "Navštívit stránky", value: "", note: "" },
            ],
        },
    },
]

/* ------------------------------------------------------- /benefit-program */

const seedBenefitProgramCopy = [
    /* 01 — the opening screen. Its `title` is the <h1>, which is also the name
     * an editor reads in the Studio's list.
     *
     *   items[0]  the eyebrow
     *   items[1]  the figure — value is the number, label the words beside the
     *             gift icon. Those words share a <span> with the icon and have
     *             no element of their own, so they are edited in the form.
     *   items[2]  the origin line
     *   items[3]  the scroll cue */
    {
        _id: "siteCopy-bp1",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.uvod",
            page: "benefit-program",
            title: "Doporučte nás",
            body: "Doporučte nás někomu, koho znáte — až se stane naším klientem, pošleme vám poukaz.",
            image: { id: "asset-benefit-intro", url: "/assets/backgrounds/workingHours.webp", mime: 'image/webp', alt: "Poradce Procházka Group při schůzce s klientkou", filename: "workingHours.webp" },
            items: [
                { lead: "", label: "Benefit program", value: "", note: "" },
                { lead: "", label: "celková hodnota odměn v programu", value: "47 500 Kč", note: "" },
                { lead: "", label: "Procházka Group · Písek · OVB Allfinanz", value: "", note: "" },
                { lead: "", label: "Jak to funguje", value: "", note: "" },
            ],
        },
    },
    /* 02 — the head over the three steps. items[0] is the eyebrow: lead is the
     * <em>, label the words beside it, which are a bare text node in the same
     * paragraph and are therefore edited in the form. */
    {
        _id: "siteCopy-bp2",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.kroky",
            page: "benefit-program",
            title: "Tři kroky",
            body: "Program má tři kroky a jdou v tomhle pořadí — žádný se nedá přeskočit.",
            items: [
                { lead: "02", label: "Jak to funguje", value: "", note: "" },
            ],
        },
    },
    /* The three steps, in the order they are read. One block each because each
     * owns a photograph. items[0] is the row's dotted number (lead, a bare text
     * node beside the label's <span> — form only) and its label; items[1] is the
     * aside under the paragraph.
     *
     * How many steps there are stays a code change: each row's height, the side
     * its photograph takes and the x its baseline draws from are PLAN in the
     * component, indexed by the same position. */
    {
        _id: "siteCopy-bp3",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.kroky.01",
            page: "benefit-program",
            title: "Staňte se klientem.",
            body: "Do programu se nedá přihlásit zvenčí. První krok proto není doporučení, ale vaše vlastní schůzka a váš vlastní finanční plán.",
            image: { id: "asset-benefit-step-1", url: "/assets/backgrounds/deskWork_2000.webp", mime: 'image/webp', alt: "Poradce Procházka Group při práci nad finančním plánem", filename: "deskWork_2000.webp" },
            items: [
                { lead: "02.01", label: "Vstupní podmínka", value: "", note: "" },
                { lead: "", label: "Říkáme to rovnou, ať to nikoho nepřekvapí až u odměny.", value: "", note: "" },
            ],
        },
    },
    {
        _id: "siteCopy-bp4",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.kroky.02",
            page: "benefit-program",
            title: "Doporučte někoho, komu to pomůže.",
            body: "Nejde o počty. Jde o jednoho člověka, o kterém víte, že řeší hypotéku, pojištění nebo úspory, které stojí na místě.",
            image: { id: "asset-benefit-step-2", url: "/assets/backgrounds/onPhone_2000.webp", mime: 'image/webp', alt: "Klientka Procházka Group telefonuje", filename: "onPhone_2000.webp" },
            items: [
                { lead: "02.02", label: "Doporučení", value: "", note: "" },
                { lead: "", label: "Doporučení, ze kterého dotyčný nic nemá, nechceme. Nemá cenu pro něj ani pro vás.", value: "", note: "" },
            ],
        },
    },
    {
        _id: "siteCopy-bp5",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.kroky.03",
            page: "benefit-program",
            title: "Zbytek je naše práce.",
            body: "Ozveme se mu, sejdeme se s ním a odvedeme stejnou práci jako u vás. Když se stane naším klientem, odměnu dostanete vy.",
            image: { id: "asset-benefit-step-3", url: "/assets/backgrounds/callBGShelf.webp", mime: 'image/webp', alt: "Poradce Procházka Group telefonuje v kanceláři", filename: "callBGShelf.webp" },
            items: [
                { lead: "02.03", label: "Naše práce", value: "", note: "" },
                { lead: "", label: "Poukaz z našeho žebříčku odměn. Žádná hotovost, žádné provize.", value: "", note: "" },
            ],
        },
    },
    /* 03 — the ride. Three strings, and only three: the heading, the
     * destination's figure and every level marker on the track are ARITHMETIC
     * over the component's own TIERS and LEVELS, and a stored copy of a number
     * the page recomputes is a value an editor changes and watches change back.
     *
     * `title` is therefore the block's name in the Studio and is not on the
     * page — the arrangement /o-nas's `o-nas.prompt` already uses. */
    {
        _id: "siteCopy-bp6",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.cesta",
            page: "benefit-program",
            title: "Cesta za odměnami",
            items: [
                { lead: "", label: "03", value: "", note: "" },
                { lead: "", label: "Celkem v poukazech", value: "", note: "" },
                { lead: "", label: "Poukazy, ne hotovost. Vyplácí se po uzavření smlouvy doporučeným klientem.", value: "", note: "" },
            ],
        },
    },
    /* 05 — the doubt and its answer. `title` is the question itself: it is set
     * by TextPressure a character at a time, so the words on screen are markup
     * the component generates rather than a text node anything can annotate, and
     * it is edited in the form.
     *
     *   items[0]  the eyebrow, lead + label
     *   items[1]  the left column — label is its heading, value its paragraph
     *   items[2]  the right column, the same way
     *   body      the verdict under both */
    {
        _id: "siteCopy-bp7",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.otazka",
            page: "benefit-program",
            title: "Prodávám tím své známé?",
            body: "Obojí platí zároveň. Jinak by ten program nedával smysl.",
            items: [
                { lead: "05", label: "Otázka, kterou si položí každý", value: "", note: "" },
                { lead: "", label: "Ten, koho doporučíte", value: "Dostane schůzku a plán jako každý náš klient. Nic neplatí a nic si nemusí koupit.", note: "" },
                { lead: "", label: "Vy, kdo doporučujete", value: "Poukaz dostanete až ve chvíli, kdy se z doporučení stane klient. Ne za jméno. Za výsledek.", note: "" },
            ],
        },
    },
    /* 06 — the head over the belt. The belt itself is review documents, which
     * are moderated rather than edited as copy, so nothing of theirs is here.
     * `title` is the block's name in the Studio and is not on the page. */
    {
        _id: "siteCopy-bp8",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.recenze",
            page: "benefit-program",
            title: "Recenze — úvod",
            items: [
                { lead: "06", label: "Takhle o nás mluví", value: "", note: "" },
                { lead: "", label: "Recenze klientů — i těch, kteří k nám přišli na doporučení.", value: "", note: "" },
            ],
        },
    },
    /* 07 — the way in. `title` is the heading under the eyebrow.
     *
     *   items[0]  the eyebrow, lead + label
     *   items[1]  the "Mám poradce" tile — lead is its question, label the big
     *             line, value the caption under it
     *   items[2]  the "První schůzka" tile, the same way
     *
     * What answers a tap on either tile is NOT here: it is mounted from
     * component state, and its two halves are a consultant's own record and the
     * homepage's advisor block, both edited where they live. */
    {
        _id: "siteCopy-bp9",
        _status: 'published',
        _createdAt: "2026-08-28T12:00:00.000Z",
        _updatedAt: "2026-08-28T12:00:00.000Z",
        data: {
            key: "benefit-program.prihlaseni",
            page: "benefit-program",
            title: "Do programu se nedá přihlásit zvenčí. Je pro naše klienty.",
            items: [
                { lead: "07", label: "Jak se přihlásit", value: "", note: "" },
                { lead: "Už jste klient?", label: "Mám poradce", value: "Řekněte si o vstup na příští schůzce", note: "" },
                { lead: "Ještě ne?", label: "První schůzka", value: "Začněte vlastním finančním plánem", note: "" },
            ],
        },
    },
]

// One export, because seed.js takes one import and one spread.
const seedBenefitCopy = [...seedPartnersCopy, ...seedBenefitProgramCopy]

export { seedBenefitCopy, seedPartnersCopy, seedBenefitProgramCopy }
export default seedBenefitCopy
