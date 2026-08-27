import { useState } from "react"

import { usePort, useRevision } from "@/cms/studio/context/StudioProvider"
import { useToast } from "@/cms/studio/context/ToastProvider"
import { useAsync } from "@/cms/studio/hooks/useAsync"
import { bodyOf, isArchived } from "@/cms/studio/lib/documents"
import { formatRelative } from "@/cms/studio/lib/format"
import { Button } from "@/cms/studio/ui/controls"
import { ErrorState, Spinner } from "@/cms/studio/ui/feedback"

import styles from "./sheet"

/**
 * A review, on the page — moderated, not edited.
 *
 * > pro recenze … nemá to nabízet editaci
 *
 * The other `document` popup renders the type's own form, and for a partner or a
 * consultant that is exactly right: those are the client's own records. A review
 * is not. It is a sentence a customer wrote about them, and a surface that lets
 * the subject of a review rewrite it is not an editor, it is a forgery machine.
 * So this body draws no input at all. The annotation says
 * `data-cms-actions="moderate"` and the shell picks this instead of `DocModule`
 * — one kind, two bodies, the narrowing declared on the element rather than
 * inferred from the type, because "review" is a name and next year there will be
 * another type that wants the same treatment.
 *
 * ---------------------------------------------------------------------------
 * Two actions, and they are the Studio's own
 *
 * Hiding is `port.unpublish`, which is what "Stáhnout z webu" does in
 * `studio/views/ModerationView.jsx`. Archiving is `port.archive`. Neither is
 * reimplemented here and neither is a new concept:
 *
 *   - `status` is load-bearing. The anon grant makes a published document's
 *     `data` world-readable, so unpublishing is what takes a review off the
 *     site — there is no second flag that could disagree with it.
 *   - Archiving is a timestamp, not a third status (`studio/lib/documents.js`:
 *     "Archiving is a timestamp, not a status"). `archivedAt` moves and
 *     `status`, `data` and `draft` are left exactly as they were, which is what
 *     lets the Studio's archive put a review back where it was.
 *
 * `data` is untouched by both. Neither call writes a document body — that is the
 * property that makes this safe to put on a page an editor clicks around on.
 *
 * ---------------------------------------------------------------------------
 * What is deliberately NOT here
 *
 * No form, no publish, no approve and no delete. Approving is a judgement made
 * against a queue of them and it belongs on the screen built for that; deleting
 * is what "zamítnout" does there, it is irreversible after the undo toast
 * expires, and a destructive button one stray click from a page an editor is
 * browsing is not a thing to add. The review's own words are shown, read-only,
 * because moderating means reading and a decision taken on a card the popup
 * covered up is a decision taken blind.
 *
 * No `onClose` either: this body never closes itself. It reports the action it
 * took and the dispatch decides — today it closes the popup and says so on the
 * control, which is the same thing it does after a document is saved. Both
 * actions are therefore one visit each; the state sentence below is what an
 * editor sees when they come back to a review they have already acted on.
 */
export default function ModerateModule({ docId, onModerated }) {
  const port = usePort()
  const toast = useToast()
  const { bump } = useRevision()
  const [busy, setBusy] = useState(null)

  const { data: doc, error, loading, reload, setData } = useAsync(() => port.get({ id: docId }), [port, docId])

  if (loading && !doc) {
    return (
      <div className={styles.setLoading}>
        <Spinner size={20} />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!doc) return null

  const body = bodyOf(doc)
  const live = doc.status === "published"
  const archived = isArchived(doc)

  /**
   * One shape for both, because they differ only in which port call they make.
   * The result is written straight back into the loaded document rather than
   * re-fetched: the port answers with the updated document, and a second
   * request would be a round trip to learn what we were just told.
   */
  const run = async (action, verb, said) => {
    setBusy(action)
    try {
      const updated = await port[action]({ id: docId })
      setData(updated)
      bump()
      toast.success(verb, { description: said })
      // The port call's own name, not the Czech sentence above it: the dispatch
      // reports the outcome on the control in the frame, where the popup may
      // already be gone, and a word it has to translate back is a word it can
      // mistranslate.
      onModerated?.(action)
    } catch (failure) {
      toast.error("Akce se nepovedla", { description: failure?.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={styles.setPane}>
      <div className={styles.modRead}>
        <p className={styles.modWho}>
          {body.customerName || "Bez jména"}
          {body.consultantName ? <span className={styles.setCount}> · o poradci {body.consultantName}</span> : null}
          <span className={styles.setCount}> · {formatRelative(body.submittedAt || doc.createdAt)}</span>
        </p>
        {/* The whole review. The client is deciding whether it stays on their
            site; a truncated quote is not enough to decide on. */}
        <blockquote className={styles.modQuote}>{body.message || "Recenze nemá text."}</blockquote>
      </div>

      <p className={styles.modState}>
        {archived
          ? "V archivu — na webu není a v seznamech se neukazuje."
          : live
            ? "Právě je vidět na webu."
            : "Na webu není — čeká ve frontě schvalování."}
      </p>

      <div className={styles.modActions}>
        <Button
          variant="secondary"
          size="sm"
          icon="eyeOff"
          disabled={!live || Boolean(busy)}
          loading={busy === "unpublish"}
          onClick={() => run("unpublish", "Skryto z webu", "Recenze zůstává ve frontě schvalování.")}
        >
          Skrýt z webu
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon="archive"
          disabled={archived || Boolean(busy)}
          loading={busy === "archive"}
          onClick={() => run("archive", "Přesunuto do archivu", "Vrátit ji jde v administraci v záložce Archiv.")}
        >
          Do archivu
        </Button>
      </div>

      {/* Where the way back is, said here rather than offered here: restoring an
          archived review that was published puts it straight back on the site,
          and that is a publish — which is not something this surface does. */}
      <p className={styles.setCount + " " + styles.modFoot}>
        {archived
          ? "Zpátky ji vrátíte v administraci: Recenze → Archiv."
          : "Obojí se dá vzít zpět v administraci. Text recenze se tu upravovat nedá — jsou to slova zákazníka."}
      </p>
    </div>
  )
}
