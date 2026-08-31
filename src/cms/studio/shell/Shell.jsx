import { useStudioRouter } from "../../runtime/navigation.jsx"
import { useAuth, useCore } from "../context/StudioProvider.jsx"
import { BASE, parseRoute } from "../lib/routes.js"
import DocumentListView from "../views/DocumentListView.jsx"
import DocumentEditorView from "../views/DocumentEditorView.jsx"
import EditView from "../views/EditView.jsx"
import MediaView from "../views/MediaView.jsx"
import ArchiveView from "../views/ArchiveView.jsx"
import ModerationView from "../views/ModerationView.jsx"
import OverviewView from "../views/OverviewView.jsx"
import SettingsView from "../views/SettingsView.jsx"
import StatsView from "../views/StatsView.jsx"
import UsersView from "../views/UsersView.jsx"
import { EmptyState } from "../ui/feedback.jsx"
import { Button } from "../ui/controls.jsx"
import Sidebar from "./Sidebar.jsx"
import styles from "./Shell.module.scss"

/**
 * Workspace routing. Every screen is one catch-all page, so the "router" is a
 * pure parse of the path segments plus this switch. The alternative — a real
 * route per screen — would multiply files under `src/pages` for no gain, since
 * none of them are separately linkable from the public site.
 */
export default function Shell() {
  const router = useStudioRouter()
  const core = useCore()
  const { isAdmin } = useAuth()
  const route = parseRoute(router.query.path)

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.workspace}>
        <Workspace route={route} core={core} isAdmin={isAdmin} />
      </main>
    </div>
  )
}

function Workspace({ route, core, isAdmin }) {
  if (route.view === "overview") return <OverviewView />
  if (route.view === "moderation") return <ModerationView />
  if (route.view === "edit") return <EditView />
  if (route.view === "media") return <MediaView />
  if (route.view === "stats") return <StatsView />

  // Both owner-only screens. An editor who types either URL gets an explanation
  // rather than a blank screen or a stack of 403 toasts. The server refuses the
  // calls regardless; this only decides which of the two answers the person
  // reads.
  if (route.view === "users") {
    if (!isAdmin) return <OwnerOnly what="Správa uživatelů" />
    return <UsersView />
  }

  if (route.view === "settings") {
    if (!isAdmin) return <OwnerOnly what="Nastavení" />
    return <SettingsView />
  }

  // The third owner-only screen, and the one with the strongest reason to be
  // one: the archive holds everything that was ever published, including what
  // somebody later took down (ARCHIVE.md, "Kdo tam smí"). The endpoint behind it
  // calls requireOwner() on every request; this only decides which answer an
  // editor who typed the URL reads.
  if (route.view === "archive") {
    if (!isAdmin) return <OwnerOnly what="Archiv" />
    return <ArchiveView section={route.section} />
  }

  // A bad type in the URL is a typo or a renamed schema, not a crash.
  const type = core.getType(route.type)
  if (!type) {
    return (
      <EmptyState
        icon="warning"
        title="Tento typ obsahu neexistuje"
        description={`V konfiguraci není žádný typ „${route.type}". Nejspíš byl přejmenován nebo odstraněn.`}
        action={
          <Button href={BASE} variant="secondary" icon="arrowLeft">
            Zpět na přehled
          </Button>
        }
      />
    )
  }

  if (route.view === "editor") {
    // `key` forces a fresh editor per document — without it, switching documents
    // would carry the previous one's dirty buffer into the new form.
    return <DocumentEditorView key={`${route.type}:${route.id}`} type={type} id={route.id} isNew={route.isNew} />
  }

  return <DocumentListView key={route.type} type={type} />
}

function OwnerOnly({ what }) {
  return (
    <EmptyState
      icon="lock"
      title={`${what} je jen pro vlastníky`}
      description="Váš účet má roli redaktora. O změnu požádejte někoho, kdo je v systému veden jako vlastník."
      action={
        <Button href={BASE} variant="secondary" icon="arrowLeft">
          Zpět na přehled
        </Button>
      }
    />
  )
}
