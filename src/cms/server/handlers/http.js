// Request/response plumbing shared by the handlers.
//
// The catch-all route turns Next's body parser off (see
// src/pages/api/cms/[...route].js) so that uploads can be read as raw bytes and
// so every body has an explicit size limit rather than the framework default.
// That means JSON parsing lives here.

import { CmsError, invalid, isCmsError, serverError } from '../errors.js'

const JSON_LIMIT = 256 * 1024

export const readRawBody = async (req, limit) => {
    // Refuse before reading anything, when the client has said how big it is.
    // The mid-stream guard below is correct but cannot be *reported*: stopping
    // an upload means destroying the socket, and destroying the socket takes the
    // response with it — the editor sees a dropped connection where the server
    // had a sentence for them. Every browser upload declares Content-Length, so
    // answering that case here is the difference between "Soubor je větší než
    // povolených 8 MB" and nothing at all.
    const declared = Number(req.headers['content-length'])
    if (Number.isFinite(declared) && declared > limit) {
        throw invalid(`Tělo požadavku přesáhlo ${Math.floor(limit / 1024)} kB`)
    }

    const chunks = []
    let size = 0

    for await (const chunk of req) {
        size += chunk.length
        if (size > limit) {
            // Stop reading rather than buffer the rest of a body we have
            // already decided to reject.
            req.destroy()
            throw invalid(`Tělo požadavku přesáhlo ${Math.floor(limit / 1024)} kB`)
        }
        chunks.push(chunk)
    }

    return Buffer.concat(chunks)
}

export const readJson = async (req, limit = JSON_LIMIT) => {
    const buffer = await readRawBody(req, limit)
    if (!buffer.length) return {}
    try {
        const parsed = JSON.parse(buffer.toString('utf8'))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('not an object')
        }
        return parsed
    } catch {
        throw invalid('Tělo požadavku není platný JSON objekt')
    }
}

// The Studio sends `filters` and `sort` as JSON in the query string; anything
// malformed is a client bug, not something to guess at.
export const jsonParam = (value, fallback = undefined) => {
    if (value === undefined || value === '') return fallback
    try {
        return JSON.parse(value)
    } catch {
        throw invalid('Neplatný parametr dotazu')
    }
}

export const sendJson = (res, status, body) => {
    // Nothing under /api/cms is cacheable: authenticated reads must not land in
    // a shared cache, and the public review POST has no representation worth
    // storing.
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.status(status)
    if (body === undefined || body === null) return res.end()
    return res.json(body)
}

export const sendError = (res, err) => {
    const error = isCmsError(err) ? err : serverError()

    // Unexpected failures are logged with their real cause and answered with a
    // generic one. A PostgREST message can name columns and constraints, which
    // is a map of the schema handed to whoever asked.
    if (!isCmsError(err)) {
        console.error('[cms] unhandled error', err)
    }

    return sendJson(res, error.status, error.toJSON())
}

export const methodNotAllowed = (res, allowed) => {
    res.setHeader('Allow', allowed.join(', '))
    return sendError(res, new CmsError('invalid', `Metoda není povolena, použijte ${allowed.join('/')}`))
}
