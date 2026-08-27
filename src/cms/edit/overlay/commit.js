/**
 * Getting an edit in progress onto the server before the overlay goes away.
 *
 * ---------------------------------------------------------------------------
 * Who needs this and why
 *
 * *Náhled* takes the overlay down so the page behaves exactly as it does for a
 * visitor. Anything half-typed at that moment lives in a `contenteditable` and
 * nowhere else — the overlay's optimistic state *is* the DOM — and unmounting
 * the overlay runs `beginTextEdit`'s `dispose()`, which restores the original
 * nodes. So a toggle that did not commit first would silently delete whatever
 * the editor had just written. That is the one thing the mode may never do, so
 * the toggle either commits or refuses, and this is the half that knows which.
 *
 * ---------------------------------------------------------------------------
 * Why it drives the DOM instead of calling the overlay
 *
 * The obvious shape is an imperative handle off `<Overlay>`. There isn't one,
 * and adding one would put this feature's seam in a file three other builds are
 * writing at the same time. What there *is* is a contract that already exists
 * and is already depended on from outside the component: `text.js` marks the
 * element it is editing with `data-cms-editing` (overlay.module.scss styles it
 * through a `:global` selector, sheet.js lists it as the one non-hashed marker
 * it transplants), and the control carries a named *Uložit*. So "is an edit in
 * progress" is a `querySelector` and "commit it" is the button the editor would
 * have pressed themselves — the real commit path, not a copy of it.
 *
 * It used to synthesise the Enter key, which was the commit path until text
 * became multi-line: Enter now inserts a line break, so a *Náhled* that still
 * pressed it would have added a break to the copy and then reported that the
 * edit could not be committed. The button is the better seam anyway — it is the
 * thing the ask names, and it is only on the control when there is something to
 * save.
 *
 * The answer comes back the other way: `mount.jsx` routes every submission
 * through `trackSave`, so whatever the commit started is in `inflight` by the
 * time `dispatchEvent` returns — `save()` calls `onSave()` synchronously — and
 * awaiting it gives the same entry the overlay's own flash is drawn from.
 *
 * ---------------------------------------------------------------------------
 * The two things it refuses rather than commits
 *
 * A text field is the only kind whose in-progress state is a DOM node this can
 * reach. An alt-text input on the control and the media library drawn over the
 * Studio are React state inside the overlay, unreachable from here and equally
 * unsaved. Refusing while either is open is not a fallback — it is the same
 * promise kept a different way: nothing is dropped on the way to a preview.
 */

const EDITING = "[data-cms-editing]"
const CONTROL = '[data-cms-part="control"]'

/** In-flight submissions, added by `trackSave` and removed when they settle. */
const inflight = new Set()

/**
 * Register a submission so a commit can wait for it. Returns its argument
 * untouched — the overlay's own error handling hangs off the original promise
 * and must not be given a different one.
 *
 * @param {Promise} promise  the entry promise from `createFieldSaver.save`
 */
export function trackSave(promise) {
  // Never rejects: `createFieldSaver.save` resolves with a failed entry rather
  // than throwing, and the only other way in is the port's own import failing,
  // which is turned into the same shape here so one `await` covers both.
  const done = Promise.resolve(promise).then(
    (entry) => entry || { status: "saved" },
    (error) => ({ status: "failed", error }),
  )
  inflight.add(done)
  done.then(() => inflight.delete(done))
  return promise
}

const reasonFor = (error) => {
  const text = error ? String(error.message || error) : ""
  return text || "neznámá chyba"
}

/** Rounds of draining. A save that starts another save is legitimate; a chain
 *  of them that never ends is a bug, and hanging the toggle would hide it. */
const MAX_ROUNDS = 5

/**
 * Commit whatever is open in the framed page, and say whether it worked.
 *
 * @param {Window} frameWindow  the framed page's window
 * @param {Document} [hostDoc]  the Studio's document, where the media library is
 *                              drawn; defaults to this realm's own
 * @returns {Promise<{ok: boolean, reason?: string}>}  never rejects
 */
export async function commitPendingEdit(frameWindow, hostDoc = typeof document === "undefined" ? null : document) {
  const doc = frameWindow?.document
  if (!doc) return { ok: true }

  // Any popup the overlay drew over the *Studio* — the media library, a
  // document form. Matched on the marker rather than on one popup's name, so a
  // popup added later is covered by default rather than by being remembered.
  if (hostDoc?.querySelector("[data-cms-overlay]")) {
    return { ok: false, reason: "Nejprve zavřete otevřené okno úprav — rozpracovaná volba se do náhledu nepřenese." }
  }

  const control = doc.querySelector(CONTROL)
  if (control?.querySelector("input, textarea")) {
    return { ok: false, reason: "V panelu je rozepsané pole. Uložte ho, nebo úpravu zrušte, a zkuste Náhled znovu." }
  }

  const editing = doc.querySelector(EDITING)
  if (editing) {
    // *Uložit* is on the control only while the value differs from what is
    // stored — that is the whole of the button swap — so its absence means there
    // is nothing to save, and the edit is closed instead. Escape is that path,
    // and `text.js` listens for it on the element itself.
    const commit = doc.querySelector(`${CONTROL} [data-cms-action="save"]`)
    if (commit) commit.click()
    else
      editing.dispatchEvent(
        new frameWindow.KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }),
      )
  }

  for (let round = 0; round < MAX_ROUNDS && inflight.size; round += 1) {
    const entries = await Promise.all([...inflight])
    const failed = entries.find((entry) => entry?.status === "failed")
    if (failed) return { ok: false, reason: `Úpravu se nepodařilo uložit: ${reasonFor(failed.error)}` }
  }

  if (inflight.size) return { ok: false, reason: "Ukládání stále běží. Zkuste Náhled za okamžik." }

  // An element still marked as being edited means the commit did not take — the
  // button reached nothing, or `commit()` threw on the way. Either way the typed
  // text is still only in the DOM, and the overlay must stay up to hold it.
  if (doc.querySelector(EDITING)) {
    return { ok: false, reason: "Rozepsanou úpravu se nepodařilo uložit — zkuste ji uložit tlačítkem Uložit." }
  }

  return { ok: true }
}
