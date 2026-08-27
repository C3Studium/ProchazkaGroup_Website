import { requireUser } from '../auth.js'
import { createSupabaseDataPort } from '../adapter.js'
import { maxUploadBytes } from '../env.js'
import { invalid } from '../errors.js'
import { methodNotAllowed, readJson, readRawBody, sendJson } from './http.js'

export const handleMedia = async (req, res, segments) => {
    const user = await requireUser(req, res)
    const port = createSupabaseDataPort({ user, req, res })

    const [id] = segments

    if (!id) {
        if (req.method === 'GET') {
            const { page, perPage, search } = req.query
            return sendJson(res, 200, await port.media.list({ page, perPage, search }))
        }
        if (req.method === 'POST') {
            // Raw body, not multipart: see the note in httpDataPort.js. The
            // limit is enforced while reading so an oversized upload is
            // rejected mid-stream rather than after it is all in memory.
            const buffer = await readRawBody(req, maxUploadBytes())
            const contentType = String(req.headers['content-type'] || '')
            if (!contentType) throw invalid('Chybí hlavička Content-Type')

            const asset = await port.media.upload(
                { buffer, mime: contentType, filename: req.query.filename },
                { alt: req.query.alt || '' }
            )
            return sendJson(res, 201, asset)
        }
        return methodNotAllowed(res, ['GET', 'POST'])
    }

    if (req.method === 'PATCH') {
        const body = await readJson(req)
        return sendJson(res, 200, await port.media.update(id, { alt: body.alt }))
    }
    if (req.method === 'DELETE') {
        await port.media.remove(id)
        return sendJson(res, 204)
    }
    return methodNotAllowed(res, ['PATCH', 'DELETE'])
}
