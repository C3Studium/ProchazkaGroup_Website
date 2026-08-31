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

import { isRejectionReason } from '@/cms/schemas/review'

import { assertServer, maxUploadBytes, mediaBucket, s3Config, storageDriver } from './env.js'
import { forbidden, invalid, serverError } from './errors.js'
import { createDocumentRepository } from './documents.js'
import { patchBody } from './fieldPatch.js'
import { createMediaRepository } from './media.js'
import { createMediaArchiveRepository } from './mediaArchive.js'
import { createRevisionRepository } from './revisions.js'
import { createArchiveService } from './archive.js'
import { createStorage } from './ports/storage.js'
import { getAdminClient } from './supabaseAdmin.js'
import { assertKnownType, assertValid, findType, sameJson } from './validation.js'
import { changeOwnPassword, signIn as authSignIn, signOut as authSignOut } from './auth.js'
import { createUser, deleteUser, listUsers, setUserDisabled, updateUserRole } from './users.js'

// Importing for the side effect of registering the drivers. Adding a MinIO or R2
// driver means one more import here and a CMS_STORAGE_DRIVER value; which of
// the registered drivers runs is decided by env.js `storageDriver()`, on the
// same key check that decides the document store.
import './ports/supabaseStorage.js'
import './ports/s3Storage.js'
import './ports/fileStorage.js'

export const createStorageFromEnv = () => {
    const driver = storageDriver()
    // Každý ovladač chce jinou sadu: Supabase klienta, S3 adresu a klíče,
    // soubory na disku nic. Sestavit se to musí tady, protože `createStorage`
    // zná jen registr jmen, ne co které jméno potřebuje.
    if (driver === 's3') return createStorage('s3', s3Config())
    return createStorage(driver, { client: getAdminClient(), bucket: mediaBucket() })
}

/** One value out of a body by the segments fieldPatch.js resolved. */
const valueAt = (body, segments) =>
    segments.reduce((node, key) => (node == null ? undefined : node[key]), body)

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
    // The archive's three pieces, constructed together because each of them is
    // useless without the others: a revision stamps media dates as it is
    // written, the library's archival writes into the same ledger, and the one
    // destructive operation has to read all three before it agrees to run.
    const mediaArchive = createMediaArchiveRepository({ client: db })
    const media = createMediaRepository({
        client: db, storage: files, maxBytes: maxUploadBytes(), mediaArchive,
    })
    const revisions = createRevisionRepository({ client: db, mediaArchive })
    const archive = createArchiveService({ documents, revisions, media, mediaArchive })

    const userId = user?.id ?? null

    /**
     * Refuse a write that touches a field this role may not change.
     *
     * The screen already locks or hides those fields
     * (studio/fields/FieldRenderer.jsx), and that is where an editor
     * experiences the rule — but locking is not enforcing. The Studio is a
     * browser application talking to an HTTP API with the editor's own cookie,
     * so anything it can send by hand, an editor can send by hand.
     *
     * Compared rather than forbidden outright. A form posts the WHOLE body, so
     * a member approving a review sends its text back unchanged along with the
     * `approved` flag — refusing every body that mentions a locked field would
     * make moderation impossible for the people whose job it is. What is
     * refused is a body in which the value DIFFERS.
     *
     * Two rules ride on this one check:
     *   a consultant's `slug`, which only the admin may touch, because it is
     *   the address of a page already printed on a business card;
     *   a review's text, which the admin and the owner may edit and a member
     *   may not — a member approves or rejects what was submitted, and
     *   rewriting a customer's words is not moderation.
     */
    /**
     * Refuse creating a type this role may not author.
     *
     * The list screen hides the button (studio/views/DocumentListView.jsx), and
     * that is where an editor meets the rule — but hiding a button is not
     * enforcing anything: the Studio is a browser application talking to an
     * HTTP API with the editor's own cookie.
     */
    const assertMayCreate = (typeName) => {
        const role = user?.role
        if (!role) return

        const type = findType(typeName)
        if (!type?.createRoles || type.createRoles.includes(role)) return

        throw forbidden(`Dokument typu „${type.title || typeName}" smí zakládat jen správce`)
    }

    const assertMayWriteFields = (typeName, before, after) => {
        const role = user?.role
        if (!role) return

        const type = findType(typeName)
        if (!type) return

        for (const field of type.fields) {
            if (!field.editRoles || field.editRoles.includes(role)) continue
            if (sameJson(before?.[field.name] ?? null, after?.[field.name] ?? null)) continue

            const who = field.editRoles.includes('owner') ? 'správce nebo majitel' : 'správce'
            throw forbidden(`Pole „${field.title}" smí měnit jen ${who}`)
        }
    }

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
            assertMayCreate(type)
            // Validated before it is stored, not after it is read back. A body
            // that fails the schema never reaches the table.
            assertValid(type, data || {})
            return documents.create({ type, data, createdBy: userId })
        },

        /**
         * `baseVersion` is the document's `updatedAt` as the caller last saw
         * it, and it is an argument of the port method rather than an
         * `If-Match` header for one reason: Contract 2 has three
         * implementations — this one in process, `httpDataPort.js` over HTTP
         * and `studio/dev/devPort.js` in the browser — and exactly one of them
         * has headers. A version carried in a header would exist on one hop and
         * be inexpressible on the other two, so the guarantee would hold for
         * the Studio and quietly not for anything else that writes a document.
         * `data` is an argument; so is the version of the thing it replaces.
         */
        async update({ id, data, baseVersion = null }) {
            const current = await documents.get({ id })
            assertValid(current.type, data || {})
            assertMayWriteFields(current.type, current.draft ?? current.data, data || {})
            return documents.update({ id, data, updatedBy: userId, baseVersion })
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
         *
         * ------------------------------------------------------------------
         * The read-modify-write, and why it is now a compare-and-swap
         * ------------------------------------------------------------------
         *
         * The two lines above used to be `get` then `update` with the WHOLE
         * body, which meant two editors touching two DIFFERENT fields of one
         * document still lost one of them — the second write carried a copy of
         * the first's field as it had been before. Measured in process, two
         * ports, `question` against `answer`: 200 rounds, 200 losses. Over HTTP
         * against the file store it never reproduced (0 of 75 at offsets 0–24
         * ms) because that store answers a query without yielding to the event
         * loop, so the two handlers cannot interleave; against Supabase the gap
         * is two network round trips and the in-process number is the honest
         * one.
         *
         * So the write is version-checked against the read that produced the
         * body, and a refusal is READ AGAIN rather than reported. If the field
         * this call is about has not moved, the other editor touched something
         * else: the patch is re-applied to their body and retried, and both
         * edits survive. If it HAS moved, two people typed over each other in
         * one place and that is the conflict — 409, not a silent overwrite.
         *
         * That is a merge, and it is only safe because of what a patch is: one
         * named field, resolved through the schema (fieldPatch.js), replacing
         * one value. Re-applying it to a newer body cannot mean anything other
         * than what it meant against the older one.
         *
         * Not `jsonb_set` in one statement, which would remove the window
         * instead of closing it: PostgREST cannot express it, so it would need
         * an RPC in a migration this may not run, plus a fourth entry in the
         * file store's deliberately short list of translated functions. The
         * loop gets the same outcome for the case that happens.
         */
        async patchField({ id, field, value }) {
            {
                // The visual editor's write path. Checked before the retry loop
                // rather than inside it: the answer cannot change between
                // attempts, and refusing on attempt three would have written
                // nothing while looking like a conflict.
                const target = await documents.get({ id })
                const body = target.draft ?? target.data ?? {}
                assertMayWriteFields(target.type, body, { ...body, [String(field).split('.')[0]]: value })
            }

            // Bounded because an unbounded retry against a document somebody is
            // typing into is a request that never answers. Three is one more
            // than the number of editors this system has.
            const ATTEMPTS = 3
            let refusal = null

            for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
                const current = await documents.get({ id })
                const body = current.draft ?? current.data ?? {}
                const next = patchBody(current.type, body, field, value)
                const before = valueAt(body, next.segments)

                let saved
                try {
                    saved = await documents.update({
                        id, data: next.body, updatedBy: userId, baseVersion: current.updatedAt,
                    })
                } catch (error) {
                    if (error?.code !== 'conflict') throw error
                    refusal = error
                    const fresh = await documents.get({ id })
                    // The other writer touched THIS field: nobody can merge two
                    // values of one field, so it is the editor's to resolve.
                    if (!sameJson(valueAt(fresh.draft ?? fresh.data ?? {}, next.segments), before)) throw error
                    continue
                }

                // The stored value read back out, not the one that came in. The
                // two differ whenever the field type normalises, and the preview
                // needs the version that will be there on the next render —
                // otherwise "saved" shows one string and a reload shows another.
                return {
                    document: saved,
                    field: next.segments.join('.'),
                    value: valueAt(saved.draft ?? saved.data ?? {}, next.segments) ?? null,
                }
            }

            throw refusal
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

        // The way back from a draft, and the only write in this port that
        // removes an editor's work. It is not validated on the way in for the
        // same reason archive() is not: what is being thrown away never has to
        // satisfy a schema, and refusing to discard a body that has since become
        // invalid would leave the editor stuck with the very thing they are
        // trying to get rid of. What it leaves behind — `data` — was valid when
        // publish() put it there.
        async discardDraft({ id }) {
            return documents.discardDraft({ id, updatedBy: userId })
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

        /**
         * Moderation's two transitions. `reject` is archive plus a reason and is
         * the thing that used to be `remove()` — see migrations/0008 for why a
         * deleted review is a legal problem and not only a data-loss one.
         *
         * The reason is checked against the schema's closed list here, at the
         * boundary, for the same reason `assertKnownType` is: a value that is not
         * one of them must never reach the body, because the whole worth of the
         * field is that it can be counted. Unvalidated, it would be free text
         * with extra steps.
         *
         * `by` is taken from the session and never from the request. A client
         * that could name who rejected a review could name somebody else.
         */
        async reject({ id, reason }) {
            if (!isRejectionReason(reason)) {
                throw invalid('Neplatný důvod zamítnutí')
            }
            return documents.reject({
                id,
                reason,
                by: user?.name || user?.email || null,
                updatedBy: userId,
            })
        },

        async requeue({ id }) {
            return documents.requeue({ id, updatedBy: userId })
        },

        media: {
            upload: (file, options = {}) => media.upload(file, { ...options, createdBy: userId }),
            list: (args) => media.list(args),
            get: (id) => media.get(id),
            folders: (args) => media.folders(args),
            byPath: (path) => media.findByPath(path),
            update: (id, patch) => media.update(id, patch),

            // Contract 2 still calls it `remove` and the Studio still calls it
            // that; what it DOES is archive. Renaming the port method would
            // have been the honest thing if the meaning had changed for the
            // caller, and it has not: "take this out of my library" is what the
            // button always meant. What changed is that the CMS no longer reads
            // that as permission to destroy the file — see media.js archive()
            // and ARCHIVE.md, layer 4.
            remove: (id) => media.archive(id),
            restore: (id) => media.restore(id),

            // Re-frames the row in place — same id, same library entry. `rect`
            // null puts the original back. See media.js crop() for why the
            // original object is never overwritten.
            crop: (id, rect) => media.crop(id, rect, { croppedBy: userId }),
        },

        /**
         * The archive's write side. `record()` is called from
         * handlers/documents.js at the transitions and nowhere else — see
         * revisions.js for why it is not in the repository, and for the failure
         * mode it must never have.
         */
        revisions: {
            record: ({ document, reason, at }) =>
                revisions.record({ document, reason, changedBy: userId, at }),
            list: (args) => revisions.list(args),
            get: (args) => revisions.get(args),
        },

        /**
         * The Archive screen's server side, including the only hard delete in
         * the system. `purge` is handed the caller so it can refuse a non-owner
         * itself; handlers/archive.js has already refused one, and that
         * duplication is deliberate — archive.js says why.
         *
         * Called `history` and not `archive` because `archive({ id })` above is
         * already taken by the document transition, and one of the two would
         * have silently replaced the other in this object literal. They are also
         * genuinely different things: that one files a document away, this one
         * is the record of everything that ever happened.
         */
        history: {
            report: (selection) => archive.report(selection),
            purge: (selection) => archive.purge(selection, { actor: user }),
            media: (args) => archive.mediaLedger(args),
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
