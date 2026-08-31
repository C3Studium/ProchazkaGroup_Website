import { useEffect, useRef } from "react"

import { useStudioRouter } from "../../runtime/navigation.jsx"

/**
 * Hlídá neuložené změny na obou cestách, kterými se dá z editoru odejít:
 * zavřením panelu a přechodem uvnitř Studia.
 *
 * ## Proč se to neptá routeru
 *
 * Pages Router umí přechod ohlásit a nechat ho zrušit vyhozením výjimky.
 * App Router žádnou takovou událost nemá a napodobit ji nejde. Kdyby tenhle
 * háček stál na událostech, fungoval by v jednom routeru a v druhém by mlčky
 * nedělal nic — a strážce, který mlčky nedělá nic, je horší než žádný, protože
 * se na něj spoléhá.
 *
 * Ptá se proto navigace, ne routeru. Každý přechod Studia jde přes `push` nebo
 * `replace` v adaptéru, takže registrovaný strážce dostane slovo v obou. Pages
 * Router se navíc ptá i u přechodů, které Studio nevyvolalo — to je navíc, ne
 * základ.
 *
 * `beforeunload` zůstává: zavření panelu ani znovunačtení není přechod a žádný
 * router o něm neví.
 */
export function useUnsavedGuard(isDirty, message = "Máte neuložené změny. Opravdu chcete odejít?") {
  const navigation = useStudioRouter()
  const dirty = useRef(isDirty)
  dirty.current = isDirty

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!dirty.current) return
      event.preventDefault()
      event.returnValue = message
      return message
    }

    /** `false` znamená „neodcházej". Potvrzení počítá za vyřízené. */
    const guard = () => {
      if (!dirty.current) return true
      if (window.confirm(message)) {
        dirty.current = false
        return true
      }
      return false
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    const release = navigation.guard(guard)

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      release()
    }
  }, [navigation, message])
}
