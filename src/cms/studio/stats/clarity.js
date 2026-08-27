/**
 * Microsoft Clarity — the seam, not the integration.
 *
 * Clarity is already live on this site: `src/pages/_document.js` injects the
 * tag with project id `rxdayutukb` on every page. So the tracking half exists
 * and nothing here needs to add it. What is missing is the *reading* half, and
 * that is the part that cannot be done from the browser:
 *
 *   - Clarity's Data Export API (`/export-data/api/v1/project-live-insights`)
 *     authenticates with a bearer token that must never reach the client. It
 *     also sends no CORS headers, so a fetch from this page would fail even if
 *     the token were public.
 *   - Therefore the request belongs on the server, behind the CMS API — and the
 *     Studio reaches it the same way it reaches everything else, through the
 *     injected port. That keeps the "no credentials in the browser bundle" rule
 *     from SPEC.md intact for analytics too.
 *
 * To finish the integration, three steps and no layout work:
 *
 *   1. Build C adds `GET /api/cms/stats/clarity?days=N`, which calls Clarity's
 *      API with `CLARITY_API_TOKEN` from the environment and returns its JSON.
 *   2. The port grows `stats.clarity({ days })` pointing at that route.
 *   3. The Studio's entry point calls
 *      `registerStatsSource(createClaritySource(port))`.
 *
 * `toStatsPayload` below already maps Clarity's response shape to what
 * StatsPanel renders, so step 3 is a one-liner and the panel does not change.
 *
 * Clarity's API allows 10 requests per project per day, which is why the panel
 * never polls and the range picker is coarse.
 */

import { DEFAULT_RANGES } from "./statsSource"

/** Read from the tag already installed in `_document.js`. */
export const CLARITY_PROJECT_ID = "rxdayutukb"

export const CLARITY_DASHBOARD_URL = `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/dashboard`

/** Whether the tag actually loaded in this browser — ad blockers routinely eat it. */
export const clarityTagPresent = () => typeof window !== "undefined" && typeof window.clarity === "function"

/**
 * Tags the current editor's session in Clarity so admin traffic can be filtered
 * out of the site's own numbers. Safe to call when the tag is absent.
 */
export function markStudioSession(user) {
  if (!clarityTagPresent()) return
  try {
    window.clarity("set", "surface", "studio")
    if (user?.id) window.clarity("identify", user.id)
  } catch {
    // Clarity failing must never take a screen down.
  }
}

const METRIC_LABELS = {
  Traffic: "Návštěvy",
  ScrollDepth: "Hloubka scrollu",
  EngagementTime: "Čas na stránce",
  RageClickCount: "Zuřivé kliky",
  DeadClickCount: "Mrtvé kliky",
  ExcessiveScroll: "Nadměrné scrollování",
  QuickbackClick: "Rychlé návraty",
  ErrorClickCount: "Chyby skriptů",
}

/**
 * Clarity returns `[{ metricName, information: [{...}] }]`. This flattens it
 * into the panel's tiles/breakdowns without the panel knowing anything about
 * Clarity — which is the property that makes the source swappable.
 */
export function toStatsPayload(raw) {
  const metrics = Array.isArray(raw) ? raw : []
  const byName = (name) => metrics.find((metric) => metric.metricName === name)?.information?.[0] || {}

  const traffic = byName("Traffic")
  const engagement = byName("EngagementTime")

  const tiles = [
    { id: "sessions", label: "Relace", value: number(traffic.totalSessionCount), hint: "Počet návštěv webu" },
    { id: "users", label: "Návštěvníci", value: number(traffic.distinctUserCount), hint: "Unikátní zařízení" },
    { id: "pages", label: "Zobrazení stránek", value: number(traffic.pagesViews) },
    {
      id: "time",
      label: "Aktivní čas",
      value: engagement.activeTime ? Math.round(Number(engagement.activeTime) / 60) : null,
      unit: "min",
      hint: "Průměr na relaci",
    },
  ]

  const breakdowns = metrics
    .filter((metric) => ["RageClickCount", "DeadClickCount", "ErrorClickCount", "QuickbackClick"].includes(metric.metricName))
    .map((metric) => ({
      id: metric.metricName,
      title: METRIC_LABELS[metric.metricName] || metric.metricName,
      rows: (metric.information || []).slice(0, 6).map((entry) => ({
        label: entry.url || entry.name || "—",
        value: number(entry.subTotal ?? entry.sessionsCount),
      })),
    }))
    .filter((breakdown) => breakdown.rows.length > 0)

  return { tiles, breakdowns }
}

const number = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * The source object. Pass a port that exposes `stats.clarity({ days })`; when
 * build C adds that method this becomes live with no other change.
 */
export function createClaritySource(port) {
  return {
    id: "clarity",
    title: "Microsoft Clarity",
    description: "Návštěvnost a chování na webu. Data se načítají přes server, klíč nikdy neopustí backend.",
    dashboardUrl: CLARITY_DASHBOARD_URL,
    ranges: DEFAULT_RANGES,
    load: async ({ days }) => {
      if (typeof port?.stats?.clarity !== "function") {
        const error = new Error("Port nemá metodu stats.clarity().")
        error.code = "not_found"
        throw error
      }
      return toStatsPayload(await port.stats.clarity({ days }))
    },
  }
}
