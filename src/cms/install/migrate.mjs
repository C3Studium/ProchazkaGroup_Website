// `valecms migrate` — pustit SQL proti databázi.
//
// Do 0.1.27 tenhle příkaz neexistoval a instalace končila větou "migrace
// spouštíš ručně". To je návod jen pro toho, kdo už ví, kam je vložit; pro
// každého dalšího to byla slepá ulička, ve které všechno ostatní vypadá
// zdravě. Build projde, Studio se otevře, přihlášení řekne "Přihlášení se
// nezdařilo" — protože účet, se kterým by se porovnávalo, nemá kde vzniknout.
// Skutečná hláška jde do konzole serveru.
//
// Migrace jsou psané tak, aby se daly pustit znovu (`if not exists`, `drop`
// před `create`), takže se tu nevede tabulka s tím, co už proběhlo. Je to
// méně kódu a hlavně to nemá jak zestárnout: stav rozhoduje databáze, ne náš
// záznam o ní.
//
// Supabase přes tenhle příkaz jde taky, ale jen s připojovacím řetězcem —
// PostgREST DDL nespouští. Kdo ho nemá po ruce, dostane cestu do SQL editoru.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { survey } from './detect.mjs'
import { session, confirm, heading, note, style, Cancelled } from './prompt.mjs'

const { bold, dim, orange } = style
const line = (text = '') => process.stdout.write(text + '\n')

const MIGRATIONS_DIR = 'migrations'

/**
 * Jak se ten příkaz jmenuje TADY.
 *
 * Nápověda končí větou „spusť tohle" a ta věta musí být spustitelná v projektu,
 * který ji čte. V balíčku je to `valecms migrate`. Ve vendorované kopii, která
 * binárku z balíčku nemá, je to skript v package.json — a vypsat tam
 * `valecms migrate` znamená poslat člověka na příkaz, který neexistuje.
 *
 * `flagSep` je tu kvůli pnpm: `pnpm run cms:migrate --url=…` by přepínač snědl
 * pnpm samo, teprve `-- --url=…` ho pustí dál do skriptu.
 */
const naming = (flags) => {
    const command = flags.command || 'valecms migrate'
    const sep = flags.flagSep || ''
    return { command, withFlags: (args) => `${command} ${sep}${args}` }
}

/** Jen číslované migrace, v pořadí podle jména. */
const NUMBERED = /^\d+[_-]/

/** Proměnné z env souborů projektu. Jen ty s hodnotou. */
const envValues = (root) => {
    const values = new Map()
    for (const file of ['.env', '.env.local', '.env.development', '.env.production']) {
        const at = path.join(root, file)
        if (!existsSync(at)) continue
        for (const raw of readFileSync(at, 'utf8').split('\n')) {
            const match = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
            if (!match) continue
            // Uvozovky kolem hodnoty jsou v .env běžné a do connection stringu
            // nepatří — s nimi `pg` hlásí neplatnou adresu.
            const value = match[2].trim().replace(/^["']|["']$/g, '')
            if (value) values.set(match[1], value)
        }
    }
    return values
}

/**
 * Adresa databáze. Pořadí jako za běhu (`server/env.js`), aby příkaz sahal
 * tam, kam potom sáhne aplikace.
 *
 * Privátní adresa Railway je vidět jen zevnitř Railway; `valecms migrate` se
 * pouští z notebooku, takže se tu bere veřejná jako první — opačně než na
 * serveru. Kdyby se to řídilo `RAILWAY_ENVIRONMENT`, spadlo by to na
 * nedostupném hostu s hláškou o DNS.
 */
const connectionString = (values, flags) =>
    flags.url || values.get('DATABASE_URL') || values.get('DATABASE_PRIVATE_URL') || ''

/** Soubory k puštění, v pořadí podle jména. */
const migrationFiles = (root, sub = null) => {
    const dir = sub ? path.join(root, sub) : path.join(root, MIGRATIONS_DIR)
    if (!existsSync(dir)) return []
    const sql = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()
    // Nečíslované soubory se vynechávají, a je to úmysl. Ve složce běžně leží
    // `migrations-postgres.sql` — slepenec všech ostatních, který generuje
    // scripts/cms-migrations-postgres.mjs pro vložení do SQL Editoru jedním
    // vrzem. Pustit ho po nich znamená pustit úplně všechno podruhé: dneska to
    // projde, protože každý objekt vzniká přes IF NOT EXISTS, ale první
    // migrace, která idempotentní nebude, na tom spadne. A spadne až u zákazníka.
    const skipped = sql.filter((name) => !NUMBERED.test(name))
    return {
        files: sql
            .filter((name) => NUMBERED.test(name))
            .map((name) => ({ name, at: path.join(dir, name) })),
        skipped,
    }
}

/**
 * `pg` z projektu, ne z balíčku.
 *
 * Knihovna ho nemá mezi závislostmi — instaluje si ho projekt, který si zvolil
 * Postgres. Hledá se proto od jeho `package.json`; `import 'pg'` odsud by
 * hledalo vedle nás a nenašlo nic.
 */
const projectPg = (root) => {
    try {
        return createRequire(path.join(root, 'package.json'))('pg')
    } catch {
        return null
    }
}

/**
 * Supabase bez připojovacího řetězce — přes Management API.
 *
 * PostgREST neumí DDL, ale Management API ano: `POST /v1/projects/{ref}
 * /database/query` pustí libovolné SQL. A co k tomu potřebuje, už v projektu
 * leží — odkaz na projekt je v `NEXT_PUBLIC_SUPABASE_URL` a přihlášení
 * v `SUPABASE_ACCESS_TOKEN`. Nikdo tedy nemusí nikam chodit pro heslo
 * k databázi, což je přesně ten krok, na kterém to dosud vázlo.
 *
 * Service role key na tohle nestačí a nikdy nebude: je to JWT pro API bránu
 * jednoho projektu, kdežto tohle je účet, který ten projekt vlastní.
 */
const projectRef = (values) => {
    const url = values.get('NEXT_PUBLIC_SUPABASE_URL') || values.get('SUPABASE_URL') || ''
    return url.match(/https:\/\/([a-z0-9]{16,})\.supabase\./)?.[1] || null
}

const managementToken = (values, flags) =>
    flags.token || values.get('SUPABASE_ACCESS_TOKEN') || ''

/** Jeden soubor přes Management API. Vrací `null`, nebo text chyby. */
const runViaManagement = async ({ ref, token, sql }) => {
    let response
    try {
        response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: sql }),
        })
    } catch (error) {
        return `spojení selhalo: ${error.message}`
    }
    if (response.ok) return null
    const body = await response.text()
    let message = body.slice(0, 300)
    try { message = JSON.parse(body).message || message } catch { /* text stačí */ }
    return `HTTP ${response.status}: ${message}`
}

const supabaseHelp = (files, say) => {
    heading('Supabase')
    note('PostgREST neumí DDL, takže tudy to nejde. Dvě cesty:')
    line('')
    line(`  ${bold('a)')} Supabase → SQL Editor, vložit a spustit v tomhle pořadí:`)
    for (const file of files) line(`       ${dim(MIGRATIONS_DIR + '/' + file.name)}`)
    line('')
    line(`  ${bold('b)')} Nebo rovnou odsud, a nejspíš tudy: stačí token účtu.`)
    line(`       ${dim('Supabase → Account → Access Tokens → Generate new token')}`)
    line('')
    line(`       Zapiš ho do ${dim('.env')} jako ${bold('SUPABASE_ACCESS_TOKEN')}. Odkaz na projekt`)
    line(`       si příkaz vezme z NEXT_PUBLIC_SUPABASE_URL a pustí SQL přes`)
    line(`       Management API — bez hesla k databázi:`)
    line(`       ${orange(say.command)}`)
    line('')
    line(`  ${bold('c)')} Nebo přímým připojením. Řetězec najdeš v:`)
    line(`       ${dim('Project Settings → Database → Connection string → URI')}`)
    line('')
    // Klíče Supabase v .env.local na tohle nestačí: service role key je JWT
    // pro API bránu, ne heslo do Postgresu, takže se z nich adresa odvodit
    // nedá. Musí přibýt jako vlastní proměnná — a pak už ji příkaz bere sám.
    line(`       Zapiš ho do ${dim('.env')} jako ${bold('DATABASE_URL')} a příkaz`)
    line(`       ho přečte sám, teď i při každém dalším spuštění:`)
    line(`       ${orange(say.command)}`)
    line('')
    line(`       Jednorázově, bez zápisu do .env:`)
    line(`       ${orange(say.withFlags('--url="postgresql://…"'))}`)
    line('')
}

export const runMigrate = async (flags = {}) => {
    const found = survey()
    if (!found.root) { line('  Nenašel jsem package.json. Spusť to v projektu.'); return 1 }

    const say = naming(flags)
    const { files, skipped } = migrationFiles(found.root)

    heading('Migrace')
    note(`${found.name} · ${MIGRATIONS_DIR}/`)

    if (!files.length) {
        line(`\n  Ve složce ${MIGRATIONS_DIR}/ nejsou žádné číslované .sql soubory.`)
        note('Zakládá je `valecms init`. Když jsi ji smazal, spusť init znovu.')
        line('')
        return 1
    }

    // Vynechané se vypisují, ne zamlčují: tiché přeskočení souboru ve složce
    // migrací vypadá stejně jako migrace, která se pustila a nic neudělala.
    const manual = migrationFiles(path.join(found.root, MIGRATIONS_DIR), 'manual')
    if (manual.files.length) {
        // Vypsat, ne spustit. Ve složce `manual/` leží SQL, které si žádá, aby
        // ho člověk přečetl: destruktivní, nebo psané pro jeden konkrétní
        // projekt. Mlčet o něm by znamenalo, že o něm ten člověk neví.
        note(`Ručně (nespouštím): ${manual.files.map((f) => f.name).join(', ')} — proč, říká manual/README.md`)
    }

    if (skipped.length) {
        note(`Vynecháno (není číslovaná migrace): ${skipped.join(', ')}`)
        // Konkrétně u slepence to říct naplno. Jmenuje se jako migrace, leží
        // mezi migracemi a do Supabase se pustit NESMÍ: generátor z něj sype
        // RLS politiky i granty pro anon ven, protože mimo Supabase ty role
        // nejsou. Na Supabase by z toho vzniklo schéma bez row-level security.
        if (skipped.some((name) => name.includes('migrations-postgres'))) {
            note('Slepenec `migrations-postgres.sql` je pro holý Postgres, ne pro Supabase — nemá RLS.')
        }
    }

    const values = envValues(found.root)
    const url = connectionString(values, flags)

    // Bez připojovacího řetězce to ještě není konec: Supabase se dá obsloužit
    // tím, co v projektu už je. Teprve když ani to nevyjde, přijde na řadu
    // návod s SQL Editorem.
    if (!url) {
        const ref = projectRef(values)
        const token = managementToken(values, flags)

        if (ref && token) {
            heading('Supabase')
            note(`projekt ${ref} · přes Management API, bez hesla k databázi`)
            line('')

            if (flags.dryRun) {
                for (const file of files) line(`  ${dim('·')} ${MIGRATIONS_DIR}/${file.name}`)
                line('')
                note('Nanečisto — nic se nespustilo.')
                line('')
                return 0
            }

            if (!flags.yes) {
                const asked = await session(async (ask) =>
                    confirm(ask, `Pustit ${files.length} souborů proti projektu ${ref}?`, true))
                if (asked === Cancelled || !asked) { line('\n  Nic jsem nespustil.\n'); return 1 }
            }

            let failed = 0
            for (const file of files) {
                const sql = readFileSync(path.join(found.root, MIGRATIONS_DIR, file.name), 'utf8')
                const error = await runViaManagement({ ref, token, sql })
                if (error) {
                    failed += 1
                    line(`  ${orange('✗')} ${file.name} — ${error}`)
                    // Zastavit hned: migrace na sebe navazují a pouštět další
                    // proti schématu, které nevzniklo, vyrobí druhou chybu,
                    // která tu první zakryje.
                    break
                }
                line(`  ${dim('✓')} ${file.name}`)
            }
            line('')
            if (failed) {
                note('Token odmítnut nebo SQL neprošlo. Nový token: Supabase → Account → Access Tokens.')
                note(`Nebo cestou a) níž, přes SQL Editor.`)
                line('')
                supabaseHelp(files, say)
                return 1
            }
            note('Hotovo.')
            line('')
            return 0
        }

        supabaseHelp(files, say)
        return 1
    }

    const pg = projectPg(found.root)
    if (!pg) {
        line('\n  Chybí balíček `pg`.')
        note(`Doinstaluj ho: ${found.manager} add pg`)
        line('')
        return 1
    }

    heading('Spustím')
    for (const file of files) {
        const bytes = readFileSync(file.at, 'utf8').length
        line(`  ${orange('~')} ${MIGRATIONS_DIR}/${file.name} ${dim(`${(bytes / 1024).toFixed(1)} kB`)}`)
    }
    // Hostitel, nikdy celá adresa: connection string nese heslo a tenhle výpis
    // končí v historii terminálu, ve screenshotech a v issue.
    let host = '(neznámý)'
    try { host = new URL(url).host } catch {}
    note(`proti ${host}`)

    if (flags.dryRun) { line(`\n  --dry-run: nic jsem nespustil.\n`); return 0 }

    if (!flags.yes) {
        const { interactive, rl, close } = session()
        if (!interactive) { line('\n  Není terminál — spusť to s --yes.\n'); close(); return 1 }
        try {
            const go = await confirm(rl, { question: `Pustit ${files.length} souborů proti ${host}?`, def: true })
            if (!go) { line('\n  Nic jsem nespustil.\n'); return 0 }
        } catch (error) {
            if (error instanceof Cancelled) { line('\n  Nic jsem nespustil.\n'); return 0 }
            throw error
        } finally { close() }
    }

    /**
     * Připojení: nejdřív přes TLS, a když server TLS neumí, tak bez něj.
     *
     * `rejectUnauthorized: false`, protože Railway i Supabase mají certifikát,
     * který Node bez CA balíčku neověří — a odmítnout ho znamená nepřipojit se
     * vůbec. Je to jednorázový příkaz z notebooku proti adrese, kterou zadal
     * člověk, ne trvalé spojení aplikace.
     *
     * Zkoušet oboje a ne jen to první: Postgres v Dockeru ani `brew` TLS
     * nezapíná, takže vynucené SSL rozbije přesně ten případ, ve kterém se to
     * zkouší poprvé — vlastní databáze na localhostu.
     */
    const connect = async () => {
        for (const ssl of [{ rejectUnauthorized: false }, false]) {
            const candidate = new pg.Client({ connectionString: url, ssl })
            try {
                await candidate.connect()
                return candidate
            } catch (error) {
                await candidate.end().catch(() => {})
                if (ssl && /does not support SSL/i.test(error.message)) continue
                throw error
            }
        }
        return null
    }

    let client
    try {
        client = await connect()
    } catch (error) {
        line(`\n  Nepřipojil jsem se: ${error.message}`)
        note('Zkontroluj DATABASE_URL — u Railway je to ta veřejná adresa, ne .railway.internal.')
        line('')
        return 1
    }

    const done = []
    try {
        for (const file of files) {
            const sql = readFileSync(file.at, 'utf8')
            // Každý soubor ve vlastní transakci. Jeden celý blok by při chybě
            // ve třetím souboru vrátil i dva, které prošly, a příště by se
            // pouštěly znovu — což je sice bezpečné, ale zbytečné a matoucí.
            await client.query('begin')
            try {
                await client.query(sql)
                await client.query('commit')
                done.push(file.name)
                line(`  ${'\x1b[32m✓\x1b[0m'} ${file.name}`)
            } catch (error) {
                await client.query('rollback')
                line(`  ${'\x1b[31m✗\x1b[0m'} ${file.name}`)
                line('')
                line(`  ${error.message}`)
                if (error.hint) note(error.hint)
                // Kde v souboru to bylo. Bez toho se v deseti kilobajtech SQL
                // hledá řádek podle chybové hlášky, což je hledání naslepo.
                if (error.position) {
                    const upto = sql.slice(0, Number(error.position))
                    note(`řádek ${upto.split('\n').length} v ${MIGRATIONS_DIR}/${file.name}`)
                }
                line('')
                note(`Prošlo: ${done.length ? done.join(', ') : 'nic'}. Zbytek neběžel.`)
                line('')
                return 1
            }
        }
    } finally {
        await client.end()
    }

    heading('Hotovo')
    line(`  ${done.length} souborů proti ${host}`)
    note('Teď se dá přihlásit do Studia — první účet vznikne z CMS_ADMIN_EMAIL a CMS_ADMIN_PASSWORD.')
    line('')
    return 0
}
