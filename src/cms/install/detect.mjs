// What the target project already is, read from disk.
//
// Every question the installer asks has an answer the project has already
// given implicitly — it has a `pages/` directory, it has resend in its
// dependencies, it has a pnpm lockfile. Detection turns those into defaults so
// the menu is a confirmation rather than an interrogation, and so `--yes` has
// something sane to run with.
//
// Nothing here writes. Detection that repaired what it found would make the
// preview in `plan.mjs` a lie.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const readJson = (file) => {
    try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null }
}

/**
 * The nearest ancestor holding a package.json — the project being installed
 * into. Walks up rather than trusting cwd, because `npx` is as likely to be run
 * from a subdirectory as from the root.
 */
export const findProjectRoot = (from = process.cwd()) => {
    let dir = path.resolve(from)
    for (;;) {
        if (existsSync(path.join(dir, 'package.json'))) return dir
        const up = path.dirname(dir)
        if (up === dir) return null
        dir = up
    }
}

/** Which package manager this project is already using, by its lockfile. */
export const detectPackageManager = (root) => {
    const byLockfile = [
        ['pnpm-lock.yaml', 'pnpm'],
        // Bun psal binární bun.lockb, od 1.2 píše textový bun.lock. Projekt
        // založený novějším bunem má jen ten druhý; bez něj by se detekce
        // propadla až na npm a nabídla by příkaz, který v tom projektu nic
        // neudělá.
        ['bun.lockb', 'bun'],
        ['bun.lock', 'bun'],
        ['yarn.lock', 'yarn'],
        ['package-lock.json', 'npm'],
    ]
    for (const [lock, manager] of byLockfile) {
        if (existsSync(path.join(root, lock))) return manager
    }

    // Bez lockfilu ještě není konec. Čerstvý projekt od create-next-app žádný
    // nemá — instalace v něm neproběhla — ale nese `packageManager`, což je
    // výslovné určení, ne odhad. A když nástroj běží přes `pnpm create`, řekne
    // to sám správce v user agentu. Poslat člověka na `npm install` v pnpm
    // projektu je rada, po které vznikne druhý lockfile.
    const declared = readJson(path.join(root, 'package.json'))?.packageManager
    if (typeof declared === 'string') {
        const name = declared.split('@')[0].trim()
        if (['pnpm', 'yarn', 'bun', 'npm'].includes(name)) return name
    }

    const agent = process.env.npm_config_user_agent || ''
    for (const name of ['pnpm', 'yarn', 'bun']) {
        if (agent.startsWith(`${name}/`)) return name
    }

    return 'npm'
}

/**
 * App Router, Pages Router, or both.
 *
 * Next looks for these directories at the root and under `src/`, and a project
 * mid-migration genuinely has both — so this reports what is there rather than
 * picking a winner. The menu asks in that case; it is the one situation where
 * the project has not answered for itself.
 */
export const detectRouter = (root) => {
    const has = (rel) => existsSync(path.join(root, rel))
    const app = has('app') || has('src/app')
    const pages = has('pages') || has('src/pages')
    if (app && pages) return { router: 'both', app, pages }
    if (app) return { router: 'app', app, pages }
    if (pages) return { router: 'pages', app, pages }
    return { router: null, app, pages }
}

/**
 * Where route files belong in this project: `src/pages` for the Pages Router,
 * `src/app` for the App Router.
 *
 * `src/` is the default and the house convention. The one thing that overrides
 * it is a root-level `pages/` or `app/` that already exists — and that is not a
 * preference, it is Next's rule: when both are present Next serves the
 * root-level one and ignores `src/`. Scaffolding into `src/` there would write
 * a route Next never serves, which reads to whoever installed it as "the CMS
 * does not work" rather than "the file is in the wrong place".
 */
export const routesDir = (root, router) => {
    const leaf = router === 'app' ? 'app' : 'pages'
    return existsSync(path.join(root, leaf)) ? leaf : path.join('src', leaf)
}

/** Direct dependencies, both kinds, as one map. */
export const dependencies = (pkg) => ({ ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) })

/** Which of these packages the project already depends on. */
export const installed = (pkg, names) => {
    const deps = dependencies(pkg)
    return Object.fromEntries(names.map((name) => [name, Boolean(deps[name])]))
}

/** The project's Next config, whatever extension it chose. */
export const findNextConfig = (root) => {
    for (const name of ['next.config.mjs', 'next.config.js', 'next.config.ts']) {
        if (existsSync(path.join(root, name))) return name
    }
    return null
}

/** Env files present, so the installer can append rather than clobber. */
export const envFiles = (root) => {
    try {
        return readdirSync(root).filter((name) => name === '.env' || name.startsWith('.env.'))
    } catch { return [] }
}

/** Everything the menu needs, in one object. */
export const survey = (from = process.cwd()) => {
    const root = findProjectRoot(from)
    if (!root) return { root: null }
    const pkg = readJson(path.join(root, 'package.json'))
    const deps = dependencies(pkg)
    return {
        root,
        pkg,
        name: pkg?.name || path.basename(root),
        manager: detectPackageManager(root),
        ...detectRouter(root),
        nextVersion: deps.next || null,
        nextConfig: findNextConfig(root),
        envFiles: envFiles(root),
        has: installed(pkg, [
            '@supabase/supabase-js', 'pg', 'sharp', 'resend',
            '@react-email/render', '@c3studium/valecms',
        ]),
        // Obě místa: `src/lib/` je dnešní, kořen je to, kde konfigurace ležela
        // dřív. Projekt, který ji má, je nakonfigurovaný — ať leží kdekoli.
        alreadyConfigured: ['src/lib', ''].some((dir) =>
            ['valecms.config.js', 'valecms.config.ts'].some((file) =>
                existsSync(path.join(root, dir, file)))),
        // tsconfig.json je odpověď, kterou projekt už dal.
        typescript: existsSync(path.join(root, 'tsconfig.json')),
        // Cokoli, co vypadá jako vlastní SCSS systém. Nabídnout instalaci
        // někomu, kdo si ho napsal, znamená nabídnout přepsání jeho práce.
        hasStyleSystem:
            existsSync(path.join(root, 'src/styles/system')) ||
            existsSync(path.join(root, 'styles/system')),
    }
}
