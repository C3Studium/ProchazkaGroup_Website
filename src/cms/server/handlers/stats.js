// Statistiky: návštěvnost z Clarity a skóre stránky z PageSpeed.
//
// Dvě různá práva, protože jsou to dvě různé věci:
//
//   /stats/clarity     kdokoli přihlášený. Návštěvnost je provozní údaj —
//                      člen, který schvaluje recenze, má vidět, kolik lidí
//                      na web chodí.
//   /stats/pagespeed   jen admin. Skóre výkonu a SEO je hodnocení práce
//                      vývojáře, ne obsahu; owner ani člen s ním nic neudělají
//                      a špatné číslo bez souvislostí jen znejistí.
//
// Klíče k oběma službám zůstávají na serveru. Kdyby šly do prohlížeče, kdokoli
// s otevřenou konzolí by mohl vyčerpat denní limit obou.

import { requireAdmin, requireUser } from '../auth.js'
import { siteUrl } from '../env.js'
import { fetchClarity, hasClarityToken, MAX_DAYS } from '../stats/clarity.js'
import { fetchPageSpeed } from '../stats/pagespeed.js'
import { methodNotAllowed, sendJson } from './http.js'

export const handleStats = async (req, res, segments) => {
    const [section] = segments

    if (section === 'clarity') {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        await requireUser(req, res)

        // Zda je vůbec co číst se pozná bez dotazu na Clarity — a bez toho, aby
        // se tím spotřeboval jeden z deseti denních.
        if (!hasClarityToken()) {
            return sendJson(res, 200, { configured: false, maxDays: MAX_DAYS, metrics: [] })
        }

        const days = Number(req.query.days) || 1
        const data = await fetchClarity({ days })
        return sendJson(res, 200, { configured: true, maxDays: MAX_DAYS, ...data })
    }

    if (section === 'pagespeed') {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        // Jen admin. `requireAdmin` je striktní: owner ani člen jím neprojdou.
        await requireAdmin(req, res)

        const strategy = req.query.strategy === 'desktop' ? 'desktop' : 'mobile'
        const url = String(req.query.url || '').trim() || siteUrl()
        return sendJson(res, 200, await fetchPageSpeed({ url, strategy }))
    }

    return sendJson(res, 404, {
        error: {
            code: 'not_found',
            message: section
                ? `Statistiky neznají sekci "${section}". Použijte clarity nebo pagespeed.`
                : 'Chybí sekce. Použijte /stats/clarity nebo /stats/pagespeed.',
        },
    })
}
