/**
 * Pluralizace podle jazyka — jedno pravidlo na jazyk, ne CLDR.
 *
 * Do 0.1.50 žila česká pluralizace jako funkce `plural()` v
 * `src/core/fieldTypes.js` a měla dvě volání: „znak / znaky / znaků" a
 * „položku / položky / položek". Tvar té funkce byl ale zadrátovaný do
 * češtiny — tři formy, hranice 1 a 2–4 — takže anglická hláška by z ní
 * vylezla jako „1 characters".
 *
 * Pravidlo proto patří k jazyku, ne k hlášce. Katalog drží tvary jako POLE
 * (`["znak", "znaky", "znaků"]`) a pravidlo jazyka vybírá INDEX do něj.
 * Přidat jazyk pak znamená přidat jednu funkci sem a jeden soubor s texty —
 * ne sáhnout na třicet hlášek.
 *
 * Proč ne `Intl.PluralRules`: vrací jména kategorií (`one`, `few`, `many`,
 * `other`), takže by katalog musel být klíčovaný jmény kategorií a ty se
 * jazyk od jazyka liší. Index do pole je to, co drží tvar katalogu stejný
 * pro všechny jazyky. Kdyby se někdy CLDR hodilo, `PLURAL_RULES.xx` je to
 * jediné místo, kde by se o něj opřelo.
 */

/**
 * Pravidlo vrací index do pole tvarů. Pořadí tvarů je tedy součástí smlouvy
 * jazyka: čeština má tři (1 / 2–4 / zbytek), angličtina dvě (1 / zbytek).
 *
 * Česká větev je PŘEPIS původní `plural()` z `fieldTypes.js`, řádek po řádku
 * včetně `Math.abs`, aby „2 znaky" zůstalo „2 znaky" a nula zůstala „znaků".
 */
export const PLURAL_RULES = Object.freeze({
  cs: (count) => {
    const n = Math.abs(count)
    if (n === 1) return 0
    if (n >= 2 && n <= 4) return 1
    return 2
  },
  en: (count) => (Math.abs(count) === 1 ? 0 : 1),
})

/** Jazyk bez vlastního pravidla dostane to anglické: jednotné vs. množné. */
export const DEFAULT_PLURAL_RULE = PLURAL_RULES.en

/**
 * Který tvar ze seznamu. Nikdy nespadne a nikdy nevrátí index mimo seznam —
 * hláška se smí zhoršit, ale validace kvůli skloňování padat nesmí.
 */
export function pluralIndex(lang, count, formCount = Infinity) {
  const rule = PLURAL_RULES[lang] ?? DEFAULT_PLURAL_RULE
  const index = rule(Number(count))
  if (!Number.isInteger(index) || index < 0) return 0
  return index < formCount ? index : formCount - 1
}
