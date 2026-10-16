// /api/cms/widget — how the "Spravovat web" widget looks.
//
//   GET /api/cms/widget    the four appearance values   (no session)
//   PUT /api/cms/widget    change them                  (owner)
//
// ---------------------------------------------------------------------------
// Why the GET is not under /settings, and why it has no session check
// ---------------------------------------------------------------------------
//
// handlers/settings.js states an invariant worth keeping: everything under
// /api/cms/settings/* requires an owner, checked before any branch, so a route
// added there cannot arrive without the check. A publicly readable endpoint
// would be the exception that makes that sentence false, and one exception in a
// list of nine is the one nobody notices. So the read lives at its own address
// and the namespace's rule stays absolute.
//
// The read is unauthenticated on purpose, and the reasoning is the same as the
// hint cookie's (src/cms/manage/hint.js). The widget must appear for anyone
// holding the hint, including someone who forged it — that is what makes the
// hint honest: forging it produces a button, and the button leads to a sign-in
// form. If this endpoint demanded a session, the hint would quietly acquire an
// authority it must not have, and the widget's presence would become a signal
// about whether a session is valid. What the endpoint returns instead is a
// corner, a colour and two booleans: facts about a button, and not secrets by
// any reading. migrations/0006 says in the table's own comment that nothing
// secret may be stored behind it, for exactly this reason.
//
// The WRITE is owner-only, checked here, on every call. That is the control.

import { requireOwner } from '../auth.js'
import { readManageWidget, writeManageWidget } from '../manageWidget.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

export const handleWidget = async (req, res, segments) => {
    if (segments.length) return methodNotAllowed(res, ['GET', 'PUT'])

    if (req.method === 'GET') {
        // sendJson sets no-store. Deliberate here rather than inherited: an
        // owner who moves the button expects the next page load to show it in
        // the new corner, and a cached appearance would make the change look
        // like it had not saved. One uncached request, made only by a browser
        // that already carries the hint.
        return sendJson(res, 200, await readManageWidget())
    }

    if (req.method === 'PUT') {
        const actor = await requireOwner(req, res)
        const body = await readJson(req)
        return sendJson(res, 200, await writeManageWidget(actor, body))
    }

    return methodNotAllowed(res, ['GET', 'PUT'])
}
