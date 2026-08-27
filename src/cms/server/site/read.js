// Public-site reads — SERVER ONLY.
//
// One primitive, and one rule that the rest of this folder and every component
// downstream is built on: it never throws and it never returns null. A public
// page that 500s because a content system is half-installed is a worse failure
// than a public page showing the copy it shipped with, so an unreachable
// database, an absent table and an empty table all produce the same answer —
// nothing — and every consumer treats "nothing" as "use what you had".
//
// That is not defensive padding. It is the state the site is in right now:
// cms_document does not exist yet, and the day it does the homepage should
// start reading it without a second deploy.

import { createDocumentRepository } from '../documents.js'
import { getAnonClient } from '../supabaseAdmin.js'

// Anon, not service_role, deliberately.
//
// migrations/0001_cms_tables.sql grants anon SELECT on the public column set
// and a policy matching only `status = 'published'` — precisely this read,
// enforced by the database rather than by this file remembering to filter. Two
// consequences worth having: a bug here cannot leak a draft, and the public
// site keeps working in an environment with no SUPABASE_SERVICE_ROLE_KEY,
// which is every environment today.
let repository = null

const documents = () => {
    if (!repository) repository = createDocumentRepository({ client: getAnonClient() })
    return repository
}

// A missing table produces one failure per type per process, not one per
// request. Without this the dev server prints the same PostgREST 404 on every
// reload and the real errors are lost in it.
const reported = new Set()

const report = (type, error) => {
    if (reported.has(type)) return
    reported.add(type)
    console.warn(
        `[cms] "${type}" se nepodařilo načíst, používá se výchozí obsah v kódu: ` +
        `${error?.message || error}`
    )
}

/**
 * Published bodies of one document type, oldest contract first: `data` only,
 * `status = 'published'` only, never `draft`.
 *
 * @returns {Promise<object[]>} the documents' `data` bodies, or `[]`.
 */
export const readPublished = async ({ type, sort, filters, perPage = 50 } = {}) => {
    try {
        const { rows } = await documents().listPublished({ type, sort, filters, perPage })
        return rows
            .map((row) => row?.data)
            .filter((data) => data && typeof data === 'object')
    } catch (error) {
        report(type, error)
        return []
    }
}

/** The single published document of a type, or `null`. */
export const readOnePublished = async (args) => {
    const rows = await readPublished({ ...args, perPage: 1 })
    return rows[0] || null
}

// --- shape normalisers -------------------------------------------------------
// Field values arrive in whichever shape the core accepts on the way in (see
// fieldTypes.js — slug and image are both lenient), so reading them is not a
// property access. Doing it here means no component has to know that.

/** `{ current }` or a bare string -> string. */
export const slugValue = (value) => {
    if (value && typeof value === 'object') return String(value.current ?? '')
    return typeof value === 'string' ? value : ''
}

/** A media asset, a bare URL string, or nothing -> `{ src, alt } | null`. */
export const imageValue = (value, fallbackAlt = '') => {
    if (!value) return null
    if (typeof value === 'string') {
        return value ? { src: value, alt: fallbackAlt } : null
    }
    if (typeof value === 'object' && value.url) {
        return { src: String(value.url), alt: String(value.alt || fallbackAlt) }
    }
    return null
}

export const stringValue = (value, fallback = '') =>
    typeof value === 'string' && value.trim() ? value : fallback

// richText is held as an HTML string (fieldTypes.js), and every consumer on
// the homepage renders prose into a layout that splits it per character or per
// word. Handing those a `<p>` is a bug you only see in the browser, so the
// plain reading is offered alongside the authored one.
export const plainText = (value) =>
    stringValue(value)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|h[1-6]|li)>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        // U+00A0, not a plain space — `&nbsp;` decodes to the character it names.
        // Czech typesetting puts one after every single-letter preposition so a
        // lone "v" cannot end a line, and flattening it here silently undid that
        // on the way to the page.
        .replace(/&nbsp;/g, '\u00a0')
        .replace(/&amp;/g, '&')
        // Collapse whitespace, but a run that contains a non-breaking space
        // collapses TO one: `\s` matches U+00A0, so the obvious `/\s+/g -> ' '`
        // destroys exactly the character the line above just decoded.
        .replace(/\s+/g, (run) => (/[\u00a0\u202f]/.test(run) ? '\u00a0' : ' '))
        .trim()

export const numberValue = (value, fallback = 0) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

/**
 * Where a body carries the id of the row it came from, and the only place that
 * name is spelled.
 *
 * Only `readEditable` attaches it, and only because visual editing needs to
 * name a document in order to write to it. `readPublished` deliberately does
 * not: the public page has nothing to write, and the props of a statically
 * generated page are serialised into its HTML, so an id here would be a
 * database identifier published to every visitor in exchange for nothing.
 *
 * A leading underscore because it is not a field — no schema declares it, the
 * validator never sees it, and `_id` is the shape the Studio's own fixtures
 * already use for the same idea.
 */
export const DOCUMENT_ID = '_id'

export const documentId = (body) => {
    const id = body?.[DOCUMENT_ID]
    return typeof id === 'string' && id ? id : null
}
