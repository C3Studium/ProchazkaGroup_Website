// One field of one document — resolve it, check it, set it.
//
// This is the whole of Contract C's server half that is not plumbing, and it is
// deliberately a separate module from the port: it is pure, so the two
// properties that matter about the visual save path can be established by
// reading one file and exercised without a database.
//
//   1. A path is resolved against the SCHEMA, not against the body. `items.0.x`
//      is rejected because siteCopy's item has no `x`, not because the body
//      happens not to have one — so a request cannot introduce a key the type
//      does not describe, and `__proto__` is not a special case that had to be
//      remembered, it is a name no schema declares.
//
//   2. The value is validated by the field's own definition before it is set.
//      One field, not the document: a copy tweak must not be blocked because an
//      unrelated field of the same document is half-finished, and publish()
//      validates the whole body again anyway (see adapter.js). That is the
//      division — this gate stops a bad value being stored, the publish gate
//      stops a bad document reaching the public site.
//
// Nothing here knows about drafts. Choosing which column the result is written
// to is the repository's job and it only has one answer; see documents.js.

import { invalid } from './errors.js'
import { getType, validateValue } from './validation.js'

// A field name, as defineField already constrains them.
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/
const INDEX = /^(0|[1-9][0-9]*)$/

// Deep enough for `items.12.label` twice over. A path longer than this is not a
// field an editor clicked, it is something malformed.
const MAX_SEGMENTS = 8

// An editor cannot click the four-thousandth item of a list that renders four
// lines. This is not a schema limit — `max()` rules are — it is a ceiling on
// what a single request can make the array grow to.
const MAX_INDEX = 200

// Names that are properties of Object.prototype rather than of any document.
// Schema resolution below already refuses them (no type declares a field called
// `__proto__`), so this is the belt to that braces: the guard is stated where
// someone auditing the write path will look for it.
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])

export const splitPath = (path) => {
    const raw = String(path ?? '').trim()
    if (!raw) throw invalid('Chybí název pole')

    const segments = raw.split('.')
    if (segments.length > MAX_SEGMENTS) throw invalid(`Cesta k poli je příliš hluboká: ${raw}`)

    for (const segment of segments) {
        if (FORBIDDEN.has(segment)) throw invalid(`Neplatná cesta k poli: ${raw}`)
        if (!NAME.test(segment) && !INDEX.test(segment)) {
            throw invalid(`Neplatná cesta k poli: ${raw}`)
        }
    }
    return segments
}

const isIndex = (segment) => INDEX.test(segment)

// Keys that live INSIDE an asset value rather than being fields of their own.
//
// `image` and `file` hold whatever the media library returned — id, url, width,
// mime — and the schema describes none of it, because none of it is authored.
// One key is: the alt text, which is a sentence a person writes about a
// photograph, and which the overlay offers next to replace and remove.
//
// So `image.alt` is allowed to address it, and exactly that. Anything else
// inside an asset belongs to the library and is not a thing to type over.
const ASSET_TYPES = new Set(['image', 'file'])
const ASSET_KEYS = new Set(['alt'])

/**
 * The field definition a dotted path names, resolved through the type alone.
 *
 * Structural, so it answers for a path whose value does not exist yet — which is
 * the ordinary case for an image an editor is setting for the first time, and
 * for the first item of an empty list.
 *
 * Polymorphic arrays are refused rather than guessed at: picking the right
 * member needs the item's `_type`, which is a fact about the body, and this
 * function has deliberately not looked at one. No type in this project has a
 * polymorphic array, so the refusal is a tripwire for the day one appears.
 */
export const resolveField = (typeName, path) => {
    const segments = Array.isArray(path) ? path : splitPath(path)
    const type = getType(typeName)

    let field = null
    // How far into `segments` the schema reaches. Equal to the length for an
    // ordinary field; one short of it for `image.alt`, where the last segment
    // is a key of the value rather than a field of the type.
    let depth = 0

    for (const segment of segments) {
        if (field && ASSET_TYPES.has(field.type)) {
            if (!ASSET_KEYS.has(segment)) {
                throw invalid(`U souboru "${field.name}" lze upravit jen popisek (alt)`)
            }
            if (depth !== segments.length - 1) {
                throw invalid(`Neplatná cesta k poli: ${segments.join('.')}`)
            }
            return { field, segments, assetKey: segment, depth }
        }

        depth += 1

        if (field === null) {
            field = (type.fields || []).find((entry) => entry.name === segment) || null
        } else if (field.type === 'array') {
            if (!isIndex(segment)) {
                throw invalid(`Pole "${field.name}" je seznam, čekal se index položky`)
            }
            const members = field.members || []
            if (members.length !== 1) {
                throw invalid(`Seznam "${field.name}" má víc typů položek, ty se takto upravit nedají`)
            }
            field = members[0]
        } else if (field.type === 'object') {
            field = (field.fields || []).find((entry) => entry.name === segment) || null
        } else {
            // A scalar with a path continuing past it.
            field = null
        }
        if (!field) throw invalid(`Typ "${typeName}" nemá pole "${segments.join('.')}"`)
    }

    return { field, segments, assetKey: null, depth }
}

const valueAt = (body, segments) =>
    segments.reduce((node, key) => (node == null ? undefined : node[key]), body)

/**
 * Immutable deep set, copying only the nodes on the path.
 *
 * Containers are created when they are missing, because "set the image on a
 * block that has never had one" and "set the image on a block that has one" are
 * the same intent. What it will NOT do is leave a hole in an array — see
 * assertReachable.
 */
const setAt = (target, segments, value) => {
    const [head, ...rest] = segments
    if (head === undefined) return value

    if (isIndex(head)) {
        const list = Array.isArray(target) ? [...target] : []
        list[Number(head)] = rest.length ? setAt(list[Number(head)], rest, value) : value
        return list
    }

    const next = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {}
    next[head] = rest.length ? setAt(next[head], rest, value) : value
    return next
}

/**
 * Every index on the path addresses an existing item, or the one position past
 * the end of its list.
 *
 * The second half is what lets an editor fill in the first line of a block whose
 * `items` is still empty. Anything beyond that would punch a hole — `[a, , , d]`
 * — and a sparse array is a body no form editor can render and no `.map()` on
 * the site survives.
 */
const assertReachable = (body, segments) => {
    for (let i = 0; i < segments.length; i += 1) {
        if (!isIndex(segments[i])) continue
        const index = Number(segments[i])
        if (index > MAX_INDEX) throw invalid(`Index položky je mimo rozsah: ${segments.join('.')}`)

        const list = valueAt(body, segments.slice(0, i))
        const length = Array.isArray(list) ? list.length : 0
        if (index > length) {
            throw invalid(
                `Položka ${index} v "${segments.slice(0, i).join('.') || 'dokumentu'}" neexistuje ` +
                `(seznam má ${length})`
            )
        }
    }
}

/**
 * The body a document should hold after one field of it changed.
 *
 * Pure: takes a body, gives a new one, touches neither the argument nor any
 * database. The caller decides what to do with the result, and there is exactly
 * one caller and one thing it does with it.
 *
 * @param {string} typeName    registered content type
 * @param {object} body        the editable body — `draft ?? data`
 * @param {string} path        dotted field path, e.g. "items.2.label"
 * @param {*}      value       the new value
 * @returns {{ body: object, field: object, segments: string[], previous: * }}
 */
export const patchBody = (typeName, body, path, value) => {
    const base = body && typeof body === 'object' && !Array.isArray(body) ? body : {}
    const { field, segments, assetKey, depth } = resolveField(typeName, path)

    assertReachable(base, segments)

    // What the SCHEMA will be asked about, which is not always what arrived.
    // Editing an alt text changes one key of an asset value; the field the type
    // describes is the asset, so that is the thing validated, holding the value
    // it is about to hold. Anything else — a caption on a photo that is not
    // there — fails as the image field, in the image field's own words.
    const fieldPath = segments.slice(0, depth)
    const current = valueAt(base, fieldPath)
    const fieldValue = assetKey
        ? (current && typeof current === 'object' ? { ...current, [assetKey]: value } : { [assetKey]: value })
        : value

    const result = validateValue(field, fieldValue, {
        path: fieldPath.join('.'),
        document: base,
        // The container the field sits in — what a `custom` rule comparing two
        // fields of the same array item is given. Undefined while the item is
        // being created, which the core reads as an empty parent.
        parent: valueAt(base, fieldPath.slice(0, -1)) ?? {},
    })

    if (!result.ok) {
        throw invalid(result.errors?.[0]?.message || 'Hodnota neprošla validací', result.errors || [])
    }

    return {
        body: setAt(base, segments, value),
        field,
        segments,
        previous: valueAt(base, segments),
    }
}
