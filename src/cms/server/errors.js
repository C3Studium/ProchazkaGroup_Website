// CmsError — the single failure type crossing every data-port boundary
// (Contract 2). Pure, no imports: this module is reached from the browser via
// httpDataPort.js as well as from the API handlers, so it must stay free of
// anything server-only.

export const CMS_ERROR_CODES = Object.freeze({
    unauthorized: 'unauthorized',
    forbidden: 'forbidden',
    not_found: 'not_found',
    invalid: 'invalid',
    conflict: 'conflict',
    server: 'server',
})

// HTTP is the wire between the Studio and the handlers, so the mapping lives
// with the codes rather than being re-derived in each handler.
const STATUS_BY_CODE = {
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    invalid: 422,
    conflict: 409,
    server: 500,
}

const CODE_BY_STATUS = {
    400: 'invalid',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    405: 'invalid',
    409: 'conflict',
    413: 'invalid',
    422: 'invalid',
    429: 'conflict',
}

export class CmsError extends Error {
    constructor(code, message, fields) {
        super(message || code)
        this.name = 'CmsError'
        this.code = CMS_ERROR_CODES[code] ? code : 'server'
        if (fields) this.fields = fields
    }

    get status() {
        return STATUS_BY_CODE[this.code] || 500
    }

    toJSON() {
        const body = { error: { code: this.code, message: this.message } }
        if (this.fields) body.error.fields = this.fields
        return body
    }
}

export const unauthorized = (m = 'Přihlaste se prosím') => new CmsError('unauthorized', m)
export const forbidden = (m = 'Nemáte oprávnění') => new CmsError('forbidden', m)
export const notFound = (m = 'Nenalezeno') => new CmsError('not_found', m)
export const invalid = (m = 'Neplatná data', fields) => new CmsError('invalid', m, fields)
export const conflict = (m = 'Konflikt') => new CmsError('conflict', m)
export const serverError = (m = 'Chyba serveru') => new CmsError('server', m)

export const isCmsError = (err) => err instanceof CmsError ||
    (err && typeof err === 'object' && err.name === 'CmsError' && typeof err.code === 'string')

// Rebuild a CmsError from an HTTP response so the Studio catches the same type
// it would have caught from an in-process port.
export const cmsErrorFromResponse = (status, body) => {
    const payload = (body && body.error) || {}
    const code = CMS_ERROR_CODES[payload.code] || CODE_BY_STATUS[status] || 'server'
    return new CmsError(code, payload.message || `HTTP ${status}`, payload.fields)
}

// Postgres error codes that mean something specific to a caller. Anything else
// is a server error and must not leak the driver's message to the client.
export const cmsErrorFromPostgrest = (err, fallback = 'Databázová chyba') => {
    if (!err) return serverError(fallback)
    switch (err.code) {
        case '23505': return conflict('Záznam s tímto klíčem už existuje')
        case '23503': return invalid('Odkazovaný záznam neexistuje')
        case '23514': return invalid('Data neprošla kontrolou databáze')
        case '22P02': return invalid('Neplatný identifikátor')
        case 'PGRST116': return notFound()
        case '42501': return forbidden('Databáze operaci odmítla')
        default: return serverError(fallback)
    }
}
