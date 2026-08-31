// Navigace pro Pages Router.
//
// Kromě přechodů, které vyvolá samo Studio, hlídá i ty, které vyvolá prohlížeč
// nebo odkaz: Pages Router umí ohlásit `routeChangeStart` a přechod zrušit
// výjimkou. App Router to neumí, a proto je hlídání postavené na adaptéru —
// tady se jen připojí i k událostem, protože jsou po ruce a pokryjí víc.

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'

import { NavigationProvider, withGuards } from './navigation.jsx'

export const usePagesNavigation = () => {
    const router = useRouter()
    const { push, replace, guard, guards } = withGuards({
        go: (url) => router.push(url),
        replaceGo: (url) => router.replace(url),
    })

    useEffect(() => {
        const onChange = () => {
            const allowed = [...guards.current].every((fn) => fn() !== false)
            if (allowed) return
            router.events.emit('routeChangeError')
            // Pages Router ruší přechod výjimkou; jinou cestu nenabízí.
            // eslint-disable-next-line no-throw-literal
            throw 'routeChange aborted by unsaved-changes guard'
        }
        router.events.on('routeChangeStart', onChange)
        return () => router.events.off('routeChangeStart', onChange)
    }, [router, guards])

    return useMemo(
        () => ({
            query: router.query,
            path: router.asPath,
            pathname: router.pathname,
            isReady: router.isReady,
            push,
            replace,
            guard,
        }),
        [router.query, router.asPath, router.pathname, router.isReady, push, replace, guard],
    )
}

/**
 * Navigace pro cokoli ze Studia, co hostitel vykreslí mimo jeho vlastní stránku.
 *
 * Náhledové stránky si berou `PreviewHost`, a ten navigaci potřebuje jako
 * kterákoli jiná část Studia. Bez obalu spadnou na chybějícím poskytovateli —
 * hlasitě, což je správně: tiše bez navigace by přestaly fungovat přechody
 * a nikdo by nevěděl proč.
 */
export const PagesNavigation = ({ children }) => (
    <NavigationProvider value={usePagesNavigation()}>{children}</NavigationProvider>
)
