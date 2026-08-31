/**
 * Fixture blocks for /cookies. Same contract as ./seed.js, which spreads this
 * into its own `siteCopy` list: wrapper keys are underscore-prefixed, `data` is
 * the document body, and every value shape is one `src/cms/core/fieldTypes.js`
 * accepts.
 *
 * Its own file rather than thirteen more blocks in seed.js, for the reason
 * ./seedAbout.js states: an array this long edited from both ends at once is a
 * merge conflict per block. The single seam is the spread in seed.js.
 *
 * **This is a legal notice, so nothing here was typed.** Every string below was
 * generated out of `src/constants/cookiesTerms.js` and out of the component's
 * own JSX — the two places the page falls back to — because changing "může" to
 * "muže" while moving a cookie policy into a CMS is not a typo, it is a
 * different document. With these loaded, /cookies renders exactly the page it
 * renders without them; that is the acceptance test for this file.
 *
 * PUBLISHED, for the reason seedAbout.js gives: the public site reads `data` on
 * published rows only, and a draft here would leave the page on its fallbacks.
 *
 * The `*…*` highlight convention is deliberately not used. Nothing on /cookies
 * draws an accent span — the heading's two lines go through `f.labels`, which
 * renders the stored string verbatim — so an asterisk would go on the page as
 * an asterisk. See the same note at the head of ./seedAbout.js.
 *
 * What is NOT here, and why. The two `§` eyebrows: each is `<em>§</em>` and its
 * words in one paragraph, so the words have no element of their own to click,
 * and storing the paragraph whole would put the section sign into the copy and
 * lose its `<em>` on the first save. Every section's `id`: it is the anchor the
 * index links to (`#about`), an address rather than a sentence, and it stays in
 * the component beside the order it is rendered in.
 */

const seedCookiesCopy = [
    /* The page's head. The heading is two lines set as a text node and a span,
     * which is why they are two items edited as one block rather than one
     * `headline`: the overlay reads a `<br>` as a break and a block child as a
     * line, and this heading breaks with the second. The sentence under the
     * rule is `body` — one line of prose, read plain. */
    {
        _id: 'siteCopy-ck1',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.hero',
            page: 'cookies',
            title: 'Zásady cookies',
            items: [
                { lead: '', label: "Co jsou cookies", value: '', note: '' },
                { lead: '', label: "a jak je používáme.", value: '', note: '' },
            ],
            body: "Zde si můžete nastavit, ke kterým budeme mít přístup.",
        },
    },
    /* The word over the sticky index. Its own block holding nothing but its
     * `title`, which is both the word on the page and the name an editor reads
     * in the Studio's list — the arrangement the patička's address column
     * already uses. It cannot be an item of the block above: those items are
     * the heading's lines, edited as one array whose length is part of the
     * edit, and a third item would be a third line of the `<h1>`. */
    {
        _id: 'siteCopy-ck2',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.obsah',
            page: 'cookies',
            title: 'Obsah',
        },
    },
    /* The ten sections, in the order they are read. One block per section — a
     * heading and its body together — rather than a field per sentence: a
     * cookie policy is amended as prose, and whoever edits it changes a clause
     * in the middle of a paragraph rather than filling in eleven boxes.
     *
     * The second has a heading and no body, exactly as the constant does. The
     * component renders no paragraph for it and still does not, because the
     * absent `body` reads back as the empty string the constant's missing
     * `content` already produced. */
    {
        _id: 'siteCopy-ck3',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.01',
            page: 'cookies',
            title: "O souborech cookies",
            body: "Soubory cookie jsou malé textové soubory, které webové stránky, které navštívíte, ukládají do vašeho počítače. Webové stránky používají soubory cookie, aby uživatelům umožnily efektivně se orientovat a provádět určité funkce. Soubory cookie, které jsou vyžadovány pro správné fungování webových stránek, je možné nastavovat bez Vašeho svolení. Všechny ostatní soubory cookie je nutné před nastavením v prohlížeči schválit. Svůj souhlas s používáním souborů cookie můžete na naší stránce Zásady ochrany osobních údajů kdykoli změnit na konci této stránky.",
        },
    },
    {
        _id: 'siteCopy-ck4',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.02',
            page: 'cookies',
            title: "Prohlášení o souborech cookie",
        },
    },
    {
        _id: 'siteCopy-ck5',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.03',
            page: 'cookies',
            title: "Cookies",
            body: "Cookies jsou malé textové soubory, které jsou umístěny na vašem počítači webovými stránkami, které navštěvujete. Jsou hojně používány, aby webové stránky fungovaly nebo fungovaly efektivněji, a také k poskytování informací vlastníkům stránek.",
        },
    },
    {
        _id: 'siteCopy-ck6',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.04',
            page: 'cookies',
            title: "Jak používáme cookies",
            body: "Používáme cookies, abychom zlepšili vaši zkušenost s webovými stránkami. Tato politika cookies je součástí naší politiky ochrany soukromí a pokrývá používání cookies mezi vaším zařízením a naším webem. Také poskytujeme základní informace o službách třetích stran, které můžeme používat, a které mohou také používat cookies jako součást své služby, i když nejsou kryty naší politikou.",
        },
    },
    {
        _id: 'siteCopy-ck7',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.05',
            page: 'cookies',
            title: "Typy cookies",
            body: "Existuje několik různých typů cookies, nicméně naše webové stránky používají: Funkční - Naše společnost používá tyto cookies, aby vás rozpoznala na našich webových stránkách a zapamatovala si vaše dříve vybrané preference. To může zahrnovat jazyk, který preferujete, a místo, kde se nacházíte. Používáme mix cookies první a třetí strany.",
        },
    },
    {
        _id: 'siteCopy-ck8',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.06',
            page: 'cookies',
            title: "Jak ovládat cookies",
            body: "Cookies můžete ovládat a/nebo mazat podle svého uvážení – podrobnosti naleznete na aboutcookies.org. Můžete smazat všechny cookies, které jsou již na vašem počítači, a můžete nastavit většinu prohlížečů, aby zabránily jejich umístění. Pokud tak učiníte, možná budete muset při každé návštěvě webu ručně upravovat některé preference a některé služby a funkce nemusí fungovat.",
        },
    },
    {
        _id: 'siteCopy-ck9',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.07',
            page: 'cookies',
            title: "Použití cookies",
            body: "Cookie je malý textový dokument, který je kopírován na Váš hard disk z webové stránky. Cookies nezpůsobují žádné poškození Vašeho počítače, ani neobsahují žádné viry. Cookies z naší stránky nesbírají žádná Vaše osobní data. Používání cookies můžete kdykoli zakázat v nastavení Vašeho prohlížeče. Cookies na našich stránkách jsou používány pouze po dobu Vaší návštěvy pro zaručení anonymity, statistické potřeby a zlepšení rozhraní pro uživatele. Tyto stránky využívají pouze cookies, které slouží k zajištění funkčnosti stránek a ke zvýšení Vašeho uživatelského komfortu. Prostřednictvím cookies nesbíráme jakákoli data o uživatelích stránek, zejména pak nedochází ke sběru osobních údajů. V případě, že nebudete s nahráním cookies do vašeho počítače souhlasit, můžete odmítnou instalaci cookies nastavením Vašeho internetového prohlížeče, standardně v kartě Nastavení / nastavení obsahu / soubory cookie.",
        },
    },
    {
        _id: 'siteCopy-ck10',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.08',
            page: 'cookies',
            title: "Nezbytné cookies",
            body: "Tyto cookies jsou nezbytné pro fungování webových stránek. Zahrnují například cookies, které umožňují přihlášení do zabezpečených částí webu. Tyto cookies nemohou být vypnuty.",
        },
    },
    {
        _id: 'siteCopy-ck11',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.09',
            page: 'cookies',
            title: "Preferenční cookies",
            body: "Tyto cookies umožňují webové stránce zapamatovat si volby, které jste učinili (například preferovaný jazyk nebo region) a poskytnout vylepšené, personalizovanější funkce. Doba uchovávání těchto cookies je 6 měsíců.",
        },
    },
    {
        _id: 'siteCopy-ck12',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sekce.10',
            page: 'cookies',
            title: "Cookies třetích stran",
            body: "Náš web používá služby třetích stran jako Google Analytics a sociální média. Tyto služby mohou ukládat cookies pro analytické účely a měření výkonu. Kompletní seznam třetích stran a jejich cookies je k dispozici v nastavení cookies.",
        },
    },
    /* The panel that closes the page: its heading, and the words inside the
     * button that opens the preference manager. That button is a real
     * `<button>` — it opens a modem rather than going anywhere — so its words
     * are copy and it has no target for `editableLink` to offer. */
    {
        _id: 'siteCopy-ck13',
        _status: 'published',
        _createdAt: '2026-08-28T10:00:00.000Z',
        _updatedAt: '2026-08-28T10:00:00.000Z',
        data: {
            key: 'cookies.sprava',
            page: 'cookies',
            title: "Chcete si přenastavit vaše cookies?",
            items: [
                { lead: '', label: "Nastavit", value: '', note: '' },
            ],
        },
    },
]

export { seedCookiesCopy }
export default seedCookiesCopy
