import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStudioRouter, withQuery } from "../../runtime/navigation.jsx"

import { DOC_ATTR, EDITABLE_SELECTOR } from "../../edit/attrs.js"
import { commitPendingEdit } from "../../edit/overlay/commit.js"
import { announceStudioSurface } from "../../edit/surface.js"
import sheet from "../../edit/overlay/sheet.js"
import site from "../../site/config.js"
import { surfacesOfKind } from "../../site/surfaces.js"

import { DevicePicker, PagePicker, ZoomControls } from "../preview/FrameControls.jsx"
import Stage from "../preview/Stage.jsx"
import { safePath, useFrameSurface } from "../preview/useFrameSurface.js"
import { useCore, usePort, useRevision } from "../context/StudioProvider.jsx"
import { useToast } from "../context/ToastProvider.jsx"
import { hrefs } from "../lib/routes.js"
import { plural } from "../lib/format.js"
import { bodyOf, changedFields, hasUnpublishedChanges, previewOf } from "../lib/documents.js"
import { publishOutcome } from "../lib/publishing.js"
import Icon from "../ui/Icon.jsx"
import { Button, IconButton } from "../ui/controls.jsx"
import { Modal } from "../ui/Modal.jsx"
import { ErrorState, Spinner } from "../ui/feedback.jsx"
import preview from "../preview/preview.module.scss"
import styles from "./EditView.module.scss"

// Popup povrchu, ve vlastním kusu balíčku. Tentýž důvod, proč ho takhle načítá
// i překryv (viz Overlay.jsx): táhne s sebou poskytovatele Studia, všechny
// vstupy polí a knihovnu médií, a většina sezení v „Upravit kontent" je klikání
// po stránce, které ho nikdy neotevře.
const SurfacePopup = dynamic(() => import("../../edit/overlay/Popup.jsx"), { ssr: false })

/**
 * Upravit kontent — the page, editable, with the Studio around it.
 *
 * ---------------------------------------------------------------------------
 * Why this is not the preview with a different heading
 *
 * `/studio/preview` answers "what does this look like". It takes the whole
 * viewport for exactly that reason: the widest possible stage, its own bar, its
 * own rail, and a way back out. This answers "change this", which is a job an
 * editor does inside the workspace, next to the queue and the document list they
 * came from — so it is a Studio view with the Studio's sidebar and top bar, as
 * asked, and leaving it is one click on any other row.
 *
 * Everything below the chrome is `useFrameSurface`, the same hook the preview
 * uses: the same iframe at the device's real dimensions, the same zoom, the same
 * overlay mounted into the frame from the host's bundle. Two chromes, one frame.
 *
 * ---------------------------------------------------------------------------
 * Where the controls went, and why
 *
 * The preview has a left rail listing the site's pages. A second vertical rail
 * beside the Studio's sidebar would spend about 440px of a screen whose entire
 * purpose is the page in the middle of it — and the two rails would be answering
 * the same kind of question ("where am I") in two different shapes. So the rail
 * becomes one native `<select>` in the toolbar, grouped exactly the way the rail
 * groups: the eight pages that are the site, then `/reviews` folded into an
 * optgroup. Same information, same order, one control, no second rail.
 *
 * The device presets and the zoom stay a toolbar away, where they are in the
 * preview, because they describe how the stage below is drawn and reading them
 * anywhere else would be reading them away from the thing they describe. An
 * editor changing a headline has to be able to check it at 390px, and that is
 * two clicks from here.
 *
 * The draft/published switch does not come across at all, and that is the point
 * of item 5: this surface is always the draft, because writing to anything else
 * is not a thing it can do. A switch that can be left in the wrong position is
 * exactly what a "true editor" must not have — an editor who left it on
 * "Publikováno" would be clicking at a page that cannot show their edits.
 *
 * ---------------------------------------------------------------------------
 * What saving means, said out loud
 *
 * A visual edit is `PATCH /api/cms/documents/:id/field` and it touches `draft`.
 * It cannot touch `data`, `status` or `published_at` — `patchField` has no reach
 * into any of them. So an editor who works here all week and never publishes has
 * changed nothing a visitor can see, which is not obvious from a page that
 * updates as you type: it looks live because it is the real page. Hence the strip
 * under the toolbar, which is on screen the whole time rather than being a toast
 * that has already gone by the time the question occurs to anyone.
 *
 * ---------------------------------------------------------------------------
 * Náhled, and the lock it lets go of
 *
 * Editing is armed, so the framed page does not answer the mouse: `overlay/lock`
 * blocks every pointer event in the capture phase, because a click here means
 * "edit this" and must not also follow a link or fire a magnet. That is correct
 * and it costs the one thing this site is built out of — the page does not move
 * the way a visitor sees it move. *Náhled* is how that is paid back: it takes the
 * overlay down, which releases the lock with it, and the page becomes the page.
 *
 * Two properties it has to hold, and both are the reason it is a toggle here
 * rather than a link to the full-screen preview beside it:
 *
 *   Nothing is dropped. Unmounting the overlay restores whatever a
 *   `contenteditable` was holding, so an edit in progress would vanish. The
 *   toggle commits first and refuses to happen if that commit fails — see
 *   `@/cms/edit/overlay/commit`.
 *
 *   The scroll position survives. `editing` is a parameter of `useFrameSurface`,
 *   so switching it off unmounts the overlay and touches nothing else: same
 *   document, same `src`, no load. Round-tripping through a navigation would put
 *   an editor back at the top of a 550vh timeline, which on this site means
 *   re-scrolling to find the thing they were looking at.
 *
 * ---------------------------------------------------------------------------
 * Publikovat, and the ambiguity it had to resolve first
 *
 * `EDIT-MODE.md` argued against a publish button here: publishing is per
 * document and this surface spans several — the homepage alone is two — so a
 * button would publish a set the editor cannot see the edges of. The ask
 * overrode that, and the argument was never that it is wrong, only that it is
 * ambiguous. So the ambiguity is answered rather than the button dropped:
 *
 *   The set is the page's own. Every annotated element carries `data-cms-doc`,
 *   so the documents this page touches are a `querySelectorAll` away — no
 *   guessing, no "everything with a draft in the CMS".
 *
 *   The edges are shown before anything happens. The confirm step names each
 *   block and the fields in it that differ from what is on the site. This is the
 *   only action in the whole mode that the public can see and the only one
 *   *Zrušit* does not undo, so it is the only one that asks.
 *
 *   The set is only what would actually change. A block whose draft repeats what
 *   is published is not offered, because publishing it would do nothing and
 *   listing it teaches an editor that the confirmation is noise.
 *
 *   Nothing to publish says so. A button that is silently inert reads as broken.
 */

/** How long after a load to keep counting the editable elements. */
const ARM_WINDOW_MS = 4000
const ARM_INTERVAL_MS = 250

/**
 * Tři záložky, tři způsoby, jak se vybírá, co se upravuje. docs/I18N.md §7.2.
 *
 * Stránky jsou dnešní chování: rám na adrese a výběr myší. Modály a seznamy
 * jsou to nové — vybírají se ZE SEZNAMU, protože výběr myší je geometrický
 * (`hitTest` přes `elementsFromPoint`) a co má `display: none`, nemá obdélník
 * a pro překryv neexistuje.
 *
 * Rám zůstává na obrazovce ve všech třech. Nejen kvůli tomu, že přepnutí
 * záložky není důvod ho načítat znovu, ale hlavně kvůli §7.3: komponenta, která
 * si zavolá `useStudioSurface`, se při výběru povrchu OTEVŘE — a to je vidět
 * jenom tehdy, když je na co koukat.
 */
const SURFACE_TABS = [
    { id: "pages", icon: "document", title: "Stránky", hint: "Klikání přímo na stránce v rámu" },
    { id: "modal", icon: "layers", title: "Modály", hint: "Okna, která na stránce nejsou vidět, dokud je něco neotevře" },
    { id: "list", icon: "list", title: "Seznamy", hint: "Accordiony, výběry, časté dotazy" },
]

/**
 * Rady nad rámem se dají zavřít, a natrvalo.
 *
 * Věta „klikněte na text a upravte ho" je užitečná při prvním otevření a od
 * druhého je to řádek, který ubírá výšku stránce v rámu — a výška je tady to
 * jediné, čeho je málo. Zavření se pamatuje v `localStorage`, tedy na prohlížeč,
 * ne na účet: je to preference pohledu, ne obsah, a do databáze nepatří.
 *
 * Každé čtení i zápis je v `try`, protože přístup k úložišti umí rovnou
 * VYHODIT — v anonymním okně, se zakázanými daty webu, v rámu s třetí stranou.
 * Rada, která spadne, by vzala s sebou celou obrazovku editoru, což je přesně
 * obráceně než málo důležitá věc má selhávat.
 */
const ADVICE_STORE = "valecms.studio.advice"

const readAdvice = () => {
    try {
        const raw = window.localStorage.getItem(ADVICE_STORE)
        const parsed = raw ? JSON.parse(raw) : null
        return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
        return {}
    }
}

const useAdvice = () => {
    // Prázdno při prvním renderu, načtení až v efektu: server o `localStorage`
    // neví a jeho HTML by se s klientským nepotkalo. Rada, která zmizí až po
    // hydrataci, je lepší než hydratační chyba.
    const [hidden, setHidden] = useState({})

    useEffect(() => {
        setHidden(readAdvice())
    }, [])

    const dismiss = useCallback((id) => {
        setHidden((prev) => {
            const next = { ...prev, [id]: true }
            try {
                window.localStorage.setItem(ADVICE_STORE, JSON.stringify(next))
            } catch {
                // Nezapsalo se — rada se vrátí po načtení stránky. Zmizet teď
                // je to, oč editor požádal, a to se stalo i tak.
            }
            return next
        })
    }, [])

    return { hidden, dismiss }
}

/** Jeden řádek rady s křížkem. Tón `warn` je pro to, co si žádá pozornost. */
function Advice({ id, icon, tone, onDismiss, children }) {
    return (
        <p className={`${styles.strip} ${tone === "warn" ? styles.stripWarn : ""}`}>
            <Icon name={icon} size={13} className={styles.stripIcon} />
            <span>{children}</span>
            {/* `IconButton`, ne holé <button>. Studio bydlí v shadow rootu
                (styles/ShadowHost.jsx), kam resety stránky nedosáhnou, takže
                nezrušené tlačítko dostane výchozí styl prohlížeče — přesně tak
                se z tohohle křížku stal prázdný šedý čtvereček. Komponenta to
                řeší jednou pro všechna ikonová tlačítka. */}
            <IconButton
                icon="close"
                size={12}
                label="Skrýt tuto radu"
                className={styles.stripClose}
                onClick={() => onDismiss(id)}
            />
        </p>
    )
}

/**
 * One editing session per Studio, refcounted, with the close deferred by a
 * microtask.
 *
 * `reactStrictMode` is on, so in development every mount of this view is "mount,
 * tear down, mount again" — and both halves of that set a cookie on their
 * response. Issued in order, the responses need not arrive in order: a close
 * between the two mounts can land after the second open and switch draft mode
 * back off, leaving a view that frames the published page and has nothing
 * annotated to click. Silent, and only in development, which is the worst
 * combination there is.
 *
 * So a teardown that drops the count to zero waits a microtask, and a remount
 * inside that microtask simply takes the session back — the same arrangement
 * `@/cms/edit/overlay/mount` uses against the same React behaviour.
 */
let sessionRefs = 0
let sessionClosing = false

const openSession = () => {
    sessionRefs += 1
    sessionClosing = false
    return fetch("/api/studio/edit?session=open", { headers: { Accept: "application/json" } })
}

const releaseSession = () => {
    sessionRefs -= 1
    if (sessionRefs > 0) return
    sessionClosing = true
    queueMicrotask(() => {
        if (!sessionClosing) return
        try {
            // `keepalive` is what lets the request outlive the React tree that
            // started it — this usually runs during the navigation that unmounted
            // the view. A draft cookie left behind costs this browser the cached
            // copy of every ISR page on the site; it is not a permission, and a
            // browser that refuses the request leaves it exactly where closing the
            // preview's tab already leaves it.
            fetch("/api/studio/edit?session=close", { keepalive: true })
        } catch {
            /* see above */
        }
    })
}

export default function EditView() {
    const router = useStudioRouter()
    const toast = useToast()

    // Nothing read from the URL may be rendered until this is true. The Studio is
    // client-only, so its subtree is never server-rendered and cannot mismatch —
    // but `router.isReady` is false on the first pass of a catch-all either way,
    // and gating on an effect is the arrangement PreviewHost settled on for a
    // reason that outlives the current mounting strategy.
    const [urlReady, setUrlReady] = useState(false)
    useEffect(() => setUrlReady(true), [])

    // The session: the draft cookie, and the site's page list that comes with it.
    const [session, setSession] = useState({ status: "opening", pages: [], error: null })

    useEffect(() => {
        let live = true

        // `credentials: "same-origin"` is the default, and both cookies this needs
        // — the Studio session going out, draft mode coming back — ride on it.
        openSession()
            .then(async (response) => {
                if (!response.ok) {
                    const body = await response.json().catch(() => null)
                    throw new Error(body?.message || `Server odpověděl ${response.status}`)
                }
                return response.json()
            })
            .then(
                (body) => live && setSession({ status: "open", pages: body.pages || [], error: null }),
                (error) => live && setSession({ status: "failed", pages: [], error }),
            )

        return () => {
            live = false
            releaseSession()
        }
    }, [])

    /**
     * Which page is framed, kept in the Studio's own URL.
     *
     * State would have been simpler and wrong in one way that matters: the back
     * button. An editor who follows a link inside the framed site and wants to go
     * back expects the browser's back button to do it, and `?p=` is what makes
     * that a history entry rather than a way out of the whole view.
     */
    const sitePath = urlReady && router.isReady ? safePath(router.query.p) : null

    const navigate = useCallback(
        (next) => {
            router.replace(withQuery(router.path, { p: next === "/" ? null : next }), {
                shallow: true,
                scroll: false,
            })
        },
        [router],
    )

    /* ------------------------------------------------------------- jazyk -- */

    /**
     * Do kterého jazyka se píše.
     *
     * Seznam jazyků drží databáze (`cms_setting`, klíč `site.languages`,
     * docs/I18N.md §1) a přidávají se v Nastavení. Tady se zatím čte
     * z konfigurace webu, kterou `defineSite` normalizuje do stejného tvaru
     * `{ default, list }` — takže až přijde endpoint, mění se jeden řádek
     * a nic kolem.
     *
     * TODO: nahradit voláním API, až bude.
     *
     * Vypnuté jazyky se nenabízejí. `enabled: false` znamená „nevykresluj",
     * ne „neexistuje" — obsah pod nimi v `cms_document_translation` zůstává,
     * takže smazat je ze seznamu nejde, ale psát do nich nemá smysl.
     */
    const languages = useMemo(
        () => (site?.languages?.list || []).filter((entry) => entry.enabled !== false),
        [],
    )
    const defaultLang = site?.languages?.default || languages[0]?.code || null

    // Neznámý kód v adrese padá na výchozí jazyk. Odkaz se dá poslat
    // a konfigurace se mezitím může změnit; obrazovka, která by kvůli tomu
    // odmítla vzniknout, by z překlepu udělala rozbitý odkaz.
    const asked = urlReady && router.isReady ? String(router.query.lang || "").trim() : ""
    const lang = languages.some((entry) => entry.code === asked) ? asked : defaultLang || ""

    /**
     * Co se přikládá k zápisu — a u výchozího jazyka je to NIC.
     *
     * Výchozí jazyk JE základní řádek `cms_document` (§2), takže zápis bez
     * `lang` do něj míří správně. Posílat ho explicitně by znamenalo založit
     * překladový řádek pro jazyk, jehož obsah už jinde leží, a čtení by pak
     * mělo dvě pravdy o téže větě.
     */
    const writeLang = lang && lang !== defaultLang ? lang : null

    const chooseLanguage = useCallback(
        (code) => {
            // Adresa se skládá VÝHRADNĚ přes `withQuery`, tedy jako řetězec.
            // Objektový tvar `{ pathname, query }` umí jen Pages Router;
            // App Router na něm skončí na `path.startsWith is not a function`
            // — viz runtime/navigation.jsx, kde se to zastavuje s větou.
            router.replace(withQuery(router.path, { lang: code && code !== defaultLang ? code : null }), {
                shallow: true,
                scroll: false,
            })
        },
        [defaultLang, router],
    )

    /* ----------------------------------------------------------- povrchy -- */

    const [tab, setTab] = useState("pages")
    const [openSurface, setOpenSurface] = useState(null)
    const surfaceTab = SURFACE_TABS.find((entry) => entry.id === tab) || SURFACE_TABS[0]
    // Kam se rám vrátí, až editor přepne zpátky na „Stránky". Povrch s vlastním
    // náhledem odvede rám na svou adresu a ta v seznamu stránek není — bez
    // tohohle by se editor vrátil na výchozí stránku, ne na tu svou.
    const pageBefore = useRef(null)
    const { hidden: adviceHidden, dismiss: dismissAdvice } = useAdvice()
    const surfaces = useMemo(() => (tab === "pages" ? [] : surfacesOfKind(site, tab)), [tab])

    // The frame is not pointed anywhere until the session is open, because a
    // frame loaded without the draft cookie renders the published page — which has
    // nothing annotated on it and therefore nothing to click.
    const framed = session.status === "open" ? sitePath : null

    const [bust, setBust] = useState(null)

    /**
     * Náhled, as one boolean.
     *
     * `editing` is the whole of what tells `useFrameSurface` to arm; flipping it
     * unmounts the overlay through the effect's own cleanup and mounts it again
     * on the way back, in the same document, without touching `src`. So the frame
     * does not reload and the scroll position is simply never lost — there is
     * nothing to restore.
     */
    const [previewing, setPreviewing] = useState(false)
    const [toggling, setToggling] = useState(false)
    // Why the last attempt to take Náhled did not happen. On screen until the
    // next attempt: a toast would have faded before the editor finished reading
    // the sentence explaining that their text is still unsaved.
    const [refusal, setRefusal] = useState(null)

    const frame = useFrameSurface({
        sitePath: framed,
        bust,
        onNavigate: navigate,
        editing: !previewing,
        lang: writeLang,
    })

    /**
     * Rámu se řekne, který povrch se zrovna edituje — pro `useStudioSurface`.
     *
     * Jen tudy: hostitel běží v jiném JS realmu než stránka, takže jí příznak
     * nastavit nemůže a jediné, co sdílejí, je DOM rámu (viz edit/surface.js).
     * Komponenta, která si o to řekla, si modál otevře sama; komponenta, která
     * si o to neřekla, se nezmění — a přeložit se dá stejně, protože popup
     * geometrii nepotřebuje.
     *
     * `loadedAt` je v závislostech proto, že nový dokument přijde s čistým
     * `<html>`: po obnovení nebo po prokliku odkazem uvnitř webu by atribut
     * jinak zmizel a modál by se pod otevřeným popupem zavřel.
     */
    useEffect(() => {
        const win = frame.frameRef.current?.contentWindow
        announceStudioSurface(win, openSurface?.name || null)
        return () => announceStudioSurface(win, null)
    }, [frame.frameRef, frame.loadedAt, openSurface])

    const refresh = useCallback(() => {
        frame.captureScroll()
        setBust(Date.now().toString(36))
    }, [frame])

    const editable = useEditableCount(frame.frameRef, frame.loadedAt)
    const audit = useAnnotationAudit(frame.frameRef, frame.loadedAt, sitePath || "/")

    /* ------------------------------------------------------------- náhled -- */

    const togglePreview = useCallback(async () => {
        setRefusal(null)
        if (previewing) {
            setPreviewing(false)
            return
        }
        setToggling(true)
        // The commit runs against the frame that is up right now. Awaiting it
        // before the state change is the whole point: a refusal must leave the
        // overlay — and the text still sitting in it — exactly where they were.
        const result = await commitPendingEdit(frame.frameRef.current?.contentWindow)
        setToggling(false)
        if (!result.ok) {
            setRefusal(result.reason)
            return
        }
        setPreviewing(true)
    }, [previewing, frame.frameRef])

    /* --------------------------------------------------------- publikovat -- */

    const publish = usePublishSet(frame.frameRef, previewing, writeLang)

    return (
        <div className={styles.view}>
            <header className={styles.head}>
                <span className={styles.mark} aria-hidden="true">
                    <Icon name="monitor" size={15} />
                </span>
                <h1 className={styles.title}>Upravit kontent</h1>

                {/* Not a switch — a state, stated. It was the one thing an editor
                    had to know before their first click and the thing that made
                    this surface different from the preview it looks like; now
                    that Náhled can turn editing off in place, it is also the only
                    thing that says which of the two they are currently in. The
                    accent means attention and belongs to the mode that writes. */}
                <span className={`${styles.live} ${previewing ? styles.livePaused : ""}`}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {previewing ? "Náhled konceptu" : "Úpravy zapnuté"}
                </span>

                {/* Also the line break, on a phone held upright: given the whole
                    row it folds the head in the one place a fold says something
                    — what this page is, then what can be done to it. See
                    `.headSpacer`. */}
                <span className={`${preview.spacer} ${styles.headSpacer}`} />

                {/* Counted off the framed document rather than off what the server
                    said it sent. "Nothing is clickable" and "nothing was loaded"
                    look identical on this site — every section falls back to copy
                    hardcoded in its own component — and this is the only number
                    that tells them apart on the page actually on screen. */}
                <span
                    className={`${styles.count} ${editable === 0 ? styles.countZero : ""}`}
                    title="Prvky na této stránce, na které jde kliknout a upravit je"
                >
                    {editable == null
                        ? "…"
                        : plural(editable, "upravitelný prvek", "upravitelné prvky", "upravitelných prvků")}
                </span>

                {/* Only when there is something to say. This is a developer's
                    warning on an editor's screen, and one that appears on every
                    load is one that gets read as chrome — the console carries
                    the detail, this carries the fact that there is any. */}
                {audit ? (
                    <span
                        className={styles.audit}
                        title="Anotace, které míří na pole, jaké stránka nečte nebo typ nemá. Podrobnosti jsou v konzoli."
                    >
                        <Icon name="warning" size={13} />
                        {plural(audit, "vadná anotace", "vadné anotace", "vadných anotací")}
                    </span>
                ) : null}

                {/* Both page-level actions, in the top bar as asked. The device
                    and zoom clusters below describe the stage; these two describe
                    the page, and putting them a row apart is what stops "publish"
                    reading as one more way to look at it. */}
                <button
                    type="button"
                    className={`${preview.chip} ${styles.headAction} ${previewing ? preview.chipOn : ""}`}
                    onClick={togglePreview}
                    aria-pressed={previewing}
                    disabled={toggling || session.status !== "open"}
                    title={
                        previewing
                            ? "Vrátit se k úpravám na stejném místě stránky"
                            : "Vypnout úpravy a projít si koncept s animacemi, jako ho uvidí návštěvník"
                    }
                >
                    <Icon name={previewing ? "eyeOff" : "eye"} size={14} />
                    Náhled
                </button>

                <Button
                    variant="primary"
                    size="sm"
                    icon="upload"
                    className={styles.headAction}
                    onClick={publish.open}
                    loading={publish.state.status === "scanning"}
                    disabled={session.status !== "open"}
                    title="Zveřejnit bloky, které jsou na této stránce a mají koncept"
                >
                    Publikovat
                </Button>
            </header>

            <div className={preview.bar}>
                {/* Přepínač povrchů. Vlevo, před vším ostatním, protože mění
                    význam toho, co je za ním: na „Stránkách" se vybírá adresa,
                    na ostatních záložkách povrch ze seznamu pod barem. */}
                <div className={preview.group}>
                    {/* Ikona se mění s výběrem, protože nativní `option` svou
                        vlastní mít nemůže. Zavřený select tak pořád ukazuje
                        obojí — obrázek i slovo — a to je celá výhoda, kvůli
                        které tu ikona je. */}
                    <Icon
                        name={surfaceTab.icon}
                        size={15}
                        className={preview.groupIcon}
                    />
                    <label className={preview.hidden} htmlFor="edit-surface">
                        Co se upravuje
                    </label>
                    <select
                        id="edit-surface"
                        className={preview.select}
                        value={tab}
                        title={surfaceTab.hint}
                        onChange={(event) => {
                            const next = event.target.value
                            setTab(next)
                            // Popup patří k záložce, ze které se otevřel.
                            // Nechat ho viset nad jiným seznamem znamená
                            // formulář, k němuž na obrazovce nic nevede.
                            setOpenSurface(null)
                            // Zpátky na „Stránky" znamená zpátky na tu stránku,
                            // od které editor odešel — ne na výchozí. Adresa
                            // náhledu povrchu v seznamu stránek není, takže bez
                            // tohohle by výběr stránky ukazoval na nic.
                            if (next === "pages" && pageBefore.current !== null) {
                                navigate(pageBefore.current)
                                pageBefore.current = null
                            }
                        }}
                    >
                        {SURFACE_TABS.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                                {entry.title}
                            </option>
                        ))}
                    </select>
                </div>

                <span className={preview.divider} aria-hidden="true" />

                {/* Výběr stránky jen tam, kde se stránka vybírá. Na záložce
                    modálů by tvrdil, že na tom, která stránka je v rámu, pro
                    tenhle popup záleží — a nezáleží: povrch se čte
                    z konfigurace, ne ze stránky. */}
                {tab === "pages" ? (
                    <PagePicker
                        idPrefix="edit"
                        pages={session.pages}
                        current={sitePath}
                        onNavigate={navigate}
                    />
                ) : null}

                {/* Jazyk jen tam, kde je z čeho vybírat. Web s jedinou češtinou
                    nemá jazykem co přepínat a ovládání, které má jednu možnost,
                    je otázka bez odpovědi. */}
                {languages.length > 1 ? (
                    <div className={preview.group}>
                        {/* `tag` proto, že knihovna ikonu zeměkoule nemá a Icon.jsx si drží
                            jiný agent. Štítek je ze seznamu to nejbližší: jazyk je
                            v tomhle baru značka obsahu, ne místo na mapě. */}
                        <Icon name="tag" size={15} className={preview.groupIcon} />
                        <label className={preview.hidden} htmlFor="edit-lang">
                            Jazyk obsahu
                        </label>
                        <select
                            id="edit-lang"
                            className={preview.select}
                            value={lang}
                            onChange={(event) => chooseLanguage(event.target.value)}
                            title="Do kterého jazyka se ukládají úpravy"
                        >
                            {languages.map((entry) => (
                                <option key={entry.code} value={entry.code}>
                                    {entry.label}
                                    {entry.code === defaultLang ? " (výchozí)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                <span className={preview.divider} aria-hidden="true" />

                <DevicePicker
                    idPrefix="edit"
                    device={frame.device}
                    presetId={frame.presetId}
                    rotated={frame.rotated}
                    custom={frame.custom}
                    onSelectPreset={frame.selectPreset}
                    onCustom={frame.setCustom}
                    onRotate={frame.rotate}
                />

                <span className={preview.divider} aria-hidden="true" />

                <ZoomControls
                    zoom={frame.zoom}
                    fitting={frame.fitting}
                    onZoom={frame.zoomBy}
                    onFit={frame.fit}
                />

                <span className={preview.spacer} />

                {/* A full navigation through the API route, like every other way
                    into the preview: it has to set the draft cookie before the
                    host's own getStaticProps runs. Leaving this way does not run
                    React's cleanup, so the session below is not closed behind it —
                    which is right, because the preview wants the same cookie.

                    Named for what it does rather than "Náhled", which is now the
                    toggle in the row above. Two controls with one name, one of
                    which leaves the view, is a way to lose a session by accident. */}
                <a
                    className={`${preview.chip} ${styles.chipLink}`}
                    href={hrefs.preview({ mode: "draft", page: sitePath })}
                    title="Otevřít stejnou stránku v náhledu přes celé okno"
                >
                    <Icon name="external" size={14} />
                    Otevřít v okně
                </a>

                <button
                    type="button"
                    className={preview.icon}
                    onClick={refresh}
                    title="Načíst obsah znovu, beze ztráty pozice na stránce"
                    aria-label="Obnovit"
                >
                    <Icon name="refresh" size={15} />
                </button>
            </div>

            {/* What this screen is on a phone, said once rather than discovered.
                The frame below fits a desktop page at a quarter size there and
                tapping a paragraph at that scale is not a thing anyone can do;
                the two actions in the head are, and they are the reason to open
                this on a phone at all. Always rendered, shown by CSS at one
                width — a notice that depends on JavaScript having measured the
                window is a notice the server and the client disagree about. */}
            <p className={styles.stackedNote}>
                <Icon name="info" size={13} />
                <span>
                    Na telefonu je tohle jen náhled — klikací úpravy potřebují větší displej.{" "}
                    <strong>Publikovat</strong> a <strong>Otevřít v okně</strong> fungují i tady.
                </span>
            </p>

            {/* Seznam povrchů. Jen na záložkách, které o povrchách jsou —
                a v jednom řádku nad rámem, ne v postranním sloupci: je to
                výběr, ne navigace, a rám pod ním musí zůstat vidět kvůli
                živému náhledu (§7.3). */}
            {tab !== "pages" ? (
                <div className={styles.surfaces} role="group" aria-label="Povrchy">
                    {surfaces.length ? (
                        surfaces.map((surface) => (
                            <button
                                key={surface.name}
                                type="button"
                                className={`${preview.chip} ${
                                    openSurface?.name === surface.name ? preview.chipOn : ""
                                }`}
                                aria-pressed={openSurface?.name === surface.name}
                                onClick={() => {
                                    // Dvě cesty, jedno tlačítko. Povrch s vlastní
                                    // adresou se ukáže v rámu jako komponenta
                                    // a upravuje se klikáním do ní; povrch bez ní
                                    // otevře formulář, protože není kam přepnout.
                                    if (surface.preview) {
                                        if (pageBefore.current === null) pageBefore.current = sitePath
                                        setOpenSurface(surface)
                                        navigate(surface.preview)
                                        return
                                    }
                                    setOpenSurface(surface)
                                }}
                                title={
                                    surface.preview
                                        ? `Ukázat „${surface.title}" v rámu a upravovat klikáním`
                                        : `Upravit texty povrchu „${surface.title}" (blok ${surface.copy})`
                                }
                            >
                                <Icon name={tab === "modal" ? "layers" : "list"} size={14} />
                                {surface.title}
                            </button>
                        ))
                    ) : (
                        // Prázdno se vysvětluje, ne mlčí: chybějící povrch není
                        // porucha Studia, je to nenapsaná konfigurace, a tohle
                        // je jediné místo, kde se to dá říct tomu, kdo se diví.
                        <p className={styles.surfacesEmpty}>
                            <Icon name="info" size={13} />
                            <span>
                                Žádné {tab === "modal" ? "modály" : "seznamy"} nejsou přihlášené.
                                Přidá je <code>defineSurface</code> v konfiguraci webu.
                            </span>
                        </p>
                    )}
                </div>
            ) : null}

            {/* Co znamená vybraný jazyk, řečeno tam, kde se pracuje.
                Nejdůležitější je druhá věta: rám ukazuje výchozí jazyk i po
                přepnutí, protože překlady se do stránek dostanou až publikací
                a nasazením (§1). Bez toho by to vypadalo, že se zápis neuložil. */}
            {writeLang && !adviceHidden.lang ? (
                <Advice id="lang" icon="tag" tone="warn" onDismiss={dismissAdvice}>
                    Úpravy se ukládají do jazyka{" "}
                    <strong>
                        {languages.find((entry) => entry.code === writeLang)?.label || writeLang}
                    </strong>
                    . Stránka v rámu zůstává ve výchozím jazyce — přeložený text se na webu objeví
                    až po publikaci a nasazení. Pole, která se nepřekládají, zápis odmítne
                    a řekne proč.
                </Advice>
            ) : null}

            {/* One line, always on screen, saying which of the two states the
                page below is in and what that means. The refusal replaces it
                rather than sitting beside it: an editor whose Náhled did not
                happen needs the reason where they were already looking. */}
            {refusal ? (
                <p className={`${styles.strip} ${styles.stripWarn}`} role="alert">
                    <Icon name="warning" size={13} className={styles.stripIcon} />
                    <span>{refusal}</span>
                </p>
            ) : previewing ? (
                // Zavíratelné až odtud dolů. Odmítnutí nahoře křížek nemá
                // schválně: to není rada, kterou si editor přečte a pak ji zná,
                // ale stav, ve kterém jeho text pořád leží jen ve stránce.
                adviceHidden.preview ? null : (
                    <Advice id="preview" icon="eye" onDismiss={dismissAdvice}>
                        Úpravy jsou vypnuté a stránka se chová přesně jako návštěvníkovi. Vidíte
                        ale <strong>koncept</strong>, ne web — na webu je zatím poslední
                        publikovaná verze.
                    </Advice>
                )
            ) : tab !== "pages" ? (
                // Na povrchové záložce je návod jiný, protože je jiný i způsob
                // výběru. Kdyby tu zůstala věta o klikání na stránce, mířila by
                // na to jediné, co tady nefunguje: zavřený modál se kliknout
                // nedá, a to je celý důvod, proč tahle záložka existuje.
                adviceHidden.surface ? null : (
                    <Advice id="surface" icon="info" onDismiss={dismissAdvice}>
                        Vyberte {tab === "modal" ? "modál" : "seznam"} v řádku nad stránkou — otevře se
                        formulář s jeho texty. Na stránce se klikat nedá a nemusí:{" "}
                        {tab === "modal" ? "zavřený modál" : "sbalený seznam"} tam žádný prvek nemá.
                        Ukládá se jako <strong>koncept</strong>.
                    </Advice>
                )
            ) : adviceHidden.edit ? null : (
                <Advice id="edit" icon="info" onDismiss={dismissAdvice}>
                    Klikněte na text nebo obrázek a upravte ho přímo na stránce. Změny se
                    ukládají jako <strong>koncept</strong> — na webu se objeví až po
                    publikování. Myš stránky je zatím vypnutá; zapne ji <strong>Náhled</strong>.
                </Advice>
            )}

            <div
                className={`${preview.stage} ${styles.stage}`}
                ref={frame.stageRef}
                data-ready={frame.ready ? "true" : "false"}
            >
                {session.status === "failed" ? (
                    <ErrorState
                        error={session.error}
                        onRetry={() => router.replace(router.path)}
                    />
                ) : session.status === "opening" ? (
                    <span className={styles.booting}>
                        <Spinner size={18} />
                        <span>Připravuji stránku…</span>
                    </span>
                ) : (
                    <Stage
                        ref={frame.frameRef}
                        src={frame.src}
                        width={frame.device.w}
                        height={frame.device.h}
                        zoom={frame.zoom}
                        measured={frame.measured}
                        onLoad={frame.onFrameLoad}
                    />
                )}
            </div>

            {editable === 0 ? (
                <p className={styles.empty}>
                    <Icon name="warning" size={13} />
                    <span>
                        Na této stránce zatím není nic, na co by šlo kliknout. Obsah z CMS čte zatím
                        jen úvodní stránka — ostatní mají texty zapsané v kódu.
                    </span>
                </p>
            ) : null}

            <PublishDialog {...publish} />

            {/* Popup povrchu, tatáž skořápka, jakou otevírá překryv kliknutím
                na stránce — `.root` na zoomu 1 je to, co jí dává pozadí
                a stacking context (viz Overlay.jsx, kde se portáluje sem, do
                Studia). Tady se neportáluje nikam: tenhle strom UŽ ve Studiu
                je, takže by portál byl krok tam a zpátky. */}
            {openSurface && !openSurface.preview ? (
                <div
                    className={sheet.root}
                    style={{ "--cms-zoom": 1, "--cms-inv": 1 }}
                    data-cms-overlay="popup"
                    data-cms-popup="surface"
                >
                    <SurfacePopup
                        kind="surface"
                        surface={openSurface}
                        lang={writeLang}
                        onClose={() => setOpenSurface(null)}
                        onDocSaved={(count) => {
                            setOpenSurface(null)
                            // Popup zmizí, takže potvrzení musí být jinde než
                            // v něm — a musí říct, že je to koncept: tahle
                            // obrazovka na web nic nepouští.
                            toast.success(
                                `Uloženo: ${plural(count, "pole", "pole", "polí")}`,
                                { description: "Jako koncept — na webu se to objeví až po publikování." },
                            )
                        }}
                    />
                </div>
            ) : null}
        </div>
    )
}

/* ========================================================== publikovat == */

/**
 * The documents this page's annotations touch, with the fields that named them.
 *
 * `data-cms-doc` is on every annotated element and on nothing else, so the set
 * is read off the framed document rather than assembled from what the server
 * said it sent. That matters here more than it does for the count: a publish
 * built from "everything of this type with a draft" would put a block from
 * another page in front of the public, and the editor would have no way to see
 * that it had.
 *
 * What it does NOT do any more is decide which fields to name. It used to
 * return every annotated path on the element, changed or not, and the dialog
 * printed them as the block's "changed fields" — so a typo fix in one heading
 * confirmed a list of six documents naming fields nobody had touched. Which
 * documents are on the page is a question only the page can answer; what
 * changed in them is a question only the two bodies can answer, and
 * `changedFields` asks it.
 */
function annotatedDocs(frameWindow) {
    const doc = frameWindow?.document
    if (!doc) return []

    const found = new Set()
    for (const element of doc.querySelectorAll(`[${DOC_ATTR}]`)) {
        const id = element.getAttribute(DOC_ATTR)
        if (id) found.add(id)
    }
    return [...found]
}

/**
 * Publikovat, as a state machine with four answers and no fifth.
 *
 *   scanning    reading the page's documents, one `get` each
 *   ready       there are drafts; here they are, by name
 *   empty       there are none — said out loud rather than left inert
 *   failed      a scan or a publish did not work; the reason is on screen,
 *               including the field-level one, which is the interesting case
 *
 * That last one is not hypothetical. Validation runs on publish and not on
 * `patchField`, so a field can be saved and then refuse to go live — an editor
 * who empties a required headline gets a clean "Uloženo" and a publish that
 * cannot happen. Swallowing that would be the worst kind of silence, because the
 * page on screen would look exactly like a published one.
 */
function usePublishSet(frameRef, previewing, lang = null) {
    const port = usePort()
    const core = useCore()
    const toast = useToast()
    const { bump } = useRevision()

    const [state, setState] = useState({ status: "idle", blocks: [], error: null })

    const close = useCallback(() => setState({ status: "idle", blocks: [], error: null }), [])

    const open = useCallback(async () => {
        setState({ status: "scanning", blocks: [], error: null })
        try {
            const annotated = annotatedDocs(frameRef.current?.contentWindow)
            const loaded = await Promise.all(
                annotated.map(async (id) => ({ id, document: await port.get({ id }) })),
            )
            // The test is that the draft SAYS SOMETHING ELSE, not that a draft
            // row exists. Those two differed on a tenth of the store — 10 of 43
            // drafts were identical to their published body — and this dialog
            // offered every one of them, so a one-word typo fix asked an editor
            // to confirm publishing six documents, three of which would have
            // changed nothing at all. A document that has never been published
            // still qualifies: its empty `data` differs from its body, which is
            // exactly "the public has not seen this".
            const drafts = loaded
                .filter((block) => hasUnpublishedChanges(block.document))
                .map((block) => ({
                    ...block,
                    fields: changedFields(block.document),
                    title: previewOf(core.getType(block.document.type), block.document).title,
                    typeTitle: core.getType(block.document.type)?.title || block.document.type,
                    firstPublish: block.document.status !== "published",
                }))
            setState({ status: drafts.length ? "ready" : "empty", blocks: drafts, error: null })
        } catch (error) {
            setState({ status: "failed", blocks: [], error })
        }
    }, [core, frameRef, port])

    const confirm = useCallback(async () => {
        const blocks = state.blocks
        setState((current) => ({ ...current, status: "publishing", error: null }))

        // One at a time, so a failure can name the block it belongs to. Publishing
        // is not a transaction and cannot be made one here; the blocks that went
        // through stay through, and the dialog says which did not.
        const failures = []
        const reports = []
        for (const block of blocks) {
            try {
                // Publikuje se PO JAZYCÍCH (docs/I18N.md §4): bez `lang` jde ven
                // základní řádek, s ním ten překladový. Posílá se odsud, i když
                // `httpDataPort.publish` ho zatím zahazuje — až ho přebere,
                // tohle už bude na svém místě a nikdo ho nebude hledat.
                const published = await port.publish({ id: block.id, lang })
                reports.push(published?.revalidation)
            } catch (error) {
                failures.push({ block, error })
            }
        }

        bump()

        if (failures.length) {
            setState({
                status: "failed",
                blocks: blocks.filter((block) => failures.some((failure) => failure.block.id === block.id)),
                error: null,
                failures,
            })
            return
        }

        // The blocks are published either way; what changes is whether the page
        // an editor is looking at has been re-rendered with them yet. Publishing
        // several blocks of one page produces several reports naming the same
        // routes, and `publishOutcome` folds them into one sentence.
        const outcome = publishOutcome(reports)
        const title = `Publikováno: ${blocks.length}`
        if (outcome.ok) toast.success(title, { description: outcome.description })
        else toast.error(title, { description: outcome.description, duration: 12000 })
        setState({ status: "idle", blocks: [], error: null })
    }, [bump, lang, port, state.blocks, toast])

    return { state, open, close, confirm, previewing }
}

const FIELD_SUMMARY_LIMIT = 4

const fieldSummary = (fields) => {
    const shown = fields.slice(0, FIELD_SUMMARY_LIMIT)
    const rest = fields.length - shown.length
    return `${shown.join(", ")}${rest ? ` a ${plural(rest, "další", "další", "dalších")}` : ""}`
}

const fieldErrors = (error) => (Array.isArray(error?.fields) ? error.fields : [])

const errorText = (error) => String(error?.message || error || "Neznámá chyba")

function PublishDialog({ state, close, confirm, previewing }) {
    const busy = state.status === "publishing"

    if (state.status === "idle" || state.status === "scanning") return null

    if (state.status === "empty") {
        return (
            <Modal
                open
                onClose={close}
                title="Není co publikovat"
                size="sm"
                footer={
                    <Button variant="secondary" onClick={close}>
                        Zavřít
                    </Button>
                }
            >
                <p className={styles.publishNote}>
                    Žádný blok na této stránce nemá úpravy, které by na webu ještě nebyly —
                    všechno, co je tady vidět, už na webu je.
                </p>
            </Modal>
        )
    }

    if (state.status === "failed" && !state.failures) {
        return (
            <Modal
                open
                onClose={close}
                title="Publikování se nezdařilo"
                size="sm"
                footer={
                    <Button variant="secondary" onClick={close}>
                        Zavřít
                    </Button>
                }
            >
                <p className={styles.publishError}>{errorText(state.error)}</p>
            </Modal>
        )
    }

    const failures = state.failures || []

    return (
        <Modal
            open
            onClose={busy ? undefined : close}
            title={failures.length ? "Část se nepublikovala" : "Publikovat tyto bloky?"}
            description={
                failures.length
                    ? "Ostatní bloky jsou na webu. Tyhle server odmítl."
                    : "Zveřejněním se koncept stane tím, co uvidí návštěvníci webu. Je to jediná akce v tomto režimu, kterou Zrušit nevrátí."
            }
            footer={
                <>
                    <Button variant="ghost" onClick={close} disabled={busy}>
                        {failures.length ? "Zavřít" : "Zrušit"}
                    </Button>
                    <Button variant="primary" onClick={confirm} loading={busy}>
                        {failures.length ? "Zkusit znovu" : `Publikovat (${state.blocks.length})`}
                    </Button>
                </>
            }
        >
            <ul className={styles.publishList}>
                {state.blocks.map((block) => {
                    const failure = failures.find((entry) => entry.block.id === block.id)
                    const fields = fieldErrors(failure?.error)
                    return (
                        <li key={block.id} className={styles.publishItem} data-failed={failure ? "true" : "false"}>
                            <span className={styles.publishTitle}>
                                {block.title}
                                {block.firstPublish ? (
                                    <span className={styles.publishFirst}>poprvé</span>
                                ) : null}
                            </span>
                            {/* The fields that actually differ from what is
                                published, capped: a list long enough to wrap
                                three times has stopped being evidence. A block
                                being published for the first time differs in
                                every field it has, which is a list that says
                                nothing the „poprvé" mark above has not already
                                said better — so it gets the mark and no list. */}
                            <span className={styles.publishMeta}>
                                {block.typeTitle}
                                {!block.firstPublish && block.fields.length
                                    ? ` · ${fieldSummary(block.fields)}`
                                    : ""}
                            </span>
                            {failure ? (
                                <span className={styles.publishError}>
                                    {errorText(failure.error)}
                                    {/* The field paths the server refused, verbatim.
                                        Without them "Dokument neprošel validací" is
                                        a dead end — the field is on the page, but
                                        which one is not guessable. */}
                                    {fields.length ? (
                                        <ul className={styles.publishFields}>
                                            {fields.map((entry, index) => (
                                                <li key={`${entry.path}-${index}`}>
                                                    <code>{entry.path || "—"}</code> {entry.message}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </span>
                            ) : null}
                        </li>
                    )
                })}
            </ul>

            {previewing && !failures.length ? (
                <p className={styles.publishNote}>
                    Náhled zůstane na konceptu — po publikování je to ale už totéž, co je na webu.
                </p>
            ) : null}
        </Modal>
    )
}

/**
 * Does every annotation on the framed page still point at something?
 *
 * ---------------------------------------------------------------------------
 * Why here and not in the site layer
 *
 * The check needs an annotation and the configuration in the same place, and
 * there is exactly one such place. A `data-cms-*` attribute does not exist
 * during any server render — `editable()` is armed from an effect, which is what
 * keeps it out of public HTML by construction (see `@/cms/edit/mode`) — so the
 * site layer never sees one, and a check there could only re-derive what a
 * component *ought* to be annotating, which is a second statement of the fact
 * that produced the bug in the first place.
 *
 * The framed document has the real attributes, the real document ids and the
 * real stored bodies behind them. This view already reads all three: it counts
 * the annotations above and loads their documents for Publikovat. So the check
 * costs one extra `get` per document on a page an editor opened anyway, and it
 * runs where a developer changing a component is already looking at their work.
 *
 * ---------------------------------------------------------------------------
 * Why it watches rather than reads once
 *
 * Two things add annotations to a page after it has loaded, and both matter
 * here. The attributes themselves appear one render *after* hydration, which is
 * the same reason `useEditableCount` polls; and sections mount when a reader
 * asks for them — /o-nas keeps four history panels behind a held button, which
 * is sixteen annotations that exist only once somebody has scrolled to the foot
 * of the page and opened them. A check that read once would report those as
 * absent rather than as unchecked, which is the quieter half of the same failure
 * it exists to stop.
 *
 * So it re-reads on a slow interval and re-audits only when the set of addresses
 * has actually changed. On a settled page that is one pass over the annotated
 * elements every two seconds and nothing else — next to the overlay's per-frame
 * rect reads it is not measurable — and it means a fast refresh of the component
 * being worked on is re-checked without reloading the frame.
 *
 * ---------------------------------------------------------------------------
 * Development only, and loaded on demand
 *
 * `@/cms/audit` reaches `cms.config.js` and the schemas. It is behind an
 * `import()` inside the NODE_ENV branch so that a production build of the Studio
 * neither downloads nor evaluates any of it, on the same terms the popup and the
 * media library are lazy — most sessions are an editor changing a headline, and
 * this is not for them.
 */
const AUDIT_INTERVAL_MS = 2000

function useAnnotationAudit(frameRef, loadedAt, route) {
    const port = usePort()
    const core = useCore()
    const [findings, setFindings] = useState(0)

    useEffect(() => {
        if (process.env.NODE_ENV === "production") return undefined
        if (!loadedAt) return undefined
        setFindings(0)

        let live = true
        let running = false
        // What was audited last time, as one string. The comparison is against
        // the ADDRESSES rather than against their number: a fast refresh that
        // changes a path leaves the count where it was.
        let audited = null
        let modules = null

        const load = async () => {
            modules = modules || Promise.all([import("../../audit/index.js"), import("../../site/config.js")])
            return modules
        }

        const pass = async () => {
            if (!live || running) return
            let doc
            try {
                doc = frameRef.current?.contentWindow?.document
            } catch {
                // Same-origin by construction; a document mid-navigation can
                // still refuse the read, and the next load brings another window.
                return
            }
            if (!doc) return

            running = true
            try {
                const [audit, site] = await load()
                if (!live) return

                const annotations = audit.fromDocument(doc)
                const signature = annotations
                    .map((entry) => `${entry.doc}|${entry.addresses.map((one) => one.path).join(",")}`)
                    .join(";")
                if (signature === audited) return
                audited = signature
                if (!annotations.length) return

                // One `get` per document, not per annotation: a page names a
                // dozen documents through a hundred elements.
                const ids = [...new Set(annotations.map((entry) => entry.doc))]
                const loaded = await Promise.all(
                    ids.map(async (id) => {
                        const document = await port.get({ id }).catch(() => null)
                        if (!document) return [id, null]
                        const body = bodyOf(document)
                        return [id, { type: document.type, key: body.key || null, body }]
                    }),
                )
                if (!live) return

                const documents = new Map(loaded)
                const result = audit.auditPage({
                    route,
                    pages: audit.pagesFor(site.default, route),
                    annotations,
                    documentFor: (id) => documents.get(id) || null,
                    typeFor: (name) => core.getType(name) || null,
                })

                const [head, ...rest] = audit.reportLines({ route, ...result })
                // The head every time the set changes, so a developer can tell a
                // silent check from one that is not running; the findings as
                // warnings, because they are the only part that asks for anything.
                if (result.findings.length) {
                    console.warn(head)
                    for (const line of rest) console.warn(line)
                } else {
                    console.info(head)
                }
                setFindings(result.findings.length)
            } catch {
                // A frame mid-navigation, or a chunk that did not load. Neither
                // is a finding about anybody's annotations.
            } finally {
                running = false
            }
        }

        pass()
        const timer = setInterval(pass, AUDIT_INTERVAL_MS)
        return () => {
            live = false
            clearInterval(timer)
        }
    }, [core, frameRef, loadedAt, port, route])

    return findings
}

/**
 * How many elements on the framed page can be clicked and edited.
 *
 * Polled rather than read once, and the window is the reason. `editable()` emits
 * nothing during the framed page's server render or its first client render —
 * that is what keeps `data-cms-*` out of public HTML by construction (see
 * `@/cms/edit/mode`) — so the attributes appear one render *after* hydration,
 * which is some way after the `load` event this is keyed on. Reading once would
 * report zero on every page and be wrong in the most alarming direction.
 *
 * It stops after a few seconds. There is nothing to watch for afterwards: the
 * count only changes when the document does, and a new document is a new load.
 */
function useEditableCount(frameRef, loadedAt) {
    const [count, setCount] = useState(null)
    const countRef = useRef(null)

    useEffect(() => {
        if (!loadedAt) return undefined
        countRef.current = null
        setCount(null)

        const read = () => {
            let next = null
            try {
                const doc = frameRef.current?.contentWindow?.document
                next = doc ? doc.querySelectorAll(EDITABLE_SELECTOR).length : null
            } catch {
                // Same-origin by construction; a document mid-navigation can still
                // refuse the read, and the next load brings another window.
                next = null
            }
            if (next !== countRef.current) {
                countRef.current = next
                setCount(next)
            }
        }

        read()
        const timer = setInterval(read, ARM_INTERVAL_MS)
        const stop = setTimeout(() => clearInterval(timer), ARM_WINDOW_MS)
        return () => {
            clearInterval(timer)
            clearTimeout(stop)
        }
    }, [frameRef, loadedAt])

    return count
}
