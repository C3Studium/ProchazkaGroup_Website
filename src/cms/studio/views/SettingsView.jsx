import { useCallback, useMemo, useRef, useState } from "react"
import { useAuth, usePort } from "../context/StudioProvider"
import { useAsync } from "../hooks/useAsync"
import { useToast } from "../context/ToastProvider"
import { formatDateTime, formatRelative, plural } from "../lib/format"
import { hrefs } from "../lib/routes"
import { Button, FieldShell, IconButton, Segmented, Toggle } from "../ui/controls"
import { Badge, EmptyState, ErrorState, SectionHead, SkeletonRows, Spinner } from "../ui/feedback"
import { ConfirmDialog, Modal } from "../ui/Modal"
import Icon from "../ui/Icon"
import PasswordDialog from "../shell/PasswordDialog"
import { ResultCount, Spacer, ViewBody, ViewHeader, ViewToolbar } from "./ViewLayout"
import styles from "./SettingsView.module.scss"

/**
 * Everything that is configuration rather than content, in one place.
 *
 * ---------------------------------------------------------------------------
 * NO SECRET IS EVER RENDERED HERE. DO NOT ADD A REVEAL.
 * ---------------------------------------------------------------------------
 *
 * The status section prints "nastaveno" or "nenastaveno" and never a value —
 * not the service-role key, not CMS_SESSION_SECRET, not CMS_ADMIN_PASSWORD, not
 * CMS_IP_HASH_SALT, not masked, not the last four characters, not behind a
 * button. The endpoint behind it does not return them either
 * (src/cms/server/settings.js holds the rule and the reasoning), so this is not
 * the only line of defence — it is the second one. If somebody asks for "just
 * the first six characters so I can tell which key it is", the answer is a
 * fingerprint, which the server can already compute and deliberately does not
 * send.
 *
 * There are exactly two credentials this Studio ever puts on screen, both at
 * the moment of creation and both never retrievable again: a generated user
 * password (UsersView) and a new API key (below). Both say so on the dialog.
 *
 * ---------------------------------------------------------------------------
 * Why Users and the password change did not move in here
 * ---------------------------------------------------------------------------
 *
 * They are settings by any reasonable definition, and both stay where they are.
 *
 * `/studio/users` keeps its own address and its own sidebar row. It is a screen
 * the client has already learned, it is reached often enough to be worth a
 * click rather than two, and it is the one settings screen with a genuine list
 * UI behind it — folding it into a section here would either shrink it into a
 * summary (losing the controls) or make this page mostly about users (losing
 * the point). What it gets instead is a card at the bottom of this page, so
 * somebody who opens Nastavení looking for "who can get in" is one click from
 * the answer rather than told they were in the wrong place.
 *
 * Changing your own password stays on the sidebar footer, next to the avatar
 * and the sign-out button, because that is where every application this client
 * uses puts it and it is two clicks from anywhere in the Studio. It is ALSO
 * offered here, from the same `PasswordDialog` component — one implementation,
 * two doors. Moving a control someone has learned costs a relearn; adding a
 * second way in costs a line.
 */
export default function SettingsView() {
  const [changingPassword, setChangingPassword] = useState(false)
  const bodyRef = useRef(null)

  const sections = [
    { id: "prostredi", label: "Prostředí" },
    { id: "spravovat", label: "Odkaz na správu" },
    { id: "pristup", label: "Veřejný přístup" },
    { id: "klice", label: "API klíče" },
    { id: "prihlaseni", label: "Přihlášení" },
    { id: "ucet", label: "Účet" },
  ]

  // Scrolling by ref rather than by `#hash`. The Studio's body is the scroll
  // container, not the document, and a hash would also push a history entry
  // that the browser's back button then has to unwind one section at a time.
  const jump = (id) => {
    const target = bodyRef.current?.querySelector(`[data-section="${id}"]`)
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <ViewHeader
        title="Nastavení"
        subtitle="Co je v systému nastavené, kdo je přihlášený a co smí číst zvenčí."
      />

      <ViewToolbar>
        <nav className={styles.jump} aria-label="Sekce nastavení">
          {sections.map((section) => (
            <button key={section.id} type="button" className={styles.jumpItem} onClick={() => jump(section.id)}>
              {section.label}
            </button>
          ))}
        </nav>
      </ViewToolbar>

      {/* The scroll container is ViewBody's; the ref hangs off an element
          inside it because ViewBody is a plain component and forwarding a ref
          through it would change a shared layout primitive for one screen. */}
      <ViewBody className={styles.body}>
        <div className={styles.sections} ref={bodyRef}>
          <EnvironmentSection />
          <ManageWidgetSection />
          <ExposureSection />
          <KeysSection />
          <SessionsSection />
          <AccountSection onChangePassword={() => setChangingPassword(true)} />
        </div>
      </ViewBody>

      <PasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />
    </>
  )
}

/* ---------------------------------------------------------------- pieces -- */

function Section({ id, title, hint, action, children }) {
  return (
    <section className={styles.section} data-section={id}>
      <SectionHead title={title} hint={hint} action={action} />
      {children}
    </section>
  )
}

/**
 * One fact. `tone` is the only signal — there is no colour for "good" in this
 * design system (styles/_tokens.module.scss, rule 1), so a healthy row is
 * simply quiet and only the ones that want attention are brass or brick.
 */
function Fact({ label, value, note, tone = "neutral", mono, wide }) {
  return (
    // `wide` widens the middle column for a row whose value is a control rather
    // than a word. Four segments of Czech do not fit 200px, and the alternative
    // — widening the column for every fact on the screen — would put a
    // three-character answer in the middle of a lot of nothing.
    <div className={`${styles.fact} ${wide ? styles.factWide : ""}`}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>
        {typeof value === "string" ? (
          <span className={mono ? styles.mono : undefined}>{value}</span>
        ) : (
          value
        )}
      </span>
      {note ? <span className={`${styles.factNote} ${styles[`note_${tone}`] || ""}`}>{note}</span> : null}
    </div>
  )
}

/** "nastaveno" / "nenastaveno", and never anything else about a secret. */
function SetBadge({ set, missingTone = "danger" }) {
  return set ? (
    <Badge tone="neutral">nastaveno</Badge>
  ) : (
    <Badge tone={missingTone} dot>
      nenastaveno
    </Badge>
  )
}

/* ----------------------------------------------------------- environment -- */

function EnvironmentSection() {
  const port = usePort()
  const { data, error, loading, reload } = useAsync(() => port.settings.status(), [port])

  return (
    <Section
      id="prostredi"
      title="Prostředí"
      hint="Co server skutečně má nastavené. Hodnoty tajných proměnných se nezobrazují nikde a nijak."
      action={<IconButton icon="refresh" label="Načíst znovu" onClick={reload} />}
    >
      {loading && !data ? (
        <SkeletonRows count={5} height={44} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} compact />
      ) : data ? (
        <div className={styles.facts}>
          <Fact
            label="Režim"
            value={<Badge tone={data.environment === "production" ? "accent" : "neutral"}>{data.environment}</Badge>}
          />

          <Fact
            label="Supabase projekt"
            value={data.supabase.projectRef || "—"}
            mono
            note={data.supabase.url || "NEXT_PUBLIC_SUPABASE_URL není nastavená"}
          />

          <Fact
            label="SUPABASE_SERVICE_ROLE_KEY"
            value={<SetBadge set={data.supabase.serviceRoleKeySet} missingTone="accent" />}
            tone={data.supabase.serviceRoleKeySet ? "neutral" : "accent"}
            note={
              data.supabase.serviceRoleKeySet
                ? "Serverový klíč. Obchází RLS, proto se jeho hodnota nikdy neposílá do prohlížeče."
                : "Bez něj běží obsah na souborovém úložišti. V produkci se odmítne spustit — soubory na Vercelu nepřežijí."
            }
          />

          <Fact
            label="Úložiště obsahu"
            value={data.persistence.driver === "supabase" ? "Supabase (cms_document)" : "Soubor (.cms-dev/store.json)"}
            tone={data.persistence.fileStoreInProduction ? "danger" : "neutral"}
            note={
              data.persistence.fileStoreInProduction
                ? "PRODUKCE bez servisního klíče: uložené změny beze stopy zmizí. Nastavte SUPABASE_SERVICE_ROLE_KEY."
                : "Rozhoduje o tom jediná otázka — jestli je nastavený servisní klíč."
            }
          />

          <Fact
            label="Úložiště souborů"
            value={data.persistence.storageDriver === "supabase" ? "Supabase Storage" : "Soubor (.cms-dev/media)"}
            mono={false}
            note={`Bucket „${data.persistence.mediaBucket}"`}
          />

          <Fact
            label="Vlastník ze seedu"
            value={data.auth.bootstrapEmail || "—"}
            mono={Boolean(data.auth.bootstrapEmail)}
            note={
              data.auth.bootstrapPasswordSet
                ? "CMS_ADMIN_PASSWORD je nastavené, ale je to jen seed: jakmile jeden účet existuje, nic už nezaloží a heslo změněné ve Studiu z prostředí přepsat nejde."
                : "CMS_ADMIN_PASSWORD není nastavené. Pokud ještě neexistuje žádný účet, nikdo se nepřihlásí."
            }
          />

          <Fact
            label="CMS_SESSION_SECRET"
            value={<SetBadge set={data.auth.sessionSecretSet} />}
            note="Podepisuje session cookie. Změna hodnoty odhlásí všechny."
          />

          <Fact
            label="CMS_IP_HASH_SALT"
            value={<SetBadge set={data.auth.ipHashSaltSet} missingTone="accent" />}
            note="Solí otisky IP adres. Bez něj limity fungují, ale otisk je nesolený."
          />

          <Fact
            label="NEXT_PUBLIC_CMS_DEV_PORT"
            value={
              data.devPort.enabled ? (
                <Badge tone="danger" dot>
                  zapnuto
                </Badge>
              ) : (
                <Badge tone="neutral">vypnuto</Badge>
              )
            }
            tone={data.devPort.enabled ? "danger" : "neutral"}
            note={
              data.devPort.enabled
                ? `Studio běží na prohlížečové atrapě a dvě API cesty přeskakují kontrolu přihlášení: ${data.devPort.affects.join(", ")}. V produkci nikdy.`
                : "Studio jede na serveru a obě API cesty kontrolují přihlášení."
            }
          />
        </div>
      ) : null}
    </Section>
  )
}

/* ------------------------------------------------------- odkaz na správu -- */

/**
 * The only section on this screen that WRITES anything, and the only one whose
 * subject is the public site rather than the server.
 *
 * It configures the small badge an editor sees in a corner of the live site —
 * "Spravovat web" and a button into the Studio — so that the client never has
 * to remember an address. Who sees it is not configurable and is not a setting:
 * it is whoever's browser carries the sign-in hint, which is worth nothing to
 * anybody who forges it (src/cms/manage/hint.js). What is configurable is what
 * it looks like, which is what this is.
 *
 * The four values are fetched by the widget at runtime rather than baked into
 * the pages, so a change here is on screen at the next page load rather than at
 * the next ISR revalidation ten minutes from now. @/cms/server/manageWidget
 * argues that trade; it matters here because it is the reason this section can
 * promise "uloží se hned".
 */

const CORNER_OPTIONS = [
  { id: "bottom-left", title: "Vlevo dole" },
  { id: "bottom-right", title: "Vpravo dole" },
  { id: "top-left", title: "Vlevo nahoře" },
  { id: "top-right", title: "Vpravo nahoře" },
]

/** `#0b1a22e6` -> `#0b1a22`. `input[type=color]` has no notion of alpha and
 *  silently mangles an eight-digit value, so the swatch is fed the opaque half
 *  and the text field keeps the whole thing. */
const swatchValue = (hex) => {
  const value = String(hex || "").toLowerCase()
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(value)) return value.slice(0, 7)
  if (/^#[0-9a-f]{3}$/.test(value)) return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  return "#0b1a22"
}

/** Keep the alpha the owner already chose when they drag the colour picker. */
const withSwatch = (hex, picked) => {
  const value = String(hex || "").toLowerCase()
  const alpha = /^#[0-9a-f]{6}([0-9a-f]{2})$/.exec(value)
  return alpha ? `${picked}${alpha[1]}` : picked
}

function ManageWidgetSection() {
  const port = usePort()
  const toast = useToast()

  const { data, error, loading, reload, setData } = useAsync(() => port.settings.widget.read(), [port])

  // The edited copy, or nothing. Held separately from `data` rather than
  // editing it in place so that "co je uložené" and "co je na obrazovce" are
  // two values and the Uložit button can tell them apart.
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const value = draft || data
  const dirty = Boolean(draft && data && JSON.stringify(draft) !== JSON.stringify(data))

  const edit = (patch) => setDraft({ ...(draft || data), ...patch })

  const save = async () => {
    setSaving(true)
    try {
      // The server answers with what it stored, which is not always what was
      // sent — it normalises and refuses. Taking its answer rather than the
      // draft is the same reconciliation the visual editor does after a field
      // patch (studio/lib/visualSave.js).
      const stored = await port.settings.widget.save(value)
      setData(stored)
      setDraft(null)
      toast.success("Uloženo. Projeví se při dalším načtení stránky.")
    } catch (failure) {
      toast.error(failure?.message || "Nastavení se nepodařilo uložit.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section
      id="spravovat"
      title="Odkaz na správu webu"
      hint="Malý štítek „Spravovat web” v rohu webu. Vidí ho jen ten, kdo se na tomhle zařízení přihlásil do Studia — návštěvník nestáhne ani nezobrazí nic."
      action={<IconButton icon="refresh" label="Načíst znovu" onClick={reload} />}
    >
      {loading && !data ? (
        <SkeletonRows count={3} height={44} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} compact />
      ) : value ? (
        <>
          <div className={styles.facts}>
            <Fact
              wide
              label="Zobrazovat štítek"
              // The state in words as well as in the switch. A bare Toggle has
              // no accessible name — the row's label is beside it, not bound to
              // it — and "Zapnuto/Vypnuto" is both the name and the reading.
              value={
                <Toggle
                  checked={value.enabled}
                  onChange={(on) => edit({ enabled: on })}
                  label={value.enabled ? "Zapnuto" : "Vypnuto"}
                />
              }
              note="Vypnutím zmizí všem, i vám. Zpátky se dostanete přes adresu /studio."
            />

            <Fact
              wide
              label="Roh"
              value={
                <Segmented
                  options={CORNER_OPTIONS}
                  value={value.corner}
                  onChange={(corner) => edit({ corner })}
                />
              }
              note="Vpravo dole už sedí posuvná tlačítka webu, proto je výchozí roh vlevo dole."
            />

            <Fact
              wide
              label="Barva pozadí"
              value={
                <span className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.color}
                    aria-label="Barva pozadí štítku"
                    value={swatchValue(value.background)}
                    onChange={(event) => edit({ background: withSwatch(value.background, event.target.value) })}
                  />
                  <input
                    type="text"
                    className={`${styles.input} ${styles.hex}`}
                    aria-label="Barva pozadí štítku jako hex"
                    spellCheck={false}
                    autoComplete="off"
                    value={value.background}
                    onChange={(event) => edit({ background: event.target.value.trim() })}
                  />
                </span>
              }
              note="Hex. Osm znaků znamená barvu s průhledností — #0b1a22e6 je 90 % krytí."
            />

            <Fact
              wide
              label="Rozmazat pozadí za štítkem"
              value={
                <Toggle
                  checked={value.blur}
                  onChange={(on) => edit({ blur: on })}
                  label={value.blur ? "Zapnuto" : "Vypnuto"}
                />
              }
              note="Přes pohyblivý shader webu je štítek bez rozmazání hůř čitelný. Vypněte ho, pokud vám kazí plynulost."
            />
          </div>

          <div className={styles.saveRow}>
            <Button variant="primary" icon="check" onClick={save} loading={saving} disabled={!dirty}>
              Uložit
            </Button>
            {dirty ? (
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                Zahodit změny
              </Button>
            ) : (
              <span className={styles.savedNote}>Uložené nastavení.</span>
            )}
          </div>
        </>
      ) : null}
    </Section>
  )
}

/* -------------------------------------------------------------- exposure -- */

/**
 * The audit's finding, turned into something that can be watched become false.
 *
 * Nothing here runs on mount — a section that fired three requests at Supabase
 * every time somebody opened Nastavení would be its own small denial of
 * service, and the answer changes when a migration runs, not when a page
 * renders. So it is a button.
 */
function ExposureSection() {
  const port = usePort()
  const toast = useToast()
  const [state, setState] = useState({ busy: false, data: null })

  const run = async () => {
    setState((current) => ({ ...current, busy: true }))
    try {
      const data = await port.settings.probe({ force: true })
      setState({ busy: false, data })
    } catch (failure) {
      setState((current) => ({ ...current, busy: false }))
      toast.error(failure?.message || "Kontrolu se nepodařilo provést.")
    }
  }

  const { data, busy } = state
  const exposed = data?.tables?.filter((row) => row.readable) || []

  return (
    <Section
      id="pristup"
      title="Veřejný přístup ke starým tabulkám"
      hint="Co si přečte kdokoli s veřejným klíčem ze stránek. Kontrola se spouští jen tímto tlačítkem."
      action={
        <Button variant="secondary" icon="refresh" onClick={run} loading={busy}>
          {data ? "Zkontrolovat znovu" : "Zkontrolovat"}
        </Button>
      }
    >
      {!data ? (
        <p className={styles.prose}>
          Audit zjistil, že tabulky <code>reviews</code>, <code>people</code> a <code>total</code> jsou veřejně čitelné a
          že <code>reviews</code> vydává IP adresy. Kontrola udělá jen čtení — nic nezapisuje a nic nemění.
        </p>
      ) : (
        <div className={styles.facts}>
          {data.tables.map((row) => (
            <Fact
              key={row.table}
              label={row.table}
              value={
                row.readable === null ? (
                  <Badge tone="accent" dot>
                    nedostupné
                  </Badge>
                ) : row.readable ? (
                  <Badge tone="danger" dot>
                    veřejně čitelná
                  </Badge>
                ) : (
                  <Badge tone="neutral">uzavřená</Badge>
                )
              }
              tone={row.readable ? "danger" : "neutral"}
              note={
                row.readable === null
                  ? "Sonda se nedovolala — to není totéž jako „zavřeno”."
                  : row.readable
                    ? `Anonymní klíč přečte ${plural(row.rows ?? 0, "řádek", "řádky", "řádků")}.`
                    : `Odmítnuto (HTTP ${row.status}).`
              }
            />
          ))}

          <Fact
            label="IP adresy v recenzích"
            value={
              data.personalColumns.readable ? (
                <Badge tone="danger" dot>
                  {data.personalColumns.populated ? "veřejně čitelné, vyplněné" : "veřejně čitelné"}
                </Badge>
              ) : (
                <Badge tone="neutral">uzavřené</Badge>
              )
            }
            tone={data.personalColumns.readable ? "danger" : "neutral"}
            note={`Sloupce ${data.personalColumns.columns.join(", ")} — osobní údaj podle GDPR.`}
          />

          {/* The honest answer, and the reason for it comes from the server so
              the sentence and the probe cannot drift apart. */}
          <Fact
            label="Zápis anonymním klíčem"
            value={<Badge tone="accent" dot>neověřeno</Badge>}
            tone="accent"
            note={data.writable.reason}
          />

          <p className={styles.checked}>
            Kontrolováno {formatDateTime(data.checkedAt)}
            {exposed.length ? ` · veřejně čitelných tabulek: ${exposed.length}` : ""}
          </p>
        </div>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ keys -- */

function KeysSection() {
  const port = usePort()
  const toast = useToast()

  const [revision, setRevision] = useState(0)
  const { data, error, loading, reload } = useAsync(() => port.settings.keys.list(), [port, revision])

  const [creating, setCreating] = useState(false)
  const [issued, setIssued] = useState(null)
  const [revoking, setRevoking] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const rows = data?.rows || []
  const live = rows.filter((row) => !row.revokedAt)

  const bump = useCallback(() => setRevision((current) => current + 1), [])

  return (
    <Section
      id="klice"
      title="API klíče"
      hint="Klíč, kterým cizí systém čte publikovaný obsah tohoto webu. Nic víc — na koncepty, uživatele ani nahrávání souborů nedosáhne."
      action={
        <Button variant="secondary" icon="plus" onClick={() => setCreating(true)}>
          Vydat klíč
        </Button>
      }
    >
      {loading && !data ? (
        <SkeletonRows count={2} height={44} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} compact />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon="lock"
          title="Žádné klíče"
          description="Zatím žádný cizí systém tento obsah nečte. Klíč vydejte, až bude komu."
        />
      ) : (
        <>
          <ul className={styles.rows}>
            {rows.map((row) => (
              <li key={row.id} className={`${styles.row} ${row.revokedAt ? styles.rowOff : ""}`}>
                <span className={styles.rowMain}>
                  <span className={styles.rowName}>{row.name}</span>
                  <span className={styles.rowMeta}>
                    Vydán {formatDateTime(row.createdAt)}
                    {row.lastUsedAt ? ` · naposledy použit ${formatRelative(row.lastUsedAt)}` : " · zatím nepoužit"}
                  </span>
                </span>

                <span className={styles.rowState}>
                  {row.revokedAt ? (
                    <Badge tone="neutral" title={formatDateTime(row.revokedAt)}>
                      zneplatněn
                    </Badge>
                  ) : row.lastUsedAt ? (
                    <Badge tone="neutral" dot>
                      aktivní
                    </Badge>
                  ) : (
                    <Badge tone="accent" dot>
                      nepoužitý
                    </Badge>
                  )}
                </span>

                <span className={styles.rowActions}>
                  {row.revokedAt ? null : (
                    <IconButton
                      icon="close"
                      label={`Zneplatnit klíč ${row.name}`}
                      tone="danger"
                      disabled={busyId === row.id}
                      onClick={() => setRevoking(row)}
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
          <ResultCount>
            {plural(live.length, "platný klíč", "platné klíče", "platných klíčů")}
          </ResultCount>
        </>
      )}

      <CreateKeyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (name) => {
          const result = await port.settings.keys.create({ name })
          bump()
          setCreating(false)
          // The token exists in that one response. If this dialog closed
          // without showing it, it would be gone for good — users.js's
          // generated password, same flow, same wording.
          setIssued(result)
        }}
      />

      <IssuedKeyDialog issued={issued} onClose={() => setIssued(null)} />

      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        title="Zneplatnit klíč?"
        description={`Klíč „${revoking?.name}" okamžitě přestane fungovat a nejde ho obnovit. Systém, který ho používá, začne dostávat 401.`}
        confirmLabel="Zneplatnit"
        busy={busyId === revoking?.id}
        onConfirm={async () => {
          const target = revoking
          setRevoking(null)
          setBusyId(target.id)
          try {
            await port.settings.keys.revoke({ id: target.id })
            bump()
            toast.success("Klíč byl zneplatněn.")
          } catch (failure) {
            toast.error(failure?.message || "Zneplatnění se nezdařilo.")
          } finally {
            setBusyId(null)
          }
        }}
      />
    </Section>
  )
}

function CreateKeyDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState("")
  const [state, setState] = useState({ busy: false, error: null })

  const close = () => {
    setName("")
    setState({ busy: false, error: null })
    onClose()
  }

  const submit = async () => {
    setState({ busy: true, error: null })
    try {
      await onCreate(name.trim())
      setName("")
      setState({ busy: false, error: null })
    } catch (failure) {
      setState({ busy: false, error: failure?.message || "Klíč se nepodařilo vytvořit." })
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Vydat API klíč"
      description="Klíč umí jen číst publikovaný obsah. Ukážeme ho jednou a pak už nikdy."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={state.busy}>
            Zrušit
          </Button>
          <Button variant="primary" onClick={submit} loading={state.busy}>
            Vydat
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <FieldShell label="Název" required description="Podle čeho ho poznáte, až ho budete rušit — třeba „mobilní aplikace”.">
          {(id) => (
            <input
              id={id}
              type="text"
              className={styles.input}
              value={name}
              autoComplete="off"
              placeholder="Mobilní aplikace"
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </FieldShell>

        {state.error ? (
          <p className={styles.failure} role="alert">
            <Icon name="warning" size={13} />
            {state.error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

/**
 * The token, shown once. There is no endpoint that can produce it again — the
 * row holds a SHA-256 and nothing else — so the dialog says so plainly rather
 * than letting someone close it and find out later.
 */
function IssuedKeyDialog({ issued, onClose }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission refused; the value is on screen and selectable.
    }
  }

  return (
    <Modal
      open={Boolean(issued)}
      onClose={onClose}
      title="Nový API klíč"
      size="md"
      footer={
        <Button variant="primary" onClick={onClose}>
          Mám zkopírováno
        </Button>
      }
    >
      <p className={styles.issuedIntro}>
        Klíč <strong>{issued?.key?.name}</strong> je vydaný. Vložte ho do systému, který má číst obsah.
      </p>

      <div className={styles.secretRow}>
        <code className={styles.secret}>{issued?.token}</code>
        <Button variant="secondary" size="sm" icon={copied ? "check" : "link"} onClick={copy}>
          {copied ? "Zkopírováno" : "Kopírovat"}
        </Button>
      </div>

      <p className={styles.issuedWarning}>
        <Icon name="warning" size={13} />
        Zavřením okna klíč zmizí. Uložený je jen jako otisk, takže ho nikdo — ani vy — už znovu nezjistí. Když se ztratí,
        zneplatněte ho a vydejte nový.
      </p>

      <p className={styles.usageLabel}>Použití</p>
      <pre className={styles.usage}>
        {`curl -H "Authorization: Bearer <klíč>" \\
  "${typeof window === "undefined" ? "" : window.location.origin}/api/cms/content/documents?type=review"`}
      </pre>
      <p className={styles.issuedWarning}>
        <Icon name="info" size={13} />
        Klíč čte jen publikované dokumenty. Na koncepty, uživatele, přihlášení ani nahrávání souborů nedosáhne.
      </p>
    </Modal>
  )
}

/* -------------------------------------------------------------- sessions -- */

/**
 * `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) … Chrome/141.0 Safari/537.36`
 * -> `Chrome · macOS`.
 *
 * Deliberately coarse. The string is there so a person recognises their own
 * laptop in a list of four, not so anyone can fingerprint a browser — and a
 * full user-agent string printed in a table is unreadable at this density.
 */
const describeAgent = (agent) => {
  const text = String(agent || "")
  if (!text) return "Neznámé zařízení"

  const browser =
    /Edg\//.test(text) ? "Edge"
    : /OPR\//.test(text) ? "Opera"
    : /Firefox\//.test(text) ? "Firefox"
    : /Chrome\//.test(text) ? "Chrome"
    : /Safari\//.test(text) ? "Safari"
    : "Prohlížeč"

  const platform =
    /iPhone|iPad/.test(text) ? "iOS"
    : /Android/.test(text) ? "Android"
    : /Mac OS X/.test(text) ? "macOS"
    : /Windows/.test(text) ? "Windows"
    : /Linux/.test(text) ? "Linux"
    : null

  return platform ? `${browser} · ${platform}` : browser
}

function SessionsSection() {
  const port = usePort()
  const toast = useToast()

  const [revision, setRevision] = useState(0)
  const { data, error, loading, reload } = useAsync(() => port.settings.sessions.list(), [port, revision])

  const [confirmAll, setConfirmAll] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const rows = data?.rows || []
  const others = useMemo(() => rows.filter((row) => !row.current), [rows])

  const bump = () => setRevision((current) => current + 1)

  return (
    <Section
      id="prihlaseni"
      title="Přihlášení"
      hint="Každé zařízení, které je právě přihlášené. Relace platí 30 dní a samy se prodlužují, takže se hromadí."
      action={
        <Button
          variant="secondary"
          icon="logout"
          disabled={!others.length}
          onClick={() => setConfirmAll(true)}
        >
          Odhlásit ostatní zařízení
        </Button>
      }
    >
      {loading && !data ? (
        <SkeletonRows count={4} height={44} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} compact />
      ) : rows.length === 0 ? (
        <EmptyState compact icon="users" title="Nikdo není přihlášený" />
      ) : (
        <>
          <ul className={styles.rows}>
            {rows.map((row) => (
              <li key={row.id} className={styles.row}>
                <span className={styles.rowMain}>
                  <span className={styles.rowName}>
                    {row.email || "neznámý účet"}
                    {row.current ? <span className={styles.you}>toto zařízení</span> : null}
                  </span>
                  <span className={styles.rowMeta}>
                    {describeAgent(row.userAgent)} · přihlášeno {formatRelative(row.createdAt)} · platí do{" "}
                    {formatDateTime(row.expiresAt)}
                  </span>
                </span>

                <span className={styles.rowState}>
                  <Badge tone="neutral">{{ admin: "správce", owner: "majitel", member: "člen" }[row.role] || row.role}</Badge>
                </span>

                <span className={styles.rowActions}>
                  <IconButton
                    icon="logout"
                    label={row.current ? "Odhlásit toto zařízení" : `Odhlásit ${row.email}`}
                    tone={row.current ? "danger" : undefined}
                    disabled={busyId === row.id}
                    onClick={async () => {
                      setBusyId(row.id)
                      try {
                        await port.settings.sessions.revoke({ id: row.id })
                        // Revoking your own row is allowed and takes effect on
                        // the next request; the Studio will land on the sign-in
                        // screen the moment anything asks the server.
                        bump()
                        toast.success(row.current ? "Tato relace byla ukončena." : "Zařízení bylo odhlášeno.")
                      } catch (failure) {
                        toast.error(failure?.message || "Odhlášení se nezdařilo.")
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.rowsFoot}>
            <ResultCount>{plural(rows.length, "relace", "relace", "relací")}</ResultCount>
            <Spacer />
            {loading ? <Spinner size={13} /> : null}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Odhlásit ostatní zařízení?"
        description={`Ukončí se ${plural(others.length, "relace", "relace", "relací")} — všechny kromě té, ze které se právě díváte. Kdokoli na nich se bude muset přihlásit znovu.`}
        confirmLabel="Odhlásit"
        onConfirm={async () => {
          setConfirmAll(false)
          try {
            const result = await port.settings.sessions.revokeAll({})
            bump()
            toast.success(`Ukončeno ${plural(result?.ended ?? 0, "relace", "relace", "relací")}.`)
          } catch (failure) {
            toast.error(failure?.message || "Odhlášení se nezdařilo.")
          }
        }}
      />
    </Section>
  )
}

/* ----------------------------------------------------------------- účet --- */

function AccountSection({ onChangePassword }) {
  const { user } = useAuth()

  return (
    <Section id="ucet" title="Účet a lidé" hint="Vaše heslo a to, kdo další se do Studia dostane.">
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Vaše heslo</span>
          <p className={styles.cardText}>
            Přihlášeni jako <strong>{user?.email}</strong>. Změna hesla ukončí všechna ostatní přihlášení a vystaví vám
            novou relaci.
          </p>
          <Button variant="secondary" icon="lock" onClick={onChangePassword}>
            Změnit heslo
          </Button>
        </div>

        <div className={styles.card}>
          <span className={styles.cardTitle}>Uživatelé</span>
          <p className={styles.cardText}>
            Kdo se může přihlásit a co smí spravovat. Vlastník spravuje uživatele, redaktor jen obsah — obojí se ověřuje
            na serveru.
          </p>
          <Button variant="secondary" icon="users" href={hrefs.users()}>
            Otevřít uživatele
          </Button>
        </div>
      </div>
    </Section>
  )
}
