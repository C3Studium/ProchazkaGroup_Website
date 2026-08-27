import Icon from "./Icon"
import { Button } from "./controls"
import styles from "./feedback.module.scss"

/**
 * The states between "nothing" and "a full table". An admin spends more of its
 * life in these than anyone plans for, so each one says what happened and what
 * to do next rather than showing a bare spinner.
 */

export function Spinner({ size = 16, className = "" }) {
  return <span className={`${styles.spinner} ${className}`} style={{ width: size, height: size }} aria-label="Načítání" />
}

export function Badge({ tone = "neutral", children, title, dot }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} title={title}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

export function EmptyState({ icon = "inbox", title, description, action, compact }) {
  return (
    <div className={`${styles.empty} ${compact ? styles.emptyCompact : ""}`}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={compact ? 20 : 26} strokeWidth={1} />
      </span>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description ? <p className={styles.emptyText}>{description}</p> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  )
}

/**
 * Renders a CmsError by its `code`. The codes are the contract's, so the copy is
 * matched to what actually went wrong instead of a generic failure message.
 */
const ERROR_COPY = {
  unauthorized: { title: "Přihlášení vypršelo", text: "Přihlaste se prosím znovu." },
  forbidden: { title: "Nemáte oprávnění", text: "K tomuto obsahu nemáte přístup." },
  not_found: { title: "Nenalezeno", text: "Obsah byl nejspíš smazán." },
  invalid: { title: "Neplatná data", text: "Zkontrolujte prosím vyplněné údaje." },
  conflict: { title: "Konflikt verzí", text: "Někdo jiný obsah mezitím změnil. Načtěte jej znovu." },
  server: { title: "Chyba serveru", text: "Zkuste to prosím za chvíli." },
}

export function ErrorState({ error, onRetry, compact }) {
  const copy = ERROR_COPY[error?.code] || { title: "Něco se pokazilo", text: error?.message || "Neznámá chyba." }

  return (
    <div className={`${styles.empty} ${styles.error} ${compact ? styles.emptyCompact : ""}`}>
      <span className={styles.emptyIcon}>
        <Icon name="warning" size={compact ? 20 : 26} strokeWidth={1} />
      </span>
      <h3 className={styles.emptyTitle}>{copy.title}</h3>
      <p className={styles.emptyText}>{error?.code ? copy.text : copy.text}</p>
      {onRetry ? (
        <div className={styles.emptyAction}>
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            Zkusit znovu
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Row-shaped placeholders keep the list from collapsing while it loads. */
export function SkeletonRows({ count = 6, height = 56 }) {
  return (
    <div className={styles.skeletonList} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.skeletonRow} style={{ height, animationDelay: `${index * 55}ms` }}>
          <span className={styles.skeletonBlock} style={{ width: 34, height: 34, borderRadius: 3 }} />
          <span className={styles.skeletonLines}>
            <span className={styles.skeletonBlock} style={{ width: `${34 + ((index * 13) % 30)}%` }} />
            <span className={styles.skeletonBlock} style={{ width: `${52 + ((index * 17) % 26)}%`, opacity: 0.5 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 12 }) {
  return (
    <div className={styles.skeletonGrid} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.skeletonTile} style={{ animationDelay: `${index * 40}ms` }} />
      ))}
    </div>
  )
}

/** Section heading used by the overview and the stats panel. */
export function SectionHead({ title, hint, action }) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {hint ? <p className={styles.sectionHint}>{hint}</p> : null}
      </div>
      {action}
    </div>
  )
}
