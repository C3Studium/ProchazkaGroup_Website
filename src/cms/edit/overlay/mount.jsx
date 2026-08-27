import { createElement } from "react"
import { createRoot } from "react-dom/client"

import { createFieldSaver } from "@/cms/studio/lib/visualSave"
import { bodyOfDoc, valueAt } from "./assets"
import { trackSave } from "./commit"
import { installInteractionLock } from "./lock"
import { installOverlayStyles, removeOverlayStyles } from "./sheet"

/**
 * Mounting the overlay into the framed page, from the host's bundle.
 *
 * ---------------------------------------------------------------------------
 * The contradiction this resolves
 *
 * `VISUAL-EDITING.md` left the overlay mounted *inside* the framed page, by a
 * component the page itself imported. That works for exactly one page — the
 * homepage, which is previewed at a Studio-only address — because every other
 * framed page is the site's own route and its bundle *is* the public bundle.
 * There was nowhere to put the mount that visitors did not also download.
 *
 * The iframe is same-origin. So the host can reach `frame.contentDocument` and
 * build the overlay's DOM in it from *its own* bundle, and the framed page goes
 * back to carrying nothing but the inert `data-cms-*` attributes. Editing then
 * works on every page and the public build never sees a byte of it.
 *
 * ---------------------------------------------------------------------------
 * Two documents, one realm — the thing to keep straight
 *
 * Everything below runs in the *host's* JavaScript realm. `document` and
 * `window` in this file and in Overlay.jsx are therefore the **Studio's**, not
 * the framed page's, and every DOM read the overlay makes about the page has to
 * be taken from the frame's own globals explicitly. That is why `Overlay` takes
 * a `frame` window rather than reaching for `window`: `innerWidth` off the wrong
 * one is the stage's width instead of the emulated device's, and a rect read
 * against it lands the control in the wrong place at every zoom but 1.
 *
 * The one place the host's document is still the right answer is the media
 * library, which is deliberately drawn over the Studio rather than over a frame
 * that may be 390 pixels wide. See Overlay.jsx.
 *
 * ---------------------------------------------------------------------------
 * Why a registry keyed on the frame's document
 *
 * The host mounts on the frame's `load` event and disposes on the next one, and
 * `reactStrictMode` is on — so in development every mount is "mount, tear down,
 * mount again" against the *same* document. Left alone that produces two roots
 * and two overlays for one frame, one of which nothing owns.
 *
 * So a document gets one record, refcounted, and a teardown that drops to zero
 * is deferred by a microtask: a StrictMode remount lands inside that microtask
 * and simply takes the record back. `root.unmount()` has to be deferred anyway —
 * react-dom logs "Attempted to synchronously unmount a root while React was
 * already rendering" when it is called from an effect cleanup, and a console
 * error is a console error.
 */

const records = new WeakMap()

/* --------------------------------------------------------------- saving -- */

// Contract C's host half. One saver for the whole session: it serialises writes
// per field, so two edits a keystroke apart cannot land out of order, and that
// property only exists if there is one of it.
const useDevPort = process.env.NEXT_PUBLIC_CMS_DEV_PORT === "1"

const loadPort = () =>
  useDevPort
    ? import("@/cms/studio/dev/devPort").then((module) => module.createDevPort())
    : import("@/cms/server/httpDataPort").then((module) => module.createHttpDataPort())

let portPromise = null
const withPort = () => {
  // Loaded on the first save rather than with the overlay, for the same reason
  // the media library is: most of a session is looking, not writing.
  portPromise = portPromise || loadPort()
  return portPromise
}

let saver = null
const withSaver = () => {
  saver = saver || withPort().then((port) => createFieldSaver({ port }))
  return saver
}

/**
 * The overlay's only way out, and it is now a function call.
 *
 * It used to be a `save` postMessage answered by a `saved` one, because the
 * overlay was in the other document and a message was the only thing that could
 * cross. Mounting from the host removes that boundary outright — there is one
 * realm, one call stack — and `createFieldSaver` already resolves with the final
 * entry, so the promise *is* the answer. The `pending` message went with it: the
 * overlay's optimistic state is "the typed text is still in the element", which
 * it can see for itself.
 */
// `trackSave` is how commit.js knows a submission is outstanding: *Náhled*
// takes the overlay down, and an edit still in flight when it does would be lost
// with it. It returns its argument untouched.
const submitField = ({ docId, field, value }) =>
  trackSave(withSaver().then((it) => it.save({ docId, field, value })))

/**
 * What is stored at a path right now — the read half, and the only one there is.
 *
 * One kind needs it. A `lines` block is several members of one array and an
 * editor changing how many lines there are is changing the array's length, which
 * no leaf write can express; the overlay therefore commits the array itself, and
 * to do that without emptying the fields it cannot see it has to know what the
 * members already hold. The page cannot answer that — it draws the lines, not
 * the items — so the port does, through the same draft-first reading every popup
 * body uses.
 *
 * Deliberately not a second saver: it writes nothing, it is not serialised
 * against anything, and a caller that treats a read as a promise of what will
 * still be there at commit time has misunderstood it (see Overlay's `saveLines`,
 * which reads when the editor opens and merges at the moment it writes).
 */
const readField = ({ docId, field }) =>
  withPort()
    .then((port) => port.get({ id: docId }))
    .then((doc) => valueAt(bodyOfDoc(doc), field))

/* ---------------------------------------------------------------- mount -- */

function create(frameWindow) {
  const doc = frameWindow.document
  const record = {
    win: frameWindow,
    doc,
    // Detached on purpose. React needs a container to own, but anything appended
    // to the page's `<body>` is a box in a tuned layout; the overlay's own root
    // is portalled into `body` from Overlay.jsx and is the only node this adds
    // there — exactly the one node the in-page version added.
    container: doc.createElement("div"),
    root: null,
    props: {},
    refs: 0,
    alive: true,
    pending: false,
  }

  installOverlayStyles(doc, typeof document === "undefined" ? null : document)

  // The interaction lock lives and dies with the overlay, which is what keeps
  // /studio/preview a faithful preview: it arms nothing, so nothing is blocked.
  record.lock = installInteractionLock(frameWindow)

  // The frame can go away without anyone telling us: a link inside the site, the
  // rail switching pages, Obnovit. The host's own `load` handler catches the
  // arrival of the *next* document; this catches the departure of this one, so
  // there is never a live root pointing into a discarded document.
  record.onPageHide = () => teardown(record)
  frameWindow.addEventListener("pagehide", record.onPageHide)

  // Async so the overlay, the media library and the Studio provider behind it
  // stay in their own chunk. The stylesheet above is *not* in that chunk — it is
  // reached by the static import at the top of this file — so it is in the
  // host's page bundle and parsed before any of this runs.
  import("./Overlay").then(({ default: Overlay }) => {
    if (!record.alive) return
    record.Overlay = Overlay
    record.root = createRoot(record.container)
    render(record)
  })

  records.set(doc, record)
  return record
}

function render(record) {
  if (!record.root || !record.Overlay) return
  record.root.render(
    createElement(record.Overlay, {
      frame: record.win,
      onSave: submitField,
      onRead: readField,
      ...record.props,
    }),
  )
}

function teardown(record) {
  if (!record.alive) return
  record.alive = false
  records.delete(record.doc)
  record.win.removeEventListener("pagehide", record.onPageHide)

  // `unmount()` is put on a task of its own, never run on the stack that asked
  // for the teardown.
  //
  // The microtask in `dispose()` below was enough while the only host was
  // /studio/preview, because leaving that host is a full page navigation and
  // nothing of React's is running by then. /studio/edit is a *view* inside the
  // Studio, so leaving it unmounts this overlay from inside the host's own
  // render — and a microtask scheduled there still lands inside it. Measured:
  // "Attempted to synchronously unmount a root while React was already
  // rendering", once, on the click that leaves the view. A console error is a
  // console error.
  //
  // A document going away on `pagehide` may never reach this callback, which is
  // the right outcome: there is nothing left to unmount from.
  const root = record.root
  record.root = null
  if (root) setTimeout(() => root.unmount(), 0)

  record.lock?.release()
  removeOverlayStyles(record.doc)
}

/**
 * Put an overlay in this frame. Idempotent per document.
 *
 * @param {Window} frameWindow  the frame's own window — same origin, by construction
 * @param {{zoom:number, onSelect?:function}} props
 * @returns {{update:(props:object)=>void, dispose:()=>void}}
 */
export function mountEditOverlay(frameWindow, props = {}) {
  const doc = frameWindow?.document
  if (!doc) throw new Error("[cms] mountEditOverlay needs a same-origin frame window")

  let record = records.get(doc)
  if (!record || !record.alive) record = create(frameWindow)

  record.refs += 1
  record.pending = false
  Object.assign(record.props, props)
  render(record)

  let held = true
  return {
    update(next) {
      if (!held || !record.alive) return
      Object.assign(record.props, next)
      render(record)
    },
    dispose() {
      if (!held) return
      held = false
      record.refs -= 1
      if (record.refs > 0) return
      // Deferred, and cancellable: see the note at the top of the file. A
      // StrictMode remount takes the record back inside this microtask, which is
      // what stops the second mount from being a second overlay.
      record.pending = true
      queueMicrotask(() => {
        if (record.pending) teardown(record)
      })
    },
  }
}
