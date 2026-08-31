// Navigace Studia, nezávisle na tom, který router ji obsluhuje.
//
// Studio je jedna aplikace, ale Next má dva routery s jinými API: Pages dává
// `useRouter()` z `next/router` s `query`, `asPath` a `events`, App Router dává
// `next/navigation` s `usePathname`, `useSearchParams` a `useParams` — a žádné
// události o změně adresy nemá vůbec.
//
// Řešení není napodobit jedno druhým, ale obrátit směr: navigaci si Studio
// nebere, dostane ji. Vstupní bod (stránka Studia) ví, ve kterém routeru běží,
// protože je jeho součástí, a předá odpovídající adaptér. Deset míst ve Studiu
// pak volá jedno rozhraní a o routeru neví.
//
// ## Hlídání neuložených změn
//
// Pages Router umí ohlásit začátek přechodu a nechat ho zrušit výjimkou.
// App Router to neumí a napodobit to nejde. Ale Studio nikam neodchází samo od
// sebe — každý jeho přechod jde přes `push`/`replace` tady. Takže se ptá
// adaptér, ne router: registrované strážce spustí před přechodem a když jeden
// řekne ne, přechod se neprovede. Vyjde to nastejno a funguje to v obou.
//
// `beforeunload` zůstává na svém místě v `useUnsavedGuard`; ten pokrývá zavření
// panelu a znovunačtení, kam žádný router nevidí.

import { createContext, useContext, useMemo, useRef } from 'react'

const NavigationContext = createContext(null)

/**
 * Navigace, jak ji Studio vidí.
 *
 * @typedef {object} StudioNavigation
 * @property {Record<string, string|string[]>} query  Parametry cesty i dotazu dohromady.
 * @property {string} path      Adresa včetně dotazu — to, co Pages Router zve `asPath`.
 * @property {string} pathname  Adresa bez dotazu.
 * @property {boolean} isReady  Zda už router zná adresu (Pages hydratuje později).
 * @property {(url: string) => void} push
 * @property {(url: string) => void} replace
 * @property {(guard: () => boolean) => () => void} guard  Vrací odhlašovací funkci.
 */

export const NavigationProvider = ({ value, children }) => (
    <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
)

/** @returns {StudioNavigation} */
export const useStudioRouter = () => {
    const navigation = useContext(NavigationContext)
    if (!navigation) {
        throw new Error(
            'Studio nedostalo navigaci. Stránka Studia ji předává přes NavigationProvider — ' +
                'viz valecms/studio/page.jsx (Pages) nebo appPage.jsx (App Router).',
        )
    }
    return navigation
}

/**
 * Společná část obou adaptérů: seznam strážců a přechod, který se jich ptá.
 *
 * Strážce vrací `true`, když se smí odejít. Stačí jeden zápor a přechod se
 * neprovede — u neuložených změn je bezpečnější zůstat.
 */
export const withGuards = ({ go, replaceGo }) => {
    const guards = useRef(new Set())

    const api = useMemo(() => {
        const allowed = () => [...guards.current].every((guard) => guard() !== false)
        return {
            push: (url) => { if (allowed()) go(url) },
            replace: (url) => { if (allowed()) replaceGo(url) },
            guard: (fn) => {
                guards.current.add(fn)
                return () => guards.current.delete(fn)
            },
        }
    }, [go, replaceGo])

    // Seznam se vrací taky: Pages Router se ho ptá i u přechodů, které nevyvolalo
    // Studio, a nemá se k němu dostávat obcházením.
    return { ...api, guards }
}
