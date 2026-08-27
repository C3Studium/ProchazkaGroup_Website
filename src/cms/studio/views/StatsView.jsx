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
  const [range, setRange] = useState("7")

  const source = sources.find((entry) => entry.id === sourceId) || sources[0] || null
  const ranges = source?.ranges || DEFAULT_RANGES
  const days = ranges.find((entry) => entry.id === range)?.days || 7

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
      </ViewBody>
    </>
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
  const breakdowns = payload?.breakdowns || []

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
              {typeof tile.delta === "number" ? (
                <span className={tile.delta >= 0 ? styles.deltaUp : styles.deltaDown}>
                  <Icon name={tile.delta >= 0 ? "chevronUp" : "chevronDown"} size={11} />
                  {Math.abs(tile.delta)} %
                </span>
              ) : null}
              {tile.hint ? <span className={styles.tileHint}>{tile.hint}</span> : null}
            </span>
          </div>
        ))}
      </div>

      {breakdowns.map((breakdown) => (
        <section key={breakdown.id} className={styles.breakdown}>
          <SectionHead title={breakdown.title} hint={breakdown.note} />
          <table className={styles.table}>
            <tbody>
              {breakdown.rows.map((row, index) => (
                <tr key={`${row.label}-${index}`}>
                  <td className={styles.cellLabel} title={row.label}>
                    {row.label}
                  </td>
                  <td className={styles.cellValue}>{typeof row.value === "number" ? formatNumber(row.value) : row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

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
