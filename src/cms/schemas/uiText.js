// uiText — slovník klíč → text.
//
// `siteCopy` je BLOK stránky: má nadpis, text pod ním, obrázek a seznam
// položek, a tenhle tvar je to, co z něj dělá blok. Tlačítko „Přidat do košíku",
// popisek v modálu, hláška „Formulář se nepodařilo odeslat" a slovo „Zavřít"
// nic z toho nemají. Uložit je jako siteCopy znamená stovky dokumentů, z nichž
// každý má vyplněné jedno pole z osmi a nadpis, který nikde není vidět — a
// editor, který v seznamu bloků hledá jedno slovo mezi třemi sty.
//
// Eshop si na to vyrobil vlastní typ `tlacitko` (`klic`, `label`, `href`) a
// fungovalo to; jen se to jmenovalo podle prvního použití, ne podle toho, co to
// je. Zobecnění je tenhle typ — pět polí místo tří, protože `group` a `note`
// jsou to, co ze tří set řádků udělá něco, v čem se dá hledat.
//
// ## Proč `key` a ne pořadí
//
// `key` je smlouva s kódem: komponenta si text vyzvedne podle něj
// (`kosik.pridat`, `formular.odeslat`). Přejmenovat ho znamená přepsat i
// komponentu, takže je povinný a má tvar, který jde napsat do zdrojáku bez
// uvozovkové ekvilibristiky — malá písmena, číslice, tečky, podtržítka
// a pomlčky jako oddělovače.
//
// ## Co se z toho překládá
//
// Jedno pole, `value`. Ostatní čtyři jsou infrastruktura: `key` je
// identifikátor, `group` je škatulka ve Studiu, `href` je adresa a `note` je
// vzkaz redaktorovi. Kdyby se překládal `key`, přestal by být klíčem; kdyby se
// překládal `group`, rozpadl by se filtr ve Studiu na dvě různé škatulky
// téhož jména.
//
// Příznaky jsou tu vypsané u všech pěti, i tam, kde by výchozí hodnota podle
// typu odpověděla stejně (`href` je `url`, ten se nepřekládá tak jako tak).
// Tenhle typ je totiž zároveň čitelný opis tabulky z docs/I18N.md §6 a tabulka
// se čte celá, ne z poloviny odvozuje.

import { defineField, defineType } from '../core/index.js'

/** Tvar klíče z docs/I18N.md §6. Segmenty malých písmen a číslic, oddělené `.`, `_` nebo `-`. */
export const UI_TEXT_KEY = /^[a-z0-9]+([._-][a-z0-9]+)*$/

/**
 * Výchozí škatulka.
 *
 * `group` je povinná, protože podle ní `getUiText` filtruje — a záznam
 * s prázdnou skupinou by se do žádné odpovědi nedostal a vypadal by jako
 * neuložený. Povinné pole bez výchozí hodnoty ale znamená, že se nový záznam
 * nedá uložit, dokud si redaktor nevymyslí jméno škatulky, takže tady jedno je.
 */
export const UI_TEXT_DEFAULT_GROUP = 'obecne'

export default defineType({
    name: 'uiText',
    title: 'Texty rozhraní',
    icon: 'text',
    fields: [
        defineField({
            name: 'key',
            title: 'Klíč',
            type: 'string',
            translate: false,
            description: 'Kterým si text vyzvedne kód, např. "kosik.pridat". Nepřejmenovávat bez úpravy komponenty.',
            validation: (rule) =>
                rule
                    .required()
                    .max(96)
                    .regex(UI_TEXT_KEY, 'Jen malá písmena, číslice, tečky, podtržítka a pomlčky — např. "kosik.pridat".'),
        }),
        defineField({
            name: 'group',
            title: 'Skupina',
            type: 'string',
            translate: false,
            initialValue: UI_TEXT_DEFAULT_GROUP,
            description: 'Kam text ve Studiu patří — např. "menu", "kosik", "formular". Podle ní se texty čtou po hrstech.',
            validation: (rule) =>
                rule
                    .required()
                    .max(48)
                    .regex(UI_TEXT_KEY, 'Jen malá písmena, číslice, tečky, podtržítka a pomlčky — např. "kosik".'),
        }),
        defineField({
            name: 'value',
            title: 'Text',
            type: 'text',
            translate: true,
            // `text` a ne `string`: „Zavřít" je jedno slovo, ale hláška
            // z formuláře bývá věta a v jednořádkovém <input> se z ní vidí
            // třetina. Pole, které jde přepnout podle délky obsahu, neexistuje,
            // takže vyhrává ten tvar, který unese oboje.
            options: { rows: 2 },
            validation: (rule) => rule.required().max(1000),
        }),
        defineField({
            name: 'href',
            title: 'Odkaz',
            type: 'url',
            translate: false,
            // Nepřekládá se, přestože u jazykových mutací by se chtělo. Adresa
            // uvnitř webu patří kódu (routa se mění s aplikací, ne s obsahem)
            // a adresa ven — Facebook, Instagram — je pro všechny jazyky táž.
            // Až se rozhodne, jestli URL ponese i jazyk, rozhodne se to u
            // Medusy a najednou (docs/I18N.md §9), ne tímhle polem.
            description: 'Jen u textů, které někam vedou a cíl nedrží kód (odkaz ven, dokument ke stažení).',
        }),
        defineField({
            name: 'note',
            title: 'Kde to je',
            type: 'string',
            translate: false,
            description: 'Pro redaktora: kde se text na webu objeví. Nikam se nevykresluje.',
            validation: (rule) => rule.max(200),
        }),
    ],
    // Klíč jako titulek, ne text.
    //
    // Ve slovníku o třech stech položkách se hledá to, co je jedinečné a co je
    // v kódu — a to je klíč. Text bývá „Odeslat" popáté a jako titulek by dělal
    // pět nerozlišitelných řádků. `note` je v podtitulku před textem, protože
    // odpovídá na otázku, kterou má redaktor ve skutečnosti: kde to uvidím.
    preview: (doc) => ({
        title: doc?.key || 'Bez klíče',
        subtitle: `${doc?.group || '—'} · ${doc?.note || doc?.value || ''}`.trim(),
        media: null,
    }),
    orderings: [
        { name: 'group', title: 'Po skupinách', by: [{ field: 'group', direction: 'asc' }, { field: 'key', direction: 'asc' }] },
        { name: 'key', title: 'Podle klíče', by: [{ field: 'key', direction: 'asc' }] },
    ],
})
