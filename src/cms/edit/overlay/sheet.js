import styles from "./overlay.module.scss"
import { registerStudioFont } from "../../studio/styles/font.js"

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
 * The element being typed into, styled from here rather than from the SCSS.
 *
 * It marks a node in the *page*: the attribute is set by text.js because it is
 * the only hook on a motion component that neither React nor framer-motion
 * takes back, and no ancestor of it is named by `overlay.module.scss`. As a
 * rule in that module the selector was `:global([data-cms-editing])` — fully
 * global, with no local class anywhere in it.
 *
 * Which is exactly what a CSS module compiled in pure mode refuses:
 *
 *     Selector ":global([data-cms-editing])" is not pure
 *     (pure selectors must contain at least one local class or id)
 *
 * Every escape stays refused — a `:global { … }` block, a selector list pairing
 * it with a local class. Only a local ancestor passes, and there is none. The
 * rule was therefore portable only as long as nothing compiled this module in
 * pure mode; the first host that did could not build the package at all.
 *
 * So it is a string. It reaches the frame the same way the rest does, appended
 * to `overlayCss()` below, and being a string it also cannot be lost when the
 * host's own sheet is the one thing this file cannot see into.
 *
 * The colours are `$pick`, `$pick-inner` and `$pick-edge` from the SCSS. They
 * are literals in both places because a Sass variable cannot cross into JS, and
 * a custom property would not help: the element inherits nothing from `.root`.
 * The note above `$pick` explains why there are three rings and not one.
 */
const EDITING_CSS = `[data-cms-editing] {
  caret-color: #ff6a00;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.82),
    0 0 0 3px #ff6a00,
    0 0 0 4px rgba(0, 0, 0, 0.72);
}`

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
  const markers = classMarkers()
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

  // Rám je jiný dokument s vlastní sadou písem. Bez tohohle by se ovládání
  // overlaye kreslilo systémovým písmem uvnitř stránky, která má své vlastní
  // — dvě různá písma v jednom obrázku.
  registerStudioFont(frameDoc)
  const css = overlayCss(hostDoc)
  if (!css) {
    // The host's own stylesheet has not arrived, which cannot happen from a
    // static import chain — this file is reached from PreviewHost through
    // mount.jsx, so its CSS is in the host page's own bundle and is parsed
    // before hydration. Saying so beats a silently unstyled control.
    console.warn("[cms] overlay stylesheet not found in the host document")
    return null
  }

  // The editing ring goes last, so a host that ships its own rule for the
  // attribute loses to ours rather than the other way round. Appended here and
  // not inside `overlayCss` so the check above still means what it says: it asks
  // whether the module's own rules arrived, and a string added by this file
  // would always answer yes.
  const full = `${css}\n${EDITING_CSS}`

  let node = frameDoc.querySelector(`style[${KEY}]`)
  if (!node) {
    node = frameDoc.createElement("style")
    node.setAttribute(KEY, "")
    frameDoc.head.appendChild(node)
  }
  if (node.textContent !== full) node.textContent = full
  return node
}

export function removeOverlayStyles(frameDoc) {
  frameDoc?.querySelector?.(`style[${KEY}]`)?.remove()
}
