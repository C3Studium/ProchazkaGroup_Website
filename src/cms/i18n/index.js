/**
 * Katalog textů knihovny — docs/I18N.md §8.
 *
 * Knihovna vkládá do cizího webu málo textu, ale to málo bylo natvrdo česky
 * a přepsat se nedalo: validační hláška z jádra, čtyři věty veřejných API
 * a odznak „Spravovat web". Na anglickém webu z nich vypadla čeština a nikdo
 * s tím nemohl nic dělat.
 *
 * Tohle je ten nejmenší mechanismus, který to řeší. Nejsou tu jazykové
 * soubory na disku, extrakce, ICU MessageFormat ani `Intl`. Jsou tu čtyři
 * věci:
 *
 *   1. klíč → text, v `./cs.js` a `./en.js`
 *   2. dosazování hodnot: `{n}`, `{name}`
 *   3. pluralizace PRAVIDLEM JAZYKA, ne pravidlem hlášky (./plural.js)
 *   4. volba jazyka funkcí, kterou nastaví volající
 *
 * ---------------------------------------------------------------------------
 * Proč funkce, a ne proměnná s jazykem
 *
 * Kdyby knihovna držela „aktuální jazyk" jako hodnotu, musel by ji někdo před
 * každým požadavkem přenastavit — a na serveru, který obsluhuje dva požadavky
 * najednou, by druhý přepsal jazyk prvnímu. Zatímco funkce se ptá až ve chvíli
 * hlášky a odpověď si volající může vzít odkud chce: server z `AsyncLocalStorage`
 * nebo z hlavičky požadavku, prohlížeč z nastavení webu.
 *
 *     // server, Next.js
 *     setLanguageSource(() => requestStore.getStore()?.lang)
 *
 *     // klient
 *     setLanguageSource(() => document.documentElement.lang)
 *
 * Bez nastavení je jazyk `cs`. Každé dnešní volání se tedy chová přesně jako
 * dnes — to je podmínka, ne přání: hlášky se stěhovaly beze změny znění.
 *
 * Kdo potřebuje jazyk znát adresně (handler, který má `req` po ruce), předá
 * ho jako poslední argument `t()` a na zdroj se nespoléhá vůbec.
 *
 * ---------------------------------------------------------------------------
 * Přepsat text
 *
 *     addMessages("cs", { "review.thanks": "Díky!" })
 *     addMessages("de", { ...celý katalog... })
 *
 * Hostitelský web tím řeší obě věci naráz: jiné znění a jazyk, který knihovna
 * nezná. Chybějící klíč padá na češtinu, protože ta je úplná.
 */
import { cs } from "./cs.js"
import { en } from "./en.js"
import { pluralIndex } from "./plural.js"

/** Jazyk, kterým knihovna mluví, dokud jí nikdo neřekne jinak. */
export const DEFAULT_LANGUAGE = "cs"

// Kopie, ne zmrazené originály: `addMessages` do nich dopisuje.
const catalogs = new Map([
  ["cs", { ...cs }],
  ["en", { ...en }],
])

/** Jazyky, které katalog umí — včetně těch, co přidal hostitel. */
export function languages() {
  return [...catalogs.keys()]
}

/**
 * `cs-CZ` i `CS` znamenají `cs`. Jazyk, který katalog nezná, znamená češtinu:
 * anglická věta v německém webu je vada, ale prázdná hláška je horší.
 */
export function normalizeLanguage(lang) {
  if (typeof lang !== "string") return DEFAULT_LANGUAGE
  const tag = lang.trim().toLowerCase()
  if (!tag) return DEFAULT_LANGUAGE
  if (catalogs.has(tag)) return tag
  const base = tag.split(/[-_]/)[0]
  return catalogs.has(base) ? base : DEFAULT_LANGUAGE
}

let languageSource = null

/**
 * Odkud se bere jazyk. `null` vrací knihovnu k výchozí češtině.
 *
 * @param {(() => string | null | undefined) | null} resolve
 */
export function setLanguageSource(resolve) {
  if (resolve === null || resolve === undefined) {
    languageSource = null
    return
  }
  if (typeof resolve !== "function") {
    throw new TypeError("[cms/i18n] setLanguageSource() expects a function or null.")
  }
  languageSource = resolve
}

/**
 * Jakým jazykem se právě mluví.
 *
 * Zdroj smí spadnout — je to cizí kód volaný uprostřed vykreslování hlášky
 * a výjimka z něj by shodila validaci, tedy něco úplně jiného, než co se
 * pokazilo. Padlý zdroj proto znamená výchozí jazyk.
 */
export function currentLanguage() {
  if (!languageSource) return DEFAULT_LANGUAGE
  try {
    return normalizeLanguage(languageSource())
  } catch {
    return DEFAULT_LANGUAGE
  }
}

/**
 * Doplnit nebo přepsat texty. Slučuje se po klíčích, takže přepsat jednu větu
 * neznamená dodat celý katalog.
 */
export function addMessages(lang, messages) {
  if (typeof lang !== "string" || !lang.trim()) {
    throw new TypeError("[cms/i18n] addMessages() expects a language tag.")
  }
  if (!messages || typeof messages !== "object") {
    throw new TypeError("[cms/i18n] addMessages() expects an object of key → text.")
  }
  const code = lang.trim().toLowerCase()
  catalogs.set(code, { ...(catalogs.get(code) ?? {}), ...messages })
}

/** Záznam v jazyce, jinak v češtině, jinak `undefined`. */
function entry(key, lang) {
  const found = catalogs.get(lang)?.[key]
  if (found !== undefined) return found
  return catalogs.get(DEFAULT_LANGUAGE)?.[key]
}

/**
 * Skloňovaný tvar. Klíč ukazuje na pole tvarů, index vybírá pravidlo jazyka.
 *
 * Dva tvary v angličtině, tři v češtině — a `t()` na to nesahá, protože
 * o počtu forem rozhoduje jazyk, ne hláška.
 */
export function pluralOf(key, count, lang) {
  const language = lang === undefined ? currentLanguage() : normalizeLanguage(lang)
  const forms = entry(key, language)
  if (!Array.isArray(forms) || forms.length === 0) return forms === undefined ? key : String(forms)
  return String(forms[pluralIndex(language, count, forms.length)])
}

// `{n}` dosadí hodnotu, `{n|unit.characters}` dosadí skloňovaný tvar podle
// hodnoty `n`. Jméno musí začínat písmenem a nesmí obsahovat mezeru, takže
// `{ _ref, _type }` uvnitř hlášky o odkazu není zástupka a zůstane, jak je.
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)(?:\|([A-Za-z][A-Za-z0-9._-]*))?\}/g

/**
 * Text pod klíčem, s dosazenými hodnotami.
 *
 * @param {string} key      klíč katalogu, např. `"rule.required"`
 * @param {object} [values] hodnoty pro zástupky, např. `{ n: 5 }`
 * @param {string} [lang]   jazyk natvrdo; bez něj se použije zdroj jazyka
 * @returns {string}
 *
 * Neznámý klíč se vrací sám sebou. Prázdná hláška by editorovi řekla, že je
 * všechno v pořádku, zatímco `"rule.required"` v poli je vada, kterou někdo
 * nahlásí.
 *
 * Neznámá zástupka zůstává nedosazená ze stejného důvodu: `{n}` v textu je
 * chybějící hodnota, kdežto `undefined` vypadá jako hodnota.
 */
export function t(key, values, lang) {
  const language = lang === undefined ? currentLanguage() : normalizeLanguage(lang)
  const found = entry(key, language)
  if (found === undefined) return String(key)
  if (Array.isArray(found)) return pluralOf(key, values?.n ?? values?.count ?? 0, language)

  const template = String(found)
  if (!values) return template

  return template.replace(PLACEHOLDER, (whole, name, formsKey) => {
    const value = values[name]
    if (value === undefined) return whole
    return formsKey ? pluralOf(formsKey, value, language) : String(value)
  })
}
