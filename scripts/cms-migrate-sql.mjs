#!/usr/bin/env node
/**
 * Pustí SQL z `migrations/` proti databázi — totéž, co v knihovně dělá
 * `valecms migrate`.
 *
 * Proč vlastní soubor a ne binárka z balíčku: tenhle projekt balíček
 * nepoužívá. Má vendorovanou kopii v `src/cms/`, takže i spouštěč migrací
 * musí bydlet tady, jinak by příkaz sahal do cizího repozitáře a přestal by
 * platit ve chvíli, kdy ho tam někdo nemá.
 *
 *     pnpm run cms:migrate                 ukáže plán, nic nespustí
 *     pnpm run cms:migrate -- --url="…"    spustí proti té databázi
 *     pnpm run cms:migrate -- --yes        neptá se
 *
 * Bez `--url` se bere `DATABASE_URL` z prostředí. Na Supabase přes PostgREST
 * DDL nejde, takže tam příkaz vypíše, co vložit do SQL Editoru — a s přímým
 * připojovacím řetězcem (Project Settings → Database → Connection string,
 * ta přímá, ne pooler) to pustí sám.
 *
 * Pozor na jméno: `cms:seed` a `scripts/cms-migrate.js` jsou něco jiného —
 * ty stěhují DATA ze staré databáze. Tohle je schéma.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// `next dev` načte .env, holý node ne. Co je v prostředí, vyhrává.
const loadEnvFile = () => {
    for (const name of ['.env.local', '.env']) {
        const file = path.join(ROOT, name)
        if (!fs.existsSync(file)) continue
        for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
            const at = trimmed.indexOf('=')
            const key = trimmed.slice(0, at).trim()
            if (!(key in process.env)) process.env[key] = trimmed.slice(at + 1).trim()
        }
    }
}

loadEnvFile()

const argv = process.argv.slice(2)
const flags = {}
for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') flags.yes = true
    else if (arg === '--dry-run') flags.dryRun = true
    else if (arg.startsWith('--')) {
        const [name, value] = arg.slice(2).split('=')
        flags[name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value ?? true
    }
}

const { runMigrate } = await import('../src/cms/install/migrate.mjs')

// Jak se to volá tady. Nápověda uvnitř končí řádkem „spusť tohle" a bez tohohle
// by tam stálo `valecms migrate` — příkaz, který v tomhle projektu není, protože
// balíček tu není. `-- ` před přepínači kvůli pnpm, které by je jinak snědlo samo.
process.exit((await runMigrate({ ...flags, command: 'pnpm run cms:migrate', flagSep: '-- ' })) || 0)
