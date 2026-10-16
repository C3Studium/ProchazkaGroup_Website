// Konkrétní adresy dynamických rout — z dokumentů, ze kterých vznikají.
//
// `/recenze/[slug]` je šablona: v `src/pages` je jeden soubor a na webu z něj
// je tolik stránek, kolik je poradců. Kdo chce ty adresy vyjmenovat, musí se
// zeptat databáze — což je přesně důvod, proč to nejde udělat tam, kde se
// stránky jen procházejí po disku.
//
// Vlastní modul, a ne funkce v `revalidate.js`, kde to bydlelo: potřebují to
// dva. Publikace kvůli přegenerování a Studio kvůli seznamu stránek — a ten
// seznam bydlí v `pages.js`, ze kterého si `revalidate.js` bere
// `listRegeneratingRoutes`. Import opačným směrem by uzavřel kruh.

import site from '../site/config.js'
import { addressesOf, dynamicPages, sourceHolds } from '../site/index.js'
import { readPublished } from './site/read.js'

/** Kolik dokumentů se na jednu dynamickou routu přečte. */
const PER_PAGE = 200

/**
 * Dokumenty, ze kterých dynamická routa vyrábí stránky, i s adresou každé.
 *
 * `readPublished` a ne typovaná čtečka schválně: resolver v `cms.config.js` je
 * psaný proti uloženému tělu (`body.slug`), což je tvar, jaký mu podává
 * publikace. Tady musí dostat týž.
 *
 * @param {Set<string>|null} routes  zúžení na konkrétní routy; bez něj odpoví všechny
 */
export const dynamicPageRows = async (routes = null) => {
    const out = []
    for (const page of dynamicPages(site)) {
        if (routes && !routes.has(page.route)) continue
        const rows = await readPublished({ type: page.query.type, perPage: PER_PAGE })
        for (const body of rows) {
            if (!sourceHolds(page.query, page.query.type, body)) continue
            for (const path of [].concat(page.resolve(body) || [])) {
                if (typeof path !== 'string' || !path.startsWith('/')) continue
                out.push({ route: page.route, path, body })
            }
        }
    }
    return out
}

/**
 * Jen adresy, rozšířené na regiony.
 *
 * Rozšíření patří sem a ne k volajícímu: tahle větev se používá pro globální
 * bloky (patičku a spol.), které jsou na KAŽDÉ stránce, a bez rozšíření by
 * regenerace globálu byla ta jediná, co deset regionů přeskočí.
 */
export const allDynamicPaths = async (routes = null) =>
    (await dynamicPageRows(routes)).flatMap((row) => addressesOf(site, row.path))

/**
 * Totéž pro seznam stránek ve Studiu — adresa plus jméno, které editor pozná.
 *
 * Bez rozšíření na regiony: v seznamu je jedna adresa na jednu stránku, protože
 * region se v rámu přepíná jinde a deset řádků téhož poradce by byl seznam,
 * kterým se nedá projít.
 *
 * Jméno se hledá v pořadí, v jakém dokumenty lidí a věcí bývají psané, a poslední
 * záchranou je slug z adresy. Prázdný řádek v seznamu je horší než ošklivý.
 */
export const dynamicPageEntries = async () =>
    (await dynamicPageRows()).map((row) => ({
        path: row.path,
        route: row.route,
        label: labelFor(row.body, row.path),
    }))

/**
 * Jméno, které editor v seznamu pozná.
 *
 * Pořadí je od nejjistějšího k nejzoufalejšímu a ta jistota není stejná:
 * `name` a `title` znamenají jméno vždycky, dvojice `firstName` + `lastName` je
 * to, co má dokument člověka — a stránky, které se generují z dokumentů, jsou
 * z velké části stránky lidí.
 *
 * Poslední záchranou je slug, ale učesaný. `efenberk-ondrej` je adresa, ne
 * jméno, a řádek v seznamu, který vypadá jako adresa, se čte hůř než řádek,
 * který vypadá jako jméno — i když v něm chybí diakritika.
 */
const labelFor = (body, path) => {
    const named = [body?.name, body?.title, body?.headline].find(
        (value) => typeof value === 'string' && value.trim(),
    )
    if (named) return named.trim()

    const person = [body?.academicTitle, body?.firstName, body?.lastName]
        .filter((part) => typeof part === 'string' && part.trim())
        .join(' ')
        .trim()
    if (person) return person

    const slug = decodeURIComponent(path.split('/').filter(Boolean).pop() || path)
    return slug.replace(/[-_]+/g, ' ').replace(/(^|\s)\p{Ll}/gu, (m) => m.toUpperCase())
}
