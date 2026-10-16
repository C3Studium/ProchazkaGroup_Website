#!/usr/bin/env node
// Kontrola anotací — the deliberate run.
//
//   node scripts/cms-audit.js
//   node scripts/cms-audit.js --route /o-nas
//   node scripts/cms-audit.js --base http://localhost:3690
//
// Exits 1 when anything is found, so it can stand in front of a commit.
//
// It asks a running dev server rather than doing the work itself, and that is
// not laziness: an annotation exists only inside a render — `editable()` emits
// nothing until editing is armed, and what it emits comes from props that came
// out of the database. Rendering the real components with the real draft content
// needs the module graph a Next dev server already has, so the work is in
// `/api/studio/audit` and this is the part a person reads.
//
// What it covers, said here because a scan whose reach is unstated is a scan
// that will be trusted for something it does not do: the FIRST render of every
// configured route, `_app`'s chrome included. Sections a reader opens — /o-nas's
// history is the one on this site — are mounted from component state and are not
// in any server render. Those are the Studio's editing view to check, where the
// same audit runs over whatever is actually on screen.

const args = process.argv.slice(2)
const flag = (name, fallback) => {
    const at = args.indexOf(name)
    return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}

const base = flag('--base', process.env.CMS_AUDIT_BASE || 'http://localhost:3000')
const route = flag('--route', null)

const url = `${base}/api/studio/audit${route ? `?route=${encodeURIComponent(route)}` : ''}`

const main = async () => {
    const started = Date.now()
    let response
    try {
        response = await fetch(url, { headers: { Accept: 'application/json' } })
    } catch (error) {
        console.error(`Nepodařilo se spojit s ${base} — běží vývojový server? (${error.message})`)
        process.exit(2)
    }

    const body = await response.json().catch(() => null)
    if (!response.ok) {
        console.error(`${response.status}: ${body?.message || 'neznámá chyba'}`)
        process.exit(2)
    }

    let findings = 0
    let failures = 0
    for (const page of body.routes) {
        if (page.failed) failures += 1
        findings += page.findings.length
        // Rendered here rather than in @/cms/audit's formatter: this is a
        // terminal, the browser has a console, and the one thing they must agree
        // on is the sentence in `message` — which they do.
        const head = `${page.route}: ${page.counts.annotations} anotací, ` +
            `${page.counts.checkedAgainstConfig} adres porovnáno s konfigurací, ` +
            `${page.findings.length} nálezů`
        console.log(`\n${page.findings.length ? '✗' : '✓'} ${head}`)
        for (const note of page.notes) console.log(`  ! ${note}`)
        for (const item of page.findings) {
            console.log(`  ✗ ${item.where}  ${item.doc}${item.path ? ` · ${item.path}` : ''}`)
            console.log(`      ${item.message}`)
        }
    }

    console.log(
        `\n${findings ? '✗' : '✓'} celkem ${findings} nálezů ` +
            `na ${body.routes.length} adresách — server ${body.ms} ms, celkem ${Date.now() - started} ms`,
    )
    process.exit(findings || failures ? 1 : 0)
}

main()
