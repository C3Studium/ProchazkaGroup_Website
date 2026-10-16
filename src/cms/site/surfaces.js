// Povrchy — modály a seznamy, které se ve Studiu vybírají ZE SEZNAMU.
//
// ČISTÉ a IZOMORFNÍ, za stejných podmínek jako ./define.js: žádné I/O, žádný
// DOM, žádný registr typů. Studio tenhle popis čte v prohlížeči.
//
// ---------------------------------------------------------------------------
// Proč to vůbec existuje
//
// „Upravit kontent" vybírá prvek geometricky — `hitTest` přes
// `elementsFromPoint`. Co má `display: none`, nemá obdélník a pro překryv
// neexistuje. Modál je tedy neupravitelný ne proto, že by v něm nebyl obsah,
// ale proto, že v tu chvíli není vidět.
//
// Obejít to anotací tlačítka, které modál otevírá, jde a je to křehké: tlačítko
// nemusí být na každé stránce a s obsahem modálu nesouvisí. Povrch je opačná
// cesta — obsah se přihlásí v konfiguraci, Studio ho nabídne v seznamu
// a otevře nad stránkou popup. Geometrie se toho neúčastní, takže je jedno,
// jestli je modál otevřený, zavřený, nebo jestli vůbec je v DOM.
//
// Živý náhled (`useStudioSurface`, docs/I18N.md §7.3) je nad tím dobrovolná
// nadstavba. Tenhle soubor o ní nic neví schválně: kdyby povrch bez spolupráce
// komponenty nefungoval, nešel by přeložit modál dodaný knihovnou ani cizí web.

const fail = (message) => {
    throw new Error(`[cms.config] ${message}`)
}

/** Co Studio umí vykreslit jako záložku. Víc jich zatím není. */
export const SURFACE_KINDS = Object.freeze(['modal', 'list'])

/**
 * Jméno povrchu končí ve třech různých kontextech, a každý z nich něco zakazuje.
 *
 *   `useStudioSurface('cookies')`   — literál v komponentě webu
 *   `data-cms-surface="cookies"`    — hodnota atributu v rámu (viz edit/surface.js)
 *   `?surface=cookies`              — parametr adresy Studia
 *
 * Mezera nebo uvozovka by prošla konfigurací a rozbila se až v jednom z nich,
 * pokaždé jinak. Levnější je to odmítnout tady, kde je vidět, co se píše.
 */
const NAME_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const SURFACE_KEYS = ['name', 'title', 'kind', 'copy', 'preview']

/**
 * Jeden povrch — modál nebo seznam, který se edituje mimo geometrii stránky.
 *
 * ```js
 * defineSurface({
 *     name: 'cookies',
 *     title: 'Nastavení cookies',
 *     kind: 'modal',            // 'modal' | 'list'
 *     copy: 'global.cookies',   // který blok drží jeho texty
 * })
 * ```
 *
 * `copy` je `key` dokumentu siteCopy, ne `page` stránky — je to JEDEN blok,
 * který povrch drží, a Studio nad ním otevře formulář jeho typu. Kdyby to byla
 * `page`, musel by povrch ještě říct, který z bloků té stránky je jeho, a to je
 * druhá deklarace téhož.
 *
 * Bez `copy` povrch nemá co otevřít, takže je povinná: povrch, na který jde
 * kliknout a nic se nestane, je horší než povrch, který v seznamu není.
 */
export const defineSurface = (config) => {
    for (const key of Object.keys(config || {})) {
        if (SURFACE_KEYS.includes(key)) continue
        // Varování, ne chyba — stejně jako u neznámého klíče v `defineSite`.
        console.warn(`[cms.config] defineSurface: neznámý klíč "${key}". Znám: ${SURFACE_KEYS.join(', ')}.`)
    }

    const { name, title = '', kind = 'modal', copy = null, preview = null } = config || {}

    const named = typeof name === 'string' ? name.trim() : ''
    if (!named) fail('povrch musí mít "name" — jméno, kterým se na něj odkazuje.')
    if (!NAME_SHAPE.test(named)) {
        fail(`povrch "${named}" nemá použitelné jméno — čekám 'cookies' nebo 'faq.obecne', bez mezer a diakritiky.`)
    }

    const block = typeof copy === 'string' ? copy.trim() : ''
    if (!block) fail(`povrch "${named}" musí mít "copy" — klíč bloku, který drží jeho texty.`)

    // Neznámý `kind` je varování, ne chyba, a padá na `modal`.
    //
    // Je to konfigurace, která je napřed před knihovnou — někdo píše `kind`,
    // který umí až příští verze. Shodit kvůli tomu build znamená, že web
    // nepojede vůbec; `modal` znamená, že povrch bude v jedné ze dvou záložek
    // a upravit ho půjde, protože popup je pro obě záložky tentýž. Zmizet ze
    // seznamu je ta horší ze dvou odpovědí: obsah by se tiše stal
    // nepřeložitelným.
    let shape = typeof kind === 'string' ? kind.trim() : ''
    if (!SURFACE_KINDS.includes(shape)) {
        console.warn(
            `[cms.config] defineSurface: povrch "${named}" má "kind": "${kind}", což neznám. ` +
                `Znám: ${SURFACE_KINDS.join(', ')}. Beru ho jako "modal".`,
        )
        shape = 'modal'
    }

    // Adresa, na které se povrch vykreslí SÁM. Nepovinná, a ten rozdíl je celý
    // rozdíl mezi dvěma způsoby, jak povrch upravit:
    //
    //   bez `preview`  Studio otevře formulář nad stránkou. Funguje vždycky
    //                  a nepotřebuje od projektu nic, ale je to formulář:
    //                  editor vidí pole, ne to, co dělá.
    //   s `preview`    Studio přepne rám na tu adresu a povrch je v něm sám,
    //                  otevřený. Klikací úpravy pak fungují úplně stejně jako
    //                  na stránce, protože je to stránka — jenom je na ní jedna
    //                  komponenta místo celé routy.
    //
    // Cestu píše projekt, ne knihovna: která komponenta povrch je, ví jenom on.
    // Předloha je `homePreview` v defineSite — tentýž nápad, jiný důvod.
    const at = typeof preview === 'string' ? preview.trim() : ''
    if (at && !at.startsWith('/')) {
        fail(`povrch "${named}" má "preview": "${preview}" — čekám cestu od kořene, tedy třeba '/studio/preview/surface/cookies'.`)
    }

    return Object.freeze({
        kind: shape,
        __cmsSurface: true,
        name: named,
        title: String(title || named),
        copy: block,
        preview: at || null,
    })
}

/**
 * Povrchy, jak je uvidí Studio — ověřené a zmrazené.
 *
 * Volá se z `defineSite`, ne z `defineSurface`: duplicitu jmen nevidí povrch
 * sám o sobě, vidí ji až seznam. Stejný důvod, proč `includes` mezi stránkami
 * kontroluje `defineSite` a ne `definePage`.
 */
export const normalizeSurfaces = (declared) => {
    const list = []
    const seen = new Set()

    for (const entry of declared || []) {
        if (!entry?.__cmsSurface) {
            fail('povrch nevznikl přes defineSurface() — ruční objekt se stejnými klíči neprojde.')
        }
        if (seen.has(entry.name)) fail(`dva povrchy se stejným "name": ${entry.name}.`)
        seen.add(entry.name)
        list.push(entry)
    }

    return Object.freeze(list)
}

/** Povrch toho jména, nebo `null`. Dvojče `pageFor` v ./define.js. */
export const surfaceFor = (site, name) =>
    (site?.surfaces || []).find((surface) => surface.name === name) || null

/** Povrchy jednoho druhu, v pořadí deklarace — to je pořadí v seznamu Studia. */
export const surfacesOfKind = (site, kind) =>
    (site?.surfaces || []).filter((surface) => surface.kind === kind)
