#!/usr/bin/env node
/**
 * cms-import-public — put the site's committed assets into the media library.
 *
 *   node scripts/cms-import-public.mjs            dry run: print the plan
 *   node scripts/cms-import-public.mjs --write     actually insert
 *   node scripts/cms-import-public.mjs --help      flags
 *
 * DRY RUN IS THE DEFAULT AND --write IS THE ONLY WAY PAST IT.
 *
 * The library already holds 36 rows the seed put there, and they are the ones a
 * seeded document happened to reference. Everything else in `public/` — most of
 * the backgrounds, every casual portrait, the benefit cards, the zoom shots —
 * exists on disk and is invisible to an editor, who therefore cannot pick it.
 * This closes that gap.
 *
 * NO BYTES MOVE. A row points at `/assets/…`, which is the same thing
 * `fileStore/hydrate.js` does and for the reason `media.js importRow()` spells
 * out: a committed site asset has no object in any bucket, and copying it into
 * one would leave the library pointing at a duplicate of a file the repository
 * already serves. Cropping one later writes the crop to the bucket and leaves
 * the original where it is — see src/cms/MEDIA.md.
 *
 * Idempotent: `(bucket, path)` is unique in 0001, and a path already in the
 * library is skipped rather than inserted again.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cmsDatabase from '../cms.database.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const loadEnvFile = () => {
    const file = path.join(ROOT, '.env')
    if (!fs.existsSync(file)) return
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const at = trimmed.indexOf('=')
        if (at === -1) continue
        const name = trimmed.slice(0, at).trim()
        if (process.env[name] === undefined) process.env[name] = trimmed.slice(at + 1).trim()
    }
}

loadEnvFile()
const database = cmsDatabase.applyDatabaseEnv()

/**
 * Which directories are offered, and why the list is a list.
 *
 * Not "everything under public/". Three kinds of file in there must not become
 * library rows an editor can drop onto a page:
 *
 *   Fonts/          typefaces; the site loads them by @font-face, not by pick
 *   assets/svg/     an SVG is a script host — media.js refuses the type on
 *                   upload for exactly this reason, and importing one behind
 *                   that check would be a way around it
 *   assets/seo/     the share images. They belong to a <meta> tag, and an
 *                   editor dropping the Open Graph card into a page is a
 *                   mistake nothing would catch
 *   assets/prebuild/ intermediates, not artwork
 */
const DIRECTORIES = [
    'assets/backgrounds',
    'assets/benefit-cards',
    'assets/portraits',
    'assets/video',
    'assets/zoom',
]

const MIME_BY_EXT = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
}

const colour = process.stdout.isTTY
const c = {
    dim: (s) => (colour ? `\x1b[2m${s}\x1b[0m` : s),
    bold: (s) => (colour ? `\x1b[1m${s}\x1b[0m` : s),
    red: (s) => (colour ? `\x1b[31m${s}\x1b[0m` : s),
    green: (s) => (colour ? `\x1b[32m${s}\x1b[0m` : s),
}

const walk = (dir) => {
    const out = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walk(full))
        // .DS_Store and friends: a dotfile is never artwork.
        else if (!entry.name.startsWith('.')) out.push(full)
    }
    return out
}

const rest = async (method, pathAndQuery, body, extraHeaders = {}) => {
    const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    if (!base || !key) throw new Error('Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY')

    const response = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
        method,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`${method} ${pathAndQuery}: HTTP ${response.status} ${text.slice(0, 200)}`)
    return text ? JSON.parse(text) : null
}

/**
 * The dimensions the FILE declares, not the ones somebody typed.
 *
 * The seed's fixtures carry hard-coded sizes, and 25 of 116 rows disagreed with
 * the file they point at — `/assets/portraits/business/5.webp` was stored as
 * 1200×1600 and is 6830×6831. That is not cosmetic: `next/image` computes the
 * aspect ratio from these two numbers, so a wrong pair reserves the wrong space
 * and the page moves under the reader as the image arrives.
 *
 * Checked three ways before believing it — sharp, the project's own
 * `imageProbe`, and macOS `sips` all agree with each other and disagree with
 * the stored value.
 */
const dimensionsOf = async (buffer, mime) => {
    if (!mime.startsWith('image/')) return { width: null, height: null }
    try {
        const { default: sharp } = await import('sharp')
        const meta = await sharp(buffer).metadata()
        return { width: meta.width ?? null, height: meta.height ?? null }
    } catch {
        return { width: null, height: null }
    }
}

const main = async () => {
    const args = process.argv.slice(2)
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
  cms-import-public — zapíše soubory z public/ do knihovny médií

  node scripts/cms-import-public.mjs [flags]

  --write    Provede zápis. Bez něj je to dry run a nic se nezapíše.
  --fix-dimensions
             Přepočítá šířku a výšku u řádků, které už v knihovně jsou, podle
             skutečných souborů. Fixtury seedu je mají natvrdo a rozcházejí se.
  --help     Tato nápověda.

  Bere tyto adresáře a nic jiného:
${DIRECTORIES.map((d) => `    public/${d}`).join('\n')}

  Nekopíruje bajty. Řádek ukazuje na /assets/… — soubor zůstává v repozitáři,
  přesně jako u 36 řádků, které tam dnes založil seed. Viz src/cms/MEDIA.md.
`)
        return
    }
    const write = args.includes('--write')
    const fixDimensions = args.includes('--fix-dimensions')

    console.log('')
    console.log(c.bold('  cms-import-public — plán'))
    console.log(c.dim(`  ${cmsDatabase.describeDatabase(database)}`))
    console.log(c.dim(`  režim: ${write ? c.red('ZÁPIS') : c.green('dry run (nic se nezapíše)')}`))
    console.log('')

    const existing = new Map(
        (await rest('GET', 'cms_media?select=id,path,width,height&limit=2000')).map((row) => [row.path, row]),
    )
    const bucket = process.env.CMS_MEDIA_BUCKET || 'cms-media'

    const rows = []
    const skipped = []
    const unsupported = []
    const mismatched = []

    for (const directory of DIRECTORIES) {
        const base = path.join(ROOT, 'public', directory)
        if (!fs.existsSync(base)) continue

        for (const file of walk(base).sort()) {
            const url = `/${path.relative(path.join(ROOT, 'public'), file).split(path.sep).join('/')}`
            const mime = MIME_BY_EXT[path.extname(file).toLowerCase()]

            if (!mime) { unsupported.push(url); continue }

            if (existing.has(url)) { skipped.push(url); continue }

            const buffer = fs.readFileSync(file)
            const { width, height } = await dimensionsOf(buffer, mime)
            const now = new Date().toISOString()

            rows.push({
                id: crypto.randomUUID(),
                bucket,
                path: url,
                url,
                mime,
                size_bytes: buffer.length,
                width,
                height,
                // Left empty on purpose: guessing a description from a filename
                // produces alt text nobody ever corrects. Same call the seed and
                // UploadZone already make.
                alt: '',
                created_at: now,
                updated_at: now,
                created_by: null,
            })
        }
    }

    /**
     * The repair pass runs over every row that points into `public/`, not only
     * over the directories this tool imports.
     *
     * The wrong dimensions came from the seed's fixtures, and the seed put rows
     * in folders this tool does not manage — `/logos/orbit` among them. Scoping
     * the check to the import list found 11 of the 25 bad rows and reported
     * that as if it were all of them.
     */
    if (fixDimensions) {
        for (const [url, row] of existing) {
            if (!url.startsWith('/')) continue
            const onDisk = path.join(ROOT, 'public', url.replace(/^\/+/, ''))
            if (!fs.existsSync(onDisk)) continue

            const mime = MIME_BY_EXT[path.extname(onDisk).toLowerCase()]
            if (!mime || !mime.startsWith('image/')) continue

            const { width, height } = await dimensionsOf(fs.readFileSync(onDisk), mime)
            if (!width || (width === row.width && height === row.height)) continue

            mismatched.push({
                id: row.id,
                path: url,
                was: `${row.width}×${row.height}`,
                now: `${width}×${height}`,
                width,
                height,
            })
        }
        mismatched.sort((a, b) => a.path.localeCompare(b.path, 'cs'))
    }

    const byDirectory = {}
    for (const row of rows) {
        const key = row.path.split('/').slice(0, 3).join('/')
        byDirectory[key] = (byDirectory[key] || 0) + 1
    }

    console.log(c.bold('  K zápisu'))
    for (const [directory, count] of Object.entries(byDirectory).sort()) {
        console.log(`    ${directory.padEnd(34)} ${String(count).padStart(3)}`)
    }
    console.log(`    ${'—'.repeat(38)}`)
    console.log(`    ${'celkem'.padEnd(34)} ${String(rows.length).padStart(3)}`)
    console.log('')
    console.log(c.bold('  Přeskočeno'))
    console.log(`    už v knihovně                      ${String(skipped.length).padStart(3)}`)
    if (unsupported.length) {
        console.log(`    nepodporovaný typ                  ${String(unsupported.length).padStart(3)}   ${unsupported.slice(0, 3).join(', ')}`)
    }
    console.log('')

    const video = rows.filter((row) => row.mime.startsWith('video/'))
    if (video.length) {
        console.log(c.bold('  Poznámky'))
        console.log(`    ! ${video.length} videa se zapíšou, ale NAHRÁT nové video přes Studio zatím nejde:`)
        console.log('      ALLOWED_MIME v src/cms/server/media.js video neobsahuje. Rozměry')
        console.log('      u nich zůstávají prázdné — sharp mp4 nečte.')
        console.log('')
    }

    if (mismatched.length) {
        console.log(c.bold('  Špatné rozměry u řádků, které už v knihovně jsou'))
        for (const row of mismatched.slice(0, 10)) {
            console.log(`    ${row.path.padEnd(40)} ${row.was.padEnd(12)} -> ${row.now}`)
        }
        if (mismatched.length > 10) console.log(c.dim(`    … a dalších ${mismatched.length - 10}`))
        console.log('')
    } else if (fixDimensions) {
        console.log(c.green('  Rozměry sedí u všech řádků, které ukazují do public/.'))
        console.log('')
    }

    if (!write) {
        console.log(c.dim('  Dry run. Nic se nezapsalo.'))
        console.log(c.dim('  Zápis: node scripts/cms-import-public.mjs --write'))
        return
    }

    for (const row of mismatched) {
        await rest('PATCH', `cms_media?id=eq.${row.id}`, { width: row.width, height: row.height }, { Prefer: 'return=minimal' })
    }
    if (mismatched.length) console.log(c.dim(`    rozměry opraveny u ${mismatched.length} řádků`))

    if (!rows.length) {
        console.log(mismatched.length ? c.green('  Hotovo.') : c.green('  Není co zapisovat — knihovna je aktuální.'))
        return
    }

    // In batches: one 100-row insert is one statement, and a failure part-way
    // through names the batch rather than leaving the caller to guess.
    let written = 0
    for (let at = 0; at < rows.length; at += 50) {
        const batch = rows.slice(at, at + 50)
        await rest('POST', 'cms_media', batch, { Prefer: 'return=minimal' })
        written += batch.length
        console.log(c.dim(`    zapsáno ${written}/${rows.length}`))
    }

    console.log('')
    console.log(c.bold('  Zápis dokončen'))
    console.log(`    vytvořeno ${written}, přeskočeno ${skipped.length}`)
}

main().catch((error) => {
    console.error(c.red(`\n  ${error.message}\n`))
    process.exit(1)
})
