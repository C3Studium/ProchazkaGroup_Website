// Čtení slovníku klíč → text — ČISTÉ, bez sítě a bez databáze.
//
// `getSiteCopy` bydlí v server/site/content.js, protože si sám sáhne na výchozí
// čtenáře. Tenhle soubor je jeho dvojče o vrstvu níž: tvarování je tady, řádky
// mu dodá volající. Dva důvody, a oba jsou praktické.
//
// Za prvé: tvar odpovědi — `{ [key]: value }` — je to jediné, co o slovníku
// musí vědět Studio, náhled i build, a všichni tři se k němu dostanou jinudy.
// Kdyby to byla serverová funkce, Studio by muselo mít druhou kopii.
//
// Za druhé: `read` je celý rozdíl mezi publikovaným webem, náhledem konceptu
// a archivem k datu (viz hlavičku server/site/content.js). Funkce, která si
// čtenáře vybírá sama, ten rozdíl schová; funkce, která ho dostane, ho nechá
// tam, kde se o něm rozhoduje.

/** Řádek, který se nedá použít, se přeskakuje — bez klíče není co vyzvednout. */
const keyOf = (row) => (typeof row?.key === 'string' ? row.key.trim() : '')

const textOf = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value))

/**
 * Slovník z už přečtených řádků — `{ klíč: { key, value, href, note, id } }`.
 *
 * Tohle je plný tvar. `uiTextFrom` z něj dělá to, co má ve specifikaci
 * `getUiText`, a existuje vedle něj proto, že `href` a `note` by jinak nebyly
 * odkud přečíst — a `href` je pole, kvůli kterému ten typ na eshopu vznikl.
 *
 * `id` je dokument, ze kterého text pochází, nebo `null`. Pod klíčem `_id` ho
 * na tělo věší jenom `readEditable` (viz DOCUMENT_ID v server/site/read.js),
 * takže veřejné čtení tu má všude `null` — a vizuální editace má co kliknout
 * právě a jen v náhledu.
 *
 * DUPLICITNÍ KLÍČ VYHRÁVÁ PRVNÍ. Bez filtru na skupinu se dva záznamy téhož
 * klíče ze dvou skupin potkat mohou; „poslední vyhrává" by znamenalo, že
 * odpověď závisí na řazení dotazu, tedy na něčem, co volající nevidí. První
 * vyhrává je stejně libovolné, ale je stabilní — a ta duplicita je stejně
 * chyba obsahu, kterou má někdo opravit, ne zvolit jinak.
 *
 * @param {Array<object>} rows  těla dokumentů typu `uiText`
 * @param {{ group?: string|null }} [options]  jen texty téhle skupiny
 * @returns {Record<string, { key: string, value: string, href: string, note: string, id: string|null }>}
 */
export const uiTextEntries = (rows, { group = null } = {}) => {
    const out = {}
    for (const row of rows || []) {
        const key = keyOf(row)
        if (!key) continue
        if (group && textOf(row.group) !== group) continue
        if (key in out) continue
        out[key] = {
            key,
            value: textOf(row.value),
            href: textOf(row.href),
            note: textOf(row.note),
            id: typeof row._id === 'string' && row._id ? row._id : null,
        }
    }
    return out
}

/**
 * Totéž, jen holé — `{ klíč: text }`, tvar z docs/I18N.md §6.
 *
 * To, co komponenta chce v devíti případech z deseti: `t['kosik.pridat']`.
 *
 * @param {Array<object>} rows
 * @param {{ group?: string|null }} [options]
 * @returns {Record<string, string>}
 */
export const uiTextFrom = (rows, options) =>
    Object.fromEntries(Object.entries(uiTextEntries(rows, options)).map(([key, entry]) => [key, entry.value]))

/**
 * `getUiText({ group, lang })` — slovník jedné skupiny v jednom jazyce.
 *
 * `read` je čtenář z @/cms/server/site: `readPublished` pro web, `readEditable`
 * pro náhled, `readerAt` pro archiv. Povinný, a to je záměr — knihovní výchozí
 * hodnota by tenhle soubor přivázala k serveru a tím ho zavřela Studiu. Fasáda,
 * která ho doplní, patří vedle `getSiteCopy`; kam přesně, viz poznámka na konci
 * souboru.
 *
 * `lang` se pouze předává čtenáři. Slučování překladového řádku se základem je
 * jeho práce (docs/I18N.md §3) a být nesmí tady: kdyby si tvarování sahalo na
 * jazyky samo, existovaly by dvě definice toho, co znamená „přečti to česky".
 *
 * @param {object} options
 * @param {(query: object) => Promise<Array<object>>} options.read
 * @param {string|null} [options.group]  bez ní celý slovník
 * @param {string|null} [options.lang]   bez něj výchozí jazyk
 * @returns {Promise<Record<string, string>>}
 */
export const getUiText = async ({ read, group = null, lang = null } = {}) => {
    if (typeof read !== 'function') {
        throw new Error('[cms] getUiText potřebuje `read` — čtenáře z @/cms/server/site.')
    }
    const rows = await read({
        type: 'uiText',
        filters: group ? { 'data.group': group } : undefined,
        sort: { field: 'data.key', direction: 'asc' },
        // Slovník se čte celý najednou a stránkovat ho by znamenalo, že
        // komponenta dostane text, nebo nedostane, podle toho, kolikátý je
        // v abecedě. Tisíc je nad počtem, který kdy vyplnil člověk.
        perPage: 1000,
        lang,
    })
    return uiTextFrom(rows, { group })
}

// ---------------------------------------------------------------------------
// Kam tohle zapojit
//
// Fasáda se doplněným čtenářem patří do server/site/content.js, hned vedle
// `getSiteCopy`, a je to jeden řádek:
//
//     import { getUiText as shapeUiText } from '../../site/uiText.js'
//     export const getUiText = ({ group = null, lang = null, read = readPublished } = {}) =>
//         shapeUiText({ read, group, lang })
//
// a jeho vývoz v server/site/index.js vedle řádku s `getSiteCopy`. Tím dostane
// volající podpis ze specifikace — `getUiText({ group, lang })` — a `read`
// zůstane tím, čím je u všech ostatních čtení: volbou mezi webem, náhledem
// a archivem.
