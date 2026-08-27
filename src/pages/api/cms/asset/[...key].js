// The bytes of a locally-stored asset, over HTTP.
//
//   GET /api/cms/asset/uploads/<shard>/<hash>-<name>.webp
//
// Only ever answers for the file StoragePort (ports/fileStorage.js), which is
// only selected when there is no SUPABASE_SERVICE_ROLE_KEY. With a key set, the
// Supabase driver serves bucket URLs and this route is dead weight that returns
// 404 to everything — checked below rather than left to the empty directory,
// because "there is no such file" and "this deployment does not serve files this
// way" are different answers and only one of them is true in production.
//
// It is a route of its own and not a branch of /api/cms/media because that
// handler opens with `requireUser()`, and this endpoint must NOT require a
// session: `next/image`'s optimizer fetches the source server-side, without the
// browser's cookies, so a gated byte route would 404/401 every `<Image>` while a
// plain `<img>` kept working. The Supabase driver's public bucket is
// unauthenticated for the same reason, and this is the equivalent surface —
// nothing but editor-uploaded media, at content-addressed keys, under
// `.cms-dev/media`.
//
// It also sits OUTSIDE the /api/cms/[...route] catch-all's reach on purpose: a
// static segment beats a catch-all at the same depth in Next's route ranking, so
// `/api/cms/asset/...` lands here and never reaches handleCmsRequest — which
// would answer `not_found` for an unknown head segment anyway.

import { hasServiceRoleKey } from '@/cms/server/env'
import { probeBytes } from '@/cms/server/imageProbe'
import { readAssetFile } from '@/cms/server/ports/fileStorage'

export const config = {
    api: {
        // Nothing is read from the request body; not parsing one is one less
        // thing between a GET and a file.
        bodyParser: false,
    },
}

export default function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD')
        return res.status(405).end()
    }

    if (hasServiceRoleKey()) return res.status(404).end()

    const raw = req.query.key
    const key = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).join('/')

    // `readAssetFile` owns the traversal check and the directory; anything it
    // will not resolve, or that is not there, is a 404 with no detail. A
    // production process with no key throws out of assertFileStoreUsable inside
    // the driver — caught here so a misconfigured deploy answers 404 rather than
    // a stack trace, while the store's own console.error still names the cause.
    let file = null
    try {
        file = readAssetFile(key)
    } catch {
        file = null
    }
    if (!file) return res.status(404).end()

    // Sniffed, not taken from the extension: the extension is the tail of a
    // client-supplied filename, and a Content-Type is the one header a browser
    // will act on. imageProbe.js only ever answers with a type ALLOWED_MIME
    // admits, so this cannot serve `text/html` or `image/svg+xml` whatever is on
    // disk.
    const { mime } = probeBytes(file.buffer)
    if (!mime) return res.status(404).end()

    // Keys are content-addressed: these bytes are these bytes forever, and a new
    // upload is a new key. Immutable is therefore literally true rather than
    // optimistic.
    res.setHeader('Content-Type', mime)
    res.setHeader('Content-Length', String(file.size))
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'inline')

    if (req.method === 'HEAD') return res.end()
    return res.end(file.buffer)
}
