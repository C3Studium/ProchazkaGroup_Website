// Navigace pro App Router.
//
// Adresa je tu rozdělená do tří háčků — `useParams` pro segmenty cesty,
// `useSearchParams` pro dotaz, `usePathname` pro adresu — kdežto Pages Router
// je slévá do jednoho `query`. Studio je psané proti tomu slitému tvaru, takže
// se slévají tady, na jednom místě, a ne v deseti pohledech.
//
// `isReady` je vždy `true`: App Router adresu zná od prvního renderu, takže
// stav „router ještě neví" nemá čím vzniknout. Pages Router ho má kvůli
// hydrataci statické stránky.

import { useMemo } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import { withGuards } from './navigation.jsx'

export const useAppNavigation = () => {
    const router = useRouter()
    const params = useParams()
    const pathname = usePathname()
    const search = useSearchParams()

    const { push, replace, guard } = withGuards({
        go: (url) => router.push(url),
        replaceGo: (url) => router.replace(url),
    })

    const searchString = search?.toString() ?? ''

    return useMemo(() => {
        // Segmenty cesty mají přednost před dotazem: `[[...path]]` je adresa,
        // ne parametr, a kdyby se někdo trefil do stejného jména, vyhrává adresa.
        const query = { ...Object.fromEntries(new URLSearchParams(searchString)), ...(params || {}) }
        return {
            query,
            path: searchString ? `${pathname}?${searchString}` : pathname,
            pathname,
            isReady: true,
            push,
            replace,
            guard,
        }
    }, [params, pathname, searchString, push, replace, guard])
}
