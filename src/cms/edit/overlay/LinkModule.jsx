import { useState } from "react"

import { usePort } from "@/cms/studio/context/StudioProvider"
import { useAsync } from "@/cms/studio/hooks/useAsync"
import { Button } from "@/cms/studio/ui/controls"
import { ErrorState, Spinner } from "@/cms/studio/ui/feedback"

import { bodyOfDoc, valueAt } from "./assets"
import { checkHref } from "./href"
import styles from "./sheet"

/**
 * A link or a button — its label, its target, or both.
 *
 * ---------------------------------------------------------------------------
 * The three shapes, still decided by the annotation
 *
 * `editableLink` writes a text field, an href field, or both, and this renders
 * exactly what is there. A link that goes somewhere on this site gets a label
 * and no target, because the target is the site's own routing; a link to another
 * site gets both; an icon has no words on the page, so it gets a target only.
 * There is no mode to pick and nothing to get wrong — the annotation *is* the
 * mode, and a field that was not annotated is not drawn.
 *
 * ---------------------------------------------------------------------------
 * Why the target is checked here and again on the way out
 *
 * `checkHref` is an accept list, not a sanitiser: four shapes are allowed and
 * everything else is refused with the sentence that says what to type instead.
 * It runs on every keystroke so the refusal is visible while the caret is still
 * in the box, and the overlay runs it again before it writes — this component
 * is a form and forms can be bypassed; the write is where the rule has to hold.
 *
 * ---------------------------------------------------------------------------
 * Both halves, or neither
 *
 * *Uložit* commits the label and the target together and a refused target stops
 * the whole commit. Saving the words and refusing the URL would leave an editor
 * looking at a half-applied change they never asked for.
 */
export default function LinkModule({ docId, field, hrefField, href, onCommit, onClose }) {
  const port = usePort()
  const [text, setText] = useState(null)
  const [target, setTarget] = useState(null)

  const { data, error, loading, reload } = useAsync(async () => {
    const doc = await port.get({ id: docId })
    const body = bodyOfDoc(doc)
    const stored = {
      // The label is content, so it is read from the document. The target may be
      // annotated on an element whose document does not store it under that path
      // at all (a component composing the URL), so the rendered `href` the
      // overlay read off the anchor is the fallback — it is what a visitor is
      // actually being sent to.
      text: field ? valueAt(body, field) : null,
      href: hrefField ? (valueAt(body, hrefField) ?? href ?? "") : null,
    }
    setText(typeof stored.text === "string" ? stored.text : "")
    setTarget(typeof stored.href === "string" ? stored.href : "")
    return stored
  }, [port, docId, field, hrefField, href])

  if (loading && text == null && target == null) {
    return (
      <div className={styles.setLoading}>
        <Spinner size={20} />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={reload} />

  const storedText = typeof data?.text === "string" ? data.text : ""
  const storedHref = typeof data?.href === "string" ? data.href : ""
  const checked = hrefField ? checkHref(target) : null
  const textDirty = Boolean(field) && text !== storedText
  const hrefDirty = Boolean(hrefField) && (target || "").trim() !== storedHref
  const refusal = hrefDirty && checked && !checked.ok ? checked.reason : ""
  const dirty = textDirty || hrefDirty

  const commit = () => {
    if (!dirty || refusal) return
    onCommit({
      text: textDirty ? text : null,
      href: hrefDirty ? checked.value : null,
    })
  }

  return (
    <div className={styles.setPane}>
      <div className={styles.linkForm}>
        {field ? (
          <>
            <label className={styles.imageLabel} htmlFor="cms-link-text">
              Text odkazu
            </label>
            <input
              id="cms-link-text"
              className={styles.input}
              value={text ?? ""}
              autoFocus
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && commit()}
            />
          </>
        ) : null}

        {hrefField ? (
          <>
            <label className={styles.imageLabel} htmlFor="cms-link-href">
              Cíl odkazu
            </label>
            <input
              id="cms-link-href"
              className={styles.input}
              value={target ?? ""}
              autoFocus={!field}
              placeholder="/stranka, https://…, mailto:, tel:"
              aria-invalid={refusal ? "true" : undefined}
              onChange={(event) => setTarget(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && commit()}
            />
            <p className={refusal ? styles.linkRefusal : styles.setCount}>
              {refusal || "Přijímáme /cestu na webu, https://…, mailto: nebo tel:"}
            </p>
          </>
        ) : (
          <p className={styles.setCount}>
            Tento odkaz vede na stránku tohoto webu — mění se jen jeho text, cíl patří k navigaci webu.
          </p>
        )}
      </div>

      <div className={styles.setFoot}>
        <span className={styles.setCount}>Ukládá se jako koncept — na web to nepustí.</span>
        <span className={styles.grow} />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zrušit
        </Button>
        {/* The rule the whole build follows: nothing to save, nothing offered. */}
        <Button variant="primary" size="sm" disabled={!dirty || Boolean(refusal)} onClick={commit}>
          Uložit
        </Button>
      </div>
    </div>
  )
}
