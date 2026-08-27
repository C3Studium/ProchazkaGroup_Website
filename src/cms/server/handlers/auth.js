// /api/cms/auth/*
//
//   GET    /auth/user            who am I            (public, nullable)
//   POST   /auth/sign-in         email + password    (public, rate limited)
//   POST   /auth/sign-out        clear the session   (public)
//   POST   /auth/password        change my own       (signed in)
//   GET    /auth/users           list                (owner)
//   POST   /auth/users           invite or create    (owner)
//   PATCH  /auth/users/:id       role / disabled     (owner)
//   DELETE /auth/users/:id       remove              (owner)
//
// Every branch under /auth/users calls requireOwner() first. The Studio also
// hides the screen from editors, but that is a courtesy — this is the control.

import { changeOwnPassword, getSessionUser, requireOwner, requireUser, signIn, signOut } from '../auth.js'
import { createUser, deleteUser, listUsers, setUserDisabled, updateUserRole } from '../users.js'
import { invalid } from '../errors.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

const handleUsers = async (req, res, segments) => {
    const actor = await requireOwner(req, res)
    const [id] = segments

    if (!id) {
        if (req.method === 'GET') return sendJson(res, 200, await listUsers())
        if (req.method === 'POST') {
            const body = await readJson(req)
            const result = await createUser(actor, {
                email: body.email,
                name: body.name,
                role: body.role,
                password: body.password,
            })
            // 201 with the generated password in the body. It is in a no-store
            // response over TLS to the owner who asked for it, and this is the
            // only time it exists outside a hash.
            return sendJson(res, 201, result)
        }
        return methodNotAllowed(res, ['GET', 'POST'])
    }

    if (req.method === 'PATCH') {
        const body = await readJson(req)
        // One field per call. A PATCH that both demotes and disables in one go
        // would need its own ordering rules against the last-owner check for no
        // benefit — the UI never asks for both at once.
        if (typeof body.role === 'string') {
            return sendJson(res, 200, await updateUserRole(actor, id, body.role))
        }
        if (typeof body.disabled === 'boolean') {
            return sendJson(res, 200, await setUserDisabled(actor, id, body.disabled))
        }
        throw invalid('Zadejte role nebo disabled')
    }

    if (req.method === 'DELETE') {
        await deleteUser(actor, id)
        return sendJson(res, 204)
    }

    return methodNotAllowed(res, ['PATCH', 'DELETE'])
}

export const handleAuth = async (req, res, segments) => {
    const [action, ...rest] = segments

    if (action === 'users') return handleUsers(req, res, rest)

    if (action === 'user') {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        // Contract 2 says user() is nullable, so "not signed in" is a 200 with
        // null rather than a 401 — the Studio renders the sign-in screen from
        // it, and a 401 here would be indistinguishable from a real failure.
        return sendJson(res, 200, await getSessionUser(req, res))
    }

    if (action === 'sign-in') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        const body = await readJson(req)
        // Rate limiting, the decoy hash and the single generic failure message
        // all live in auth.signIn — they belong with the comparison, not with
        // the routing.
        const user = await signIn(req, res, { email: body.email, password: body.password })
        return sendJson(res, 200, user)
    }

    if (action === 'sign-out') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        await signOut(req, res)
        return sendJson(res, 204)
    }

    if (action === 'password') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        const user = await requireUser(req, res)
        const body = await readJson(req)
        await changeOwnPassword(req, res, user, {
            currentPassword: body.currentPassword,
            newPassword: body.newPassword,
        })
        return sendJson(res, 204)
    }

    return methodNotAllowed(res, ['GET', 'POST'])
}
