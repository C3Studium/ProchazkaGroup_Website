import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { EDIT_PARAM, EDIT_VALUE, frameUrl, sitePathFromFrame } from "@/cms/preview/frame"
import { mountEditOverlay } from "@/cms/edit/overlay/mount"
import { usePersistedJson } from "../shell/persist"
import { CUSTOM, CUSTOM_LIMITS, DEFAULT_PRESET, byId, matching, stepZoom } from "./presets"

/**
 * The framed page: a real viewport, scaled, with an editor mounted into it.
 *
 * Everything here used to be the body of `PreviewHost`. It moved out the day a
 * second surface needed it — `/studio/edit`, which is the same frame with the
 * Studio's chrome around it instead of the preview's own bar — and it moved
 * rather than being copied for the ordinary reason: the interesting parts of it
 * are the ones nobody would think to copy correctly. The rAF ordering against
 * the frame's own clock, the load handler that refuses to host the admin inside
 * itself, the mount keyed on `loadedAt` so a rail navigation does not stack
 * overlays, the zoom pushed through a ref so it moves the control instead of
 * rebuilding it. A fork of this would be right for a week.
 *
 * What stays with the caller is exactly the chrome: which controls are drawn,
 * where, and what else is on screen beside them. The hook owns the frame, the
 * device, the zoom and the overlay; it owns no pixel of UI.
 *
 * The two callers differ in one more thing, and it is deliberately a parameter
 * rather than a branch in here: where the page being framed and the cache buster
 * come from. The preview keeps both in its own URL because switching
 * draft/published is a real navigation that must land on the same page; the edit
 * view keeps the page in the Studio's URL for the back button and the buster in
 * component state, because it has no server render to re-run.
 */

// Device, rotation and zoom. One key, because they are one choice — see
// usePersistedJson — and one key for *both* surfaces, because it is the same
// choice: which device am I checking this at. The default zoom is "fit", so the
// two stages having different amounts of room resolves itself.
export const VIEW_KEY = "cms.studio.preview.view"

export const DEFAULT_VIEW = {
    preset: DEFAULT_PRESET,
    rotated: false,
    custom: { w: 1280, h: 800 },
    // null is "fit to the space". A number is a zoom the editor asked for and
    // which therefore must not be silently overridden when the window resizes.
    zoom: null,
}

const PAGE_PARAM = /^\/[A-Za-z0-9\-._~/]{0,120}$/

/**
 * The page named by `?p=`, or the homepage.
 *
 * Two filters, and the second one is not cosmetic. `sitePathFromFrame` refuses
 * the Studio's own routes, and the load handler below reacts to a refusal by
 * pointing the frame back at `sitePath` — so a `sitePath` that is itself refused
 * would set the same URL that was just refused, for ever. `?p=/studio/preview` is
 * eighteen characters and would have hung the tab.
 */
export const safePath = (value) => {
    const path = String(value || "/")
    if (!PAGE_PARAM.test(path)) return "/"
    const trimmed = path.replace(/\/+$/, "") || "/"
    return sitePathFromFrame(trimmed) === trimmed ? trimmed : "/"
}

const clampSide = (value) =>
    Math.max(CUSTOM_LIMITS.min, Math.min(CUSTOM_LIMITS.max, Math.round(Number(value) || 0)))

/**
 * @param {object} options
 * @param {string|null} options.sitePath  which page to frame; `null` until the
 *                                        caller knows, which suppresses the iframe
 * @param {string} [options.bust]         cache buster, forwarded into the frame URL
 * @param {function} options.onNavigate   told when the framed document turned out
 *                                        to be a different page than expected
 */
export function useFrameSurface({ sitePath, bust, onNavigate, editing = false }) {
    const [view, setView, viewReady] = usePersistedJson(VIEW_KEY, DEFAULT_VIEW)

    const stageRef = useRef(null)
    const frameRef = useRef(null)
    // Set only by a refresh, read only by the load that follows it. A page change
    // reloads the iframe too and must land at the top, like following a link.
    const pendingScroll = useRef(null)

    const [space, setSpace] = useState({ w: 0, h: 0 })
    const [loadedAt, setLoadedAt] = useState(null)

    // ------------------------------------------------------------ the device --

    const preset = view.preset === CUSTOM ? null : byId(view.preset) || byId(DEFAULT_PRESET)

    const device = useMemo(() => {
        if (!preset) {
            return { w: clampSide(view.custom?.w), h: clampSide(view.custom?.h), kind: CUSTOM }
        }
        return {
            w: view.rotated ? preset.h : preset.w,
            h: view.rotated ? preset.w : preset.h,
            kind: preset.kind,
        }
    }, [preset, view.custom?.w, view.custom?.h, view.rotated])

    /**
     * Rotate, and land somewhere an editor can name.
     *
     * Most of the presets ship both orientations, so swapping 1024×1366 produces
     * dimensions that already have a name — "Tablet na šířku". Selecting that
     * preset rather than showing a second, differently-labelled 1366×1024 keeps
     * the device menu and the frame telling the same story. Only the sizes with
     * no twin in the list (390×844) fall through to a rotated flag.
     */
    const rotate = useCallback(() => {
        if (view.preset === CUSTOM) {
            setView({ custom: { w: clampSide(view.custom?.h), h: clampSide(view.custom?.w) } })
            return
        }
        const twin = matching(device.h, device.w)
        if (twin) setView({ preset: twin.id, rotated: false })
        else setView({ rotated: !view.rotated })
    }, [device.h, device.w, setView, view.custom?.h, view.custom?.w, view.preset, view.rotated])

    const selectPreset = useCallback(
        (id) => setView({ preset: id, rotated: false }),
        [setView],
    )

    const setCustom = useCallback(
        (side, value) => setView((current) => ({ custom: { ...current.custom, [side]: value } })),
        [setView],
    )

    // -------------------------------------------------------------- the zoom --

    useEffect(() => {
        const node = stageRef.current
        if (!node || typeof ResizeObserver === "undefined") return undefined
        const observer = new ResizeObserver(([entry]) => {
            const box = entry.contentRect
            setSpace({ w: box.width, h: box.height })
        })
        observer.observe(node)
        return () => observer.disconnect()
    }, [])

    /**
     * Fit, and never past 1:1.
     *
     * Enlarging a 375px phone to fill a 1400px stage would be a preview of a
     * device nobody has, drawn in soft pixels. Below 100% the scale is a
     * compromise the editor can see the size of, which is what the percentage in
     * the bar is for.
     */
    const fitZoom = useMemo(() => {
        if (!space.w || !space.h) return 1
        return Math.min(1, space.w / device.w, space.h / device.h)
    }, [device.h, device.w, space.h, space.w])

    const fitting = view.zoom == null
    const zoom = fitting ? fitZoom : view.zoom

    const zoomBy = useCallback(
        (direction) => setView({ zoom: stepZoom(zoom, direction) }),
        [setView, zoom],
    )

    const fit = useCallback(() => setView({ zoom: null }), [setView])

    // ------------------------------------------------------------ the frame --

    /**
     * Remember where the page was scrolled to, for the reload the caller is
     * about to cause.
     *
     * Split from the reload itself because the two surfaces reload differently —
     * the preview re-runs its own getStaticProps through the router, the edit
     * view only changes the buster — and neither of them can restore a scroll
     * position, because the framed document owns its own scroll and only the load
     * handler below is on the far side of it.
     */
    const captureScroll = useCallback(() => {
        const win = frameRef.current?.contentWindow
        try {
            pendingScroll.current = win ? win.scrollY || win.document?.documentElement?.scrollTop || 0 : 0
        } catch {
            // Same-origin, so this cannot normally throw; a page mid-navigation
            // can. Refreshing to the top beats not refreshing.
            pendingScroll.current = null
        }
    }, [])

    /**
     * What the iframe does when it has finished loading.
     *
     * Three jobs, and the last two exist because the framed page is the real site
     * with real links in it.
     *
     * Restore the scroll position if this load was a refresh. The framed document
     * owns its own scroll, so a router's `scroll: false` has no meaning here and
     * the position is carried across by hand.
     *
     * Follow the page. Clicking a link in the navbar is a legitimate way to move
     * around and the surrounding UI should say where you are, so the host's URL is
     * updated to match rather than the navigation being fought.
     *
     * Keep the flag on. A link inside the site does not carry `?edit=1`, and a
     * frame that silently stops being editable after one click is worse than one
     * that reloads. Where the page moves too, the re-render already carries the
     * flagged URL; only when the page has not changed does this have to set it.
     */
    const onFrameLoad = useCallback(() => {
        const frame = frameRef.current
        const win = frame?.contentWindow
        setLoadedAt(Date.now())
        if (!win) return

        let location = null
        try {
            location = { pathname: win.location.pathname, search: win.location.search }
        } catch {
            return
        }

        const target = pendingScroll.current
        pendingScroll.current = null
        if (target) {
            win.scrollTo(0, target)
            // Lenis holds its own idea of where the page is; scrolling the window
            // underneath it leaves the two disagreeing until the next wheel event
            // snaps back to the top.
            win.lenis?.scrollTo?.(target, { immediate: true })
        }

        const framed = sitePathFromFrame(location.pathname)
        if (framed === null) {
            // Not a page of the site — /studio, an API route. Neither surface is a
            // browser and neither will host the admin inside itself.
            frame.src = frameUrl(sitePath, { bust })
            return
        }

        if (framed !== sitePath) {
            // The re-render this causes carries the flagged URL, so setting `src`
            // here as well would load the document twice.
            onNavigate(framed)
            return
        }

        const flagged = new URLSearchParams(location.search).get(EDIT_PARAM) === EDIT_VALUE
        if (!flagged) frame.src = frameUrl(framed, { bust })
    }, [bust, onNavigate, sitePath])

    // ---------------------------------------------------------- the overlay --

    /**
     * Editing, mounted into the frame from here.
     *
     * This is the whole of the change that lets editing work on more than the
     * homepage. The framed page is the site's own route and its bundle is the
     * *public* bundle, so there was nowhere inside it to mount an overlay that
     * visitors would not also download. The iframe is same-origin, so the host
     * builds the overlay's DOM in `frame.contentDocument` out of its own bundle
     * instead, and the page is left carrying nothing but the inert attributes
     * `editable()` emits. See @/cms/edit/overlay/mount.
     *
     * **Only the surface that asked for it arms** — `editing`, opt-in. Both used
     * to, because `/studio/preview` was the only host there was and editing was
     * bolted onto it. Now that "Upravit kontent" exists, a preview that also
     * edits is two things: a claim in the docs that is false, and a page an
     * editor can change by clicking while showing the site to a client. So
     * `/studio/preview` is what it says it is, and this is the one line that
     * decides. `VisualSurfaceNotice`'s "Upravit na stránce" was repointed at
     * /studio/edit on the same change; if it ever points back here, the link
     * lands somewhere that cannot do what it offers.
     *
     * Keyed on `loadedAt`, because a new document is exactly what needs a new
     * overlay: changing pages, refreshing and the draft/published switch all
     * arrive as one more load. The mount is idempotent per document and the
     * departing document tears itself down on `pagehide`, so neither roots nor
     * listeners can stack.
     *
     * A link followed *inside* the frame is the case that is not a load at all:
     * the framed page is a Next app, so its own router changes the URL without
     * replacing the document. Nothing needs doing there and nothing is done —
     * the overlay is still mounted, in the same document, and keeps working on
     * whatever the page became.
     *
     * The flag is re-read off the frame rather than assumed, because
     * `onFrameLoad` can answer a load by pointing the frame somewhere else — a
     * document on its way out is not one to mount an editor in.
     */
    const overlayRef = useRef(null)
    const zoomRef = useRef(zoom)

    useEffect(() => {
        if (!editing) return undefined
        if (!loadedAt) return undefined
        const win = frameRef.current?.contentWindow
        if (!win) return undefined

        let flagged = false
        try {
            flagged =
                new URLSearchParams(win.location.search).get(EDIT_PARAM) === EDIT_VALUE &&
                sitePathFromFrame(win.location.pathname) !== null
        } catch {
            // Same-origin by construction; a document mid-navigation can still
            // refuse the read, and there will be another load along shortly.
            return undefined
        }
        if (!flagged) return undefined

        // Read through a ref rather than taken as a dependency: a zoom change
        // must move the control, not rebuild the overlay under an editor's cursor.
        const handle = mountEditOverlay(win, { zoom: zoomRef.current })
        overlayRef.current = handle
        return () => {
            if (overlayRef.current === handle) overlayRef.current = null
            handle.dispose()
        }
    }, [editing, loadedAt])

    /**
     * The zoom, pushed rather than asked for.
     *
     * It used to be a `host {zoom}` message the overlay waited for, with a
     * measurement off `frameElement` standing in until it arrived. Both are gone:
     * this hook *is* the authority on how the frame is drawn, and the overlay it
     * mounted takes the number as a prop. One source, no bootstrap, and nothing
     * that can be half a beat behind the transform on the iframe.
     */
    useEffect(() => {
        zoomRef.current = zoom
        overlayRef.current?.update({ zoom })
    }, [zoom])

    const src = sitePath === null ? null : frameUrl(sitePath, { bust })

    return {
        // the device
        device,
        presetId: view.preset,
        rotated: view.rotated,
        custom: view.custom,
        selectPreset,
        setCustom,
        rotate,
        // the zoom
        zoom,
        fitting,
        zoomBy,
        fit,
        // the frame
        stageRef,
        frameRef,
        src,
        measured: space.w > 0,
        // `false` for the frame between mount and the first read of localStorage,
        // so the frame does not open at the default device and jump to the
        // remembered one a tick later.
        ready: viewReady,
        loadedAt,
        onFrameLoad,
        captureScroll,
    }
}
