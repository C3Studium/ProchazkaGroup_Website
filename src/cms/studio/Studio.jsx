import { useEffect } from "react"
import { AuthProvider, StudioProvider, useAuth } from "./context/StudioProvider"
import Shell from "./shell/Shell"
import SignIn from "./shell/SignIn"
import { Spinner } from "./ui/feedback"
import styles from "./Studio.module.scss"

/**
 * Studio entry point.
 *
 * Both of the Studio's dependencies are props: `core` is Contract 1, `port` is
 * Contract 2. Nothing below this component imports either one, which is what
 * lets the page mount the dev stub or the real server port without a single
 * change inside `studio/`.
 */
export default function Studio({ core, port, config }) {
  return (
    <StudioProvider core={core} port={port} config={config}>
      <AuthProvider>
        <StudioSurface />
      </AuthProvider>
    </StudioProvider>
  )
}

/**
 * The admin mounts inside the public site's `_app`, which wraps every page in a
 * marketing navbar, a WebGL background and a Lenis smooth-scroll controller.
 * `_app.js` is out of this build's scope and must not be edited, so the Studio
 * takes over the viewport instead: a fixed opaque layer, Lenis paused for as
 * long as it is mounted, and a `data-studio` flag on <html> that the stylesheet
 * uses to switch off the site chrome underneath.
 */
function StudioSurface() {
  const { status } = useAuth()

  useEffect(() => {
    const root = document.documentElement
    const previous = { root: root.style.overflow, body: document.body.style.overflow }

    // Scroll locking is done here rather than in the stylesheet: the CSS half of
    // this takes the site chrome out of the flow via `:has()`, and the page
    // behind the overlay must stay locked even where that is unsupported.
    root.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    root.dataset.studio = "true"

    // Lenis drives scroll on `window`; leaving it running fights every scroll
    // container in the admin and leaves the body scrolled behind the overlay.
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
