import { useCallback, useMemo, useRef, useState } from "react"

import { isTranslatable } from "../../core/index.js"
import { useCore, usePort, useRevision } from "../../studio/context/StudioProvider.jsx"
import FieldRenderer from "../../studio/fields/FieldRenderer.jsx"
import { useAsync } from "../../studio/hooks/useAsync.js"
import { bodyOf, isEqual, setPath } from "../../studio/lib/documents.js"
import { createFieldSaver } from "../../studio/lib/visualSave.js"
import { Button } from "../../studio/ui/controls.jsx"
import { ErrorState, Spinner } from "../../studio/ui/feedback.jsx"

import styles from "./sheet.js"

/**
 * Povrch — modál nebo seznam, který se na stránce nedá kliknout. docs/I18N.md §7.
 *
 * Otevírá ho „Upravit kontent" ze seznamu, ne myš na stránce, a to je celý
 * rozdíl proti ostatním tělům v této složce: ta dostanou `docId` z anotace,
 * kterou překryv našel pod kurzorem. Tady žádná anotace není a být nemůže —
 * zavřený modál nemá obdélník — takže povrch přichází z konfigurace
 * (`defineSurface`, viz site/surfaces.js) a dokument se hledá podle `copy`.
 *
 * ---------------------------------------------------------------------------
 * Proč zápis po polích, a ne `port.update` jako v DocModule
 *
 * DocModule posílá celé tělo (`PUT /documents/:id`). Překlad se takhle uložit
 * nedá: jazyk bere jenom `PATCH /documents/:id/field` (docs/I18N.md §4),
 * protože překladový řádek nese jenom přeložitelná pole a celé tělo by do něj
 * propašovalo i ta ostatní — tedy druhou kopii `slug`u a čísel, kterou by čtení
 * stejně zahodilo.
 *
 * Takže se píše pole po poli, přes `createFieldSaver`, což je tentýž zápis,
 * jaký dělá překryv při kliknutí na text. Jedna cesta, jedno řazení zápisů,
 * jedno místo, kde se `lang` přikládá — a jedna hláška, když se pole
 * nepřekládá.
 *
 * Posílají se jen pole, která se ZMĚNILA. Nejde o úsporu požadavků: zapsat
 * nezměněné pole znamená `updated_at`, řádek v historii a u překladu i vznik
 * překladového řádku pro hodnotu, kterou nikdo nepřekládal — a prázdný překlad
 * není překlad (§3), takže by to bylo zbytečné dvakrát.
 *
 * ---------------------------------------------------------------------------
 * Co se nepřekládá, je vidět zamčené
 *
 * `slug`, čísla, reference a volby mají jednu hodnotu pro všechny jazyky. Nechat
 * je psatelné a nechat zápis spadnout na serveru by bylo správně jen technicky:
 * editor by dostal odmítnutí, ne důvod. Zamknou se tedy hned, jakmile je vybraný
 * jiný než výchozí jazyk, a nad formulářem je jedna věta, proč.
 */
export default function SurfaceModule({ surface, lang = null, onClose, onSaved }) {
    const port = usePort()
    const core = useCore()
    const { bump } = useRevision()

    const [buffer, setBuffer] = useState(null)
    const [busy, setBusy] = useState(false)
    const [failure, setFailure] = useState(null)
    const baseline = useRef(null)

    const key = surface?.copy || ""

    const { data, error, loading, reload } = useAsync(async () => {
        const doc = await documentByKey(port, key)
        if (!doc) return { doc: null, type: null }
        const body = bodyOf(doc)
        baseline.current = body
        setBuffer(body)
        return { doc, type: core.getType(doc.type) }
    }, [port, core, key])

    const doc = data?.doc || null
    const type = data?.type || null

    // Jeden zapisovač na otevření popupu. Řadí zápisy na totéž pole za sebe,
    // takže dvě „Uložit" po sobě nemůžou dorazit v opačném pořadí.
    const saver = useMemo(
        () => createFieldSaver({ port, typeFor: (name) => core.findType?.(name) ?? null }),
        [port, core],
    )

    const validation = useMemo(
        () => (buffer && type ? core.validateDocument(type, buffer) : { ok: true, errors: [] }),
        [core, type, buffer],
    )

    // Která pole se v tomhle jazyce psát nedají. Bez jazyka žádná — základní
    // řádek drží všechno.
    const locked = useMemo(() => {
        if (!lang || !type) return []
        return (type.fields || []).filter((field) => !isTranslatable(field))
    }, [lang, type])
    const lockedNames = useMemo(() => new Set(locked.map((field) => field.name)), [locked])

    const update = useCallback((name, value) => {
        setBuffer((current) => setPath(current, name, value))
    }, [])

    const changed = useMemo(() => {
        if (!buffer || !type) return []
        return (type.fields || [])
            .map((field) => field.name)
            .filter((name) => !lockedNames.has(name) && !isEqual(buffer[name], baseline.current?.[name]))
    }, [buffer, type, lockedNames])

    const submit = useCallback(async () => {
        if (!doc || !changed.length) return
        setBusy(true)
        setFailure(null)

        // Po jednom a v pořadí polí. Není to transakce a nedá se z toho udělat:
        // co prošlo, zůstává uložené, a když něco neprojde, řekne se které pole
        // — jinak by editor nevěděl, co má zkusit znovu.
        const refused = []
        const stored = { ...baseline.current }
        for (const name of changed) {
            const entry = await saver.save({ docId: doc.id, field: name, value: buffer[name], lang })
            if (entry.status === "saved") stored[name] = buffer[name]
            else refused.push(`${name}: ${entry.error?.message || "zápis se nezdařil"}`)
        }

        baseline.current = stored
        bump()
        setBusy(false)

        if (refused.length) {
            setFailure(refused.join(" · "))
            return
        }
        onSaved?.(changed.length)
    }, [buffer, bump, changed, doc, lang, onSaved, saver])

    if (loading && !buffer) {
        return (
            <div className={styles.setLoading}>
                <Spinner size={20} />
            </div>
        )
    }
    if (error) return <ErrorState error={error} onRetry={reload} />
    if (!doc) {
        return (
            <p className={styles.setProblem}>
                Povrch „{surface?.title || surface?.name}" ukazuje na blok „{key}", který v obsahu není. Buď
                se přejmenoval, nebo ještě nevznikl — „copy" u defineSurface musí sedět na „key" dokumentu.
            </p>
        )
    }
    if (!type) {
        return <p className={styles.setProblem}>Typ „{doc.type}" není v tomto sezení znám.</p>
    }
    if (!buffer) return null

    return (
        <div className={styles.setPane}>
            {locked.length ? (
                <p className={styles.setNote}>
                    Překládáte do jazyka <strong>{lang}</strong>.{" "}
                    {locked.map((field) => field.title || field.name).join(", ")}{" "}
                    {locked.length === 1 ? "se nepřekládá a je zamčené" : "se nepřekládají a jsou zamčené"} — mají
                    jednu hodnotu pro všechny jazyky. Upravit je jde ve výchozím jazyce.
                </p>
            ) : null}

            {failure ? <p className={styles.setProblem}>{failure}</p> : null}

            <div className={styles.docForm}>
                <div className={styles.listForm}>
                    {(type.fields || []).map((field) => (
                        <FieldRenderer
                            key={field.name}
                            field={field}
                            value={buffer[field.name]}
                            path={field.name}
                            errors={validation.errors}
                            doc={buffer}
                            readOnly={lockedNames.has(field.name)}
                            onChange={(value) => update(field.name, value)}
                        />
                    ))}
                </div>
            </div>

            <div className={styles.setFoot}>
                <span className={styles.setCount}>
                    {changed.length
                        ? `Změněno: ${changed.length} ${changed.length === 1 ? "pole" : "polí"} · `
                        : ""}
                    Ukládá se jako koncept — na web to nepustí.
                </span>
                <span className={styles.grow} />
                <Button variant="ghost" size="sm" onClick={onClose}>
                    Zavřít
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    loading={busy}
                    disabled={!changed.length || !validation.ok}
                    onClick={submit}
                >
                    Uložit
                </Button>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ lookup -- */

/**
 * Dokument podle `key`, protože povrch zná klíč a ne `id`.
 *
 * Hledá se plnotextově a teprve pak se porovnává přesně. Filtr `{ key }` by mířil
 * na `data->>key`, tedy na publikovaný obsah — dokument, který ještě nikdy
 * nevyšel, má klíč jenom v `draft` a filtr by ho minul. `search_text` je
 * generovaný z obojího (viz migrations/0001), takže tahle cesta najde i blok,
 * který někdo právě založil.
 *
 * Shoda se kontroluje na těle, ne na pořadí výsledků: hledání je `like`, takže
 * „global.cookies" najde i „global.cookies.text", a vzít první řádek by
 * znamenalo otevřít občas jiný blok, než na který povrch ukazuje.
 */
async function documentByKey(port, key) {
    if (!key) return null
    const answer = await port.list({ search: key, perPage: 50 })
    return (answer?.rows || []).find((row) => bodyOf(row)?.key === key) || null
}
