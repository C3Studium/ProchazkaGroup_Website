import { useEffect, useState } from "react"
import { useAuth, usePort } from "../context/StudioProvider"
import { useAsync } from "../hooks/useAsync"
import { formatNumber } from "../lib/format"
import { CLARITY_DASHBOARD_URL, CLARITY_PROJECT_ID, clarityTagPresent, markStudioSession } from "../stats/clarity"
import { DEFAULT_RANGES, listStatsSources } from "../stats/statsSource"
import { Button, Segmented } from "../ui/controls"
import { Badge, EmptyState, ErrorState, SectionHead, Spinner } from "../ui/feedback"
import Icon from "../ui/Icon"
import { Spacer, ViewBody, ViewHeader, ViewToolbar } from "./ViewLayout"
import styles from "./StatsView.module.scss"

/**
 * Statistics.
 *
 * This is a placeholder in the sense that no source is registered yet — but it
 * is a placeholder with the real layout, driven by the real contract. The tiles,
 * the range picker and the breakdown tables all render from whatever
 * `source.load()` returns (see stats/statsSource.js), so registering a live
 * Clarity source turns this panel on without touching this file.
 *
 * The empty state is deliberately a wiring checklist rather than a shrug: it is
 * the thing the next person needs, and it doubles as proof the seam is real.
 */
export default function StatsView() {
  const port = usePort()
  const { user } = useAuth()
  const sources = listStatsSources()
  const [sourceId, setSourceId] = useState(sources[0]?.id || null)
  const [range, setRange] = useState("1")

  const source = sources.find((entry) => entry.id === sourceId) || sources[0] || null
  const ranges = source?.ranges || DEFAULT_RANGES
  const days = ranges.find((entry) => entry.id === range)?.days || 1

  useEffect(() => {
    // Admin sessions should not pollute the site's own behaviour data.
    markStudioSession(user)
  }, [user])

  const { data, error, loading, reload } = useAsync(
    () => (source ? source.load({ days, port }) : Promise.resolve(null)),
    [source, days, port],
  )

  return (
    <>
      <ViewHeader
        title="Statistiky"
        subtitle="Návštěvnost a chování lidí na webu."
        actions={
          <Button
            variant="secondary"
            icon="external"
            onClick={() => window.open(source?.dashboardUrl || CLARITY_DASHBOARD_URL, "_blank", "noopener")}
          >
            Otevřít Clarity
          </Button>
        }
      />

      <ViewToolbar>
        {sources.length > 1 ? (
          <Segmented
            options={sources.map((entry) => ({ id: entry.id, title: entry.title }))}
            value={source?.id}
            onChange={setSourceId}
          />
        ) : null}
        <Segmented options={ranges.map((entry) => ({ id: entry.id, title: entry.title }))} value={range} onChange={setRange} />
        <Spacer />
        <TagStatus />
      </ViewToolbar>

      <ViewBody padded>
        {!source ? (
          <NotWired />
        ) : loading ? (
          <div className={styles.loading}>
            <Spinner size={20} />
          </div>
        ) : error ? (
          <ErrorState compact error={error} onRetry={reload} />
        ) : (
          <Panel payload={data} title={source.title} description={source.description} />
        )}

        {/* Skóre stránky vidí jen správce — je to hodnocení práce vývojáře,
            ne obsahu, a owner ani člen s ním nic neudělají. Server to hlídá
            taky; tohle jen neukazuje tlačítko, které by vrátilo 403. */}
        {user?.role === "admin" ? <PageSpeedPanel port={port} /> : null}
      </ViewBody>
    </>
  )
}

/**
 * Skóre stránky z Lighthouse — výkon, SEO, přístupnost, správné postupy.
 *
 * Měří se na tlačítko, ne při otevření obrazovky: Google stránku doopravdy
 * načte a odsimuluje, což trvá deset až třicet sekund. Spouštět to při každém
 * zobrazení by z obrazovky udělalo čekárnu.
 */
function PageSpeedPanel({ port }) {
  const [strategy, setStrategy] = useState("mobile")
  // Adresa je pole, ne pevná hodnota z prostředí. Při vývoji je NEXT_PUBLIC_SITE_URL
  // localhost, na který Google nedosáhne — a bez možnosti ji přepsat by tlačítko
  // na vývojářském stroji nešlo použít vůbec.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || ""
  const [url, setUrl] = useState(/localhost|127\.0\.0\.1/.test(fromEnv) ? "" : fromEnv)
  const [state, setState] = useState({ status: "idle", data: null, error: null })

  const measure = async () => {
    setState({ status: "loading", data: null, error: null })
    try {
      setState({ status: "done", data: await port.stats.pagespeed({ strategy, url: url || undefined }), error: null })
    } catch (error) {
      setState({ status: "error", data: null, error })
    }
  }

  const tone = (value) => (value == null ? "" : value >= 90 ? styles.scoreGood : value >= 50 ? styles.scoreOk : styles.scoreBad)

  return (
    <div className={styles.panel}>
      <SectionHead
        title="Skóre stránky"
        hint="Jak je na tom web sám o sobě — rychlost v prohlížeči a SEO. Vidí jen správce."
      />

      <div className={styles.tiles} style={{ marginBottom: "0.75rem" }}>
        <Segmented
          options={[{ id: "mobile", title: "Mobil" }, { id: "desktop", title: "Počítač" }]}
          value={strategy}
          onChange={setStrategy}
        />
        <input
          className={styles.urlInput}
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://vasweb.cz"
          aria-label="Adresa, která se změří"
        />
        <Button variant="secondary" icon="refresh" onClick={measure} disabled={state.status === "loading" || !url}>
          {state.status === "loading" ? "Měří se…" : "Změřit"}
        </Button>
      </div>

      {state.status === "loading" ? (
        <div className={styles.loading}>
          <Spinner size={20} />
        </div>
      ) : state.status === "error" ? (
        // Hláška ze serveru, ne obecná: ErrorState mapuje kód na ustálený text,
        // což je správně u formulářů a špatně tady — „zkontrolujte vyplněné
        // údaje" neřekne, že Google nedosáhne na localhost.
        <ErrorState
          compact
          error={{ ...state.error, code: undefined, message: state.error?.message }}
          onRetry={measure}
        />
      ) : state.data ? (
        <>
          <div className={styles.tiles}>
            {state.data.scores.map((entry) => (
              <div key={entry.id} className={styles.tile}>
                <span className={styles.tileLabel}>{entry.label}</span>
                <span className={`${styles.tileValue} ${tone(entry.value)}`}>
                  {entry.value == null ? "—" : entry.value}
                  <span className={styles.tileUnit}>/ 100</span>
                </span>
              </div>
            ))}
          </div>
          {state.data.vitals?.length ? (
            <table className={styles.table}>
              <tbody>
                {state.data.vitals.map((vital) => (
                  <tr key={vital.id}>
                    <td className={styles.cellLabel}>{vital.label}</td>
                    <td className={styles.cellValue}>{vital.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      ) : (
        <p className={styles.note}>Měří Google na svém stroji a u pomalé stránky to trvá i dvě minuty, tak běží až na vyžádání.</p>
      )}
    </div>
  )
}

/** Live check that the tag actually loaded — ad blockers routinely eat it. */
function TagStatus() {
  const [present, setPresent] = useState(null)

  useEffect(() => {
    // The tag is injected with `afterInteractive`, so a check on mount can race it.
    const timer = setTimeout(() => setPresent(clarityTagPresent()), 800)
    return () => clearTimeout(timer)
  }, [])

  if (present === null) return null

  return (
    <Badge tone={present ? "positive" : "warning"} dot title={`Clarity projekt ${CLARITY_PROJECT_ID}`}>
      {present ? "měření běží" : "tag nenačten"}
    </Badge>
  )
}

function Panel({ payload, title, description }) {
  const tiles = payload?.tiles || []
  const tabs = payload?.tabs || payload?.breakdowns || []
  const [active, setActive] = useState(null)

  // Vybraná záložka se drží jménem, ne pořadím: rozpad, který zrovna nemá data,
  // ze seznamu vypadne a index by pak ukazoval na jiný.
  const current = tabs.find((tab) => tab.id === active) || tabs[0] || null

  return (
    <div className={styles.panel}>
      <SectionHead title={title} hint={description} />

      <div className={styles.tiles}>
        {tiles.map((tile) => (
          <div key={tile.id} className={styles.tile}>
            <span className={styles.tileLabel}>{tile.label}</span>
            <span className={styles.tileValue}>
              {tile.value == null ? "—" : typeof tile.value === "number" ? formatNumber(tile.value) : tile.value}
              {tile.unit ? <span className={styles.tileUnit}>{tile.unit}</span> : null}
            </span>
            <span className={styles.tileFoot}>
              {tile.hint ? <span className={styles.tileHint}>{tile.hint}</span> : null}
            </span>
          </div>
        ))}
      </div>

      {payload && payload.configured === false ? (
        <EmptyState
          compact
          icon="chart"
          title="Statistiky nejsou připojené"
          description={payload.note}
        />
      ) : null}

      {tabs.length ? (
        <section className={styles.breakdown}>
          <Segmented
            value={current?.id}
            onChange={setActive}
            options={tabs.map((tab) => ({ id: tab.id, title: tab.title }))}
          />
          {current?.rows?.length ? (
            <table className={styles.table}>
              <tbody>
                {current.rows.map((row, index) => (
                  <tr key={`${row.label}-${index}`}>
                    <td className={styles.cellLabel} title={row.label}>{row.label}</td>
                    <td className={styles.cellValue}>
                      {typeof row.value === "number" ? formatNumber(row.value) : row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.note}>{current?.empty || "Zatím bez dat."}</p>
          )}
        </section>
      ) : null}

      {payload?.note ? <p className={styles.note}>{payload.note}</p> : null}
    </div>
  )
}

/**
 * The unwired state. Shows the shape the panel will take and exactly what is
 * missing — the seam is documented in stats/clarity.js and this is its front end.
 */
function NotWired() {
  return (
    <div className={styles.panel}>
      <div className={styles.tiles}>
        {["Relace", "Návštěvníci", "Zobrazení stránek", "Aktivní čas"].map((label) => (
          <div key={label} className={`${styles.tile} ${styles.tileGhost}`}>
            <span className={styles.tileLabel}>{label}</span>
            <span className={styles.tileValue}>—</span>
            <span className={styles.tileFoot}>
              <span className={styles.tileHint}>čeká na připojení</span>
            </span>
          </div>
        ))}
      </div>

      {/* `compact` because this sits inside an already-gutter-padded body — the
          full-size empty state carries the page gutter itself, and the two
          together would indent it past every other left edge on the screen. */}
      <EmptyState
        compact
        icon="chart"
        title="Statistiky zatím nejsou připojené"
        description="Měření na webu už běží — chybí jen čtení dat. Klíč k Clarity API nesmí do prohlížeče, takže se čte přes server."
      />

      <ol className={styles.steps}>
        <li>
          <span className={styles.stepIndex}>1</span>
          <span>
            Serverová část přidá <code>GET /api/cms/stats/clarity</code>, která zavolá Clarity s tokenem z prostředí.
          </span>
        </li>
        <li>
          <span className={styles.stepIndex}>2</span>
          <span>
            Datový port dostane metodu <code>stats.clarity(&#123; days &#125;)</code>.
          </span>
        </li>
        <li>
          <span className={styles.stepIndex}>3</span>
          <span>
            Vstupní bod Studia zavolá <code>registerStatsSource(createClaritySource(port))</code>. Rozvržení této
            obrazovky se nemění.
          </span>
        </li>
      </ol>

      <p className={styles.note}>
        Clarity projekt <code>{CLARITY_PROJECT_ID}</code> je na webu aktivní od začátku — data se sbírají už teď, jen je
        tu zatím nevidíme.
      </p>
    </div>
  )
}
