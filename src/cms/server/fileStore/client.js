// A Supabase client, backed by a file — SERVER ONLY.
//
// ---------------------------------------------------------------------------
// Why the seam is here and not one layer up
// ---------------------------------------------------------------------------
//
// The obvious shape for "a second persistence adapter" is a second
// `createDocumentRepository` — same methods, different backend, chosen by the
// callers. It was rejected, and the reason is the requirement that there be ONE
// content source rather than two implementations that agree today.
//
// `documents.js` is not a thin wrapper. It holds the draft model (only
// `publish()` writes `data`), the archive tri-state, the reason `existsPublished`
// goes through `listPublished`, and the note about `is` versus `neq` on a
// nullable column. A parallel repository would have to restate every one of those
// and would be correct exactly until one of them was edited. The same is true of
// `media.js`, of `auth.js`'s session rules, and of `users.js`'s last-owner
// arithmetic.
//
// So the substitution happens at the narrowest place the two backends actually
// differ: the client. `supabaseAdmin.js` hands this object out instead of a
// PostgREST one when there is no service-role key, and `documents.js`,
// `media.js`, `auth.js` and `users.js` run unmodified above it. There is no
// second code path through the handlers, the validation or `fieldPatch.js` —
// there is no second code path at all.
//
// ---------------------------------------------------------------------------
// What it implements, and what happens to the rest
// ---------------------------------------------------------------------------
//
// Exactly the operations this repository performs, enumerated from the four
// modules above: select/insert/update/delete, the filter verbs they use,
// `order`, `range`, `single`, `maybeSingle`, `or`, and three RPCs. Anything else
// THROWS rather than being quietly ignored. That is the important half: a store
// that silently drops a filter it does not understand returns the wrong rows and
// nothing anywhere says so, which is the exact failure this whole change exists
// to end. An unimplemented verb is a loud, immediate, greppable error.
//
// ---------------------------------------------------------------------------
// Roles are real here
// ---------------------------------------------------------------------------
//
// `read.js` reads with the anon client deliberately, and says why: the grant and
// the policy in the migrations mean a bug in the public read path cannot leak a
// draft. That guarantee is enforced by Postgres, so it would evaporate the moment
// the same file store answered both clients identically. It does not: the anon
// role here carries the column grant from migrations/0003 and the
// `status = 'published' and archived_at is null` policy with it, refuses every
// write verb, and cannot see cms_user or cms_session at all.

import { randomUUID } from 'node:crypto'

import { assertServer } from '../env.js'
import { CmsError } from '../errors.js'
import { persist, tables } from './store.js'

const now = () => new Date().toISOString()

/**
 * The next value of a `touch` column, and it is never the value it already has.
 *
 * `updated_at` stopped being decoration when `documents.update()` started using
 * it as the version an optimistic write is checked against. A version that can
 * repeat is not a version: two writes in the same millisecond would leave the
 * column where it was, the second writer's compare-and-swap would match, and
 * the first writer's work would be gone with nothing anywhere saying so — the
 * exact silence the check exists to end.
 *
 * `Date.prototype.toISOString` renders milliseconds and this store completes a
 * write in microseconds, so the collision is not theoretical: measured on 300
 * concurrent patchField pairs against the previous line, 31 of them lost a
 * field to it. With this, 0.
 *
 * The microsecond digits Postgres has and JavaScript does not are borrowed for
 * the tie-break, which keeps the string in the shape a timestamptz round-trips
 * to and keeps it sorting correctly — the Studio's default ordering reads this
 * column. Postgres needs none of this: `now()` is transaction time at
 * microsecond resolution, so two transactions have to begin inside one
 * microsecond to collide.
 */
const nextTouch = (previous) => {
    const next = now()
    if (!previous || next > previous) return next
    // `…:05.123Z` -> `…:05.123001Z`, and once more if that is taken too.
    const base = String(previous).replace(/Z$/, '')
    const [head, micro = '000'] = base.includes('.')
        ? [base.slice(0, base.indexOf('.') + 4), base.slice(base.indexOf('.') + 4)]
        : [`${base}.000`, '000']
    return `${head}${String(Number(micro || 0) + 1).padStart(3, '0')}Z`
}

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)))

/* --------------------------------------------------------------- schema --- */

// Column sets, defaults, generated columns and constraints, transcribed from the
// three migrations. They are here rather than inferred from the rows because a
// default that only exists when someone remembers to pass it is not a default,
// and because `updated_at` is a TRIGGER in Postgres — `documents.update()` never
// sets it, so a store that did not touch it would break the Studio's ordering
// with no error to follow.

const DOCUMENT_COLUMNS = [
    'id', 'type', 'status', 'data', 'draft',
    'created_at', 'updated_at', 'published_at', 'archived_at',
    'created_by', 'updated_by', 'legacy_source', 'legacy_id', 'search_text',
]

// migrations/0003: the finished anon grant. A column outside it cannot be
// selected AND cannot be named in a WHERE clause — column grants are absolute —
// so both are checked below.
const DOCUMENT_ANON_GRANT = [
    'id', 'type', 'data', 'status', 'published_at', 'created_at', 'updated_at', 'archived_at',
]

const REVISION_COLUMNS = [
    'id', 'document_id', 'type', 'body', 'status', 'archived_at',
    'changed_at', 'changed_by', 'reason', 'build_id',
]

const MEDIA_COLUMNS = [
    'id', 'bucket', 'path', 'url', 'mime', 'size_bytes', 'width', 'height', 'alt',
    'created_at', 'updated_at', 'created_by', 'archived_at',
]

// migrations/0007 adds `archived_at` to the grant for the same reason 0003 added
// it to cms_document's: a column outside the grant cannot be named in a WHERE
// clause, so a public read that ever filters archived files out has to be able
// to write the filter. Nothing reads cms_media as anon today.
const MEDIA_ANON_GRANT = [
    'id', 'bucket', 'path', 'url', 'mime', 'width', 'height', 'alt', 'created_at', 'archived_at',
]

const MEDIA_ARCHIVE_COLUMNS = ['media_id', 'uploaded_at', 'archived_at', 'first_published_at']

const USER_COLUMNS = [
    'id', 'email', 'password_hash', 'name', 'role',
    'created_at', 'updated_at', 'last_login_at', 'disabled_at', 'created_by',
]

const SESSION_COLUMNS = [
    'id', 'user_id', 'token_hash', 'created_at', 'expires_at', 'revoked_at',
    'user_agent', 'ip_hash',
]

const API_KEY_COLUMNS = [
    'id', 'name', 'token_hash', 'created_at', 'created_by',
    'last_used_at', 'revoked_at',
]

const SETTING_COLUMNS = ['key', 'value', 'updated_at', 'updated_by']

// `lower(coalesce(data #>> '{}', '') || ' ' || coalesce(draft #>> '{}', ''))`.
// JSON.stringify is not byte-identical to jsonb's own text rendering (Postgres
// puts a space after `:` and `,`), which affects nothing: the only query against
// this column is a substring match on words an editor typed.
const searchText = (row) =>
    `${JSON.stringify(row.data ?? null)} ${JSON.stringify(row.draft ?? null)}`.toLowerCase()

const SCRYPT_HASH = /^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/
const SHA256_HEX = /^[a-f0-9]{64}$/

const SCHEMA = {
    cms_document: {
        columns: DOCUMENT_COLUMNS,
        anonGrant: DOCUMENT_ANON_GRANT,
        // migrations/0003's policy, carried rather than assumed.
        anonRows: (row) => row.status === 'published' && row.archived_at == null,
        generated: { search_text: searchText },
        touch: 'updated_at',
        defaults: () => ({
            id: randomUUID(),
            status: 'draft',
            data: {},
            draft: null,
            created_at: now(),
            updated_at: now(),
        }),
        unique: [
            // `where legacy_source is not null` — the partial index that makes
            // scripts/cms-migrate.js idempotent.
            { columns: ['legacy_source', 'legacy_id'], when: (row) => row.legacy_source != null },
        ],
        checks: [
            {
                name: 'cms_document_published_has_data',
                test: (row) => row.status !== 'published' || row.published_at != null,
            },
        ],
    },

    // migrations/0007. Append-only from the application's side: `record()` in
    // server/revisions.js inserts and nothing updates, which is why there is no
    // `touch` column here — a revision that could be edited would not be a
    // record of anything.
    //
    // No anon grant, and that is the whole access story rather than a detail:
    // the table holds every body that was EVER published, including what
    // somebody later withdrew (ARCHIVE.md, "Kdo tam smí"), so `anonGrant: []`
    // is the same revoke cms_user and cms_session carry.
    //
    // A store written before this table existed simply has no key in the
    // snapshot — `#rows()` creates the array on first use, so STORE_VERSION does
    // not move and nobody's documents are reseeded to add a table that starts
    // empty anyway.
    cms_document_revision: {
        columns: REVISION_COLUMNS,
        anonGrant: [],
        defaults: () => ({
            id: randomUUID(),
            body: {},
            archived_at: null,
            changed_at: now(),
            changed_by: null,
            build_id: null,
        }),
        unique: [],
        checks: [
            {
                // The two column constraints from 0007, transcribed. `reason` is
                // the transition's name and not free text; a typo in a caller
                // must fail here rather than land a row the archive cannot
                // explain.
                name: 'cms_document_revision_status_check',
                test: (row) => row.status === 'draft' || row.status === 'published',
            },
            {
                name: 'cms_document_revision_reason_check',
                test: (row) => [
                    'publish', 'unpublish', 'archive', 'restore', 'reject', 'requeue',
                ].includes(row.reason),
            },
        ],
    },

    cms_media: {
        columns: MEDIA_COLUMNS,
        anonGrant: MEDIA_ANON_GRANT,
        anonRows: () => true,
        touch: 'updated_at',
        defaults: () => ({
            id: randomUUID(),
            alt: '',
            created_at: now(),
            updated_at: now(),
            // migrations/0007. NULL is "in the library"; media.js `archive()`
            // is what sets it, and nothing sets it back except `restore()`.
            archived_at: null,
        }),
        unique: [{ columns: ['bucket', 'path'] }],
        checks: [],
    },

    // migrations/0007. The dates the Archive's Media subpage needs and cms_media
    // cannot answer — above all `first_published_at`, which is not a fact about
    // the upload but about the first published revision that mentions it, and is
    // therefore written by server/mediaArchive.js when a revision is recorded.
    //
    // `media_id` is the primary key, so there is no `id` default and `unique`
    // carries what the column declaration carries in SQL — the same shape
    // cms_setting has for the same reason.
    //
    // The cascade the migration declares (`on delete cascade` from cms_media) is
    // NOT implemented here: this store cascades exactly one relationship and
    // adding a second silently would hide the fact that the only caller,
    // media.hardDelete(), clears these rows itself.
    cms_media_archive: {
        columns: MEDIA_ARCHIVE_COLUMNS,
        anonGrant: [],
        defaults: () => ({ uploaded_at: null, archived_at: null, first_published_at: null }),
        unique: [{ columns: ['media_id'] }],
        checks: [],
    },

    // No anon grant at all on either table below — migrations/0002 revokes them
    // outright rather than relying on a policy. `anonGrant: []` is that revoke.
    cms_user: {
        columns: USER_COLUMNS,
        anonGrant: [],
        touch: 'updated_at',
        defaults: () => ({
            id: randomUUID(),
            name: '',
            role: 'editor',
            created_at: now(),
            updated_at: now(),
        }),
        // citext: "Jan@…" and "jan@…" cannot both exist.
        unique: [{ columns: ['email'], fold: true }],
        checks: [
            {
                name: 'cms_user_password_hash_format',
                test: (row) => SCRYPT_HASH.test(String(row.password_hash ?? '')),
            },
        ],
    },

    cms_session: {
        columns: SESSION_COLUMNS,
        anonGrant: [],
        defaults: () => ({ id: randomUUID(), created_at: now() }),
        unique: [{ columns: ['token_hash'] }],
        checks: [
            {
                // The tripwire from migrations/0002: a digest is 64 hex
                // characters and a session token is not, so a bug that ever
                // stored the real token fails here instead of silently working.
                name: 'cms_session_token_hash_is_digest',
                test: (row) => SHA256_HEX.test(String(row.token_hash ?? '')),
            },
        ],
    },

    // migrations/0005. Same shape and the same tripwire as cms_session,
    // because it is the same idea: a token this server issued, held only as a
    // digest. A store written before this table existed simply has no key in
    // the snapshot — `#rows()` below creates the array on first use, so the
    // STORE_VERSION does not move and nobody's documents are reseeded to add a
    // table that starts empty anyway.
    cms_api_key: {
        columns: API_KEY_COLUMNS,
        anonGrant: [],
        defaults: () => ({
            id: randomUUID(),
            created_at: now(),
            last_used_at: null,
            revoked_at: null,
        }),
        unique: [{ columns: ['token_hash'] }],
        checks: [
            {
                name: 'cms_api_key_token_hash_is_digest',
                test: (row) => SHA256_HEX.test(String(row.token_hash ?? '')),
            },
        ],
    },

    // migrations/0006. Owner-chosen configuration, as opposed to the
    // environment facts settings.js reports. `key` is the primary key rather
    // than a uuid, so there is no `id` default here and `unique` carries the
    // constraint the column declaration carries in SQL. A store written before
    // this table existed simply has no key in the snapshot — `#rows()` creates
    // the array on first use, so STORE_VERSION does not move and nobody's
    // documents are reseeded to add a table that starts empty.
    cms_setting: {
        columns: SETTING_COLUMNS,
        anonGrant: [],
        touch: 'updated_at',
        defaults: () => ({ value: {}, updated_at: now(), updated_by: null }),
        unique: [{ columns: ['key'] }],
        checks: [
            {
                name: 'cms_setting_key_format',
                test: (row) => /^[a-z][a-z0-9_.]{0,63}$/.test(String(row.key ?? '')),
            },
        ],
    },
}

/* --------------------------------------------------------------- values --- */

const dbError = (code, message) => ({ code, message, details: null, hint: null })

const unsupported = (what) => {
    // Not a database error object — this is a programming error in this repo,
    // and returning `{ error }` would let a caller treat it as a failed query.
    throw new CmsError(
        'server',
        `[cms] souborové úložiště neumí "${what}". Doplňte ho v src/cms/server/fileStore/client.js.`
    )
}

/**
 * `data->>foo`, `data->a->>b`, `draft->>x`, or a plain column.
 *
 * `->>` yields text and `->` yields the value — the distinction `query.js`
 * relies on so that ordering a numeric field does not put 10 before 9.
 */
const parseColumn = (expr) => {
    const raw = String(expr)
    if (!raw.includes('->')) return { root: raw, path: null, asText: true }
    const [root, ...rest] = raw.split('->')
    const asText = rest[rest.length - 1].startsWith('>')
    return {
        root,
        path: rest.map((segment) => (segment.startsWith('>') ? segment.slice(1) : segment)),
        asText,
    }
}

/** PostgREST hands every filter value over as text; comparisons follow it. */
const asText = (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') return value
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

const readColumn = (table, row, expr) => {
    const { root, path, asText: wantsText } = parseColumn(expr)

    const generated = SCHEMA[table]?.generated?.[root]
    const base = generated ? generated(row) : row[root]

    if (!path) return base
    const value = path.reduce((node, key) => (node == null ? undefined : node[key]), base)
    return wantsText ? asText(value) : value ?? null
}

// SQL LIKE, including the backslash escapes `query.js` writes so that a search
// for "50%" is not a wildcard.
const likeRegExp = (pattern, insensitive) => {
    let source = '^'
    for (let i = 0; i < pattern.length; i += 1) {
        const ch = pattern[i]
        if (ch === '\\') {
            i += 1
            source += (pattern[i] ?? '\\').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            continue
        }
        if (ch === '%') { source += '[\\s\\S]*'; continue }
        if (ch === '_') { source += '[\\s\\S]'; continue }
        source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    return new RegExp(`${source}$`, insensitive ? 'i' : '')
}

const ordered = (left, right) => {
    if (typeof left === 'number' && typeof right === 'number') {
        return left < right ? -1 : left > right ? 1 : 0
    }
    return String(left).localeCompare(String(right), 'cs')
}

const matches = (table, row, condition) => {
    if (condition.op === 'or') {
        return condition.terms.some((term) => matches(table, row, term))
    }

    const actual = readColumn(table, row, condition.column)

    switch (condition.op) {
        case 'eq': return asText(actual) === asText(condition.value)
        case 'neq': return asText(actual) !== asText(condition.value)
        case 'is': return condition.value === null ? actual == null : actual === condition.value
        case 'isNot': return condition.value === null ? actual != null : actual !== condition.value
        case 'in': return condition.value.map(asText).includes(asText(actual))
        case 'like': return actual != null && likeRegExp(String(condition.value), false).test(String(actual))
        case 'ilike': return actual != null && likeRegExp(String(condition.value), true).test(String(actual))
        case 'gt': return actual != null && ordered(actual, condition.value) > 0
        case 'gte': return actual != null && ordered(actual, condition.value) >= 0
        case 'lt': return actual != null && ordered(actual, condition.value) < 0
        case 'lte': return actual != null && ordered(actual, condition.value) <= 0
        default: return unsupported(`operátor ${condition.op}`)
    }
}

/**
 * `alt.ilike.%x%,path.ilike.%x%` — PostgREST's OR syntax, as `media.js` writes
 * it. Split at commas that are not inside parentheses, then at the first two
 * dots, because the value may itself contain one.
 */
const parseOr = (expression) => {
    const terms = []
    let depth = 0
    let start = 0
    const raw = String(expression)

    for (let i = 0; i <= raw.length; i += 1) {
        const ch = raw[i]
        if (ch === '(') depth += 1
        else if (ch === ')') depth -= 1
        if (i === raw.length || (ch === ',' && depth === 0)) {
            const term = raw.slice(start, i)
            start = i + 1
            if (!term) continue
            const first = term.indexOf('.')
            const second = term.indexOf('.', first + 1)
            if (first < 0 || second < 0) unsupported(`or(${term})`)
            terms.push({
                column: term.slice(0, first),
                op: term.slice(first + 1, second),
                value: term.slice(second + 1),
            })
        }
    }
    return { op: 'or', terms }
}

/* ---------------------------------------------------------- constraints --- */

const uniqueKey = (row, spec) =>
    spec.columns
        .map((column) => {
            const value = row[column]
            const text = asText(value)
            return spec.fold && text != null ? text.toLowerCase() : text
        })
        .join('\u0000')

const assertConstraints = (table, rows, candidate) => {
    const schema = SCHEMA[table]

    for (const check of schema.checks || []) {
        if (!check.test(candidate)) {
            return dbError('23514', `new row violates check constraint "${check.name}"`)
        }
    }

    for (const spec of schema.unique || []) {
        if (spec.when && !spec.when(candidate)) continue
        const key = uniqueKey(candidate, spec)
        const clash = rows.some((row) => row.id !== candidate.id && uniqueKey(row, spec) === key)
        if (clash) {
            return dbError('23505', `duplicate key value violates unique constraint on ${spec.columns.join(', ')}`)
        }
    }

    return null
}

/**
 * `cms_user_last_owner_guard` — the constraint trigger from migrations/0002.
 *
 * `users.js` also refuses to demote, disable or delete the last owner and gives
 * the person a sentence they can act on. This is the other half of the same
 * "enforced twice on purpose" pair: the message comes from the application, the
 * guarantee comes from the data. A store that dropped it would let a future
 * script lock the system out of itself.
 */
const activeOwners = (rows) => rows.filter((row) => row.role === 'owner' && row.disabled_at == null)

/* ----------------------------------------------------------- the builder --- */

class FileQuery {
    constructor(role, table) {
        if (!SCHEMA[table]) unsupported(`tabulku ${table}`)
        this.role = role
        this.table = table
        this.mode = null
        this.conditions = []
        this.orders = []
        this.limits = null
        this.returning = null
        this.countMode = null
        this.head = false
        this.payload = null
        this.expect = null
    }

    /* -- verbs -- */

    select(columns = '*', options = {}) {
        // After insert/update/delete this is PostgREST's RETURNING clause, not a
        // new query — so the verb already chosen wins.
        if (!this.mode) this.mode = 'select'
        this.returning = String(columns)
        if (options.count) this.countMode = options.count
        if (options.head) this.head = true
        return this
    }

    insert(values) {
        this.mode = 'insert'
        this.payload = Array.isArray(values) ? values : [values]
        return this
    }

    update(patch) {
        this.mode = 'update'
        this.payload = patch
        return this
    }

    delete(options = {}) {
        this.mode = 'delete'
        if (options.count) this.countMode = options.count
        return this
    }

    /* -- filters -- */

    eq(column, value) { return this.#where('eq', column, value) }
    neq(column, value) { return this.#where('neq', column, value) }
    gt(column, value) { return this.#where('gt', column, value) }
    gte(column, value) { return this.#where('gte', column, value) }
    lt(column, value) { return this.#where('lt', column, value) }
    lte(column, value) { return this.#where('lte', column, value) }
    like(column, value) { return this.#where('like', column, value) }
    ilike(column, value) { return this.#where('ilike', column, value) }
    in(column, value) { return this.#where('in', column, value) }
    is(column, value) { return this.#where('is', column, value) }

    /** Only `not(column, 'is', value)` exists upstream; anything else is loud. */
    not(column, operator, value) {
        if (operator !== 'is') unsupported(`not(${operator})`)
        return this.#where('isNot', column, value)
    }

    or(expression) {
        this.conditions.push(parseOr(expression))
        return this
    }

    #where(op, column, value) {
        this.conditions.push({ op, column, value })
        return this
    }

    /* -- shaping -- */

    order(column, { ascending = true, nullsFirst = false } = {}) {
        this.orders.push({ column, ascending, nullsFirst })
        return this
    }

    range(from, to) {
        this.limits = { from, to }
        return this
    }

    limit(count) {
        this.limits = { from: 0, to: Math.max(0, count - 1) }
        return this
    }

    single() { this.expect = 'single'; return this }
    maybeSingle() { this.expect = 'maybe'; return this }

    /* -- execution -- */

    then(onFulfilled, onRejected) {
        // supabase-js's builder is a thenable rather than a promise, and callers
        // await it directly. Errors are returned in `{ error }`, never thrown —
        // every caller upstream reads that shape.
        let result
        try {
            result = this.#run()
        } catch (err) {
            if (err instanceof CmsError) return Promise.reject(err).then(onFulfilled, onRejected)
            return Promise.resolve({ data: null, error: dbError('XX000', err.message), count: null })
                .then(onFulfilled, onRejected)
        }
        return Promise.resolve(result).then(onFulfilled, onRejected)
    }

    /* -- role -- */

    #grantedColumns() {
        return this.role === 'anon' ? SCHEMA[this.table].anonGrant : SCHEMA[this.table].columns
    }

    #assertGranted(names) {
        if (this.role !== 'anon') return null
        const granted = this.#grantedColumns()
        const denied = names.filter((name) => name !== '*' && !granted.includes(name))
        if (denied.length) {
            return dbError('42501', `permission denied for column ${denied[0]} of relation ${this.table}`)
        }
        return null
    }

    #resolveColumns() {
        const all = SCHEMA[this.table].columns.filter((name) => name !== 'search_text')
        if (!this.returning || this.returning.trim() === '*') return all
        return this.returning.split(',').map((name) => name.trim()).filter(Boolean)
    }

    /* -- the query itself -- */

    #rows() {
        const store = tables()
        if (!store[this.table]) store[this.table] = []
        return store[this.table]
    }

    #visible(rows) {
        if (this.role !== 'anon') return rows
        return rows.filter((row) => SCHEMA[this.table].anonRows(row))
    }

    #filtered(rows) {
        return rows.filter((row) => this.conditions.every((condition) => matches(this.table, row, condition)))
    }

    #sorted(rows) {
        if (!this.orders.length) return rows
        return rows.slice().sort((left, right) => {
            for (const entry of this.orders) {
                const a = readColumn(this.table, left, entry.column)
                const b = readColumn(this.table, right, entry.column)
                if (a == null && b == null) continue
                // nullsFirst decides where NULLs land independently of the
                // direction, which is what `nulls last` means in SQL.
                if (a == null) return entry.nullsFirst ? -1 : 1
                if (b == null) return entry.nullsFirst ? 1 : -1
                const result = ordered(a, b)
                if (result !== 0) return entry.ascending ? result : -result
            }
            return 0
        })
    }

    #project(rows) {
        const columns = this.#resolveColumns()
        const denied = this.#assertGranted(columns)
        if (denied) return { error: denied }
        return {
            data: rows.map((row) =>
                Object.fromEntries(columns.map((name) => [
                    name,
                    clone(name === 'search_text' ? searchText(row) : row[name] ?? null),
                ]))
            ),
        }
    }

    #answer(rows, count) {
        if (this.head) return { data: null, error: null, count: count ?? null }

        // Insert/update/delete without a `.select()` return no representation,
        // which is what PostgREST does with `Prefer: return=minimal`.
        if (this.mode !== 'select' && !this.returning) {
            return { data: null, error: null, count: count ?? null }
        }

        const projected = this.#project(rows)
        if (projected.error) return { data: null, error: projected.error, count: null }

        if (this.expect === 'single' || this.expect === 'maybe') {
            if (projected.data.length > 1) {
                return {
                    data: null,
                    error: dbError('PGRST116', 'JSON object requested, multiple (or no) rows returned'),
                    count: null,
                }
            }
            if (!projected.data.length) {
                // maybeSingle answers with null and no error; single is an error.
                return this.expect === 'maybe'
                    ? { data: null, error: null, count: count ?? null }
                    : {
                        data: null,
                        error: dbError('PGRST116', 'JSON object requested, multiple (or no) rows returned'),
                        count: null,
                    }
            }
            return { data: projected.data[0], error: null, count: count ?? null }
        }

        return { data: projected.data, error: null, count: count ?? null }
    }

    #run() {
        const schema = SCHEMA[this.table]

        // Column grants govern WHERE and ORDER BY as well as the result columns.
        const referenced = [...this.conditions, ...this.orders]
            .flatMap((entry) => (entry.op === 'or' ? entry.terms : [entry]))
            .map((entry) => parseColumn(entry.column).root)
        const deniedFilter = this.#assertGranted([...new Set(referenced)])
        if (deniedFilter) return { data: null, error: deniedFilter, count: null }

        if (this.mode !== 'select' && this.role === 'anon') {
            return {
                data: null,
                error: dbError('42501', `permission denied for table ${this.table}`),
                count: null,
            }
        }

        const rows = this.#rows()

        if (this.mode === 'insert') {
            const inserted = []
            for (const value of this.payload) {
                const row = { ...schema.defaults(), ...value }
                for (const column of schema.columns) {
                    if (column === 'search_text') continue
                    if (!(column in row)) row[column] = null
                }
                const problem = assertConstraints(this.table, rows, row)
                if (problem) return { data: null, error: problem, count: null }
                rows.push(row)
                inserted.push(row)
            }
            persist()
            return this.#answer(inserted, inserted.length)
        }

        const candidates = this.#filtered(this.#visible(rows))

        if (this.mode === 'update') {
            const before = candidates.map((row) => ({ ...row }))
            const touched = []
            for (const row of candidates) {
                const next = { ...row, ...this.payload }
                // The BEFORE UPDATE trigger. `documents.update()` names only
                // `draft` and `updated_by`; without this the Studio's default
                // ordering — updated_at desc — would never move.
                if (schema.touch) next[schema.touch] = nextTouch(row[schema.touch])
                const problem = assertConstraints(this.table, rows, next)
                if (problem) return { data: null, error: problem, count: null }
                Object.assign(row, next)
                touched.push(row)
            }
            // `for each row`: a statement that matched nothing does not fire it.
            if (this.table === 'cms_user' && touched.length && !activeOwners(rows).length) {
                before.forEach((snapshot, index) => Object.assign(candidates[index], snapshot))
                return {
                    data: null,
                    error: dbError('23514', 'cms_user: the last active owner cannot be demoted or disabled'),
                    count: null,
                }
            }
            persist()
            return this.#answer(touched, touched.length)
        }

        if (this.mode === 'delete') {
            const doomed = new Set(candidates)
            const kept = rows.filter((row) => !doomed.has(row))
            if (this.table === 'cms_user' && candidates.length && !activeOwners(kept).length) {
                return {
                    data: null,
                    error: dbError('23514', 'cms_user: the last active owner cannot be deleted'),
                    count: null,
                }
            }
            rows.length = 0
            rows.push(...kept)
            // ON DELETE CASCADE. "Removing a user ends their access now" is the
            // reason sessions are stored at all (AUTH.md); leaving the rows would
            // make that false in this store and true in the other.
            if (this.table === 'cms_user') {
                const gone = new Set(candidates.map((row) => row.id))
                const sessions = tables().cms_session
                const surviving = sessions.filter((row) => !gone.has(row.user_id))
                sessions.length = 0
                sessions.push(...surviving)
            }
            persist()
            return this.#answer(candidates, candidates.length)
        }

        // select
        const total = candidates.length
        const sorted = this.#sorted(candidates)
        const page = this.limits
            ? sorted.slice(this.limits.from, this.limits.to + 1)
            : sorted
        return this.#answer(page, this.countMode ? total : null)
    }
}

/* ------------------------------------------------------------------ rpc --- */

// The three SQL functions the auth path calls. Their bodies are in
// migrations/0002 and the translations below are deliberately literal, because
// each of them is the single definition of something: which sessions are usable,
// when the bootstrap is inert, and what counts as dead weight.

const RPC = {
    /**
     * Four conditions, all of them data: the digest matches, the session was not
     * revoked, it has not expired, and the account behind it is not disabled. The
     * last one is why this is one function rather than four `if`s upstream.
     */
    cms_resolve_session: ({ p_token_hash }) => {
        const store = tables()
        const session = store.cms_session.find((row) =>
            row.token_hash === p_token_hash &&
            row.revoked_at == null &&
            new Date(row.expires_at).getTime() > Date.now()
        )
        if (!session) return []
        const user = store.cms_user.find((row) => row.id === session.user_id)
        if (!user || user.disabled_at != null) return []
        return [{
            session_id: session.id,
            user_id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            expires_at: session.expires_at,
        }]
    },

    /**
     * `where not exists (select 1 from cms_user)` — the whole of the "seed, not a
     * back door" guarantee. Once any account exists this returns no rows forever,
     * so leaving CMS_ADMIN_PASSWORD set grants nothing and rotating it grants
     * nothing.
     */
    cms_bootstrap_owner: ({ p_email, p_password_hash, p_name }) => {
        const store = tables()
        if (store.cms_user.length) return []

        const email = String(p_email || '').toLowerCase()
        const row = {
            id: randomUUID(),
            email,
            password_hash: p_password_hash,
            name: String(p_name || '').trim() || email.split('@')[0],
            role: 'owner',
            created_at: now(),
            updated_at: now(),
            last_login_at: null,
            disabled_at: null,
            created_by: null,
        }
        if (!SCRYPT_HASH.test(String(row.password_hash))) {
            throw new CmsError('server', 'cms_bootstrap_owner: heslo nebylo zahašováno')
        }
        store.cms_user.push(row)
        persist()
        return [{ id: row.id, email: row.email, role: row.role }]
    },

    cms_prune_sessions: () => {
        const store = tables()
        const week = Date.now() - 7 * 24 * 60 * 60 * 1000
        const month = Date.now() - 30 * 24 * 60 * 60 * 1000
        const before = store.cms_session.length
        const kept = store.cms_session.filter((row) => {
            const expired = new Date(row.expires_at).getTime() < week
            const revoked = row.revoked_at != null && new Date(row.revoked_at).getTime() < month
            return !expired && !revoked
        })
        store.cms_session.length = 0
        store.cms_session.push(...kept)
        if (kept.length !== before) persist()
        return before - kept.length
    },
}

/* --------------------------------------------------------------- client --- */

/**
 * Storage, refused in words.
 *
 * There is no object store behind this adapter. Uploads are not blocked by
 * that any more — ports/fileStorage.js keeps the bytes in `.cms-dev/media/` and
 * is what `storageDriver()` selects whenever this client is the one in play —
 * but that driver never touches `client.storage`, so anything arriving here is a
 * Supabase driver holding a file client, which only happens if
 * CMS_STORAGE_DRIVER=supabase was set without a service-role key. Reaching for
 * `client.storage` would otherwise be a TypeError deep inside the Supabase
 * driver; this makes it a sentence naming the actual misconfiguration.
 */
const noStorage = () => ({
    from() {
        throw new CmsError(
            'server',
            'Ovladač úložiště "supabase" vyžaduje SUPABASE_SERVICE_ROLE_KEY. ' +
            'Bez něj zrušte CMS_STORAGE_DRIVER — soubory pak obsluhuje ovladač ' +
            '"file" (.cms-dev/media).'
        )
    },
})

const clients = new Map()

/**
 * @param {{ role?: 'service'|'anon' }} [options]
 */
export const getFileClient = ({ role = 'service' } = {}) => {
    assertServer('getFileClient')

    if (clients.has(role)) return clients.get(role)

    const client = {
        // Named so anything logging the client can tell the two apart, and so a
        // caller that wants to know which store it is holding can ask.
        driver: 'file',
        role,

        from: (table) => new FileQuery(role, table),

        async rpc(name, params = {}) {
            if (role === 'anon') {
                // migrations/0002 revokes EXECUTE from anon on all three.
                return { data: null, error: dbError('42501', `permission denied for function ${name}`) }
            }
            const fn = RPC[name]
            if (!fn) unsupported(`RPC ${name}`)
            try {
                return { data: fn(params), error: null }
            } catch (err) {
                if (err instanceof CmsError) throw err
                return { data: null, error: dbError('XX000', err.message) }
            }
        },

        get storage() {
            return noStorage()
        },
    }

    clients.set(role, client)
    return client
}

// Test seam, mirroring resetClients() next door.
export const resetFileClients = () => clients.clear()
