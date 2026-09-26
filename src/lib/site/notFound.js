// Co říká rozcestník — SERVER ONLY.
//
// Vlastní čtečka místo `getPageContent('/404')`, a ne z pohodlnosti. `/404` není
// v `cms.config.js` jako stránka a být tam nemá; důvod je rozepsaný tam, kde ho
// bude někdo hledat — v oddílu „/404 — a proč tu není jako stránka". Krátce:
// `discoverRoutes` tuhle routu přeskakuje, protože si ji Next obsluhuje sám,
// a `res.revalidate('/404')` by při každé publikaci skončil chybou, protože si
// stránku vyžádá a trvá na stavu 200 — jenže `/404` vrací 404.
//
// Předloha je `globalBlock` ve ./footer.js: sáhnout přímo do `getSiteCopy` pro
// bloky jedné `page` a složit z nich props. Rozdíl je jediný a je to celý důvod,
// proč to nejsou globální bloky — tyhle texty nejsou pod každou routou, jsou na
// jedné, jen na té, kterou knihovna neumí pojmenovat.
//
// **Cena, kterou to má.** Publikace tuhle stránku nepřegeneruje: bez deklarace
// nemá `deps.js` z čeho zjistit, že sem ty dva dokumenty patří. Změna se tedy
// objeví až s dalším oknem ISR, a proto ho má rozcestník kratší než zbytek webu
// (viz `REVALIDATE_SECONDS` v src/pages/404.js). Je to horší než okamžitá
// publikace a lepší než publikace, která po každém uložení hlásí chybu.

import { getSiteCopy, readerFor } from '@/cms/server/site'

import { NOT_FOUND_COPY_KEYS, NOT_FOUND_LINES, NOT_FOUND_TIP_COUNT } from '@/lib/copyKeys'

/** Popisek na pozici, bez zavírání mezer — pozice je adresa. */
const labelAt = (block, index) => (block?.items || [])[index]?.label || ''

/**
 * Texty rozcestníku, nebo `null`.
 *
 * `docId` cestuje jen v konceptu, přesně jako `f.docId()` v konfiguraci: veřejné
 * HTML nesmí nést identifikátory dokumentů, a bez `draft` je stejně nikdo
 * nepřipojil — `id` na blok věší jedině `readEditable`.
 *
 * @param {{ draft?: boolean, at?: string|null }} [options]
 */
export const getNotFoundContent = async ({ draft = false, at = null } = {}) => {
    const read = readerFor({ draft, at })
    const copy = await getSiteCopy({ page: '404', read })

    const hero = copy[NOT_FOUND_COPY_KEYS.hero] || null
    const tips = copy[NOT_FOUND_COPY_KEYS.tips] || null
    if (!hero && !tips) return null

    const doc = (block) => (draft && block?.id ? { docId: block.id } : {})

    return {
        hero: {
            ...doc(hero),
            // Slova nadhozu jsou `title`: na stránce sdílejí odstavec
            // s `<em>404</em>`, takže vlastní prvek nemají a upravují se ve
            // formuláři. `title` je zároveň jméno, pod kterým blok editor vidí
            // v seznamu Studia — totéž uspořádání jako u `cookies.obsah`.
            words: hero?.title || '',
            cap: labelAt(hero, NOT_FOUND_LINES.cap),
            home: labelAt(hero, NOT_FOUND_LINES.home),
        },
        tips: {
            ...doc(tips),
            // Pevných pět, bez zavírání mezer: prázdná dlaždice má zůstat
            // prázdná, ne vytáhnout další o jedno místo nahoru.
            rows: Array.from({ length: NOT_FOUND_TIP_COUNT }, (_, index) => {
                const item = (tips?.items || [])[index]
                return { label: item?.label || '', value: item?.value || '' }
            }),
        },
    }
}
