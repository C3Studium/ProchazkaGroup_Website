/**
 * Které pole se překládá — jediná odpověď na tu otázku.
 *
 * Čtení i zápis se o ni opírají z opačných stran (docs/I18N.md §3 a §4):
 * čtení přeložitelná pole z překladového řádku PŘEBÍRÁ a ostatní z něj
 * IGNORUJE, zápis s `lang` na nepřeložitelné pole je CHYBA, ne tiché
 * přesměrování do základu. Kdyby si ty dvě strany odpověď počítaly každá po
 * svém, vznikl by stav, ve kterém zápis projde a čtení jeho výsledek zahodí —
 * a to je přesně ta vada, kterou nikdo nenahlásí, protože se tváří jako
 * „překlad se neuložil".
 *
 * Proto jedna funkce, `isTranslatable`, a proto je vyvedená z `core`: je pod
 * serverovou vrstvou i pod Studiem a nesmí na ně ukazovat zpátky.
 *
 * ---------------------------------------------------------------------------
 * Proč výchozí hodnota podle TYPU
 *
 * Kdyby se `translate` muselo psát u každého pole, tak by se u poloviny
 * zapomnělo — a zapomenuté pole je nepřeložitelné pole, takže by se chyba
 * projevila až tím, že web v druhém jazyce nejde přeložit celý. Typ o tom
 * přitom skoro vždy rozhoduje sám: `slug` je adresa, `number` je číslo,
 * `string` je věta pro čtenáře. Explicitní `translate` je tedy výjimka
 * (`image: translate: true` — jiný trh, jiná fotka), ne povinnost.
 */
import { hasFieldType } from "./fieldTypes.js"

/**
 * Tabulka z docs/I18N.md §5, přepsaná jedna ku jedné.
 *
 * `array` a `object` v ní nejsou: „podle členů" není konstanta, počítá se níž.
 *
 * `select` je tu jako NEPŘEKLÁDANÝ, a stojí za to říct proč, protože ve
 * specifikaci je v obou sloupcích. Dokument nese HODNOTU volby (`'poradce'`),
 * titulek volby je v schématu, ne v dokumentu — překládat se tedy nemá co
 * uložit. Titulky voleb jsou katalog textů knihovny (§8), jiná vrstva.
 */
export const TRANSLATES_BY_DEFAULT = Object.freeze({
  string: true,
  text: true,
  richText: true,

  slug: false,
  reference: false,
  number: false,
  boolean: false,
  date: false,
  datetime: false,
  url: false,
  email: false,
  file: false,
  // Vypnutý, ale zapínatelný — a to je jediný důvod, proč je na seznamu zvlášť
  // a ne mezi ostatními „ne": u obrázku dává `translate: true` smysl.
  image: false,
  select: false,
})

/**
 * Přijímá `*` i konkrétní index, a obojí znamená totéž.
 *
 * `markAtPath` v @/cms/schemas/marks index schválně NEbere — `items.0.label`
 * a `items.*.label` jsou tam dvě různé otázky. Tady ne: cesta, na kterou se
 * `isTranslatable` ptá, přišla z `PATCH /documents/:id/field`, kde editor
 * zapisuje `items.3.label`, a schéma má pro celý seznam jeden popis členu.
 * Kdyby tu index neprošel, každý zápis do položky seznamu by odpověděl
 * „nepřeložitelné".
 */
const SEGMENT_IS_MEMBER = (segment) => segment === "*" || /^\d+$/.test(segment)

/**
 * Členové seznamu. `members` je pravda, `of` je alias, který na normalizovaném
 * poli drží `defineField` a na holé deklaraci je jediné, co tam je.
 */
const membersOf = (node) =>
  node.members?.length ? node.members : node.of ? (Array.isArray(node.of) ? node.of : [node.of]) : []

/** Popis jednoho členu seznamu, když je jednoznačný. */
const memberOf = (node) => {
  const members = membersOf(node)
  // Polymorfní seznam má členů víc a segment cesty neříká který; odpovědět
  // „ten první" by byla hádka, ne odpověď.
  return members.length === 1 ? members[0] : null
}

/**
 * Uzel, který tečková cesta pojmenovává, nebo `null`.
 *
 * Třetí kopie téhle procházky v projektu (viz `fieldAtPath` v
 * @/cms/schemas/marks.js a v @/cms/site/reads.js) a je to vědomé: `core` nesmí
 * importovat ze `schemas` ani ze `site` — závislost jde opačným směrem a
 * obrátit ji by z čistého jádra udělalo kruh. Segmenty se čtou stejně jako
 * tam, aby se tři stejně vypadající cesty nechovaly každá jinak.
 */
const nodeAtPath = (root, path) => {
  let node = root
  for (const segment of String(path).split(".")) {
    if (!node) return null
    if (SEGMENT_IS_MEMBER(segment)) {
      node = memberOf(node)
      continue
    }
    node = (node.fields || []).find((field) => field.name === segment) || null
  }
  return node || null
}

/** Typ dokumentu i `object` mají `fields`; jen typ nemá `type`. */
const isContainerWithoutType = (node) => Array.isArray(node.fields) && !node.type

/**
 * Překládá se tohle pole?
 *
 * @param {object} field  normalizované pole (`defineField`) NEBO typ
 *                        dokumentu (`defineType`) — typ se chová jako
 *                        `object`: překládá se, když se překládá aspoň jedno
 *                        jeho pole
 * @param {string} [path] tečková cesta dovnitř, `items.*.label` i `items.3.label`
 * @returns {boolean}
 *
 * Na cokoliv, co není pole — neznámý typ, cesta, která nikam nevede — odpovídá
 * `false`. Serverová vrstva se ptá na adresy, které přišly z HTTP, takže
 * výjimka by tu znamenala pětistovku místo odmítnutého zápisu.
 */
export function isTranslatable(field, path) {
  const node = path === undefined || path === null || path === "" ? field : field && nodeAtPath(field, path)
  if (!node || typeof node !== "object") return false

  // Explicitní příznak je odpověď a dál se nehledá — i u seznamu, kde
  // `translate: false` na celém poli znamená „tenhle seznam se nepřekládá",
  // ať už jsou jeho členy jakékoliv.
  if (typeof node.translate === "boolean") return node.translate

  if (isContainerWithoutType(node)) return node.fields.some((child) => isTranslatable(child))
  if (node.type === "object") return (node.fields || []).some((child) => isTranslatable(child))
  if (node.type === "array") return membersOf(node).some((member) => isTranslatable(member))

  if (!hasFieldType(node.type)) return false
  return TRANSLATES_BY_DEFAULT[node.type] === true
}

