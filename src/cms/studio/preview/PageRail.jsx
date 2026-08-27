import { useMemo } from "react"
import { getType } from "@/cms/core"

import { hrefs, parsePreviewFrom } from "../lib/routes"
import Icon from "../ui/Icon"
import { split } from "./FrameControls"
import styles from "./preview.module.scss"

/**
 * The left rail: where in the site you are, where you came from, and what the
 * page actually received.
 *
 * The page list is not written here. It is read off `src/pages` on the server
 * (src/cms/server/pages.js) and handed down, because a list of routes typed into
 * a component is right on the day it is typed: the route added next month exists,
 * works, and is simply never offered by the tool — with nothing anywhere saying
 * so. Reading the directory Next itself routes from is the only version of this
 * that cannot go quietly wrong.
 *
 * Nested routes are folded into a `<details>` rather than listed flat. This site
 * has twelve consultant pages under /reviews and eight pages that are the site;
 * flat, the eight are the minority.
 */
export default function PageRail({ pages, current, from, sources, onNavigate }) {
    const { flat, groups } = useMemo(() => split(pages), [pages])
    const source = parsePreviewFrom(from)
    const sourceLabel = source ? getType(source.type)?.title || source.type : null

    return (
        <nav className={styles.rail} aria-label="Stránky webu">
            <div className={styles.railScroll}>
                <section className={styles.section}>
                    <span className={styles.label}>Stránky</span>
                    <ul className={styles.pages}>
                        {flat.map((page) => (
                            <PageRow
                                key={page.path}
                                page={page}
                                active={page.path === current}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </ul>

                    {groups.map((group) => {
                        const holds = group.pages.some((page) => page.path === current)
                        return (
                            /* Open when the page you are on is inside it, so arriving
                               through the URL does not land you on a collapsed row
                               with no indication which one you are behind. */
                            <details key={group.key} className={styles.pageGroup} open={holds}>
                                <summary className={styles.summary}>
                                    <Icon name="chevronRight" size={12} className={styles.summaryMark} />
                                    <code className={styles.groupPath}>/{group.key}</code>
                                    <span className={styles.groupCount}>{group.pages.length}</span>
                                </summary>
                                <ul className={styles.pages}>
                                    {group.pages.map((page) => (
                                        <PageRow
                                            key={page.path}
                                            page={page}
                                            active={page.path === current}
                                            onNavigate={onNavigate}
                                        />
                                    ))}
                                </ul>
                            </details>
                        )
                    })}
                </section>

                {/* Above the counts, deliberately. The counts are a diagnostic you
                    go looking for; the document you came from is the thing you
                    reach for next, and it sat below the fold when the order was
                    the other way round. */}
                <section className={styles.section}>
                    <span className={styles.label}>Zdroj</span>
                    {source ? (
                        /* Through the exit route rather than straight to the editor:
                           both ways out of the preview have to clear the draft
                           cookie. */
                        <a href={hrefs.previewExit({ from })} className={styles.source}>
                            <Icon name="document" size={14} className={styles.sourceIcon} />
                            <span className={styles.sourceText}>
                                <span className={styles.sourceTitle}>{sourceLabel}</span>
                                <span className={styles.sourceHint}>Otevřít v editoru</span>
                            </span>
                            <Icon name="chevronRight" size={13} className={styles.sourceGo} />
                        </a>
                    ) : (
                        <p className={styles.note}>
                            Náhled otevřen mimo editor. Stránka čte všechny publikované typy obsahu najednou.
                        </p>
                    )}
                </section>

                <Contents sources={sources} current={current} />
            </div>
        </nav>
    )
}

function PageRow({ page, active, onNavigate }) {
    return (
        <li>
            <button
                type="button"
                className={`${styles.page} ${active ? styles.pageOn : ""}`}
                onClick={() => onNavigate(page.path)}
                aria-current={active ? "page" : undefined}
            >
                <span className={styles.pageLabel}>{page.label}</span>
                <code className={styles.pagePath}>{page.path}</code>
            </button>
        </li>
    )
}

/**
 * What the page received, counted on the server.
 *
 * This one is not decoration. Every section of the homepage falls back to copy
 * hardcoded in its own component when the CMS hands it nothing (see the sections
 * in src/components/pages/index), so an editor whose block failed to resolve sees
 * a page that looks completely fine and is not theirs. The counts are the only
 * way to tell those two situations apart.
 *
 * They describe the homepage, and say so: it is the only route in the project
 * that reads the CMS at all. When another page is framed, the numbers are still
 * true and still about `/`, and the row header is what stops them being read as a
 * claim about the page on screen.
 */
function Contents({ sources, current }) {
    if (!sources) return null

    const rows = [
        { label: "Recenze", value: sources.reviews },
        { label: "Loga partnerů", value: sources.partnerLogos },
        { label: "Řádky textu v Nabídkách", value: sources.copyLines },
        { label: "Poradci", value: sources.consultants },
        { label: "Text „Kdo jsme“", value: sources.whoWeAreChars, unit: "znaků" },
    ]

    const empty = rows.every((row) => !row.value)

    return (
        <section className={styles.section}>
            <span className={styles.label}>
                Načtený obsah <code className={styles.labelPath}>/</code>
            </span>
            <dl className={styles.stats}>
                {rows.map((row) => (
                    <div key={row.label} className={styles.stat}>
                        <dt className={styles.statLabel}>{row.label}</dt>
                        <dd className={`${styles.statValue} ${row.value ? "" : styles.statZero}`}>
                            {row.value}
                            {row.unit ? <span className={styles.statUnit}> {row.unit}</span> : null}
                        </dd>
                    </div>
                ))}
            </dl>
            {empty ? (
                <p className={styles.warn}>
                    <Icon name="warning" size={13} />
                    <span>
                        Z CMS nepřišel žádný obsah, stránka proto zobrazuje výchozí texty zapsané v kódu.
                        Cokoli zde upravíte se v náhledu projeví až po migraci obsahu do CMS.
                    </span>
                </p>
            ) : null}
            {current !== "/" ? (
                <p className={styles.note}>
                    Čísla popisují úvodní stránku — ostatní stránky zatím obsah z CMS nečtou.
                </p>
            ) : null}
        </section>
    )
}
