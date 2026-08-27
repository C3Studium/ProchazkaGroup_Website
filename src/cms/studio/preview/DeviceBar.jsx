import { useRouter } from "next/router"

import { hrefs } from "../lib/routes"
import Icon from "../ui/Icon"
import { DevicePicker, ZoomControls } from "./FrameControls"
import styles from "./preview.module.scss"

/**
 * The bar across the top of the full-screen preview: which device, how large it
 * is drawn, and which version of the content is in it.
 *
 * The device and zoom clusters are shared with `/studio/edit` and live in
 * `FrameControls`. What is left here is what only this surface has: the way out
 * of a host that owns the whole viewport, the draft/published switch, and the
 * stamp saying when the frame last loaded.
 */
export default function DeviceBar({
    mode,
    from,
    page,
    device,
    presetId,
    rotated,
    custom,
    zoom,
    fitting,
    loadedAt,
    generatedAt,
    onSelectPreset,
    onCustom,
    onRotate,
    onZoom,
    onFit,
    onRefresh,
}) {
    const router = useRouter()
    const isDraft = mode === "draft"

    return (
        <header className={styles.bar}>
            {/* Through the exit route, never a next/link: leaving has to clear the
                draft cookie, and a client-side transition would carry it into the
                Studio and on to every page the editor opened afterwards. */}
            <a href={hrefs.previewExit({ from })} className={styles.exit}>
                <Icon name="arrowLeft" size={14} />
                <span>Zpět do Studia</span>
            </a>

            <span className={styles.divider} aria-hidden="true" />

            <DevicePicker
                idPrefix="preview"
                device={device}
                presetId={presetId}
                rotated={rotated}
                custom={custom}
                onSelectPreset={onSelectPreset}
                onCustom={onCustom}
                onRotate={onRotate}
            />

            <span className={styles.divider} aria-hidden="true" />

            <ZoomControls zoom={zoom} fitting={fitting} onZoom={onZoom} onFit={onFit} />

            <span className={styles.spacer} />

            <div className={styles.group}>
                {/* Links, not buttons: each goes through the API route that sets or
                    clears the draft cookie, and only a navigation can reliably
                    apply a cookie to the render that follows it. The page being
                    previewed rides along so switching versions compares like with
                    like instead of dropping the editor back on the homepage. */}
                <div className={styles.modes} role="group" aria-label="Verze obsahu">
                    <a
                        href={hrefs.preview({ mode: "draft", from: router.query.from, page })}
                        className={`${styles.mode} ${isDraft ? styles.modeOn : ""}`}
                        aria-current={isDraft ? "true" : undefined}
                        title="Neuložené i nepublikované úpravy"
                    >
                        Rozpracováno
                    </a>
                    <a
                        href={hrefs.preview({ mode: "published", from: router.query.from, page })}
                        className={`${styles.mode} ${!isDraft ? styles.modeOn : ""}`}
                        aria-current={!isDraft ? "true" : undefined}
                        title="Přesně to, co je teď na webu"
                    >
                        Publikováno
                    </a>
                </div>

                <button
                    type="button"
                    className={styles.icon}
                    onClick={onRefresh}
                    title="Načíst obsah znovu, beze ztráty pozice na stránce"
                    aria-label="Obnovit"
                >
                    <Icon name="refresh" size={15} />
                </button>

                <Stamp at={loadedAt} generatedAt={generatedAt} />
            </div>
        </header>
    )
}

/**
 * When the frame last finished loading.
 *
 * The client's clock, on purpose. The old panel stamped the moment the props were
 * generated on the server and had to format it in an effect to avoid a hydration
 * mismatch; here the value does not exist until a load event has fired in the
 * browser, so there is nothing for the server to have rendered differently. The
 * server's own timestamp is kept on the tooltip, since "when was this content
 * built" is still a fair question — it is just not the one an editor watching a
 * refresh is asking.
 */
function Stamp({ at, generatedAt }) {
    if (!at) return null
    const text = new Date(at).toLocaleTimeString("cs-CZ", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
    return (
        <span className={styles.stamp} title={generatedAt ? `Obsah připraven ${generatedAt}` : undefined}>
            {text}
        </span>
    )
}
