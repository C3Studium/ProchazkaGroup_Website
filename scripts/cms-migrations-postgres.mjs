#!/usr/bin/env node
// Ze Supabase migrací udělá variantu pro čistý Postgres.
//
// Převádí, nekopíruje. Druhá řada migrací by byla druhý zdroj pravdy a rozešla
// by se s tím prvním při první změně schématu — a rozdíl by se projevil až tam,
// kde se to nasadí.
//
// Co Supabase má a holý Postgres ne:
//
//   schéma `extensions`     na Supabase tam bydlí rozšíření; jinde jsou v public
//   `auth.users`            tabulka Supabase Auth; CMS má vlastní cms_user
//   role anon/authenticated tvoří je Supabase; grant na ně by spadl
//   RLS a politiky          chrání před anonymním klíčem, který mimo Supabase
//                           neexistuje — aplikace se připojuje jako vlastník
//   schéma `storage`        bucket policies; na MinIO je řeší úložiště samo
//
// Co se vynechá, se vypíše. Tiché vynechání je způsob, jak se dozvědět o chybějícím
// indexu až z pomalého dotazu v produkci.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.join(HERE, '..', 'migrations')

/**
 * Rozdělí SQL na příkazy.
 *
 * Středník je konec příkazu jen tam, kde je opravdu kódem: ne v řádkovém
 * komentáři, ne v blokovém, ne v apostrofovém řetězci a ne v $$ těle funkce.
 * Naivní split na ";" tohle nerozliší a rozsekne příkaz uprostřed — výsledek
 * se nedá spustit a chyba ukáže na řádek, který s příčinou nesouvisí.
 */
const statements = (sql) => {
    const out = []
    let buf = ''
    let i = 0
    while (i < sql.length) {
        const rest = sql.slice(i)

        if (rest.startsWith('--')) {
            const end = sql.indexOf('\n', i)
            const stop = end === -1 ? sql.length : end
            buf += sql.slice(i, stop); i = stop; continue
        }
        if (rest.startsWith('/*')) {
            const end = sql.indexOf('*/', i + 2)
            const stop = end === -1 ? sql.length : end + 2
            buf += sql.slice(i, stop); i = stop; continue
        }
        if (sql[i] === "'") {
            let j = i + 1
            while (j < sql.length) {
                if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue }
                if (sql[j] === "'") { j++; break }
                j++
            }
            buf += sql.slice(i, j); i = j; continue
        }
        const dollar = rest.match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/)
        if (dollar) {
            const tag = dollar[0]
            const end = sql.indexOf(tag, i + tag.length)
            const stop = end === -1 ? sql.length : end + tag.length
            buf += sql.slice(i, stop); i = stop; continue
        }
        if (sql[i] === ';') { out.push(buf.trim()); buf = ''; i++; continue }

        buf += sql[i]; i++
    }
    if (buf.trim()) out.push(buf.trim())
    return out.filter(Boolean)
}

const SKIP = [
    // grant i revoke: role tvoří Supabase a odkaz na neexistující roli je chyba,
    // ne mlčky přeskočený řádek.
    [/^\s*(grant|revoke)\b[\s\S]*\b(anon|authenticated|service_role)\b/i, 'práva pro roli, kterou tvoří Supabase'],
    [/^\s*alter\s+default\s+privileges[\s\S]*\b(anon|authenticated|service_role)\b/i, 'výchozí práva pro roli Supabase'],
    [/^\s*create\s+policy/i, 'RLS politika — mimo Supabase není anonymní klíč, před kterým by chránila'],
    [/enable\s+row\s+level\s+security/i, 'RLS — aplikace se připojuje jako vlastník'],
    [/\bstorage\.(buckets|objects)\b/i, 'politika pro Supabase Storage — na MinIO to řeší úložiště'],
    // Cokoli ze schématu `auth` — nejen tabulka users, ale i auth.jwt() uvnitř
    // těla funkce. `cms_is_editor()` na něm celá stojí: ptá se, jestli e-mail
    // z JWT patří editorovi. Mimo Supabase žádné JWT není a členství se ověřuje
    // v server/auth.js, takže ta funkce i to, co na ni navazuje, odpadá.
    [/\bauth\.(users|jwt|uid|role)\b/i, 'sahá na Supabase Auth'],
    [/\bcms_is_editor\b/i, 'navazuje na cms_is_editor(), který mimo Supabase nevzniká'],
]

const convert = (sql) => {
    const kept = [], skipped = []
    for (const raw of statements(sql)) {
        // Nejdřív oprava, potom rozhodnutí o vynechání. Obráceně by se zahodila
        // celá `create table`, jen protože jeden její sloupec ukazuje cizím
        // klíčem na auth.users — a tabulka je potřeba, ten klíč ne. CMS má
        // vlastní cms_user a autora si drží tam.
        const stmt = raw.replace(
            /\s*references\s+auth\.users\s*\([^)]*\)(\s+on\s+delete\s+[a-z ]+)?/gi,
            '',
        )
        const bare = stmt.replace(/--[^\n]*/g, '').trim()
        if (!bare) continue

        const hit = SKIP.find(([re]) => re.test(bare))
        if (hit) { skipped.push([bare.split('\n')[0].slice(0, 72), hit[1]]); continue }

        kept.push(
            stmt
                .replace(/\s+with\s+schema\s+extensions/gi, '')
                .replace(/\bextensions\./gi, ''),
        )
    }
    return { kept, skipped }
}

// Vstupem je jen číslovaná řada. Výstup leží od přesunu ve stejné složce, a
// bez tohoto filtru by si ho druhé spuštění přibralo mezi vstupy a zdvojilo
// celé schéma do sebe sama.
const files = readdirSync(DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort()
    // 0004 zamyká legacy tabulky proti anonymnímu klíči Supabase; tady nedává smysl.
    .filter((f) => !f.startsWith('0004'))

let out = '-- VYGENEROVÁNO scripts/cms-migrations-postgres.mjs — needituj.\n\n'
let totalSkipped = 0
for (const file of files) {
    const { kept, skipped } = convert(readFileSync(path.join(DIR, file), 'utf8'))
    out += `\n-- ===== ${file} =====\n` + kept.join(';\n\n') + ';\n'
    console.log(`  ${file}: ${kept.length} příkazů, ${skipped.length} vynecháno`)
    for (const [head, why] of skipped) console.log(`      – ${head}   \x1b[2m(${why})\x1b[0m`)
    totalSkipped += skipped.length
}

const target = path.join(HERE, '..', 'migrations', 'migrations-postgres.sql')
writeFileSync(target, out)
console.log(`\n  zapsáno: ${path.relative(path.join(HERE, '..'), target)} (${out.split('\n').length} řádků, vynecháno ${totalSkipped})`)
