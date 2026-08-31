// Klient pro Postgres v řeči, kterou repozitáře mluví — SERVER ONLY.
//
// Šev je tady ze stejného důvodu, jaký popisuje fileStore/client.js: `documents.js`
// není tenký obal, drží model konceptů, tri-stav archivu a několik rozhodnutí,
// která by se v druhé implementaci musela zopakovat a rozešla by se při první
// úpravě. Zaměňuje se proto klient, ne repozitář — a nad ním běží všechno
// nezměněné.
//
// Implementuje přesně ty operace, které repozitáře dělají: select/insert/update/
// delete, filtry eq/neq/in/is/not/or/gt/gte/lt/lte/like/ilike, order/range/limit,
// single/maybeSingle a tři RPC. Cokoli jiného vyhodí chybu, místo aby to tiše
// prošlo — tichá odchylka mezi dvěma úložišti je nejdražší druh rozdílu.
//
// Odpovídá tvarem supabase-js: `{ data, error }`, nikdy nevyhazuje. Volající
// error kontrolují a výjimka by ten kód obešla.

import { createRequire } from 'node:module'

/**
 * `pg` se natahuje až ve chvíli, kdy se na Postgres opravdu jde.
 *
 * Napsané jako `import` nahoře by bylo tvrdou závislostí a projekt, který si
 * zvolil Supabase, by se bez něj nepostavil — bundler ho hledá při překladu,
 * ne až za běhu. Přesně to samé platí obráceně pro Supabase SDK; obojí je
 * volitelné a ani jedno nemá být povinné.
 */
const pgModule = () => {
    try {
        return createRequire(import.meta.url)('pg')
    } catch {
        throw new Error(
            'Chybí pg. Buď ho doinstaluj, nebo nastav klíče k Supabase a jeď na něm.',
        )
    }
}

/**
 * `pg` vrací nativní typy, PostgREST vrací JSON. Repozitáře jsou psané proti
 * JSONu, a nejde jen o pohodlí: `updated_at` se posílá zpátky jako značka pro
 * souběžné úpravy a porovnává se s uloženou hodnotou.
 *
 * Časová razítka se proto vrací tak, jak přišla z databáze — převod přes `Date`
 * ořízne mikrosekundy na milisekundy a přečtená hodnota by se do uložené nikdy
 * netrefila. Velká celá čísla a `numeric` vrací `pg` jako řetězce, protože se
 * nemusí vejít do JS čísla; počty a pořadí, které tudy chodí, se vejdou vždy.
 *
 * Nastaví se jednou, při první stavbě klienta.
 */
let typesReady = false
const alignTypes = (pg) => {
    if (typesReady) return
    const asIs = (value) => value
    pg.types.setTypeParser(1114, asIs)   // timestamp
    pg.types.setTypeParser(1184, asIs)   // timestamptz
    pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v)))    // int8
    pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v)))  // numeric
    typesReady = true
}

/* -------------------------------------------------------------------- SQL --- */

const ident = (name) => '"' + String(name).replace(/"/g, '""') + '"'

/**
 * Sloupec, jak ho píše PostgREST, do SQL.
 *
 * `data->>page` je cesta do JSONu bez uvozovek; SQL je chce: `data->>'page'`.
 * `query.js` staví filtry právě takhle, takže bez tohohle překladu by každý
 * dotaz nad polem dokumentu spadl na syntaxi.
 */
const columnSql = (expr) => {
    const raw = String(expr)
    if (!raw.includes('->')) return ident(raw)

    const parts = raw.split(/(->>|->)/)
    let out = ident(parts[0].trim())
    for (let i = 1; i < parts.length; i += 2) {
        const op = parts[i]
        const key = parts[i + 1].trim().replace(/^'|'$/g, '')
        out += `${op}'${key.replace(/'/g, "''")}'`
    }
    return out
}

/**
 * Seznam sloupců pro `select`.
 *
 * `*` zůstane hvězdičkou. Cesta do JSONu se přeloží a pojmenuje podle
 * posledního článku — PostgREST vrací `data->>page` pod klíčem `page` a kód nad
 * klientem to tak čte.
 */
const selectSql = (columns) => {
    const raw = String(columns).trim()
    if (!raw || raw === '*') return '*'
    return raw
        .split(',')
        .map((piece) => piece.trim())
        .filter(Boolean)
        .map((piece) => {
            if (!piece.includes('->')) return columnSql(piece)
            const last = piece.split(/->>|->/).pop().trim().replace(/^'|'$/g, '')
            return `${columnSql(piece)} as ${ident(last)}`
        })
        .join(', ')
}

const unsupported = (what) => {
    throw new Error(`[cms/pg] ${what} není v podmnožině, kterou tenhle klient implementuje.`)
}

/* ---------------------------------------------------------------- filtry --- */

const OPERATORS = {
    eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=',
    like: 'like', ilike: 'ilike',
}

/** Jeden filtr na kus SQL a jeho parametry. */
const filterSql = (filter, push) => {
    const { op, column, value, negate } = filter
    const col = columnSql(column)
    let sql

    if (op === 'is') {
        sql = value === null ? `${col} is null` : `${col} is ${value ? 'true' : 'false'}`
    } else if (op === 'in') {
        const list = [].concat(value)
        if (!list.length) return negate ? 'true' : 'false'
        sql = `${col} = any(${push(list)})`
    } else if (op === 'or') {
        // Vnitřek `or(...)` se skládá ze stejných filtrů, takže rekurze.
        return '(' + filter.terms.map((t) => filterSql(t, push)).join(' or ') + ')'
    } else if (OPERATORS[op]) {
        // Bez přetypování na text. Postgres si řetězcový parametr přivede na typ
        // sloupce sám, kdežto `::text` by z časového razítka udělalo
        // `2026-08-30 21:59:59.123456+00` a porovnání s ISO tvarem by nikdy
        // neplatilo — a přesně tím se posílá zpátky značka pro souběžné úpravy.
        // Cesta do JSONu (`data->>klíč`) je textová sama o sobě.
        sql = `${col} ${OPERATORS[op]} ${push(value)}`
    } else {
        unsupported(`operátor "${op}"`)
    }

    return negate ? `not (${sql})` : sql
}

/** `id.eq.1,slug.is.null` → filtry, které umí filterSql. */
const parseOr = (expression) => {
    const terms = []
    let depth = 0, start = 0
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
            let value = term.slice(second + 1)
            if (value === 'null') value = null
            terms.push({ op: term.slice(first + 1, second), column: term.slice(0, first), value })
        }
    }
    return { op: 'or', terms }
}

/* ---------------------------------------------------------------- dotaz --- */

class Query {
    constructor(pool, table) {
        this.pool = pool
        this.table = table
        this.filters = []
        this.orders = []
        this.action = null
        this.payload = null
        this.columns = '*'
        this.expect = null
        this.wantRows = false
        this.limitCount = null
        this.offset = 0
        this.countMode = null
        this.conflict = null
    }

    select(columns = '*', options = {}) {
        // Po insertu/updatu je `select()` žádost o vrácení řádků, ne nový dotaz.
        if (this.action) { this.wantRows = true; if (columns !== '*') this.columns = columns; return this }
        this.action = 'select'
        this.columns = columns
        if (options.count) this.countMode = options.count
        if (options.head) this.headOnly = true
        return this
    }

    insert(values) { this.action = 'insert'; this.payload = [].concat(values); return this }
    upsert(values, options = {}) {
        this.action = 'insert'
        this.payload = [].concat(values)
        this.conflict = options.onConflict || 'id'
        return this
    }
    update(patch) { this.action = 'update'; this.payload = patch; return this }
    delete(options = {}) {
        this.action = 'delete'
        if (options.count) this.countMode = options.count
        return this
    }

    #where(op, column, value, negate = false) {
        this.filters.push({ op, column, value, negate })
        return this
    }
    eq(c, v) { return this.#where('eq', c, v) }
    neq(c, v) { return this.#where('neq', c, v) }
    gt(c, v) { return this.#where('gt', c, v) }
    gte(c, v) { return this.#where('gte', c, v) }
    lt(c, v) { return this.#where('lt', c, v) }
    lte(c, v) { return this.#where('lte', c, v) }
    like(c, v) { return this.#where('like', c, v) }
    ilike(c, v) { return this.#where('ilike', c, v) }
    in(c, v) { return this.#where('in', c, v) }
    is(c, v) { return this.#where('is', c, v) }
    not(column, operator, value) { return this.#where(operator, column, value, true) }
    or(expression) { this.filters.push(parseOr(expression)); return this }

    order(column, { ascending = true, nullsFirst = false } = {}) {
        this.orders.push({ column, ascending, nullsFirst })
        return this
    }
    range(from, to) { this.offset = from; this.limitCount = to - from + 1; return this }
    limit(count) { this.limitCount = count; return this }
    single() { this.expect = 'single'; return this }
    maybeSingle() { this.expect = 'maybe'; return this }

    /* ------------------------------------------------------------ překlad --- */

    #build() {
        const params = []
        const push = (value) => { params.push(value); return '$' + params.length }
        const where = this.filters.length
            ? ' where ' + this.filters.map((f) => filterSql(f, push)).join(' and ')
            : ''

        const returning = this.wantRows || this.action === 'select' ? ` returning ${selectSql(this.columns)}` : ''

        if (this.action === 'insert') {
            const rows = this.payload
            const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
            const tuples = rows.map((row) =>
                '(' + cols.map((c) => push(row[c] === undefined ? null : row[c])).join(', ') + ')')
            let sql = `insert into ${ident(this.table)} (${cols.map(ident).join(', ')}) values ${tuples.join(', ')}`
            if (this.conflict) {
                const keys = this.conflict.split(',').map((k) => ident(k.trim())).join(', ')
                const set = cols.filter((c) => !this.conflict.includes(c))
                    .map((c) => `${ident(c)} = excluded.${ident(c)}`).join(', ')
                sql += set ? ` on conflict (${keys}) do update set ${set}` : ` on conflict (${keys}) do nothing`
            }
            return { sql: sql + returning, params }
        }

        if (this.action === 'update') {
            const cols = Object.keys(this.payload)
            const set = cols.map((c) => `${ident(c)} = ${push(this.payload[c])}`).join(', ')
            return { sql: `update ${ident(this.table)} set ${set}${where}${returning}`, params }
        }

        if (this.action === 'delete') {
            return { sql: `delete from ${ident(this.table)}${where}${returning}`, params }
        }

        const order = this.orders.length
            ? ' order by ' + this.orders.map((o) =>
                `${columnSql(o.column)} ${o.ascending ? 'asc' : 'desc'} nulls ${o.nullsFirst ? 'first' : 'last'}`).join(', ')
            : ''
        const limit = this.limitCount != null ? ` limit ${Number(this.limitCount)}` : ''
        const offset = this.offset ? ` offset ${Number(this.offset)}` : ''
        return { sql: `select ${selectSql(this.columns)} from ${ident(this.table)}${where}${order}${limit}${offset}`, params }
    }

    async #run() {
        let count = null

        // U zápisů je „počet" počet dotčených řádků a `pg` ho vrací sám.
        // Repozitář ho čte jako důkaz, že se něco stalo: `remove()` bez něj
        // hlásí „nenalezeno" i u řádku, který smazal.
        if (this.countMode && this.action !== 'select') {
            const { sql, params } = this.#build()
            const res = await this.pool.query(sql, params)
            return {
                data: this.wantRows ? res.rows : null,
                error: null,
                count: res.rowCount ?? 0,
            }
        }

        if (this.countMode) {
            const { params, sql } = this.#build()
            const whereOnly = sql.slice(sql.indexOf(' from '))
                .replace(/ order by [\s\S]*$/, '').replace(/ limit \d+/, '').replace(/ offset \d+/, '')
            const res = await this.pool.query(`select count(*)::int as n ${whereOnly}`, params)
            count = res.rows[0]?.n ?? 0
            if (this.headOnly) return { data: null, error: null, count }
        }

        const { sql, params } = this.#build()
        const res = await this.pool.query(sql, params)
        let data = res.rows

        if (this.expect === 'single' || this.expect === 'maybe') {
            if (data.length > 1) {
                return { data: null, count, error: { code: 'PGRST116', message: 'Dotaz vrátil více řádků, čekal se jeden' } }
            }
            if (!data.length) {
                if (this.expect === 'maybe') return { data: null, error: null, count }
                return { data: null, count, error: { code: 'PGRST116', message: 'Řádek nenalezen' } }
            }
            return { data: data[0], error: null, count }
        }

        if (this.action !== 'select' && !this.wantRows) data = null
        return { data, error: null, count }
    }

    then(resolve, reject) {
        return this.#run()
            .catch((error) => ({
                data: null,
                count: null,
                error: { code: error.code || 'server', message: error.message, details: error.detail ?? null },
            }))
            .then(resolve, reject)
    }
}

/* --------------------------------------------------------------- klient --- */

let pool = null

export const createPgClient = ({ connectionString, ssl }) => {
    if (!connectionString) throw new Error('[cms/pg] chybí DATABASE_URL')
    // Railway i většina hostovaných Postgresů mluví TLS s vlastním certifikátem;
    // ověřovat řetěz proti systémovým kořenům by spojení odmítlo.
    const pg = pgModule()
    alignTypes(pg)
    pool = pool || new pg.Pool({ connectionString, ssl: ssl ?? { rejectUnauthorized: false }, max: 8 })

    return {
        from: (table) => new Query(pool, table),

        async rpc(name, args = {}) {
            const keys = Object.keys(args)
            const call = keys.length
                ? `${ident(name)}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(', ')})`
                : `${ident(name)}()`
            try {
                const res = await pool.query(`select * from ${call}`, keys.map((k) => args[k]))
                // Funkce vracející jednu hodnotu ji vrátí jako jediný sloupec.
                const rows = res.rows
                if (rows.length === 1 && Object.keys(rows[0]).length === 1) {
                    return { data: Object.values(rows[0])[0], error: null }
                }
                return { data: rows, error: null }
            } catch (error) {
                return { data: null, error: { code: error.code || 'server', message: error.message } }
            }
        },

        // Postgres není úložiště souborů. Média jdou do S3; kdyby si o storage
        // někdo řekl, ať se to ozve tady a ne až u prázdné odpovědi.
        get storage() {
            throw new Error('[cms/pg] Postgres nemá úložiště souborů — použij CMS_STORAGE_DRIVER=s3')
        },
    }
}

export const closePgClient = async () => { if (pool) { await pool.end(); pool = null } }
