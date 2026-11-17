import { useEffect, useMemo, useState } from "react"
import { usePort } from "../context/StudioProvider.jsx"
import { useToast } from "../context/ToastProvider.jsx"
import { useAsync } from "../hooks/useAsync.js"
import { useUnsavedGuard } from "../hooks/useUnsavedGuard.js"
import { Button, SearchInput } from "../ui/controls.jsx"
import { Badge, EmptyState, ErrorState, SkeletonRows } from "../ui/feedback.jsx"
import { ViewBody, ViewHeader } from "./ViewLayout.jsx"
import styles from "./MailsView.module.scss"

/**
 * E-maily — znění e-mailů, které web posílá.
 *
 * Tři sloupce: vlevo seznam (chodí zákazníkům / chodí vám), uprostřed předmět
 * a texty vybraného e-mailu, vpravo náhled, který se překresluje během psaní.
 * Prázdné pole = výchozí znění z kódu; vyplněné = přepis. Náhled kreslí web
 * sám (katalog má `preview`), Studio jen posílá texty z formuláře a ukazuje
 * HTML v izolovaném rámu.
 *
 * Katalog přichází z webu (`handleCmsRequest(req, res, { mails })`). Když
 * žádný není, obrazovka to řekne — menu ji v tom případě ani nenabízí.
 */
export default function MailsView() {
  const port = usePort()
  const toast = useToast()
  const { data, error, loading, reload, setData } = useAsync(() => port.mails.list(), [port])
  const mails = data?.mails ?? []

  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState({})
  const [filter, setFilter] = useState("")
  const [saving, setSaving] = useState(false)

  const current = mails.find((mail) => mail.key === selected) ?? null

  // První e-mail vybraný hned, ať je napravo co vidět.
  useEffect(() => {
    if (!selected && mails.length) setSelected(mails[0].key)
  }, [mails, selected])

  // Při přepnutí e-mailu (nebo po uložení) formulář z uloženého znění.
  const savedKey = current ? JSON.stringify(valuesOf(current)) : ""
  useEffect(() => {
    if (current) setDraft(valuesOf(current))
    // Jen při změně výběru nebo uložené hodnoty — ne při každém překreslení.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, savedKey])

  const saved = current ? valuesOf(current) : {}
  const changes = Object.keys({ ...saved, ...draft }).filter((key) => (draft[key] ?? "") !== (saved[key] ?? "")).length
  const dirty = changes > 0
  useUnsavedGuard(dirty)

  const visible = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase("cs")
    return mails.filter((mail) => !query || mail.title.toLocaleLowerCase("cs").includes(query))
  }, [mails, filter])

  const set = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }))

  const select = (key) => {
    if (key === selected) return
    if (dirty && !window.confirm("Máte neuložené změny. Opravdu přepnout na jiný e-mail?")) return
    setSelected(key)
  }

  const save = async (values) => {
    if (!current) return
    setSaving(true)
    try {
      const result = await port.mails.save(current.key, values)
      setData((previous) => ({
        ...previous,
        mails: (previous?.mails ?? []).map((mail) => (mail.key === result.mail.key ? result.mail : mail)),
      }))
      toast.success("E-mail uložený — další odeslané už půjdou s novým zněním.")
    } catch (failure) {
      toast.error(failure?.message || "E-mail se nepodařilo uložit.")
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <>
        <ViewHeader title="E-maily" subtitle={SUBTITLE} />
        <ViewBody padded>
          <SkeletonRows count={4} height={48} />
        </ViewBody>
      </>
    )
  }

  if (error) {
    return (
      <>
        <ViewHeader title="E-maily" subtitle={SUBTITLE} />
        <ViewBody padded>
          <ErrorState error={error} onRetry={reload} />
        </ViewBody>
      </>
    )
  }

  if (!mails.length) {
    return (
      <>
        <ViewHeader title="E-maily" subtitle={SUBTITLE} />
        <ViewBody padded>
          <EmptyState
            icon="mail"
            title="Web nemá žádné e-maily k úpravě"
            description="Katalog e-mailů deklaruje web v kódu (defineMails) a předává ho API routě — viz DOCS.md, oddíl E-maily."
          />
        </ViewBody>
      </>
    )
  }

  return (
    <>
      <ViewHeader title="E-maily" subtitle={SUBTITLE} />

      <ViewBody className={styles.body}>
        <div className={styles.columns}>
          {/* ------------------------------------------------- seznam */}
          <aside className={styles.list}>
            <div className={styles.search}>
              <SearchInput value={filter} onChange={setFilter} placeholder="Hledat e-mail" />
            </div>
            <ul className={styles.rows}>
              {visible.map((mail, index) => {
                const first = index === 0 || visible[index - 1].audience !== mail.audience
                return (
                  <li key={mail.key}>
                    {first ? (
                      <div className={styles.groupLabel}>{mail.audience === "owner" ? "Chodí vám" : "Chodí zákazníkům"}</div>
                    ) : null}
                    <button
                      type="button"
                      className={`${styles.row} ${mail.key === selected ? styles.rowActive : ""}`}
                      aria-current={mail.key === selected ? "true" : undefined}
                      onClick={() => select(mail.key)}
                    >
                      <span className={styles.rowTitle}>{mail.title}</span>
                      {customized(mail) ? <Badge tone="accent">upraveno</Badge> : null}
                    </button>
                  </li>
                )
              })}
              {!visible.length ? <li className={styles.none}>Nic takového tu není.</li> : null}
            </ul>
          </aside>

          {/* ---------------------------------------------- formulář */}
          <section className={styles.form} aria-label="Texty e-mailu">
            {current ? (
              <>
                <div className={styles.formHead}>
                  <h2 className={styles.formTitle}>{current.title}</h2>
                  {customized(current) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        if (window.confirm("Vrátit celý e-mail na výchozí znění?")) save({})
                      }}
                    >
                      Vrátit výchozí znění
                    </Button>
                  ) : null}
                </div>

                <Field
                  label="Předmět"
                  hint="Co uvidí příjemce v seznamu e-mailů."
                  value={draft.subject ?? ""}
                  fallback={current.subject.default}
                  onChange={(value) => set("subject", value)}
                />

                {current.fields.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    hint={field.hint}
                    lines={field.lines}
                    value={draft[field.key] ?? ""}
                    fallback={field.default}
                    onChange={(value) => set(field.key, value)}
                  />
                ))}

                {current.note ? <p className={styles.note}>{current.note}</p> : null}
              </>
            ) : null}
          </section>

          {/* ------------------------------------------------- náhled */}
          <Preview port={port} mail={current} draft={draft} />
        </div>
      </ViewBody>

      <div className={styles.saveBar}>
        <Button variant="primary" disabled={!dirty || saving} loading={saving} onClick={() => save(draft)}>
          Uložit
        </Button>
        {dirty ? (
          <>
            <span className={styles.saveNote}>
              {changes === 1 ? "1 změna" : changes < 5 ? `${changes} změny` : `${changes} změn`}
            </span>
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => current && setDraft(valuesOf(current))}>
              Zahodit
            </Button>
          </>
        ) : (
          <span className={styles.saveNote}>Vše je uložené.</span>
        )}
      </div>
    </>
  )
}

const SUBTITLE = "Vyberte e-mail, přepište text a vpravo hned uvidíte, jak přijde. Prázdné pole = výchozí znění. Enter v textu udělá nový řádek i v e-mailu."

const valuesOf = (mail) => ({
  subject: mail.subject.value,
  ...Object.fromEntries(mail.fields.map((field) => [field.key, field.value])),
})

const customized = (mail) => Boolean(mail.subject.value) || mail.fields.some((field) => field.value)

/* ---------------------------------------------------------------- pole --- */

/**
 * Jedno pole: nad ním popisek a stav (výchozí znění / Vrátit výchozí), pod
 * ním nápověda. Výchozí text je placeholder — je vidět, co platí, a jedním
 * klikem („Upravit výchozí text") se z něj stane vlastní znění k úpravě.
 */
function Field({ label, hint, lines, value, fallback, onChange }) {
  const rows = Math.min(8, Math.max(2, Math.ceil((fallback || "").length / 70)))
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <span className={styles.fieldLabel}>{label}</span>
        {value ? (
          <button type="button" className={styles.fieldAction} onClick={() => onChange("")}>
            Vrátit výchozí
          </button>
        ) : (
          <span className={styles.fieldState}>výchozí znění</span>
        )}
      </div>
      {lines ? (
        <textarea className={styles.control} rows={rows} value={value} placeholder={fallback} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={styles.control} type="text" value={value} placeholder={fallback} onChange={(event) => onChange(event.target.value)} />
      )}
      {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
      {!value && fallback ? (
        <button type="button" className={styles.fieldEdit} onClick={() => onChange(fallback)}>
          Upravit výchozí text
        </button>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- náhled --- */

/** Náhled: půl vteřiny po posledním stisku klávesy, nikdy starší přes novější. */
function Preview({ port, mail, draft }) {
  const [state, setState] = useState({ html: "", subject: "", loading: false, failed: false })
  const draftKey = JSON.stringify(draft)

  useEffect(() => {
    if (!mail) return undefined
    if (!mail.hasPreview) {
      setState({ html: "", subject: "", loading: false, failed: false })
      return undefined
    }
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true }))
    const timer = window.setTimeout(async () => {
      try {
        const result = await port.mails.preview(mail.key, JSON.parse(draftKey))
        if (!cancelled) setState({ html: result.html || "", subject: result.subject || "", loading: false, failed: false })
      } catch {
        if (!cancelled) setState((previous) => ({ ...previous, loading: false, failed: true }))
      }
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [port, mail?.key, mail?.hasPreview, draftKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className={styles.preview} aria-label="Náhled e-mailu">
      <div className={styles.previewHead}>
        <div className={styles.previewMeta}>
          <span className={styles.previewKicker}>Náhled · vzorová data</span>
          <span className={styles.previewSubject}>{state.subject || mail?.subject?.value || mail?.subject?.default || ""}</span>
        </div>
        {state.loading ? <span className={styles.previewState}>aktualizuji…</span> : null}
      </div>
      {mail && !mail.hasPreview ? (
        <div className={styles.previewNone}>Tenhle e-mail náhled nemá — web pro něj nedodal šablonu.</div>
      ) : state.failed ? (
        <div className={styles.previewNone}>Náhled se nepodařilo načíst.</div>
      ) : (
        <iframe title="Náhled e-mailu" className={styles.frame} srcDoc={state.html} sandbox="" />
      )}
    </aside>
  )
}
