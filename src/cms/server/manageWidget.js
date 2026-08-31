// The appearance of the "Spravovat web" widget — SERVER ONLY.
//
// One row in cms_setting (migrations/0006), holding four things an owner may
// choose from /studio/settings: whether the widget appears at all, which corner
// it sits in, what colour it is, and whether the page blurs behind it.
//
// ---------------------------------------------------------------------------
// Why this is stored and not baked into the page
// ---------------------------------------------------------------------------
//
// The obvious cheaper shape is to read these four values in `getStaticProps`
// and hand them down as props. It is wrong here, and measurably so: every
// public page is statically generated with ISR, this project has no on-demand
// revalidation of any kind, and the revalidate window is ten minutes. So moving
// the button from one corner to the other would take up to ten minutes per page
// to appear, page by page, in whatever order they happened to be re-rendered —
// which does not read as "slow", it reads as "broken". Fetching them at runtime
// costs one request, made only by a browser that already carries the hint, and
// the change is on screen at the next page load.
//
// ---------------------------------------------------------------------------
// Validation is not politeness here
// ---------------------------------------------------------------------------
//
// `background` ends up in a style on a public page. It is checked against a
// strict hex pattern rather than trimmed and passed through, because "a string
// an owner typed" and "a string that goes into CSS" are the same string, and
// the place to stop that being interesting is the moment it is written. Corner
// is an enum, the other two are booleans, and anything that fails is refused
// with a message rather than coerced — a silently corrected setting is a
// setting that will be set wrong twice.

import { invalid, serverError } from './errors.js'
import { assertServer } from './env.js'
import { getAdminClient } from './supabaseAdmin.js'

const TABLE = 'cms_setting'

/** Stable, written literally here and nowhere else. */
export const MANAGE_WIDGET_KEY = 'manage_widget'

/** The four corners, in the order the settings screen offers them. */
export const CORNERS = ['bottom-left', 'bottom-right', 'top-left', 'top-right']

/**
 * What an untouched deployment looks like: on, bottom-left, the site's own deep
 * ink, blurred. Bottom-left because the site's own sticky buttons live bottom-
 * right (components/common/ui/stickyButtons) and two fixed things in one corner
 * is one too many.
 */
export const MANAGE_WIDGET_DEFAULTS = Object.freeze({
    enabled: true,
    corner: 'bottom-left',
    background: '#0b1a22e6',
    blur: true,
})

// #rgb, #rrggbb, #rrggbbaa. Nothing else — not `rgb()`, not a named colour, not
// a custom property. A colour is the only thing this field is for, and the
// narrowest grammar that expresses one is the one that cannot express anything
// else.
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

const db = () => getAdminClient()

/**
 * Anything -> a valid settings object. Used on the way out of the database as
 * well as on the way in, so a row written by an older version of this file, or
 * edited by hand, cannot put a bad value on a public page.
 */
const coerce = (value) => {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    const corner = CORNERS.includes(source.corner) ? source.corner : MANAGE_WIDGET_DEFAULTS.corner
    const background = HEX.test(String(source.background || ''))
        ? String(source.background).toLowerCase()
        : MANAGE_WIDGET_DEFAULTS.background

    return {
        enabled: typeof source.enabled === 'boolean' ? source.enabled : MANAGE_WIDGET_DEFAULTS.enabled,
        corner,
        background,
        blur: typeof source.blur === 'boolean' ? source.blur : MANAGE_WIDGET_DEFAULTS.blur,
    }
}

/**
 * The same four fields, but refusing what `coerce` would quietly replace.
 * Writes go through this; reads go through `coerce`. The asymmetry is the
 * point — an owner who types `#zzz` is told, and a row that somehow holds it is
 * survived.
 */
const validate = (patch) => {
    const source = patch && typeof patch === 'object' ? patch : {}

    if ('corner' in source && !CORNERS.includes(source.corner)) {
        throw invalid('Neznámý roh', { corner: `Vyberte jeden z: ${CORNERS.join(', ')}` })
    }
    if ('background' in source && !HEX.test(String(source.background || ''))) {
        throw invalid('Barva musí být hex, například #0b1a22 nebo #0b1a22e6', {
            background: 'Neplatná barva',
        })
    }
    for (const flag of ['enabled', 'blur']) {
        if (flag in source && typeof source[flag] !== 'boolean') {
            throw invalid(`Hodnota „${flag}" musí být true nebo false`)
        }
    }

    return coerce({ ...MANAGE_WIDGET_DEFAULTS, ...source })
}

/**
 * The current appearance.
 *
 * A missing row, an unmigrated database, a store that has never held this key,
 * and a store that refuses to run at all all answer with the defaults rather
 * than an error. This is read by a route with no session behind it, and "the
 * widget looks like it does out of the box" is a correct answer to every one of
 * those situations — a 500 on a public route because nobody has opened the
 * settings screen yet would not be.
 *
 * The try/catch is around the whole thing rather than only the query, and the
 * fourth case above is why: measured against a production build with no
 * SUPABASE_SERVICE_ROLE_KEY, `getAdminClient()` THROWS before a query is built
 * (the file store refuses to run in production, fileStore/store.js), so a check
 * on the returned `error` never sees it and the public endpoint answered 500. A
 * deployment in that state is broken and says so loudly elsewhere; it should not
 * additionally break this. The failure is logged so it is not silent.
 */
export const readManageWidget = async () => {
    assertServer('readManageWidget')

    try {
        const { data, error } = await db()
            .from(TABLE)
            .select('value')
            .eq('key', MANAGE_WIDGET_KEY)
            .maybeSingle()

        if (error) throw new Error(error.message)
        return coerce(data?.value)
    } catch (failure) {
        console.warn(`[cms] ${TABLE}/${MANAGE_WIDGET_KEY} nelze přečíst, použity výchozí hodnoty:`, failure.message)
        return { ...MANAGE_WIDGET_DEFAULTS }
    }
}

/**
 * Write it. Owner-only — checked in handlers/widget.js, before this is reached,
 * which is where every other authorisation in this server lives.
 *
 * Select-then-insert-or-update rather than an upsert: the file store implements
 * the verbs the repository actually uses (fileStore/client.js says so, loudly),
 * and adding `upsert` to it for one caller would be a new verb to keep correct
 * in two backends. Two statements against a table with one row per key is not a
 * cost worth a third implementation.
 */
export const writeManageWidget = async (actor, patch) => {
    assertServer('writeManageWidget')

    const value = validate(patch)
    const stamp = { value, updated_by: actor?.id ?? null, updated_at: new Date().toISOString() }

    const existing = await db().from(TABLE).select('key').eq('key', MANAGE_WIDGET_KEY).maybeSingle()
    if (existing.error) throw serverError('Uložení nastavení selhalo')

    const { error } = existing.data
        ? await db().from(TABLE).update(stamp).eq('key', MANAGE_WIDGET_KEY)
        : await db().from(TABLE).insert({ key: MANAGE_WIDGET_KEY, ...stamp })

    if (error) throw serverError('Uložení nastavení selhalo')

    return value
}
