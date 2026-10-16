// Menu, bez závislostí.
//
// Šipky a Enter, jako u `create-next-app`. Vyžaduje to raw mode, a ten vyžaduje
// TTY — které `npx` uvnitř CI kroku nebo za rourou nemá. Bez TTY se proto menu
// přepne na číslovanou variantu přes readline. Menu, které v CI visí, je horší
// než menu, které je tam na chvíli obyčejné.
//
// Každá otázka nese výchozí volbu z detekce; Enter ji potvrdí, takže běžný
// průchod je série Enterů.

import { createInterface } from 'node:readline/promises'
// `process.stdin` a ne jmenovaný import: jmenovaný import se váže na proud
// při načtení modulu a nedá se pak podstrčit — ani v testu, ani v hostiteli,
// který si proudy přesměrovává. V provozu je to totéž.
import process from 'node:process'

/**
 * Čtení skončilo — Ctrl+C, Ctrl+D, nebo vyschlá roura.
 *
 * Necháno bez ošetření to doletí nahoru jako neodchycené odmítnutí: výpis
 * zásobníku v nástroji, jehož celá práce je být na člověka mírný. Každý dotaz
 * prochází tudy, aby to bylo na jednom místě.
 */
export class Cancelled extends Error {}

const bold = (s) => `\x1b[1m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`
const orange = (s) => `\x1b[38;5;208m${s}\x1b[0m`

export const style = { bold, dim, orange }

export const heading = (text) => process.stdout.write(`\n${orange('▍')} ${bold(text)}\n`)
export const note = (text) => process.stdout.write(`${dim('  ' + text)}\n`)

const HIDE = '\x1b[?25l'
const SHOW = '\x1b[?25h'
const CLEAR_LINE = '\x1b[2K'

const UP = '\x1b[A'
const DOWN = '\x1b[B'
const CTRL_C = '\x03'
const CTRL_D = '\x04'

/** Kolik řádků nahoru a smazat je — překreslení seznamu na místě. */
const rewind = (lines) => {
    let out = ''
    for (let i = 0; i < lines; i += 1) out += `\x1b[1A${CLEAR_LINE}`
    process.stdout.write(out + '\r')
}

const drawOptions = (options, active) => {
    let out = ''
    for (const [i, option] of options.entries()) {
        // Nedostupnou volbu je pořád vidět: smysl výpisu ovladače, který ještě
        // nedojel, je že se o něm čtenář dozví. Vybrat ji ale nejde.
        const tail = option.unavailable ? dim(`  ${option.unavailable}`) : ''
        out += i === active
            ? `  ${orange('❯')} ${orange(option.label)}${tail}\n`
            : `    ${dim(option.label)}${tail}\n`
    }
    process.stdout.write(out)
}

/**
 * Rozebere přijatá data na jednotlivé klávesy.
 *
 * Terminál nedoručuje po jedné. Rychlé psaní, vložení textu i program, který
 * píše na vstup, pošlou několik kláves v jednom bloku — a porovnávat celý blok
 * proti `'\x1b[B'` znamená neudělat nic a zahodit i Enter, který v něm byl.
 */
const keysIn = (chunk) => {
    const out = []
    for (let i = 0; i < chunk.length; ) {
        if (chunk[i] === '\x1b' && chunk[i + 1] === '[') {
            // Šipky a spol.: ESC [ a jedno písmeno na konci.
            let end = i + 2
            while (end < chunk.length && !/[A-Za-z~]/.test(chunk[end])) end += 1
            out.push(chunk.slice(i, end + 1))
            i = end + 1
            continue
        }
        out.push(chunk[i])
        i += 1
    }
    return out
}

/** Index výchozí volby, posunutý na nejbližší dostupnou. */
const startIndex = (options, def) => {
    const wanted = options.findIndex((o) => o.value === def)
    if (wanted >= 0 && !options[wanted].unavailable) return wanted
    return Math.max(0, options.findIndex((o) => !o.unavailable))
}

const nextUsable = (options, from, step) => {
    const n = options.length
    for (let i = 1; i <= n; i += 1) {
        const at = (((from + step * i) % n) + n) % n
        if (!options[at].unavailable) return at
    }
    return from
}

/**
 * Šipková varianta. Vrací hodnotu, nebo vyhodí Cancelled.
 *
 * Bere `rl`, protože ho musí na dobu svého běhu UMLČET. `session()` otevírá
 * readline hned na začátku a to poslouchá na stdin; kdyby běželo dál, četlo by
 * tytéž klávesy jako tenhle handler a rovnou je i vypisovalo na obrazovku.
 */
const selectRaw = (rl, { question, options, def }) =>
    new Promise((resolve, reject) => {
        let active = startIndex(options, def)
        heading(question)
        drawOptions(options, active)
        process.stdout.write(HIDE)

        const wasRaw = process.stdin.isRaw
        rl?.pause()
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.setEncoding('utf8')

        const done = (fn, arg) => {
            settled = true
            process.stdin.off('data', onChunk)
            process.stdin.setRawMode(Boolean(wasRaw))
            // Stdin se NEUSPÁVÁ. Uspaný proud znamená, že další otázka —
            // `confirm` přes readline — už nikdy nic nedostane: smyčka událostí
            // se vyprázdní a proces skončí uprostřed čekání. Node to hlásí jako
            // "Detected unsettled top-level await" a vypadá to, že menu spadlo.
            rl?.resume()
            process.stdout.write(SHOW)
            fn(arg)
        }

        const onChunk = (chunk) => {
            for (const key of keysIn(chunk)) {
                if (settled) return
                onKey(key)
            }
        }

        let settled = false
        const onKey = (key) => {
            // V raw mode si signály musí odchytit program sám. Bez tohohle by
            // menu nešlo opustit ničím kromě zabití procesu.
            if (key === CTRL_C || key === CTRL_D) return done(reject, new Cancelled())
            if (key === '\r' || key === '\n') {
                rewind(options.length)
                process.stdout.write(`  ${orange('❯')} ${options[active].label}\n`)
                return done(resolve, options[active].value)
            }
            let moved = active
            if (key === UP || key === 'k') moved = nextUsable(options, active, -1)
            else if (key === DOWN || key === 'j') moved = nextUsable(options, active, 1)
            else if (/^[1-9]$/.test(key)) {
                const at = Number(key) - 1
                if (at < options.length && !options[at].unavailable) moved = at
            }
            if (moved === active) return
            active = moved
            rewind(options.length)
            drawOptions(options, active)
        }

        process.stdin.on('data', onChunk)
    })

const line = async (rl, prompt) => {
    try { return await rl.question(prompt) }
    catch (error) {
        if (error?.code === 'ABORT_ERR' || error?.name === 'AbortError') throw new Cancelled()
        throw error
    }
}

/** Číslovaná varianta pro terminál bez raw mode. */
const selectNumbered = async (rl, { question, options, def }) => {
    const defIndex = startIndex(options, def)
    heading(question)
    options.forEach((option, i) => {
        const mark = i === defIndex ? orange('❯') : ' '
        const tail = option.unavailable ? dim(`  ${option.unavailable}`) : ''
        process.stdout.write(`  ${mark} ${bold(String(i + 1))}) ${option.label}${tail}\n`)
    })
    for (;;) {
        const raw = (await line(rl, `  ${dim(`volba [${defIndex + 1}]`)} `)).trim()
        const index = raw === '' ? defIndex : Number(raw) - 1
        const chosen = options[index]
        if (!chosen) { process.stdout.write(dim('  Zadej číslo z nabídky.\n')); continue }
        if (chosen.unavailable) {
            process.stdout.write(dim(`  ${chosen.label}: ${chosen.unavailable}\n`))
            continue
        }
        return chosen.value
    }
}

/**
 * Otázka s pevnou sadou odpovědí.
 *
 * `options` je `[{ value, label, unavailable }]`.
 */
export const select = async (rl, spec) =>
    rl && process.stdin.isTTY && process.stdout.isTTY && typeof process.stdin.setRawMode === 'function'
        ? selectRaw(rl, spec)
        : selectNumbered(rl, spec)

/** Ano/ne. Vrací boolean. */
export const confirm = async (rl, { question, def = true, hint }) => {
    heading(question)
    if (hint) note(hint)
    const suffix = def ? 'A/n' : 'a/N'
    for (;;) {
        const raw = (await line(rl, `  ${dim(`[${suffix}]`)} `)).trim().toLowerCase()
        if (raw === '') return def
        if (['a', 'ano', 'y', 'yes'].includes(raw)) return true
        if (['n', 'ne', 'no'].includes(raw)) return false
        process.stdout.write(dim('  Napiš a nebo n.\n'))
    }
}

/** Volný text, s výchozí hodnotou. */
export const ask = async (rl, { question, def = '', hint }) => {
    heading(question)
    if (hint) note(hint)
    const raw = (await line(rl, `  ${dim(def ? `[${def}]` : '')} `)).trim()
    return raw || def
}

/** Otevře sezení; `interactive` je false, když není TTY. */
export const session = () => {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
    const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null
    return { interactive, rl, close: () => rl?.close() }
}
