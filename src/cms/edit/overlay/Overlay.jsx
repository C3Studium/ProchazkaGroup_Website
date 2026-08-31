import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { markNamed } from "@/cms/schemas/marks"

import {
  ACTIONS_ATTR,
  DOC_ATTR,
  EDITABLE_SELECTOR,
  FIELD_ATTR,
  HREF_ATTR,
  KIND_ATTR,
  KIND_DOCUMENT,
  KIND_IMAGE,
  KIND_IMAGE_SET,
  KIND_LINES,
  KIND_LINK,
  KIND_LIST,
  KIND_TEXT,
  lineArrayPath,
  lineLeafPath,
  linePath,
  MARK_ATTR,
  TYPE_ATTR,
} from "../attrs"
import { anchor, isOnScreen } from "./anchor"
import { imageValue } from "./assets"
import { checkHref, isCreditLink } from "./href"
import styles from "./sheet"
import { applyStored, beginTextEdit, fieldValue } from "./text"

// One popup, a body per kind, one async chunk. It is loaded when an editor first
// opens one rather than with the overlay: it drags in the Studio's provider, its
// toast surface, the media library and every field input, and most sessions
// never leave the page. See Popup.jsx, and `overlay/modules.js` for the bodies
// it picks between — this file names no body and imports none.
const PopupModule = dynamic(() => import("./Popup"), { ssr: false })

/**
 * The kind table, and the one question it answers.
 *
 * Seven kinds, two answers. `text` and `lines` are edited in the real element,
 * in the real layout, because what an editor is deciding is whether the line
 * fits; everything else opens the popup, which is one component with a body per
 * kind. Stated as a set rather than as a chain of `===` in the render, because
 * "which kinds open a popup" is a fact about the contract and was, until this
 * round, four near-identical blocks of JSX that could drift apart.
 */
const IN_PLACE_KINDS = new Set([KIND_TEXT, KIND_LINES])
const POPUP_KINDS = new Set([KIND_IMAGE, KIND_IMAGE_SET, KIND_LIST, KIND_DOCUMENT, KIND_LINK])

/** Same value? Arrays compare member for member — a `lines` block is one. */
const sameValue = (a, b) =>
  Array.isArray(a) || Array.isArray(b)
    ? Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((one, at) => one === b[at])
    : a === b

/** Visual breathing room between a selection and its control, in screen pixels
 *  — divided by the zoom below, so it is 8px at every device size. */
const GAP = 8

/** The host's own document — where this code is running, and where the media
 *  library is drawn. Never the framed page; that is `doc` inside the component. */
const hostDocument = () => (typeof document === "undefined" ? null : document)

/**
 * Contract B — the overlay, drawn inside the frame.
 *
 * ---------------------------------------------------------------------------
 * Two documents, one realm
 *
 * This component is mounted by the host into the frame's document (mount.jsx),
 * which means its DOM lives in the framed page while its JavaScript lives in the
 * Studio. So `window` and `document` here are the **Studio's**, and every read
 * about the page has to come from the frame's own globals — which arrive as the
 * `frame` prop and are unpacked into `win` / `doc` below.
 *
 * That is not tidiness. `window.innerWidth` off the wrong document is the width
 * of the stage rather than of the emulated device, and `anchor()` works entirely
 * in the previewed page's viewport pixels: one wrong global and the control is
 * placed against a viewport that does not exist. The frame's
 * `requestAnimationFrame` matters for the same kind of reason — see rule 2.
 *
 * ---------------------------------------------------------------------------
 * Reading rectangles on a page that never stops moving
 *
 * The previewed page is a 550vh scroll-driven timeline: sections translate
 * continuously under `transform` while an editor is trying to click one. So the
 * outline cannot be positioned once — it has to follow — and following means
 * `getBoundingClientRect()`, which is a forced style-and-layout flush whenever
 * the DOM is dirty. Doing that carelessly is how an inspector overlay costs a
 * page ten frames a second.
 *
 * Three rules, and they are the whole performance story:
 *
 *   1. **One loop, read-then-write.** Every rect this needs is read at the top
 *      of one rAF callback and every style is written at the bottom of the same
 *      one. Nothing reads after a write, so there is at most one layout flush
 *      per frame instead of one per element.
 *
 *   2. **Late in the frame, in the frame's own clock.** The animation callbacks
 *      of a document run in the order they were registered, and documents are
 *      serviced parent-first — so the host's rAF runs *before* the framed page's
 *      and an overlay driven by it would read every rect one frame stale. The
 *      loop therefore books itself on `win.requestAnimationFrame`, the frame's
 *      own, where it is registered after framer-motion's and after Lenis's and
 *      runs after both. By then the frame's transform writes are already in, and
 *      the single flush this causes is work the browser was about to do anyway.
 *
 *   3. **No loop when there is nothing to follow.** It runs while something is
 *      hovered or selected and stops itself otherwise, so an editor scrolling
 *      the page to find a section pays nothing at all. Rect values are also
 *      compared before they are written, so a still element writes no styles
 *      and invalidates nothing.
 *
 * None of the tracking goes through React state. A `setState` per frame would
 * put a render and a reconciliation in front of every one of those writes;
 * positions are written straight onto two nodes through refs, and React is only
 * told about things that change once — what is selected, whether it is being
 * edited, what the zoom is.
 * ---------------------------------------------------------------------------
 *
 * @param {Window} frame     the framed page's window; same origin by construction
 * @param {number} zoom      what the host is drawing the frame at. One number,
 *                           one source: the host owns it and hands it over.
 * @param {function} onSave  Contract C — `({docId, field, value}) => Promise<entry>`
 * @param {function} [onRead]  `({docId, field}) => Promise<value>` — what is
 *                           stored at a path right now. Only `lines` needs it,
 *                           and only to write a whole array back: see `openLines`.
 * @param {function} [onSelect]  told what an editor picked, for the host's own UI
 */
export default function Overlay({ frame, zoom = 1, onSave, onRead, onSelect }) {
  const win = frame
  const doc = frame.document

  const [selection, setSelection] = useState(null)
  const [editing, setEditing] = useState(false)
  const [flash, setFlash] = useState(null)
  // A save that did not happen, held on the control until the editor answers it.
  // Not a flash: a flash fades, and the one thing an editor must not do is walk
  // away believing text that exists only in the page has been stored. See
  // `onSaveResult`.
  const [alert, setAlert] = useState(null)
  // Which body the popup is showing, or null. One state for four kinds, because
  // there is one popup: `image`, `imageSet`, `document` and `link` are the same
  // overlay affordance with different contents. See Popup.jsx.
  const [popup, setPopup] = useState(null)
  // Does the text in the element differ from the text that is stored? This is
  // the whole of the button swap — see the render, and `startEdit` for where it
  // is fed from.
  const [textDirty, setTextDirty] = useState(false)
  // What the caret inside the element being edited is holding, when the field
  // carries a mark. Reported by the editor rather than read here, and only when
  // the answer changes — `selectionchange` fires on every pointer move of a drag
  // and this is a React state.
  const [markState, setMarkState] = useState(null)

  const rootRef = useRef(null)
  const hoverBoxRef = useRef(null)
  const selectBoxRef = useRef(null)
  const controlRef = useRef(null)

  const hoverElRef = useRef(null)
  const selectElRef = useRef(null)
  const editorRef = useRef(null)
  const editingRef = useRef(false)
  const zoomRef = useRef(zoom || 1)
  // Layout size of the control, from a ResizeObserver rather than a rect read:
  // the observer reports the border box after layout without asking for it, so
  // the per-frame cost stays at exactly one `getBoundingClientRect()`.
  const controlSizeRef = useRef({ w: 0, h: 0 })
  const pointerRef = useRef({ x: -1, y: -1, pending: false, inside: false })
  const rafRef = useRef(0)
  const flashTimerRef = useRef(0)
  // Which element carried which field's last submission, so a failed save can
  // put the stored value back where the typed one is sitting.
  const savesRef = useRef(new Map())
  // The array behind the `lines` block being edited, as stored. Read when the
  // editor opens, not when it commits — see `startEdit`.
  const linesRef = useRef(null)
  // Which `lines` blocks were seen to be the whole of their array, by
  // `docId arrayPath`. Sticky for the session, and it has to be: the framed page
  // does not re-render when a save lands, so a block that has just been given a
  // fifth line still draws four, and asking the DOM again would answer that the
  // block no longer owns the array it owns.
  const linesOwnRef = useRef(new Map())

  /* ----------------------------------------------------------- the loop -- */

  const wake = useCallback(() => {
    if (!rafRef.current) rafRef.current = win.requestAnimationFrame(tickRef.current)
  }, [win])

  // Held in a ref so the loop is one stable function that never re-registers,
  // whatever React does around it.
  const tickRef = useRef(() => {})

  tickRef.current = () => {
    rafRef.current = 0

    const zoomNow = zoomRef.current || 1
    const frameBox = { width: win.innerWidth, height: win.innerHeight }

    /* ---- read ---- */
    const pointer = pointerRef.current
    if (pointer.pending) {
      pointer.pending = false
      hoverElRef.current =
        editingRef.current || !pointer.inside ? null : hitTest(doc, pointer.x, pointer.y, rootRef.current)
    }

    let selected = selectElRef.current
    if (selected && !selected.isConnected) {
      // React re-rendered the section out from under the selection.
      selected = null
      selectElRef.current = null
      setSelection(null)
    }
    const selectedRect = selected ? selected.getBoundingClientRect() : null

    let hovered = hoverElRef.current
    if (hovered && (!hovered.isConnected || hovered === selected)) hovered = null
    const hoveredRect = hovered ? hovered.getBoundingClientRect() : null

    /* ---- write ---- */
    paintBox(hoverBoxRef.current, editingRef.current ? null : hoveredRect, frameBox)
    paintBox(selectBoxRef.current, selectedRect, frameBox)
    paintControl(controlRef.current, selectedRect, frameBox, zoomNow, controlSizeRef.current)

    if (hoverElRef.current || selectElRef.current || pointer.pending) {
      rafRef.current = win.requestAnimationFrame(tickRef.current)
    }
  }

  /* --------------------------------------------------------- host state -- */

  /**
   * The zoom, and why there is no longer anything to receive.
   *
   * It used to be a `host {zoom}` message, with the frame measuring its own
   * scaling off `frameElement` until one arrived. Both halves are gone: the host
   * mounts this component and therefore hands the number over as a prop, so
   * there is exactly one place it comes from and no window in which the overlay
   * is counter-scaling by a guess.
   */
  useEffect(() => {
    zoomRef.current = zoom > 0 ? zoom : 1
    wake()
  }, [zoom, wake])

  /* ------------------------------------------------------------ actions -- */

  const finishEdit = useCallback(() => {
    editorRef.current = null
    editingRef.current = false
    setEditing(false)
    setMarkState(null)
    // The element is back to holding what is stored, so the control is back to
    // offering the only thing there is to do with it.
    setTextDirty(false)
    wake()
  }, [wake])

  const showFlash = useCallback((message, tone = "ok", ms = 1600) => {
    setFlash(message ? { message, tone } : null)
    clearTimeout(flashTimerRef.current)
    if (message && ms) flashTimerRef.current = setTimeout(() => setFlash(null), ms)
  }, [])

  /**
   * What became of a save.
   *
   * The overlay is optimistic, which is not a stance it chose: it edits a
   * contentEditable, so the typed text *is* in the element and "apply
   * optimistically" means doing nothing. The two answers it cannot work out for
   * itself are the ones handled here — a stored value that differs from the one
   * submitted, and a write that did not happen at all.
   *
   * ---------------------------------------------------------------------------
   * The failure path, and the thing it must never do again
   *
   * It used to answer a failed save by writing the server's value — the *old*
   * one — over the text the editor had just typed. `EDIT-MODE.md` promises the
   * opposite ("a failed save says so and offers the text back"), and the
   * difference between offering and imposing is the whole of it: the typed words
   * exist nowhere else, and replacing them with an older copy while reporting a
   * failure destroys the very thing the report is about. Worst path of all was
   * a dead session, where the recovery read 401s too and `putBack(…, null)` did
   * nothing at all — leaving the typed text sitting there looking saved.
   *
   * So a failure now changes nothing on the page. It puts a sentence and two
   * choices on the control: try again, or take the stored value back — and the
   * second is offered only when the server actually said what it holds.
   */
  const onSaveResult = useCallback(
    (entry) => {
      const key = `${entry.docId} ${entry.field}`
      const held = savesRef.current.get(key)
      savesRef.current.delete(key)

      if (entry.status === "saved") {
        // Only when the stored value is not the displayed one. `image.alt` sets
        // a leaf and the field comes back holding the whole asset.
        const settled = entry.reconciled && held ? putBack(held.element, entry.field, entry.value, held) : true
        // Three sentences, one for each way a save can land. The last is the
        // honest one: the write is on the server and the page is still drawing
        // the previous arrangement, because this element's shape cannot hold the
        // new one (see `applyPlan` in text.js).
        if (entry.reconciled && !settled) {
          showFlash("Uloženo — server upravil hodnotu; obnovte stránku, ať je vidět", "ok", 7000)
        } else if (entry.reconciled) showFlash("Uloženo — server upravil hodnotu", "ok")
        else if (held?.shown === false) {
          showFlash("Uloženo. Na stránce se to projeví po obnovení (tlačítko Obnovit).", "ok", 7000)
        } else showFlash("Uloženo", "ok")
        return
      }

      showFlash(null)
      setAlert({
        message: failureText(entry.error, entry.recovered),
        retry: () =>
          saveRef.current?.(entry.docId, entry.field, held?.value, "Ukládám znovu…", held?.how, {
            mark: held?.mark,
            lines: held?.lines,
            shown: held?.shown,
            element: held?.element,
          }),
        // Only when the server said what it holds. Offering "the stored value"
        // that is really "we could not read it" would be the same lie in a
        // politer shape.
        restore:
          entry.recovered && held?.element
            ? () => {
                const settled = putBack(held.element, entry.field, entry.value, held)
                setAlert(null)
                showFlash(settled ? "Vráceno na uloženou verzi" : "Uloženou verzi sem nelze vepsat — obnovte stránku", settled ? "ok" : "error", 7000)
              }
            : null,
      })
    },
    // `save` is defined below and reached through a ref, because retrying is a
    // save and a save reports through this. One of the two has to break the
    // cycle and this is the one that can.
    [showFlash],
  )

  /**
   * Contract C, and the only way anything leaves this overlay. It still never
   * writes — the host calls the data port and patches the **draft** — but the
   * hand-off is a function call now rather than a `save` postMessage answered by
   * a `saved` one. Mounting from the host removed the boundary those crossed,
   * and with it the `pending` message: the promise not having settled *is*
   * pending, and the optimistic state was always "the typed text is still in the
   * element".
   *
   * The element is remembered against the field, together with everything the
   * answer might need: the value that was submitted (so a refused write can be
   * offered again unchanged), how to write a value into that element, and
   * whether the page is already showing what was sent.
   */
  const save = useCallback(
    (docId, field, value, note = "Ukládám…", how = "text", meta = null) => {
      savesRef.current.set(`${docId} ${field}`, {
        // `element: null` is a caller saying "there is nothing on the page this
        // value belongs in" — one line of a `lines` block is not the block — and
        // it must not fall through to whatever happens to be selected.
        element: meta && "element" in meta ? meta.element : selectElRef.current,
        field,
        how,
        value,
        mark: meta?.mark ?? null,
        lines: meta?.lines ?? false,
        // `undefined` for everything that is not text edited in place; only a
        // commit can know whether the page took the value.
        shown: meta?.shown,
      })
      setAlert(null)
      showFlash(note, "busy", 6000)

      if (!onSave) {
        onSaveResult({ docId, field, status: "failed", value: null, error: new Error("Ukládání není zapojeno") })
        return
      }
      Promise.resolve(onSave({ docId, field, value })).then(
        (entry) => onSaveResult({ docId, field, ...entry }),
        (error) => onSaveResult({ docId, field, status: "failed", value: null, error }),
      )
    },
    [onSave, onSaveResult, showFlash],
  )

  // See `onSaveResult`: retrying is a save, and a save answers through it.
  const saveRef = useRef(null)
  saveRef.current = save

  const select = useCallback(
    (element) => {
      const docId = element.getAttribute(DOC_ATTR)
      const field = element.getAttribute(FIELD_ATTR)
      const hrefField = element.getAttribute(HREF_ATTR)
      const typeName = element.getAttribute(TYPE_ATTR)
      const kind = resolveKind(element)
      // Declared, not recognised. The field says which inline emphasis it
      // carries and the mark itself owns the encoding; see `@/cms/schemas/marks`
      // and the note on `hasEmphasis` below, which is now only a guard against a
      // field that has emphasis and forgot to say so.
      const mark = IN_PLACE_KINDS.has(kind) ? markNamed(element.getAttribute(MARK_ATTR)) : null
      // The target already on the page, which is the baseline the href input
      // starts from and the value "has anything changed" is measured against.
      // Read off the DOM for the same reason the alt text is: the overlay holds
      // no port, and the rendered `href` is what the stored one produced.
      const href = kind === KIND_LINK ? linkTarget(element) : null
      selectElRef.current = element
      setSelection({
        element,
        docId,
        field,
        hrefField,
        typeName,
        kind,
        mark,
        href,
        // Narrows a popup without changing which one it is. Read here rather
        // than in the popup so the control can say what it is opening.
        actions: element.getAttribute(ACTIONS_ATTR) || "",
        // What to put in the control's caption. A document annotation names no
        // field, and an icon link names only a target.
        label: field || hrefField || typeName || "",
        // The developer's credit is never content. `attrs.js` states the rule and
        // this is where an annotation that ignored it stops — matched on the
        // live target, so it holds whatever the annotation says.
        credit: kind === KIND_LINK && isCreditLink(href),
        emphasis: IN_PLACE_KINDS.has(kind) && !mark && hasEmphasis(element),
      })
      setMarkState(null)
      setTextDirty(false)
      setPopup(null)
      // A message about the field just left behind has no business sitting on
      // the control of the next one.
      showFlash(null)
      setAlert(null)
      onSelect?.({ docId, field, kind })
      wake()
    },
    [wake, showFlash, onSelect],
  )

  const clearSelection = useCallback(() => {
    selectElRef.current = null
    setSelection(null)
    setMarkState(null)
    setTextDirty(false)
    setPopup(null)
    showFlash(null)
    setAlert(null)
    wake()
  }, [showFlash, wake])

  /**
   * A `lines` block, back into the array it came from.
   *
   * ---------------------------------------------------------------------------
   * Why one write and not four
   *
   * Four lines are four fields — `items.0.label` … `items.3.label` — and while
   * an editor is only rewriting them, four leaf writes are exactly right and are
   * what the fallback below does. The moment they add a fifth line or delete the
   * second, the thing that changed is the array's **length**, and `patchField`
   * cannot express that from a leaf: setting `items.3.label` on a three-item
   * list appends, and nothing addressable removes an item at all.
   *
   * So the block commits as one value at the array's own path. That is still
   * `PATCH /api/cms/documents/:id/field`, still validated by the array field's
   * own definition, still landing in `draft` — `patchField` has no reach into
   * `data` — and it is atomic, which four writes are not: a failure halfway
   * through those leaves the page holding two lines of the new copy and two of
   * the old.
   *
   * The members are **merged, not rebuilt**. A siteCopy item holds `lead`,
   * `value` and `note` besides the line, and this surface can see none of them;
   * writing `{label}` objects back would silently empty three fields per line.
   * Hence `held` — what the array holds, read when the editor opened, which is
   * the shortest window this can be read in without making the commit itself
   * asynchronous. (An asynchronous commit is not a style question here: *Náhled*
   * decides whether an edit is outstanding by looking at what is in flight, and
   * a write that has not been submitted yet is in flight nowhere.)
   */
  const saveLines = useCallback(
    (current, next, before, meta) => {
      const arrayPath = lineArrayPath(current.field)
      const leaf = lineLeafPath(current.field)
      const key = `${current.docId} ${arrayPath}`
      const held = linesRef.current
      const list = held && held.key === key ? held.list : null

      // Two conditions, and the second is the one with teeth. A nested leaf
      // (`items.*.a.b`) is not something this merge can express, and guessing
      // would write the line into the wrong key. And the block must account for
      // **every** member of the array: `index.clients` draws two lines out of an
      // `items` that also holds a button's label and a scroll hint, so writing
      // the array from the lines alone would delete two fields nobody was
      // editing — measured, before this line existed. Same length means the
      // lines *are* the array, which is what the Offers block is and what the
      // annotation is for.
      const owns = Array.isArray(list) && (list.length === before.length || linesOwnRef.current.get(key))
      if (owns && leaf && !leaf.includes(".")) {
        const merged = next.map((line, index) => {
          const item = list[index]
          return item && typeof item === "object" && !Array.isArray(item)
            ? { ...item, [leaf]: line }
            : { [leaf]: line }
        })
        save(current.docId, arrayPath, merged, "Ukládám text…", "none", {
          mark: current.mark,
          lines: true,
          shown: meta?.shown !== false,
        })
        linesRef.current = { key, list: merged }
        linesOwnRef.current.set(key, true)
        // The page draws one element per line and React has not been told the
        // count changed, so the new line is stored and not yet on screen. Said
        // rather than left to be noticed, because "I saved and nothing happened"
        // is the report this whole round started from.
        if (next.length !== before.length) {
          showFlash("Uloženo. Počet řádků se změnil — obnovte náhled, ať se projeví.", "ok", 6000)
        }
        return
      }

      // Either the array could not be read, or the block is only part of it.
      // Rewriting the lines that changed is still correct — a leaf write says
      // nothing about the others — but a block that grew or shrank cannot be
      // expressed this way, and saying so is the only honest answer. Nothing is
      // written in that case, so nothing is half applied.
      if (next.length !== before.length) {
        showFlash(
          list
            ? "Neuloženo: v tomto bloku nelze přidat ani ubrat řádek — pole obsahuje i další položky."
            : "Neuloženo: počet řádků se změnil a blok se nepodařilo načíst. Zkuste to znovu.",
          "error",
          7000,
        )
        return
      }
      next.forEach((line, index) => {
        if (line !== before[index]) {
          // No element to write a recovered value into: a line of a `lines`
          // block is not what the annotation points at, and the block as a whole
          // is not what this field holds.
          save(current.docId, linePath(current.field, index), line, "Ukládám text…", "none", {
            element: null,
            shown: meta?.shown !== false,
          })
        }
      })
    },
    [save, showFlash],
  )

  const startEdit = useCallback(() => {
    const element = selectElRef.current
    const current = selection
    if (!element || !current) return

    // Captured here, not read back off the controller afterwards: `onCommit`
    // runs after the controller has already put the original nodes back and
    // been cleared, and comparing against the restored DOM would say "changed"
    // every time. Both sides go through the same reading — for a marked field
    // that means the encoded string, because comparing `*slevy*` against the
    // `textContent` it renders as would report a change on every save.
    const isLines = current.kind === KIND_LINES
    const before = fieldValue(element, current.mark, isLines)

    // Read now, used at commit. The commit itself stays synchronous — see
    // `saveLines` — and this is the whole reason the read is here.
    if (isLines) {
      const key = `${current.docId} ${lineArrayPath(current.field)}`
      linesRef.current = null
      Promise.resolve(onRead?.({ docId: current.docId, field: lineArrayPath(current.field) })).then(
        (list) => {
          if (!Array.isArray(list)) return
          linesRef.current = { key, list }
          // Decided against what the block draws *now*, which is the only moment
          // the two are certainly in step. See `linesOwnRef`.
          if (list.length === before.length) linesOwnRef.current.set(key, true)
        },
        // A block that cannot be read is still editable line for line; the
        // failure is reported at the moment it costs something, not before.
        () => {},
      )
    }

    editorRef.current = beginTextEdit(element, {
      mark: current.mark,
      lines: isLines,
      // The button swap is driven by the value, not by the mode. `onInput` fires
      // on every keystroke and on every mark toggle; both sides go through the
      // same reading as `before` did, so a marked field is compared as its
      // encoded string rather than as the text it renders as. What reaches React
      // is a boolean set to a boolean — one re-render on each of the two
      // transitions, not one per character.
      onInput: () => {
        const now = editorRef.current ? editorRef.current.value() : before
        setTextDirty(!sameValue(now, before))
      },
      // `meta.shown` is `beginTextEdit`'s answer to the only question this
      // surface cannot answer for itself: is the value now on the page? It is
      // false where the element's own shape cannot hold the new arrangement —
      // a line added, an accent that has moved onto different words — and it
      // rides along with the save so the flash can say so instead of reporting
      // a clean "Uloženo" over the previous copy.
      onCommit: (value, meta) => {
        finishEdit()
        if (sameValue(value, before)) showFlash("Beze změny")
        else if (isLines) saveLines(current, value, before, meta)
        else
          save(current.docId, current.field, value, "Ukládám…", "text", {
            element,
            mark: current.mark,
            lines: false,
            shown: meta?.shown !== false,
          })
      },
      onCancel: finishEdit,
      onSelection: setMarkState,
    })
    editingRef.current = true
    setEditing(true)
    setTextDirty(false)
    setMarkState(current.mark ? editorRef.current.markState() : null)
    wake()
  }, [selection, finishEdit, onRead, save, saveLines, showFlash, wake])

  /** Put the caret back where it was. What *Upravit* does while an edit that has
   *  changed nothing is already open: for a text field the element *is* the
   *  input, for an icon link it is the box in the control, and "open it again"
   *  can only mean "focus it" either way. */
  const focusOpen = useCallback(() => {
    editorRef.current?.element?.focus({ preventScroll: true })
  }, [])

  const commitEdit = useCallback(() => {
    editorRef.current?.commit()
  }, [])

  /** Give the element back exactly what it had. `cancel()` restores the page's
   *  own nodes; with nothing open there is only the dirty flag to clear. */
  const cancelEdit = useCallback(() => {
    if (editorRef.current) editorRef.current.cancel()
    else {
      setTextDirty(false)
      wake()
    }
  }, [wake])

  /* --------------------------------------------------------------- link -- */

  /**
   * A link's label and its target, committed together.
   *
   * Contract D's round-three form: every kind but `text` opens a popup shaped
   * for it, and a link's shape is a form of one or two boxes — which is what it
   * was in the control, minus the problem that a control is a strip beside the
   * element and a URL is not a strip-sized thing. `LinkModule` decides what to
   * draw from the annotation, exactly as the control did.
   *
   * The target is checked *again* here. The popup refuses a bad one while the
   * caret is still in the box, and that is where an editor is told what to type;
   * this is where the rule holds, because a component can be bypassed and a
   * write cannot.
   */
  const commitLink = useCallback(
    ({ text, href }) => {
      const current = selection
      if (!current || current.credit) return

      if (href != null) {
        const checked = checkHref(href)
        if (!checked.ok) {
          showFlash(`Neuloženo: ${checked.reason}`, "error", 7000)
          return
        }
        save(current.docId, current.hrefField, checked.value, "Ukládám odkaz…", "href")
        // The new baseline, so selecting this link again offers the target it
        // now has rather than the one it was just given instead of.
        setSelection((held) => (held ? { ...held, href: checked.value } : held))
        // Optimistic, on the anchor itself: a target has nothing visible on the
        // page to update, and the overlay reads it back off the DOM. React
        // overwrites this with the same value when the patched draft returns.
        const link = linkAnchor(selectElRef.current)
        if (link) link.setAttribute("href", checked.value)
      }

      if (text != null) {
        save(current.docId, current.field, text, "Ukládám text odkazu…", "text")
        putBack(selectElRef.current, current.field, text, { how: "text" })
      }

      setPopup(null)
    },
    [selection, save, showFlash],
  )

  /** Mark or unmark the selected range, on the element itself. */
  const toggleMark = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.applyMark(!editor.markState().marked)
  }, [])

  /* -------------------------------------------------------------- image -- */

  const applyAsset = useCallback(
    (asset) => {
      const current = selectElRef.current
      const docId = current?.getAttribute(DOC_ATTR)
      const field = current?.getAttribute(FIELD_ATTR)
      if (!docId || !field) return
      setPopup(null)
      save(docId, field, imageValue(asset), "Nahrazuji obrázek…", "image")

      // Optimistic, and only on the `<img>` itself. The draft round-trip is a
      // request away and an editor who picked a photograph should see it; when
      // the parent's patch comes back through props, React writes the same
      // attributes over these.
      const image = findImage(current)
      if (image && asset?.url) {
        image.removeAttribute("srcset")
        image.src = asset.url
        if (asset.alt) image.alt = asset.alt
      }
    },
    [save],
  )

  const clearImage = useCallback(() => {
    if (!selection) return
    setPopup(null)
    save(selection.docId, selection.field, null, "Odebírám obrázek…", "image")
  }, [selection, save])

  /* ----------------------------------------------------------- image set -- */

  /**
   * An array field, as the popup left it — a set of images or a list of objects.
   *
   * One write for the whole array, and one handler for both kinds: the value at
   * the annotated path is what each body takes and gives back, so "add",
   * "remove" and "reorder" are all the same request. See SetModule for why that
   * is not three of them, and modules.js for the shared prop contract.
   */
  const commitSet = useCallback(
    (list) => {
      if (!selection) return
      setPopup(null)
      const note = selection.kind === KIND_LIST ? "Ukládám seznam…" : "Ukládám sadu…"
      save(selection.docId, selection.field, list, note, "none")
    },
    [selection, save],
  )

  const saveAlt = useCallback(
    (text) => {
      if (!selection || text == null) return
      setPopup(null)
      // A sub-path rather than the whole value: the popup knows the stored alt
      // text but posting the whole image object back would store whatever the
      // library's asset happens to carry, and `{url: …}` is the field's own
      // shape rather than the asset's.
      save(selection.docId, `${selection.field}.alt`, text, "Ukládám popis…", "alt")
      const image = findImage(selectElRef.current)
      if (image) image.alt = text
    },
    [selection, save],
  )

  /* ------------------------------------------------------------- input -- */

  /**
   * What Escape means right now, reassigned on every render so it reads current
   * state without the key handler having to re-register.
   *
   * The order is "whoever is deepest wins", and it has to be stated somewhere
   * because there are four things Escape could close and the framed page's own
   * listeners are a fifth. Returns whether it consumed the key, so the handler
   * knows whether to stop it travelling.
   */
  const escapeRef = useRef(() => false)
  escapeRef.current = () => {
    if (editingRef.current) {
      cancelEdit()
      return true
    }
    if (popup) {
      setPopup(null)
      return true
    }
    if (selectElRef.current) {
      clearSelection()
      return true
    }
    return false
  }

  useEffect(() => {
    const onPointerMove = (event) => {
      const pointer = pointerRef.current
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.pending = true
      pointer.inside = true
      wake()
    }

    const onPointerLeave = () => {
      pointerRef.current.inside = false
      pointerRef.current.pending = true
      wake()
    }

    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return
      if (editingRef.current) return
      if (hitTest(doc, event.clientX, event.clientY, rootRef.current)) {
        // Stops the page starting a text selection or an image drag on
        // something the next click is going to select.
        event.preventDefault()
      }
    }

    const onClick = (event) => {
      if (rootRef.current?.contains(event.target)) return

      if (editingRef.current) {
        const edited = editorRef.current?.element
        if (edited && (event.target === edited || edited.contains(event.target))) return
        event.preventDefault()
        event.stopPropagation()
        cancelEdit()
        return
      }

      const target = hitTest(doc, event.clientX, event.clientY, rootRef.current)
      if (target) {
        // Editable things stop being links while the overlay is up. Everything
        // else on the page keeps working — an editor has to be able to open the
        // menu and drive the horizontal section to reach what they came for.
        event.preventDefault()
        event.stopPropagation()
        select(target)
      } else if (selectElRef.current) {
        clearSelection()
      }
    }

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return
      // The preview panel closes on Escape too. Whoever is deepest in a modal
      // state gets the key; consuming it here stops both happening.
      if (escapeRef.current()) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onResize = () => wake()

    doc.addEventListener("pointermove", onPointerMove, { capture: true, passive: true })
    doc.addEventListener("pointerleave", onPointerLeave, { capture: true, passive: true })
    doc.addEventListener("pointerdown", onPointerDown, true)
    doc.addEventListener("click", onClick, true)
    doc.addEventListener("keydown", onKeyDown, true)
    win.addEventListener("resize", onResize, { passive: true })

    // The same key handler on the Studio's document as well, because the media
    // library is drawn there (see the render below) and a keystroke belongs to
    // whichever document holds focus — an iframe's events do not reach its
    // parent. Two registrations, one handler, and no document ever sees the
    // other's events.
    const host = hostDocument()
    host?.addEventListener("keydown", onKeyDown, true)

    return () => {
      doc.removeEventListener("pointermove", onPointerMove, true)
      doc.removeEventListener("pointerleave", onPointerLeave, true)
      doc.removeEventListener("pointerdown", onPointerDown, true)
      doc.removeEventListener("click", onClick, true)
      doc.removeEventListener("keydown", onKeyDown, true)
      win.removeEventListener("resize", onResize)
      host?.removeEventListener("keydown", onKeyDown, true)
    }
    // `escapeRef` is why this list is short: everything Escape has to know about
    // is read through it at the moment the key arrives, so a popup opening does
    // not tear down and re-register five document listeners.
  }, [doc, win, wake, select, clearSelection, cancelEdit])

  /* ---------------------------------------------------- control metrics -- */

  useEffect(() => {
    const node = controlRef.current
    // The frame's own ResizeObserver, for the same reason as its rAF: the box it
    // reports belongs to the frame's rendering, and its callbacks are serviced
    // with that document.
    if (!node || typeof win.ResizeObserver === "undefined") return undefined
    const observer = new win.ResizeObserver((entries) => {
      const box = entries[0]?.borderBoxSize?.[0]
      const w = box ? box.inlineSize : node.offsetWidth
      const h = box ? box.blockSize : node.offsetHeight
      if (w !== controlSizeRef.current.w || h !== controlSizeRef.current.h) {
        controlSizeRef.current = { w, h }
        wake()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [win, wake])

  // Anything that changes what the control contains changes how wide it is, and
  // therefore where it belongs.
  useEffect(() => {
    wake()
  }, [selection, editing, flash, alert, markState, textDirty, popup, wake])

  /* ------------------------------------------------------------ unmount -- */

  useEffect(
    () => () => {
      // Cancelling always restores, and that has to include the overlay being
      // torn down mid-edit — a hot reload, the frame navigating, the host
      // unmounting it. The element goes back to what it was either way.
      editorRef.current?.dispose()
      win.cancelAnimationFrame(rafRef.current)
      // Clearing the handle is not tidiness. `wake()` treats a non-zero handle
      // as "a frame is already booked", and StrictMode mounts, tears down and
      // mounts again — so a handle left behind by the discarded first mount
      // makes the second one believe it is permanently up to date, and nothing
      // is ever painted again. Silent, and only in development, which is the
      // worst combination there is.
      rafRef.current = 0
      clearTimeout(flashTimerRef.current)
    },
    [win],
  )

  /* ------------------------------------------------------------- render -- */

  const kind = selection?.kind
  const host = hostDocument()
  // The kind table, at the one place it decides what is drawn. `credit` is the
  // only thing that can take a way in away — see `attrs.js`.
  const inPlace = IN_PLACE_KINDS.has(kind)
  const opensPopup = POPUP_KINDS.has(kind)

  // The whole of the button swap. Not "is something open" — an editor who opened
  // a field and typed nothing has nothing to save and is not asked to.
  const changed = textDirty

  return (
    <>
      {createPortal(
        <div
          ref={rootRef}
          className={styles.root}
          // Both directions of the same number. CSS can multiply by a custom
          // property but dividing by one is a computed-value-time trick not worth
          // relying on for a hairline width, so the reciprocal is handed over ready
          // to use and there is still only one source for it.
          style={{ "--cms-zoom": zoom, "--cms-inv": 1 / (zoom || 1) }}
          data-cms-overlay=""
          // The overlay is chrome, not content. Nothing inside it should ever be
          // read out as part of the page it is sitting on.
          aria-hidden="true"
        >
          {/* Named parts. The overlay is chrome with no accessible surface of
              its own, so these attributes are how a test — or the next person with
              devtools open — says "that box, the one tracking the selection". */}
          <div ref={hoverBoxRef} data-cms-part="hover" className={`${styles.box} ${styles.boxHover}`} />
          <div ref={selectBoxRef} data-cms-part="selection" className={`${styles.box} ${styles.boxSelected}`} />

          <div
            ref={controlRef}
            data-cms-part="control"
            className={styles.control}
            // Keeping focus in the contentEditable while a button is pressed is what
            // makes "Uložit" able to read a selection that still exists.
            onMouseDown={(event) => event.preventDefault()}
          >
            {selection ? (
              <>
                <span className={styles.field} title={`${selection.docId} · ${selection.label}`}>
                  {selection.label}
                </span>

                {inPlace && !editing && selection.emphasis ? (
                  <span
                    className={styles.refusal}
                    title="Toto pole se v kódu vykresluje se zvýrazněním, ale schéma ho nedeklaruje — bez toho nelze zvýraznění při uložení zachovat"
                  >
                    Nedeklarované zvýraznění — upravte ve formuláři
                  </span>
                ) : null}

                {inPlace && !editing && !selection.emphasis ? (
                  <button type="button" className={styles.primary} data-cms-action="edit" onClick={startEdit}>
                    Upravit
                  </button>
                ) : null}

                {inPlace && editing ? (
                  <>
                    {/* The emphasis affordance, and only where the field says it
                        has one. It is a toggle on the live range rather than two
                        buttons, because "is this already the accent" is a
                        question the editor can answer at a glance and the
                        control has no room to ask it twice. */}
                    {selection.mark && markState?.active ? (
                      <button type="button" className={styles.ghost} data-cms-action="mark" onClick={toggleMark}>
                        {markState.marked ? selection.mark.clear : selection.mark.label}
                      </button>
                    ) : null}
                    {selection.mark && !markState?.active ? (
                      <span className={styles.hint}>{selection.mark.hint}</span>
                    ) : null}

                    <Commit changed={changed} onOpen={focusOpen} onCancel={cancelEdit} onCommit={commitEdit} />
                  </>
                ) : null}

                {/* ------------------------------------------------- link -- */}

                {kind === KIND_LINK && selection.credit ? (
                  <span
                    className={styles.refusal}
                    title="Odkaz na autora webu není obsah klienta a je výslovně mimo rozsah editace"
                  >
                    Odkaz autora webu — needituje se
                  </span>
                ) : null}

                {/* --------------------------------------------- popups -- */}

                {/* One button for five kinds. It used to be four blocks of this
                    JSX — and, before that, three buttons on the control for an
                    image alone, of which only one opened anything. Everything a
                    popup kind offers is inside the popup, so the control's job
                    is the same sentence every time: this is what you selected,
                    here is the way in. Which body opens is `Popup.jsx`'s
                    question, answered from `kind` and `actions` alone. */}
                {opensPopup && !selection.credit ? (
                  <button
                    type="button"
                    className={styles.primary}
                    data-cms-action="edit"
                    onClick={() => setPopup(kind)}
                  >
                    {selection.actions === "moderate" ? "Moderovat" : "Upravit"}
                  </button>
                ) : null}

                {flash ? (
                  <span className={styles.flash} data-tone={flash.tone} title={flash.message}>
                    {flash.message}
                  </span>
                ) : null}

                {/* A refused save, and the two answers to it.

                    It stays until the editor picks one. *Zkusit znovu* sends
                    the same value again; *Vrátit uložené* is the "offers the
                    text back" of EDIT-MODE.md taken literally — the stored
                    value replaces what is on screen only because somebody asked
                    it to, and it is not offered at all when the server never
                    said what it holds. Nothing here writes on its own. */}
                {alert ? (
                  <span className={styles.alert} data-cms-part="failure" role="alert">
                    <span className={styles.alertText}>{alert.message}</span>
                    {alert.restore ? (
                      <button
                        type="button"
                        className={styles.ghost}
                        data-cms-action="restore"
                        onClick={alert.restore}
                      >
                        Vrátit uložené
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.primary}
                      data-cms-action="retry"
                      onClick={alert.retry}
                    >
                      Zkusit znovu
                    </button>
                    <button
                      type="button"
                      className={styles.ghost}
                      data-cms-action="dismiss"
                      onClick={() => setAlert(null)}
                    >
                      Zavřít
                    </button>
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>,
        doc.body,
      )}

      {/* The popup, over the Studio rather than over the page.
          `channel.js` used to carry a `media` request to the host and a `media`
          answer back, so that a library which is a two-thumbnail grid inside a
          390px phone preset could be opened at full width instead. Mounting from
          the host makes that round trip pointless — this component is *already*
          running in the Studio's realm, so it simply renders there, gets the
          Studio's own stylesheet for free and needs no capability handshake.
          Wrapped in the overlay's root class at zoom 1 because that is where
          `.mediaScrim` gets its ground and its stacking context, and nothing in
          the host is counter-scaled.

          One portal for every kind that has a body, because there is one popup.
          `data-cms-popup`
          says which body is in it, for anyone reading the DOM. */}
      {popup && host
        ? createPortal(
            <div
              className={styles.root}
              style={{ "--cms-zoom": 1, "--cms-inv": 1 }}
              data-cms-overlay="popup"
              data-cms-popup={popup}
            >
              <PopupModule
                kind={popup}
                actions={selection?.actions}
                docId={selection?.docId}
                field={selection?.field}
                hrefField={selection?.hrefField}
                href={selection?.href}
                typeName={selection?.typeName}
                onClose={() => setPopup(null)}
                onPick={applyAsset}
                onAlt={saveAlt}
                onRemove={clearImage}
                onCommitSet={commitSet}
                onCommitList={commitSet}
                onCommitLink={commitLink}
                onModerated={(verb) => {
                  setPopup(null)
                  showFlash(verb === "archive" ? "Recenze archivována" : "Recenze skryta")
                }}
                onDocSaved={() => {
                  setPopup(null)
                  showFlash("Uloženo do konceptu")
                }}
              />
            </div>,
            host.body,
          )
        : null}
    </>
  )
}

/* --------------------------------------------------------------- commit -- */

/**
 * *Upravit*, or *Zrušit* / *Uložit* — and the switch between them is the value,
 * not the mode.
 *
 * > potom když se něco změní dole vpravo vyměnit ty buttony za uložit nebo
 * > zrušit
 *
 * "Když se něco změní", not "když se začne editovat". An editor who opens a
 * heading, reads it and moves on has nothing to save, and a *Uložit* offered to
 * them is a button that writes the value that is already there — a draft, an
 * `updated_at`, and a row in the history for no edit. So while what is on screen
 * still matches what is stored, the control keeps saying what it said before,
 * and taking it again just puts the caret back.
 *
 * One component, so a field that edits in place cannot answer this differently
 * from the next one.
 */
function Commit({ changed, onOpen, onCancel, onCommit }) {
  if (!changed) {
    return (
      <button
        type="button"
        className={styles.primary}
        // The armed look. Same button, same word, and an editor can see that
        // the click landed.
        data-open=""
        data-cms-action="open"
        title="Píšete přímo do stránky. Enter odřádkuje, Esc zavře."
        onClick={onOpen}
      >
        Upravit
      </button>
    )
  }
  return (
    <>
      {/* Named, because something other than a person presses them: *Náhled*
          commits whatever is open before it takes the overlay down, and it does
          that by taking the same button an editor would (see commit.js). It used
          to synthesise the Enter key, which was the commit path until Enter
          became how a line break is typed. */}
      <button type="button" className={styles.ghost} data-cms-action="cancel" onClick={onCancel}>
        Zrušit
      </button>
      <button type="button" className={styles.primary} data-cms-action="save" onClick={onCommit}>
        Uložit
      </button>
    </>
  )
}

/* ------------------------------------------------------------- painting -- */

/**
 * Write a rectangle onto a tracking box, and only if it moved.
 *
 * The comparison is not a micro-optimisation. A section that has come to rest
 * produces the identical rect every frame, and writing the same transform back
 * still invalidates the element and gives the compositor something to do; a
 * still page should cost nothing at all.
 */
function paintBox(node, rect, frame) {
  if (!node) return
  if (!rect || !isOnScreen(rect, frame)) {
    if (node.dataset.on) {
      delete node.dataset.on
      node.style.opacity = "0"
    }
    return
  }
  const x = Math.round(rect.left * 10) / 10
  const y = Math.round(rect.top * 10) / 10
  const w = Math.round(rect.width * 10) / 10
  const h = Math.round(rect.height * 10) / 10
  const previous = node._cms
  if (!previous || previous.x !== x || previous.y !== y || previous.w !== w || previous.h !== h) {
    node.style.transform = `translate3d(${x}px, ${y}px, 0)`
    node.style.width = `${w}px`
    node.style.height = `${h}px`
    node._cms = { x, y, w, h }
  }
  if (!node.dataset.on) {
    node.dataset.on = "1"
    node.style.opacity = "1"
  }
}

/**
 * Put the control against the selection, counter-scaled.
 *
 * `size` is the control's *layout* size. Multiplying by `1/zoom` converts it
 * into the frame's coordinate space, which is the space `anchor()` works in and
 * the space the selection's rect is already in — so a 32px-tall control against
 * a frame emulating a phone at 0.5 occupies 64 frame pixels and still draws 32
 * pixels tall on the editor's screen.
 *
 * The cap is the case that only appears once the arithmetic is real. A 390px
 * phone drawn at 0.5 is 195 screen pixels wide, and a control with a field name
 * and three buttons in it is wider than that. Counter-scaling it anyway puts
 * half of it outside the iframe, where it is not clipped — it simply is not
 * there. So legibility yields at the point where it would cost visibility: the
 * control shrinks to fit rather than growing past the edge, and an editor on a
 * phone preset at a deep zoom reads smaller buttons instead of missing ones.
 */
function paintControl(node, rect, frame, zoom, size) {
  if (!node) return
  if (!rect || !size.w || !isOnScreen(rect, frame)) {
    if (node.dataset.on) {
      delete node.dataset.on
      node.style.opacity = "0"
      node.style.pointerEvents = "none"
    }
    return
  }

  // Ceiling on the control's LAYOUT width, written before anything is measured
  // so it can never chase its own measurement. Expressed in layout pixels: at
  // `scale` frame pixels each, `frame.width * 0.94 * zoom` of them draw as 94%
  // of the frame. The field name is the flexible part and ellipses away;
  // buttons keep their size, because a button too small to read is worse than a
  // truncated label.
  const maxWidth = Math.round(frame.width * 0.94 * zoom)
  if (node._cmsMax !== maxWidth) {
    node.style.maxWidth = `${maxWidth}px`
    node._cmsMax = maxWidth
  }

  // And a floor under the same idea for the case the ceiling cannot fix — a
  // frame so narrow that the buttons alone overflow it. Legibility yields
  // before visibility does: half a control outside an iframe is not clipped,
  // it is absent.
  const scale = Math.min(1 / zoom, (frame.width * 0.94) / size.w)
  const control = { width: size.w * scale, height: size.h * scale }
  const spot = anchor(rect, control, frame, GAP * scale)

  const x = Math.round(spot.x * 10) / 10
  const y = Math.round(spot.y * 10) / 10
  const s = Math.round(scale * 1000) / 1000
  const previous = node._cms
  if (!previous || previous.x !== x || previous.y !== y || previous.s !== s) {
    node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`
    node._cms = { x, y, s }
  }
  if (node.dataset.side !== spot.side) node.dataset.side = spot.side
  if (node.dataset.place !== spot.place) node.dataset.place = spot.place
  if (!node.dataset.on) {
    node.dataset.on = "1"
    node.style.opacity = "1"
    node.style.pointerEvents = "auto"
  }
}

/* --------------------------------------------------------- hit testing -- */

/**
 * What is editable under this point, in `doc` — the framed page's document, not
 * the one this code is running in.
 *
 * ---------------------------------------------------------------------------
 * Why the browser's own answer is evidence and not the answer
 *
 * The previous version asked `elementsFromPoint` first and returned the first
 * annotation it could walk up to, falling back to a geometric sweep only when
 * the stack produced nothing at all. Both halves are needed and neither is
 * sufficient on its own, and the ordering was the bug:
 *
 *  - The stack sees only what is *painted and hit-testable*. This page covers
 *    itself with a shader canvas (`GridDistortion`, eleven places), a cursor
 *    lattice and a pile of `pointer-events: none` — so for an annotated heading
 *    the stack's topmost node is routinely the section, whose `closest()` finds
 *    nothing, and for a shader plane it is the canvas.
 *  - Walking *up* from what the stack found answers with an **enclosing**
 *    annotation. Measured on `/o-nas`: clicking the text laid over
 *    `AboutHero__photo` selected the photograph, because the canvas that covers
 *    the heading lives inside the annotated wrapper and the heading — which the
 *    editor is looking straight at — was never a candidate. Six of that page's
 *    fields were unreachable that way, which is the "clicking does nothing"
 *    report: something is selected, just never the thing that was clicked.
 *
 * So every annotation is scored against the point and the stack contributes one
 * fact rather than the verdict:
 *
 *   1. **Rendered** beats not rendered — a section still faded out, or one
 *      `content-visibility` has skipped, loses to one that is on screen. This is
 *      what stops a hidden second copy of a line (the horizontal sections draw
 *      three) from claiming a click on the visible one.
 *   2. **Smaller beats larger** — a word inside a section is not the section,
 *      and a caption over a photograph is not the photograph. Measured on the
 *      element's own line boxes (`getClientRects`), so a point in the ragged
 *      gap after a short line does not count as a hit on the paragraph.
 *   3. **Painted here beats inferred** — a tie between two boxes of the same
 *      size goes to the one the stack actually reached.
 *
 * A point outside the frame's viewport is nothing: `elementFromPoint` answers
 * null there, and a geometric sweep would happily answer with an element
 * scrolled off the side of a horizontal section.
 */
function hitTest(doc, x, y, root) {
  if (!(x >= 0) || !(y >= 0)) return null
  const win = doc.defaultView
  if (win && (x > win.innerWidth || y > win.innerHeight)) return null

  // Annotations the stack implicates. Kept as a set because their usefulness is
  // "this one is certainly painted here", not "this one is the answer".
  const painted = new Set()
  // The topmost hit-testable element at the point, when that element is itself
  // annotated. See below.
  let onTop = null
  for (const element of doc.elementsFromPoint(x, y)) {
    if (root && root.contains(element)) continue
    const found = element.closest?.(EDITABLE_SELECTOR)
    if (found) painted.add(found)
    if (!onTop && found === element) onTop = element
  }

  /**
   * The one case the stack answers outright.
   *
   * `elementsFromPoint` is paint order, topmost first, and it skips anything
   * `pointer-events: none` — so if its *first* answer is itself an annotated
   * element, that element is drawn here, nothing annotated is drawn over it, and
   * it is unambiguously what the editor clicked. Nothing below can improve on
   * that, and the ranking demonstrably makes it worse: this homepage reveals its
   * footer from behind the last section, so the footer's claim keeps its box on
   * screen underneath `QnaContact` — smaller than the heading over it, invisible,
   * and until this line the winner of every click on "Máte nějaký dotaz?", which
   * is one of the four elements reported as uneditable.
   *
   * Only the first, and only when it is the annotation rather than a child of
   * one. Walking *up* from the stack is the round-three bug — a shader canvas
   * inside an annotated wrapper answers with the wrapper and never with the
   * heading laid over it — and an annotation further down the stack is one
   * something else is painted over, which is exactly what the ranking is for.
   * Measured across `/`, `/o-nas`, `/kontakt` and `/nabidky`: 28 annotated
   * elements are never the stack's answer at their own centre (14 partner logos
   * under the orbit's path, the Offers title under its per-character spans, nine
   * spans on `/o-nas`), and every one of them still reaches the sweep below.
   */
  if (onTop) return owner(onTop)

  let best = null
  let bestRank = null
  const consider = (element, area) => {
    if (area == null) return
    // Lexicographic, cheapest question first: `checkVisibility` is only asked
    // about elements whose box actually covers the point, which on a page with
    // two dozen annotations is nearly always none of them.
    const rank = [isRendered(element) ? 0 : 1, area, painted.has(element) ? 0 : 1]
    if (bestRank && !better(rank, bestRank)) return
    best = element
    bestRank = rank
  }

  for (const element of doc.querySelectorAll(EDITABLE_SELECTOR)) consider(element, boxAt(element, x, y))
  // An annotation the stack reached whose own boxes do not contain the point —
  // a child painting outside its parent, a clip path. Rare, and free to keep.
  for (const element of painted) consider(element, areaOf(element))

  return owner(best)
}

/**
 * A `lines` block owns every annotation inside it.
 *
 * "Smaller beats larger" is right for everything else and exactly wrong here: a
 * block that is edited as one is *made of* line elements, and a line that still
 * carries its own annotation — because the page annotates both, or because a
 * build is half migrated — would win the point and hand back the affordance the
 * `lines` kind exists to replace. One click, one block.
 */
function owner(element) {
  if (!element) return element
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node.getAttribute?.(KIND_ATTR) === KIND_LINES && node.hasAttribute(FIELD_ATTR)) return node
  }
  return element
}

/** Better, or as good — so the last of two identically ranked candidates wins,
 *  and in document order that is the deeper and more specific one. */
function better(rank, held) {
  for (let i = 0; i < rank.length; i += 1) {
    if (rank[i] !== held[i]) return rank[i] < held[i]
  }
  return true
}

/**
 * The area of the smallest box of `element` that covers the point, or null when
 * none of them does.
 *
 * `getClientRects()` rather than `getBoundingClientRect()`: for an inline run of
 * text the bounding box is the union of its lines, which on a wrapped paragraph
 * is a rectangle mostly made of the margin beside it. The line boxes are where
 * the words are, and they are also the right size to compare against a
 * photograph sitting behind them.
 */
function boxAt(element, x, y) {
  let best = null
  for (const rect of element.getClientRects()) {
    if (!rect.width || !rect.height) continue
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue
    const area = rect.width * rect.height
    if (best == null || area < best) best = area
  }
  return best
}

const areaOf = (element) => {
  const rect = element.getBoundingClientRect()
  return rect.width && rect.height ? rect.width * rect.height : null
}

/**
 * Is this element on screen at all?
 *
 * `checkVisibility` with `checkOpacity` answers for the whole ancestor chain,
 * which is what this page needs: sections arrive at `opacity: 0` and fade in,
 * and the horizontal ones keep several copies of a line alive at once. It is a
 * ranking, not a filter — an element caught at opacity 0 mid-reveal is still
 * selectable when nothing visible competes for the point, because refusing it
 * would make a field unreachable for the length of an animation.
 */
function isRendered(element) {
  return typeof element.checkVisibility === "function"
    ? element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })
    : true
}

/**
 * Which kind this is.
 *
 * Contract A's own example annotates a photograph without naming a kind —
 * `editable(doc, "photo")` — so a declared kind is trusted and an undeclared
 * one is inferred rather than assumed to be text. Offering "Upravit" on a
 * picture is a worse failure than looking at the DOM for a moment.
 *
 * Everything below reaches for the element's *own* document rather than the
 * global one, which here means the frame's rather than the Studio's.
 */

// Kinds believed on sight. `text` is deliberately absent from this set:
// `editable()` writes it for everything that is not an image — including
// `editable(doc, "photo")`, which names no kind at all — so trusting it would
// turn the inference below into dead code and put "Upravit" on a photograph.
// The three new kinds are the opposite case: a set, a form and a link are not
// shapes a DOM can be read for, so they are never guessed at.
const DECLARED_KINDS = new Set([KIND_LINES, KIND_IMAGE, KIND_IMAGE_SET, KIND_LIST, KIND_DOCUMENT, KIND_LINK])

function resolveKind(element) {
  const declared = element.getAttribute(KIND_ATTR)
  if (DECLARED_KINDS.has(declared)) return declared
  if (element.tagName === "IMG") return KIND_IMAGE
  const hasText = Boolean(element.textContent?.trim())
  if (!hasText) {
    if (element.querySelectorAll("img").length === 1) return KIND_IMAGE
    const background = element.ownerDocument.defaultView?.getComputedStyle(element).backgroundImage
    if (background && background !== "none") return KIND_IMAGE
  }
  return KIND_TEXT
}

/**
 * The `<a>` an annotation is about.
 *
 * Self, then inside, then outside — in that order, because the element carrying
 * the attributes is usually the anchor itself, sometimes a wrapper the site
 * needed for a magnet or a hover, and occasionally a span inside one. Reaching
 * outwards last keeps a nested annotation from claiming the section's link.
 */
function linkAnchor(element) {
  if (!element) return null
  if (element.tagName === "A") return element
  return element.querySelector?.("a") || element.closest?.("a") || null
}

const linkTarget = (element) => linkAnchor(element)?.getAttribute("href") ?? ""

function findImage(element) {
  if (!element) return null
  if (element.tagName === "IMG") return element
  return element.querySelector("img")
}

/**
 * Write a value the host reported as stored back into the page.
 *
 * The text half is `text.js`'s own write-back — the same map of which of the
 * page's nodes drew which characters that a commit goes through, and the same
 * refusals. It used to be one clause narrow enough to be useless: a lone text
 * node with no break in it, which is not the shape of any line carrying an
 * accent and not the shape of any of the four hand-broken blocks either.
 *
 * @param {object} held  what `save()` remembered: `how` to write, and the
 *                       field's `mark` and `lines` so the value can be read as
 *                       the page renders it
 * @returns {boolean} whether the page now shows the value
 */
function putBack(element, field, value, held) {
  if (!element || !element.isConnected) return false
  const how = held?.how

  // A target the server stored, or put back after a refused write. The anchor is
  // the page's own node and React owns its `href` prop, so this is the same
  // bargain the alt text makes: correct until the next render, which will write
  // the same value from the patched draft.
  if (how === "href") {
    const link = linkAnchor(element)
    if (link && typeof value === "string") {
      link.setAttribute("href", value)
      return true
    }
    return false
  }

  if (String(field).endsWith(".alt")) {
    const image = findImage(element)
    if (!image) return false
    image.alt = typeof value === "string" ? value : (value?.alt ?? "")
    return true
  }

  if (typeof value === "string" || Array.isArray(value)) {
    return applyStored(element, value, { mark: held?.mark, lines: held?.lines })
  }

  if (value && typeof value === "object" && value.url) {
    const image = findImage(element)
    if (!image) return false
    image.removeAttribute("srcset")
    image.src = value.url
    if (value.alt != null) image.alt = value.alt
    return true
  }

  return false
}

/**
 * What a refused save says, in Czech, and what to do about it.
 *
 * Three sentences by construction: what happened, that nothing of theirs was
 * taken away, and the one next step that is actually available. The code decides
 * the third — a 401 is answered by signing in again and a 422 by changing the
 * text, and telling an editor to "try again" against a validation error is how
 * a person ends up pressing a button eight times.
 */
function failureText(error, recovered) {
  const reason = error ? String(error.message || error) : ""
  const code = error?.code
  const next =
    code === "unauthorized"
      ? "Přihlaste se prosím znovu v jiné záložce a pak zkuste Zkusit znovu."
      : code === "forbidden"
        ? "Tento blok nemáte oprávnění upravovat."
        : code === "invalid"
          ? "Upravte text tak, aby prošel, a uložte ho znovu."
          : // A 409 means somebody else typed into THIS field while this edit
            // was open, and it is the one code where "Zkusit znovu" is the
            // wrong advice: retrying would put this text over theirs, which is
            // the overwrite the server just refused. *Vrátit uloženou verzi* is
            // beside this message and holds exactly what they wrote.
            code === "conflict"
            ? "Někdo jiný toto pole mezitím změnil. Podívejte se na uloženou verzi (Vrátit uloženou verzi) a rozhodněte se, co má zůstat."
            : "Zkuste to prosím znovu."
  const lost = recovered ? "" : " Uloženou verzi se navíc nepodařilo načíst."
  return `Neuloženo: ${reason || "neznámá chyba"}. Váš text zůstal na stránce.${lost} ${next}`
}

/**
 * A guard, and no longer the feature.
 *
 * Emphasis that a field **declares** is edited on the page: the mark arrives in
 * `data-cms-mark`, the accent runs stay visible while typing, and *Uložit*
 * writes the encoding back. This asks the other question — does an element that
 * declared nothing nevertheless render as though it had emphasis? — because for
 * such a field the answer to *Upravit* would be one flat text node, and saving
 * it would delete an accent nobody said was there.
 *
 * Reached only when there is no declared mark, so it can never overrule one.
 * The test is conservative for the reason the declaration exists: it looks only
 * at the element that directly wraps each run of text, and treats the field as
 * carrying emphasis when some runs sit in a classed wrapper and others sit in
 * none. WhoWeAre's per-character reveal spans carry no class and its `.word`
 * wrappers are not the innermost, so that paragraph reads as plain — which it
 * is, and which is exactly why the affordance itself must never be built on a
 * rule like this one.
 */
function hasEmphasis(element) {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const marked = new Set()
  let plain = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.data.trim()) continue
    const wrapper = node.parentElement
    const name = wrapper && wrapper !== element ? (wrapper.getAttribute("class") || "").trim() : ""
    if (name) marked.add(name)
    else plain += 1
  }
  return marked.size > 0 && plain > 0
}

