// What the deployment is actually configured to do — facts, never secrets.
//
// ---------------------------------------------------------------------------
// THE RULE THIS FILE EXISTS TO HOLD
// ---------------------------------------------------------------------------
//
// No function here returns the VALUE of a secret. Not SUPABASE_SERVICE_ROLE_KEY,
// not CMS_SESSION_SECRET, not CMS_ADMIN_PASSWORD, not CMS_IP_HASH_SALT. Not
// masked, not the last four characters, not behind a "reveal" the owner has to
// click. Set or not set, and nothing more.
//
// The reason is mechanical rather than a matter of taste. Anything this module
// returns is JSON on the wire, in a browser tab, in that tab's memory, in the
// devtools network panel, and in whatever the person's browser syncs — and a
// service-role key is the credential that bypasses every RLS policy in
// migrations/0001. There is no version of "the owner is trusted" that makes
// putting it there a good trade, because the owner already has a way to read
// their own environment: the place they typed it in. A settings screen that
// prints it converts a secret held in one system into a secret held in five.
//
// If a future ask is "just show me the first six characters so I can tell which
// key it is", the answer is a fingerprint — a hash — not a substring. Which is
// what `keyFingerprint` below is for, and it is deliberately NOT wired into the
// status payload: nobody has needed it yet.
//
// The other half of the rule is that this is the only way the Studio learns any
// of it. No component reads `process.env`: the server-only names are undefined
// in a browser bundle by construction (env.js's header explains why), and a
// NEXT_PUBLIC_ mirror of any of them would publish the value.

import { createHash } from 'node:crypto'

import {
    assertServer,
    hasServiceRoleKey,
    isProduction,
    mediaBucket,
    storageDriver,
    supabaseUrl,
} from './env.js'

/**
 * `https://gkzobudtjpucpstclmli.supabase.co` -> `gkzobudtjpucpstclmli`.
 *
 * The project ref is in every request URL the browser already makes and in the
 * anon key's payload; it identifies WHICH Supabase project, which is exactly the
 * question an owner staring at two environments needs answered. It is not a
 * credential and treating it as one would leave the screen unable to say
 * anything useful at all.
 */
const projectRef = (url) => {
    const match = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in|net)/i.exec(String(url || ''))
    return match ? match[1] : null
}

/**
 * A short SHA-256 of a value, for telling two configurations apart without
 * carrying either of them. Unused by `readStatus` on purpose — see the header.
 */
export const keyFingerprint = (value) =>
    value ? createHash('sha256').update(String(value)).digest('hex').slice(0, 12) : null

const present = (name) => Boolean(String(process.env[name] || '').trim())

/**
 * The status payload.
 *
 * Every entry is a boolean, an enum, or a non-secret identifier. Read the list
 * as the set of things that would otherwise be found out by guessing:
 *
 *   - whether the service-role key is set, and therefore which persistence is
 *     live. env.js `hasServiceRoleKey()` is the one question that decides both
 *     the document store and the storage driver, so it is reported once and the
 *     two consequences are reported next to it.
 *   - which Supabase project the deployment points at.
 *   - which account bootstrapped as owner. An address, and the owner's own; it
 *     is already on the users screen.
 *   - whether NEXT_PUBLIC_CMS_DEV_PORT is on. It is not cosmetic: with it set
 *     to "1" the Studio runs on an in-browser stub AND two API routes stop
 *     checking for a session (api/studio/preview.js:47, api/studio/edit.js:41),
 *     because in that mode there is no server-side session to check. Correct
 *     there, indefensible if it is ever true in production — so the screen says
 *     which it is rather than leaving it to a deploy log.
 */
export const readStatus = () => {
    assertServer('readStatus')

    const serviceRole = hasServiceRoleKey()
    const devPort = String(process.env.NEXT_PUBLIC_CMS_DEV_PORT || '').trim() === '1'

    let url = null
    try {
        url = supabaseUrl()
    } catch {
        // required() throws when it is unset, which is itself the answer.
        url = null
    }

    return {
        environment: isProduction() ? 'production' : 'development',

        supabase: {
            url,
            projectRef: projectRef(url),
            anonKeySet: present('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
            serviceRoleKeySet: serviceRole,
        },

        // "Which store is live" is derived from the same call the code makes,
        // not restated. A screen that answered from a second definition would
        // eventually be confidently wrong.
        persistence: {
            driver: serviceRole ? 'supabase' : 'file',
            storageDriver: storageDriver(),
            mediaBucket: mediaBucket(),
            // The file store refuses to run in production (fileStore/store.js):
            // Vercel's filesystem is per-invocation, so saves would vanish. A
            // deployment in that state is broken and should say so here.
            fileStoreInProduction: isProduction() && !serviceRole,
        },

        auth: {
            // The address, never the password. AUTH.md: the pair is a seed and
            // is inert once an owner exists, which is worth showing because
            // "CMS_ADMIN_PASSWORD is still set" reliably reads as a back door
            // to someone who has not read that document.
            bootstrapEmail: String(process.env.CMS_ADMIN_EMAIL || '').trim().toLowerCase() || null,
            bootstrapPasswordSet: present('CMS_ADMIN_PASSWORD'),
            sessionSecretSet: present('CMS_SESSION_SECRET'),
            ipHashSaltSet: present('CMS_IP_HASH_SALT'),
        },

        devPort: {
            enabled: devPort,
            // Named here rather than in the component so the two files that
            // actually contain the branch are what gets quoted.
            affects: ['src/pages/api/studio/preview.js', 'src/pages/api/studio/edit.js'],
        },
    }
}
