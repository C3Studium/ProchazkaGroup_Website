import { useCallback, useEffect, useMemo, useState } from "react"
import { useStudioRouter } from "../../runtime/navigation.jsx"
import { useCore, usePort, useRevision } from "../context/StudioProvider.jsx"
import { useToast } from "../context/ToastProvider.jsx"
import { useAsync } from "../hooks/useAsync.js"
import {
  APPROVED,
  PENDING,
  QUEUES,
  REJECTED,
  REJECTION_REASONS,
  approvedBody,
  looksLikeJunk,
  queueQuery,
  rejectionOf,
} from "../lib/moderation.js"
import { bodyOf } from "../lib/documents.js"
import { publishOutcome, withdrawOutcome } from "../lib/publishing.js"
import { form, formatDateTime, formatRelative, plural } from "../lib/format.js"
import { hrefs } from "../lib/routes.js"
import { Button, Checkbox, IconButton, Segmented } from "../ui/controls.jsx"
import { Badge, EmptyState, ErrorState, SkeletonRows } from "../ui/feedback.jsx"
import { Modal } from "../ui/Modal.jsx"
import Icon from "../ui/Icon.jsx"
import { ResultCount, Spacer, ViewBody, ViewHeader, ViewToolbar } from "./ViewLayout.jsx"
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
 * - Approve is one click, no confirmation, with an undo toast. Cheap mistakes
 *   beat careful prompts when there are twenty items to clear.
 * - Reject is two, and the second click is the reason. See below.
 * - j/k to move, a to approve, r to reject, x to select. The keyboard path is
 *   the fast path.
 * - Approving is publishing. `status` is what the public site reads, so there is
 *   no second flag that could disagree with it (see lib/moderation.js).
 *
 * ---------------------------------------------------------------------------
 * Rejecting used to delete, and `r` used to do it on its own
 *
 * `reject()` called `port.remove()`; the row was gone, and the only way back was
 * a toast that lived 7.5 seconds and re-created the review under a NEW id. `r`
 * was bound on window with no modifier, so a keystroke aimed at anything that
 * was not a text field destroyed whatever the cursor happened to be on.
 *
 * Rejecting now archives and stamps a reason (lib/moderation.js has the whole
 * argument, including the consumer-protection half). That makes it reversible
 * for as long as anybody wants, which by this project's own stated principle —
 * DocumentListView.jsx, "a confirmation on a reversible action teaches people to
 * click through confirmations" — means it must NOT grow a confirmation dialog.
 *
 * So `r` does not ask "are you sure". It asks "why", which is a different
 * question and the one the record actually needs:
 *
 *   - `r` arms the row: the decision column becomes six reasons.
 *   - `1`–`6` commits one. `Escape`, or any other shortcut, cancels.
 *
 * A stray `r` therefore changes nothing but the pixels under the cursor, and the
 * keystroke that does commit is the keystroke that supplies the one piece of
 * information a rejection has to carry. Nobody is trained to press through
 * anything, because there is nothing to press through — the second key is not a
 * confirmation, it is the answer.
 */
export default function ModerationView() {
  const port = usePort()
  const core = useCore()
  const router = useStudioRouter()
  const toast = useToast()
  const { revision, bump } = useRevision()

  const type = core.getType("review")
  const [queue, setQueue] = useState(PENDING)
  const [selected, setSelected] = useState(() => new Set())
  const [cursor, setCursor] = useState(0)
  const [busy, setBusy] = useState(() => new Set())
  // The id of the row whose reason picker is open, or null. One at a time: two
  // open pickers would leave the digit keys ambiguous.
  const [picking, setPicking] = useState(null)
  const [bulkReject, setBulkReject] = useState(false)

  const { data, error, loading, reload, setData } = useAsync(
    () => (type ? port.list({ type: "review", perPage: PER_PAGE, ...queueQuery(queue) }) : Promise.resolve(null)),
    [port, type, queue, revision],
  )

  /**
   * All three totals, not just the open tab's.
   *
   * The tabs used to show a count only for the queue you were already looking
   * at, which is the one number you can also read off the screen. Three of them
   * add up to every review in the system, and that is the property this screen
   * has to make visible: nothing falls out of the queue any more, so a review
   * that left "čeká" is in one of the other two and the sum says so.
   */
  const { data: counts } = useAsync(
    async () => {
      if (!type) return null
      const totals = await Promise.all(
        QUEUES.map((entry) => port.list({ type: "review", perPage: 1, ...queueQuery(entry.id) })),
      )
      return Object.fromEntries(QUEUES.map((entry, index) => [entry.id, totals[index]?.total || 0]))
    },
    [port, type, revision],
  )

  const rows = useMemo(() => data?.rows || [], [data])
  const total = data?.total || 0

  // Selection and cursor are per-queue; carrying them across tabs would let a
  // bulk action fire on rows that are no longer on screen.
  useEffect(() => {
    setSelected(new Set())
    setCursor(0)
    setPicking(null)
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
        // At once rather than one after another, and the reason is on the
        // server: each publish regenerates the four pages a review is on, and
        // the server can only collapse two of those into one render if the two
        // requests overlap. Measured on a queue of twenty-two — eighty-eight
        // renders one after another, forty when they are fired together. The
        // pair inside stays ordered: `approved` is written in the same breath
        // as the publish purely so stored data never shows a published review
        // marked unapproved. See server/revalidate.js.
        const reports = await Promise.all(
          docs.map(async (doc) => {
            await port.update({ id: doc.id, data: approvedBody(bodyOf(doc)) })
            const published = await port.publish({ id: doc.id })
            return published?.revalidation
          }),
        )
        bump()
        const outcome = publishOutcome(reports)
        const title = `Schváleno: ${plural(docs.length, "recenze", "recenze", "recenzí")}`
        const undo = {
          label: "Vrátit",
          onClick: async () => {
            await Promise.all(docs.map((doc) => port.unpublish({ id: doc.id })))
            bump()
            reload()
          },
        }
        if (outcome.ok) toast.success(title, { description: outcome.description, action: undo })
        // The publish went through and the site did not follow. A danger toast
        // for a successful action reads wrong, but a positive one for a page
        // that still shows the old queue reads worse — and this one has to be
        // read, so it also keeps the undo.
        else toast.error(title, { description: outcome.description, action: undo, duration: 12000 })
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
   * Reject. One call per review, and the id survives it.
   *
   * The undo is still offered because it is the fastest way back from a misfire,
   * but it is no longer the ONLY way back and it no longer re-creates anything:
   * it calls `requeue` on the same document. A rejection that scrolls off the
   * toast is recoverable next week from the Zamítnuté tab.
   *
   * One after another rather than in parallel, unlike approve(): a rejection
   * publishes nothing, so there is no render for the server to collapse, and a
   * batch of twenty writing `archived_at` at the same instant would only make the
   * rejection times harder to read afterwards.
   */
  const reject = useCallback(
    async (docs, reason) => {
      const ids = docs.map((doc) => doc.id)
      markBusy(ids, true)
      setPicking(null)
      dropRows(ids)
      try {
        for (const doc of docs) await port.reject({ id: doc.id, reason })
        bump()
        toast.info(`Zamítnuto: ${plural(docs.length, "recenze", "recenze", "recenzí")}`, {
          // Czech agrees with the count in three ways in one sentence, so it is
          // built from `form()` rather than written once and left wrong for the
          // other two cases.
          description:
            `Důvod: ${rejectionOf({ rejectedReason: reason })?.title || reason}. ` +
            `${form(docs.length, "Zůstává uložená", "Zůstávají uložené", "Zůstávají uložené")} v záložce Zamítnuté — ` +
            `na web se ${form(docs.length, "nedostane", "nedostanou", "nedostanou")}.`,
          action: {
            label: "Vrátit do fronty",
            onClick: async () => {
              for (const doc of docs) await port.requeue({ id: doc.id })
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

  /** Out of the rejected tab and back into the queue, with the same id. */
  const requeue = useCallback(
    async (docs) => {
      const ids = docs.map((doc) => doc.id)
      markBusy(ids, true)
      dropRows(ids)
      try {
        for (const doc of docs) await port.requeue({ id: doc.id })
        bump()
        toast.info(`Vráceno do fronty: ${plural(docs.length, "recenze", "recenze", "recenzí")}`, {
          description:
            `${form(docs.length, "Čeká", "Čekají", "Čekají")} na schválení. ` +
            "Zamítnutí zůstává zapsané v archivu změn.",
        })
      } catch (failure) {
        toast.error("Vrácení selhalo", { description: failure?.message })
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
        // Concurrent for the same reason approve() is: one render of /recenze
        // for the whole batch rather than one each.
        const reports = await Promise.all(docs.map((doc) => port.unpublish({ id: doc.id })))
        bump()
        const outcome = withdrawOutcome(reports.map((doc) => doc?.revalidation))
        if (outcome.ok) toast.info("Vráceno do fronty", { description: outcome.description })
        else toast.error("Vráceno do fronty", { description: outcome.description, duration: 12000 })
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
     focusable container that would keep focus through a row disappearing.

     `r` arms rather than acts — see the module comment. Everything destructive
     that a single unmodified keystroke can still reach from here is reversible
     from a tab that is one click away. */
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

      // An armed row owns the digits and nothing else. Any other shortcut
      // disarms it and stops there, so the keystroke after a mistyped `r` can
      // never be read as a decision.
      if (picking) {
        const index = Number.parseInt(event.key, 10)
        if (Number.isInteger(index) && index >= 1 && index <= REJECTION_REASONS.length) {
          event.preventDefault()
          const doc = rows.find((row) => row.id === picking)
          if (doc) reject([doc], REJECTION_REASONS[index - 1].value)
          return
        }
        if (["Escape", "j", "k", "a", "r", "x", "ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault()
          setPicking(null)
        }
        return
      }

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
        setPicking(current.id)
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
  }, [rows, cursor, queue, picking, approve, reject])

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
  const active = QUEUES.find((entry) => entry.id === queue)

  return (
    <>
      <ViewHeader
        title="Schvalování recenzí"
        /* The queue's own sentence, not one sentence for all of them. The old
           subtitle — "Nic z toho není na webu, dokud to neschválíte" — was
           printed above the Schválené tab too, where every row is on the web and
           it said the opposite of the truth. `hint` has been on each queue since
           they were written; nothing was reading it. */
        subtitle={active?.hint}
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
              <dd>zamítnout (pak vyberte důvod)</dd>
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
          options={QUEUES.map((entry) => ({
            id: entry.id,
            title: entry.title,
            count: counts ? counts[entry.id] : entry.id === queue ? total : undefined,
          }))}
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
            icon={queue === PENDING ? "check" : queue === REJECTED ? "archive" : "inbox"}
            title={active?.empty}
            description={
              queue === PENDING
                ? "Nové recenze z webu se objeví tady. Nic se nezveřejní bez vašeho schválení."
                : queue === APPROVED
                  ? "Schválené recenze jsou veřejně na webu."
                  : "Zamítnutá recenze se nemaže — zůstane tady i s důvodem a datem."
            }
          />
        ) : (
          <ul className={styles.queue} aria-label={`Recenze — ${active?.title}`}>
            {rows.map((doc, index) => (
              <ReviewCard
                key={doc.id}
                doc={doc}
                type={type}
                queue={queue}
                focused={index === cursor}
                position={{ index: index + 1, of: rows.length }}
                selected={selected.has(doc.id)}
                busy={busy.has(doc.id)}
                picking={picking === doc.id}
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
                onPick={() => setPicking(doc.id)}
                onCancelPick={() => setPicking(null)}
                onReject={(reason) => reject([doc], reason)}
                onRequeue={() => requeue([doc])}
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
                <Button variant="danger" size="sm" icon="close" onClick={() => setBulkReject(true)}>
                  Zamítnout
                </Button>
                <Button variant="positive" size="sm" icon="check" onClick={() => approve(selectedDocs)}>
                  Schválit vše
                </Button>
              </>
            ) : queue === REJECTED ? (
              <Button variant="secondary" size="sm" icon="unarchive" onClick={() => requeue(selectedDocs)}>
                Vrátit do fronty
              </Button>
            ) : (
              <Button variant="secondary" size="sm" icon="eyeOff" onClick={() => unpublish(selectedDocs)}>
                Stáhnout z webu
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* Not a ConfirmDialog any more, and the difference is the whole point:
          there is no "opravdu?" to click through, there is a reason to choose,
          and choosing it is the action. The old copy said "Recenze budou
          smazány… potom už to nepůjde", which stopped being true. */}
      <Modal
        open={bulkReject}
        onClose={() => setBulkReject(false)}
        title={`Zamítnout ${plural(selected.size, "recenzi", "recenze", "recenzí")}?`}
        description={
          `${form(selected.size, "Nezmizí — zůstane", "Nezmizí — zůstanou", "Nezmizí — zůstanou")} i s důvodem ` +
          `v záložce Zamítnuté a na web se ${form(selected.size, "nedostane", "nedostanou", "nedostanou")}. ` +
          `Vrátit ${form(selected.size, "ji", "je", "je")} do fronty jde kdykoli.`
        }
        size="sm"
      >
        <ReasonList
          onPick={(reason) => {
            setBulkReject(false)
            reject(selectedDocs, reason)
          }}
        />
      </Modal>
    </>
  )
}

/**
 * The six reasons, as buttons. Shared by the row and the bulk dialog so the two
 * cannot end up offering different lists.
 *
 * Numbered because the row's keyboard path commits with the digit — the label an
 * eye reads and the key a hand presses have to be the same thing on screen.
 */
function ReasonList({ onPick, compact = false }) {
  return (
    <div className={`${styles.reasons} ${compact ? styles.reasonsCompact : ""}`}>
      {REJECTION_REASONS.map((reason, index) => (
        <button
          key={reason.value}
          type="button"
          className={styles.reason}
          title={reason.hint}
          onClick={() => onPick(reason.value)}
        >
          <kbd className={styles.reasonKey}>{index + 1}</kbd>
          <span className={styles.reasonLabel}>{reason.title}</span>
        </button>
      ))}
    </div>
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
 * every row at once. j/k, the mouse and now the Tab key all move that cursor, so
 * they are always present where the eye already is — and the queue at rest is a
 * wall of text instead of forty coloured buttons.
 *
 * ACCESSIBILITY. The row is a plain `<li>` carrying real buttons, and the cursor
 * is `aria-current`. It is deliberately not a `role="option"` in a listbox with
 * `aria-activedescendant`: an option must not contain focusable descendants, and
 * this row has three — approve, reject and open — that a keyboard user needs to
 * reach directly. So the composite-widget pattern is refused and the two things
 * it was for are done another way. `onFocusCapture` moves the visual cursor to
 * whatever the Tab key just landed on, so focus and cursor can never disagree,
 * and `.decide:focus-within` (the stylesheet) reveals the buttons that focus
 * arrived at — a control you can Tab to and cannot see is worse than one that is
 * not there.
 */
function ReviewCard({
  doc,
  type,
  queue,
  focused,
  position,
  selected,
  busy,
  picking,
  onFocus,
  onSelect,
  onApprove,
  onPick,
  onCancelPick,
  onReject,
  onRequeue,
  onUnpublish,
  onOpen,
}) {
  const body = bodyOf(doc)
  const preview = type.preview?.(body, doc) || {}
  const junk = queue === PENDING && looksLikeJunk(body)
  const rejection = rejectionOf(body)

  return (
    <li
      className={`${styles.row} ${focused ? styles.rowFocused : ""} ${selected ? styles.rowSelected : ""} ${busy ? styles.rowBusy : ""}`}
      aria-current={focused ? "true" : undefined}
      onMouseEnter={onFocus}
      onFocusCapture={onFocus}
    >
      <div className={styles.select}>
        <Checkbox
          checked={selected}
          onChange={onSelect}
          aria-label={`Označit recenzi ${position.index} z ${position.of} — ${body.customerName || "bez jména"}`}
        />
      </div>

      <div className={styles.who}>
        <span className={styles.name}>{body.customerName || "Bez jména"}</span>
        {body.consultantName ? (
          <span className={styles.about}>
            o poradci <strong>{body.consultantName}</strong>
          </span>
        ) : null}
        <span className={styles.when}>{formatRelative(body.submittedAt || doc.createdAt)}</span>

        {/* Who rejected it and when, on the row rather than behind a click. It
            is the answer to the only question anybody opens this tab with. */}
        {body.rejectedAt ? (
          <span className={styles.rejected} title={formatDateTime(body.rejectedAt)}>
            <Icon name="close" size={12} className={styles.rejectedIcon} />
            {/* One element around the whole sentence: every bare text run in a
                flex container becomes its own flex item, which broke this line
                into four of them and wrapped "zamítla" onto a line of its own. */}
            <span>{`zamítla ${body.rejectedBy || "neznámá osoba"}, ${formatRelative(body.rejectedAt)}`}</span>
          </span>
        ) : null}

        {junk || rejection || body.hashtag === "benefitprogram" || body.source === "import" || queue === APPROVED ? (
          <span className={styles.flags}>
            {rejection ? (
              <Badge tone="danger" title={rejection.hint}>
                {rejection.title}
              </Badge>
            ) : null}
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
        {picking ? (
          // The armed state. The reasons replace the two buttons rather than
          // opening over them, so the review's text is never covered by the
          // question about the review's text.
          <div className={styles.picker}>
            <p className={styles.pickerTitle}>Důvod zamítnutí</p>
            <ReasonList compact onPick={onReject} />
            <Button variant="ghost" size="sm" onClick={onCancelPick}>
              Zpět
            </Button>
          </div>
        ) : queue === PENDING ? (
          <>
            <Button variant="danger" size="sm" icon="close" disabled={busy} onClick={onPick}>
              Zamítnout
            </Button>
            <Button variant="positive" size="sm" icon="check" disabled={busy} onClick={onApprove}>
              Schválit
            </Button>
          </>
        ) : queue === REJECTED ? (
          <Button variant="secondary" size="sm" icon="unarchive" disabled={busy} onClick={onRequeue}>
            Vrátit do fronty
          </Button>
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
