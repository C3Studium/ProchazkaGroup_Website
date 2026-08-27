import { useEffect, useRef, useState } from "react"

import { useCore, usePort } from "@/cms/studio/context/StudioProvider"
import { useAsync } from "@/cms/studio/hooks/useAsync"
import { Button } from "@/cms/studio/ui/controls"
import { ErrorState, Spinner } from "@/cms/studio/ui/feedback"

import { addImage, asList, bodyOfDoc, moveTo, removeImage, replaceImage, sameSet, valueAt } from "./assets"
import MediaModule from "./MediaModule"
import styles from "./sheet"

/**
 * A whole array-of-images field, in the popup.
 *
 * > ten card deck zvýrazňuje jednu fotku po druhé … je to jeden komponent se
 * > třemi obrázky
 *
 * One component, one target, one popup. The card deck used to annotate each
 * photograph as its own `image`, which gave an editor three selections that can
 * each half-succeed and no way at all to say "this one goes first" — the thing
 * they actually asked for.
 *
 * ---------------------------------------------------------------------------
 * Why the set is read from the port and not from the page
 *
 * The `image` body never needed this: replacing one picture is a write to a path
 * the annotation already names, and the overlay can see the `<img>` it is
 * replacing. A set cannot be read off the DOM — the page may draw three of the
 * five, in a different order, or draw none of them because the component falls
 * back to its own artwork. Add, remove and reorder are all statements about the
 * *stored* array, so the stored array is what this loads, edits and hands back.
 *
 * ---------------------------------------------------------------------------
 * One write, at the end
 *
 * Every change here is local until *Uložit*. Writing per click would mean four
 * requests to reorder four pictures and a half-applied set if one of them
 * failed, and the field's own validation (`min`, `max`) is a statement about the
 * array as a whole — so the array as a whole is what gets submitted, once,
 * through the same `patchField` every other visual edit uses.
 *
 * Whether reordering is offered at all is the schema's answer, not this file's:
 * `field.ui.sortable` is what the Studio's own array input reads, and an
 * unordered list showing a grab cursor would be promising an order nothing
 * stores.
 *
 * ---------------------------------------------------------------------------
 * Reordering: dragged, and reachable without a mouse
 *
 * Pointer events rather than HTML5 drag-and-drop, and no library. Three reasons,
 * in the order they decided it:
 *
 *   1. `dragstart`/`dragover` cannot be driven by synthesised input, so a drag
 *      built on them is a feature that can only ever be checked by hand. This
 *      one is exercised by the same mouse the client uses.
 *   2. `dataTransfer` is a serialisation channel between documents and there is
 *      nothing to serialise: both ends are this component's own state.
 *   3. A dragged tile has to show where it will land, and the honest way to show
 *      that is to move it there — `view` is the list as it would be stored if the
 *      pointer were released now, so the preview and the result are one value.
 *
 * And the keyboard path is not a fallback bolted on afterwards: the tile is
 * focusable and the arrow keys move it, because a reorder only a mouse can make
 * is a reorder half the people using this cannot make. Both paths end in
 * `moveTo`, so they cannot drift.
 */
export default function SetModule({ docId, field, onCommit, onClose }) {
  const port = usePort()
  const core = useCore()

  const [list, setList] = useState(null)
  // Which member the next pick replaces. `null` means append.
  const [target, setTarget] = useState(null)
  // The drag in flight: where it started in the stored order, where it would
  // land, and the pointer that owns it. `null` when nothing is being dragged.
  const [drag, setDrag] = useState(null)
  // What the last reorder did, in words, for the live region below the strip.
  const [said, setSaid] = useState("")

  const tilesRef = useRef([])
  // Set by a keyboard move so the tile that moved keeps the focus that moved it;
  // without this the focus stays at the position and the next arrow press moves
  // whichever picture slid into it.
  const focusRef = useRef(null)

  const { data, error, loading, reload } = useAsync(async () => {
    const doc = await port.get({ id: docId })
    const body = bodyOfDoc(doc)
    const descriptor = resolveField(core.getType(doc?.type), field)
    setList(asList(valueAt(body, field)))
    return { doc, descriptor }
  }, [port, core, docId, field])

  useEffect(() => {
    if (focusRef.current == null) return
    tilesRef.current[focusRef.current]?.focus()
    focusRef.current = null
  })

  if (loading && list == null) {
    return (
      <div className={styles.setLoading}>
        <Spinner size={20} />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (list == null) return null

  const descriptor = data?.descriptor
  // Boolean, not `!== false`: a descriptor that failed to resolve has no `ui`,
  // and a grab handle on a field this cannot describe would be offering an order.
  const sortable = Boolean(descriptor?.ui?.sortable)

  // The order as it would be stored if the pointer were released now. With
  // nothing in flight this is the list itself, so every index below — the button
  // bar's, the caption's, the hit test's — is an index into one array.
  const view = drag ? moveTo(list, drag.from, drag.to) : list
  const dirty = !sameSet(view, asList(valueAt(bodyOfDoc(data?.doc), field)))

  const announce = (to) => setSaid(`Přesunuto na ${to + 1}. místo z ${view.length}.`)

  /** A keyboard move: absolute target, focus follows the picture. */
  const step = (from, to) => {
    if (!sortable || to < 0 || to >= list.length || to === from) return
    setList((current) => moveTo(current, from, to))
    setTarget(null)
    focusRef.current = to
    announce(to)
  }

  const pick = (asset) => {
    setList((current) => (target == null ? addImage(current, asset) : replaceImage(current, target, asset)))
    setTarget(null)
  }

  /* ------------------------------------------------------------- drag -- */

  const startDrag = (event, index) => {
    // The button bar lives inside the tile and its buttons are the reason a
    // pointer lands here most of the time. A press on one of them is not a drag.
    if (!sortable || event.button !== 0 || event.target.closest("button")) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDrag({ from: index, to: index, pointerId: event.pointerId })
  }

  const moveDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    const to = nearestTile(tilesRef.current, event.clientX, event.clientY)
    if (to < 0 || to === drag.to) return
    setDrag((current) => (current ? { ...current, to } : current))
  }

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    const { from, to } = drag
    setDrag(null)
    if (from === to) return
    setList((current) => moveTo(current, from, to))
    setTarget(null)
    announce(to)
  }

  return (
    <div className={styles.setPane}>
      {/* Said plainly rather than left for a failed save to explain: the write
          below is validated against the schema, so a field that is not a list of
          images cannot be edited here however the element was annotated. */}
      {descriptor?.problem ? <p className={styles.setProblem}>{descriptor.problem}</p> : null}

      {view.length === 0 ? (
        <p className={styles.setEmpty}>Zatím tu nic není. Vyberte obrázek z knihovny níže.</p>
      ) : (
        <ol className={styles.setStrip}>
          {view.map((item, index) => (
            <li
              key={`${item?.id || item?.url || "item"}-${index}`}
              ref={(node) => {
                tilesRef.current[index] = node
              }}
              className={[
                styles.setTile,
                target === index ? styles.setTileTarget : "",
                sortable ? styles.setTileDraggable : "",
                drag && drag.to === index ? styles.setTileHeld : "",
              ]
                .filter(Boolean)
                .join(" ")}
              // Focusable so the arrows below reach it. `aria-label` carries the
              // position because the caption is decoration to a screen reader and
              // "which one am I moving" is the only question here.
              tabIndex={sortable ? 0 : -1}
              aria-label={`${index + 1}. obrázek z ${view.length}`}
              onPointerDown={(event) => startDrag(event, index)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(event) => {
                if (!sortable || event.metaKey || event.ctrlKey || event.altKey) return
                const last = view.length - 1
                const to =
                  event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? index - 1
                    : event.key === "ArrowRight" || event.key === "ArrowDown"
                      ? index + 1
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? last
                          : null
                if (to == null) return
                // Both: the default would scroll the Studio behind the dialog,
                // and the overlay registers a key handler on this document too
                // (for Escape) that has no business seeing a reorder.
                event.preventDefault()
                event.stopPropagation()
                step(index, to)
              }}
            >
              {/* Plain <img>: the sources are library URLs that next/image would
                  need configuring for, and this is chrome, not a page image.
                  `draggable={false}` because the browser's own image drag would
                  otherwise start on top of ours and cancel the pointer capture. */}
              <img src={item?.url} alt={item?.alt || ""} draggable={false} />
              <span className={styles.setCaption}>{index + 1}</span>
              <div className={styles.setTileBar}>
                <button
                  type="button"
                  className={styles.setMini}
                  title="Nahradit — pak vyberte z knihovny"
                  onClick={() => setTarget((current) => (current === index ? null : index))}
                >
                  Nahradit
                </button>
                <button
                  type="button"
                  className={`${styles.setMini} ${styles.setMiniDanger}`}
                  title="Odebrat ze sady"
                  onClick={() => {
                    setList((current) => removeImage(current, index))
                    setTarget(null)
                  }}
                >
                  Odebrat
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className={styles.setHint}>
        {target == null
          ? "Kliknutím na obrázek v knihovně ho přidáte na konec sady."
          : `Vyberte náhradu za ${target + 1}. obrázek. Zrušíte dalším kliknutím na „Nahradit".`}
        {sortable ? " Pořadí změníte přetažením, nebo šipkami po výběru obrázku tabulátorem." : ""}
      </p>

      {/* Polite, and it is the only report a keyboard reorder makes: the tiles
          move under a sighted editor's eyes and say nothing to anyone else. */}
      <p className={styles.setSaid} role="status" aria-live="polite">
        {said}
      </p>

      <div className={styles.setLibrary}>
        <MediaModule onPick={pick} />
      </div>

      <div className={styles.setFoot}>
        <span className={styles.setCount}>
          {view.length} {view.length === 1 ? "obrázek" : view.length < 5 ? "obrázky" : "obrázků"}
        </span>
        <span className={styles.grow} />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zrušit
        </Button>
        {/* The rule the whole build follows: nothing to save, nothing offered. */}
        <Button variant="primary" size="sm" disabled={!dirty} onClick={() => onCommit(view)}>
          Uložit
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ drag -- */

/**
 * Which tile the pointer is nearest to, by centre.
 *
 * Nearest-centre rather than "which rect contains the point", because the point
 * spends part of every drag in the gap between two tiles and in the padding
 * around the strip, where a containment test answers "none" and the preview
 * would jump back to where it started. Squared distance: the comparison is the
 * only thing used, and a square root would be a rounding error looking for a
 * place to happen.
 */
function nearestTile(tiles, x, y) {
  let best = -1
  let closest = Infinity
  tiles.forEach((node, index) => {
    if (!node?.isConnected) return
    const rect = node.getBoundingClientRect()
    const dx = x - (rect.left + rect.width / 2)
    const dy = y - (rect.top + rect.height / 2)
    const distance = dx * dx + dy * dy
    if (distance < closest) {
      closest = distance
      best = index
    }
  })
  return best
}

/* ------------------------------------------------------------------ paths -- */

/**
 * The field a dotted path names, resolved through the type.
 *
 * The same walk `@/cms/server/fieldPatch` does before a write, minus everything
 * it does about validation — this only needs to know whether the target is an
 * ordered list of images, so that reordering is offered when it means something
 * and the mismatch is said out loud when it does not. The server's copy stays
 * the authority; this one exists so the popup can be honest before the request
 * rather than after it.
 */
function resolveField(type, path) {
  if (!type) return { problem: "Typ dokumentu není v tomto sezení znám." }

  let field = null
  for (const segment of String(path).split(".")) {
    if (field === null) field = (type.fields || []).find((entry) => entry.name === segment) || null
    else if (field.type === "object") field = (field.fields || []).find((entry) => entry.name === segment) || null
    else if (field.type === "array") field = (field.members || [])[0] || null
    else field = null
    if (!field) return { problem: `Typ „${type.title || type.name}" nemá pole „${path}".` }
  }

  if (field.type !== "array") {
    return { field, problem: `Pole „${field.title || field.name}" není seznam — sada se do něj neuloží.` }
  }
  const member = (field.members || [])[0]
  if (!member || member.type !== "image") {
    return { field, ui: field.ui, problem: `Seznam „${field.title || field.name}" neobsahuje obrázky.` }
  }
  return { field, ui: field.ui, problem: null }
}
