// Contract 2 over HTTP — the object the Studio actually receives.
//
// BROWSER-SAFE. This file must never import anything from the rest of
// src/cms/server: no env, no Supabase client, no service-role key. Its only
// dependency is errors.js, which is pure. Build B imports it as
//
//     import { createHttpDataPort } from '@/cms/server/httpDataPort'
//
// and never as `from '@/cms/server'`, which is the server barrel.
//
// It exists so the Studio can be written against one interface while the
// credentials stay on the other side of a network hop. Every method here is the
// same signature as the Supabase adapter's, and both throw the same CmsError.

import { CmsError, cmsErrorFromResponse } from './errors.js'

const DEFAULT_BASE = '/api/cms'

const buildQuery = (params) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params || {})) {
        if (value === undefined || value === null || value === '') continue
        search.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
    }
    const query = search.toString()
    return query ? `?${query}` : ''
}

export const createHttpDataPort = ({ baseUrl = DEFAULT_BASE, fetchImpl } = {}) => {
    const doFetch = fetchImpl || ((...args) => globalThis.fetch(...args))

    const request = async (path, { method = 'GET', body, raw, query, contentType } = {}) => {
        const headers = {}
        let payload

        if (raw) {
            payload = raw
            if (contentType) headers['Content-Type'] = contentType
        } else if (body !== undefined) {
            headers['Content-Type'] = 'application/json'
            payload = JSON.stringify(body)
        }

        let response
        try {
            response = await doFetch(`${baseUrl}${path}${buildQuery(query)}`, {
                method,
                headers,
                body: payload,
                // Session lives in an httpOnly cookie, so it has to be sent.
                credentials: 'same-origin',
            })
        } catch (err) {
            // A failed fetch is a network problem, not a server response. The
            // Studio needs it as a CmsError like everything else.
            throw new CmsError('server', `Spojení se serverem selhalo: ${err.message}`)
        }

        if (response.status === 204) return null

        const text = await response.text()
        let parsed = null
        if (text) {
            try {
                parsed = JSON.parse(text)
            } catch {
                if (!response.ok) throw new CmsError('server', `HTTP ${response.status}`)
                throw new CmsError('server', 'Server vrátil neplatnou odpověď')
            }
        }

        if (!response.ok) throw cmsErrorFromResponse(response.status, parsed)
        return parsed
    }

    return {
        // `archived` is sent as "1" / "all" rather than a boolean because
        // buildQuery stringifies everything and `false` would arrive as the
        // string "false", which is truthy. Omitting it entirely is what the
        // default — live documents only — looks like on the wire.
        list: ({ type, search, filters, sort, page, perPage, archived } = {}) =>
            request('/documents', {
                query: {
                    type, search, filters, sort, page, perPage,
                    archived: archived === 'all' ? 'all' : archived ? '1' : undefined,
                },
            }),

        get: ({ id }) => request(`/documents/${encodeURIComponent(id)}`),

        create: ({ type, data }) => request('/documents', { method: 'POST', body: { type, data } }),

        update: ({ id, data }) =>
            request(`/documents/${encodeURIComponent(id)}`, { method: 'PUT', body: { data } }),

        // Contract C. Answers `{ document, field, value }` — `value` being what
        // is now stored, which is not always what was sent. The visual editor
        // reconciles its optimistic update against that rather than against its
        // own input; see studio/lib/visualSave.js.
        patchField: ({ id, field, value }) =>
            request(`/documents/${encodeURIComponent(id)}/field`, {
                method: 'PATCH',
                body: { field, value },
            }),

        remove: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }),

        publish: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/publish`, { method: 'POST' }),

        unpublish: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }),

        // Off the public site, still in the database, still in the Studio. Not
        // the same as unpublish: the document keeps its publish state, so
        // restore() puts a published one straight back on the site.
        archive: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/archive`, { method: 'POST' }),

        restore: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

        media: {
            // Raw body rather than multipart. A multipart parser is a runtime
            // dependency (formidable/busboy) or a hand-written one; since both
            // ends of this wire are ours, sending the bytes as the body with the
            // metadata in the query string is simpler and has no parser to get
            // wrong. Filenames here are Czech, so they go through
            // URLSearchParams rather than a latin-1 header.
            upload: (file, { alt = '' } = {}) =>
                request('/media', {
                    method: 'POST',
                    raw: file,
                    contentType: file?.type || 'application/octet-stream',
                    query: { filename: file?.name || 'file', alt },
                }),

            list: ({ page, perPage, search } = {}) =>
                request('/media', { query: { page, perPage, search } }),

            update: (id, { alt }) =>
                request(`/media/${encodeURIComponent(id)}`, { method: 'PATCH', body: { alt } }),

            remove: (id) => request(`/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        },

        auth: {
            user: () => request('/auth/user'),

            // Contract 2 said `signIn(email)` and meant a magic link. It is
            // email + password now: the response is the signed-in user, not a
            // "check your inbox", and the session arrives as an httpOnly cookie
            // that this code cannot read — which is the point.
            signIn: (email, password) =>
                request('/auth/sign-in', { method: 'POST', body: { email, password } }),

            signOut: () => request('/auth/sign-out', { method: 'POST' }),

            changePassword: ({ currentPassword, newPassword }) =>
                request('/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),

            // Owner-only, enforced server-side on every call. The Studio hides
            // the screen from editors as a courtesy; a 403 from here is the
            // actual answer.
            users: {
                list: () => request('/auth/users'),

                // Returns { user, temporaryPassword }. `temporaryPassword` is
                // non-null only when the server generated one, and only in this
                // one response — nothing can ask for it again.
                create: ({ email, name, role, password } = {}) =>
                    request('/auth/users', { method: 'POST', body: { email, name, role, password } }),

                updateRole: ({ id, role }) =>
                    request(`/auth/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: { role } }),

                setDisabled: ({ id, disabled }) =>
                    request(`/auth/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: { disabled } }),

                remove: ({ id }) =>
                    request(`/auth/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
            },
        },
    }
}

export default createHttpDataPort
