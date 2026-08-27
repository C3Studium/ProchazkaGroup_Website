// The two Supabase clients this layer uses, and nothing else may construct one.
//
// - admin: service_role. BYPASSRLS. Reads drafts, writes documents, moves
//   bytes. Server process only — importing this module in the browser throws
//   before it can read the key.
// - anon: the public key, subject to RLS in full. Nothing in the CMS auth
//   path uses it any more — sessions are this application's own — but the
//   public site reads published documents with it, so the seam stays.
//
// Deliberately not exported as a module-level singleton created at import
// time: a missing env var should fail on the first request that needs it, with
// a message naming the variable, rather than at build time in a page that has
// nothing to do with the CMS.
//
// ---------------------------------------------------------------------------
// Two clients, or one file
// ---------------------------------------------------------------------------
//
// With no SUPABASE_SERVICE_ROLE_KEY there is no Supabase persistence at all:
// `cms_document` cannot be created without it, every read of it answers empty,
// and the Studio and the site end up looking at two different, disconnected
// stores. So both functions below answer with the file-backed client instead
// (src/cms/server/fileStore), which speaks the same query language and carries
// the same grants and policies.
//
// This is the ONLY place the choice is made. Everything above — the document
// repository, the media repository, sessions, users, the handlers, the
// validation, fieldPatch — is written against a client and neither knows nor can
// tell which one it has. That is what makes "the day the key arrives, the
// Supabase path takes over and nothing else changes" a fact about the code
// rather than an intention.

import { createClient } from '@supabase/supabase-js'

import {
    assertServer,
    hasServiceRoleKey,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    supabaseUrl,
} from './env.js'
import { getFileClient } from './fileStore/client.js'

let adminClient = null

export const getAdminClient = () => {
    assertServer('getAdminClient')
    if (!hasServiceRoleKey()) return getFileClient({ role: 'service' })
    if (adminClient) return adminClient

    adminClient = createClient(supabaseUrl(), supabaseServiceRoleKey(), {
        auth: {
            // A service-role client has no user session to persist or refresh,
            // and doing either on a serverless instance leaks state between
            // requests.
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
        global: {
            headers: { 'x-cms-client': 'cms-server' },
        },
    })
    return adminClient
}

let anonClient = null

// Anon key, no session. The right client for anything that should be subject to
// the policies in the migrations rather than exempt from them: a public read is
// meant to fail the same way a visitor's would.
//
// The file store honours that: its anon role carries the column grant and the
// `status = 'published' and archived_at is null` policy, so the guarantee
// read.js relies on — a bug in the public read path cannot surface a draft —
// holds against either backend rather than only against Postgres.
export const getAnonClient = () => {
    assertServer('getAnonClient')
    if (!hasServiceRoleKey()) return getFileClient({ role: 'anon' })
    if (anonClient) return anonClient

    anonClient = createClient(supabaseUrl(), supabaseAnonKey(), {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    })
    return anonClient
}

// Test seam. The adapter takes its client by injection so a stub can stand in;
// this resets the memoised singletons when a test has replaced env.
export const resetClients = () => {
    adminClient = null
    anonClient = null
}
