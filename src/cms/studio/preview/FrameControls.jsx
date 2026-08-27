import { useEffect, useMemo, useState } from "react"

import Icon from "../ui/Icon"
import { CUSTOM, CUSTOM_LABEL, CUSTOM_LIMITS, GROUPS, ZOOM_MAX, ZOOM_MIN, canRotate } from "./presets"
import styles from "./preview.module.scss"

/**
 * The three control clusters both framed surfaces need: which page, which
 * device, how large it is drawn.
 *
 * They live here rather than in `DeviceBar` because `/studio/edit` needs the same
 * three and none of the rest of that bar — no exit link out of a full-screen
 * host it is not in, no draft/published switch on a surface that is always the
 * draft. Lifting the clusters keeps one copy of the parts that have decisions in
 * them (the native `<select>`, the rotate rule, the zoom readout) and lets each
 * surface arrange them the way its own layout wants.
 *
 * They keep `preview.module.scss`, so the two bars are visibly one system, and
 * the classes in it are plain top-level rules rather than descendants of the
 * preview host — the tokens they read are declared by the Studio's root as well.
 *
 * `idPrefix` exists because a `<label for>` has to point at something unique in
 * the document. The two bars never coexist today; the day one of them is opened
 * inside the other's screen, silently broken labels are the last thing anyone
 * would look for.
 */

/** Which page of the site is framed. Grouped the way the rail groups it. */
export function PagePicker({ pages, current, onNavigate, idPrefix = "frame" }) {
    const { flat, groups } = useMemo(() => split(pages), [pages])
    const known = (pages || []).some((page) => page.path === current)

    return (
        <div className={styles.group}>
            <Icon name="document" size={15} className={styles.groupIcon} />
            <label className={styles.hidden} htmlFor={`${idPrefix}-page`}>
                Stránka
            </label>
            <select
                id={`${idPrefix}-page`}
                className={styles.select}
                value={current || "/"}
                onChange={(event) => onNavigate(event.target.value)}
                disabled={!pages?.length}
            >
                {/* A page the frame reached by following a link inside the site,
                    which is a real place to be and one the list may not hold —
                    /reviews/* is folded into a group and a future route is not in
                    this build at all. Without this row the `<select>` would show
                    the first option and quietly claim the editor is somewhere
                    else. */}
                {!known && current ? <option value={current}>{current}</option> : null}
                {flat.map((page) => (
                    <option key={page.path} value={page.path}>
                        {page.label}
                    </option>
                ))}
                {groups.map((group) => (
                    <optgroup key={group.key} label={`/${group.key}`}>
                        {group.pages.map((page) => (
                            <option key={page.path} value={page.path}>
                                {page.label}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
        </div>
    )
}

/**
 * Which device, how big it is, and the way to turn it.
 *
 * The device list is a native `<select>` with `<optgroup>`s. Thirteen presets in
 * three groups is more than a row of buttons can hold at any width the rest of a
 * bar leaves, and the native control already does grouping, keyboard selection
 * and type-ahead correctly — a custom menu here would be a week of work to arrive
 * back where this starts.
 */
export function DevicePicker({
    device,
    presetId,
    rotated,
    custom,
    onSelectPreset,
    onCustom,
    onRotate,
    idPrefix = "frame",
}) {
    const isCustom = presetId === CUSTOM

    return (
        <div className={styles.group}>
            <Icon
                name={device.kind === "phone" ? "phone" : device.kind === "tablet" ? "tablet" : "monitor"}
                size={15}
                className={styles.groupIcon}
            />
            <label className={styles.hidden} htmlFor={`${idPrefix}-device`}>
                Zařízení
            </label>
            <select
                id={`${idPrefix}-device`}
                className={styles.select}
                value={presetId}
                onChange={(event) => onSelectPreset(event.target.value)}
            >
                {/* Names only. The dimensions are one control to the right and
                    they are the *effective* ones — rotating 390×844 leaves the
                    preset selected and the frame 844 wide, and an option
                    reading "Telefon na výšku — 390×844" beside a readout saying
                    844 × 390 is a bar arguing with itself. One name, one size,
                    and the size is the one that is true. */}
                {GROUPS.map((group) => (
                    <optgroup key={group.kind} label={group.label}>
                        {group.presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                                {preset.label}
                            </option>
                        ))}
                    </optgroup>
                ))}
                <optgroup label="Jiné">
                    <option value={CUSTOM}>{CUSTOM_LABEL}</option>
                </optgroup>
            </select>

            {isCustom ? (
                <span className={styles.sides}>
                    <Side
                        label="Šířka"
                        idPrefix={idPrefix}
                        value={custom?.w}
                        onCommit={(value) => onCustom("w", value)}
                    />
                    <span className={styles.times} aria-hidden="true">
                        ×
                    </span>
                    <Side
                        label="Výška"
                        idPrefix={idPrefix}
                        value={custom?.h}
                        onCommit={(value) => onCustom("h", value)}
                    />
                </span>
            ) : (
                <span className={styles.size}>
                    {device.w}
                    <span className={styles.times}> × </span>
                    {device.h}
                    {rotated ? <span className={styles.turned}> otočeno</span> : null}
                </span>
            )}

            <button
                type="button"
                className={styles.icon}
                onClick={onRotate}
                disabled={!canRotate(device.kind)}
                title={
                    canRotate(device.kind)
                        ? "Otočit — prohodit šířku a výšku"
                        : "Otočení dává smysl u tabletu a telefonu"
                }
                aria-label="Otočit zařízení"
            >
                <Icon name="rotate" size={15} />
            </button>
        </div>
    )
}

/**
 * The zoom, with its percentage always on screen — never behind a hover or a
 * menu. It is the answer to the only question a scaled frame raises: is this
 * layout small, or is it merely drawn small. Without the number, an editor
 * looking at a phone frame at 62% cannot tell a font that is too big from one
 * that is fine.
 */
export function ZoomControls({ zoom, fitting, onZoom, onFit }) {
    const percent = Math.round(zoom * 100)

    return (
        <div className={styles.group}>
            <button
                type="button"
                className={styles.icon}
                onClick={() => onZoom(-1)}
                disabled={zoom <= ZOOM_MIN}
                aria-label="Zmenšit"
                title="Zmenšit"
            >
                <Icon name="zoomOut" size={15} />
            </button>
            {/* Not a label for the buttons beside it — a readout, and the one
                number this whole surface cannot do without. */}
            <output className={styles.zoom} aria-label="Měřítko náhledu">
                {percent} %
            </output>
            <button
                type="button"
                className={styles.icon}
                onClick={() => onZoom(1)}
                disabled={zoom >= ZOOM_MAX}
                aria-label="Zvětšit"
                title="Zvětšit"
            >
                <Icon name="zoomIn" size={15} />
            </button>
            <button
                type="button"
                className={`${styles.chip} ${fitting ? styles.chipOn : ""}`}
                onClick={onFit}
                aria-pressed={fitting}
                title="Přizpůsobit velikosti okna"
            >
                <Icon name="fit" size={14} />
                Přizpůsobit
            </button>
        </div>
    )
}

/**
 * One side of a typed size.
 *
 * Local state while it is being typed, committed on blur and on Enter. Bound
 * straight to the store it would re-scale the frame on every keystroke, so
 * clearing "1280" to type "800" would pass through 128, 12 and 1 — three reflows
 * of a real document, one of them at the minimum width.
 */
function Side({ label, value, onCommit, idPrefix }) {
    const [text, setText] = useState(String(value ?? ""))

    useEffect(() => {
        setText(String(value ?? ""))
    }, [value])

    const commit = () => {
        const parsed = Number(text)
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setText(String(value ?? ""))
            return
        }
        onCommit(parsed)
    }

    return (
        <>
            <label className={styles.hidden} htmlFor={`${idPrefix}-side-${label}`}>
                {label}
            </label>
            <input
                id={`${idPrefix}-side-${label}`}
                className={styles.side}
                type="number"
                inputMode="numeric"
                min={CUSTOM_LIMITS.min}
                max={CUSTOM_LIMITS.max}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur()
                }}
            />
        </>
    )
}

/** Flat pages first, nested routes folded under their first segment. */
export const split = (pages) => {
    const flat = []
    const byGroup = new Map()

    for (const page of pages || []) {
        if (!page.group) {
            flat.push(page)
            continue
        }
        if (!byGroup.has(page.group)) byGroup.set(page.group, [])
        byGroup.get(page.group).push(page)
    }

    return {
        flat,
        groups: [...byGroup.entries()].map(([key, list]) => ({ key, pages: list })),
    }
}
