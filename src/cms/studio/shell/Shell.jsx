import { useRouter } from "next/router"
import { useAuth, useCore } from "../context/StudioProvider"
import { BASE, parseRoute } from "../lib/routes"
import DocumentListView from "../views/DocumentListView"
import DocumentEditorView from "../views/DocumentEditorView"
import EditView from "../views/EditView"
import MediaView from "../views/MediaView"
import ModerationView from "../views/ModerationView"
import OverviewView from "../views/OverviewView"
import StatsView from "../views/StatsView"
import UsersView from "../views/UsersView"
import { EmptyState } from "../ui/feedback"
import { Button } from "../ui/controls"
import Sidebar from "./Sidebar"
import styles from "./Shell.module.scss"

/**
 * Workspace routing. Every screen is one catch-all page, so the "router" is a
 * pure parse of the path segments plus this switch. The alternative — a real
 * route per screen — would multiply files under `src/pages` for no gain, since
 * none of them are separately linkable from the public site.
 */
export default function Shell() {
  const router = useRouter()
  const core = useCore()
  const { isOwner } = useAuth()
  const route = parseRoute(router.query.path)

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.workspace}>
        <Workspace route={route} core={core} isOwner={isOwner} />
      </main>
    </div>
  )
}

function Workspace({ route, core, isOwner }) {
  if (route.view === "overview") return <OverviewView />
  if (route.view === "moderation") return <ModerationView />
  if (route.view === "edit") return <EditView />
  if (route.view === "media") return <MediaView />
  if (route.view === "stats") return <StatsView />

  if (route.view === "users") {
    // An editor who types the URL gets an explanation rather than a blank
    // screen or a stack of 403 toasts. The server refuses the calls regardless;
    // this only decides which of the two answers the person reads.
    if (!isOwner) {
      return (
        <EmptyState
          icon="lock"
          title="Správa uživatelů je jen pro vlastníky"
          description="Váš účet má roli redaktora. O změnu požádejte někoho, kdo je v systému veden jako vlastník."
          action={
            <Button href={BASE} variant="secondary" icon="arrowLeft">
              Zpět na přehled
            </Button>
          }
        />
      )
    }
    return <UsersView />
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
