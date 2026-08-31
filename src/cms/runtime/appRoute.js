// Obsluhy CMS jako routy App Routeru.
//
// Obsluhy jsou psané proti `(req, res)` z Pages Routeru: `req.method`,
// `req.query`, `res.status().json()`, `res.setHeader()`. App Router dává
// webový `Request` a čeká webovou `Response`. Přepsat kvůli tomu dvanáct
// souborů obsluh by znamenalo dvě verze každé z nich — a ta druhá by byla
// správná do první úpravy.
//
// Překládá se proto rozhraní, ne obsluhy. Tenhle modul postaví z `Request`
// něco, co vypadá jako `req`, posbírá, co obsluha napíše do `res`, a udělá
// z toho `Response`. Obsluhy o App Routeru nevědí a vědět nemusí.
//
// Tři věci nejsou překlad, ale jiná implementace téhož:
//
//   res.revalidate(path)   →  revalidatePath(path) z next/cache
//   res.setDraftMode()     →  draftMode().enable() / .disable()
//   res.setPreviewData()   →  totéž; App Router náhled řeší draft módem
//
// Tenhle soubor sahá na `next/cache` a `next/headers`, které existují jen
// v App Routeru — proto je oddělený a Pages Router ho nikdy neimportuje.

import { revalidatePath } from 'next/cache'
import { cookies, draftMode } from 'next/headers'

/** `a=1; b=2` na objekt. */
const parseCookies = (header) => {
    const out = {}
    for (const part of String(header || '').split(';')) {
        const at = part.indexOf('=')
        if (at < 0) continue
        out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim())
    }
    return out
}

/**
 * `req`, jak ho obsluhy čekají.
 *
 * `query` slévá segmenty cesty s parametry dotazu, protože přesně to dělá Pages
 * Router a obsluhy jsou psané proti tomu. Tělo se nečte dopředu: `readRawBody`
 * iteruje přes `req`, a proud webového požadavku je iterovatelný sám.
 */
const toNodeRequest = (request, params) => {
    const url = new URL(request.url)
    const headers = Object.fromEntries(request.headers.entries())

    const query = { ...Object.fromEntries(url.searchParams), ...(params || {}) }

    const req = {
        method: request.method,
        url: url.pathname + url.search,
        headers,
        query,
        cookies: parseCookies(headers.cookie),
        // Adresu klienta bere rate limiter; za proxy je jediná pravda hlavička.
        socket: { remoteAddress: (headers['x-forwarded-for'] || '').split(',')[0].trim() || null },
        destroy() {},
        [Symbol.asyncIterator]() {
            const body = request.body
            if (!body) return (async function* () {})()
            return body[Symbol.asyncIterator]()
        },
    }
    return req
}

/**
 * `res`, který místo psaní do socketu sbírá.
 *
 * Set-Cookie se drží zvlášť jako seznam: přihlášení posílá víc cookies naráz
 * a hlavičky se stejným jménem se v objektu přepisují.
 */
const createCollector = () => {
    const state = { status: 200, headers: {}, cookies: [], body: null, kind: 'empty' }

    const res = {
        status(code) { state.status = code; return res },
        setHeader(name, value) {
            if (String(name).toLowerCase() === 'set-cookie') {
                state.cookies.push(...[].concat(value))
                return res
            }
            state.headers[name] = value
            return res
        },
        getHeader(name) { return state.headers[name] },
        json(value) { state.body = JSON.stringify(value); state.kind = 'json'; return res },
        send(value) { state.body = value; state.kind = 'raw'; return res },
        end(value) { if (value !== undefined) { state.body = value; state.kind = 'raw' }; return res },
        redirect(location) { state.status = 307; state.headers.Location = location; return res },

        async revalidate(path) { revalidatePath(path) },

        async setDraftMode({ enable } = { enable: true }) {
            const draft = await draftMode()
            if (enable) draft.enable()
            else draft.disable()
        },
        async setPreviewData() { (await draftMode()).enable() },
        async clearPreviewData() { (await draftMode()).disable() },
    }

    return { res, state }
}

const toResponse = (state) => {
    const headers = new Headers()
    for (const [name, value] of Object.entries(state.headers)) headers.set(name, String(value))
    for (const cookie of state.cookies) headers.append('Set-Cookie', cookie)
    if (state.kind === 'json' && !headers.has('content-type')) {
        headers.set('content-type', 'application/json; charset=utf-8')
    }

    const empty = state.body == null || state.status === 204 || state.status === 304
    return new Response(empty ? null : state.body, { status: state.status, headers })
}

/**
 * Obsluha psaná pro Pages Router jako obsluha routy App Routeru.
 *
 *   export const GET = asAppRoute(handleCmsRequest)
 *
 * @param {(req: object, res: object) => Promise<void>} handler
 */
export const asAppRoute = (handler) => async (request, context) => {
    const params = await (context?.params ?? Promise.resolve({}))
    const req = toNodeRequest(request, params)
    const { res, state } = createCollector()

    try {
        await handler(req, res)
    } catch (error) {
        // Obsluhy chyby překládají samy; sem se dostane jen to, co jim uteklo.
        console.error('[cms] neošetřená chyba v obsluze:', error)
        return new Response(JSON.stringify({ error: { code: 'server', message: 'Chyba serveru' } }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        })
    }

    return toResponse(state)
}

export { toNodeRequest }
