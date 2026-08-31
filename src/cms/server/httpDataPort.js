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

        // `baseVersion` — the `updatedAt` this caller's copy carried. Refused
        // with 409 when the stored document has moved past it, which is the
        // only thing standing between two editors and a silent overwrite. It
        // travels in the body rather than as `If-Match` because it is an
        // argument of the port method and two of the port's three
        // implementations have no headers at all; see server/adapter.js.
        //
        // Passed through as-is and never re-derived. It is an opaque string —
        // Postgres renders microseconds, the file store milliseconds, and
        // anything that put it through a Date would truncate it into a conflict
        // that never happened.
        update: ({ id, data, baseVersion = null }) =>
            request(`/documents/${encodeURIComponent(id)}`, { method: 'PUT', body: { data, baseVersion } }),

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

        // The draft, deleted. DELETE on the `draft` sub-resource and not a POST
        // beside `unpublish`, so the one call that removes unpublished work and
        // the one that removes a page from the site cannot be reached by the
        // same mistake. Answers the document, not 204 — the Studio redraws from
        // it. Refused with 409 on a document that has never been published:
        // there is no body to fall back to. See server/documents.js.
        discardDraft: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/draft`, { method: 'DELETE' }),

        // Off the public site, still in the database, still in the Studio. Not
        // the same as unpublish: the document keeps its publish state, so
        // restore() puts a published one straight back on the site.
        archive: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/archive`, { method: 'POST' }),

        restore: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

        // Moderation's pair. `reject` is the only transition with a body: the
        // reason is the point of it. Who rejected and when are NOT sent — the
        // server takes both from the session and the clock, because a client
        // that could name them could name somebody else. See
        // migrations/0008_cms_review_rejection.sql.
        reject: ({ id, reason }) =>
            request(`/documents/${encodeURIComponent(id)}/reject`, {
                method: 'POST',
                body: { reason },
            }),

        requeue: ({ id }) =>
            request(`/documents/${encodeURIComponent(id)}/requeue`, { method: 'POST' }),

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

            list: ({ page, perPage, search, missingAlt, folder, usage, withUsage } = {}) =>
                request('/media', {
                    query: {
                        page,
                        perPage,
                        search,
                        missingAlt: missingAlt ? '1' : undefined,
                        folder: folder || undefined,
                        usage: usage || undefined,
                        withUsage: withUsage ? '1' : undefined,
                    },
                }),

            folders: () => request('/media/folders'),

            byPath: (path) => request('/media/by-path', { query: { path } }),

            get: (id) => request(`/media/${encodeURIComponent(id)}`),

            update: (id, { alt }) =>
                request(`/media/${encodeURIComponent(id)}`, { method: 'PATCH', body: { alt } }),

            // Still called remove, and it archives. The name is Contract 2's
            // and the meaning to the caller has not changed — "take this out of
            // my library" — but the CMS no longer reads that as permission to
            // destroy the file, because a revision from March points at it. See
            // server/media.js archive().
            remove: (id) => request(`/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),

            restore: (id) =>
                request(`/media/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

            // `rect` is {x, y, width, height} in the ORIGINAL image's pixels, or
            // null to put the original back. Sent as a body rather than a query
            // string because it is four numbers that belong together, and
            // because `null` survives JSON where it does not survive a URL.
            crop: (id, rect) =>
                request(`/media/${encodeURIComponent(id)}/crop`, {
                    method: 'POST',
                    body: { crop: rect },
                }),
        },

        /**
         * The Archive. Owner-only, enforced server-side on every call in
         * handlers/archive.js; the Studio hides the section from an editor as a
         * courtesy and a 403 from here is the actual answer.
         *
         * `history`, not `archive`: `archive({ id })` above is the document
         * transition and this object literal has room for one of each name. The
         * routes are still /archive/*, because that is the screen's name.
         *
         * `plan` and `purge` take the same selection object —
         * `{ revisionIds, mediaIds, documentId, from, to }` — and the server
         * resolves it once for both, so what the confirmation names and what the
         * deletion removes are one list rather than two queries that agree
         * today. Call `plan` first: it is what the sentence *„Jste si opravdu
         * jisti? Tato akce nelze vrátit zpět."* is printed above, and it also
         * reports what the server will refuse (`blocked`) before anybody presses
         * anything.
         */
        history: {
            revisions: ({ documentId, type, reason, from, to, page, perPage } = {}) =>
                request('/archive/revisions', {
                    query: { documentId, type, reason, from, to, page, perPage },
                }),

            revision: ({ id }) => request(`/archive/revisions/${encodeURIComponent(id)}`),

            media: ({ page, perPage, search, archived } = {}) =>
                request('/archive/media', {
                    query: {
                        page,
                        perPage,
                        search,
                        // Three states over the wire and none of them is the
                        // empty string, because buildQuery drops that: '1'
                        // archived only, '0' the library, absent both.
                        archived: archived === true ? '1' : archived === false ? '0' : undefined,
                    },
                }),

            plan: (selection) => request('/archive/plan', { method: 'POST', body: selection }),

            purge: (selection) => request('/archive/purge', { method: 'POST', body: selection }),
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

        /**
         * Configuration rather than content — the settings portal.
         *
         * Not in Contract 2, which is about documents and media, and kept as
         * its own namespace rather than folded into `auth` for that reason:
         * `auth` answers "who is the caller", this answers "what is this
         * deployment". Owner-only, enforced server-side on every call in
         * handlers/settings.js; the Studio hides the screen from an editor as a
         * courtesy and a 403 from here is the actual answer.
         *
         * `status()` returns booleans, enums and non-secret identifiers only.
         * There is no method here that returns the value of a secret, and there
         * is no endpoint behind one — see src/cms/server/settings.js.
         */
        // Statistiky. Klíče k Clarity i PageSpeed zůstávají na serveru, takže
        // klient dostane hotová čísla a nic, čím by šel limit vyčerpat.
        stats: {
            /** Návštěvnost a chování. `days` je 1 až 3 — víc Clarity API neumí. */
            clarity: ({ days = 1 } = {}) => request('/stats/clarity', { query: { days: String(days) } }),

            /** Skóre výkonu a SEO. Jen pro admina; ostatní dostanou 403. */
            pagespeed: ({ strategy = 'mobile', url } = {}) =>
                request('/stats/pagespeed', { query: { strategy, url } }),
        },

        settings: {
            status: () => request('/settings/status'),

            // Explicitly, from a button. It makes live requests to Supabase, so
            // it must not be wired to a render.
            probe: ({ force } = {}) => request('/settings/probe', { query: { force: force ? '1' : undefined } }),

            keys: {
                list: () => request('/settings/keys'),

                // Returns { key, token }. `token` exists in this one response
                // and nowhere else — the row holds a SHA-256 — so a caller that
                // drops it has lost it. Same contract as
                // auth.users.create()'s temporaryPassword.
                create: ({ name } = {}) => request('/settings/keys', { method: 'POST', body: { name } }),

                revoke: ({ id }) =>
                    request(`/settings/keys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
            },

            /**
             * The "Spravovat web" widget on the public site. Not under
             * /settings on the wire — the read is public and that namespace is
             * owner-only without exception (handlers/widget.js) — but it is a
             * setting to the person changing it, so it is here in the shape the
             * Studio thinks in.
             */
            widget: {
                read: () => request('/widget'),
                save: (value) => request('/widget', { method: 'PUT', body: value }),
            },

            sessions: {
                list: () => request('/settings/sessions'),

                revoke: ({ id }) =>
                    request(`/settings/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

                // `keepCurrent` defaults to true server-side: the browser that
                // pressed the button stays signed in. sessions.js argues why.
                revokeAll: ({ userId, keepCurrent } = {}) =>
                    request('/settings/sessions/revoke-all', {
                        method: 'POST',
                        body: { userId, keepCurrent },
                    }),
            },
        },
    }
}

export default createHttpDataPort
