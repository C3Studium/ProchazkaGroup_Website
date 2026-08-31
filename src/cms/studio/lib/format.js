/** Czech-locale formatting. The client reads this admin in Czech. */

const cs = "cs-CZ"

const asDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = asDate(value)
  return date ? date.toLocaleDateString(cs, { day: "numeric", month: "long", year: "numeric" }) : "—"
}

export function formatDateTime(value) {
  const date = asDate(value)
  return date
    ? date.toLocaleString(cs, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—"
}

/**
 * Czech pluralises on 1 / 2–4 / 5+ — and it also DECLINES, which the previous
 * table did not. "před" takes the instrumental and "za" the accusative, so the
 * dictionary form is wrong in both directions: the editor's "Naposledy upraveno"
 * line has been printing *před 1 minuta* and *před 5 hodin* where Czech says
 * *před minutou* and *před 5 hodinami*.
 *
 * Six forms per unit rather than three, because there is no rule that derives
 * one case from the other. `size` last, as before.
 */
const UNITS = [
  // past (instrumental)          future (accusative)
  [["rokem", "roky", "lety"], ["rok", "roky", "let"], 31536000],
  [["měsícem", "měsíci", "měsíci"], ["měsíc", "měsíce", "měsíců"], 2592000],
  [["dnem", "dny", "dny"], ["den", "dny", "dní"], 86400],
  [["hodinou", "hodinami", "hodinami"], ["hodinu", "hodiny", "hodin"], 3600],
  [["minutou", "minutami", "minutami"], ["minutu", "minuty", "minut"], 60],
]

/** A bare Intl.RelativeTimeFormat gets neither the plural nor the case right. */
export function formatRelative(value) {
  const date = asDate(value)
  if (!date) return "—"

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (Math.abs(seconds) < 60) return "právě teď"

  const past = seconds > 0
  for (const [instrumental, accusative, size] of UNITS) {
    const count = Math.floor(Math.abs(seconds) / size)
    if (count < 1) continue
    const [one, few, many] = past ? instrumental : accusative
    return `${past ? "před" : "za"} ${count} ${form(count, one, few, many)}`
  }
  return "právě teď"
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatNumber(value) {
  return typeof value === "number" ? value.toLocaleString(cs) : "—"
}

/**
 * Czech picks a form on 1 / 2–4 / 5+, and **zero takes the 5+ form** — "nula
 * recenzí", not "nula recenze". That last clause was missing and it showed on
 * every empty screen in the admin: an empty queue read "0 recenze", an empty
 * list "0 položky". `plural` prefixes the count, `form` does not.
 */
export const form = (count, one, few, many) =>
  count === 1 ? one : count > 1 && count < 5 ? few : many
export const plural = (count, one, few, many) => `${count} ${form(count, one, few, many)}`

export function truncate(value, limit = 140) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

/** Deterministic hue per string — avatar tints that stay stable per person. */
export function hueFor(value) {
  let hash = 0
  for (let index = 0; index < String(value).length; index += 1) {
    hash = (hash * 31 + String(value).charCodeAt(index)) % 360
  }
  return hash
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
