import styles from "./preview.module.scss"

/**
 * The frame itself: a real viewport, scaled.
 *
 * Two boxes, and the split between them is the entire trick.
 *
 * The iframe is given the device's dimensions in CSS pixels and nothing else.
 * That is what `window.innerWidth` reports inside it, what every `@media` rule in
 * src/styles/system answers to, and what `100vw` resolves against — a 390px frame
 * is a 390px browser, not a picture of one.
 *
 * The wrapper is given those dimensions multiplied by the zoom, because a
 * `transform` paints outside the flow: an unscaled parent would keep reserving
 * 1920×1080 for a frame drawn at half that, and the stage would scroll to
 * whitespace. Sizing the wrapper to the painted result is what lets the stage
 * centre the frame and scroll it honestly.
 *
 * `transformOrigin` is the top-left corner rather than the centre so that the
 * scaled box and its wrapper share an origin; centred, the frame would drift out
 * of its own wrapper by half the difference at every zoom that is not 100%.
 */
export default function Stage({ ref, src, width, height, zoom, measured, onLoad }) {
    return (
        <div
            className={styles.frame}
            style={{
                width: `${Math.round(width * zoom)}px`,
                height: `${Math.round(height * zoom)}px`,
                // The stage is measured after the first paint, so the first frame
                // would otherwise be drawn at 1:1 and snap. Hidden, not delayed:
                // the iframe below still mounts and starts loading immediately.
                opacity: measured ? 1 : 0,
            }}
        >
            {src ? (
                <iframe
                    ref={ref}
                    className={styles.frameDoc}
                    src={src}
                    title="Náhled stránky"
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        transform: `scale(${zoom})`,
                    }}
                    onLoad={onLoad}
                />
            ) : null}
        </div>
    )
}
