import { useEffect } from "react"
import { AuthProvider, StudioProvider, useAuth } from "./context/StudioProvider.jsx"
import Shell from "./shell/Shell.jsx"
import SignIn from "./shell/SignIn.jsx"
import { Spinner } from "./ui/feedback.jsx"
import styles from "./Studio.module.scss"
import { NavigationProvider } from "../runtime/navigation.jsx"

/**
 * Studio entry point.
 *
 * Both of the Studio's dependencies are props: `core` is Contract 1, `port` is
 * Contract 2. Nothing below this component imports either one, which is what
 * lets the page mount the dev stub or the real server port without a single
 * change inside `studio/`.
 */
/**
 * @param {object} props
 * @param {object} props.core       Contract 1 — schema API.
 * @param {object} props.port       Contract 2 — data access.
 * @param {object} props.navigation Navigace, kterou dodává vstupní stránka.
 *   Studio si ji nebere samo, protože každý router má jiné API a Studio má
 *   běžet v obou — viz runtime/navigation.jsx.
 */
export default function Studio({ core, port, config, navigation }) {
  return (
    <NavigationProvider value={navigation}>
      <StudioProvider core={core} port={port} config={config}>
        <AuthProvider>
          <StudioSurface />
        </AuthProvider>
      </StudioProvider>
    </NavigationProvider>
  )
}

/**
 * The Studio takes over the viewport: a fixed layer, the document locked behind
 * it, and a `data-studio` flag on <html> for anything that needs to know.
 *
 * There is no site chrome underneath any more — `_app` asks `@/cms` which shell
 * this route wants and gives it the bare one — so nothing here is compensating
 * for a navbar or a shader. What is left is what an application that owns the
 * window has to do for itself either way.
 */
function StudioSurface() {
  const { status } = useAuth()

  useEffect(() => {
    const root = document.documentElement
    const previous = { root: root.style.overflow, body: document.body.style.overflow }

    root.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    root.dataset.studio = "true"

    // Optional by design. This build's shell mounts no Lenis on a Studio route,
    // so the call is a no-op here — it stays because the library must survive a
    // host that does drive `window` scroll, and an unguarded assumption either
    // way is the kind a second project pays for.
    window.lenis?.stop?.()

    return () => {
      root.style.overflow = previous.root
      document.body.style.overflow = previous.body
      delete root.dataset.studio
      window.lenis?.start?.()
    }
  }, [])

  return (
    <div className={styles.root} data-studio-root="">
      {status === "checking" ? (
        <div className={styles.boot}>
          <Spinner size={20} />
        </div>
      ) : status === "authenticated" ? (
        <Shell />
      ) : (
        <SignIn />
      )}
    </div>
  )
}
