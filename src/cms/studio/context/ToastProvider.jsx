import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import styles from "./ToastProvider.module.scss"

/**
 * Studio-local toasts.
 *
 * The site already mounts sonner in `_app`, but the Studio renders as a fixed
 * overlay above it — a sonner toast would land underneath the admin. This stack
 * lives inside the Studio root instead, and carries an `undo` action because the
 * moderation queue's whole speed argument rests on mistakes being cheap.
 */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (toast) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const entry = { id, tone: "neutral", ...toast }
      setToasts((current) => [...current.slice(-3), entry])

      // An undoable toast stays long enough to actually be undone.
      const life = entry.duration ?? (entry.action ? 7000 : 3600)
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), life),
      )
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, extra) => push({ tone: "positive", title, ...extra }),
      error: (title, extra) => push({ tone: "danger", title, ...extra }),
      info: (title, extra) => push({ tone: "neutral", title, ...extra }),
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone] || ""}`}>
            <div className={styles.body}>
              <span className={styles.title}>{toast.title}</span>
              {toast.description ? <span className={styles.description}>{toast.description}</span> : null}
            </div>
            {toast.action ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  toast.action.onClick()
                  dismiss(toast.id)
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button type="button" className={styles.close} onClick={() => dismiss(toast.id)} aria-label="Zavřít">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside <ToastProvider>")
  return context
}
