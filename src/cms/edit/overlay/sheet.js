import styles from "./overlay.module.scss"

/**
 * The overlay's stylesheet, and how it reaches the document it is drawn in.
 *
 * The overlay's React tree runs in the *host's* realm and paints into the
 * *frame's* document (see mount.jsx). Its class names therefore come from the
 * host's bundle and mean nothing in the frame until the rules behind them are
 * there too: without this the control renders as three unstyled buttons stacked
 * in the top-left corner of the page, which is a working overlay that looks
 * broken.
 *
 * Copying the host's `<style>`/`<link>` nodes wholesale was the first idea and
 * is wrong — a Next CSS chunk carries whatever else happens to be in it, and in
 * this case that is the Studio's own sheet landing on top of the site's. So the
 * rules are picked out by name: everything whose selector mentions one of this
 * module's hashed class names, plus the one `:global` rule the module owns.
 * Nothing else can match, because a CSS-module name is a hash of this file.
 *
 * The class names are read from the imported module object rather than typed
 * out, so a rule renamed in the SCSS cannot be left behind here.
 */

export default styles

/** The attribute that identifies our node in the frame's head. One per document. */
const KEY = "data-cms-overlay-styles"

/**
 * The one selector fragment in `overlay.module.scss` that is not a hashed class:
 * `:global([data-cms-editing])`, which styles the page's own element while it is
 * being typed into. It is `:global` because the attribute belongs to text.js, not
 * to this module, and it is listed here for the same reason it exists there —
 * the element is a motion component and an attribute is the only hook on it that
 * neither React nor framer-motion will take back.
 */
const GLOBAL_MARKERS = ["data-cms-editing"]

const classMarkers = () =>
  Object.values(styles)
    .filter((name) => typeof name === "string" && name)
    // The dot matters. A bare hash could occur inside some unrelated selector by
    // coincidence; `.hash` is a class reference and this module owns the hash.
    .map((name) => `.${name}`)

const matches = (selector, markers) => markers.some((marker) => selector.includes(marker))

/**
 * Walk a rule list, keeping only what matches — and keeping the `@media` /
 * `@supports` / `@layer` wrapper of anything that matches inside one.
 *
 * `overlay.module.scss` has no at-rules today. This handles them anyway because
 * the alternative is a stylesheet that silently loses half its rules the first
 * time someone adds a media query to it.
 */
function collect(rules, markers, out) {
  for (const rule of Array.from(rules)) {
    if (typeof rule.selectorText === "string") {
      if (matches(rule.selectorText, markers)) out.push(rule.cssText)
      continue
    }
    if (rule.cssRules && rule.cssRules.length) {
      const inner = []
      collect(rule.cssRules, markers, inner)
      if (!inner.length) continue
      // The prelude as the browser reparsed it — `@media (min-width: 700px)`,
      // `@supports (…)`. Reading it off cssText rather than reassembling it from
      // `conditionText` keeps this working for at-rules that have no such
      // property.
      const prelude = rule.cssText.slice(0, rule.cssText.indexOf("{")).trim()
      out.push(`${prelude} {\n${inner.join("\n")}\n}`)
    }
  }
}

/** Every rule in `hostDoc` that belongs to this module, as text. */
export function overlayCss(hostDoc = typeof document === "undefined" ? null : document) {
  if (!hostDoc) return ""
  const markers = [...classMarkers(), ...GLOBAL_MARKERS]
  const out = []
  for (const sheet of Array.from(hostDoc.styleSheets)) {
    let rules = null
    try {
      rules = sheet.cssRules
    } catch {
      // A cross-origin sheet refuses to be read. Nothing of ours is served from
      // another origin, so there is nothing to lose by walking past it.
      continue
    }
    if (rules) collect(rules, markers, out)
  }
  return out.join("\n")
}

/**
 * Put the overlay's rules in `frameDoc`'s head, once.
 *
 * Keyed by attribute and rewritten in place rather than appended: a frame that
 * reloads gets a brand-new document and cannot stack anything, but a second
 * mount into the *same* document could, and in React StrictMode a second mount
 * into the same document is the normal case.
 *
 * @returns {HTMLStyleElement|null} the node, so a caller can count it.
 */
export function installOverlayStyles(frameDoc, hostDoc) {
  if (!frameDoc?.head) return null
  const css = overlayCss(hostDoc)
  if (!css) {
    // The host's own stylesheet has not arrived, which cannot happen from a
    // static import chain — this file is reached from PreviewHost through
    // mount.jsx, so its CSS is in the host page's own bundle and is parsed
    // before hydration. Saying so beats a silently unstyled control.
    console.warn("[cms] overlay stylesheet not found in the host document")
    return null
  }

  let node = frameDoc.querySelector(`style[${KEY}]`)
  if (!node) {
    node = frameDoc.createElement("style")
    node.setAttribute(KEY, "")
    frameDoc.head.appendChild(node)
  }
  if (node.textContent !== css) node.textContent = css
  return node
}

export function removeOverlayStyles(frameDoc) {
  frameDoc?.querySelector?.(`style[${KEY}]`)?.remove()
}
