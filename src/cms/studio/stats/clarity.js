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

/**
 * Projekt, ke kterému tag na webu patří.
 *
 * Z prostředí, ne napevno: jedno konkrétní ID zapsané v knihovně by v jiném
 * projektu odkazovalo na cizí nástěnku. `NEXT_PUBLIC_`, protože odkaz se
 * vykresluje v prohlížeči — a ID projektu není tajemství, tag ho stejně nese
 * v adrese skriptu.
 */
export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || ""

export const CLARITY_DASHBOARD_URL = CLARITY_PROJECT_ID
  ? `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/dashboard`
  : "https://clarity.microsoft.com/"

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
  ErrorClickCount: "Chyby při kliku",
  ScriptErrorCount: "Chyby skriptů",
}

/** Rozměry, na které se ptáme, a jak se jmenují v odpovědi. */
const DIMENSION_TABS = [
  { id: "Country", title: "Regiony", empty: "Clarity zatím nemá dost dat na rozpad podle zemí." },
  { id: "Browser", title: "Prohlížeče", empty: "Zatím bez rozpadu podle prohlížečů." },
  { id: "Device", title: "Zařízení", empty: "Zatím bez rozpadu podle zařízení." },
]

/** Chování, které Clarity počítá jako problém. Jedna záložka pro všechno. */
const BEHAVIOUR = ["RageClickCount", "DeadClickCount", "ErrorClickCount", "ScriptErrorCount", "QuickbackClick", "ExcessiveScroll"]

/**
 * Clarity vrací `[{ metricName, information: [{...}] }]`. Tohle z toho udělá
 * dlaždice a záložky, aniž by o Clarity věděla obrazovka — což je ta vlastnost,
 * kvůli které se zdroj dá vyměnit.
 *
 * Rozměry (země, prohlížeč, zařízení) přicházejí jako další klíče uvnitř
 * `information`; jeden dotaz je nese všechny naráz, protože každý zvlášť by byl
 * další z deseti denních dotazů.
 */
/**
 * Sekundy na dvojici hodnota + jednotka. Pevná jednotka lhala v obou směrech:
 * aktivní čas ukazoval „282s" místo čtyř a půl minuty a celkový čas pod minutu
 * spadl na „0 min".
 */
const duration = (seconds) => {
  if (!seconds && seconds !== 0) return { value: null }
  const whole = Math.round(seconds)
  if (whole < 60) return { value: whole, unit: "s" }
  const pad = (part) => String(part).padStart(2, "0")
  if (whole < 3600) return { value: `${Math.floor(whole / 60)}:${pad(whole % 60)}`, unit: "min" }
  return { value: `${Math.floor(whole / 3600)}:${pad(Math.floor((whole % 3600) / 60))}`, unit: "h" }
}

export function toStatsPayload(raw) {
  const metrics = Array.isArray(raw?.metrics) ? raw.metrics : Array.isArray(raw) ? raw : []
  const of = (name) => metrics.find((metric) => metric.metricName === name)?.information || []

  // S rozměry vrací Clarity metriky ROZPADLÉ po kombinacích (země × prohlížeč ×
  // zařízení) a žádný souhrnný řádek nepřidá. Číst první řádek by znamenalo číst
  // jednu náhodnou kombinaci — v ostrých datech to byla „USA / Chrome" s nulou,
  // zatímco skutečný provoz seděl o tři řádky níž.
  const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)

  const traffic = of("Traffic")
  const engagement = of("EngagementTime")
  const scroll = of("ScrollDepth")

  // Klíč rozměrů, aby šly řádky jedné metriky spárovat s řádky jiné. Clarity
  // je vrací zvlášť za každou metriku a nic je nespojuje.
  const dimensionKey = (row) => `${row.Country}|${row.Browser}|${row.Device}`
  const sessionsBy = new Map(traffic.map((row) => [dimensionKey(row), Number(row.totalSessionCount) || 0]))

  // Vážený průměr přes rozpadlé řádky. Prostý průměr by dal dvěma tabletovým
  // návštěvám stejnou váhu jako deseti desktopovým — v ostrých datech to
  // zvedlo hloubku scrollu ze skutečných 53 % na 72 %.
  const weightedAverage = (rows, key) => {
    let value = 0
    let weight = 0
    for (const row of rows) {
      const sessionCount = sessionsBy.get(dimensionKey(row)) ?? 1
      value += (Number(row[key]) || 0) * sessionCount
      weight += sessionCount
    }
    if (weight) return value / weight
    // Bez rozměrů vrací Clarity jediný řádek, který už průměrem je.
    return rows.length ? sum(rows, key) / rows.length : null
  }

  const sessions = sum(traffic, "totalSessionCount")
  const bots = sum(traffic, "totalBotSessionCount")
  const totalTime = sum(engagement, "totalTime")
  // Součet aktivního času dělený relacemi. Samotný součet jako „průměr na
  // relaci" byl špatně popsaný údaj: rostl s návštěvností, ne se zaujetím.
  const activeTime = sessions ? sum(engagement, "activeTime") / sessions : null
  const depth = scroll.length ? weightedAverage(scroll, "averageScrollDepth") : null

  const tiles = [
    { id: "sessions", label: "Relace", value: sessions, hint: "Skutečné návštěvy, bez robotů" },
    // Roboti se ukazují zvlášť, ne schovaní v součtu: když jich je sedmkrát víc
    // než lidí, je to údaj o webu, ne šum k zamlčení.
    { id: "bots", label: "Roboti", value: bots, hint: "Vyhledávače a scrapery" },
    { id: "active", label: "Aktivní čas", ...duration(activeTime), hint: "Průměr na relaci" },
    { id: "total", label: "Celkový čas", ...duration(totalTime) },
    { id: "scroll", label: "Hloubka scrollu", value: depth === null ? null : Math.round(depth), unit: "%", hint: "Kam se čtenář dostane" },
  ].filter((tile) => tile.value !== null && tile.value !== 0 || tile.id === "sessions")

  // Rozpady. Řadí se podle lidských relací, ne podle unikátních zařízení —
  // to druhé počítá i roboty a seznam prohlížečů by pak vedl HeadlessChrome.
  const dimensionTabs = DIMENSION_TABS.map(({ id, title, empty }) => ({
    id,
    title,
    empty,
    rows: traffic
      .filter((entry) => entry[id])
      .reduce((rows, entry) => {
        const found = rows.find((row) => row.label === entry[id])
        const value = Number(entry.totalSessionCount) || 0
        if (found) found.value += value
        else rows.push({ label: entry[id], value })
        return rows
      }, [])
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12),
  })).filter((tab) => tab.rows.length > 0)

  // Chování: procento relací, kterých se problém týkal. Absolutní počet by tu
  // nic neřekl — deset zuřivých kliků z deseti relací a z deseti tisíc jsou
  // dvě různé zprávy.
  const behaviour = {
    id: "behaviour",
    title: "Chování",
    empty: "Zatím bez zaznamenaných problémů — což je dobrá zpráva.",
    rows: metrics
      .filter((metric) => BEHAVIOUR.includes(metric.metricName))
      .map((metric) => {
        const rows = metric.information || []
        const percent = rows.length
          ? rows.reduce((total, row) => total + (Number(row.sessionsWithMetricPercentage) || 0), 0) / rows.length
          : 0
        return { label: METRIC_LABELS[metric.metricName] || metric.metricName, value: `${Math.round(percent)} %` }
      })
      .filter((row) => row.value !== "0 %"),
  }

  const tabs = [...dimensionTabs, ...(behaviour.rows.length ? [behaviour] : [])]

  return {
    configured: raw?.configured !== false,
    note:
      raw?.configured === false
        ? "Chybí CLARITY_API_TOKEN. Vygeneruj ho v Clarity → Settings → Data Export a vlož do prostředí; měření na webu už běží, jen se nečte."
        : null,
    tiles,
    tabs,
    breakdowns: tabs,
    cachedAt: raw?.cachedAt ?? null,
    fromCache: Boolean(raw?.fromCache),
    remaining: raw?.remaining ?? null,
  }
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
