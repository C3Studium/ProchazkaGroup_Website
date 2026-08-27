// Editing the real element, in place.
//
// *Upravit* does not open a popup with a textarea in it. It makes the element
// on the page editable, because the question an editor is answering is "does
// this line fit" and a textarea cannot answer it — the heading's font, its
// tracking, its column width and the point at which it wraps are all properties
// of where it sits.
//
// ---------------------------------------------------------------------------
// Why this file is 200 lines and not 20
//
// The elements worth editing on this homepage are not `<h2>Text</h2>`. WhoWeAre
// splits its copy into one `<motion.span>` per character so each can hold its
// own opacity through the reveal; Offers interleaves highlighted and plain
// spans. Those spans belong to React, and framer-motion holds direct references
// to them and writes `style.opacity` on them every frame.
//
// A contentEditable element cannot keep them. Typing merges, splits and deletes
// nodes; the browser will happily leave one span holding six characters. So
// entering edit mode replaces the contents with a single text node — and the
// question is what "restore" then means.
//
// `innerHTML` in, `innerHTML` back out is the obvious answer and it is wrong.
// Assigning innerHTML builds *new* nodes; React's fibers and motion's refs
// still point at the old ones, which are now detached. Nothing throws. The
// characters simply stop animating, and the bug surfaces a week later as "the
// reveal is broken on the who-we-are text sometimes".
//
// So the original children are **moved**, not copied: out into a detached
// fragment on the way in, back into place on the way out, the same node objects
// throughout. React's tree is intact the whole time and motion carries on
// writing to nodes that are temporarily off-screen. Cancelling restores what
// was there in the strongest sense available — the identical nodes, with
// whatever inline styles the animation last wrote on them.
//
// ---------------------------------------------------------------------------
// Inline emphasis, and why the working content is not always one text node
//
// Four of the homepage's editable lines are stored as `máme *slevy*` and drawn
// as `<span class="hl">`. Flattening one of those into a single text node and
// saving what came back would delete the accent silently, which is why the
// overlay used to refuse them outright.
//
// It does not have to. This file works in **runs** — `[text, marked]` pairs read
// off the real DOM — and a field that carries emphasis says so in its schema and
// hands over a `mark` (see `@/cms/schemas/marks`). The mark owns three things
// this file deliberately does not know: which class the accent is drawn with,
// how it is encoded into the stored string, and at what granularity that
// encoding can be read back. So the working content for such a field is a run
// per accent, the originals are **cloned** so the accent stays on screen while
// it is being edited, and `value()` asks the mark to encode what the DOM now
// says rather than reading `textContent` and losing half of it.
// ---------------------------------------------------------------------------
// Lines, and why a text field is not one line
//
// Four "nejde editovat" reports on the homepage were one element each, and one
// cause: every one of them holds a hard `<br />`. This file used to build its
// working content out of `element.textContent`, and `textContent` of `A<br>B` is
// "AB" — so the first save would have welded the two lines together. The page
// answered by not annotating them at all, which is what an editor experiences as
// a click that does nothing.
//
// So a break is content. The stored representation is `\n`, `<br>` is how it
// renders, and the three places that had to learn it are the read (a `<br>` is
// one character of the value), the write (a `\n` is a `<br>` element) and the
// caret arithmetic behind the mark, which counts characters and has to count
// that one. Enter therefore inserts a break rather than committing — committing
// moved to the control, where *Uložit* already was.
//
// The trailing-break convention, because it is the only part that is not
// obvious: a `<br>` with nothing after it is invisible and the caret cannot be
// put on the line it opens, so the working DOM carries a **filler** `<br>` after
// a trailing one. Reading drops exactly one trailing break and writing adds
// exactly one back, which makes the round trip stable however many times a mark
// is toggled.
//
// ---------------------------------------------------------------------------
// `lines` — one block, several stored strings
//
// The Offers copy is four `items[].label`s drawn as four lines. Edited line by
// line an editor cannot add a fifth or drop the third, because a line that is
// going away has no element left to click. `lines: true` makes the whole block
// one editor: the container's element children are read as one line each, the
// value is an **array** of strings rather than one string, and the caller writes
// each member back to its own field. Everything else — the parked originals, the
// mark, the caret arithmetic — is the same code as a multi-line `text`, because
// a line break is a line break.
//
// ---------------------------------------------------------------------------

import { decodeLines, encodeLines } from "@/cms/schemas/marks"

// `plaintext-only` is what "plain text only" means when the browser implements
// it: no rich paste, no execCommand bold, Enter inserts a newline rather than a
// <div>. Chrome and Safari have it; the fallback still gets the same behaviour
// from the handlers below, it just has to work for it.
// Probed in the element's *own* document. The overlay's JavaScript runs in the
// Studio's realm while the element being edited is in the frame's, and while the
// answer to this question happens to be a property of the browser rather than of
// a document, asking the wrong one is the mistake this whole file has to keep
// not making.
const plaintextOnly = (doc) => {
  if (!doc) return false
  const probe = doc.createElement("div")
  try {
    probe.setAttribute("contenteditable", "plaintext-only")
    return probe.contentEditable === "plaintext-only"
  } catch {
    return false
  }
}

/**
 * Turn one element into an editor, and hand back the way out.
 *
 * @param {HTMLElement} element
 * @param {object} handlers
 * @param {object} [handlers.mark]  the inline emphasis this field declares, from
 *   `@/cms/schemas/marks`. Absent for the overwhelming majority of fields, and
 *   its absence is the behaviour every field had before marks existed.
 * @param {boolean} [handlers.lines]  the block is several stored strings, one
 *   per element child. `value()` answers with an array instead of a string.
 * @param {(value:string|string[])=>void} handlers.onCommit
 * @param {()=>void} handlers.onCancel
 * @param {()=>void} [handlers.onInput]
 * @param {(state:{active:boolean, marked:boolean})=>void} [handlers.onSelection]
 *   what the caret is sitting on, so the control can offer mark or unmark. Fired
 *   only when the answer changes; `selectionchange` fires per pointer move.
 */
export function beginTextEdit(element, { mark, lines = false, onCommit, onCancel, onInput, onSelection } = {}) {
  const doc = element.ownerDocument
  const win = doc.defaultView

  // --- snapshot -------------------------------------------------------------
  // Live node references, moved aside. Not markup.
  const parked = doc.createDocumentFragment()
  const original = Array.from(element.childNodes)
  // Read before the children move, because it is a fact about the arrangement
  // React built rather than about the one this file is going to build. Read for
  // every field now, marked or not: a break is content whatever the field is,
  // and runs are what carries it.
  const originalRuns = readRuns(element, mark, lines)
  // Which of the page's own nodes drew which characters — the map a commit
  // writes the committed value back through, so the element ends up holding what
  // was saved instead of the words it replaced. Null when the arrangement cannot
  // be written safely; see `buildPlan`.
  const plan = buildPlan(element, originalRuns, mark, lines)

  const priorAttrs = {
    contenteditable: element.getAttribute("contenteditable"),
    spellcheck: element.getAttribute("spellcheck"),
    translate: element.getAttribute("translate"),
    role: element.getAttribute("role"),
  }

  for (const node of original) parked.appendChild(node)

  // The accent element the page itself drew, emptied, kept as the pattern for
  // every marked run written below. Cloning it rather than building a bare
  // `<span class="…">` means whatever else the site puts on that element — a
  // second class, a data attribute — survives an edit; the mark declaration only
  // has to name the class, not the whole element.
  const template = mark ? markTemplate(parked, mark) : null

  writeRuns(element, originalRuns, mark, template)

  // `plaintext-only` is exactly wrong for a field with a mark: its contract is
  // that the element holds no inline structure, and this one holds the accent
  // runs an editor is here to keep. `true` plus the handlers below — paste
  // intercepted, drop refused, `format*` input types prevented, Enter inserting
  // one `<br>` of this file's own making — gives the same guarantees without
  // that clause. (A `<br>` is not inline structure in the sense the clause
  // means: `plaintext-only` produces them itself.)
  element.setAttribute("contenteditable", mark ? "true" : plaintextOnly(doc) ? "plaintext-only" : "true")
  element.setAttribute("spellcheck", "false")
  // Chrome's translate widget rewrites text nodes under the caret.
  element.setAttribute("translate", "no")
  // Styled from the overlay stylesheet through a `:global` selector rather than
  // by writing inline styles: the elements worth editing are motion components,
  // and motion rewrites their `style` attribute every frame. An attribute React
  // never rendered is one neither React nor motion will take back.
  element.setAttribute("data-cms-editing", "")
  // Lenis reads wheel events on the window; a long paragraph that has become a
  // focused editor should not scroll the timeline out from under the caret.
  element.setAttribute("data-lenis-prevent", "")

  let live = true
  let restored = false

  /** Put every original node back, exactly as it was. */
  const restore = () => {
    if (restored) return
    restored = true
    while (element.firstChild) element.removeChild(element.firstChild)
    // `parked` empties itself into the element — same nodes, original order.
    element.appendChild(parked)

    for (const [name, value] of Object.entries(priorAttrs)) {
      if (value === null) element.removeAttribute(name)
      else element.setAttribute(name, value)
    }
    element.removeAttribute("data-cms-editing")
    element.removeAttribute("data-lenis-prevent")
  }

  // What would be stored if this were committed now, normalised the way it will
  // be stored — so the caller can compare it against the value it read before
  // the edit began and get one answer.
  //
  // A line at a time, and that is not an optimisation: `mark.encode` reads its
  // input as one line of words and joins them with a space, so handing it a
  // value with a break in it would weld two lines every time an accent was
  // toggled. The mark encodes lines; this file owns what a line is.
  const value = () => encodeValue(readRuns(element, mark, false), mark, lines)

  /* --- the mark ------------------------------------------------------------ */

  // Last reported answer, so `selectionchange` — which fires on every pointer
  // move of a drag — turns into at most one React render per real change.
  let reported = null

  /** Where the caret is, and whether what it holds is already marked. */
  const markState = () => {
    if (!mark || !live) return { active: false, marked: false }
    const selection = win.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return { active: false, marked: false }
    const range = selection.getRangeAt(0)
    if (!element.contains(range.commonAncestorContainer)) return { active: false, marked: false }

    const { text, flags } = spread(readRuns(element, mark, false))
    const [from, to] = mark.snap(text, ...offsetsOf(element, range))
    if (from >= to) return { active: false, marked: false }

    // Whitespace is not what an editor means by "is this highlighted" — the
    // space between two marked words sits outside the asterisks either way.
    let marked = false
    let any = false
    for (let i = from; i < to; i += 1) {
      if (!text[i].trim()) continue
      if (!any) {
        any = true
        marked = flags[i]
      } else if (!flags[i]) {
        marked = false
      }
    }
    return { active: any, marked }
  }

  const reportSelection = () => {
    // A field with no mark has nothing to report and must not pay for asking:
    // `onInput` runs on every keystroke, and this is a React `setState` at the
    // other end of it — on a paragraph that is 619 nodes when it is not being
    // typed into, one render per character is not free.
    if (!onSelection || !mark) return
    const next = markState()
    if (reported && reported.active === next.active && reported.marked === next.marked) return
    reported = next
    onSelection(next)
  }

  /**
   * Mark or unmark what is selected, on the real range.
   *
   * Rebuilt from flags rather than patched with `Range.surroundContents`, which
   * throws on any range that crosses an element boundary — which is every range
   * that spans an existing accent, i.e. exactly the ones unmarking is for. The
   * range is widened by the mark first, because the encoding is read back at the
   * mark's own granularity and a highlight that covers half a word on screen and
   * a whole one once saved is a lie the editor was told.
   */
  const applyMark = (on) => {
    if (!mark || !live) return
    const selection = win.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (!element.contains(range.commonAncestorContainer)) return

    const { text, flags } = spread(readRuns(element, mark, false))
    const [from, to] = mark.snap(text, ...offsetsOf(element, range))
    if (from >= to) return

    for (let i = from; i < to; i += 1) flags[i] = on
    writeRuns(element, gather(text, flags), mark, template)
    selectOffsets(win, element, from, to)
    reported = null
    reportSelection()
    onInput?.()
  }

  const detach = () => {
    if (!live) return
    live = false
    element.removeEventListener("keydown", onKeyDown, true)
    element.removeEventListener("paste", onPaste, true)
    element.removeEventListener("drop", onDrop, true)
    element.removeEventListener("input", onInputEvent)
    element.removeEventListener("beforeinput", onBeforeInput, true)
    // On the document, because that is where the browser fires it — a selection
    // is a property of the document, not of the element it happens to be in.
    if (mark) doc.removeEventListener("selectionchange", onSelectionChange)
  }

  const cancel = () => {
    detach()
    restore()
    element.blur?.()
    onCancel?.()
  }

  const commit = () => {
    const next = value()

    // Written into the parked originals while they are still detached, so the
    // element goes from the typed text straight to the committed text in one
    // paint — there is never a frame in which the page shows the old words.
    // `restore()` then puts back the very same nodes, which is what keeps
    // React's fibers and motion's refs pointing at live objects.
    //
    // What is written is `next` read back — the stored value, decoded the way
    // the page renders it — and not the arrangement the contentEditable happens
    // to be holding. The two differ whenever the encoding is coarser than the
    // DOM, which is exactly what a mark is: marking one more word leaves the DOM
    // with four runs where the stored `*máme slevy*` renders as two, and writing
    // the DOM's four would put a shape on screen that no reload could reproduce.
    // Going through the store makes the screen and the store the same statement
    // by construction, which is the property this whole file is for.
    const shown = applyPlan(plan, storedSpread(next, mark, lines))

    detach()
    restore()

    element.blur?.()
    // `shown` is the honest half: false means the value is on its way to the
    // store and the page is still drawing the old one, which is a thing the
    // editor has to be told rather than left to discover.
    onCommit?.(next, { shown })
  }

  // --- keeping it plain -----------------------------------------------------

  function onPaste(event) {
    event.preventDefault()
    const text = event.clipboardData?.getData("text/plain") || ""
    insertContent(win, element, normaliseText(text))
  }

  function onDrop(event) {
    // A dragged selection carries markup with it in every browser that has
    // ever shipped. Refusing the drop is the only reliable answer.
    event.preventDefault()
  }

  function onBeforeInput(event) {
    // Belt and braces for the `contenteditable="true"` fallback, where the
    // browser is otherwise willing to insert formatted HTML.
    if (event.inputType === "insertFromPaste" || event.inputType === "insertFromDrop") {
      const text = event.dataTransfer?.getData("text/plain")
      if (text != null) {
        event.preventDefault()
        insertContent(win, element, normaliseText(text))
      }
    }
    if (event.inputType?.startsWith("format")) event.preventDefault()
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      cancel()
      return
    }
    if (event.key === "Enter") {
      // A break, not a commit. It used to commit, on the argument that the value
      // is one string and a newline is something the editor can see and the page
      // can never show — which was true of the fields that were annotated
      // *because* the ones with a break in them had been left out. Now that a
      // break is content, Enter is how one is typed, and committing is the
      // control's job: *Uložit* is already there and already the thing an editor
      // reaches for. Escape still cancels.
      event.preventDefault()
      insertBreak(win, element)
      onInputEvent()
    }
    // Everything else, including the browser's own undo, is left alone.
  }

  function onInputEvent() {
    // Typing can move a run boundary — a character added at the end of an accent
    // extends it — so the control's answer is stale until this is re-read.
    reported = null
    reportSelection()
    onInput?.()
  }

  function onSelectionChange() {
    reportSelection()
  }

  element.addEventListener("keydown", onKeyDown, true)
  element.addEventListener("paste", onPaste, true)
  element.addEventListener("drop", onDrop, true)
  element.addEventListener("beforeinput", onBeforeInput, true)
  element.addEventListener("input", onInputEvent)
  if (mark) doc.addEventListener("selectionchange", onSelectionChange)

  focusAtEnd(win, element)

  return {
    element,
    /** What was on the page when this opened, in the shape `value()` answers. */
    originalValue: encodeValue(originalRuns, mark, lines),
    mark: mark || null,
    lines,
    value,
    applyMark,
    markState,
    commit,
    cancel,
    /** Unmount path: restore, tell nobody. Cancelling always restores, and
     *  "always" has to include the overlay going away underneath it. */
    dispose: () => {
      detach()
      restore()
    },
    isLive: () => live,
  }
}

/* ------------------------------------------------------------------- runs -- */
//
// The representation this file and `@/cms/schemas/marks` agree on: an ordered
// list of `[text, marked]`. It is what the page already renders (Offers builds
// its line from exactly this shape), what a mark encodes into the stored string,
// and what the DOM can be read as at any moment during an edit. Nothing below
// knows which class means "accent" — the mark says.

/** The break, in the value. `<br>` is the DOM's spelling of this one character. */
const BREAK = "\n"

/**
 * The value this field would store, without entering an edit.
 *
 * The overlay needs it before `beginTextEdit` runs, to tell an edit that changed
 * something from one that did not: for a marked field, comparing the typed value
 * against `textContent` would report a change every single time, because one has
 * asterisks in it and the other never can — and for any field with a break in
 * it, `textContent` is the two lines welded together, which is the bug this
 * round is about.
 *
 * @param {HTMLElement} element
 * @param {object} [mark]
 * @param {boolean} [lines]  answer with one string per element child
 */
export const fieldValue = (element, mark, lines = false) =>
  encodeValue(readRuns(element, mark, lines), mark, lines)

/**
 * The atoms a value is made of, in document order: text nodes, and the `<br>`s
 * between them.
 *
 * A `<br>` is one character of the value and it is the reason this replaced a
 * plain text-node walk. Everything that counts characters — the runs, a caret
 * offset, the range a mark is applied to — counts it here, once, rather than
 * each in its own way.
 */
function atoms(root) {
  // `SHOW_TEXT | SHOW_ELEMENT` is 5 in every realm, so the host's copy of the
  // interface answers for a walker over a node in the frame.
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  const found = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.data) found.push({ node, text: node.data })
    } else if (node.tagName === "BR") {
      found.push({ node, text: BREAK })
    }
  }
  return found
}

/** Is this node inside the mark, without leaving `root`? */
function inMark(node, root, mark) {
  const from = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  for (let el = from; el && el !== root; el = el.parentElement) {
    if (el.classList?.contains(mark.className)) return true
  }
  return false
}

/**
 * The element's contents as runs, read off whatever the DOM says right now.
 *
 * `split` is the `lines` reading: each element child of the container is a line
 * of its own, because that is what the page draws — four spans, four lines, and
 * no `<br>` between them to say so. It is only ever true for the *original*
 * arrangement; once this file has built the working content, the lines are
 * `<br>`s like any other and the flat reading is the truth.
 *
 * One trailing break is dropped, always. The working DOM keeps a filler `<br>`
 * after a trailing one so the caret has a line to sit on (see `writeRuns`), and
 * a trailing `<br>` in the page's own markup is a line nobody authored either.
 */
function readRuns(element, mark, split = false) {
  const runs = []
  const push = (text, on) => {
    if (!text) return
    const last = runs[runs.length - 1]
    if (last && last[1] === on) last[0] += text
    else runs.push([text, on])
  }
  const read = (root) => {
    for (const { node, text } of atoms(root)) push(text, mark ? inMark(node, element, mark) : false)
  }

  if (!split) read(element)
  else {
    let started = false
    const line = () => {
      if (started) push(BREAK, false)
      started = true
    }
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        // Whitespace between two block children is the markup's indentation,
        // not a line. Anything else standing on its own is one.
        if (!child.data.trim()) continue
        line()
        push(child.data, false)
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // A `<br>` between two block children says what the block already says.
        // Inside one it is an ordinary break and `read` picks it up.
        if (child.tagName === "BR") continue
        line()
        read(child)
      }
    }
  }

  const last = runs[runs.length - 1]
  if (last && last[0].endsWith(BREAK)) {
    last[0] = last[0].slice(0, -1)
    if (!last[0]) runs.pop()
  }
  return runs
}

/**
 * Runs -> what gets stored, normalised the way it will be stored.
 *
 * The cut into lines is `encodeLines`' and not this file's, deliberately: a mark
 * encodes *one line* — `HIGHLIGHT.encode` splits on whitespace and joins with a
 * space, so a value with a break in it welds two lines the moment it arrives —
 * and the schema layer that owns the encoding is where that has to be stated
 * once, next to the `decodeLines` the site reads it back with. This file decides
 * only what a line is on screen and how the lines are handed over: joined for a
 * `text` field, kept apart for a `lines` one.
 *
 * A `lines` value drops its empty lines. Every member is one item of an array
 * whose `label` the schema requires, so an empty one is not a line anybody is
 * writing — it is two Enters in a row on the way to the next one.
 */
function encodeValue(runs, mark, lines) {
  const joined = normaliseText(mark ? encodeLines(mark, runs) : runs.map(([text]) => text).join(""))
  return lines ? joined.split(BREAK).filter(Boolean) : joined
}

/** Runs -> one string plus one flag per character. */
function spread(runs) {
  let text = ""
  const flags = []
  for (const [part, on] of runs) {
    text += part
    for (let i = 0; i < part.length; i += 1) flags.push(Boolean(on))
  }
  return { text, flags }
}

/** The inverse. */
function gather(text, flags) {
  const runs = []
  for (let i = 0; i < text.length; i += 1) {
    const last = runs[runs.length - 1]
    if (last && last[1] === flags[i]) last[0] += text[i]
    else runs.push([text[i], flags[i]])
  }
  return runs
}

/**
 * An emptied copy of the accent element the page itself drew, or nothing.
 *
 * Taken off the parked originals, so it carries whatever the site put on that
 * element beyond the one class the mark names. The `style` attribute is dropped
 * rather than cloned: these elements sit inside motion components, and a style
 * copied mid-animation would freeze one frame of the reveal onto every run an
 * editor creates.
 */
function markTemplate(source, mark) {
  for (const el of source.querySelectorAll("*")) {
    if (!el.classList?.contains(mark.className)) continue
    const clone = el.cloneNode(false)
    clone.removeAttribute("style")
    return clone
  }
  return null
}

/**
 * Replace the element's contents with these runs. Working nodes only.
 *
 * A break in a run is a `<br>` element, and a run that *ends* on one gets a
 * second, empty `<br>` after it: a trailing break with nothing behind it draws
 * no line and cannot hold a caret, so an editor who presses Enter at the end
 * would watch nothing happen. `readRuns` drops exactly one trailing break, so
 * writing and reading round-trip however many times a mark is toggled.
 */
function writeRuns(element, runs, mark, template) {
  const doc = element.ownerDocument
  while (element.firstChild) element.removeChild(element.firstChild)

  const write = (text, on) => {
    if (!text) return
    if (!on) {
      element.appendChild(doc.createTextNode(text))
      return
    }
    const wrapper = template ? template.cloneNode(false) : doc.createElement(mark?.tag || "span")
    if (!template && mark) wrapper.className = mark.className
    wrapper.appendChild(doc.createTextNode(text))
    element.appendChild(wrapper)
  }

  for (const [text, on] of runs) {
    const parts = String(text).split(BREAK)
    for (let i = 0; i < parts.length; i += 1) {
      if (i) element.appendChild(doc.createElement("br"))
      write(parts[i], on)
    }
  }

  if (element.lastChild?.tagName === "BR") element.appendChild(doc.createElement("br"))
  // A contentEditable with no child at all cannot hold a caret; an editor who
  // selected everything and pressed delete has to be able to type again.
  if (!element.firstChild) element.appendChild(doc.createTextNode(""))
}

/**
 * A range's boundaries as offsets into the element's value.
 *
 * Measured rather than walked. A boundary can sit in a text node, but it can
 * just as well sit *between* two children — which is where a triple-click, a
 * caret on an empty line and every selection that ends on a `<br>` land — and
 * the walk this replaced had one clause for the first case and a clamp to the
 * ends for all the others. Cloning what precedes the boundary and measuring it
 * answers all of them the same way, in the one arithmetic that already knows a
 * `<br>` is worth a character.
 */
function offsetsOf(element, range) {
  const doc = element.ownerDocument
  const before = (container, offset) => {
    const span = doc.createRange()
    span.setStart(element, 0)
    try {
      span.setEnd(container, offset)
    } catch {
      return 0
    }
    return lengthOf(span.cloneContents())
  }
  const start = before(range.startContainer, range.startOffset)
  const end = before(range.endContainer, range.endOffset)
  return start <= end ? [start, end] : [end, start]
}

/** How many characters of the value a fragment holds — `<br>`s included. */
function lengthOf(fragment) {
  let total = 0
  for (const { text } of atoms(fragment)) total += text.length
  return total
}

/** Put the selection back over `[from, to)` of the element's value. */
function selectOffsets(win, element, from, to) {
  const doc = element.ownerDocument
  const found = atoms(element)
  if (!found.length) return
  const range = doc.createRange()

  // `at` places one boundary. A position inside a text node is an offset in it;
  // a position on either side of a `<br>` is a boundary beside the element,
  // because a `<br>` has no interior to put a caret in.
  const at = (position, place) => {
    let seen = 0
    for (const { node, text } of found) {
      const next = seen + text.length
      if (position <= next) {
        if (node.nodeType === Node.TEXT_NODE) place(node, position - seen)
        else if (position === seen) place(node.parentNode, indexOf(node))
        else place(node.parentNode, indexOf(node) + 1)
        return
      }
      seen = next
    }
    const last = found[found.length - 1]
    if (last.node.nodeType === Node.TEXT_NODE) place(last.node, last.text.length)
    else place(last.node.parentNode, indexOf(last.node) + 1)
  }

  at(from, (node, offset) => range.setStart(node, offset))
  at(to, (node, offset) => range.setEnd(node, offset))

  const selection = win.getSelection()
  if (!selection) return
  selection.removeAllRanges()
  selection.addRange(range)
}

const indexOf = (node) => Array.prototype.indexOf.call(node.parentNode.childNodes, node)

/**
 * Collapse everything a clipboard can carry into one line of text — and leave
 * the non-breaking space alone.
 *
 * It used to begin `.replace(/\u00a0/g, " ")`, which is a content bug on a Czech
 * site rather than a tidy-up. Czech typography sets a non-breaking space after
 * the single-letter prepositions (v, a, k, s, z, o, u, i) so a line never ends
 * on a lone letter; the live public HTML carries 13 of them on `/` alone. A
 * person cannot type one, cannot see that it has gone, and would not know to put
 * it back — so a save that quietly replaced them destroyed typography nobody
 * could restore, and the round trip differed from what was stored, which made an
 * untouched line read as changed the moment it was opened.
 *
 * The rule that replaces it: a run of whitespace becomes **one** character,
 * because a page cannot show the difference between one space and three and a
 * contentEditable manufactures the extra ones. Which character it becomes is the
 * only question, and a run that is exactly one non-breaking space is the only
 * case where the answer is not an ordinary space — a longer or mixed run is the
 * browser's doing, not the author's.
 *
 * The ends are trimmed of both kinds. A leading or trailing non-breaking space
 * is never the typography; it is what a contentEditable leaves behind when a
 * space is typed with nothing after it yet.
 */
const NO_BREAK = /^[\u00a0\u202f]$/

/**
 * A break is not whitespace to be collapsed.
 *
 * The rule is applied per line — each one loses its runs of ordinary spaces and
 * its own ends — and the breaks between them are left exactly as they are, since
 * a break is the one piece of whitespace an author put there on purpose. Blank
 * lines at the very ends go, because they are what a contentEditable leaves
 * behind rather than something anybody typed.
 */
export function normaliseText(text) {
  return String(text)
    .split(BREAK)
    .map((line) => line.replace(/\s+/g, (run) => (NO_BREAK.test(run) ? run : " ")).replace(/^\s+|\s+$/g, ""))
    .join(BREAK)
    .replace(/^\n+|\n+$/g, "")
}

/** Text with breaks in it, inserted at the caret as text nodes and `<br>`s. */
function insertContent(win, element, text) {
  if (!text) return
  const parts = String(text).split(BREAK)
  for (let i = 0; i < parts.length; i += 1) {
    if (i) insertBreak(win, element)
    insertNode(win, parts[i] ? win.document.createTextNode(parts[i]) : null)
  }
}

/**
 * One line break at the caret.
 *
 * Two `<br>`s when the caret is at the very end, and only then: the second is
 * the filler that gives the new, empty line something to draw and the caret
 * somewhere to sit. `readRuns` drops one trailing break, so the filler is never
 * part of the value.
 */
function insertBreak(win, element) {
  const doc = win.document
  const br = doc.createElement("br")
  if (!insertNode(win, br)) return
  if (!hasContentAfter(element, br)) element.appendChild(doc.createElement("br"))
}

/** Put a node at the caret and leave the caret after it. */
function insertNode(win, node) {
  const selection = win.getSelection()
  if (!selection || selection.rangeCount === 0) return false
  const range = selection.getRangeAt(0)
  range.deleteContents()
  if (node) {
    range.insertNode(node)
    range.setStartAfter(node)
  }
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

/** Is there anything after this node inside the element? */
function hasContentAfter(element, node) {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let seen = false
  for (let each = walker.nextNode(); each; each = walker.nextNode()) {
    if (each === node) {
      seen = true
      continue
    }
    if (!seen) continue
    if (each.nodeType === Node.TEXT_NODE ? each.data.length > 0 : each.tagName === "BR") return true
  }
  return false
}

/* -------------------------------------------------------- the write-back -- */
//
// What a commit leaves on the page.
//
// The element is restored to the page's own nodes on the way out — that is not
// negotiable, it is the whole reason the originals are moved rather than copied
// — so unless something writes the committed value into those nodes, restoring
// puts the *old* words back on screen. The framed page does not re-render when
// a save lands (nothing hands it new props; see `useFrameSurface`), so there is
// no later render to correct it either. A save that reports "Uloženo" and shows
// the previous copy is worse than one that fails: an editor retypes, and the
// second attempt starts from text that is no longer what is stored.
//
// This used to be one text node per line and nothing else — `slots.every(one =>
// one.length === 1)`, null otherwise, and `applyLines` writing nothing when it
// got the null. Every line carrying a `*highlight*` is two nodes, so it fired on
// exactly the content the mark was built for.
//
// The rule that replaces it keeps the same bargain and states it precisely:
// **write only into text nodes the page already drew, never create or remove
// one.** So a commit is expressible when it changes what the characters *are*
// and not where the element's structure puts them:
//
//   - the lines line up. A break is a `<br>`, or the seam between two block
//     children of a `lines` container; both are elements, and inventing one is
//     the thing this file will not do.
//   - the accent runs line up, or lose one. `[plain, accented]` may become a
//     longer or shorter `[plain, accented]`, and it may become `[plain]` — the
//     accent's own span stays where React put it holding nothing, which is what
//     unmarking looks like. It may not become `[plain, accented, plain]`: the
//     third run has no element to live in, and this file does not make one. See
//     `align`, which also refuses a drop that could have gone two ways.
//
// Inside a run the new text is spread over the run's nodes by common prefix and
// suffix, so WhoWeAre's 569 one-character spans keep their characters and only
// the ones the edit actually touched are rewritten. Everything anybody typed is
// on screen either way — the distribution decides *which node holds it*, and it
// is chosen to disturb the reveal as little as it can.
//
// When it is not expressible the commit still stores the value, `applyPlan`
// answers false, and the control says so. A stated limit is the point: the
// alternative is showing the old words under the word "Uloženo".

/**
 * One character of the element's value, and which of the page's nodes drew it.
 *
 * The character sequence is `readRuns`' — same atoms, same treatment of `<br>`,
 * same `lines` reading, same trailing break dropped — because the two are
 * compared against each other in `buildPlan` and a plan that disagrees with the
 * value is refused rather than used.
 */
function originalCells(element, mark, split) {
  const cells = []
  const push = (owner, text, flag, br) => {
    for (let i = 0; i < text.length; i += 1) cells.push({ owner, ch: text[i], flag, br })
  }
  const read = (root) => {
    for (const { node, text } of atoms(root)) {
      if (node.nodeType === Node.TEXT_NODE) push(node, text, mark ? inMark(node, element, mark) : false, false)
      else push(node, BREAK, false, true)
    }
  }

  if (!split) read(element)
  else {
    let started = false
    const line = () => {
      // Owner `null`: this break is the seam between two block children, which
      // no node draws and nothing can therefore write to.
      if (started) push(null, BREAK, false, true)
      started = true
    }
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!child.data.trim()) continue
        line()
        push(child, child.data, false, false)
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === "BR") continue
        line()
        read(child)
      }
    }
  }

  if (cells.length && cells[cells.length - 1].br) cells.pop()
  return cells
}

/** One cell per character of a value that has no nodes behind it. */
function cellsOfSpread({ text, flags }) {
  const cells = []
  for (let i = 0; i < text.length; i += 1) {
    cells.push({ owner: null, ch: text[i], flag: Boolean(flags[i]), br: text[i] === BREAK })
  }
  return cells
}

/** Whitespace, as `normaliseText` reads it. */
const SPACE = /\s/

/**
 * `normaliseText`, applied to cells so the flags and the owners come along.
 *
 * The rule is that file's, restated once here because the value and the DOM
 * write have to agree character for character: a run of whitespace inside a line
 * becomes one character, a lone non-breaking space stays itself, each line is
 * trimmed, and blank lines at the very ends go. The surviving character of a
 * collapsed run keeps the first one's owner, so the space between two words is
 * written back into the node that already held it.
 *
 * @returns {{cells:object[], breakOwner:object|null}[]} one entry per line
 */
function normaliseCells(cells) {
  const lines = [{ cells: [], breakOwner: null }]
  let i = 0
  while (i < cells.length) {
    const cell = cells[i]
    if (cell.br) {
      lines.push({ cells: [], breakOwner: cell.owner })
      i += 1
      continue
    }
    if (SPACE.test(cell.ch)) {
      let end = i
      let run = ""
      while (end < cells.length && !cells[end].br && SPACE.test(cells[end].ch)) {
        run += cells[end].ch
        end += 1
      }
      lines[lines.length - 1].cells.push({ ...cell, ch: NO_BREAK.test(run) ? run : " " })
      i = end
      continue
    }
    lines[lines.length - 1].cells.push(cell)
    i += 1
  }

  for (const line of lines) {
    while (line.cells.length && SPACE.test(line.cells[0].ch)) line.cells.shift()
    while (line.cells.length && SPACE.test(line.cells[line.cells.length - 1].ch)) line.cells.pop()
  }
  while (lines.length && !lines[0].cells.length) lines.shift()
  while (lines.length && !lines[lines.length - 1].cells.length) lines.pop()
  return lines
}

/** Normalised lines -> the string and flags they spell. */
function spreadOfLines(lines) {
  let text = ""
  const flags = []
  lines.forEach((line, index) => {
    if (index) {
      text += BREAK
      flags.push(false)
    }
    for (const cell of line.cells) {
      text += cell.ch
      for (let i = 0; i < cell.ch.length; i += 1) flags.push(cell.flag)
    }
  })
  return { text, flags }
}

/** A value read off the DOM, normalised the way it will be stored. */
const normaliseSpread = (spreadValue) => spreadOfLines(normaliseCells(cellsOfSpread(spreadValue)))

/**
 * The map a commit writes through, or null when this arrangement cannot be
 * written to.
 *
 * `pieces` is the value in document order: a run of characters, the node that
 * drew them, and whether they are accented. A break is a piece of its own with
 * no owner, which is what makes "the lines line up" a length comparison rather
 * than a special case.
 *
 * Four refusals, and each of them is a shape where writing would be a lie:
 *   - a break the page spells inside a text node (a literal `\n` in its data),
 *     since one node would then have to be written twice;
 *   - a node drawing on two lines, for the same reason;
 *   - a plan whose characters are not the ones `readRuns` reports, which means
 *     these two readings have drifted apart and neither should be trusted;
 *   - and, at write time, a value whose lines or accent runs do not line up.
 */
function buildPlan(element, runs, mark, split) {
  const source = originalCells(element, mark, split)
  const lines = normaliseCells(source)

  const pieces = []
  const lineOf = new Map()
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (index) {
      if (line.breakOwner && line.breakOwner.nodeType === Node.TEXT_NODE) return null
      pieces.push({ owner: null, text: BREAK, marked: false, br: true })
    }
    for (const cell of line.cells) {
      if (lineOf.has(cell.owner) && lineOf.get(cell.owner) !== index) return null
      lineOf.set(cell.owner, index)
      const last = pieces[pieces.length - 1]
      if (last && !last.br && last.owner === cell.owner && last.marked === cell.flag) last.text += cell.ch
      else pieces.push({ owner: cell.owner, text: cell.ch, marked: cell.flag, br: false })
    }
  }

  const shown = spreadOfLines(lines)
  const expected = normaliseSpread(spread(runs))
  if (shown.text !== expected.text) return null
  if (shown.flags.length !== expected.flags.length) return null
  for (let i = 0; i < shown.flags.length; i += 1) {
    if (shown.flags[i] !== expected.flags[i]) return null
  }

  // Nodes whose every character was whitespace at a line's edge. They hold the
  // markup's own indentation, they draw nothing, and emptying them is what makes
  // the element's text exactly the stored value rather than the stored value
  // plus whatever the source file was indented with.
  const kept = new Set(pieces.map((piece) => piece.owner))
  const blanks = new Set()
  for (const cell of source) {
    if (cell.owner && cell.owner.nodeType === Node.TEXT_NODE && !kept.has(cell.owner)) blanks.add(cell.owner)
  }

  return { pieces, blanks: [...blanks] }
}

/** Pieces, cut at the breaks. */
function splitPieces(pieces) {
  const lines = [[]]
  for (const piece of pieces) {
    if (piece.br) lines.push([])
    else lines[lines.length - 1].push(piece)
  }
  return lines
}

/** A value, cut at the breaks. */
function splitSpread({ text, flags }) {
  const lines = []
  let start = 0
  for (let i = 0; i <= text.length; i += 1) {
    if (i === text.length || text[i] === BREAK) {
      lines.push({ text: text.slice(start, i), flags: flags.slice(start, i) })
      start = i + 1
    }
  }
  return lines
}

/** One line's pieces, grouped by whether they are accented. */
function groupPieces(line) {
  const groups = []
  for (const piece of line) {
    const last = groups[groups.length - 1]
    if (last && last.marked === piece.marked) last.pieces.push(piece)
    else groups.push({ marked: piece.marked, pieces: [piece] })
  }
  return groups
}

/** One line's characters, grouped the same way. */
function runsOfSpread({ text, flags }) {
  const runs = []
  for (let i = 0; i < text.length; i += 1) {
    const marked = Boolean(flags[i])
    const last = runs[runs.length - 1]
    if (last && last.marked === marked) last.text += text[i]
    else runs.push({ marked, text: text[i] })
  }
  return runs
}

/**
 * Spread one run's new text over the nodes that drew its old text.
 *
 * Common prefix and suffix first, so an edit rewrites only the nodes it touched:
 * a character typed at the end of a 569-span paragraph moves one span's data and
 * leaves 568 alone, which is what keeps the per-character reveal looking like
 * itself. What is left in the middle goes into the node the change starts in,
 * and the nodes it ran over are emptied — the alternative is guessing how a
 * shorter string should be re-split, and a guess would move characters between
 * spans for no reason.
 *
 * The concatenation over the run's nodes is exactly `text`, whatever the split.
 */
function distribute(pieces, text, out) {
  const old = pieces.map((piece) => piece.text).join("")

  let head = 0
  while (head < old.length && head < text.length && old[head] === text[head]) head += 1
  let tail = 0
  while (
    tail < old.length - head &&
    tail < text.length - head &&
    old[old.length - 1 - tail] === text[text.length - 1 - tail]
  ) {
    tail += 1
  }
  const oldEnd = old.length - tail
  const newEnd = text.length - tail

  // Where the replaced middle lands: the node the change starts inside, or the
  // last one when the change is an insertion past the end of the last.
  let target = pieces.length - 1
  let scan = 0
  for (let i = 0; i < pieces.length; i += 1) {
    scan += pieces[i].text.length
    if (scan > head) {
      target = i
      break
    }
  }

  let at = 0
  for (let i = 0; i < pieces.length; i += 1) {
    const end = at + pieces[i].text.length
    let value = text.slice(Math.min(at, head), Math.min(end, head))
    if (i === target) value += text.slice(head, newEnd)
    if (end > oldEnd) value += text.slice(newEnd + Math.max(0, at - oldEnd), newEnd + (end - oldEnd))
    out.set(pieces[i], value)
    at = end
  }
}

/**
 * Which of a line's nodes hold which of the value's runs — or null.
 *
 * The straight case is one run per group in order, and that is what an ordinary
 * edit produces. The interesting one is a run that has **gone**: unmarking a
 * highlight leaves the accent's own `<span>` with nothing to hold, and emptying
 * it is expressible — the span stays where React put it, drawing nothing, and
 * the next real render removes it. The opposite, a run that has *appeared*, is
 * not: it would need an element this file will not create.
 *
 * A group may therefore be left empty, but only where that is the **only**
 * reading. Matching greedily from the left and again from the right and
 * demanding the same answer is what checks it: for `[plain, accent]` losing its
 * accent both passes assign the text to the plain group, while for
 * `[plain, accent, plain]` they disagree — and a value that could legitimately
 * land in either of two nodes must not be guessed at, since the two can be
 * styled differently and only one of them is what a reload would show.
 */
function align(groups, runs) {
  if (runs.length > groups.length) return null

  const left = new Array(groups.length).fill(-1)
  let ahead = 0
  for (let g = 0; g < groups.length && ahead < runs.length; g += 1) {
    if (groups[g].marked === runs[ahead].marked) left[g] = ahead++
  }
  if (ahead !== runs.length) return null

  const right = new Array(groups.length).fill(-1)
  let behind = runs.length - 1
  for (let g = groups.length - 1; g >= 0 && behind >= 0; g -= 1) {
    if (groups[g].marked === runs[behind].marked) right[g] = behind--
  }
  if (behind !== -1) return null

  for (let g = 0; g < groups.length; g += 1) {
    if (left[g] !== right[g]) return null
  }
  return left
}

/**
 * Put a value into the page's own nodes. All of it, or none of it.
 *
 * @returns {boolean} whether the page now shows the value
 */
function applyPlan(plan, next) {
  if (!plan) return false

  const lines = splitPieces(plan.pieces)
  const want = splitSpread(next)
  if (lines.length !== want.length) return false

  const out = new Map()
  for (let i = 0; i < lines.length; i += 1) {
    const runs = runsOfSpread(want[i])
    if (!runs.length) {
      // The line was emptied. Every node that drew it holds nothing now, which
      // is a thing text nodes can express — unlike the line itself going away.
      for (const piece of lines[i]) out.set(piece, "")
      continue
    }
    const groups = groupPieces(lines[i])
    const map = align(groups, runs)
    if (!map) return false
    for (let g = 0; g < groups.length; g += 1) {
      if (map[g] < 0) for (const piece of groups[g].pieces) out.set(piece, "")
      else distribute(groups[g].pieces, runs[map[g]].text, out)
    }
  }

  // Nothing is written until every line has been accounted for: half a value on
  // screen would be a new way of showing something that was never stored.
  const data = new Map()
  for (const piece of plan.pieces) {
    if (piece.br || !piece.owner) continue
    data.set(piece.owner, (data.get(piece.owner) ?? "") + (out.get(piece) ?? ""))
  }
  for (const node of plan.blanks) data.set(node, "")
  for (const [node, text] of data) node.data = text
  return true
}

/**
 * A **stored** value, into the element the page is drawing it with.
 *
 * The other direction of the same write, for the two moments the store is ahead
 * of the screen: a save the server reconciled into something else, and an editor
 * who asks for the stored text back after a failed one. Same rules, same
 * refusals, and the same all-or-nothing.
 *
 * @returns {boolean} whether the page now shows it
 */
export function applyStored(element, value, { mark, lines = false } = {}) {
  if (!element || !element.isConnected) return false
  const plan = buildPlan(element, readRuns(element, mark, lines), mark, lines)
  return applyPlan(plan, storedSpread(value, mark, lines))
}

/**
 * A stored string -> the characters and accents the page would render it as.
 *
 * Through the mark's own `decode`, because the encoding is the mark's: this file
 * has never seen an asterisk and is not going to start. The space between two
 * decoded parts is supplied here for the reason `marks.js` states — `decode`
 * answers in the component's convention, where the component draws the
 * separator.
 */
function storedSpread(value, mark, lines) {
  const text = lines
    ? (Array.isArray(value) ? value : [value]).map((line) => String(line ?? "")).join(BREAK)
    : String(value ?? "")

  if (!mark) {
    return normaliseSpread({ text, flags: new Array(text.length).fill(false) })
  }

  let out = ""
  const flags = []
  decodeLines(mark, text).forEach((line, index) => {
    if (index) {
      out += BREAK
      flags.push(false)
    }
    line.forEach(([part, on], at) => {
      if (at) {
        out += " "
        flags.push(false)
      }
      out += part
      for (let i = 0; i < part.length; i += 1) flags.push(Boolean(on))
    })
  })
  return normaliseSpread({ text: out, flags })
}

function focusAtEnd(win, element) {
  // `preventScroll` matters here: the page is a 550vh scroll timeline and
  // focusing an element half-way down it would otherwise jump the scroll
  // position, which moves every other section at the same time.
  element.focus({ preventScroll: true })
  const selection = win.getSelection()
  if (!selection) return
  const range = win.document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}
