// Obal `_app` — celé zapojení Studia v jednom řádku.
//
// Dřív to byly čtyři kusy k vložení DOVNITŘ cizí funkce: dva importy, hook,
// větev s `usesStudioChrome` a odznak vedle `<Component />`. Vložit je
// strojově do libovolného `_app` bezpečně nejde — a nechat to na člověku
// znamenalo opisovat je při každé instalaci.
//
// Obalení tenhle problém nemá. Cizí funkce se nemusí rozumět: stačí ji přestat
// exportovat a předat sem.
//
//     function App({ Component, pageProps }) { …tvoje… }
//     export default withStudio(App)
//
// Studio si přitom bere obrazovku CELÉ — nevykresluje se skrz `App`, protože
// hostitelský layout (navigace, patička, plynulý scroll) na editační ploše
// nemá co dělat a pral by se s ní.

import { useRouter } from 'next/router'

import { StudioShell, usesStudioChrome } from './shell.jsx'
import { useEditArming } from './edit/arm.js'
import ManageBadge from './manage/index.jsx'
import StudioMotionGuard from './preview/studioGuard.jsx'

/**
 * @param {Function} App                    tvůj původní `_app`
 * @param {object}     [options]
 * @param {Function[]} [options.chrome]      komponenty vedle stránky — preloader,
 *                                           přechody, upozornění; pořadí platí
 * @param {Function[]} [options.providers]   poskytovatelé stavu, zvenčí dovnitř:
 *                                           první v seznamu obaluje všechny
 *                                           ostatní. Pořadí je podstatné —
 *                                           poskytovatel čtený jiným musí být
 *                                           venku.
 * @param {Function}   [options.provider]    jediný poskytovatel; zkratka
 */
export function withStudio(App, options = {}) {
    const { chrome = [], providers = [], provider = null } = options
    // `provider` jako jediný je zkratka pro `providers: [x]`.
    const wrappers = provider ? [provider, ...providers] : providers

    return function ValeCmsApp(props) {
        const router = useRouter()
        useEditArming()

        // Studio má vlastní chrome a vlastní stránku. Hostitelský `App` se
        // proto přeskočí úplně.
        if (usesStudioChrome(props.Component, router.pathname)) {
            const Page = props.Component
            return (
                <StudioShell>
                    <Page {...props.pageProps} />
                </StudioShell>
            )
        }

        const inner = (
            <>
                {/* Zháší preloader a přechody, když se dokument edituje ve
                    Studiu — jinak by opona zakryla to, co se upravuje. */}
                <StudioMotionGuard />
                {chrome.map((Item, i) => <Item key={i} />)}
                <App {...props} />
                <ManageBadge />
            </>
        )

        // Zanořuje se odzadu: poslední poskytovatel obalí obsah nejtěsněji,
        // první v seznamu skončí úplně venku. Kdo čte jiného, musí být venku —
        // proto pořadí, ne množina.
        return wrappers.reduceRight((node, Wrap) => <Wrap>{node}</Wrap>, inner)
    }
}

export default withStudio
