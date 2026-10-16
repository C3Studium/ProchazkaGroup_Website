import { useCallback, useEffect, useState } from "react"

/**
 * A boolean the Studio remembers between sessions.
 *
 * Two of them exist — is the sidebar collapsed, is the preview panel open — and
 * both are the same kind of thing: a choice about the shape of the workspace
 * that a person makes once and expects to still be true tomorrow. Neither is
 * content, so neither belongs on the data port; localStorage is the right depth.
 *
 * `usePersistedJson` below is the same idea for a value that is not a boolean.
 *
 * The initial value is deliberately NOT read during render. The Studio itself is
 * client-only and could get away with it, but the preview panel mounts on a
 * server-rendered page, and a `useState(() => localStorage.getItem(...))` there
 * is the classic hydration mismatch: the server renders the fallback, the client
 * renders the stored value, React throws away the markup and logs an error. So
 * the stored value arrives in an effect instead, and `ready` is how a caller
 * knows the difference between "closed because that is the default" and "closed
 * because that is what you chose" — which matters only for one thing, suppressing
 * the slide-in animation on the frame where the two disagree.
 *
 * @returns {[boolean, (next: boolean | ((prev: boolean) => boolean)) => void, boolean]}
 */
export function usePersistedFlag(key, fallback = false) {
  const [value, setValue] = useState(fallback)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored === "1" || stored === "0") setValue(stored === "1")
    } catch {
      // Private mode, quota, a locked-down browser — the workspace still works,
      // it just forgets. Not worth a message.
    }
    setReady(true)
  }, [key])

  const update = useCallback(
    (next) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? next(current) : Boolean(next)
        try {
          window.localStorage.setItem(key, resolved ? "1" : "0")
        } catch {
          /* see above */
        }
        return resolved
      })
    },
    [key],
  )

  return [value, update, ready]
}

/**
 * An object the Studio remembers between sessions.
 *
 * One of them exists: the preview's device, its rotation and its zoom. It is the
 * same kind of thing as the flags above — the shape of the workspace, chosen once
 * — but it is three values that only make sense together, and three separate keys
 * would let a browser restore two of them and drop the third.
 *
 * The stored object is merged into the fallback rather than replacing it, so a
 * key added here later reads its default on a browser that saved the old shape,
 * instead of arriving as `undefined` and being asked for `.w`.
 *
 * Deferred to an effect for the same reason as `usePersistedFlag`: this mounts on
 * a server-rendered page, and reading localStorage during render is a hydration
 * mismatch. `ready` is how a caller tells "the default" from "your choice", which
 * matters here because the first paint should not be a laptop-sized frame that
 * jumps to a phone one tick later.
 *
 * @returns {[object, (patch: object) => void, boolean]}
 */
export function usePersistedJson(key, fallback) {
  const [value, setValue] = useState(fallback)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      const parsed = stored ? JSON.parse(stored) : null
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setValue((current) => ({ ...current, ...parsed }))
      }
    } catch {
      // Unparseable, unavailable, or a shape from an older build. The workspace
      // opens on its defaults, which is a worse day than remembering and a much
      // better one than a crash inside a preview.
    }
    setReady(true)
  }, [key])

  const update = useCallback(
    (patch) => {
      setValue((current) => {
        const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) }
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* see above */
        }
        return next
      })
    },
    [key],
  )

  return [value, update, ready]
}
