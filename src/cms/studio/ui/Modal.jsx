import { useEffect, useRef } from "react"
import { IconButton, Button } from "./controls"
import styles from "./Modal.module.scss"

/**
 * Deliberately not portalled to `document.body`. The Studio renders as a fixed
 * overlay above the public site's chrome and all its design tokens are declared
 * on the Studio root — a modal outside that subtree would inherit the marketing
 * site's styling instead.
 */
export function Modal({ open, onClose, title, description, size = "md", children, footer }) {
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose?.()
      }
    }
    window.addEventListener("keydown", onKeyDown)

    // Move focus in so Escape and Tab land inside the dialog immediately.
    const focusable = panel.current?.querySelector("input, textarea, button, select, [tabindex]")
    focusable?.focus()

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.scrim} onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div ref={panel} className={`${styles.panel} ${styles[size]}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.head}>
          <div className={styles.headText}>
            <h2 className={styles.title}>{title}</h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <IconButton icon="close" label="Zavřít" onClick={onClose} />
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>
  )
}

/**
 * Destructive confirmations. Every irreversible action in the Studio routes
 * through this so none of them can quietly ship as a bare `window.confirm`.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Potvrdit", tone = "danger", busy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Zrušit
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className={styles.confirmText}>{description}</p>
    </Modal>
  )
}
