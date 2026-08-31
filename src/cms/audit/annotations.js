// Every `data-cms-*` on a page, as data — PURE and ISOMORPHIC.
//
// Two ways in, because the two surfaces that ask have different things in hand:
// the Studio holds the framed page's live `Document`, the deliberate scan holds
// a string of server-rendered HTML. Both answer the same shape, so the check
// downstream never learns which one it is looking at.
//
// Nothing here interprets an annotation. It reads the contract's attributes off
// an element and says what was written; whether what was written points at
// anything is ./audit.js's question.

import {
    ACTIONS_ATTR,
    DOC_ATTR,
    FIELD_ATTR,
    HREF_ATTR,
    KIND_ATTR,
    KIND_DOCUMENT,
    TYPE_ATTR,
} from '@/cms/edit/attrs'

/**
 * The addresses one annotation carries, and which attribute each came from.
 *
 * A link is the reason this is a list rather than a string: `editableLink` may
 * name the words and the target, they are two different fields, and an
 * annotation that is right about one of them and wrong about the other is
 * exactly as broken as one that is wrong about both. A whole-document
 * annotation carries none — there is no field, and that is not a defect.
 */
const addressesOf = ({ field, href }) => {
    const out = []
    if (field) out.push({ path: field, attr: FIELD_ATTR })
    if (href) out.push({ path: href, attr: HREF_ATTR })
    return out
}

const annotation = ({ doc, field, href, kind, type, actions, where }) => ({
    doc,
    kind: kind || '',
    type: type || '',
    actions: actions || '',
    addresses: addressesOf({ field, href }),
    // How a person finds the element again. Not a selector — a selector on this
    // site is a class list forty characters long and a scroll timeline that has
    // already moved — but the tag and the first class, which is what the
    // component's JSX says at the annotated line.
    where,
})

/** A short, human way to name the element an annotation is on. */
const placeOf = (tag, className) => {
    const first = String(className || '').trim().split(/\s+/)[0]
    return first ? `<${tag} class="${first}">` : `<${tag}>`
}

/** Every annotated element of a live document, in document order. */
export const fromDocument = (doc) => {
    if (!doc) return []
    const out = []
    for (const element of doc.querySelectorAll(`[${DOC_ATTR}]`)) {
        const id = element.getAttribute(DOC_ATTR)
        if (!id) continue
        out.push(
            annotation({
                doc: id,
                field: element.getAttribute(FIELD_ATTR),
                href: element.getAttribute(HREF_ATTR),
                kind: element.getAttribute(KIND_ATTR),
                type: element.getAttribute(TYPE_ATTR),
                actions: element.getAttribute(ACTIONS_ATTR),
                where: placeOf(element.tagName.toLowerCase(), element.getAttribute('class')),
            }),
        )
    }
    return out
}

// An opening tag that carries the contract's first attribute. `>` cannot appear
// inside a value: React's server renderer escapes it in every attribute it
// writes, which is what makes a regex an honest reader of ITS output and of no
// other.
const OPENING_TAG = new RegExp(`<([a-zA-Z][-\\w]*)((?:\\s[^>]*)?${DOC_ATTR}=[^>]*)>`, 'g')
const ATTRIBUTE = /([-\w:]+)="([^"]*)"/g

/** The same, out of rendered HTML — what the deliberate scan has. */
export const fromHtml = (html) => {
    const out = []
    for (const tag of String(html || '').matchAll(OPENING_TAG)) {
        const attrs = {}
        for (const attribute of tag[2].matchAll(ATTRIBUTE)) attrs[attribute[1]] = attribute[2]
        const id = attrs[DOC_ATTR]
        if (!id) continue
        out.push(
            annotation({
                doc: id,
                field: attrs[FIELD_ATTR],
                href: attrs[HREF_ATTR],
                kind: attrs[KIND_ATTR],
                type: attrs[TYPE_ATTR],
                actions: attrs[ACTIONS_ATTR],
                where: placeOf(tag[1].toLowerCase(), attrs.class),
            }),
        )
    }
    return out
}

/** Is this annotation the whole document rather than a field of one? */
export const isWholeDocument = (entry) => entry.kind === KIND_DOCUMENT || !entry.addresses.length
