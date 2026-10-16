import { Fragment, useCallback, useMemo, useRef, useState } from "react"
import { useStudioRouter } from "../../runtime/navigation.jsx"
import { surfaceFor } from "../../visualEditing.js"
import { useCore, usePort, useRevision, useAuth } from "../context/StudioProvider.jsx"
import { useToast } from "../context/ToastProvider.jsx"
import { useAsync } from "../hooks/useAsync.js"
import { useUnsavedGuard } from "../hooks/useUnsavedGuard.js"
import { defaultGroup, errorsForGroup, fieldGroups } from "../lib/core.js"
import {
  STATE_LABELS,
  bodyOf,
  canDiscardDraft,
  changedFields,
  discardOutcome,
  hasUnpublishedChanges,
  isArchived,
  isEqual,
  previewOf,
  restoreOutcome,
  setPath,
  stateOf,
} from "../lib/documents.js"
import { formatRelative, plural } from "../lib/format.js"
import { publishOutcome, refreshOutcome, withdrawOutcome } from "../lib/publishing.js"
import { hrefs } from "../lib/routes.js"
import FieldRenderer from "../fields/FieldRenderer.jsx"
import { Button, IconButton } from "../ui/controls.jsx"
import { Badge, ErrorState, Spinner } from "../ui/feedback.jsx"
import { ConfirmDialog } from "../ui/Modal.jsx"
import Icon from "../ui/Icon.jsx"
import ConflictDialog from "./ConflictDialog.jsx"
import { ViewBody, ViewHeader } from "./ViewLayout.jsx"
import VisualSurfaceNotice from "./VisualSurfaceNotice.jsx"
import styles from "./DocumentEditorView.module.scss"
import surfaceStyles from "./VisualSurfaceNotice.module.scss"

/**
 * The editor.
 *
 * Three decisions worth stating:
 *
 * - Saving and publishing are separate buttons. Contract 3 keeps edits in
 *   `draft` until `publish()` copies them into `data`, and the client needs to
 *   be able to work on a text without it appearing on the site. A single "Save"
 *   that also published would make that impossible to express.
 *
 * - Validation runs on every change but errors are only *shown* for fields the
 *   editor has touched, until they press save. Showing "Povinné pole" on every
 *   field of a blank new document is noise, not help.
 *
 * - The buffer is local state, flushed on save. Saving per keystroke against a
 *   real server would mean a partially-typed value is what gets published if the
 *   tab closes at the wrong moment.
 */
export default function DocumentEditorView({ type, id, isNew }) {
  const port = usePort()
  const core = useCore()
  const router = useStudioRouter()
  const toast = useToast()
  const { bump } = useRevision()

  const [buffer, setBuffer] = useState(null)
  const [touched, setTouched] = useState(() => new Set())
  const [showAll, setShowAll] = useState(false)
  const [group, setGroup] = useState(null)
  const [busy, setBusy] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [conflict, setConflict] = useState(null)
  /**
   * The body this tab loaded, moved forward on every successful save.
   *
   * It was the unsaved-change guard's reference and it is now also the merge's
   * base — the same value answers both questions, because both are "what did
   * this tab start from". See lib/merge.js for why that is a better ancestor
   * than the last published body.
   */
  const baseline = useRef(null)

  const { data: doc, error, loading, reload, setData } = useAsync(async () => {
    if (isNew) {
      // A new document is not created server-side until the first save, so an
      // abandoned "New" leaves nothing behind.
      const body = core.emptyDocument(type)
      baseline.current = body
      setBuffer(body)
      return null
    }
    const loaded = await port.get({ id })
    const body = bodyOf(loaded)
    baseline.current = body
    setBuffer(body)
    return loaded
  }, [port, core, type, id, isNew])

  /**
   * Is this document one whose copy is edited by clicking the page?
   *
   * Keyed off the buffer rather than the loaded document, so it answers
   * correctly while an editor is typing a key into a new block — the notice
   * appears the moment the key matches, which is the moment it becomes true.
   */
  const surface = useMemo(() => surfaceFor(type?.name, buffer), [type, buffer])

  /**
   * The top-level fields the page owns, and therefore the ones that lose their
   * input here. A surface lists paths (`items.*.label`); an input is a whole
   * field (`items`), so the head of each path is what matters.
   *
   * Everything else on the document keeps its input. See VisualSurfaceNotice
   * for why that is not a compromise.
   */
  const lockedFields = useMemo(
    () => new Set((surface?.fields || []).map((entry) => String(entry.path).split(".")[0])),
    [surface],
  )

  const { role } = useAuth()

  const groups = useMemo(() => fieldGroups(type, role), [type, role])
  // A schema can mark one group `default: true`; honour it instead of always
  // opening the first tab.
  const activeGroup = groups.find((entry) => entry.name === group) || defaultGroup(groups)

  const validation = useMemo(
    () => (buffer ? core.validateDocument(type, buffer) : { ok: true, errors: [] }),
    [core, type, buffer],
  )

  const visibleErrors = useMemo(
    () => (showAll ? validation.errors : validation.errors.filter((entry) => touched.has(entry.path))),
    [validation.errors, touched, showAll],
  )

  const dirty = buffer != null && !isEqual(buffer, baseline.current)

  /**
   * Is there anything for Publikovat to do?
   *
   * Three things have to be false for the answer to be no: the form has no
   * unsaved edits, the document has no draft waiting, and it is already out on
   * the site. Miss any one of them and the button would go grey while there was
   * still something to publish.
   *
   * Why it matters more than a grey button usually does: publishing writes a
   * row to cms_document_revision, so a second press on an unchanged document
   * used to put a duplicate version in the archive — measured at three presses,
   * three identical rows. The server refuses that now (server/documents.js
   * answers `unchanged` and records nothing), which is where the rule belongs,
   * because a rule only the UI enforces is one a stale tab gets around. This
   * button is the other half: an editor should be able to SEE that there is
   * nothing to publish rather than press and be told.
   */
  const nothingToPublish =
    !isNew && !dirty && doc?.status === "published" && !hasUnpublishedChanges(doc)
  useUnsavedGuard(dirty)

  const update = useCallback((path, value) => {
    setBuffer((current) => setPath(current, path, value))
    setTouched((current) => new Set(current).add(path))
  }, [])

  const save = async ({ publish = false } = {}) => {
    // A blocked publish is the moment every error becomes relevant, so reveal
    // them all — including for fields on tabs the editor has not opened.
    if (!validation.ok) {
      setShowAll(true)
      const firstGroup = groups.find((entry) => errorsForGroup(validation.errors, entry).length)
      if (firstGroup) setGroup(firstGroup.name)
      toast.error(`Zkontrolujte ${validation.errors.length === 1 ? "jedno pole" : "vyplněná pole"}`, {
        description: validation.errors[0]?.message,
      })
      return
    }

    setBusy(publish ? "publish" : "save")
    try {
      let saved = doc
      if (isNew && !doc) {
        saved = await port.create({ type: type.name, data: buffer })
      } else {
        // `baseVersion` is the `updatedAt` of the document this tab is holding.
        // The server refuses the write if the stored one has moved past it,
        // which is the whole of "B's save no longer erases A's" — see
        // server/documents.js. Sent on every save rather than only when the tab
        // has been open a while: staleness is not a function of elapsed time,
        // it is a function of somebody else having written.
        saved = await port.update({ id: saved.id, data: buffer, baseVersion: saved.updatedAt })
      }

      // The publish answer carries the report of which pages were regenerated;
      // the save answer does not, and cannot — an update writes `draft` and the
      // public site is untouched by it. That is the whole difference between the
      // two sentences below.
      if (publish) saved = await port.publish({ id: saved.id })
      const outcome = publish ? publishOutcome(saved?.revalidation) : null

      baseline.current = bodyOf(saved)
      setBuffer(bodyOf(saved))
      setData(saved)
      setShowAll(false)
      setTouched(new Set())
      bump()

      if (!publish) toast.success("Uloženo jako koncept")
      else if (outcome.ok) toast.success("Publikováno", { description: outcome.description })
      else toast.error("Publikováno, web se neobnovil", { description: outcome.description, duration: 12000 })

      // A newly created document needs a real URL, otherwise a refresh loses it.
      if (isNew) router.replace(hrefs.editor(type.name, saved.id), undefined, { shallow: true })
    } catch (failure) {
      // A refused write is the one failure with something to offer instead of a
      // sentence. Everything needed to resolve it is already here except what
      // is stored, so that is read and the three bodies go to the dialog. The
      // buffer is NOT touched: the editor's typing stays on the screen behind
      // it, and stays there if they cancel.
      if (failure?.code === "conflict" && doc) await openConflict(failure, publish)
      else toast.error("Uložení selhalo", { description: failure?.message })
    } finally {
      setBusy(null)
    }
  }

  /**
   * Read what is stored and put the three bodies in front of the editor.
   *
   * The read can itself fail — a dead session, a document somebody deleted —
   * and then there is no merge to offer, so the original refusal is reported as
   * it would have been before any of this existed.
   */
  const openConflict = async (failure, wasPublish = false) => {
    try {
      const fresh = await port.get({ id: doc.id })
      setConflict({ doc: fresh, base: baseline.current, mine: buffer, theirs: bodyOf(fresh), wasPublish })
    } catch {
      toast.error("Uložení selhalo", { description: failure?.message })
    }
  }

  /**
   * One deliberate write, version-checked like any other.
   *
   * `baseVersion` is the version of the document the dialog was built from, not
   * the one this tab loaded — resolving is a save of a body that already
   * accounts for theirs, and the question it has to ask is whether anything has
   * happened SINCE they were shown. Two people resolving at once is exactly
   * that, and the second one is refused and re-shown rather than applied.
   */
  const resolveConflict = async (merged) => {
    setBusy("resolve")
    try {
      const saved = await port.update({ id: doc.id, data: merged, baseVersion: conflict.doc.updatedAt })
      baseline.current = bodyOf(saved)
      setBuffer(bodyOf(saved))
      setData(saved)
      setTouched(new Set())
      setShowAll(false)
      const wasPublish = conflict.wasPublish
      setConflict(null)
      bump()
      // The publish this started as did NOT happen, and saying so is the point:
      // the editor pressed Publikovat, answered a question they did not expect,
      // and would otherwise walk away believing the site had moved. Resolving
      // does not publish on its own either — a body assembled out of two
      // people's work, going live without anybody having looked at it, is the
      // one thing worse than the silence this whole change removes.
      if (wasPublish) {
        toast.success("Sloučeno a uloženo jako koncept", {
          description: "Na webu se zatím nic nezměnilo. Zkontrolujte sloučenou verzi a pak stiskněte Publikovat.",
          duration: 12000,
        })
      } else toast.success("Sloučeno a uloženo jako koncept")
    } catch (failure) {
      if (failure?.code === "conflict") {
        const fresh = await port.get({ id: doc.id }).catch(() => null)
        if (fresh) {
          // `mine` is still the buffer and not the merge that was just refused:
          // the answers were given against a body that has moved, so they are
          // no longer answers. What the editor typed has not moved.
          setConflict({ ...conflict, doc: fresh, theirs: bodyOf(fresh), mine: buffer })
          toast.error("Konflikt verzí", {
            description: "Někdo jiný obsah mezitím změnil ještě jednou. Rozhodněte prosím znovu.",
            duration: 12000,
          })
          return
        }
      }
      toast.error("Sloučení selhalo", { description: failure?.message })
    } finally {
      setBusy(null)
    }
  }

  const runAction = async (action, label) => {
    setBusy(action)
    try {
      const updated = await port[action]({ id: doc.id })
      setData(updated)
      baseline.current = bodyOf(updated)
      setBuffer(bodyOf(updated))
      bump()
      // Unpublish, archive and restore each change what a visitor sees, so each
      // one says which pages it refreshed — and says so when it could not.
      // Restore is the one that cannot promise more than the refresh: what it
      // puts back depends on the state the document was archived in.
      const outcome = (action === 'restore' ? refreshOutcome : withdrawOutcome)(updated?.revalidation)
      if (outcome.ok) toast.success(label, { description: outcome.description })
      else toast.error(label, { description: outcome.description, duration: 12000 })
    } catch (failure) {
      toast.error("Akce selhala", { description: failure?.message })
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  /**
   * Zahodit koncept — its own function rather than another `runAction`, and the
   * difference is the whole point of the action. `runAction` ends by printing
   * which pages were regenerated, because unpublish, archive and restore all
   * change what a visitor sees. This one changes nothing public, has no
   * `revalidation` to report, and says so instead.
   */
  const discardDraft = async () => {
    setBusy("discardDraft")
    try {
      const updated = await port.discardDraft({ id: doc.id })
      setData(updated)
      baseline.current = bodyOf(updated)
      setBuffer(bodyOf(updated))
      setTouched(new Set())
      setShowAll(false)
      bump()
      toast.success("Koncept zahozen", { description: discardOutcome(updated) })
    } catch (failure) {
      toast.error("Zahození selhalo", { description: failure?.message })
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  const remove = async () => {
    setBusy("remove")
    try {
      await port.remove({ id: doc.id })
      bump()
      toast.success("Dokument smazán")
      // The guard must not challenge a navigation away from something deleted.
      baseline.current = buffer
      router.push(hrefs.list(type.name))
    } catch (failure) {
      toast.error("Smazání selhalo", { description: failure?.message })
      setBusy(null)
      setConfirming(null)
    }
  }

  if (loading && !buffer) {
    return (
      <div className={styles.loading}>
        <Spinner size={20} />
      </div>
    )
  }

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!buffer) return null

  const state = STATE_LABELS[stateOf(doc)]
  const preview = previewOf(type, doc || { draft: buffer })
  const title = isNew ? `Nový dokument: ${type.title}` : preview.title
  const archived = isArchived(doc)

  return (
    <>
      <ViewHeader
        breadcrumb={[{ label: type.title || type.name, href: hrefs.list(type.name) }, { label: isNew ? "Nový" : "Detail" }]}
        title={title}
        meta={
          <>
            {!isNew ? (
              <Badge tone={state.tone} dot title={state.hint}>
                {state.label}
              </Badge>
            ) : (
              <Badge tone="neutral">Neuloženo</Badge>
            )}
            {dirty ? <span className={styles.dirtyMark}>neuložené změny</span> : null}
          </>
        }
        subtitle={doc ? `Naposledy upraveno ${formatRelative(doc.updatedAt)}` : "Zatím neuloženo"}
        actions={
          archived ? (
            // An archived document offers exactly two things: put it back, or
            // end it. Save and publish are absent rather than disabled — a
            // "Publikovat" that leaves the document invisible because it is
            // still archived would be a button that lies.
            <>
              <IconButton icon="trash" label="Smazat natrvalo" tone="danger" onClick={() => setConfirming("remove")} />
              <Button variant="primary" icon="unarchive" onClick={() => runAction("restore", "Vráceno z archivu")} loading={busy === "restore"}>
                Vrátit z archivu
              </Button>
            </>
          ) : (
            <>
              {doc?.status === "published" ? (
                <IconButton icon="eyeOff" label="Stáhnout z webu" onClick={() => setConfirming("unpublish")} />
              ) : null}
              {doc ? <IconButton icon="archive" label="Do archivu" onClick={() => setConfirming("archive")} /> : null}
              {doc ? <IconButton icon="trash" label="Smazat" tone="danger" onClick={() => setConfirming("remove")} /> : null}
              {/* The exact opposite of the button next to it, and named as one:
                  Uložit koncept / Zahodit koncept. It appears whenever a draft
                  exists — including one that happens to repeat what is
                  published, which is how the ten no-op drafts left over from
                  testing are cleared without anybody hunting for them — and it
                  is absent when there is no published body to fall back to,
                  because a discard there would empty the document rather than
                  revert it. `canDiscardDraft` says why. */}
              {canDiscardDraft(doc) ? (
                <Button
                  variant="ghost"
                  icon="refresh"
                  title="Vrátí dokument k poslední publikované verzi. Na webu se nic nezmění."
                  onClick={() =>
                    hasUnpublishedChanges(doc) ? setConfirming("discardDraft") : discardDraft()
                  }
                  loading={busy === "discardDraft"}
                >
                  Zahodit koncept
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => save()} loading={busy === "save"} disabled={!dirty && !isNew}>
                Uložit koncept
              </Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => save({ publish: true })}
                loading={busy === "publish"}
                disabled={nothingToPublish}
                title={
                  nothingToPublish
                    ? "Na webu už je tahle verze — publikovat není co"
                    : "Zveřejní tenhle dokument na webu"
                }
              >
                {doc?.status === "published" ? "Publikovat změny" : "Publikovat"}
              </Button>
            </>
          )
        }
      />

      {archived ? (
        <p className={styles.archivedNote} role="status">
          <Icon name="archive" size={14} />
          <span>
            Tento záznam je v archivu, takže není na webu. {restoreOutcome(doc)}
          </span>
        </p>
      ) : null}

      {groups.length > 1 ? (
        <div className={styles.tabs} role="tablist">
          {groups.map((entry) => {
            const count = errorsForGroup(visibleErrors, entry).length
            const isActive = entry.name === activeGroup.name
            return (
              <button
                key={entry.name || "_"}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                onClick={() => setGroup(entry.name)}
              >
                {entry.title || entry.name}
                {/* The error count on an unopened tab is the only way an editor
                    finds out a hidden field is blocking their publish. */}
                {count ? <span className={styles.tabError}>{count}</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      <ViewBody>
        <div className={styles.form}>
          {showAll && !validation.ok ? (
            <div className={styles.summary} role="alert">
              <Icon name="warning" size={14} />
              <span>
                {validation.errors.length === 1
                  ? "Jedno pole potřebuje opravit, než půjde publikovat."
                  : `${validation.errors.length} polí potřebuje opravit, než půjde publikovat.`}
              </span>
            </div>
          ) : null}

          {/* `type`/`id` were the preview's "which document did I come from"
              breadcrumb. "Upravit kontent" is reached by page, not by document —
              it spans several — so the notice no longer needs either. */}
          {surface ? <VisualSurfaceNotice surface={surface} disabled={!doc?.id} /> : null}

          {/* Schema order is kept even where half the fields have lost their
              inputs. An editor knows this form; reordering it so the read-only
              ones sit together would be a second thing that changed today. The
              divider is inserted before the first of them instead, which lands
              in the same place for both blocks that have one. */}
          {activeGroup?.fields.map((field, index) => {
            const locked = lockedFields.has(field.name)
            const firstLocked =
              locked && !activeGroup.fields.slice(0, index).some((entry) => lockedFields.has(entry.name))

            return (
              <Fragment key={field.name}>
                {firstLocked ? (
                  <p className={surfaceStyles.lockedLabel}>Upravuje se na stránce</p>
                ) : null}
                <FieldRenderer
                  field={field}
                  value={buffer[field.name]}
                  path={field.name}
                  errors={visibleErrors}
                  doc={buffer}
                  readOnly={locked}
                  onChange={(value) => update(field.name, value)}
                />
              </Fragment>
            )
          })}
        </div>
      </ViewBody>

      {/* Not a ConfirmDialog: those ask whether to go ahead with one action,
          and this asks which of two versions of each contested field to keep.
          It is also the one dialog in the Studio that appears without anybody
          pressing anything, so it says what happened before it says what to do. */}
      <ConflictDialog
        open={Boolean(conflict)}
        typeName={type?.name}
        base={conflict?.base}
        mine={conflict?.mine}
        theirs={conflict?.theirs}
        busy={busy === "resolve"}
        onCancel={() => setConflict(null)}
        onResolve={resolveConflict}
      />

      {/* Deleting and archiving are offered side by side, so the copy for
          delete has to say what archiving would have done instead. Without
          that, "Smazat" is the only button anyone finds for "this person left". */}
      <ConfirmDialog
        open={confirming === "remove"}
        title="Smazat natrvalo?"
        description={
          "Tuto akci nelze vzít zpět — dokument zmizí z webu, z administrace i z databáze. " +
          "Pokud jde jen o to, aby nebyl na webu, použijte archiv: odtud ho lze kdykoliv vrátit."
        }
        confirmLabel="Smazat natrvalo"
        busy={busy === "remove"}
        onClose={() => setConfirming(null)}
        onConfirm={remove}
      />

      {/* Archiving is reversible, so this is a confirmation that explains
          rather than one that warns. It exists because "archive" is a word
          people read as "delete" until they are told otherwise, once. */}
      <ConfirmDialog
        open={confirming === "archive"}
        title="Přesunout do archivu?"
        description={
          "Záznam zmizí z webu, ale zůstane v administraci v záložce Archiv a kdykoliv ho odtud můžete vrátit zpět. " +
          "Nic se nemaže."
        }
        confirmLabel="Do archivu"
        tone="secondary"
        busy={busy === "archive"}
        onClose={() => setConfirming(null)}
        onConfirm={() => runAction("archive", "Přesunuto do archivu")}
      />

      <ConfirmDialog
        open={confirming === "unpublish"}
        title="Stáhnout z webu?"
        description="Obsah zůstane v administraci jako koncept, ale na webu přestane být vidět."
        confirmLabel="Stáhnout z webu"
        tone="secondary"
        busy={busy === "unpublish"}
        onClose={() => setConfirming(null)}
        onConfirm={() => runAction("unpublish", "Staženo z webu")}
      />

      {/* Asked only when there is something to lose. DocumentListView argues
          that a confirmation on a reversible action teaches people to click
          through confirmations, and discarding a draft that repeats the
          published body is exactly that — it loses nothing, so it runs on the
          first click. When the draft genuinely differs, work disappears and
          cannot be got back, so this asks and names what goes.

          It also has to be unmistakable next to Stáhnout z webu one dialog up.
          Those two are the pair most easily confused — one removes unpublished
          work, the other takes a live page down — so neither one's title,
          description or button repeats a word of the other's, and both say what
          happens to the website in plain terms: "na webu přestane být vidět"
          against "na webu se nic nezmění". */}
      <ConfirmDialog
        open={confirming === "discardDraft"}
        title="Zahodit rozpracovaný koncept?"
        description={
          doc
            ? `Nezveřejněné úpravy zmizí${describeChanges(changedFields(doc))}. ` +
              `Vrátit je zpět už nepůjde. ${discardOutcome(doc)}`
            : ""
        }
        confirmLabel="Zahodit koncept"
        busy={busy === "discardDraft"}
        onClose={() => setConfirming(null)}
        onConfirm={discardDraft}
      />
    </>
  )
}

/**
 * The changed field paths, as something that fits in a sentence.
 *
 * Named rather than counted, because "you will lose 6 edits" is a number an
 * editor cannot check and "heading, items.2.label" is one they can. Cut at four
 * for the same reason: a list long enough to scroll inside a confirmation has
 * stopped being evidence and become wallpaper.
 *
 * Returns a parenthesis or nothing at all, so the sentence around it needs no
 * branch — and no Czech agreement trap either, which is why the caller says
 * "úpravy zmizí" rather than counting them into a relative clause that would
 * have to decline with the number.
 */
const DESCRIBE_LIMIT = 4

function describeChanges(fields) {
  if (!fields.length) return ""
  const shown = fields.slice(0, DESCRIBE_LIMIT)
  const rest = fields.length - shown.length
  return `: ${shown.join(", ")}${rest ? ` a ${plural(rest, "další", "další", "dalších")}` : ""}`
}
