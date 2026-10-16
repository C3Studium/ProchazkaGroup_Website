// Servírování médií z disku.
//
// Smysl má jen při úložišti na disku: s ostatními drivery servíruje soubory
// samo úložiště a tahle routa vrací 404 — proto ta kontrola hned na začátku,
// aby v produkci nebyla druhá, pomalejší cesta ke stejným bajtům.
//
// Bydlí v balíčku, ne v šabloně, protože ji potřebují oba routery a dvě kopie
// téhož by se rozešly.

import { hasServiceRoleKey } from './env.js'
import { probeBytes } from './imageProbe.js'
import { readAssetFile } from './ports/fileStorage.js'

export default function assetHandler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD')
        return res.status(405).end()
    }

    if (hasServiceRoleKey()) return res.status(404).end()

    const raw = req.query.key
    const key = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).join('/')

    let file = null
    try { file = readAssetFile(key) } catch { file = null }
    if (!file) return res.status(404).end()

    // Typ se čte z bajtů, ne z přípony: přípona je vstup od uživatele.
    const { mime } = probeBytes(file.buffer)
    if (!mime) return res.status(404).end()

    res.setHeader('Content-Type', mime)
    res.setHeader('Content-Length', String(file.size))
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'inline')

    if (req.method === 'HEAD') return res.end()
    return res.end(file.buffer)
}
