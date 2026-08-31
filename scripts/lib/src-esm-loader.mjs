// Module hooks that let a bare `node` script import the CMS server modules.
//
// The problem is two facts about this repository that are both deliberate.
// `package.json` has no `"type": "module"`, so Node reads every `.js` under
// `src/` as CommonJS and refuses the first `export` keyword it meets. And the
// modules address each other as `@/cms/...`, which is a jsconfig path mapping
// that Next's bundler resolves and Node has never heard of.
//
// Both are fixed here rather than in the modules, because the modules are right:
// they are compiled by Next in every environment that matters, and changing them
// to suit a script would be the script's cost paid by the application.
//
// The alternative was a bundler or a loader package (jiti is present as a
// transitive dependency of Next). Twenty lines of `node:module` hooks is less
// than either, adds no dependency, and — unlike a transitive one — cannot
// disappear when something upstream changes its mind.
//
// Registered with `module.register()`, which means it applies to imports that
// happen AFTER registration. An entry point using it therefore registers first
// and reaches the CMS through `await import(...)`.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The project root, from this file's own location. Not `process.cwd()`: a
// script run from anywhere should still find the same `src/`.
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const SRC = `${pathToFileURL(path.join(ROOT, 'src')).href}/`

// jsconfig.json's `@/*` -> `./src/*`, plus the extension search a bundler does
// and Node does not. `@public/*` is not mapped: nothing under src/cms imports it
// and a mapping that exists but is never exercised is a mapping that is wrong.
const RESOLUTIONS = ['', '.js', '.jsx', '/index.js', '/index.jsx']

const resolveAlias = (specifier) => {
    const base = path.join(ROOT, 'src', specifier.slice(2))
    for (const suffix of RESOLUTIONS) {
        const candidate = base + suffix
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }
    return base
}

const isSrcModule = (url) => url.startsWith(SRC) && (url.endsWith('.js') || url.endsWith('.jsx'))

// `import "./resetTypes"` — extensionless, which a bundler completes and Node
// refuses. Only applied when the importer is itself a src module, so nothing
// outside this tree gets Node's resolution quietly relaxed.
const resolveRelative = (specifier, parentURL) => {
    const base = fileURLToPath(new URL(specifier, parentURL))
    for (const suffix of RESOLUTIONS) {
        const candidate = base + suffix
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }
    return null
}

export const resolve = async (specifier, context, next) => {
    if (specifier.startsWith('@/')) {
        return {
            url: pathToFileURL(resolveAlias(specifier)).href,
            format: 'module',
            shortCircuit: true,
        }
    }

    if (specifier.startsWith('.') && context.parentURL?.startsWith(SRC)) {
        const found = resolveRelative(specifier, context.parentURL)
        if (found) {
            const url = pathToFileURL(found).href
            return { url, format: isSrcModule(url) ? 'module' : undefined, shortCircuit: true }
        }
    }

    const resolved = await next(specifier, context)
    // Relative imports between src modules land here; they need the same
    // override, or the first one Node reaches is parsed as CommonJS.
    return isSrcModule(resolved.url) ? { ...resolved, format: 'module' } : resolved
}

export const load = async (url, context, next) => {
    if (!isSrcModule(url)) return next(url, context)
    return {
        format: 'module',
        shortCircuit: true,
        source: fs.readFileSync(new URL(url), 'utf8'),
    }
}
