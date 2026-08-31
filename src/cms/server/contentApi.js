// The port an API key gets. Two read methods, and that is the whole surface.
//
// adapter.js explains why authorisation is not enforced inside a port:
// constructing one is the server saying the caller has been checked. This file
// takes the same shape and adds the other half — a port that cannot do the
// wrong thing even if it is handed to the wrong caller.
//
// READ THIS BEFORE ADDING A METHOD HERE.
//
// Everything below goes through `documents.listPublished`, which fixes
// `status = 'published'`, `archived_at is null` and PUBLIC_DOCUMENT_COLUMNS —
// the column set that does not include `draft`. So an API key cannot read an
// unpublished body, cannot read the unpublished half of a published document,
// and cannot read a document somebody archived. Those are properties of the one
// query this file makes, not of a check somewhere above it.
//
// There is no `create`, `update`, `publish`, `media` or `auth` on this object,
// and adding one would not be "widening the API key" — it would be granting an
// unauthenticated-by-cookie principal a write path into the CMS. If an outside
// system needs to write, it needs a session and a person behind it.

import { invalid, notFound } from './errors.js'
import { createDocumentRepository } from './documents.js'
import { getAdminClient } from './supabaseAdmin.js'
import { assertKnownType } from './validation.js'

export const createContentReadPort = ({ client } = {}) => {
    const documents = createDocumentRepository({ client: client || getAdminClient() })

    return {
        /** Published documents of one type, or of every type when `type` is absent. */
        async list({ type, search, page, perPage } = {}) {
            // The registry is the same one the Studio's writes are checked
            // against, so an unknown type is a 422 naming the mistake rather
            // than an empty page that looks like "there is no content".
            if (type) assertKnownType(type)
            // `page` and `perPage` arrive as query strings and are clamped by
            // query.js's clampPerPage (1..100, default 20). Re-clamping here
            // would be a second ceiling to keep in step with the first.
            return documents.listPublished({ type, search, page, perPage })
        },

        /**
         * One published document by id.
         *
         * Routed through the same list query rather than `documents.get()`,
         * which would return the row whatever its status and hand back `draft`
         * with it. A caller asking for a draft's id gets a 404 — the same answer
         * as for an id that does not exist, because from outside they are the
         * same thing: there is no published document at that address.
         */
        async get({ id }) {
            if (!id) throw invalid('Chybí id dokumentu')
            const { rows } = await documents.listPublished({ filters: { id }, perPage: 1 })
            if (!rows.length) throw notFound('Publikovaný dokument nenalezen')
            return rows[0]
        },
    }
}
