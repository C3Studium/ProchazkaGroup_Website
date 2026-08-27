import { useState } from "react"

import { usePort } from "@/cms/studio/context/StudioProvider"
import { useAsync } from "@/cms/studio/hooks/useAsync"
import { Button } from "@/cms/studio/ui/controls"
import { ErrorState, Spinner } from "@/cms/studio/ui/feedback"

import { bodyOfDoc, valueAt } from "./assets"
import MediaModule from "./MediaModule"
import styles from "./sheet"

/**
 * One picture — the popup Contract D asks for, and the discrepancy it closes.
 *
 * ---------------------------------------------------------------------------
 * What was here before
 *
 * The control itself carried *Nahradit* / *Popis* / *Odebrat*, and only the
 * first of the three opened anything. So an image had three affordances where
 * every other kind has one, the alt text was typed into a box floating beside
 * the picture, and *Odebrat* deleted the field on a single click with no view of
 * what was being deleted. Contract D says taking *Upravit* on an image opens a
 * popup carrying pick / upload / alt / remove; this is that popup, and the
 * control is back to one button.
 *
 * ---------------------------------------------------------------------------
 * Why the value is loaded rather than read off the page
 *
 * The same reason `SetModule` loads its array. What the page shows is a
 * rendering: `next/image` rewrites `src` into `/_next/image?url=…`, and a
 * component that falls back to its own artwork shows a picture the field does
 * not contain. The alt attribute has the same problem in reverse — a component
 * may supply a default the field never stored. So the stored value is what is
 * shown, what "changed" is measured against, and what the remove button is
 * offered for.
 *
 * ---------------------------------------------------------------------------
 * Every action commits and closes
 *
 * Picking, uploading, saving the description and removing all hand one write to
 * the overlay and close. That is not a shortcut: the overlay's `save()` is the
 * one path that serialises writes per field, tracks them for *Náhled*, and
 * reports the server's own sentence on the control — including a refusal. A
 * second reporting surface inside the popup would either duplicate it or
 * disagree with it, and "Uloženo" drawn locally before the request lands is the
 * exact lie this whole build is written against.
 *
 * Uploading is `MediaLibrary`'s own affordance and stays there: its bar has the
 * button, its drop zone takes a file, and in `pick` mode a single uploaded file
 * is handed straight back as the pick. The store behind it is real now —
 * `POST /api/cms/media`, bytes on disk under `.cms-dev/media/`, type and
 * dimensions read from the bytes rather than from what the client claimed.
 */
export default function ImageModule({ docId, field, onPick, onAlt, onRemove, onClose }) {
  const port = usePort()
  const [alt, setAlt] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const { data, error, loading, reload } = useAsync(async () => {
    const doc = await port.get({ id: docId })
    const value = valueAt(bodyOfDoc(doc), field)
    setAlt(typeof value?.alt === "string" ? value.alt : "")
    return value && typeof value === "object" ? value : null
  }, [port, docId, field])

  if (loading && alt == null) {
    return (
      <div className={styles.setLoading}>
        <Spinner size={20} />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={reload} />

  const current = data
  const altDirty = current ? alt !== (current.alt || "") : false

  return (
    <div className={styles.setPane}>
      <div className={styles.imageHead}>
        <figure className={styles.imageNow}>
          {current?.url ? (
            /* Plain <img>: this is chrome pointed at a library URL, and
               next/image would need every storage host configured for it. */
            <img src={current.url} alt={current.alt || ""} />
          ) : (
            <span className={styles.imageNone}>Pole je prázdné</span>
          )}
        </figure>

        <div className={styles.imageMeta}>
          <p className={styles.imageName}>{current?.filename || current?.url || "Zatím žádný obrázek"}</p>
          {current?.width && current?.height ? (
            <p className={styles.setCount}>
              {current.width} × {current.height} px
            </p>
          ) : null}

          <label className={styles.imageLabel} htmlFor="cms-image-alt">
            Popis pro čtečky a vyhledávače
          </label>
          <input
            id="cms-image-alt"
            className={styles.input}
            value={alt ?? ""}
            disabled={!current}
            placeholder="Co je na obrázku vidět?"
            onChange={(event) => setAlt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && altDirty) onAlt(alt)
            }}
          />

          <div className={styles.imageActions}>
            <Button variant="ghost" size="sm" disabled={!altDirty} onClick={() => onAlt(alt)}>
              Uložit popis
            </Button>
            <span className={styles.grow} />
            {/* Two steps, because this one empties the field and the picture is
                the only thing on screen saying which field that is. */}
            {confirming ? (
              <>
                <span className={styles.setCount}>Opravdu odebrat?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Ne
                </Button>
                <Button variant="danger" size="sm" onClick={onRemove}>
                  Odebrat
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" disabled={!current} onClick={() => setConfirming(true)}>
                Odebrat obrázek
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className={styles.setHint}>Vyberte obrázek z knihovny, nebo nahrajte nový — použije se hned.</p>

      <div className={styles.setLibrary}>
        <MediaModule onPick={onPick} selectedId={current?.id} />
      </div>

      <div className={styles.setFoot}>
        <span className={styles.setCount}>Ukládá se jako koncept — na web to nepustí.</span>
        <span className={styles.grow} />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  )
}
