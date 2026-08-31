/**
 * Which database this run talks to.
 *
 * The CMS reads three environment variables — NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY — and so does
 * every tool around it. Rather than teach each of them about environments, this
 * module resolves ONE target and writes those three names, so nothing
 * downstream changes and there is a single place to audit.
 *
 * CMS_DATABASE says which:
 *
 *   production    the live project
 *   development   the throwaway project used for rehearsals
 *   (unset)       production when NODE_ENV=production, otherwise development
 *
 * The default is the safe direction. A developer who never sets the variable
 * cannot write to live data from their laptop, and a Vercel production build —
 * where NODE_ENV is always "production" — reaches the live project without
 * anyone remembering to configure it.
 *
 * COMMONJS ON PURPOSE. next.config.mjs imports it as ESM (Node gives the module
 * exports as the default import) and scripts/cms-migrate.js requires it as
 * CommonJS. One file, both worlds, no build step.
 */
'use strict'

const TARGETS = ['production', 'development']

/** What CMS_DATABASE says, or what NODE_ENV implies when it says nothing. */
const chosenTarget = (env) => {
    const declared = String(env.CMS_DATABASE || '').trim().toLowerCase()

    if (!declared) return env.NODE_ENV === 'production' ? 'production' : 'development'

    if (!TARGETS.includes(declared)) {
        throw new Error(
            `CMS_DATABASE="${declared}" není platná hodnota. Použijte ${TARGETS.join(' nebo ')}, ` +
            'nebo ji nechte prázdnou a rozhodne NODE_ENV.'
        )
    }

    return declared
}

/**
 * The credentials for one target.
 *
 * Production falls back to the unprefixed names, which is what this project's
 * .env held before there were two databases. So a deployment that has never
 * heard of SUPABASE_PROD_* keeps working exactly as it did.
 */
const credentialsFor = (target, env) => {
    if (target === 'development') {
        return {
            url: env.SUPABASE_TEST_URL,
            anonKey: env.SUPABASE_TEST_ANON_KEY,
            serviceRoleKey: env.SUPABASE_TEST_SERVICE_ROLE_KEY,
        }
    }

    return {
        url: env.SUPABASE_PROD_URL || env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.SUPABASE_PROD_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: env.SUPABASE_PROD_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
    }
}

/** The project ref — the subdomain — which is the only part worth printing. */
const refOf = (url) => {
    try {
        return new URL(String(url)).hostname.split('.')[0]
    } catch {
        return null
    }
}

/**
 * Resolve without touching anything. Returns the target, its credentials and
 * whether they are complete enough to use.
 */
const resolveDatabase = (env = process.env) => {
    const target = chosenTarget(env)
    const credentials = credentialsFor(target, env)

    return {
        target,
        ...credentials,
        ref: refOf(credentials.url),
        // A missing service-role key is NOT incomplete: the CMS reads that
        // exact absence as "use the file store", which is a legitimate state
        // and the one this project sat in for months.
        configured: Boolean(credentials.url && credentials.anonKey),
    }
}

/**
 * Resolve and publish onto process.env, so every downstream reader — the app,
 * supabase-js, the seed, the migrator — sees the chosen project under the names
 * it already reads.
 *
 * A development target with nothing configured is left alone rather than
 * cleared: overwriting the three names with `undefined` would take a working
 * setup and break it to enforce a database that does not exist yet.
 */
const applyDatabaseEnv = (env = process.env) => {
    const resolved = resolveDatabase(env)

    if (!resolved.configured) return { ...resolved, applied: false }

    env.NEXT_PUBLIC_SUPABASE_URL = resolved.url
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = resolved.anonKey
    // Assigned even when empty: an empty service-role key is the file-store
    // signal, and leaving the previous target's key in place would point the
    // writes at one project and the reads at another.
    env.SUPABASE_SERVICE_ROLE_KEY = resolved.serviceRoleKey || ''

    return { ...resolved, applied: true }
}

/** One line for a startup log: "development → elrgspydbnezkvquqhhl". */
const describeDatabase = (resolved) =>
    `${resolved.target} → ${resolved.ref || 'nenastaveno'}`

module.exports = { TARGETS, resolveDatabase, applyDatabaseEnv, describeDatabase }
