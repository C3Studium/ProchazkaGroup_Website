import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Every port call in the Studio goes through here so loading and error states
 * are uniform and so a slow response can never overwrite a newer one — lists
 * re-fetch on every keystroke of the search box, and out-of-order replies were
 * the first bug this hook was written to kill.
 */
export function useAsync(task, dependencies = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(immediate) })
  const generation = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async () => {
    const ticket = (generation.current += 1)
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const data = await task()
      if (ticket !== generation.current || !mounted.current) return null
      setState({ data, error: null, loading: false })
      return data
    } catch (error) {
      if (ticket !== generation.current || !mounted.current) return null
      setState({ data: null, error, loading: false })
      return null
    }
    // `task` is intentionally not a dependency — callers pass an inline closure
    // and the explicit dependency list is what decides when to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  useEffect(() => {
    if (immediate) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate])

  const setData = useCallback((updater) => {
    setState((current) => ({
      ...current,
      data: typeof updater === "function" ? updater(current.data) : updater,
    }))
  }, [])

  return { ...state, reload: run, setData }
}

/** Trailing-edge debounce for search inputs. */
export function useDebounced(value, delay = 260) {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
