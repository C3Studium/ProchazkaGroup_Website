import { requireUser } from '../auth.js'
import { createSupabaseDataPort } from '../adapter.js'
import { maxUploadBytes } from '../env.js'
import { invalid, notFound } from '../errors.js'
import { methodNotAllowed, readJson, readRawBody, sendJson } from './http.js'

export const handleMedia = async (req, res, segments) => {
    const user = await requireUser(req, res)
    const port = createSupabaseDataPort({ user, req, res })

    const [id, action] = segments

    // /media/folders — the groups the library has, with counts, for the filter
    // bar. Before the `:id` branch below, or "folders" would be read as an id.
    /**
     * The library row for a path — `GET /media/by-path?path=/assets/…`.
     *
     * Needed because a stored image value has three shapes and only one of them
     * carries an id. Measured across the store: 120 values are a bare path
     * string, 36 are `{alt, url, legacy: true}` from the migration, and 52 are
     * the full asset the picker writes. Cropping needs the row, so the two
     * older shapes have to be able to find it — and they can, because every
     * `/assets/…` path in a body is a row in the library.
     */
    if (id === 'by-path') {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        const path = String(req.query.path || '')
        if (!path) throw invalid('Chybí "path"')

        const asset = await port.media.byPath(path)
        // 404 rather than 200 with no body. `sendJson` treats null as "no
        // content", so returning the miss as-is would answer 200 with zero
        // bytes — indistinguishable from a route that forgot to reply.
        if (!asset) throw notFound(`V knihovně není soubor ${path}`)
        return sendJson(res, 200, asset)
    }

    if (id === 'folders') {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        return sendJson(res, 200, await port.media.folders({
            archived: req.query.archived === 'all' ? 'all' : req.query.archived === '1',
        }))
    }

    if (!id) {
        if (req.method === 'GET') {
            const { page, perPage, search } = req.query
            return sendJson(res, 200, await port.media.list({
                page,
                perPage,
                search,
                // Same opt-in shape as `archived` below: anything that is not
                // the one string means "the whole library", so a malformed
                // query parameter cannot silently narrow what an editor sees.
                missingAlt: req.query.missingAlt === '1',
                // Two derived groupings, neither of them stored: `folder` is a
                // path prefix, `usage` is "does any document reference this".
                // See server/mediaUsage.js.
                folder: req.query.folder || '',
                usage: req.query.usage === 'unused' || req.query.usage === 'used' ? req.query.usage : '',
                withUsage: req.query.withUsage === '1',
                // Same tri-state and the same string handling as /documents:
                // anything that is not one of the two opt-ins means the library,
                // so a malformed query parameter cannot surface archived files.
                archived: req.query.archived === 'all' ? 'all' : req.query.archived === '1',
            }))
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

    // /media/:id/restore — back into the library.
    //
    // A POST like the document transitions rather than a PATCH of `archived_at`,
    // for the same reason they are: the client says what should happen, never
    // what the timestamp should be. It exists because archiving is only safe to
    // offer if it can be undone by something other than the one action in the
    // CMS that cannot be.
    if (action === 'restore') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        return sendJson(res, 200, await port.media.restore(id))
    }

    // POST rather than PATCH for the same reason `restore` is: the client says
    // what should happen — "frame it here" — and the server decides what that
    // means for the row. A PATCH would invite a caller to set `path` and `url`
    // themselves, which are exactly the two fields nothing outside this module
    // is allowed to choose.
    //
    // `crop: null` in the body is the documented way to undo, so an absent key
    // and an explicit null have to mean different things: absent is a
    // malformed request, null is "put the original back".
    if (action === 'crop') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        const body = await readJson(req)
        if (!('crop' in body)) throw invalid('Chybí "crop" — obdélník, nebo null pro zrušení ořezu')
        return sendJson(res, 200, await port.media.crop(id, body.crop))
    }

    // One row by id. Added for the crop editor, which has to open on what the
    // LIBRARY says about a picture rather than on the copy embedded in the
    // document: the embedded one was written when the image was picked and
    // knows nothing about a crop applied afterwards. Opening on it would crop
    // the crop.
    if (req.method === 'GET') {
        return sendJson(res, 200, await port.media.get(id))
    }

    if (req.method === 'PATCH') {
        const body = await readJson(req)
        return sendJson(res, 200, await port.media.update(id, { alt: body.alt }))
    }
    // Unchanged on the wire, changed underneath: this used to delete the row and
    // then the object, which is how an editor tidying the library destroyed
    // history nobody noticed was gone until the archive was needed. It now
    // archives — the row stays, the file stays, the library no longer lists it.
    // 204 either way, because "it is out of my library" is what the caller
    // asked for and what happened. Destroying a file for real is one owner-only,
    // confirmed action in the Archive; see handlers/archive.js.
    if (req.method === 'DELETE') {
        await port.media.remove(id)
        return sendJson(res, 204)
    }
    return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE'])
}
