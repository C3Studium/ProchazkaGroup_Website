// Kdo umí přečíst zdroj daného typu — SERVER ONLY.
//
// `cms.config.js` u stránky říká `sources: { reviews: { type: 'review', limit: 12 } }`.
// Tenhle soubor je to druhé místo: co znamená `type: 'review'`.
//
// Dřív to byla tabulka čtyř funkcí přímo v `page.js` — `partner`, `review`,
// `consultant`, `assistant`. To jsou typy dokumentů jednoho webu, a knihovna
// je tím vnucovala každému dalšímu: buď se jmenuješ stejně, nebo ti obecný
// čtenář stránek k ničemu není.
//
// Teď je tabulka prázdná a naplní si ji projekt. Registrace je záměrně
// běhová a ne v konfiguraci: `valecms.config.js` čte i prohlížeč, kdežto
// čtenáři sahají do databáze. Kdyby byli v konfiguraci, přitáhli by server
// do klientského balíku.
//
// Zaregistruje se to jednou, ze serverového modulu webu — tam, kde ti
// čtenáři bydlí. Neregistrovaný typ znamená prázdný seznam a jedno varování,
// ne pád: stránka se vykreslí s obsahem, se kterým přišly komponenty.

const READERS = new Map()

/**
 * Přiřadí typům dokumentů čtenáře.
 *
 * Volá se jednou, při načtení serverového modulu webu, než kterákoli stránka
 * zavolá `getPageContent`. Opakované volání dřívější zápis přepíše — dev server
 * modul přehraje a nemá kvůli tomu spadnout.
 *
 * Čtenář dostane `(options, read)`: `options` je zbytek zápisu ze `sources`
 * (všechno kromě `type`), `read` je čtečka, kterou má použít. `read` se předává
 * a nevybírá uvnitř, protože je to ten jediný přepínač, který překlápí náhled
 * Studia — koncept i okamžik v archivu mění jen ji a tvarování běží nezměněné.
 *
 * @param {Record<string, (options: object, read: Function) => Promise<unknown>>} readers
 */
export const registerSources = (readers) => {
    for (const [type, reader] of Object.entries(readers || {})) {
        if (typeof reader !== 'function') {
            throw new TypeError(`registerSources: čtenář typu "${type}" není funkce.`)
        }
        READERS.set(type, reader)
    }
}

/** Čtenář pro typ, nebo `null`. */
export const sourceReader = (type) => READERS.get(type) || null

/** Typy, které mají čtenáře — pro hlášení a testy. */
export const registeredSources = () => [...READERS.keys()]
