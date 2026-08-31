import { useCallback, useEffect, useMemo, useState } from "react"
import { useStudioRouter } from "../../runtime/navigation.jsx"

import { useAuth, useCore, usePort, useRevision } from "../context/StudioProvider.jsx"
import { useToast } from "../context/ToastProvider.jsx"
import { useAsync, useDebounced } from "../hooks/useAsync.js"
import {
  DESTROY_CONFIRM,
  EMPTY_SELECTION,
  REASON_OPTIONS,
  REPLAY_CAVEAT,
  SECTIONS,
  buildTextIndex,
  buildUsageIndex,
  bytes,
  day,
  reasonOf,
  selectionSize,
  stamp,
} from "../lib/archive.js"
import { previewOf } from "../lib/documents.js"
import { plural, truncate } from "../lib/format.js"
import { hrefs } from "../lib/routes.js"
import { DevicePicker, PagePicker, ZoomControls } from "../preview/FrameControls.jsx"
import Stage from "../preview/Stage.jsx"
import { safePath, useFrameSurface } from "../preview/useFrameSurface.js"
import { Button, Checkbox, IconButton, SearchInput, Segmented, Select } from "../ui/controls.jsx"
import { Badge, EmptyState, ErrorState, SkeletonRows, Spinner } from "../ui/feedback.jsx"
import { Modal } from "../ui/Modal.jsx"
import Icon from "../ui/Icon.jsx"
import preview from "../preview/preview.module.scss"
import { ResultCount, Spacer, ViewBody, ViewHeader, ViewToolbar } from "./ViewLayout.jsx"
import styles from "./ArchiveView.module.scss"

/**
 * Archiv — what the site said, when, who changed it, and which files were on it.
 *
 * ---------------------------------------------------------------------------
 * A record, not a workspace
 *
 * Nothing on these screens is editable and the editing overlay does not arm
 * inside the frame. That is two refusals rather than one, because they fail
 * differently: `annotated: false` keeps `?edit=1` off the framed URL so
 * `editable()` never emits a single `data-cms-*` attribute into the document,
 * and leaving `editing` unset keeps the overlay from being mounted into it. A
 * page carrying the attributes is already half an editor even with nothing
 * mounted on it, so neither half is sufficient alone.
 *
 * The one action here that writes is *Obnovit do konceptu*, and it writes to
 * `draft` — never to `data`. ARCHIVE.md is explicit about why: a return has to
 * pass the same approval as any other change rather than replacing the live site
 * with one click from a screen whose premise is that it is safe to poke around
 * in. `port.update()` cannot reach `data` at all (adapter.js), so this is a
 * property of the port rather than a promise this file keeps.
 *
 * ---------------------------------------------------------------------------
 * What it is allowed to claim
 *
 * "Takhle web vypadal 3. března" is not a true sentence and does not appear
 * here. Old content replayed by today's code is, and that caveat is on screen
 * permanently rather than in a tooltip — a person reading a page from March has
 * to know it before they conclude anything from how it is laid out.
 *
 * ---------------------------------------------------------------------------
 * Three sub-pages, one view, one selection
 *
 * Změny / Texty / Média are three readings of one dataset, not three screens: an
 * erasure request under GDPR reaches a person's revisions AND their photographs,
 * and it has to be possible to gather both and decide once. So the selection
 * survives the tab switch, which is also why the sub-pages are a `Segmented`
 * inside one view rather than three sidebar rows.
 *
 * Změny is paged by the server. Texty and Média are not, and cannot be: "from
 * when until when" is a comparison between successive revisions of one document
 * and "where was this file used" is a scan of every body, so both need the
 * corpus rather than a page of it. `useRevisionCorpus` bounds that read and says
 * out loud when it hit the bound — see there.
 */
export default function ArchiveView({ section }) {
  const router = useStudioRouter()
  const port = usePort()
  const core = useCore()
  const toast = useToast()
  const { user } = useAuth()
  const { bump } = useRevision()

  // Nothing read from the URL may be rendered until this is true. The Studio's
  // subtree is never server-rendered, but `router.isReady` is false on a
  // catch-all's first client pass either way, and this repo has paid for reading
  // it too early twice. EditView gates on the same effect.
  const [urlReady, setUrlReady] = useState(false)
  useEffect(() => setUrlReady(true), [])

  const current = SECTIONS.find((entry) => entry.segment === (section || null)) || SECTIONS[0]

  const [search, setSearch] = useState("")
  const [type, setType] = useState("")
  const [reason, setReason] = useState("")
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState(EMPTY_SELECTION)
  const [confirming, setConfirming] = useState(null)
  const [restoring, setRestoring] = useState(null)

  // Filters describe the list under them, so they do not travel between lists.
  // The selection does — see the header.
  useEffect(() => {
    setSearch("")
    setType("")
    setReason("")
    setPage(1)
  }, [current.id])

  const query = useDebounced(search)
  useEffect(() => setPage(1), [query, type, reason])

  const title = useCallback(
    (typeName, body) => previewOf(core.getType(typeName), { data: body }).title,
    [core],
  )
  const typeTitle = useCallback((typeName) => core.getType(typeName)?.title || typeName, [core])
  const typeOptions = useMemo(
    () => core.listTypes().map((entry) => ({ value: entry.name, label: entry.title || entry.name })),
    [core],
  )

  /* --------------------------------------------------------------- data -- */

  const timeline = useAsync(
    () =>
      current.id === "changes"
        ? port.history.revisions({ type, reason, page, perPage: PER_PAGE })
        : Promise.resolve(null),
    [port, current.id, type, reason, page],
  )

  const corpus = useRevisionCorpus(port, current.id !== "changes")

  /**
   * `changed_by` is a user id and a user id is not an answer to "who".
   *
   * Resolved from the user list rather than joined on the server, because the
   * Archive is owner-only and so is that list — the same person who may read the
   * archive may already read every account in it, so this costs one request and
   * adds no exposure. A name that cannot be resolved (a deleted account) falls
   * back to the id, said as an id; inventing "někdo" for it would hide the one
   * fact the row still has.
   */
  const { data: people } = useAsync(
    () => port.auth.users.list().catch(() => null),
    [port],
  )
  const who = useCallback(
    (id) => {
      if (!id) return "neznámo kdo"
      const person = (people?.rows || people || []).find?.((entry) => entry.id === id)
      return person?.name || person?.email || `uživatel ${String(id).slice(0, 8)}`
    },
    [people],
  )

  const ledger = useAsync(
    () => (current.id === "media" ? port.history.media({ page, perPage: PER_PAGE, search: query }) : Promise.resolve(null)),
    [port, current.id, page, query],
  )

  const texts = useMemo(() => {
    if (current.id !== "texts" || !corpus.data) return null
    const all = buildTextIndex(corpus.data.rows)
    const needle = query.toLowerCase()
    return all.filter(
      (row) =>
        (!type || row.type === type) &&
        (!needle ||
          row.value.toLowerCase().includes(needle) ||
          row.field.toLowerCase().includes(needle) ||
          title(row.type, row.body).toLowerCase().includes(needle)),
    )
  }, [current.id, corpus.data, query, type, title])

  const usage = useMemo(
    () => (current.id === "media" && corpus.data ? buildUsageIndex(corpus.data.rows) : null),
    [current.id, corpus.data],
  )

  const source =
    current.id === "changes" ? timeline : current.id === "texts" ? corpus : ledger
  const loading = source.loading
  const error = source.error || (current.id === "media" ? corpus.error : null)

  const total = current.id === "texts" ? texts?.length || 0 : source.data?.total || 0
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const rows =
    current.id === "texts"
      ? (texts || []).slice((page - 1) * PER_PAGE, page * PER_PAGE)
      : source.data?.rows || []

  const reload = useCallback(() => {
    timeline.reload()
    corpus.reload()
    ledger.reload()
  }, [timeline, corpus, ledger])

  /* ---------------------------------------------------------- selection -- */

  const toggle = useCallback((kind, id, on) => {
    setSelection((currentSelection) => {
      const list = new Set(currentSelection[kind])
      if (on) list.add(id)
      else list.delete(id)
      return { ...currentSelection, [kind]: [...list] }
    })
  }, [])

  const clear = useCallback(() => setSelection(EMPTY_SELECTION), [])

  /**
   * Open a moment. Always at `/studio/archive`, never at a sub-page.
   *
   * `frame.js` `isArchiveFrame()` asks whether the parent document is exactly
   * `/studio/archive`, and that is what tells a framed page it is being replayed
   * rather than shown. A moment opened from `/studio/archive/texty` would frame
   * the same URLs and be recognised as nothing at all, so the sub-page travels
   * as `?from=` and the address stays the one the frame contract names.
   *
   * Named for what it does to the URL. The cookie is `openMoment`, further down.
   */
  const showMoment = useCallback(
    (moment) => router.push(hrefs.archive(null, { at: moment, from: current.segment })),
    [router, current.segment],
  )

  /* ------------------------------------------------------------ as of T -- */

  const at = urlReady && router.isReady ? String(router.query.t || "") : ""
  if (at) {
    return (
      <AsOfFrame
        at={at}
        sitePath={urlReady && router.isReady ? safePath(router.query.p) : null}
        onNavigate={(next) =>
          router.replace(hrefs.archive(null, { at, page: next, from: router.query.from }), undefined, {
            shallow: true,
            scroll: false,
          })
        }
        backHref={hrefs.archive(router.query.from || null)}
      />
    )
  }

  /* -------------------------------------------------------------- lists -- */

  return (
    <>
      <ViewHeader
        title="Archiv"
        subtitle="Co bylo na webu napsané, které soubory u toho byly, kdy se to změnilo a kdo to udělal."
      />

      <ViewToolbar>
        <Segmented
          options={SECTIONS.map((entry) => ({
            id: entry.id,
            title: entry.title,
            count: entry.id === current.id ? total : undefined,
          }))}
          value={current.id}
          onChange={(next) => router.push(hrefs.archive(SECTIONS.find((entry) => entry.id === next)?.segment))}
        />
        <Spacer />
        {/* Změny has no search box and that is not an omission: the server
            filters revisions by type, reason and window, and a box that searched
            only the fifty rows on screen would look like it searched the archive. */}
        {current.id === "changes" ? null : (
          <SearchInput value={search} onChange={setSearch} placeholder="Hledat v archivu…" className={styles.search} />
        )}
        {current.id === "changes" ? (
          <Select
            value={reason}
            onChange={(value) => setReason(value || "")}
            options={REASON_OPTIONS}
            placeholder="Všechny změny"
            className={styles.filter}
          />
        ) : null}
        {current.id === "media" ? null : (
          <Select
            value={type}
            onChange={(value) => setType(value || "")}
            options={typeOptions}
            placeholder="Všechny typy"
            className={styles.filter}
          />
        )}
        <ResultCount>{countLabel(current.id, total)}</ResultCount>
      </ViewToolbar>

      <CaveatStrip corpus={current.id === "changes" ? null : corpus.data} />

      <ViewBody>
        {loading && !source.data ? (
          <SkeletonRows count={8} height={72} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="clock"
            title="Tady zatím nic není"
            description={
              query || type || reason
                ? "Zkuste jiné hledání nebo filtr."
                : "Archiv se plní od chvíle, kdy vznikl — publikování dřív předchozí verzi přepisovalo, takže starší změny už zrekonstruovat nejde."
            }
          />
        ) : current.id === "changes" ? (
          <ul className={styles.rows}>
            {rows.map((row) => (
              <ChangeRow
                key={row.id}
                row={row}
                title={title(row.type, row.body)}
                typeTitle={typeTitle(row.type)}
                who={who(row.changedBy)}
                selected={selection.revisionIds.includes(row.id)}
                onSelect={(on) => toggle("revisionIds", row.id, on)}
                onOpen={() => showMoment(row.changedAt)}
                onRestore={() => setRestoring(row)}
              />
            ))}
          </ul>
        ) : current.id === "texts" ? (
          <ul className={styles.rows}>
            {rows.map((row) => (
              <TextRow
                key={row.id}
                row={row}
                title={title(row.type, row.body)}
                typeTitle={typeTitle(row.type)}
                onOpen={() => showMoment(row.since)}
              />
            ))}
          </ul>
        ) : (
          <ul className={styles.rows}>
            {rows.map((row) => (
              <MediaRow
                key={row.id}
                row={row}
                usedIn={usage?.get(row.id) || null}
                usageReady={Boolean(usage)}
                title={title}
                typeTitle={typeTitle}
                selected={selection.mediaIds.includes(row.id)}
                onSelect={(on) => toggle("mediaIds", row.id, on)}
                onRestore={async () => {
                  try {
                    await port.media.restore(row.id)
                    ledger.reload()
                    bump()
                    toast.success("Vráceno do knihovny", { description: row.filename })
                  } catch (failure) {
                    toast.error("Vrácení selhalo", { description: failure?.message })
                  }
                }}
              />
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <nav className={styles.pager} aria-label="Stránkování">
            <Button variant="ghost" size="sm" icon="chevronLeft" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Předchozí
            </Button>
            <span className={styles.pagerText}>
              Strana {page} z {pages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconRight="chevronRight"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Další
            </Button>
          </nav>
        ) : null}
      </ViewBody>

      {selectionSize(selection) > 0 ? (
        <div className={styles.bulkDock}>
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>{selectionLabel(selection)}</span>
            <Button variant="ghost" size="sm" onClick={clear}>
              Zrušit výběr
            </Button>
            <Spacer />
            <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirming(selection)}>
              Smazat natrvalo
            </Button>
          </div>
        </div>
      ) : null}

      <DestroyDialog
        selection={confirming}
        actor={user}
        onClose={() => setConfirming(null)}
        onDone={(outcome) => {
          setConfirming(null)
          clear()
          reload()
          bump()
          toast.info("Nenávratně smazáno", { description: destroyedLabel(outcome), duration: 12000 })
        }}
      />

      <RestoreDialog
        revision={restoring}
        title={restoring ? title(restoring.type, restoring.body) : ""}
        onClose={() => setRestoring(null)}
        onDone={() => {
          setRestoring(null)
          bump()
          toast.success("Obnoveno do konceptu", {
            description: "Na webu je pořád ta verze, co tam byla. Zveřejní se až publikováním.",
          })
        }}
      />
    </>
  )
}

const PER_PAGE = 50

/**
 * Every revision the archive holds, up to a bound.
 *
 * Texty and Média both need the corpus rather than a page of it — a text's
 * window is a comparison between successive revisions of one document, and a
 * file's usage is a scan of every body — so this pages through the listing at
 * the server's own maximum and stops.
 *
 * Bounded, and the bound is REPORTED rather than swallowed. `site/archive.js`
 * makes the same choice for the same reason: a text index built from a truncated
 * scan is missing versions, and an archive that quietly drops versions is worse
 * than one that says it could not read all of them. Twenty pages of a hundred is
 * a decade of this site at two editorial changes a day.
 */
const CORPUS_PAGES = 20
const CORPUS_PER_PAGE = 100

function useRevisionCorpus(port, enabled) {
  return useAsync(async () => {
    if (!enabled) return null
    const rows = []
    let total = 0
    for (let page = 1; page <= CORPUS_PAGES; page += 1) {
      const answer = await port.history.revisions({ page, perPage: CORPUS_PER_PAGE })
      total = answer?.total || 0
      const batch = answer?.rows || []
      rows.push(...batch)
      if (!batch.length || rows.length >= total) break
    }
    return { rows, total, truncated: rows.length < total }
  }, [port, enabled])
}

const countLabel = (id, total) =>
  id === "changes"
    ? plural(total, "změna", "změny", "změn")
    : id === "texts"
      ? plural(total, "verze textu", "verze textu", "verzí textu")
      : plural(total, "soubor", "soubory", "souborů")

const selectionLabel = (selection) => {
  const parts = []
  if (selection.revisionIds.length) parts.push(plural(selection.revisionIds.length, "revize", "revize", "revizí"))
  if (selection.mediaIds.length) parts.push(plural(selection.mediaIds.length, "soubor", "soubory", "souborů"))
  return `Vybráno: ${parts.join(" a ")}`
}

const destroyedLabel = (outcome) =>
  `${plural(outcome.revisions || 0, "revize", "revize", "revizí")}, ` +
  `${plural(outcome.media?.rows || 0, "soubor", "soubory", "souborů")}, ${bytes(outcome.media?.bytes || 0)}`

/* ================================================================ strip == */

/**
 * The sentence the archive is never allowed to stop saying, plus the one it only
 * says when it is true.
 *
 * The caveat is permanent (ARCHIVE.md layer 5). The truncation warning appears
 * only when the corpus hit its bound, because a text index that is missing
 * versions must not look like a complete one.
 */
function CaveatStrip({ corpus }) {
  return (
    <div className={styles.strips}>
      {corpus?.truncated ? (
        <p className={`${styles.strip} ${styles.stripWarn}`} role="status">
          <Icon name="warning" size={13} className={styles.stripIcon} />
          <span>
            Archiv má <strong>{corpus.total}</strong> revizí a tenhle přehled jich přečetl{" "}
            <strong>{corpus.rows.length}</strong> (nejnovějších). Starší verze v seznamu chybí — zužte
            výběr přes záložku Změny.
          </span>
        </p>
      ) : null}
      <p className={styles.strip}>
        <Icon name="info" size={13} className={styles.stripIcon} />
        <span>{REPLAY_CAVEAT}</span>
      </p>
    </div>
  )
}

/* ================================================================= rows == */

/**
 * One change: when, who, what, and the transition it was.
 *
 * The row is the `role="button"` and the checkbox and the actions are its
 * siblings — the arrangement DocumentListView settled on, for the reason given
 * there: a real control nested inside a `role="button"` gives a screen reader
 * two overlapping widgets to announce. The tab path across a row is therefore
 * checkbox → row → actions, and the actions appear on `:focus-within` as well as
 * on hover so the keyboard path is not a second-class one.
 */
function ChangeRow({ row, title, typeTitle, who, selected, onSelect, onOpen, onRestore }) {
  const reason = reasonOf(row.reason)
  const visible = row.status === "published" && !row.archivedAt

  return (
    <li className={`${styles.rowItem} ${selected ? styles.rowSelected : ""}`}>
      <div className={styles.select}>
        <Checkbox
          checked={selected}
          onChange={onSelect}
          label={<span className={styles.srOnly}>{`Vybrat revizi z ${stamp(row.changedAt)}`}</span>}
        />
      </div>

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
        <span className={styles.when}>
          <span className={styles.whenStamp}>{stamp(row.changedAt)}</span>
          <span className={styles.whenWho}>{who}</span>
        </span>

        <span className={styles.what}>
          <span className={styles.title}>{title}</span>
          <span className={styles.meta}>
            {typeTitle}
            {row.buildId ? ` · build ${row.buildId}` : ""}
          </span>
        </span>

        <span className={styles.flags}>
          <Badge tone={reason.tone} title={reason.hint}>
            {reason.label}
          </Badge>
          {visible ? (
            <Badge tone="neutral" dot title="Po této změně bylo tělo veřejné">
              veřejné
            </Badge>
          ) : null}
        </span>

        <Icon name="chevronRight" size={14} className={styles.chevron} />
      </div>

      <div className={styles.rowActions}>
        <IconButton icon="eye" label={`Zobrazit web k ${stamp(row.changedAt)}`} onClick={onOpen} />
        <IconButton icon="unarchive" label="Obnovit tuto verzi do konceptu" onClick={onRestore} />
      </div>
    </li>
  )
}

/** One version of one text: which block, what it said, from when until when. */
function TextRow({ row, title, typeTitle, onOpen }) {
  return (
    <li className={styles.rowItem}>
      <span className={styles.select} aria-hidden="true" />
      <div
        className={`${styles.row} ${styles.textRow}`}
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
        <span className={styles.where}>
          <span className={styles.title}>{title}</span>
          <span className={styles.meta}>{typeTitle}</span>
          <code className={styles.field}>{row.field}</code>
        </span>

        {/* The whole text, not a preview. What it said is the column this
            sub-page exists for; truncating it would answer a different question. */}
        <span className={styles.said}>{row.value}</span>

        {/* Days on the row, the exact instants on hover. A window is read as
            "which days did this stand", and two versions of one text on one
            afternoon still have to be tellable apart. */}
        <span className={styles.window}>
          <span className={styles.windowFrom} title={stamp(row.since)}>
            od {day(row.since)}
          </span>
          <span className={styles.windowTo} title={row.until ? stamp(row.until) : undefined}>
            {row.until ? `do ${day(row.until)}` : "dosud"}
          </span>
          {row.visible ? null : (
            <Badge tone="neutral" title="V té chvíli dokument na webu nebyl — text byl uložený, ale neveřejný">
              neveřejné
            </Badge>
          )}
        </span>

        <Icon name="chevronRight" size={14} className={styles.chevron} />
      </div>
      <span className={styles.rowActions} />
    </li>
  )
}

/**
 * One file. Both dates, because they are two different questions.
 *
 * A file is uploaded at one moment and first appears on the site at another —
 * sometimes weeks later, sometimes never. An archive that knows only "nahráno"
 * answers "when did somebody put this in the library", which is not what anyone
 * asks; they ask when the public first saw it.
 *
 * `firstPublishedAt: null` is a real answer and not a missing one: no revision
 * this system recorded ever contained the file. For a file that was already on
 * the site when the archive was switched on, that stays null until the next
 * publish — so it is printed as "zatím nezaznamenáno" rather than "nikdy",
 * which would be a claim the archive cannot support.
 */
function MediaRow({ row, usedIn, usageReady, title, typeTitle, selected, onSelect, onRestore }) {
  return (
    <li className={`${styles.rowItem} ${selected ? styles.rowSelected : ""}`}>
      <div className={styles.select}>
        <Checkbox
          checked={selected}
          onChange={onSelect}
          label={<span className={styles.srOnly}>{`Vybrat soubor ${row.filename}`}</span>}
        />
      </div>

      <div className={`${styles.row} ${styles.mediaRow}`}>
        <span className={styles.thumb}>
          {row.url ? <img src={row.url} alt="" loading="lazy" /> : <Icon name="image" size={15} />}
        </span>

        <span className={styles.file}>
          <span className={styles.title} title={row.path}>
            {row.filename}
          </span>
          <span className={styles.meta}>
            {row.mime || "?"} · {bytes(row.size)}
            {row.width ? ` · ${row.width}×${row.height}` : ""}
          </span>
        </span>

        <span className={styles.dates}>
          <span className={styles.date}>
            <span className={styles.dateLabel}>nahráno</span>
            <span className={styles.dateValue}>{stamp(row.uploadedAt || row.createdAt)}</span>
          </span>
          <span className={styles.date}>
            <span className={styles.dateLabel}>poprvé publikováno</span>
            <span className={`${styles.dateValue} ${row.firstPublishedAt ? "" : styles.dateNever}`}>
              {row.firstPublishedAt ? (
                stamp(row.firstPublishedAt)
              ) : (
                <span title="Žádná zaznamenaná revize tenhle soubor neobsahovala. U souborů, které na webu byly už před vznikem archivu, se datum doplní až při nejbližším publikování.">
                  zatím nezaznamenáno
                </span>
              )}
            </span>
          </span>
        </span>

        <span className={styles.usage}>
          {!usageReady ? (
            <span className={styles.usedNone}>zjišťuji…</span>
          ) : usedIn?.length ? (
            <>
              <span
                className={styles.usedList}
                title={usedIn.map((entry) => `${title(entry.type, entry.body)} (${typeTitle(entry.type)})`).join("\n")}
              >
                {truncate(usedIn.map((entry) => title(entry.type, entry.body)).join(", "), 90)}
              </span>
              <span className={styles.usedCount}>
                {plural(usedIn.length, "dokument", "dokumenty", "dokumentů")} · od {day(
                  usedIn.map((entry) => entry.first).sort()[0],
                )}
              </span>
            </>
          ) : (
            <span className={styles.usedNone}>v žádné zaznamenané verzi</span>
          )}
        </span>

        <span className={styles.flags}>
          {row.inUseNow ? (
            <Badge tone="positive" dot title="Je na webu, který návštěvník právě vidí">
              používá se
            </Badge>
          ) : (
            <Badge tone="neutral" title="Žádný publikovaný dokument ho dnes nepoužívá">
              nepoužívá se
            </Badge>
          )}
          {row.archivedAt ? (
            <Badge tone="neutral" title={`Vyřazeno z knihovny ${stamp(row.archivedAt)}`}>
              vyřazeno
            </Badge>
          ) : null}
        </span>
      </div>

      {/* The one non-destructive action on this sub-page, and it is here because
          this is the only screen that lists files which have left the library —
          the library itself, by definition, does not show them. */}
      <div className={styles.rowActions}>
        {row.archivedAt ? <IconButton icon="unarchive" label="Vrátit do knihovny" onClick={onRestore} /> : null}
      </div>
    </li>
  )
}

/* ============================================================== destroy == */

/**
 * The only irreversible action in this admin, and the only place it lives.
 *
 * `ConfirmDialog` was not enough, and the reason is the requirement rather than
 * taste: above the sentence there has to be *what exactly will disappear* — how
 * many revisions, which days, how many files, how many bytes — and
 * `ConfirmDialog` renders its description inside a `<p>`, which a list and a
 * definition list cannot legally go in. So this is `Modal` with the same danger
 * button, and the report above it.
 *
 * The numbers come from `POST /archive/plan`, which the server resolves with the
 * SAME function that gates the purge (server/archive.js) — so what a person read
 * and what was acted on cannot be two queries that merely agree today. Building
 * them here out of the rows on screen would have been easy and would have been a
 * promise this file cannot keep.
 */
function DestroyDialog({ selection, actor, onClose, onDone }) {
  const port = usePort()
  const [plan, setPlan] = useState({ status: "idle", data: null, error: null })
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)

  const key = selection ? JSON.stringify(selection) : null

  useEffect(() => {
    if (!key) {
      setPlan({ status: "idle", data: null, error: null })
      setFailure(null)
      return undefined
    }
    let live = true
    setPlan({ status: "loading", data: null, error: null })
    port.history.plan(JSON.parse(key)).then(
      (data) => live && setPlan({ status: "ready", data, error: null }),
      (error) => live && setPlan({ status: "failed", data: null, error }),
    )
    return () => {
      live = false
    }
  }, [key, port])

  if (!selection) return null

  const data = plan.data
  const blocked = data?.blocked || []
  const nothing = data && data.revisions.count === 0 && data.media.count === 0

  const run = async () => {
    setBusy(true)
    setFailure(null)
    try {
      onDone(await port.history.purge(selection))
    } catch (error) {
      // A refusal only the server knows about. The dialog mirrors the two it
      // does know; it is never the authority on either.
      setFailure(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Smazat natrvalo z archivu?"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Zrušit
          </Button>
          <Button
            variant="danger"
            onClick={run}
            loading={busy}
            disabled={plan.status !== "ready" || blocked.length > 0 || nothing}
          >
            Smazat natrvalo
          </Button>
        </>
      }
    >
      {plan.status === "loading" ? (
        <p className={styles.destroyLoading}>
          <Spinner size={16} /> Zjišťuji, co přesně zmizí…
        </p>
      ) : plan.status === "failed" ? (
        <ErrorState error={plan.error} compact />
      ) : data ? (
        <>
          {/* What exactly disappears, named BEFORE the sentence. The publish
              confirmation sets this standard by naming the blocks it will
              publish; a destroy that only says "are you sure" is a speed bump,
              not a decision. */}
          <dl className={styles.destroyFacts}>
            <div>
              <dt>Revize</dt>
              <dd>
                {plural(data.revisions.count, "revize", "revize", "revizí")}
                {data.revisions.documents ? (
                  <span className={styles.exact}>
                    {" "}
                    z {plural(data.revisions.documents, "dokumentu", "dokumentů", "dokumentů")}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Dny</dt>
              <dd>
                {data.revisions.from
                  ? data.revisions.from === data.revisions.to
                    ? day(data.revisions.from)
                    : `${day(data.revisions.from)} – ${day(data.revisions.to)}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Soubory</dt>
              <dd>{plural(data.media.count, "soubor", "soubory", "souborů")}</dd>
            </div>
            <div>
              <dt>Místo</dt>
              <dd>
                {bytes(data.media.bytes)} <span className={styles.exact}>({data.media.bytes} B)</span>
              </dd>
            </div>
          </dl>

          {blocked.length ? (
            <div className={styles.blocked} role="alert">
              <p className={styles.blockedHead}>
                <Icon name="lock" size={13} />
                {plural(blocked.length, "položku", "položky", "položek")} server smazat odmítne
              </p>
              <ul>
                {blocked.map((entry) => (
                  <li key={`${entry.kind}:${entry.id}`}>
                    <code>{String(entry.id).slice(0, 8)}</code> {entry.message}
                  </li>
                ))}
              </ul>
              <p className={styles.blockedFoot}>
                Mazání je všechno, nebo nic: dokud je ve výběru něco odmítnutého, nesmaže se{" "}
                <strong>nic</strong> — čísla nahoře popisují výběr, ne to, co zmizí. Odeberte je z výběru.
                Server je odmítne i tak; tohle tlačítko není to, co je chrání.
              </p>
            </div>
          ) : null}

          {/* Verbatim, and last, so it is the sentence read with the numbers
              still in view. ARCHIVE.md fixes the wording. */}
          <p className={styles.destroyConfirm}>{DESTROY_CONFIRM}</p>

          <p className={styles.destroyWho}>
            Maže {actor?.name || actor?.email || "vlastník"}. Trvale mazat z archivu smí jen vlastník a
            server to ověřuje u každého požadavku. Je to jediné místo v systému, kde se opravdu maže — je
            tu i proto, že žádost o výmaz osobních údajů (GDPR) musí umět dosáhnout i do archivu.
          </p>

          {failure ? <ErrorState error={failure} compact /> : null}
        </>
      ) : null}
    </Modal>
  )
}

/* ============================================================== restore == */

/**
 * Putting an old body back — into `draft`, and nowhere else.
 *
 * ARCHIVE.md: "Obnovení staré verze je samostatná, vědomá akce, která zapíše do
 * konceptu — aby i návrat prošel schválením, ne aby přepsal web klikem." So this
 * calls `port.update()`, whose whole contract is that it moves `draft` and
 * cannot reach `data`, `status` or `published_at` (adapter.js). The live site is
 * untouched until somebody publishes, which is the same gate every other change
 * passes.
 */
function RestoreDialog({ revision, title, onClose, onDone }) {
  const port = usePort()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)

  if (!revision) return null

  const run = async () => {
    setBusy(true)
    setFailure(null)
    try {
      await port.update({ id: revision.documentId, data: revision.body })
      onDone()
    } catch (error) {
      // Validation runs on write and the schema may have moved on since this
      // body was published. Saying which field refused is the difference between
      // a dead end and a fix.
      setFailure(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Obnovit tuto verzi?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Zrušit
          </Button>
          <Button variant="primary" onClick={run} loading={busy}>
            Obnovit do konceptu
          </Button>
        </>
      }
    >
      <p className={styles.destroyWho}>
        Verze bloku <strong>{title}</strong> z {stamp(revision.changedAt)} se zapíše do{" "}
        <strong>konceptu</strong>. Na webu zůstane to, co tam je teď — obnovená verze se zveřejní až
        publikováním, stejně jako každá jiná změna.
      </p>
      {failure ? <ErrorState error={failure} compact /> : null}
    </Modal>
  )
}

/* ============================================================== as of T == */

/**
 * One editing-free session per Studio, refcounted, with the close deferred by a
 * microtask — EditView's arrangement, against the same React behaviour.
 *
 * `reactStrictMode` is on, so every mount is "mount, tear down, mount again" and
 * both halves set a cookie on their response. Issued in order they need not
 * arrive in order: a close between the two mounts can land after the second open
 * and switch the moment back off, leaving a frame that shows today's site under
 * yesterday's date — silent, dev-only, and the one failure ARCHIVE.md opens by
 * naming.
 */
let momentRefs = 0
let momentClosing = false

const openMoment = (at) => {
  momentRefs += 1
  momentClosing = false
  return fetch(`/api/studio/asof?at=${encodeURIComponent(at)}`, { headers: { Accept: "application/json" } })
}

const releaseMoment = () => {
  momentRefs -= 1
  if (momentRefs > 0) return
  momentClosing = true
  queueMicrotask(() => {
    if (!momentClosing) return
    try {
      // `keepalive` so the request outlives the React tree that started it —
      // this usually runs during the navigation that unmounted the view. A
      // moment cookie left behind would render every page in this browser at a
      // date nobody asked for any more.
      fetch("/api/studio/asof?session=close", { keepalive: true })
    } catch {
      /* see above */
    }
  })
}

/**
 * The site, framed, as it stood at a moment.
 *
 * The same hook, the same stage, the same device presets as the preview and the
 * editor — ARCHIVE.md's "tentýž rám, tytéž viewporty, jen třetí čtečka". Two
 * things are deliberately not the same, and they are two refusals rather than
 * one because they fail differently:
 *
 *   `annotated: false`  the framed URL carries no `?edit=1`, so `editable()`
 *                       never arms and the framed page emits no `data-cms-*`.
 *   `editing` unset     no overlay is mounted into it.
 *
 * The moment itself is on none of those URLs. It rides in Next's signed,
 * encrypted preview cookie, issued only by /api/studio/asof and only to a
 * signed-in owner — so the withdrawn and superseded bodies this replays are not
 * reachable by typing anything onto a public address. See
 * src/cms/server/site/archive.js.
 */
function AsOfFrame({ at, sitePath, onNavigate, backHref }) {
  const router = useStudioRouter()
  const [session, setSession] = useState({ status: "opening", pages: [], error: null })

  useEffect(() => {
    let live = true
    // Reset, not just re-request. Switching moments has to take the frame down
    // first: a frame still showing March under an April heading is the one
    // failure ARCHIVE.md opens by naming, and it is what leaving `status: open`
    // through the change would produce for as long as the new cookie is in
    // flight.
    setSession({ status: "opening", pages: [], error: null })
    openMoment(at)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.message || `Server odpověděl ${response.status}`)
        }
        return response.json()
      })
      .then(
        (body) => live && setSession({ status: "open", pages: body.pages || [], error: null }),
        (error) => live && setSession({ status: "failed", pages: [], error }),
      )
    return () => {
      live = false
      releaseMoment()
    }
  }, [at])

  // What the screen is allowed to claim about this replay. Asked per moment and
  // per page, because the list limits it reports are the ones the framed route
  // is actually applying. See src/pages/api/studio/moment.js.
  const { data: moment } = useAsync(async () => {
    const query = new URLSearchParams({ at })
    if (sitePath) query.set("route", sitePath)
    const response = await fetch(`/api/studio/moment?${query}`, { headers: { Accept: "application/json" } })
    return response.ok ? response.json() : null
  }, [at, sitePath])

  // Not pointed anywhere until the cookie is set: a frame loaded without it
  // renders today's published page and would look exactly like a moment that
  // worked.
  const framed = session.status === "open" ? sitePath : null

  /**
   * The moment, as the cache buster.
   *
   * The framed URL is the site's own address and carries nothing about which
   * instant is being replayed — that is the whole point of the cookie. Which
   * means two different moments produce the SAME `src`, and an iframe whose src
   * does not change does not reload. So the instant goes in as the buster: it
   * changes exactly when the moment does, and `?r=` is already a parameter the
   * frame contract owns and the page ignores.
   */
  const frame = useFrameSurface({ sitePath: framed, bust: at, onNavigate, annotated: false })

  return (
    <div className={styles.frameView}>
      <header className={styles.frameHead}>
        <Button variant="ghost" size="sm" icon="arrowLeft" onClick={() => router.push(backHref)}>
          Zpět na archiv
        </Button>
        <span className={styles.frameTitle}>
          Obsah k <strong>{stamp(at)}</strong>
        </span>
        <span className={preview.spacer} />
        <PagePicker idPrefix="archive" pages={session.pages} current={sitePath} onNavigate={onNavigate} />
        <span className={preview.divider} aria-hidden="true" />
        <DevicePicker
          idPrefix="archive"
          device={frame.device}
          presetId={frame.presetId}
          rotated={frame.rotated}
          custom={frame.custom}
          onSelectPreset={frame.selectPreset}
          onCustom={frame.setCustom}
          onRotate={frame.rotate}
        />
        <span className={preview.divider} aria-hidden="true" />
        <ZoomControls zoom={frame.zoom} fitting={frame.fitting} onZoom={frame.zoomBy} onFit={frame.fit} />
      </header>

      <MomentCaveat at={at} moment={moment} />

      <div
        className={`${preview.stage} ${styles.frameStage}`}
        ref={frame.stageRef}
        data-ready={frame.ready ? "true" : "false"}
      >
        {session.status === "failed" ? (
          <ErrorState error={session.error} onRetry={() => router.replace(router.asPath)} />
        ) : session.status === "opening" ? (
          <span className={styles.booting}>
            <Spinner size={18} />
            <span>Připravuji stránku…</span>
          </span>
        ) : (
          <Stage
            ref={frame.frameRef}
            src={frame.src}
            width={frame.device.w}
            height={frame.device.h}
            zoom={frame.zoom}
            measured={frame.measured}
            onLoad={frame.onFrameLoad}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Everything this replay is NOT, in one strip, on screen the whole time.
 *
 * ARCHIVE.md fixes what may and may not be said: *"tohle je obsah z 3. března,
 * přehraný dnešním kódem; kód z té doby byl abc1234"* is a true statement and
 * *"takhle web vypadal"* is not. So the first sentence is unconditional and the
 * rest is added only where the server can support it.
 *
 * Three limits, each printed only when it is real:
 *
 *   the BUILD. `build_id` is `VERCEL_GIT_COMMIT_SHA` and is null in development
 *   and in any deployment that does not set `CMS_BUILD_ID` — so the sentence
 *   naming the commit appears only when there is a commit to name. Where there
 *   is not, the strip says the deployment was not recorded rather than printing
 *   "kód z té doby byl null", which would read as a fact.
 *
 *   the LIST LIMITS. `cms.config.js` is code, not data: no revision records what
 *   `reviews: { limit: 12 }` said in March, so the replay applies today's. It
 *   only bites where the archive holds more documents of a type than the limit —
 *   the render then shows the right documents in the right order and possibly
 *   the wrong number of them. The limits actually applied are named, because a
 *   number a reader can check beats a warning they cannot.
 *
 *   the REVISION COUNT behind the reconstruction, which is what says whether
 *   there was anything to reconstruct from at all. It matters most when it is
 *   small: history starts the day the first revision is written, so a moment
 *   near that day replays a site most of whose blocks the archive has never
 *   heard of — and those render the copy hardcoded in their components. A page
 *   that looks unexpectedly bare is then explained on the page rather than
 *   guessed at.
 */
function MomentCaveat({ at, moment }) {
  const limits = Object.entries(moment?.limits || {}).filter(([, limit]) => limit != null)

  return (
    <p className={styles.strip} role="status">
      <Icon name="info" size={13} className={styles.stripIcon} />
      <span>
        Obsah k <strong>{stamp(at)}</strong>, přehraný <strong>dnešním kódem</strong>. Není to snímek
        stránky — rozvržení, animace i texty zapsané v komponentách jsou dnešní. Nic v tomhle rámu nejde
        upravit.
        {moment?.buildId ? (
          <>
            {" "}
            Kód z té doby byl <code className={styles.build}>{moment.buildId}</code>
            {moment.sameBuild ? " — tentýž, který běží teď." : `, teď běží ${moment.buildIdNow || "neznámý build"}.`}
          </>
        ) : (
          " Které nasazení tehdy běželo, archiv nezaznamenal."
        )}
        {limits.length ? (
          <>
            {" "}
            Seznamy jsou omezené dnešními limity ({limits.map(([name, limit]) => `${name} ${limit}`).join(", ")}) —
            ty se neverzují, takže počet položek může být jiný než tehdy.
          </>
        ) : null}
        {moment && moment.valid ? (
          <>
            {" "}
            Rekonstrukce stojí na{" "}
            <strong>{plural(moment.revisions, "revizi", "revizích", "revizích")}</strong>, které archiv k
            tomuto okamžiku má
            {moment.revisions === 0
              ? " — tedy na žádných. Bloky, o kterých archiv nic neví, se vykreslí texty zabudovanými v kódu."
              : "."}
          </>
        ) : null}
      </span>
    </p>
  )
}
