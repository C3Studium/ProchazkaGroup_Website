// Mirrors: the other places on the page that draw the field being edited.
//
// The overlay's optimistic state is the DOM of the one annotated element
// (commit.js says it as "the overlay's optimistic state *is* the DOM"), so a
// second rendering of the same value — a table of contents, a breadcrumb, the
// hidden faces of a flip animation — sits still while the editor types into
// the first one. Every consuming project was about to grow its own
// MutationObserver for this; the attribute (MIRROR_ATTR in ../attrs.js) and
// this module are that observer written once, on the side that already knows
// when the value changes.
//
// ---------------------------------------------------------------------------
// What a mirror receives, and what it never becomes
//
// Plain text with line breaks — the rendered words of the edited element, not
// its markup. A mirror that received cloned children would inherit
// contenteditable artefacts and accent spans it may have no styling for; the
// words are the shared truth, the dressing is each element's own. A field's
// inline emphasis therefore renders unaccented in the mirror while the edit is
// open, which is the honest cost of a reflection: the accent returns with the
// next real render of the page.
//
// A mirror is never a place to edit. It is not in EDITABLE_SELECTOR, the
// hit-test cannot land on it (nothing here changes that), and an element that
// carries a field annotation of its own is skipped even when it also carries
// the mirror attribute — reflecting a field into its own editor would feed the
// editor its output as input.
//
// ---------------------------------------------------------------------------
// The same restore promise the edited element has
//
// text.js parks the element's original child NODES and puts the same nodes
// back on cancel. Mirrors keep that promise the same way: the takeover is
// lazy — a mirror whose text never diverges is never touched at all — and the
// first write moves its children aside rather than serialising them. Cancel
// returns them; commit keeps the typed words and drops the parked originals,
// exactly as the edited element keeps what was saved.

import { EDITABLE_SELECTOR, MIRROR_ATTR, mirrorValue } from "../attrs.js"

/** The rendered words of an element, `<br>` spelled as "\n" — the same reading
 *  a visitor's eye does, which is what two copies of one value share. */
const textOf = (root) => {
  let out = ""
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) out += child.nodeValue
      else if (child.nodeName === "BR") out += "\n"
      else if (child.nodeType === 1) walk(child)
    }
  }
  walk(root)
  return out
}

const writeText = (mirror, text) => {
  const doc = mirror.ownerDocument
  while (mirror.firstChild) mirror.removeChild(mirror.firstChild)
  const lines = String(text).split("\n")
  lines.forEach((line, index) => {
    if (index) mirror.appendChild(doc.createElement("br"))
    mirror.appendChild(doc.createTextNode(line))
  })
}

/**
 * Collect the mirrors of one field and hand back their lifecycle.
 *
 * @param {HTMLElement} element  the annotated element an edit just opened on
 * @param {string} docId
 * @param {string} field  the field path as annotated — a `lines` block names
 *   its template (`items.*.label`), so its mirrors do too
 * @returns {null | {sync: () => void, restore: () => void, commit: () => void}}
 *   null when the page has no mirrors for this field, so the caller holds
 *   nothing and the common case costs one querySelectorAll
 */
export function beginMirrors(element, docId, field) {
  const doc = element.ownerDocument
  const wanted = mirrorValue(docId, field)

  const mirrors = Array.from(doc.querySelectorAll(`[${MIRROR_ATTR}]`)).filter(
    (candidate) =>
      candidate.getAttribute(MIRROR_ATTR)?.trim() === wanted &&
      candidate !== element &&
      // A source is a source: its DOM belongs to text.js for the duration.
      !candidate.matches(EDITABLE_SELECTOR) &&
      // Nesting either way would make one takeover rewrite the other's nodes.
      !element.contains(candidate) &&
      !candidate.contains(element),
  )
  if (!mirrors.length) return null

  // mirror -> its original child nodes, parked. Present only once the mirror
  // has actually been rewritten; absence is what "never touched" means below.
  const parked = new Map()

  const write = (mirror, text) => {
    if (!parked.has(mirror)) {
      const fragment = doc.createDocumentFragment()
      while (mirror.firstChild) fragment.appendChild(mirror.firstChild)
      parked.set(mirror, fragment)
    }
    writeText(mirror, text)
  }

  const sync = () => {
    const text = textOf(element)
    for (const mirror of mirrors) {
      if (textOf(mirror) !== text) write(mirror, text)
    }
  }

  return {
    /** Called on every keystroke and mark toggle — the same beat as onInput. */
    sync,

    /** Cancel: every touched mirror gets its own nodes back, untouched ones
     *  were never anything else. */
    restore: () => {
      for (const [mirror, fragment] of parked) {
        while (mirror.firstChild) mirror.removeChild(mirror.firstChild)
        mirror.appendChild(fragment)
      }
      parked.clear()
    },

    /** Commit: one final alignment, then the typed words stay — the mirrors
     *  end the edit showing what was saved, like the element itself. */
    commit: () => {
      sync()
      parked.clear()
    },
  }
}
