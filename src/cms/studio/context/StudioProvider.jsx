import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { normalizeCore } from "../lib/core"
import { RESERVED } from "../lib/routes"
import { ToastProvider } from "./ToastProvider"

/**
 * The Studio's only two dependencies — the schema core (Contract 1) and the data
 * port (Contract 2) — arrive here as props and are read everywhere else through
 * hooks. Nothing under `studio/` imports a database client, a Supabase client or
 * the core module directly, which is what lets the dev stub and the real server
 * port be swapped at the page without touching a single component.
 */

const StudioContext = createContext(null)

export function StudioProvider({ core, port, config, children }) {
  // A monotonic signal every mutation bumps. Views that must not go stale — the
  // sidebar's pending-review count, an open list behind an editor — depend on it
  // and re-fetch. Cheaper than a cache layer and there is no correctness cliff:
  // the worst case is one redundant request.
  const [revision, setRevision] = useState(0)
  const bump = useCallback(() => setRevision((current) => current + 1), [])

  const value = useMemo(() => {
    const normalized = normalizeCore(core)
    const types = normalized.listTypes()

    // A type whose name collides with a shell route would be unreachable. Fail
    // loudly in development rather than 404 for the client months later.
    const shadowed = types.filter((type) => RESERVED.includes(type.name))
    if (shadowed.length && process.env.NODE_ENV !== "production") {
      console.warn(
        `[studio] Content type(s) ${shadowed.map((type) => `"${type.name}"`).join(", ")} shadow a reserved Studio route ` +
          `(${RESERVED.join(", ")}) and cannot be opened. Rename the type.`,
      )
    }

    return { core: normalized, port, types, revision, bump, config: { title: "Studio", ...config } }
  }, [core, port, config, revision, bump])

  return (
    <StudioContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </StudioContext.Provider>
  )
}

export function useStudio() {
  const context = useContext(StudioContext)
  if (!context) throw new Error("useStudio must be used inside <StudioProvider>")
  return context
}

export const usePort = () => useStudio().port
export const useCore = () => useStudio().core
export const useTypes = () => useStudio().types
export const useType = (name) => useCore().getType(name)

/** `revision` belongs in a fetch's dependency list; `bump` is called after writes. */
export function useRevision() {
  const { revision, bump } = useStudio()
  return { revision, bump }
}

/* ------------------------------------------------------------------ auth -- */

const AuthContext = createContext(null)

/**
 * Session state for the sign-in gate. `status` is explicit rather than derived
 * from `user == null` so the gate can hold its ground during the first check
 * instead of flashing the sign-in form at an already-authenticated editor.
 *
 * `user.role` decides what the Studio offers, never what it permits: the server
 * re-checks every owner-only call and answers 403 regardless of what this
 * object says. Hiding a control the server would refuse is a courtesy to the
 * person, not a boundary.
 */
export function AuthProvider({ children }) {
  const port = usePort()
  const [state, setState] = useState({ status: "checking", user: null })

  const refresh = useCallback(async () => {
    try {
      const user = await port.auth.user()
      setState({ status: user ? "authenticated" : "anonymous", user })
      return user
    } catch {
      setState({ status: "anonymous", user: null })
      return null
    }
  }, [port])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(
    () => ({
      ...state,
      isOwner: state.user?.role === "owner",
      refresh,
      // The server answers a successful sign-in with the user, so the gate can
      // hand over immediately rather than making a second round trip to find
      // out what it already knows.
      signIn: async (email, password) => {
        const user = await port.auth.signIn(email, password)
        if (user) setState({ status: "authenticated", user })
        else await refresh()
      },
      signOut: async () => {
        await port.auth.signOut()
        setState({ status: "anonymous", user: null })
      },
      // A password change re-issues the session cookie server-side; refreshing
      // keeps this object honest about who the new session belongs to.
      changePassword: async (patch) => {
        await port.auth.changePassword(patch)
        await refresh()
      },
    }),
    [state, port, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>")
  return context
}
