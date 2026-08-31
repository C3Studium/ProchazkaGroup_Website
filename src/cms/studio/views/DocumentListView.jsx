import { useState } from "react"
import { useStudioRouter } from "../../runtime/navigation.jsx"
import { usePort, useRevision, useAuth } from "../context/StudioProvider.jsx"
import { useAsync, useDebounced } from "../hooks/useAsync.js"
import { useToast } from "../context/ToastProvider.jsx"
import { hrefs } from "../lib/routes.js"
import { STATE_LABELS, mediaUrl, previewOf, restoreOutcome, stateOf } from "../lib/documents.js"
import { formatRelative, plural, truncate } from "../lib/format.js"
import { Button, IconButton, SearchInput, Segmented, Select } from "../ui/controls.jsx"
import { Badge, EmptyState, ErrorState, SkeletonRows } from "../ui/feedback.jsx"
import { ConfirmDialog } from "../ui/Modal.jsx"
import Icon from "../ui/Icon.jsx"
import { ResultCount, Spacer, ViewBody, ViewHeader, ViewToolbar } from "./ViewLayout.jsx"
import styles from "./DocumentListView.module.scss"

const PER_PAGE = 25

// The filter names the state, so it takes the state's name. It used to read
// "S neuloženými změnami" while the chip on the row it selected said something
// else again — two names for one thing on one screen. Contract 3's three states
// in the order an editor thinks about them: live, waiting, not yet.
const STATE_FILTERS = [
  { value: "", title: "Vše" },
  { value: "published", title: STATE_LABELS.published.label },
  { value: "edited", title: STATE_LABELS.edited.label },
  { value: "draft", title: STATE_LABELS.draft.label },
]

// The archive is a view, not a URL someone has to know about. Two segments at
// the head of the toolbar, so an editor can see that an archive exists and how
// many people are in it without being told — which is the whole difference
// between a feature and a trick.
const LIVE = "live"
const ARCHIVE = "archive"

/**
 * One list for every content type. Nothing here is per-type — the columns come
 * from the type's `preview()`, the sort options from its `orderings`, and the
 * state chip from Contract 3. A new schema gets a working list screen for free,
 * and that includes the archive: `archived` is a property of a document, not of
 * a consultant.
 */
export default function DocumentListView({ type }) {
  const { role } = useAuth()
  // Undefined `createRoles` means anybody; only `review` narrows it today.
  const mayCreate = !type?.createRoles || !role || type.createRoles.includes(role)
  const port = usePort()
  const router = useStudioRouter()
  const toast = useToast()
  const { revision, bump } = useRevision()

  const orderings = type.orderings || []
  const [scope, setScope] = useState(LIVE)
  const [search, setSearch] = useState("")
  const [orderName, setOrderName] = useState(orderings[0]?.name || "")
  const [state, setState] = useState("")
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const debounced = useDebounced(search)

  const ordering = orderings.find((entry) => entry.name === orderName) || orderings[0]
  const archived = scope === ARCHIVE

  const { data, error, loading, reload } = useAsync(
    () =>
      port.list({
        type: type.name,
        search: debounced,
        // The type's own ordering, passed through verbatim — the Studio does not
        // invent a sort language, it forwards what the schema declared.
        sort: ordering?.by,
        // The publish-state filter is meaningless in the archive: everything
        // there is off the site regardless of what it was.
        filters: !archived && state ? { state } : undefined,
        archived,
        page,
        perPage: PER_PAGE,
      }),
    [port, type.name, debounced, ordering, state, archived, page, revision],
  )

  // A separate one-row probe purely for the count on the Archiv segment. An
  // editor who cannot see that the archive has anything in it will not open it.
  const { data: archiveProbe } = useAsync(
    () => port.list({ type: type.name, archived: true, perPage: 1 }),
    [port, type.name, revision],
  )

  const rows = data?.rows || []
  const total = data?.total || 0
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const filtered = Boolean(debounced || (!archived && state))

  // Resetting to page 1 belongs with the control that changed, not in an effect
  // that would also fire on an unrelated re-render.
  const change = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const act = async (action, doc, message) => {
    setBusyId(doc.id)
    try {
      await port[action]({ id: doc.id })
      bump()
      toast.success(message)
    } catch (failure) {
      toast.error("Akce selhala", { description: failure?.message })
    } finally {
      setBusyId(null)
      setConfirming(null)
    }
  }

  return (
    <>
      <ViewHeader
        title={type.title || type.name}
        subtitle={type.description}
        meta={loading && data ? <span className={styles.refreshing}>aktualizuji…</span> : null}
        actions={
          // A type can say who may author it — `review` says the administrator
          // only, and the reason is in schemas/review.js. The server refuses the
          // create regardless; this is what stops it being offered.
          mayCreate ? (
            <Button href={hrefs.create(type.name)} variant="primary" icon="plus">
              Nový dokument
            </Button>
          ) : null
        }
      />

      <ViewToolbar>
        <Segmented
          options={[
            { id: LIVE, title: "Aktivní" },
            { id: ARCHIVE, title: "Archiv", count: archiveProbe?.total ?? undefined },
          ]}
          value={scope}
          onChange={(value) => {
            setScope(value)
            setState("")
            setPage(1)
          }}
        />

        <SearchInput value={search} onChange={change(setSearch)} placeholder={`Hledat v ${(type.title || "").toLowerCase()}…`} />

        {!archived ? (
          <Select
            value={state}
            onChange={(value) => change(setState)(value || "")}
            options={STATE_FILTERS}
            className={styles.filterSelect}
          />
        ) : null}

        {orderings.length > 1 ? (
          <label className={styles.sort}>
            <Icon name="sort" size={13} />
            <Select
              value={orderName}
              onChange={(value) => change(setOrderName)(value || orderings[0].name)}
              options={orderings.map((entry) => ({ value: entry.name, title: entry.title }))}
              className={styles.sortSelect}
            />
          </label>
        ) : null}

        <Spacer />
        <ResultCount>{plural(total, "položka", "položky", "položek")}</ResultCount>
      </ViewToolbar>

      {archived ? (
        <p className={styles.scopeNote}>
          <Icon name="archive" size={13} />
          Tyto položky nejsou na webu. Zůstávají tady, dokud je někdo nevrátí zpět nebo trvale nesmaže.
        </p>
      ) : null}

      <ViewBody>
        {loading && !data ? (
          <SkeletonRows count={8} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={filtered ? "search" : archived ? "archive" : type.icon || "document"}
            title={filtered ? "Nic neodpovídá" : archived ? "Archiv je prázdný" : `Zatím žádné položky`}
            description={
              filtered
                ? "Zkuste jiný výraz nebo zrušte filtry."
                : archived
                  ? "Nic jste zatím nearchivovali. Archivovaná položka zmizí z webu, ale zůstane tady."
                  : `Vytvořte první dokument typu „${type.title || type.name}". Objeví se na webu až po publikování.`
            }
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("")
                    setState("")
                    setPage(1)
                  }}
                >
                  Zrušit filtry
                </Button>
              ) : archived ? (
                <Button variant="secondary" icon="arrowLeft" onClick={() => setScope(LIVE)}>
                  Zpět na aktivní
                </Button>
              ) : (
                <Button href={hrefs.create(type.name)} variant="primary" icon="plus">
                  Nový dokument
                </Button>
              )
            }
          />
        ) : (
          <ul className={styles.rows}>
            {rows.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                type={type}
                archived={archived}
                busy={busyId === doc.id}
                onOpen={() => router.push(hrefs.editor(type.name, doc.id))}
                onArchive={() => act("archive", doc, "Přesunuto do archivu")}
                onRestore={() => act("restore", doc, "Vráceno z archivu")}
                onDelete={() => setConfirming(doc)}
              />
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <nav className={styles.pagination}>
            <Button variant="ghost" size="sm" icon="chevronLeft" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Předchozí
            </Button>
            <span className={styles.pages}>
              Strana {page} z {pages}
            </span>
            <Button variant="ghost" size="sm" iconRight="chevronRight" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Další
            </Button>
          </nav>
        ) : null}
      </ViewBody>

      {/* Deleting is the one action here that cannot be undone, so it is the
          one action here that asks. Archiving does not: it is reversible by
          design, and a confirmation on a reversible action teaches people to
          click through confirmations. */}
      <ConfirmDialog
        open={Boolean(confirming)}
        title="Smazat natrvalo?"
        description={
          confirming
            ? `„${previewOf(type, confirming).title}" zmizí z archivu i z databáze. Tuto akci nelze vzít zpět — ` +
              "pokud jde jen o to, aby nebyl na webu, stačí archiv."
            : ""
        }
        confirmLabel="Smazat natrvalo"
        busy={busyId === confirming?.id}
        onClose={() => setConfirming(null)}
        onConfirm={() => act("remove", confirming, "Dokument smazán")}
      />
    </>
  )
}

function DocumentRow({ doc, type, archived, busy, onOpen, onArchive, onRestore, onDelete }) {
  const preview = previewOf(type, doc)
  const state = STATE_LABELS[stateOf(doc)]
  const image = mediaUrl(preview.media)

  return (
    <li className={styles.rowItem}>
      <div
        className={styles.row}
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onOpen()
          }
        }}
      >
        <span className={styles.thumb}>
          {image ? (
            <img src={image} alt="" loading="lazy" />
          ) : (
            <Icon name={type.icon || "document"} size={15} className={styles.thumbIcon} />
          )}
        </span>

        <span className={styles.text}>
          <span className={styles.title}>{preview.title}</span>
          {preview.subtitle ? <span className={styles.subtitle}>{truncate(preview.subtitle, 150)}</span> : null}
        </span>

        {preview.badge ? <span className={styles.rowBadge}>{preview.badge}</span> : null}

        <span className={styles.state} title={archived ? restoreOutcome(doc) : state.hint}>
          <Badge tone={state.tone} dot>
            {state.label}
          </Badge>
        </span>

        <span className={styles.updated} title={doc.archivedAt || doc.updatedAt}>
          {formatRelative(doc.archivedAt || doc.updatedAt)}
        </span>

        <Icon name="chevronRight" size={14} className={styles.chevron} />
      </div>

      {/* Siblings of the row rather than children of it: the row is a
          `role="button"`, and a real button inside one gives a screen reader
          two overlapping controls to announce. They overlay the right edge on
          hover, which is why the row reserves padding for them. */}
      <div className={styles.rowActions}>
        {archived ? (
          <>
            <IconButton icon="unarchive" label="Vrátit z archivu" disabled={busy} onClick={onRestore} />
            <IconButton icon="trash" label="Smazat natrvalo" tone="danger" disabled={busy} onClick={onDelete} />
          </>
        ) : (
          <IconButton icon="archive" label="Do archivu" disabled={busy} onClick={onArchive} />
        )}
      </div>
    </li>
  )
}
