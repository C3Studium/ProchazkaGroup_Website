import Link from "next/link"
import { useAuth, usePort, useRevision, useTypes } from "../context/StudioProvider"
import { useAsync } from "../hooks/useAsync"
import { PENDING, QUEUE_FILTERS } from "../lib/moderation"
import { previewOf, stateOf } from "../lib/documents"
import { form, formatRelative, truncate } from "../lib/format"
import { hrefs } from "../lib/routes"
import { Button } from "../ui/controls"
import { Badge, EmptyState, SkeletonRows, Spinner } from "../ui/feedback"
import Icon from "../ui/Icon"
import { ViewBody, ViewHeader } from "./ViewLayout"
import styles from "./OverviewView.module.scss"

/**
 * The landing screen. It answers one question — "is there anything waiting for
 * me?" — and gets out of the way. The review queue is the answer most days, so
 * it is the largest thing on the page and the only one with a call to action.
 *
 * The layout is a full-height two-column grid rather than a stack of cards. The
 * old version put three bordered boxes at the top of a tall canvas and left the
 * bottom half empty, which reads as an unfinished page; here both columns run to
 * the bottom of the viewport and scroll independently, so the space is spent on
 * more of the queue and more of the history instead of on air.
 */
export default function OverviewView() {
  const port = usePort()
  const types = useTypes()
  const { user } = useAuth()
  const { revision } = useRevision()

  const { data: pending, loading: pendingLoading } = useAsync(
    () => port.list({ type: "review", filters: QUEUE_FILTERS[PENDING], sort: [{ field: "submittedAt", direction: "desc" }], perPage: 12 }),
    [port, revision],
  )

  const { data: recent, loading: recentLoading } = useAsync(() => port.list({ perPage: 12 }), [port, revision])

  const pendingCount = pending?.total || 0

  return (
    <>
      <ViewHeader title={greeting(user)} subtitle="Přehled toho, co čeká a co se naposledy měnilo." />

      <ViewBody className={styles.body}>
        <div className={styles.grid}>
          <section className={styles.primary}>
            <header className={styles.head}>
              <h2 className={styles.eyebrow}>Recenze čekající na schválení</h2>
              {pendingCount ? (
                <Button href={hrefs.moderation()} variant="primary" size="sm" iconRight="chevronRight">
                  Projít frontu
                </Button>
              ) : null}
            </header>

            {pendingLoading && !pending ? (
              <div className={styles.inlineLoading}>
                <Spinner size={16} />
              </div>
            ) : pendingCount === 0 ? (
              <EmptyState
                compact
                icon="check"
                title="Nic nečeká"
                description="Všechny recenze jsou vyřízené. Nové se objeví tady."
              />
            ) : (
              <>
                <p className={styles.count}>
                  <strong>{pendingCount}</strong>
                  <span>{form(pendingCount, "recenze čeká", "recenze čekají", "recenzí čeká")}</span>
                </p>
                <p className={styles.countNote}>Dokud je neschválíte, nejsou na webu.</p>

                <ul className={styles.peek}>
                  {(pending?.rows || []).map((doc) => {
                    const body = doc.draft ?? doc.data ?? {}
                    return (
                      <li key={doc.id}>
                        <Link href={hrefs.moderation()} className={styles.peekRow}>
                          <span className={styles.peekName}>{body.customerName || "Bez jména"}</span>
                          <span className={styles.peekText}>{truncate(body.message, 180) || "—"}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </section>

          <div className={styles.side}>
            <section className={styles.recentPane}>
              <header className={styles.head}>
                <h2 className={styles.eyebrow}>Naposledy upraveno</h2>
              </header>

              {recentLoading && !recent ? (
                <SkeletonRows count={5} height={44} />
              ) : (recent?.rows || []).length === 0 ? (
                <EmptyState compact icon="document" title="Zatím tu nic není" description="Jakmile něco upravíte, objeví se to tady." />
              ) : (
                <ul className={styles.recent}>
                  {(recent?.rows || []).map((doc) => {
                    const type = types.find((entry) => entry.name === doc.type)
                    const preview = previewOf(type, doc)
                    const state = stateOf(doc)
                    return (
                      <li key={doc.id}>
                        <Link href={hrefs.editor(doc.type, doc.id)} className={styles.recentRow}>
                          <span className={styles.recentText}>
                            <span className={styles.recentTitle}>{preview.title}</span>
                            <span className={styles.recentType}>{type?.title || doc.type}</span>
                          </span>
                          <Badge tone={state === "published" ? "positive" : state === "edited" ? "warning" : "neutral"} dot>
                            {state === "published" ? "na webu" : state === "edited" ? "změny" : "koncept"}
                          </Badge>
                          <span className={styles.recentTime}>{formatRelative(doc.updatedAt)}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className={styles.actionsPane}>
              <header className={styles.head}>
                <h2 className={styles.eyebrow}>Rychlé akce</h2>
              </header>
              <ul className={styles.links}>
                {types.slice(0, 5).map((type) => (
                  <li key={type.name}>
                    <Link href={hrefs.create(type.name)} className={styles.link}>
                      <Icon name="plus" size={13} />
                      Nový: {(type.title || type.name).toLowerCase()}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={hrefs.media()} className={styles.link}>
                    <Icon name="upload" size={13} />
                    Nahrát obrázky
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </ViewBody>
    </>
  )
}

function greeting(user) {
  const hour = new Date().getHours()
  const name = (user?.name || "").split(" ")[0]
  const part = hour < 10 ? "Dobré ráno" : hour < 18 ? "Dobrý den" : "Dobrý večer"
  return name ? `${part}, ${name}` : part
}
