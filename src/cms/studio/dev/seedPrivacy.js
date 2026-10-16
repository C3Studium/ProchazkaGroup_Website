/**
 * Fixture blocks for /ochrana-soukromi. Same contract as ./seed.js, which
 * spreads this into its own `siteCopy` list: wrapper keys are
 * underscore-prefixed, `data` is the document body, and every value shape is
 * one `src/cms/core/fieldTypes.js` accepts.
 *
 * Its own file rather than ten more blocks in seed.js, on the argument
 * ./seedAbout.js and ./seedHomepage.js already make: a two-thousand-line array
 * edited from four sides is a merge conflict per block. The seam is one spread.
 *
 * EVERY string below was READ out of the file that ships it — the nine sections
 * out of `PrivacySections` in src/constants/cookiesTerms.js, the head out of
 * the component's own JSX — by a generator, never retyped. That is not
 * fastidiousness about typos: this is a legal notice about how the business
 * handles personal data, and a word changed while moving it into a CMS is not a
 * typo, it is a different document. The generator refuses any string carrying a
 * non-breaking space, a backslash or a quote, so nothing here can be a character
 * that no diff will show.
 *
 * PUBLISHED, like every other fixture: the public site reads `data` on
 * published rows only, and a draft here would leave the page on its fallbacks.
 *
 * The `*…*` highlight convention is not used and must not be. Nothing on this
 * page draws an accent span, so an asterisk would go on the page as an asterisk.
 */

/** One item of a positional list: a label, and nothing else the block uses. */
const line = (label) => ({ lead: '', label, value: '', note: '' })

/**
 * The envelope, so ten blocks do not restate it ten times. `_id` is in its own
 * namespace (`siteCopy-p…`) because seed.js's own list, seedAbout.js's and
 * seedHomepage.js's are numbered independently and a collision would silently
 * drop one of them.
 */
const block = (id, key, data) => ({
    _id: `siteCopy-p${id}`,
    _status: 'published',
    _createdAt: '2026-08-28T09:00:00.000Z',
    _updatedAt: '2026-08-28T09:00:00.000Z',
    data: { page: 'ochrana-soukromi', body: '', items: [], ...data, key },
})

export const seedPrivacyCopy = [
    /* The head. Every line of it is an item, because every line of it is its
     * own element — the eyebrow's tag is an <em>, the <h1> is three <span>s the
     * stylesheet sets as blocks, and an element can only write one field. The
     * one exception is `title`, which holds the words beside the tag: those are
     * a bare text node with nothing to annotate, so they are the field that also
     * names the block in the Studio's list. PRIVACY_HERO in cms.config.js names
     * each position. */
    block(1, 'ochrana-soukromi.hero', {
        title: 'Ochrana soukromí',
        items: [
            // 0    the eyebrow's accented tag. Its words are the block's own
            //      `title`: they are a bare text node beside the <em> with no
            //      element of their own, so nothing on the page can carry their
            //      annotation, and `title` is also the name an editor reads in
            //      the Studio's list.
            line('GDPR'),
            // 1–3  the <h1>, one line per element
            line('Vše o ochraně,'),
            line('použití vašich údajů'),
            line('a informací.'),
            // 4    the line under the rule
            line('Detaily a všechny podrobné informace'),
            // 5    the index's heading. On the page twice — beside the text and
            //      in the disclosure a phone gets — because it is one word in
            //      two compositions, so it is one field and editing it moves
            //      both.
            line('Obsah'),
        ],
    }),

    /* The nine sections, one block each: a heading and its body.
     *
     * One block per section rather than one block holding nine pairs, and the
     * granularity stops there rather than going further. A privacy notice is
     * read and amended as prose — whoever edits it changes a sentence in the
     * middle of a clause — so the unit is the section, and a clause is never a
     * field of its own. One block each because that is what puts the nine
     * headings in the Studio's list, where they read as the page's own contents.
     *
     * The KEY names the section's anchor, and the anchor stays the component's
     * own: #rights keeps landing whatever an editor retitles that section to.
     * The order of this list is the order the page reads, and it is paired with
     * `PrivacySections` by position — see PRIVACY_COPY_KEYS.
     */
    block(2, 'ochrana-soukromi.privacy', {
        title: 'Zásady ochrany osobních údajů',
        body: 'Jsme společnost, která bere ochranu dat a soukromí velmi vážně. Jsme odhodláni chránit vaše osobní údaje a být transparentní ohledně toho, jaké informace o vás máme.',
    }),
    block(3, 'ochrana-soukromi.data', {
        title: 'Jaké údaje shromažďujeme?',
        body: 'Shromažďujeme osobní údaje od vás, když nám je přímo poskytujete, a také prostřednictvím vašeho využívání našich služeb. Tyto informace mohou zahrnovat: Informace, které nám poskytnete, když používáte naše služby nebo se registrujete k účtu. Informace, které poskytnete při účasti na jakýchkoli interaktivních funkcích služeb. Korespondenci nebo jiné informace, které nám zasíláte. Informace shromážděné při používání našich služeb.',
    }),
    block(4, 'ochrana-soukromi.use', {
        title: 'Jak používáme vaše údaje?',
        body: 'Vaše údaje používáme k poskytování, podpoře, personalizaci a rozvoji našich služeb. Jak používáme vaše osobní údaje, závisí na tom, jakým způsobem interagujete s našimi službami a na volbách, které děláte. Používáme údaje, které máme o vás, k poskytování a personalizaci našich služeb, aby byly relevantnější a užitečnější pro vás i ostatní.',
    }),
    block(5, 'ochrana-soukromi.sharing', {
        title: 'Sdílíme vaše údaje?',
        body: 'Vaše údaje budeme sdílet s třetími stranami pouze způsoby uvedenými v těchto zásadách ochrany osobních údajů. Můžeme zpřístupnit třetím stranám údaje, které byly anonymizovány tak, aby nemohly být použity k vaší identifikaci. Můžeme sdílet vaše údaje s: Společnostmi v rámci naší skupiny, Našimi poskytovateli služeb třetích stran, Našimi obchodními partnery.',
    }),
    block(6, 'ochrana-soukromi.legal-basis', {
        title: 'Právní základ zpracování',
        body: 'Vaše osobní údaje zpracováváme na základě: Vašeho souhlasu, Plnění smlouvy, Našich oprávněných zájmů, Plnění právních povinností. Pro každý účel zpracování vždy určujeme odpovídající právní základ.',
    }),
    block(7, 'ochrana-soukromi.retention', {
        title: 'Doba uchovávání údajů',
        body: 'Vaše osobní údaje uchováváme pouze po dobu nezbytně nutnou k naplnění účelů uvedených v těchto zásadách, obvykle po dobu trvání vašeho účtu plus 24 měsíců, nebo dokud neodvoláte svůj souhlas.',
    }),
    block(8, 'ochrana-soukromi.rights', {
        title: 'Vaše práva',
        body: 'Podle GDPR máte právo na: Přístup k vašim údajům, Opravu údajů, Výmaz údajů, Přenositelnost údajů, Vznesení námitky, Odvolání souhlasu. Pro uplatnění těchto práv nás kontaktujte na gdpr@prochazkagroup.cz.',
    }),
    block(9, 'ochrana-soukromi.international', {
        title: 'Mezinárodní přenosy',
        body: 'Pokud přenášíme vaše údaje mimo EU/EHP, zajišťujeme odpovídající úroveň ochrany pomocí standardních smluvních doložek schválených Evropskou komisí nebo jiných vhodných záruk.',
    }),
    block(10, 'ochrana-soukromi.dpo', {
        title: 'Kontakt na DPO',
        body: 'Máte-li jakékoliv dotazy týkající se zpracování vašich osobních údajů, můžete kontaktovat našeho pověřence pro ochranu osobních údajů (DPO) na email: dpo@prochazkagroup.cz',
    }),
]
