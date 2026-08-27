// The file behind the file-backed store — SERVER ONLY.
//
// One JSON document under `.cms-dev/` in the repository root, holding the four
// tables the migrations create. Everything above this module talks to it through
// `client.js`, which is shaped like a Supabase client, so nothing between here
// and the Studio knows which store is live.
//
// Three decisions worth stating, because each of them is a failure mode that was
// chosen rather than avoided.
//
// **Synchronous I/O.** Reads and writes are `readFileSync` / `writeFileSync`,
// not their promise forms. The alternative is an async write queue, and a queue
// is only correct if every caller awaits it — `documents.update()` returns as
// soon as the row is in memory, so a queued write can still be in flight when
// the next request reads. Sync writes make "the write happened" and "the call
// returned" the same moment, which is the property every verification of this
// store depends on. The file is a few hundred kilobytes and this runs on one
// developer's machine; the cost is under a millisecond and buys ordering that
// cannot be got back afterwards.
//
// **The snapshot is re-read when the file changes.** A `next dev` server is one
// process, but `next build`, a script or a second dev server is not, and a
// module-level cache that never re-reads would quietly serve a version of the
// data that no longer exists on disk. One `statSync` per operation is cheap and
// makes "what is in the file" the truth rather than "what this process last
// saw".
//
// **The snapshot hangs off globalThis.** Next's dev server can evaluate the same
// module more than once (per-route bundles, hot reload), and two module
// instances would each hold their own copy of the tables and overwrite each
// other's writes. A well-known symbol on the global object is one cell per
// process, which is what the data actually is.

import fs from 'node:fs'
import path from 'node:path'

import { assertServer, hasServiceRoleKey, isProduction } from '../env.js'
import { CmsError } from '../errors.js'
import { STORE_VERSION, hydrateTables } from './hydrate.js'

// Under the repository root, gitignored, and named for what it is. `process.cwd()`
// is where `next dev` is started from, which is the project root; a store that
// followed the module's own path would move with a bundler's output directory.
const DIR = () => process.env.CMS_FILE_STORE_DIR || path.join(process.cwd(), '.cms-dev')
const FILE = () => path.join(DIR(), 'store.json')

// One cell per process. See the header.
const SLOT = Symbol.for('cms.server.fileStore')

const cell = () => {
    if (!globalThis[SLOT]) {
        globalThis[SLOT] = { tables: null, mtimeMs: 0, announced: false }
    }
    return globalThis[SLOT]
}

/**
 * The one line this store says about itself, once per process.
 *
 * Once, not per request: `read.js` already established that pattern for the
 * warning it prints when a type fails to load, and for the same reason — a dev
 * server re-rendering a preview would otherwise bury every real message under
 * its own bookkeeping. Which store is live is a fact about the process, so it is
 * announced like one.
 */
const announce = (what) => {
    const c = cell()
    if (c.announced) return
    c.announced = true
    console.info(
        `[cms] obsah čte a zapisuje souborové úložiště ${FILE()} (${what}); ` +
        'nastavením SUPABASE_SERVICE_ROLE_KEY se přepne na Supabase.'
    )
}

/**
 * Never in production.
 *
 * Vercel's filesystem is ephemeral and per-invocation: a store written there
 * survives until the function instance is recycled, which means an editor's save
 * appears to work, appears to persist for a few minutes, and is then gone with
 * no error anywhere. That is strictly worse than not starting, so a production
 * process with no service-role key refuses to construct this at all.
 *
 * Loud in both directions on purpose. The throw is what stops the Studio and the
 * API dead; the console.error is what survives into a deploy log, because the
 * public site's readers swallow exceptions by contract (read.js) and would
 * otherwise turn this into a silent fallback to hardcoded copy.
 */
export const assertFileStoreUsable = () => {
    if (!isProduction() || hasServiceRoleKey()) return
    console.error(
        '[cms] PRODUCTION s prázdným SUPABASE_SERVICE_ROLE_KEY: souborové úložiště ' +
        'se v produkci nepoužije, protože souborový systém je dočasný a uložené ' +
        'změny by beze stopy zmizely. Nastavte SUPABASE_SERVICE_ROLE_KEY.'
    )
    // A CmsError rather than a bare one so the sentence survives the trip: the
    // repository turns an unrecognised throw into a generic "load failed", and
    // the one thing this failure has to do is name its own cause — in the API
    // response, and in read.js's warning line.
    throw new CmsError(
        'server',
        'Souborové úložiště CMS nelze použít v produkci. Nastavte SUPABASE_SERVICE_ROLE_KEY.'
    )
}

const readFromDisk = () => {
    const parsed = JSON.parse(fs.readFileSync(FILE(), 'utf8'))
    if (!parsed || parsed.version !== STORE_VERSION || !parsed.tables) return null
    return parsed.tables
}

/**
 * Write the whole snapshot, atomically.
 *
 * Temp file plus rename, because `rename(2)` within a directory is atomic: a
 * reader either sees the previous file or the new one, never a half-written one.
 * A plain overwrite of the destination has a window in which the file is
 * truncated, and a reader hitting that window gets a parse error and — with the
 * version check above — a store that silently reseeds itself back to fixtures.
 *
 * The pid is in the temp name so two processes writing at once cannot corrupt
 * each other's temp file. They can still overwrite each other's snapshot; that
 * is last-writer-wins, which is as much as a dev store needs.
 */
export const persist = () => {
    const c = cell()
    fs.mkdirSync(DIR(), { recursive: true })
    const target = FILE()
    const temp = `${target}.${process.pid}.tmp`
    fs.writeFileSync(temp, `${JSON.stringify({ version: STORE_VERSION, tables: c.tables }, null, 2)}\n`)
    fs.renameSync(temp, target)
    c.mtimeMs = fs.statSync(target).mtimeMs
}

/**
 * The tables, current as of this instant.
 *
 * Callers mutate what they get back and then call `persist()`. That is blunt and
 * it is honest: this is one process holding one small dataset, and a repository
 * API layered on top would be a second place for the semantics in `client.js` to
 * live.
 */
export const tables = () => {
    assertServer('@/cms/server/fileStore')
    assertFileStoreUsable()

    const c = cell()

    let stat = null
    try {
        stat = fs.statSync(FILE())
    } catch {
        stat = null
    }

    if (!stat) {
        c.tables = hydrateTables()
        persist()
        announce('nově vytvořeno ze seedu')
        return c.tables
    }

    if (!c.tables || stat.mtimeMs !== c.mtimeMs) {
        const loaded = readFromDisk()
        if (loaded) {
            c.tables = loaded
            c.mtimeMs = stat.mtimeMs
            announce('načteno z disku')
            return c.tables
        }
        // Unreadable or written by an older shape. Rebuilt rather than repaired:
        // this store's whole purpose is to be reconstructible from fixtures, and
        // guessing at a half-understood file is how a dev dataset becomes a
        // support burden. Deleting `.cms-dev/` is the documented reset.
        c.tables = hydrateTables()
        persist()
        announce('seed obnoven, soubor byl v nečitelném nebo starém formátu')
        return c.tables
    }

    return c.tables
}

export const storeFile = FILE

// The directory itself, for the sibling that keeps uploaded bytes in it
// (ports/fileStorage.js). Exported rather than recomputed there so `.cms-dev`
// and CMS_FILE_STORE_DIR have one definition, not two that agree today.
export const storeDir = DIR
