// What a link may be retargeted to. Pure, no DOM, so the accept list can be
// read in one place and exercised without a browser.
//
// ---------------------------------------------------------------------------
// Why an accept list rather than a sanitiser
//
// The value an editor types here becomes an `href` on the live site. A denial
// list ("no javascript:") is a guess at the set of schemes a browser will
// execute, and browsers keep adding to it. The four forms below are the ones
// this site's links actually take, so everything else is refused by default and
// the failure mode of a scheme nobody thought about is "refused", not "shipped".
//
// The reason is part of the answer rather than a boolean plus a generic
// message: an editor who typed `www.example.com` needs to be told to write
// `https://`, and that is a different sentence from the one for an empty box.

import { CREDIT_HOST } from "../attrs"

/** Said once, and reused by four of the refusals below. */
const ACCEPTED = "Přijímáme /cestu na webu, https://…, mailto: nebo tel:"

// Anything a browser treats as a line break or a control character can split a
// URL in a way the person typing it cannot see.
const CONTROL = /[\u0000-\u001F\u007F]/

const MAIL = /^mailto:[^\s@]+@[^\s@.]+\.[^\s@]+$/i
const TEL = /^tel:\+?[0-9\s()./-]{3,}$/i

const ok = (value) => ({ ok: true, value, reason: "" })
const no = (reason) => ({ ok: false, value: null, reason })

/**
 * Is this the developer's credit?
 *
 * `attrs.js` states the rule; this is the check. Host-only, so `http://` versus
 * `https://`, a trailing slash and a `www.` prefix are all the same link. The
 * overlay asks it about the target already on the page, so annotating that
 * button by mistake produces a refusal rather than an editable field.
 */
export function isCreditLink(raw) {
  const value = String(raw ?? "").trim().toLowerCase()
  if (!value) return false
  const host = value.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0]
  return host === CREDIT_HOST
}

/**
 * Check one target.
 *
 * @param {string} raw  what the editor typed
 * @returns {{ok: boolean, value: string|null, reason: string}} `value` is the
 *   trimmed string to store, and is null whenever `ok` is false — a refused
 *   href must not reach a save, so there is nothing to hand on.
 */
export function checkHref(raw) {
  const value = String(raw ?? "").trim()

  if (!value) return no("Odkaz nesmí být prázdný")
  if (CONTROL.test(value)) return no("Odkaz obsahuje neplatné znaky")
  if (isCreditLink(value)) return no("Tento odkaz patří autorovi webu a needituje se")

  // A path on this site. `//host` is a protocol-relative link to somewhere else
  // and is refused here rather than accepted as a path that starts with a slash.
  if (value.startsWith("//")) return no(`Odkaz na cizí web napište celý. ${ACCEPTED}`)
  if (value.startsWith("/")) return /\s/.test(value) ? no("Cesta nesmí obsahovat mezery") : ok(value)

  const scheme = (value.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/) || [])[1]?.toLowerCase()

  if (scheme === "http" || scheme === "https") {
    let parsed = null
    try {
      parsed = new URL(value)
    } catch {
      return no("Odkaz není platná adresa")
    }
    // A hostname with no dot is a machine name on somebody's LAN, not a site
    // this page can send a visitor to.
    if (!parsed.hostname || !parsed.hostname.includes(".")) return no("Adresa nemá platnou doménu")
    return ok(value)
  }

  if (scheme === "mailto") {
    return MAIL.test(value) ? ok(value) : no("E-mailový odkaz zapište jako mailto:jmeno@domena.cz")
  }

  if (scheme === "tel") {
    return TEL.test(value) ? ok(value) : no("Telefonní odkaz zapište jako tel:+420123456789")
  }

  if (scheme) return no(`Odkazy typu „${scheme}:“ nejsou povolené. ${ACCEPTED}`)
  // A same-page anchor is the shape that gets no href field at all, so one typed
  // here is a misunderstanding rather than a typo.
  if (value.startsWith("#")) return no(`Odkaz v rámci stránky se tudy neupravuje. ${ACCEPTED}`)

  return no(ACCEPTED)
}

export default checkHref
