import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useAuth, usePort, useRevision, useStudio, useTypes } from "../context/StudioProvider"
import { useAsync } from "../hooks/useAsync"
import { hrefs, isActive, parseRoute, previewFrom } from "../lib/routes"
import { PENDING, QUEUE_FILTERS } from "../lib/moderation"
import { initials } from "../lib/format"
import Icon from "../ui/Icon"
import { IconButton } from "../ui/controls"
import PasswordDialog from "./PasswordDialog"
import { usePersistedFlag } from "./persist"
import styles from "./Sidebar.module.scss"

const COLLAPSED_KEY = "cms.studio.sidebar.collapsed"

/**
 * Navigation. The content section is generated from `listTypes()` — adding a
 * schema puts it in the sidebar with no change here, which is the whole point of
 * config-driven types.
 *
 * Moderation sits above the content list rather than inside it because it is not
 * a content type to the client, it is the job they open this tool to do.
 *
 * Collapsing keeps every row and only drops the words. An admin's navigation is
 * learned by position within a week, and once it is, the labels are costing 180px
 * of the screen the person is actually working on — but a rail that hid its items
 * would make the editor open it to find out where they are, which is worse than
 * never collapsing at all. Below 900px the same rail is forced by the stylesheet,
 * because at that width the choice is not really available.
 */
export default function Sidebar() {
  const router = useRouter()
  const types = useTypes()
  const port = usePort()
  const { config } = useStudio()
  const { revision } = useRevision()
  const { user, isOwner, signOut } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)
  const [collapsed, setCollapsed] = usePersistedFlag(COLLAPSED_KEY, false)

  // The queue badge is the one number the client wants without navigating.
  const { data: pending } = useAsync(
    () => port.list({ type: "review", perPage: 1, filters: QUEUE_FILTERS[PENDING] }),
    [port, revision],
  )

  const pendingCount = pending?.total || 0

  // Opening the preview from an editor should come back to that editor, so the
  // route the shell is already parsing is the source of "which document" — the
  // views stay unaware that a preview exists.
  const route = parseRoute(router.query.path)
  const from = route.view === "editor" ? previewFrom(route.type, route.id) : null

  return (
    <nav
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      aria-label="Hlavní navigace"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className={styles.head}>
        <Link href={hrefs.overview()} className={styles.brand} title={config.title}>
          <span className={styles.mark}>
            <Icon name="layers" size={15} />
          </span>
          <span className={styles.brandText}>{config.title}</span>
        </Link>
        {/* A real button in the document's tab order, not a hover affordance on
            the rail's edge: the collapsed state has to be reachable and
            reversible from the keyboard, and `aria-expanded` is what says which
            way it will go. */}
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Rozbalit navigaci" : "Sbalit navigaci"}
          title={collapsed ? "Rozbalit navigaci" : "Sbalit navigaci"}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14} />
        </button>
      </div>

      <div className={styles.scroll}>
        <ul className={styles.group}>
          <NavItem href={hrefs.overview()} icon="grid" label="Přehled" asPath={router.asPath} />
          <NavItem
            href={hrefs.moderation()}
            icon="inbox"
            label="Schvalování recenzí"
            asPath={router.asPath}
            count={pendingCount}
            emphasis={pendingCount > 0}
          />
          {/* Directly under moderation and above "Obsah", by the same argument
              moderation already won: this is not a content type, it is a job the
              client opens the tool to do. `monitor` rather than `eye` — the eye
              is looking at the site (Náhled webu, under Nástroje) and this is
              working on it. */}
          <NavItem
            href={hrefs.edit()}
            icon="monitor"
            label="Upravit kontent"
            asPath={router.asPath}
          />
        </ul>

        <div className={styles.groupLabel}>Obsah</div>
        <ul className={styles.group}>
          {types.map((type) => (
            <NavItem
              key={type.name}
              href={hrefs.list(type.name)}
              icon={type.icon || "document"}
              label={type.title || type.name}
              asPath={router.asPath}
            />
          ))}
          {types.length === 0 ? <li className={styles.hint}>Žádné typy obsahu</li> : null}
        </ul>

        <div className={styles.groupLabel}>Nástroje</div>
        <ul className={styles.group}>
          {/* An <a>, not a <Link>: the target is an API route that sets the
              draft cookie and redirects, and a client-side transition would
              never reach it. `external` rather than `eye` as the icon because it
              genuinely leaves the workspace. */}
          <li>
            <a
              className={styles.item}
              href={hrefs.preview({ mode: "draft", from })}
              title="Náhled úvodní stránky"
              aria-label="Náhled úvodní stránky"
            >
              <Icon name="eye" size={15} className={styles.itemIcon} />
              <span className={styles.itemLabel}>Náhled webu</span>
            </a>
          </li>
          <NavItem href={hrefs.media()} icon="image" label="Knihovna médií" asPath={router.asPath} />
          <NavItem href={hrefs.stats()} icon="chart" label="Statistiky" asPath={router.asPath} />
          {/* Owners only. Hiding it is a courtesy — /studio/users renders an
              explanation for an editor who types the URL, and the server
              refuses the calls behind it either way. */}
          {isOwner ? <NavItem href={hrefs.users()} icon="users" label="Uživatelé" asPath={router.asPath} /> : null}
        </ul>
      </div>

      <div className={styles.footer}>
        <div className={styles.user}>
          <span className={styles.avatar}>{initials(user?.name || user?.email)}</span>
          <span className={styles.userText}>
            <span className={styles.userName}>{user?.name || "Redaktor"}</span>
            <span className={styles.userMail}>{user?.email}</span>
          </span>
          <IconButton icon="lock" label="Změnit heslo" onClick={() => setChangingPassword(true)} />
          <IconButton icon="logout" label="Odhlásit se" onClick={signOut} />
        </div>
        <a className={styles.siteLink} href="/" target="_blank" rel="noreferrer">
          <Icon name="external" size={12} />
          Zobrazit web
        </a>
      </div>

      <PasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />
    </nav>
  )
}

/**
 * `title` and `aria-label` are unconditional rather than applied only while
 * collapsed. The rail also collapses from a media query, which JavaScript here
 * cannot see, and a row whose only accessible name is a `display: none` span is
 * a row with no accessible name at all. Both values repeat the visible text, so
 * they cost nothing in the expanded state.
 */
function NavItem({ href, icon, label, asPath, count, emphasis }) {
  const active = isActive(href, asPath)

  return (
    <li>
      <Link
        href={href}
        className={`${styles.item} ${active ? styles.active : ""}`}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        title={label}
      >
        <Icon name={icon} size={15} className={styles.itemIcon} />
        <span className={styles.itemLabel}>{label}</span>
        {count ? <span className={`${styles.count} ${emphasis ? styles.countHot : ""}`}>{count}</span> : null}
      </Link>
    </li>
  )
}
