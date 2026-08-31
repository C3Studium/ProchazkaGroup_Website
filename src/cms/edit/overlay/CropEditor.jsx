import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/cms/studio/ui/controls"

import styles from "./sheet"

/**
 * Framing a picture, the way a design tool does it.
 *
 * ---------------------------------------------------------------------------
 * What it edits, and what it does not
 *
 * The rectangle is in the SOURCE image's own pixels, and the source is the
 * ORIGINAL — `asset.source.url` when this picture has been cropped before,
 * otherwise the picture itself. That is the whole reason a frame can be widened
 * after it has been narrowed: the pixels outside the current crop are still
 * there to drag back to.
 *
 * Nothing here writes. It hands a rectangle up and the caller decides what that
 * costs — one request, one library row, and the overlay's own save path for the
 * field. See ImageModule.
 *
 * ---------------------------------------------------------------------------
 * Why dragging does not go through React state
 *
 * The first version called `setRect` on every pointermove. That is a re-render
 * of this whole component per mouse event — the box, the four shading panes,
 * the readout — and on a 5000px portrait it stuttered badly enough to be the
 * first thing anybody said about it.
 *
 * So a drag paints STRAIGHT TO THE DOM: one `requestAnimationFrame` per frame
 * writing five inline styles, no React in the loop. State is committed once, on
 * pointerup, which is the only moment anything else needs to know. `rectRef` is
 * the live value during the gesture; `rect` is what everything outside it
 * reads.
 *
 * The geometry stays in image pixels rather than percentages: the server crops
 * with sharp, which wants integers, and the number under the frame is then the
 * number that is sent.
 */

const ASPECTS = [
    { id: "free", label: "Volný", ratio: null },
    { id: "1:1", label: "1:1", ratio: 1 },
    { id: "4:3", label: "4:3", ratio: 4 / 3 },
    { id: "3:2", label: "3:2", ratio: 3 / 2 },
    { id: "16:9", label: "16:9", ratio: 16 / 9 },
]

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const wholeImage = (natural) => ({ x: 0, y: 0, width: natural.width, height: natural.height })

export default function CropEditor({ asset, busy = false, onCancel, onApply, onReset }) {
    const sourceUrl = asset?.source?.url || asset?.url

    const frameRef = useRef(null)
    const imageRef = useRef(null)
    const boxRef = useRef(null)
    const shadeRefs = useRef([])
    const readoutRef = useRef(null)

    const [natural, setNatural] = useState(null)
    const [rect, setRect] = useState(null)
    const [aspect, setAspect] = useState("free")

    // The live values a drag reads and writes. Kept out of state on purpose —
    // see the note at the top.
    const rectRef = useRef(null)
    const scaleRef = useRef(1)
    const dragRef = useRef(null)
    const frameId = useRef(0)

    /** Where the picture actually ended up, which `object-fit: contain` decides. */
    const measure = useCallback(() => {
        const image = imageRef.current
        if (!image?.naturalWidth) return
        scaleRef.current = image.getBoundingClientRect().width / image.naturalWidth || 1
        paint()
    }, [])

    /** Five inline styles. The only thing a drag does. */
    const paint = useCallback(() => {
        const box = boxRef.current
        const current = rectRef.current
        const scale = scaleRef.current
        const image = imageRef.current
        if (!box || !current || !image) return

        // The picture is centred in the frame, so the box has to be positioned
        // against the picture's own corner rather than the frame's.
        const frame = frameRef.current?.getBoundingClientRect()
        const picture = image.getBoundingClientRect()
        const offsetX = frame ? picture.left - frame.left : 0
        const offsetY = frame ? picture.top - frame.top : 0

        const left = offsetX + current.x * scale
        const top = offsetY + current.y * scale
        const width = current.width * scale
        const height = current.height * scale

        box.style.left = `${left}px`
        box.style.top = `${top}px`
        box.style.width = `${width}px`
        box.style.height = `${height}px`

        const [north, west, east, south] = shadeRefs.current
        if (north) {
            north.style.cssText = `left:0;right:0;top:0;height:${top}px`
            west.style.cssText = `left:0;top:${top}px;width:${left}px;height:${height}px`
            east.style.cssText = `left:${left + width}px;right:0;top:${top}px;height:${height}px`
            south.style.cssText = `left:0;right:0;top:${top + height}px;bottom:0`
        }

        if (readoutRef.current) {
            readoutRef.current.textContent = `${Math.round(current.width)} × ${Math.round(current.height)} px`
        }
    }, [])

    /**
     * Watch the PICTURE, not the frame.
     *
     * The frame has a definite height now, so it never resizes and an observer
     * on it never fires again after the first call. What changes size is the
     * image — it arrives at its natural width and settles to whatever
     * `object-fit: contain` gives it — and the scale every painted pixel is
     * derived from is the image's. Observing the frame left the crop box sized
     * from a measurement taken before the picture had shrunk, which put the
     * bottom handles hundreds of pixels below the frame.
     *
     * The frame is observed too, because the window can be resized.
     */
    useEffect(() => {
        if (typeof ResizeObserver === "undefined") return undefined
        const observer = new ResizeObserver(measure)
        if (imageRef.current) observer.observe(imageRef.current)
        if (frameRef.current) observer.observe(frameRef.current)
        return () => observer.disconnect()
    }, [measure, natural])

    const onImageLoad = useCallback(() => {
        const image = imageRef.current
        if (!image?.naturalWidth) return
        const size = { width: image.naturalWidth, height: image.naturalHeight }
        setNatural(size)
        // A picture that is already cropped opens on its own frame, so the first
        // thing an editor sees is what they chose last time.
        const opening = asset?.crop ? { ...asset.crop } : wholeImage(size)
        rectRef.current = opening
        setRect(opening)
        // NOT `paint()` here. The box is rendered only once `rect` is set, so at
        // this moment `boxRef` is still null and painting writes nowhere — which
        // is exactly why the handles opened collapsed in the middle and only
        // came right after the first drag. The effect below runs after the
        // commit, when there is something to paint on.
    }, [asset])

    /**
     * Paint once the box exists, and again whenever the committed rectangle
     * changes.
     *
     * `requestAnimationFrame` rather than straight away: `onLoad` fires when the
     * image is decoded, and its final laid-out size — which the scale is derived
     * from — is only settled after the browser has done layout. Measuring in the
     * same tick reads the pre-layout width and puts the frame in the wrong place.
     */
    useEffect(() => {
        if (!rect) return undefined
        const id = requestAnimationFrame(measure)
        return () => cancelAnimationFrame(id)
    }, [rect, measure])

    /** Move or resize, in image pixels, kept inside the picture. */
    const compute = useCallback((dxPixels, dyPixels) => {
        const start = dragRef.current
        const size = natural
        if (!start || !size) return null

        const ratio = ASPECTS.find((entry) => entry.id === start.aspect)?.ratio || null
        const base = start.rect

        if (start.handle === "move") {
            return {
                ...base,
                x: clamp(base.x + dxPixels, 0, size.width - base.width),
                y: clamp(base.y + dyPixels, 0, size.height - base.height),
            }
        }

        const right = start.handle.includes("e")
        const bottom = start.handle.includes("s")
        const anchorX = right ? base.x : base.x + base.width
        const anchorY = bottom ? base.y : base.y + base.height

        let width = clamp(
            right ? base.width + dxPixels : base.width - dxPixels,
            24,
            right ? size.width - anchorX : anchorX,
        )
        let height = clamp(
            bottom ? base.height + dyPixels : base.height - dyPixels,
            24,
            bottom ? size.height - anchorY : anchorY,
        )

        if (ratio) {
            if (Math.abs(dxPixels) > Math.abs(dyPixels)) height = width / ratio
            else width = height * ratio

            const maxWidth = right ? size.width - anchorX : anchorX
            const maxHeight = bottom ? size.height - anchorY : anchorY
            if (width > maxWidth) {
                width = maxWidth
                height = width / ratio
            }
            if (height > maxHeight) {
                height = maxHeight
                width = height * ratio
            }
        }

        return {
            width,
            height,
            x: right ? anchorX : anchorX - width,
            y: bottom ? anchorY : anchorY - height,
        }
    }, [natural])

    /**
     * A gesture lives on the WINDOW, not on the frame.
     *
     * The first version put `onPointerMove`/`onPointerUp` on the crop frame and
     * relied on the events bubbling up from the handle. That works right up
     * until the pointer leaves the frame — which it does constantly, because
     * dragging a corner inward means moving toward the middle and dragging it
     * outward means leaving the picture entirely — and it made a corner drag
     * unreliable in a way that looked like the handles were stuck.
     *
     * Listening on the window for the duration of the gesture is the shape that
     * cannot have that problem: once the mouse is down, every move is ours
     * wherever it happens, and the listeners come off on release.
     */
    const gestureRef = useRef(null)

    const startDrag = useCallback(
        (handle) => (event) => {
            if (busy || !rectRef.current) return
            event.preventDefault()
            event.stopPropagation()

            dragRef.current = {
                handle,
                startX: event.clientX,
                startY: event.clientY,
                rect: { ...rectRef.current },
                aspect,
            }

            const move = (moveEvent) => {
                const start = dragRef.current
                const scale = scaleRef.current
                if (!start || !scale) return
                if (frameId.current) return

                const dx = (moveEvent.clientX - start.startX) / scale
                const dy = (moveEvent.clientY - start.startY) / scale

                frameId.current = requestAnimationFrame(() => {
                    frameId.current = 0
                    const next = compute(dx, dy)
                    if (!next) return
                    rectRef.current = next
                    paint()
                })
            }

            const finish = () => {
                window.removeEventListener("pointermove", move)
                window.removeEventListener("pointerup", finish)
                window.removeEventListener("pointercancel", finish)
                gestureRef.current = null
                dragRef.current = null
                if (frameId.current) {
                    cancelAnimationFrame(frameId.current)
                    frameId.current = 0
                }
                // The one commit. Everything outside the gesture reads `rect`.
                const current = rectRef.current
                if (current) {
                    setRect({
                        x: Math.round(current.x),
                        y: Math.round(current.y),
                        width: Math.round(current.width),
                        height: Math.round(current.height),
                    })
                }
            }

            gestureRef.current = finish
            window.addEventListener("pointermove", move)
            window.addEventListener("pointerup", finish)
            window.addEventListener("pointercancel", finish)
        },
        [aspect, busy, compute, paint],
    )

    // A component unmounted mid-drag — the dialog closed with the button held —
    // must not leave two listeners on the window.
    useEffect(() => () => gestureRef.current?.(), [])

    // Choosing a ratio re-shapes the frame at once rather than waiting for the
    // next drag: a preset that appears to do nothing until touched reads as
    // broken.
    const chooseAspect = useCallback(
        (entry) => {
            setAspect(entry.id)
            const current = rectRef.current
            if (!entry.ratio || !current || !natural) return

            let width = current.width
            let height = width / entry.ratio
            if (height > natural.height) {
                height = natural.height
                width = height * entry.ratio
            }
            const next = {
                width: Math.round(width),
                height: Math.round(height),
                x: Math.round(clamp(current.x, 0, natural.width - width)),
                y: Math.round(clamp(current.y, 0, natural.height - height)),
            }
            rectRef.current = next
            setRect(next)
            paint()
        },
        [natural, paint],
    )

    const whole = natural && rect
        ? rect.x === 0 && rect.y === 0 && rect.width === natural.width && rect.height === natural.height
        : true

    return (
        <div className={styles.cropPane}>
            <div
                className={styles.cropFrame}
                ref={frameRef}
            >
                {/* Plain <img>, same reason as the popup's preview: this is
                    chrome pointed at a library URL. */}
                <img ref={imageRef} src={sourceUrl} alt="" onLoad={onImageLoad} draggable={false} />

                {rect ? (
                    <>
                        {/* Four panes rather than one giant shadow: a shadow big
                            enough to cover any frame also covers the buttons. */}
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className={styles.cropShade}
                                ref={(node) => {
                                    shadeRefs.current[index] = node
                                }}
                            />
                        ))}

                        <div className={styles.cropBox} ref={boxRef} onPointerDown={startDrag("move")}>
                            <span className={styles.cropHandle} data-corner="nw" onPointerDown={startDrag("nw")} />
                            <span className={styles.cropHandle} data-corner="ne" onPointerDown={startDrag("ne")} />
                            <span className={styles.cropHandle} data-corner="sw" onPointerDown={startDrag("sw")} />
                            <span className={styles.cropHandle} data-corner="se" onPointerDown={startDrag("se")} />
                        </div>
                    </>
                ) : null}
            </div>

            <div className={styles.cropBar}>
                {ASPECTS.map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        className={styles.cropRatio}
                        data-active={entry.id === aspect ? "true" : undefined}
                        disabled={busy}
                        onClick={() => chooseAspect(entry)}
                    >
                        {entry.label}
                    </button>
                ))}
                <span className={styles.grow} />
                <span className={styles.setCount} ref={readoutRef}>
                    {rect ? `${rect.width} × ${rect.height} px` : "Načítám…"}
                </span>
            </div>

            <div className={styles.setFoot}>
                {asset?.crop ? (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={onReset}>
                        Vrátit originál
                    </Button>
                ) : null}
                <span className={styles.grow} />
                <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
                    Zrušit
                </Button>
                <Button size="sm" disabled={busy || !rect || whole} onClick={() => onApply(rect)}>
                    {busy ? "Ořezávám…" : "Použít ořez"}
                </Button>
            </div>
        </div>
    )
}
