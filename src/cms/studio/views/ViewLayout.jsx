import Link from "next/link"
import Icon from "../ui/Icon"
import styles from "./ViewLayout.module.scss"

/**
 * Every screen is header / toolbar / scrolling body. Sharing the frame keeps the
 * scroll boundary in one place — each view scrolls its own body while the header
 * and toolbar stay put, which is what makes a long list usable.
 */

export function ViewHeader({ title, subtitle, breadcrumb, actions, meta }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        {breadcrumb ? (
          <nav className={styles.breadcrumb}>
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.href || crumb.label} className={styles.crumb}>
                {index > 0 ? <Icon name="chevronRight" size={11} className={styles.crumbChevron} /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className={styles.crumbLink}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={styles.crumbCurrent}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {meta}
        </div>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}

export function ViewToolbar({ children, className = "" }) {
  return <div className={`${styles.toolbar} ${className}`}>{children}</div>
}

export function ViewBody({ children, padded, className = "" }) {
  return <div className={`${styles.body} ${padded ? styles.padded : ""} ${className}`}>{children}</div>
}

export function Spacer() {
  return <span className={styles.spacer} />
}

/** Right-aligned count that stays legible next to a search box. */
export function ResultCount({ children }) {
  return <span className={styles.resultCount}>{children}</span>
}
