// Contract 2 — the data port, implemented against Supabase.
//
// This is the server-side implementation. It holds the service-role key and
// therefore never runs anywhere near a browser; the Studio gets the same
// interface from httpDataPort.js, which speaks HTTP to the handlers that wrap
// this. Two implementations of one interface is the point — it is what lets the
// Studio be developed against a mock and what would let this be swapped for a
// non-Supabase backend without the UI noticing.
//
// Authorisation is NOT enforced here. It is enforced in the handlers, before a
// port is ever constructed, because a port that sometimes checks and sometimes
// does not is worse than one that never does. Constructing this object is the
// server saying "the caller has been checked".

import { assertServer, maxUploadBytes, mediaBucket, storageDriver } from './env.js'
import { serverError } from './errors.js'
import { createDocumentRepository } from './documents.js'
import { patchBody } from './fieldPatch.js'
import { createMediaRepository } from './media.js'
import { createStorage } from './ports/storage.js'
import { getAdminClient } from './supabaseAdmin.js'
import { assertKnownType, assertValid } from './validation.js'
import { changeOwnPassword, signIn as authSignIn, signOut as authSignOut } from './auth.js'
import { createUser, deleteUser, listUsers, setUserDisabled, updateUserRole } from './users.js'

// Importing for the side effect of registering the drivers. Adding a MinIO or R2
// driver means one more import here and a CMS_STORAGE_DRIVER value; which of
// the registered drivers runs is decided by env.js `storageDriver()`, on the
// same key check that decides the document store.
import './ports/supabaseStorage.js'
import './ports/fileStorage.js'

export const createStorageFromEnv = () =>
    createStorage(storageDriver(), { client: getAdminClient(), bucket: mediaBucket() })

/**
 * @param {object} options
 * @param {{id:string,email:string,name:string}|null} options.user  already-authenticated caller
 * @param {object} [options.client]   Supabase client; injectable for tests
 * @param {object} [options.storage]  StoragePort; injectable for tests
 * @param {object} [options.req]      Node request, needed only by the auth methods
 * @param {object} [options.res]      Node response, needed only by the auth methods
 */
export const createSupabaseDataPort = ({ user = null, client, storage, req = null, res = null } = {}) => {
    assertServer('createSupabaseDataPort')

    const db = client || getAdminClient()
    const files = storage || createStorageFromEnv()

    const documents = createDocumentRepository({ client: db })
    const media = createMediaRepository({ client: db, storage: files, maxBytes: maxUploadBytes() })

    const userId = user?.id ?? null

    return {
        async list({ type, search, filters, sort, page, perPage, archived } = {}) {
            if (type) assertKnownType(type)
            return documents.list({ type, search, filters, sort, page, perPage, archived })
        },

        async get({ id }) {
            return documents.get({ id })
        },

        async create({ type, data }) {
            assertKnownType(type)
            // Validated before it is stored, not after it is read back. A body
            // that fails the schema never reaches the table.
            assertValid(type, data || {})
            return documents.create({ type, data, createdBy: userId })
        },

        async update({ id, data }) {
            const current = await documents.get({ id })
            assertValid(current.type, data || {})
            return documents.update({ id, data, updatedBy: userId })
        },

        /**
         * Contract C — one field of one document, from the visual editor.
         *
         * It is a separate method rather than a thin `update()` because the
         * caller genuinely does not have the document: the overlay knows an id,
         * a path and a new string, and nothing else. Making it send a whole body
         * would mean the browser reading the document first and writing back a
         * copy of everything it did not touch — which is how a stale tab
         * silently reverts a colleague's edit to a different field.
         *
         * The read-modify-write happens here, one hop from the table, over the
         * body the editor is actually looking at (`draft ?? data`).
         *
         * Why this cannot publish, in full: the only write below is
         * `documents.update`, whose statement sets `draft` and `updated_by` and
         * names no other column (documents.js). `data`, `status` and
         * `published_at` are unreachable from this method — not "not passed",
         * unreachable — so an editor who edits visually and never presses
         * Publikovat has changed nothing a visitor can see.
         */
        async patchField({ id, field, value }) {
            const current = await documents.get({ id })
            const next = patchBody(current.type, current.draft ?? current.data ?? {}, field, value)
            const saved = await documents.update({ id, data: next.body, updatedBy: userId })
            // The stored value read back out, not the one that came in. The two
            // differ whenever the field type normalises, and the preview needs
            // the version that will be there on the next render — otherwise
            // "saved" shows one string and a reload shows another.
            return {
                document: saved,
                field: next.segments.join('.'),
                value: next.segments.reduce(
                    (node, key) => (node == null ? undefined : node[key]),
                    saved.draft ?? saved.data ?? {},
                ) ?? null,
            }
        },

        async remove({ id }) {
            await documents.remove({ id })
        },

        async publish({ id }) {
            const current = await documents.get({ id })
            // The draft may have been saved before a schema change made it
            // invalid. Publishing is the moment that matters, so it is checked
            // again here rather than trusted from the last update().
            assertValid(current.type, current.draft ?? current.data)
            return documents.publish({ id, updatedBy: userId })
        },

        async unpublish({ id }) {
            return documents.unpublish({ id, updatedBy: userId })
        },

        // Archiving is not validated against the schema on the way in, and that
        // is deliberate: a person who has left the company is exactly the record
        // most likely to have a field the schema has since started requiring,
        // and refusing to file them away until someone fixes it would be
        // absurd. Only publish() has to hold that line, because only publish()
        // puts a body in front of the public.
        async archive({ id }) {
            return documents.archive({ id, updatedBy: userId })
        },

        async restore({ id }) {
            return documents.restore({ id, updatedBy: userId })
        },

        media: {
            upload: (file, options = {}) => media.upload(file, { ...options, createdBy: userId }),
            list: (args) => media.list(args),
            update: (id, patch) => media.update(id, patch),
            remove: (id) => media.remove(id),
        },

        // The `req`/`res` pair is what auth needs and nothing else here does:
        // a session lives in a cookie, so issuing or clearing one is a header
        // operation, not a database one. Methods that cannot work without it
        // say so rather than silently doing nothing.
        auth: {
            user: async () => user,
            signIn: (email, password) => {
                if (!req || !res) throw serverError('Přihlášení vyžaduje HTTP kontext')
                return authSignIn(req, res, { email, password })
            },
            signOut: async () => {
                if (req && res) await authSignOut(req, res)
            },
            changePassword: (patch) => {
                if (!req || !res) throw serverError('Změna hesla vyžaduje HTTP kontext')
                return changeOwnPassword(req, res, user, patch)
            },

            // Owner-only. Authorisation is decided in handlers/auth.js before a
            // port is constructed, exactly as it is for documents — see the
            // note at the top of this file.
            users: {
                list: () => listUsers(),
                create: (input) => createUser(user, input),
                updateRole: ({ id, role }) => updateUserRole(user, id, role),
                setDisabled: ({ id, disabled }) => setUserDisabled(user, id, disabled),
                remove: ({ id }) => deleteUser(user, id),
            },
        },

        // Not part of Contract 2. Exposed for getServerSideProps on the public
        // site, which needs published documents and must not go through the
        // Studio's authenticated surface to get them.
        publicRead: {
            list: (args) => documents.listPublished(args),
            existsPublished: (args) => documents.existsPublished(args),
        },

        // Escape hatches for the review handler, which writes a published
        // document without an editor session.
        documents,
    }
}
