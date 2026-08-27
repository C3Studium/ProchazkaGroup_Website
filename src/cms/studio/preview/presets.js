/**
 * The viewport presets, and where they come from.
 *
 * Not a device catalogue. This project's layout changes at the stops declared in
 * src/styles/system/_breakpoints.scss — width at 400 / 750 / 900 / 1200 / 1300 /
 * 1400 / 1500, height at 320 / 380 / 600 / 1000 — and a preset list that does not
 * straddle those is a list that can show an editor a page which never changes
 * while the site has seven layouts they cannot reach. Every entry below sits on
 * one side or the other of a stop it is there to expose.
 *
 * `932×430` is the one that has to be argued for. _breakpoints.scss:5 warns that
 * a phone held sideways matches the 900px `sm` stop, which is written for
 * tablets, on width alone — the `phs`/`phl` pair with their `max-height: 520px`
 * exists to catch exactly that. The preset is here so the trap is something an
 * editor can look at rather than something the stylesheet talks about.
 *
 * Sizes are CSS pixels of viewport, not of hardware. 430×932 is what a 15 Pro Max
 * reports to `window.innerWidth`, which is the number every media query in the
 * project is compared against.
 */

export const KIND = {
    desktop: "Počítač",
    tablet: "Tablet",
    phone: "Telefon",
}

export const PRESETS = [
    // Above `xl` (1500) and `huge` (1730) is one layout; below `lg` (1400) is
    // another, and `smt`/`mdt` switch off at 1399.98 exactly.
    { id: "monitor", kind: "desktop", label: "Monitor", w: 1920, h: 1080 },
    // 1440×900 is under `xl`, over `lg`, and 900 tall — clear of `lt`'s
    // max-height: 800px, which 1280×800 below is not.
    { id: "laptop", kind: "desktop", label: "Laptop", w: 1440, h: 900 },
    { id: "laptop-small", kind: "desktop", label: "Malý laptop", w: 1280, h: 800 },
    // Under `mdt` (1300) and over `md` (1200), 720 tall: the short-laptop case
    // `lt` was written for.
    { id: "laptop-narrow", kind: "desktop", label: "Úzký laptop", w: 1152, h: 720 },

    // 1366 wide clears `mdt` (1300) but not `lg` (1400), and 1024 tall clears
    // `mdt`'s min-height: 950px — the only preset that does.
    { id: "tablet-landscape", kind: "tablet", label: "Tablet na šířku", w: 1366, h: 1024 },
    { id: "tablet-portrait", kind: "tablet", label: "Tablet na výšku", w: 1024, h: 1366 },
    // 1024×768: over `sm` (900), under `md` (1200), and 768 tall — over `smt`'s
    // min-height: 720px, so `smt` applies here and not at 1024×768's portrait twin.
    { id: "tablet-small-landscape", kind: "tablet", label: "Malý tablet na šířku", w: 1024, h: 768 },
    { id: "tablet-small-portrait", kind: "tablet", label: "Malý tablet na výšku", w: 768, h: 1024 },

    { id: "phone-large-portrait", kind: "phone", label: "Velký telefon na výšku", w: 430, h: 932 },
    // The 900px trap, made visible. See the note at the top of this file.
    { id: "phone-large-landscape", kind: "phone", label: "Velký telefon na šířku", w: 932, h: 430 },
    { id: "phone-portrait", kind: "phone", label: "Telefon na výšku", w: 390, h: 844 },
    // 375 is under `xxs`'s 400px; 390 above it. The two phone-portrait presets
    // are on opposite sides of that stop on purpose.
    { id: "phone-small-portrait", kind: "phone", label: "Malý telefon na výšku", w: 375, h: 667 },
    { id: "phone-small-landscape", kind: "phone", label: "Malý telefon na šířku", w: 667, h: 375 },
]

/** Typed sizes. Kept out of PRESETS because it has no fixed dimensions to list. */
export const CUSTOM = "custom"
export const CUSTOM_LABEL = "Vlastní rozměr"

export const CUSTOM_LIMITS = { min: 240, max: 3840 }

export const DEFAULT_PRESET = "laptop"

export const byId = (id) => PRESETS.find((preset) => preset.id === id) || null

/** Presets in the order above, split into the three groups the bar renders. */
export const GROUPS = Object.keys(KIND).map((kind) => ({
    kind,
    label: KIND[kind],
    presets: PRESETS.filter((preset) => preset.kind === kind),
}))

/**
 * Rotation is offered for tablets and phones and withheld from the desktop
 * group, where a 1080×1920 monitor is a real thing but not one this site is
 * designed for, and the control would only ever be an accident.
 */
export const canRotate = (kind) => kind === "tablet" || kind === "phone" || kind === CUSTOM

/**
 * The preset whose dimensions are exactly these, either way round.
 *
 * Used to keep the rotate button honest: half of the presets already have their
 * other orientation in the list, so rotating "Tablet na výšku" should land on
 * "Tablet na šířku" rather than on a second, differently-named 1366×1024.
 */
export const matching = (w, h) => PRESETS.find((preset) => preset.w === w && preset.h === h) || null

/**
 * Zoom stops. Devtools' ladder, which is not arbitrary — the steps are close
 * enough near 100% that a nudge is a nudge, and coarse at the bottom where the
 * question is only "does the whole page fit".
 */
export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2]

export const ZOOM_MIN = ZOOM_STEPS[0]
export const ZOOM_MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1]

/** The next stop past `zoom` in `direction`, or `zoom` if there is none. */
export const stepZoom = (zoom, direction) => {
    const epsilon = 0.001
    if (direction > 0) return ZOOM_STEPS.find((step) => step > zoom + epsilon) ?? ZOOM_MAX
    return [...ZOOM_STEPS].reverse().find((step) => step < zoom - epsilon) ?? ZOOM_MIN
}
