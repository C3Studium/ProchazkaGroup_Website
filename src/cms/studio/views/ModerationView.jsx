import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { useCore, usePort, useRevision } from "../context/StudioProvider"
import { useToast } from "../context/ToastProvider"
import { useAsync } from "../hooks/useAsync"
import { APPROVED, PENDING, QUEUES, QUEUE_FILTERS, approvedBody, looksLikeJunk } from "../lib/moderation"
import { bodyOf } from "../lib/documents"
import { form, formatRelative, plural } from "../lib/format"
import { hrefs } from "../lib/routes"
import { Button, Checkbox, IconButton, Segmented } from "../ui/controls"
import { Badge, EmptyState, ErrorState, SkeletonRows } from "../ui/feedback"
import { ConfirmDialog } from "../ui/Modal"
import Icon from "../ui/Icon"
import { ResultCount, Spacer, ViewBody, ViewHeader, ViewToolbar } from "./ViewLayout"
import styles from "./ModerationView.module.scss"

const PER_PAGE = 50

/**
 * The review queue — the screen this client opens most, so it is built for
 * throughput rather than for looking like the rest of the admin.
 *
 * What that means concretely:
 *
 * - The full review text is on the row. Moderating means reading; a queue that
 *   makes you open each item to read it is a queue that does not get worked.
 * - Approve and reject are one click each, no confirmation, with an undo toast.
 *   Cheap mistakes beat careful prompts when there are twenty items to clear.
 * - j/k to move, a to approve, r to reject. The keyboard path is the fast path.
 * - Approving is publishing. `status` is what the public site reads, so there is
 *   no second flag that could disagree with it (see lib/moderation.js).
 */
export default function ModerationView() {
  const port = usePort()
  const core = useCore()
  const router = useRouter()
  const toast = useToast()
  const { revision, bump } = useRevision()

  const type = core.getType("review")
  const [queue, setQueue] = useState(PENDING)
  const [selected, setSelected] = useState(() => new Set())
  const [cursor, setCursor] = useState(0)
  const [busy, setBusy] = useState(() => new Set())
  const [confirmBulk, setConfirmBulk] = useState(null)

  const { data, error, loading, reload, setData } = useAsync(
    () =>
      type
        ? port.list({ type: "review", filters: QUEUE_FILTERS[queue], sort: [{ field: "submittedAt", direction: "desc" }], perPage: PER_PAGE })
        : Promise.resolve(null),
    [port, type, queue, revision],
  )

  const rows = useMemo(() => data?.rows || [], [data])
  const total = data?.total || 0

  // Selection and cursor are per-queue; carrying them across tabs would let a
  // bulk action fire on rows that are no longer on screen.
  useEffect(() => {
    setSelected(new Set())
    setCursor(0)
  }, [queue])

  const markBusy = (ids, on) =>
    setBusy((current) => {
      const next = new Set(current)
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
      return next
    })

  /** Drops rows from the local list immediately — the queue must feel instant. */
  const dropRows = useCallback(
    (ids) => {
      const gone = new Set(ids)
      setData((current) =>
        current ? { rows: current.rows.filter((row) => !gone.has(row.id)), total: Math.max(0, current.total - ids.length) } : current,
      )
      setSelected((current) => new Set([...current].filter((id) => !gone.has(id))))
    },
    [setData],
  )

  const approve = useCallback(
    async (docs) => {
      const ids = docs.map((doc) => doc.id)
      markBusy(ids, true)
      dropRows(ids)
      try {
        for (const doc of docs) {
          // `approved` is written in the same breath as the publish purely so
          // stored data never shows a published review marked unapproved.
          await port.update({ id: doc.id, data: approvedBody(bodyOf(doc)) })
          await port.publish({ id: doc.id })
        }
        bump()
        toast.success(`Schváleno: ${plural(docs.length, "recenze", "recenze", "recenzí")}`, {
          description: "Je vidět na webu.",
          action: {
            label: "Vrátit",
            onClick: async () => {
              for (const doc of docs) await port.unpublish({ id: doc.id })
              bump()
              reload()
            },
          },
        })
      } catch (failure) {
        toast.error("Schválení selhalo", { description: failure?.message })
        reload()
      } finally {
        markBusy(ids, false)
      }
    },
    [port, toast, bump, reload, dropRows],
  )

  /**
   * Rejecting deletes. The schema has no third state to record a rejection in,
   * and leaving it a draft would float it back into the queue forever — so the
   * undo re-creates the document from the body still held here. The recreated
   * document gets a new id, which is why this is called out rather than hidden.
   */
  const reject = useCallback(
    async (docs) => {
      const ids = docs.map((doc) => doc.id)
      const bodies = docs.map((doc) => bodyOf(doc))
      markBusy(ids, true)
      dropRows(ids)
      try {
        for (const doc of docs) await port.remove({ id: doc.id })
        bump()
        toast.info(`Zamítnuto: ${plural(docs.length, "recenze", "recenze", "recenzí")}`, {
          description: "Smazáno, na web se nedostane.",
          action: {
            label: "Vrátit",
            onClick: async () => {
              for (const body of bodies) await port.create({ type: "review", data: body })
              bump()
              reload()
            },
          },
        })
      } catch (failure) {
        toast.error("Zamítnutí selhalo", { description: failure?.message })
        reload()
      } finally {
        markBusy(ids, false)
      }
    },
    [port, toast, bump, reload, dropRows],
  )

  const unpublish = useCallback(
    async (docs) => {
      const ids = docs.map((doc) => doc.id)
      markBusy(ids, true)
      dropRows(ids)
      try {
        for (const doc of docs) await port.unpublish({ id: doc.id })
        bump()
        toast.info("Vráceno do fronty", { description: "Recenze už není na webu." })
      } catch (failure) {
        toast.error("Akce selhala", { description: failure?.message })
        reload()
      } finally {
        markBusy(ids, false)
      }
    },
    [port, toast, bump, reload, dropRows],
  )

  const selectedDocs = rows.filter((row) => selected.has(row.id))

  /* Keyboard shortcuts. Bound on the document because the queue has no single
     focusable container that would keep focus through a row disappearing. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      // Only text entry should swallow a shortcut. A checkbox holding focus
      // after a click must not disable the whole keyboard path — which is
      // exactly what selecting a few rows then pressing `a` would hit.
      const target = event.target
      const tag = target?.tagName
      const typing =
        tag === "TEXTAREA" ||
        target?.isContentEditable ||
        (tag === "INPUT" && !["checkbox", "radio", "button", "submit"].includes(target.type))
      if (typing) return
      if (!rows.length) return

      const current = rows[Math.min(cursor, rows.length - 1)]

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault()
        setCursor((index) => Math.min(index + 1, rows.length - 1))
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault()
        setCursor((index) => Math.max(index - 1, 0))
      } else if (event.key === "a" && queue === PENDING && current) {
        event.preventDefault()
        approve([current])
      } else if (event.key === "r" && queue === PENDING && current) {
        event.preventDefault()
        reject([current])
      } else if (event.key === "x" && current) {
        event.preventDefault()
        setSelected((currentSet) => {
          const next = new Set(currentSet)
          if (next.has(current.id)) next.delete(current.id)
          else next.add(current.id)
          return next
        })
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [rows, cursor, queue, approve, reject])

  if (!type) {
    return (
      <EmptyState
        icon="warning"
        title={'Typ „review" v konfiguraci chybí'}
        description="Fronta schvalování potřebuje typ obsahu s názvem review."
      />
    )
  }

  const allSelected = rows.length > 0 && selected.size === rows.length

  return (
    <>
      <ViewHeader
        title="Schvalování recenzí"
        subtitle="Nic z toho není na webu, dokud to neschválíte."
        actions={
          <dl className={styles.shortcuts}>
            <div>
              <dt>
                <kbd>J</kbd>
                <kbd>K</kbd>
              </dt>
              <dd>pohyb</dd>
            </div>
            <div>
              <dt>
                <kbd>A</kbd>
              </dt>
              <dd>schválit</dd>
            </div>
            <div>
              <dt>
                <kbd>R</kbd>
              </dt>
              <dd>zamítnout</dd>
            </div>
            <div>
              <dt>
                <kbd>X</kbd>
              </dt>
              <dd>označit</dd>
            </div>
          </dl>
        }
      />

      <ViewToolbar>
        <Segmented
          options={QUEUES.map((entry) => ({ id: entry.id, title: entry.title, count: entry.id === queue ? total : undefined }))}
          value={queue}
          onChange={setQueue}
        />
        <Spacer />
        {rows.length ? (
          <Checkbox
            checked={allSelected}
            indeterminate={selected.size > 0 && !allSelected}
            onChange={(on) => setSelected(on ? new Set(rows.map((row) => row.id)) : new Set())}
            label="Označit vše"
          />
        ) : null}
        <ResultCount>{plural(total, "recenze", "recenze", "recenzí")}</ResultCount>
      </ViewToolbar>

      <ViewBody>
        {loading && !data ? (
          <SkeletonRows count={6} height={132} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={queue === PENDING ? "check" : "inbox"}
            title={QUEUES.find((entry) => entry.id === queue)?.empty}
            description={
              queue === PENDING
                ? "Nové recenze z webu se objeví tady. Nic se nezveřejní bez vašeho schválení."
                : "Schválené recenze jsou veřejně na webu."
            }
          />
        ) : (
          <ul className={styles.queue}>
            {rows.map((doc, index) => (
              <ReviewCard
                key={doc.id}
                doc={doc}
                type={type}
                queue={queue}
                focused={index === cursor}
                selected={selected.has(doc.id)}
                busy={busy.has(doc.id)}
                onFocus={() => setCursor(index)}
                onSelect={(on) =>
                  setSelected((current) => {
                    const next = new Set(current)
                    if (on) next.add(doc.id)
                    else next.delete(doc.id)
                    return next
                  })
                }
                onApprove={() => approve([doc])}
                onReject={() => reject([doc])}
                onUnpublish={() => unpublish([doc])}
                onOpen={() => router.push(hrefs.editor("review", doc.id))}
              />
            ))}
          </ul>
        )}
      </ViewBody>

      {/* The bulk bar only exists when there is a selection, so it never takes
          space from the queue it is acting on. */}
      {selected.size > 0 ? (
        <div className={styles.bulkDock}>
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>
              {selected.size} {form(selected.size, "označená", "označené", "označených")}{" "}
              {form(selected.size, "recenze", "recenze", "recenzí")}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Zrušit výběr
            </Button>
            <Spacer />
            {queue === PENDING ? (
              <>
                <Button variant="danger" size="sm" icon="close" onClick={() => setConfirmBulk("reject")}>
                  Zamítnout
                </Button>
                <Button variant="positive" size="sm" icon="check" onClick={() => approve(selectedDocs)}>
                  Schválit vše
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" icon="eyeOff" onClick={() => unpublish(selectedDocs)}>
                Stáhnout z webu
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmBulk === "reject"}
        title={`Zamítnout ${plural(selected.size, "recenzi", "recenze", "recenzí")}?`}
        description="Recenze budou smazány. Hned po akci nabídneme vrácení zpět, potom už to nepůjde."
        confirmLabel="Zamítnout"
        onClose={() => setConfirmBulk(null)}
        onConfirm={() => {
          setConfirmBulk(null)
          reject(selectedDocs)
        }}
      />
    </>
  )
}

/**
 * One row of the queue, laid out as three columns: who it is about, what they
 * wrote, and the decision.
 *
 * The identity column is a left rail — name, consultant, when, and any flags —
 * so that the middle column can be nothing but the review text, set at reading
 * size. That separation is the whole point of the screen: you scan the rail to
 * see who, you read the column to judge, and the decision is one reach to the
 * right. The old row interleaved all three on one line and then put the message
 * underneath in muted grey, which made the thing you came to read the least
 * legible element in the row.
 *
 * The actions resolve on the row under the cursor rather than being painted on
 * every row at once. j/k and the mouse both move that cursor, so they are always
 * present where the eye already is — and the queue at rest is a wall of text
 * instead of forty coloured buttons.
 */
function ReviewCard({ doc, type, queue, focused, selected, busy, onFocus, onSelect, onApprove, onReject, onUnpublish, onOpen }) {
  const body = bodyOf(doc)
  const preview = type.preview?.(body, doc) || {}
  const junk = queue === PENDING && looksLikeJunk(body)

  return (
    <li
      className={`${styles.row} ${focused ? styles.rowFocused : ""} ${selected ? styles.rowSelected : ""} ${busy ? styles.rowBusy : ""}`}
      onMouseEnter={onFocus}
    >
      <div className={styles.select}>
        <Checkbox checked={selected} onChange={onSelect} />
      </div>

      <div className={styles.who}>
        <span className={styles.name}>{body.customerName || "Bez jména"}</span>
        {body.consultantName ? (
          <span className={styles.about}>
            o poradci <strong>{body.consultantName}</strong>
          </span>
        ) : null}
        <span className={styles.when}>{formatRelative(body.submittedAt || doc.createdAt)}</span>

        {junk || body.hashtag === "benefitprogram" || body.source === "import" || queue === APPROVED ? (
          <span className={styles.flags}>
            {junk ? (
              <Badge tone="danger" dot title="Krátký nebo testovací text — pravděpodobně smetí">
                vypadá jako smetí
              </Badge>
            ) : null}
            {body.hashtag === "benefitprogram" ? <Badge tone="neutral">Benefit program</Badge> : null}
            {body.source === "import" ? <Badge tone="neutral">Import</Badge> : null}
            {queue === APPROVED ? (
              <Badge tone="positive" dot>
                na webu
              </Badge>
            ) : null}
          </span>
        ) : null}
      </div>

      {/* The whole message, not a preview. Long reviews are the ones that
          actually need judgement, so truncating them defeats the screen. */}
      <div className={styles.read}>
        <p className={styles.message}>{body.message || <em className={styles.noMessage}>Bez textu</em>}</p>
        {preview.subtitle && !body.message ? <p className={styles.fallbackSub}>{preview.subtitle}</p> : null}
      </div>

      <div className={styles.decide}>
        {queue === PENDING ? (
          <>
            <Button variant="danger" size="sm" icon="close" disabled={busy} onClick={onReject}>
              Zamítnout
            </Button>
            <Button variant="positive" size="sm" icon="check" disabled={busy} onClick={onApprove}>
              Schválit
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" icon="eyeOff" disabled={busy} onClick={onUnpublish}>
            Stáhnout
          </Button>
        )}
        <IconButton icon="external" label="Otevřít v editoru" onClick={onOpen} />
      </div>
    </li>
  )
}
