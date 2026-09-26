// Klíče bloků, které tomuhle webu přibyly, a pojmenované pozice v nich.
//
// BEZ ZÁVISLOSTÍ, a to je celý důvod, proč je to vlastní soubor. Tytéž řetězce
// potřebují dvě strany, které na sebe přímo nedosáhnou:
//
//   cms.config.js        popisuje, kde který blok přistane v props stránky
//   @/lib/site/footer    a @/lib/site/notFound pro bloky sahají mimo
//                        `resolvePage` a klíč musí odněkud vzít
//
// Napsat je do `cms.config.js` a importovat je odtamtud nejde: ten soubor
// importuje `@/cms/site` a ten zpátky `@/cms/site/config.js`, který importuje
// `cms.config.js`. Když do toho kruhu vstoupí server-only modul jako první —
// a při auditu vstoupí — dostane pojmenované exporty ještě nevyhodnocené
// a přečte `undefined`. Stálo to jeden pád auditu, tak je to napsané tady.
//
// Je to totéž uspořádání a ze stejného důvodu jako `@/cms/visualEditing`: klíče
// bydlí v modulu, který nic neimportuje, takže si pro ně může přijít kdokoli.
//
// Klíče, které zná knihovna, tu NEJSOU a nemají tu být — pro ty je
// `@/cms/visualEditing`. Tady je jen to, co přibylo po něm.

/**
 * Rozcestník /404.
 *
 * Žádný z bloků v tomhle souboru není ve `VISUAL_SURFACES` (@/cms/visualEditing),
 * a je to v pořádku: co má na stránce co kliknout, nese si `docId` a anotace si
 * dokument pojmenuje sama; co nemá, otevře se formulářem — a to je u těchhle
 * bloků správná odpověď.
 */
export const NOT_FOUND_COPY_KEYS = Object.freeze({
    hero: '404.uvod',
    // Pět tipů rozcestníku, vázaných pořadím: první stojí v horní řadě vedle
    // cesty domů, zbylé čtyři v dolní. Kolik jich je, není rozhodnutí editora —
    // L z šesti dlaždic je geometrie té stránky (`TOP_BASES`/`BOTTOM_BASES`
    // v komponentě), takže šestý tip by neskončil na konci řady, ale nikde.
    tips: '404.tipy',
})

/** Která položka `404.uvod` je která. */
export const NOT_FOUND_LINES = Object.freeze({
    cap: 0,
    home: 1,
})

/** Kolik dlaždic rozcestník má. Pevné číslo, viz komentář výš. */
export const NOT_FOUND_TIP_COUNT = 5

/**
 * Pás, který na /nabidka jede vodorovně mezi čísly a nabídkou.
 *
 * Dvě kapitoly — působení na trhu a historie systému — a `OFFER_COPY_KEYS`
 * o nich neví, protože přibyly později. Jeden blok na kapitolu, protože každá je
 * nadpis, věta a k tomu buď čtyři počty, nebo mapa; kolik jich je, editor
 * nerozhoduje: šířka roviny se počítá z jejich `span` a třetí by pás
 * neprodloužila, ale rozhodila.
 */
export const OFFER_STRIP_KEYS = Object.freeze([
    'nabidka.pas.pusobeni',
    'nabidka.pas.historie',
])

/**
 * Popisky modálu s nastavením cookies — všechno, co v něm není kategorie.
 *
 * Čte je `cms.config.js` i `@/lib/site/footer` — ten sahá pro modál do
 * `page: 'global'` mimo `resolvePage` a klíč musí odněkud vzít.
 */
export const COOKIES_CHROME_KEY = 'global.cookies.popisky'

/** Které pozice `global.cookies.popisky` znamenají který popisek. */
export const COOKIES_CHROME = Object.freeze({
    eyebrow: 0,
    always: 1,
    providers: 2,
    cookies: 3,
    save: 4,
    close: 5,
})

/** Hlášky kontaktního listu. Cestují uvnitř `getContactContent`. */
export const CONTACT_NOTICE_KEY = 'global.contact.hlasky'

/** Které pozice `global.contact.hlasky` znamenají kterou hlášku. */
export const CONTACT_NOTICES = Object.freeze({
    missing: 0,
    badEmail: 1,
    notWired: 2,
})

/**
 * Hlášky, které obě formuláře recenzí říkají po odeslání.
 *
 * Vlastní blok, a ne dalších šest položek na `recenze.formular`: ten už má
 * pojmenované pozice 0–2 a na stránce k nim patří prvky, které se dají kliknout.
 * Tohle jsou hlášky, které se objeví až po akci — na stránce pro ně žádný prvek
 * není a nikdy nebude — takže blok bez `docId`, upravovaný formulářem. Totéž
 * rozhodnutí jako u `nabidka.realita.cisla`.
 *
 * Jeden blok pro /recenze i /recenze/[slug]: obě routy nesou `copy: 'recenze'`
 * a obě dělají totéž (posílají recenzi na /api/cms/reviews), takže dvě sady
 * stejných vět by byly dvě místa, kde se dá změnit jen jedno.
 */
export const REVIEW_NOTICE_KEY = 'recenze.hlasky'

/** Které pozice `recenze.hlasky` znamenají kterou hlášku. */
export const REVIEW_NOTICES = Object.freeze({
    needName: 0,
    needAdvisor: 1,
    needMessage: 2,
    thanks: 3,
    failed: 4,
    copyFailed: 5,
    // Výzva v rozbalovacím seznamu poradců a popisek zavíracího křížku. Nejsou
    // to hlášky, ale bydlí tady ze stejného důvodu: v modálu, který je při
    // editaci zavřený, na ně překryv myší nedosáhne.
    pickHint: 6,
    close: 7,
})
