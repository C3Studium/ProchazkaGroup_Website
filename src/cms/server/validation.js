// The single import point for Contract 1 (@/cms/core).
//
// Everything else in src/cms/server reaches the core through this file. That
// keeps the coupling to another build's module in one place — when the core's
// surface shifts, one file changes — and it gives tests a single seam to stub.

import { findType, getType, listTypes, validateDocument, validateValue } from '@/cms/core'

import { invalid, notFound } from './errors.js'

export { getType, findType, listTypes, validateValue }

// findType rather than getType: an unknown type name arriving from a request is
// a 404 to answer, not an exception to catch.
export const knownType = (type) => Boolean(findType(type))

export const assertKnownType = (type) => {
    if (!type || typeof type !== 'string') throw invalid('Chybí typ dokumentu')
    if (!knownType(type)) throw notFound(`Neznámý typ dokumentu: ${type}`)
    return type
}

/**
 * Run the core's validation and turn a failure into the CmsError shape the data
 * port promises. `fields` carries the core's dotted paths straight through so
 * the Studio can attach messages to the right inputs.
 */
export const assertValid = (type, body) => {
    const result = validateDocument(type, body)
    if (!result || result.ok) return body
    throw invalid('Dokument neprošel validací', result.errors || [])
}

// Non-throwing variant for the migration's dry-run report, which wants to list
// every problem rather than stop at the first document that has one.
export const collectErrors = (type, body) => {
    try {
        const result = validateDocument(type, body)
        return result && result.ok ? [] : (result?.errors || [{ path: '', message: 'neznámá chyba' }])
    } catch (err) {
        return [{ path: '', message: err.message }]
    }
}
