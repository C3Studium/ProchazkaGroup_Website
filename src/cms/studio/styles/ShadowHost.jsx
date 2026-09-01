// Stínový root pro Studio — hranice, přes kterou hostitelské CSS nedosáhne.
//
// Studio žije v dokumentu cizího webu, takže na něj platí každé jeho pravidlo
// se selektorem `*`, `body *`, `button` nebo `:where(…)`. Dorovnávat dědičné
// vlastnosti po jedné (`@mixin island`) je seznam, který nikdy nebude úplný:
// `body * { transition }` ani Tailwind preflight na `button` se do něj nevejdou.
//
// Hranice to zavře jinak a celé. Selektor z vnějšího dokumentu se přes ni
// nedostane — `body *` uvnitř nic nenajde, protože `body` je venku a potomkové
// selektory hranicí neprocházejí. Zbývají dědičné vlastnosti, a ty srazí
// `all: initial` na hostovi.
//
// ---------------------------------------------------------------------------
// Tři věci, které se nedají udělat naivně
//
// `mode: "open"`. Lenis hledá `data-lenis-prevent` přes `event.composedPath()`,
// a ta hranicí prochází — ale jen u otevřeného rootu. U zavřeného by se obrana
// proti únosu scrollu rozešla s tím, co chrání.
//
// `display: contents` na hostovi, ne `position: fixed`. Host je normální prvek
// stránky; kdyby měl vlastní box a `z-index`, dostal by se do pořadí vykreslení
// vedle kořene Studia — a dialog by skončil ZA ním. Vyzkoušeno: `elementFromPoint`
// nad mřížkou vracel `iframe`. S `display: contents` host žádný box nemá
// a vrstva uvnitř se chová, jako by byla přímo v `body`.
//
// Portál míří do PRVKU uvnitř rootu, ne do rootu samotného. Stínový root je
// `DocumentFragment`; React na kontejner portálu věší posluchače a u fragmentu
// je pověsí na `ownerDocument`, tedy až za hranicí, kde jsou události
// přeadresované na hosta. Kliknutí uvnitř pak React přiřadí hostovi a žádný
// `onClick` nezavolá — vykreslí se to a nereaguje. Vyzkoušeno taky.

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { adoptStudioCss } from "./adopt.js"
import { setStudioSurface } from "./surface.js"

/**
 * `all: initial` je celý smysl hosta: srazí dědičné vlastnosti, které hranicí
 * jinak projdou. `display: contents` ho pak vyřadí z rozvržení úplně.
 */
const HOST_CSS = `:host {
  all: initial;
  display: contents;
}`

/**
 * Vykreslí `children` do stínového rootu uvnitř `container`.
 *
 * @param {{ container: Element|null, doc?: Document, attrs?: object, children: any }} props
 */
export function ShadowHost({ container, doc, attrs = {}, children }) {
    const [mount, setMount] = useState(null)

    useEffect(() => {
        if (!container) return undefined
        const owner = container.ownerDocument
        const host = owner.createElement("div")
        host.setAttribute("data-valecms-shadow", "")
        for (const [key, value] of Object.entries(attrs)) host.setAttribute(key, value)
        const shadow = host.attachShadow({ mode: "open" })
        container.appendChild(host)

        const source = doc || owner
        const point = owner.createElement("div")
        point.setAttribute("data-valecms-mount", "")
        shadow.appendChild(point)

        const install = () => {
            const count = adoptStudioCss(shadow, HOST_CSS, source)
            if (count > 1) return true
            return false
        }
        if (!install()) {
            console.warn(
                "[cms] Do stínového rootu se nedostalo žádné pravidlo — Studio se vykreslí bez stylů. "
                    + "Nejspíš se stylopis ještě nenačetl; sleduju hlavičku a zkusím to znovu.",
            )
        }

        // Ve vývoji přibývají `<style>` postupně, jak se moduly natahují, takže
        // první čtení nemusí zastihnout všechno. Sledování je laciné a bez něj
        // by bylo první otevření po startu neostylované.
        const observer = new MutationObserver(() => install())
        observer.observe(source.head, { childList: true })

        // Ať overlay ví, kam portálovat své popupy — viz ./surface.js.
        setStudioSurface(point)
        setMount(point)
        return () => {
            observer.disconnect()
            setStudioSurface(null)
            host.remove()
            setMount(null)
        }
        // `attrs` se za života uzlu nemění; kdyby měly, patří na uzel uvnitř.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [container, doc])

    return mount ? createPortal(children, mount) : null
}
