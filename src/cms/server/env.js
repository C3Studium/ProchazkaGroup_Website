// Server-side environment access.
//
// Every read goes through here so there is exactly one place to audit for
// "did a secret escape into the browser bundle". Next inlines `process.env.X`
// at build time only for NEXT_PUBLIC_* names; the rest are undefined in client
// code. assertServer() makes that failure loud instead of silent, because a
// module that reaches the client and quietly gets `undefined` for the service
// role key is far worse than one that throws.

export const assertServer = (what = 'Tento modul') => {
    if (typeof window !== 'undefined') {
        throw new Error(`${what} je serverový a nesmí být importován v prohlížeči`)
    }
}

const required = (name) => {
    const value = process.env[name]
    if (!value) {
        throw new Error(
            `Chybí povinná proměnná prostředí ${name}. ` +
            'Viz src/cms/server/env.js pro seznam.'
        )
    }
    return value
}

const optional = (name, fallback) => process.env[name] || fallback

// --- Public (safe in the browser) -------------------------------------------

// Trailing slash matters: the project's .env has one and supabase-js builds
// `${url}/rest/v1` from it, producing a double slash. Normalise once.
export const supabaseUrl = () =>
    required('NEXT_PUBLIC_SUPABASE_URL').replace(/\/+$/, '')

export const supabaseAnonKey = () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY')

export const siteUrl = () =>
    optional('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000').replace(/\/+$/, '')

// --- Server only ------------------------------------------------------------

// Deliberately NOT prefixed NEXT_PUBLIC_. This key bypasses RLS entirely; if it
// ever appears in a client bundle the whole security model in
// migrations/0001_cms_tables.sql is void.
export const supabaseServiceRoleKey = () => {
    assertServer('SUPABASE_SERVICE_ROLE_KEY')
    return required('SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Is there a service-role key at all?
 *
 * This one question selects the persistence adapter (src/cms/server/fileStore).
 * It is asked rather than `required()` because "absent" is a state the project is
 * legitimately in — the key is the last thing to be configured — and the answer
 * has to be a boolean rather than an exception for the choice to be made at all.
 *
 * Trimmed, because the variable is PRESENT AND EMPTY in this project's .env, and
 * an empty string is a key that does not exist. `process.env` also turns an
 * unquoted blank into '' rather than undefined, so the two cases are one.
 */
export const hasServiceRoleKey = () =>
    Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim())

export const mediaBucket = () => optional('CMS_MEDIA_BUCKET', 'cms-media')

// Which StoragePort drives the bytes. The default is the same question the
// document store asks — a deployment with a service-role key has Supabase
// Storage behind it, one without has neither the key nor the bucket, and the
// two halves of the CMS choosing differently would mean rows in `.cms-dev` whose
// `url` points at a bucket that does not exist. CMS_STORAGE_DRIVER still
// overrides, which is how a MinIO/R2 driver would be selected later.
export const storageDriver = () =>
    optional('CMS_STORAGE_DRIVER', hasServiceRoleKey() ? 'supabase' : 'file')

// Salt for hashing client IPs used as rate-limit keys. Rate limiting needs a
// stable per-client key; GDPR says we should not be handling raw IPs without a
// basis, and this build took that position explicitly when it dropped ip_list.
// Hashing with a server-held salt gives the key without retaining the address.
export const ipHashSalt = () => {
    assertServer('CMS_IP_HASH_SALT')
    return optional('CMS_IP_HASH_SALT', '')
}

export const maxUploadBytes = () =>
    Number(optional('CMS_MAX_UPLOAD_BYTES', String(8 * 1024 * 1024)))

// CMS_BUILD_ID and VERCEL_GIT_COMMIT_SHA are read in
// src/cms/server/buildId.js rather than here. They are the one exception to
// this file's rule and it is worth naming: every variable above configures what
// this deployment DOES, and those two only say which deployment it IS — a fact
// the archive records beside a revision and nothing branches on. They are listed
// in ENV_REFERENCE below so the audit still finds them from one place.

// --- Authentication (src/cms/AUTH.md) ---------------------------------------

// Signs the session cookie. Required, with no fallback: a development default
// would be a value that also exists in the repository, and the one thing this
// secret has to be is unknown. Generate with
// `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
export const sessionSecret = () => {
    assertServer('CMS_SESSION_SECRET')
    return required('CMS_SESSION_SECRET')
}

// The bootstrap pair. Optional on purpose — once the first owner exists these
// do nothing at all, so a deployment that has been running for a year should be
// able to drop them without breaking. Returns null rather than throwing when
// unset; auth.js treats "unset" as "no seeding to do".
export const bootstrapAdmin = () => {
    assertServer('CMS_ADMIN_EMAIL')
    const email = optional('CMS_ADMIN_EMAIL', '').trim().toLowerCase()
    const password = optional('CMS_ADMIN_PASSWORD', '')
    if (!email || !password) return null
    return { email, password }
}

/**
 * Adresa Postgresu, nebo prázdno, když se jede na Supabase.
 *
 * Railway dává dvě: privátní jede vnitřní sítí (rychlejší, bez poplatku za
 * přenos) a zvenčí na ni není vidět; veřejná chodí přes proxy. Která je ta
 * správná, se pozná podle toho, kde běžíme — `RAILWAY_ENVIRONMENT` nastavuje
 * Railway samo. Vybírat to ručně by znamenalo přepínat při každém nasazení
 * a jednou na to zapomenout.
 */
export const databaseUrl = () => {
    const inside = Boolean(optional('RAILWAY_ENVIRONMENT', ''))
    const priv = optional('DATABASE_PRIVATE_URL', '')
    const pub = optional('DATABASE_URL', '')
    return (inside && priv) || pub || priv || ''
}

/** Kde leží média, když je nese S3 nebo MinIO. */
export const s3Config = () => ({
    endpoint: optional('CMS_S3_ENDPOINT', ''),
    bucket: optional('CMS_S3_BUCKET', 'cms-media'),
    accessKeyId: optional('CMS_S3_ACCESS_KEY_ID', ''),
    secretAccessKey: optional('CMS_S3_SECRET_ACCESS_KEY', ''),
    region: optional('CMS_S3_REGION', 'us-east-1'),
    // Adresa, ze které si soubor stahuje prohlížeč. Na privátní se nedostane.
    publicBase: optional('CMS_MEDIA_HOST', '') || optional('CMS_S3_PUBLIC_ENDPOINT', ''),
})

export const isProduction = () => process.env.NODE_ENV === 'production'

// Documented for humans; also used by scripts/cms-migrate.js to explain what
// is missing before it does anything.
export const ENV_REFERENCE = Object.freeze([
    {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        required: true,
        exists: true,
        note: 'Already set. Project REST endpoint.',
    },
    {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        required: true,
        exists: true,
        note: 'Already set. Used for public reads and for verifying user JWTs.',
    },
    {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        required: true,
        exists: false,
        note: 'NEW. Server-only, never NEXT_PUBLIC_. Supabase dashboard -> ' +
              'Project Settings -> API -> service_role. Bypasses RLS.',
    },
    {
        name: 'NEXT_PUBLIC_SITE_URL',
        required: false,
        exists: true,
        note: 'Already set. Base URL of the site.',
    },
    {
        name: 'CMS_SESSION_SECRET',
        required: true,
        exists: false,
        note: 'NEW. Server-only. Signs the session cookie so a forged one is ' +
              'rejected before it reaches the database. 32+ random bytes: ' +
              'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))". ' +
              'Rotating it signs everyone out, which is the intended way to ' +
              'invalidate every session at once.',
    },
    {
        name: 'CMS_ADMIN_EMAIL',
        required: false,
        exists: false,
        note: 'NEW. Seeds the first owner on the first sign-in attempt, and ' +
              'only while cms_user is empty. Inert forever after — see AUTH.md.',
    },
    {
        name: 'CMS_ADMIN_PASSWORD',
        required: false,
        exists: false,
        note: 'NEW. Hashed on first use and thrown away; never stored, never ' +
              'logged, never compared against a stored plaintext. Changing the ' +
              'password in the admin does not change this value and rotating ' +
              'this value does not change the password.',
    },
    {
        name: 'CMS_MEDIA_BUCKET',
        required: false,
        exists: false,
        note: 'NEW, optional. Defaults to "cms-media", matching the bucket the ' +
              'migration creates.',
    },
    {
        name: 'CMS_STORAGE_DRIVER',
        required: false,
        exists: false,
        note: 'NEW, optional. Defaults to "supabase" when ' +
              'SUPABASE_SERVICE_ROLE_KEY is set and to "file" (bytes under ' +
              '.cms-dev/media, served by /api/cms/asset) when it is not. The ' +
              'seam a MinIO/R2 driver would register against.',
    },
    {
        name: 'CMS_IP_HASH_SALT',
        required: false,
        exists: false,
        note: 'NEW, recommended in production. Random 32+ chars, server-only. ' +
              'Salts the rate-limit key and the ip_hash on cms_session so raw ' +
              'IPs are never held. Without it the limiter still works but the ' +
              'key is a bare unsalted hash.',
    },
    {
        name: 'CMS_MAX_UPLOAD_BYTES',
        required: false,
        exists: false,
        note: 'NEW, optional. Defaults to 8388608 (8 MiB).',
    },
    {
        name: 'CMS_BUILD_ID',
        required: false,
        exists: false,
        note: 'NEW, optional. Recorded on every revision as the identity of the ' +
              'deployed code, so the Archive can name which code replays an old ' +
              'body. Unset is normal on Vercel, which supplies ' +
              'VERCEL_GIT_COMMIT_SHA; set it only where that does not exist. ' +
              'Read in src/cms/server/buildId.js.',
    },
    {
        name: 'VERCEL_GIT_COMMIT_SHA',
        required: false,
        exists: false,
        note: 'Supplied by Vercel, not by anyone. A system environment variable ' +
              'exposed to builds and to functions at runtime; recorded on every ' +
              'revision when CMS_BUILD_ID is unset. Absent on a developer ' +
              'machine, where a revision honestly records no build at all.',
    },
])
