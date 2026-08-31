#!/usr/bin/env node
// Spustí Next s pojmenovanými env soubory.
//
// Next načítá jen ustálenou sadu jmen — .env, .env.local, .env.development,
// .env.production. `.env.apptest` mezi ně nepatří a sám od sebe se nepřečte,
// takže by stačilo jedno spuštění ze zvyku a web by tiše jel proti něčemu
// jinému, než si člověk myslí. Tenhle skript je proto výslovný: co načetl,
// vypíše.
//
// Pořadí rozhoduje a dřívější vyhrává. Proměnná už nastavená v shellu vyhrává
// nad vším — jednorázový override z příkazové řádky se nemá přebíjet souborem.
//
//   node scripts/run-with-env.js --env .env.apptest --env .env.test dev -p 3700

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

/** Řádky `KLÍČ=hodnota`, komentáře pryč, uvozovky sundané. */
const parse = (text) => {
    const out = {}
    for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const at = trimmed.indexOf('=')
        if (at === -1) continue
        const key = trimmed.slice(0, at).trim()
        let value = trimmed.slice(at + 1).trim()
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }
        if (key) out[key] = value
    }
    return out
}

const files = []
const rest = []
for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--env') files.push(process.argv[++i])
    else rest.push(process.argv[i])
}

if (!files.length) {
    console.error('run-with-env: chybí --env <soubor>')
    process.exit(1)
}

const env = { ...process.env }
const loaded = []
for (const file of files) {
    const at = path.join(root, file)
    if (!fs.existsSync(at)) {
        console.error(`run-with-env: ${file} neexistuje`)
        process.exit(1)
    }
    const values = parse(fs.readFileSync(at, 'utf8'))
    let added = 0
    for (const [key, value] of Object.entries(values)) {
        // Prázdná hodnota je nevyplněný zástupce, ne "nastav na prázdno".
        if (env[key] !== undefined || value === '') continue
        env[key] = value
        added++
    }
    loaded.push(`${file} (${added})`)
}

console.log(`\n  env: ${loaded.join(' → ')}`)
const target = env.DATABASE_URL ? 'Postgres' : env.NEXT_PUBLIC_SUPABASE_URL ? 'Supabase' : 'nenakonfigurováno'
const storage = env.CMS_STORAGE_DRIVER || (env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'file')
console.log(`  databáze: ${target} · úložiště: ${storage}\n`)

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(process.execPath, [nextBin, ...rest], { stdio: 'inherit', env })
child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 0)
})
