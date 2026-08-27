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

const UNITS = [
  ["rok", "roky", "let", 31536000],
  ["měsíc", "měsíce", "měsíců", 2592000],
  ["den", "dny", "dní", 86400],
  ["hodina", "hodiny", "hodin", 3600],
  ["minuta", "minuty", "minut", 60],
]

/** Czech pluralises on 1 / 2–4 / 5+, so a bare Intl.RelativeTimeFormat is wrong. */
export function formatRelative(value) {
  const date = asDate(value)
  if (!date) return "—"

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (Math.abs(seconds) < 60) return "právě teď"

  for (const [one, few, many, size] of UNITS) {
    const count = Math.floor(Math.abs(seconds) / size)
    if (count < 1) continue
    const noun = count === 1 ? one : count < 5 ? few : many
    return seconds > 0 ? `před ${count} ${noun}` : `za ${count} ${noun}`
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
