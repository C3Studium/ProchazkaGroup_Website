import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/router"

import DeviceBar from "./DeviceBar"
import PageRail from "./PageRail"
import Stage from "./Stage"
import { safePath, useFrameSurface } from "./useFrameSurface"
import styles from "./preview.module.scss"

/**
 * The device frame around the preview.
 *
 * What changed, and why it had to: the preview used to render the homepage
 * directly into this route and float a panel over it. That is a faithful preview
 * of one viewport — the reviewer's — and it cannot be anything else. Media
 * queries, `vw` and `vh` resolve against the window; a `transform: scale()` on a
 * wrapper makes a page look smaller while every layout decision inside it stays
 * exactly as wide as the browser. An editor checking the phone layout would have
 * been looking at the desktop one, shrunk.
 *
 * So the page runs in an iframe that is genuinely the device's size and is scaled
 * to fit the space, which is how devtools does it and for the same reason. The
 * cost that was raised against this in SPEC.md — two live WebGL contexts — is not
 * paid: the host hides the site chrome underneath it (see preview.module.scss),
 * the shader's IntersectionObserver reports no intersection, and
 * react-three-fiber drops that canvas to `frameloop: "demand"`. One canvas
 * renders. It is the one in the frame.
 *
 * Everything the old panel did survives, moved rather than rewritten: the
 * draft/published switch, the counts of what actually loaded, the way back to the
 * document an editor came from, and a refresh that does not throw away the scroll
 * position it took 550vh to reach.
 *
 * The frame, the device emulation, the zoom and the overlay mount are no longer
 * in this file — they are `useFrameSurface`, shared with `/studio/edit`. What is
 * left is this surface's chrome and the two things only it has: a page kept in
 * its own URL so the draft/published switch can land on it again, and a refresh
 * that re-runs this route's getStaticProps.
 */

export default function PreviewHost({ mode, generatedAt, sources, pages }) {
    const router = useRouter()

    // Nothing read from the URL may be rendered until this is true. `isReady` is
    // not enough on its own: on a static route with no dynamic segment it is
    // already `true` during the first client render but `false` on the server, so
    // deriving from it directly renders one thing on the server and another in the
    // markup React hydrates against — a mismatch, and in dev an error overlay that
    // covers the stage and eats clicks aimed at the iframe. An effect cannot run on
    // the server, so gating on one makes the two passes agree by construction.
    const [urlReady, setUrlReady] = useState(false)
    useEffect(() => setUrlReady(true), [])

    // Which document the editor came from. It arrives in the URL and is therefore
    // only known after hydration — this is a static route, so getStaticProps never
    // sees a query — which costs one frame without the source row and beats
    // threading it through the cookie.
    const from = urlReady ? router.query.from : undefined

    /**
     * Which page is framed.
     *
     * Derived from the URL rather than mirrored into state, so the browser's back
     * button moves between pages of the preview instead of leaving it. `null`
     * until the router is ready *and* the page has mounted: this is a static
     * route, so `query` is empty on the first render, and an iframe rendered then
     * would load the homepage and immediately reload with whatever `?p=` actually
     * said. See `urlReady` above for why `isReady` alone is the wrong gate.
     */
    const sitePath = urlReady && router.isReady ? safePath(router.query.p) : null

    const navigate = useCallback(
        (next) => {
            const query = { ...router.query }
            if (next === "/") delete query.p
            else query.p = next
            router.replace({ pathname: router.pathname, query }, undefined, {
                shallow: true,
                scroll: false,
            })
        },
        [router],
    )

    const frame = useFrameSurface({ sitePath, bust: router.query.r, onNavigate: navigate })

    /**
     * Fresh content without losing your place.
     *
     * One control refreshes both halves, because they are two halves of one
     * answer: `r` re-runs this route's getStaticProps — which is where the counts
     * and the timestamp come from — and the same `r` lands in the iframe's URL,
     * which is what makes the framed page fetch its own props again rather than
     * be served from the router's static-data cache. Draft mode skips that cache
     * anyway; the published side would otherwise answer from whatever the ISR
     * window last produced and look like the refresh had done nothing.
     */
    const refresh = useCallback(() => {
        frame.captureScroll()
        router.replace(
            { pathname: router.pathname, query: { ...router.query, r: Date.now().toString(36) } },
            undefined,
            { scroll: false, shallow: false },
        )
    }, [frame, router])

    /**
     * The host takes the viewport, the way the Studio does.
     *
     * `_app.js` wraps every page in a navbar, a footer, a cursor and a WebGL
     * canvas, and it is not this build's file to edit. The stylesheet hides them
     * (they are hidden rather than covered, so the shader stops burning frames
     * behind an opaque layer and the chrome leaves the tab order); the scroll lock
     * and Lenis are done here, because both must hold in a browser without
     * `:has()` and Lenis drives `window` regardless of what CSS says.
     */
    useEffect(() => {
        const root = document.documentElement
        const previous = { root: root.style.overflow, body: document.body.style.overflow }

        root.style.overflow = "hidden"
        document.body.style.overflow = "hidden"
        root.dataset.studioPreview = "true"
        window.lenis?.stop?.()

        return () => {
            root.style.overflow = previous.root
            document.body.style.overflow = previous.body
            delete root.dataset.studioPreview
            window.lenis?.start?.()
        }
    }, [])

    return (
        <div className={styles.host} data-studio-preview="">
            <DeviceBar
                mode={mode}
                from={from}
                page={sitePath}
                device={frame.device}
                presetId={frame.presetId}
                rotated={frame.rotated}
                custom={frame.custom}
                zoom={frame.zoom}
                fitting={frame.fitting}
                loadedAt={frame.loadedAt}
                generatedAt={generatedAt}
                onSelectPreset={frame.selectPreset}
                onCustom={frame.setCustom}
                onRotate={frame.rotate}
                onZoom={frame.zoomBy}
                onFit={frame.fit}
                onRefresh={refresh}
            />

            <div className={styles.main}>
                <PageRail
                    pages={pages}
                    current={sitePath}
                    from={from}
                    sources={sources}
                    onNavigate={navigate}
                />

                <div className={styles.stage} ref={frame.stageRef} data-ready={frame.ready ? "true" : "false"}>
                    <Stage
                        ref={frame.frameRef}
                        src={frame.src}
                        width={frame.device.w}
                        height={frame.device.h}
                        zoom={frame.zoom}
                        measured={frame.measured}
                        onLoad={frame.onFrameLoad}
                    />
                </div>
            </div>
        </div>
    )
}
