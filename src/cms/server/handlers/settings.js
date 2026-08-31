// /api/cms/settings/*  — the owner's configuration surface.
//
//   GET    /settings/status              environment facts   (owner)
//   GET    /settings/probe               anon exposure probe (owner)
//   GET    /settings/keys                API keys            (owner)
//   POST   /settings/keys                issue one           (owner)
//   DELETE /settings/keys/:id            revoke              (owner)
//   GET    /settings/sessions            who is signed in    (owner)
//   DELETE /settings/sessions/:id        end one             (owner)
//   POST   /settings/sessions/revoke-all sign out everywhere (owner)
//
// requireOwner() is called ONCE, at the top, before any branch — so there is no
// route below it that can be added without the check, and no second
// authorisation path to keep in step. handlers/documents.js has the same shape
// with requireUser(); this is that pattern with the stronger role.
//
// The Studio also hides the screen from an editor. That is a courtesy. This is
// the control, and it answers 403 whatever the UI believed.

import { currentSessionHash, requireOwner } from '../auth.js'
import { createApiKey, listApiKeys, revokeApiKey } from '../apiKeys.js'
import { listSessions, revokeAllSessions, revokeSession } from '../sessions.js'
import { probeAnonAccess } from '../anonProbe.js'
import { readStatus } from '../settings.js'
import { invalid, notFound } from '../errors.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

const handleKeys = async (req, res, segments) => {
    const actor = await requireOwner(req, res)
    const [id] = segments

    if (!id) {
        if (req.method === 'GET') return sendJson(res, 200, await listApiKeys())
        if (req.method === 'POST') {
            const body = await readJson(req)
            // 201 with the token in the body. It is in a no-store response over
            // TLS to the owner who asked for it, and this is the only time it
            // exists outside a digest — users.js's generated password, exactly.
            return sendJson(res, 201, await createApiKey(actor, { name: body.name }))
        }
        return methodNotAllowed(res, ['GET', 'POST'])
    }

    if (req.method === 'DELETE') return sendJson(res, 200, await revokeApiKey(actor, id))
    return methodNotAllowed(res, ['DELETE'])
}

const handleSessions = async (req, res, segments) => {
    await requireOwner(req, res)
    const [id] = segments

    if (!id) {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        return sendJson(res, 200, await listSessions({ currentHash: currentSessionHash(req) }))
    }

    // POST /sessions/revoke-all — a transition rather than a DELETE on a
    // collection, for the same reason publish/unpublish are POSTs: the server
    // owns what "all" means at the moment of the click.
    if (id === 'revoke-all') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        const body = await readJson(req)
        const ended = await revokeAllSessions({
            userId: body.userId || null,
            // Default: keep this browser signed in. sessions.js argues it; the
            // caller may pass `keepCurrent: false` to include itself, which is
            // what a per-row revoke of your own session does.
            keepHash: body.keepCurrent === false ? null : currentSessionHash(req),
        })
        return sendJson(res, 200, { ended })
    }

    if (req.method === 'DELETE') {
        await revokeSession(id)
        return sendJson(res, 204)
    }

    return methodNotAllowed(res, ['DELETE'])
}

export const handleSettings = async (req, res, segments) => {
    const [section, ...rest] = segments

    if (section === 'keys') return handleKeys(req, res, rest)
    if (section === 'sessions') return handleSessions(req, res, rest)

    if (section === 'status') {
        await requireOwner(req, res)
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        // Booleans and identifiers only. src/cms/server/settings.js holds the
        // rule and the reasoning; nothing here reads process.env itself.
        return sendJson(res, 200, readStatus())
    }

    if (section === 'probe') {
        await requireOwner(req, res)
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        // Only when asked, never on render: the client calls this from a button
        // and the module holds its answer for a minute either way.
        return sendJson(res, 200, await probeAnonAccess({ force: req.query.force === '1' }))
    }

    if (!section) throw invalid('Chybí sekce nastavení')
    throw notFound('Neznámý endpoint nastavení')
}
