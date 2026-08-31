// The Archive's server side. Owner-only, every route, every request.
//
// ARCHIVE.md is explicit about why the check is here rather than in a menu:
// the archive holds everything that was ever published, including what somebody
// later took down, so it belongs to the owner and not to every editor — and
// "server to na každém požadavku kontroluje, ne skrytím položky v menu". The
// Studio may hide the section from an editor as a courtesy; a 403 from here is
// the actual answer, exactly as it is for /auth/users and /settings.
//
// Five routes and one of them destroys:
//
//   GET  /archive/revisions            the timeline (Změny, Texty)
//   GET  /archive/revisions/:id        one revision, body included
//   GET  /archive/media                every file the archive knows, with dates
//   POST /archive/plan                 what a purge would take — counts only
//   POST /archive/purge                the only hard delete in the CMS
//
// `plan` is a POST and reads nothing but its body, which is the one place this
// file departs from the method conventions elsewhere. The selection it describes
// can be a hundred ids; a query string that long is a limit waiting to be found
// in production by the person with the largest archive. It writes nothing, and
// is named `plan` rather than `report` on the wire so that nothing about the URL
// suggests it acts.

import { requireOwner } from '../auth.js'
import { createSupabaseDataPort } from '../adapter.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

export const handleArchive = async (req, res, segments) => {
    const user = await requireOwner(req, res)
    const port = createSupabaseDataPort({ user, req, res })

    const [section, id] = segments

    if (section === 'revisions') {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        // One revision, with its body. The listing carries bodies too — they are
        // what the Texty subpage prints — so this exists for the case the
        // listing cannot serve: a link to a single moment, opened cold.
        if (id) return sendJson(res, 200, await port.revisions.get({ id }))

        const { documentId, type, reason, from, to, page, perPage } = req.query
        return sendJson(res, 200, await port.revisions.list({
            documentId, type, reason, from, to, page, perPage,
        }))
    }

    if (section === 'media') {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        const { page, perPage, search } = req.query
        return sendJson(res, 200, await port.history.media({
            page,
            perPage,
            search,
            // 'all' by default here and nowhere else. The Média subpage's
            // subject is "every file that was ever in the library", so the
            // library/archive split the other listings default to would hide
            // half of its own topic.
            archived: req.query.archived === '1' ? true : req.query.archived === '0' ? false : 'all',
        }))
    }

    if (section === 'plan') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        return sendJson(res, 200, await port.history.report(await readJson(req)))
    }

    if (section === 'purge') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        // The result is the same numbers `plan` returned, measured on the way
        // out rather than restated: the confirmation said what would go, and
        // this says what went. They are produced by one resolver (archive.js),
        // so a difference between them is a fact worth showing, not a bug worth
        // hiding.
        return sendJson(res, 200, await port.history.purge(await readJson(req)))
    }

    // Sem se dojde, když sekce chybí nebo je neznámá — a to není chyba metody.
    // Hlásit "použijte GET/POST" na GET požadavek posílá čtenáře hledat problém
    // do slepé uličky; problém je v cestě.
    return sendJson(res, 404, {
        error: {
            code: 'not_found',
            message: section
                ? `Archiv nezná sekci "${section}". Použijte revisions, media, plan nebo purge.`
                : 'Chybí sekce archivu. Použijte /archive/revisions, /media, /plan nebo /purge.',
        },
    })
}
