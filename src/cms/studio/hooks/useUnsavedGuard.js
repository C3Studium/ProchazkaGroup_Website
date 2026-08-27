import { useEffect, useRef } from "react"
import { useRouter } from "next/router"

/**
 * Guards unsaved editor state on both exits an editor can take: closing the tab
 * and navigating inside the Studio.
 *
 * The in-app half aborts the Next route change with a thrown error, which is the
 * documented way to cancel `routeChangeStart` in the Pages Router. The throw is
 * swallowed here rather than surfaced — Next logs an unhandled rejection
 * otherwise and it would read as a crash in the console during normal use.
 */
export function useUnsavedGuard(isDirty, message = "Máte neuložené změny. Opravdu chcete odejít?") {
  const router = useRouter()
  const dirty = useRef(isDirty)
  dirty.current = isDirty

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!dirty.current) return
      event.preventDefault()
      event.returnValue = message
      return message
    }

    const onRouteChange = (url) => {
      if (!dirty.current) return
      if (window.confirm(message)) {
        dirty.current = false
        return
      }
      router.events.emit("routeChangeError")
      // eslint-disable-next-line no-throw-literal
      throw "routeChange aborted by unsaved-changes guard"
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    router.events.on("routeChangeStart", onRouteChange)

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      router.events.off("routeChangeStart", onRouteChange)
    }
  }, [router, message])
}
