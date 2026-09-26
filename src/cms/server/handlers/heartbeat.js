// /api/cms/heartbeat — viz server/heartbeat.js, tam je celé zdůvodnění.
//
// Dosažitelný bez session, protože cron žádnou nemá. Autentizace je
// CMS_CRON_SECRET: v hlavičce `Authorization: Bearer <tajemství>`, nebo
// v `?key=` pro plánovače, kteří hlavičky nastavit neumějí (odkaz s tajemstvím
// v URL skončí v logu serveru, takže hlavička je ta doporučená cesta).
//
// GET i POST, protože půlka cronů světa umí jen jedno z toho. Limiter je tu
// kvůli hádání tajemství — porovnání je konstantním časem, ale nekonečně
// mnoho pokusů zadarmo není třeba rozdávat.

import { beat } from '../heartbeat.js'
import { conflict } from '../errors.js'
import { clientKey, consume } from '../rateLimit.js'
import { methodNotAllowed, sendJson } from './http.js'

const presentedSecret = (req) => {
    const header = String(req.headers?.authorization || '')
    if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim()
    return String(req.query?.key || '').trim()
}

export const handleHeartbeat = async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return methodNotAllowed(res, ['GET', 'POST'])
    }

    const budget = consume(`heartbeat:${clientKey(req)}`, { limit: 30, windowMs: 15 * 60 * 1000 })
    if (!budget.allowed) {
        res.setHeader('Retry-After', String(budget.retryAfter))
        throw conflict('Příliš mnoho pokusů')
    }

    const result = await beat({ secret: presentedSecret(req) })
    return sendJson(res, 200, { ok: true, ...result })
}
