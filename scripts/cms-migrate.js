#!/usr/bin/env node
/**
 * cms-migrate — read the live Supabase tables, write CMS documents.
 *
 *   node scripts/cms-migrate.js              dry run: print the plan, exit
 *   node scripts/cms-migrate.js --write      actually write
 *   node scripts/cms-migrate.js --help       flags
 *
 * DRY RUN IS THE DEFAULT AND --write IS THE ONLY WAY PAST IT. Reads use the
 * anon key and are GET-only by construction (see `legacyRequest`); the legacy
 * tables are never written, altered or dropped by this script. Writes go to
 * cms_document and nothing else.
 *
 * Idempotent: every document carries (legacy_source, legacy_id), which has a
 * unique index. A second run finds the existing row, compares the body, and
 * reports "unchanged" instead of inserting a duplicate.
 *
 * Deliberately dependency-free CommonJS with no imports from src/. Two
 * reasons: it runs with bare `node` and no build step, and it must not be able
 * to accidentally pull in a module that writes somewhere. The cost is that it
 * cannot call the core's validateDocument (that lives behind the @/ alias and
 * an ESM boundary), so the plan reports structural problems it can see for
 * itself and flags the rest.
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..')

const LEGACY_TABLES = ['people', 'reviews', 'total']

// Personal data, dropped on the way through. IP addresses identify a person;
// no lawful basis for carrying them into a new system has been stated, so they
// are not carried. `list_of_all_ips` is empty in all 37 live rows and `ip_list`
// is populated in 12 — neither is referenced by any component.
const DROPPED_COLUMNS = {
    reviews: ['ip_list', 'list_of_all_ips'],
}

// Slugs must match the review pages that already exist under
// src/pages/reviews/, because those URLs are indexed. The convention there is
// surname-first: "Olga Kaslová" -> "kaslova-olga".
const EXISTING_REVIEW_SLUGS = [
    'kaslova-olga', 'vituj-lukas', 'filipska-jana', 'markova-michaela',
    'furbachova-kristyna', 'efenberk-ondrej', 'matous-lukas', 'posnerova-tereza',
    'stofflova-anna', 'markova-tereza', 'benefit-program', 'prochazka-vaclav',
]

const NAME_TITLES = /^(mgr|ing|bc|mudr|judr|phdr|rndr|mba|dis)\.?$/i

// Titles that follow the name rather than precede it ("Jan Novák, Ph.D."). None
// appear in the 13 live rows; they are listed so the parser reports a row it
// cannot split rather than silently making the doctorate into a surname.
const TRAILING_TITLES = /^(ph\.?d|csc|drsc|th\.?d|dis)\.?,?$/i

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const colour = process.stdout.isTTY
const c = {
    dim: (s) => (colour ? `\x1b[2m${s}\x1b[0m` : s),
    bold: (s) => (colour ? `\x1b[1m${s}\x1b[0m` : s),
    green: (s) => (colour ? `\x1b[32m${s}\x1b[0m` : s),
    yellow: (s) => (colour ? `\x1b[33m${s}\x1b[0m` : s),
    red: (s) => (colour ? `\x1b[31m${s}\x1b[0m` : s),
    cyan: (s) => (colour ? `\x1b[36m${s}\x1b[0m` : s),
}

const readEnvFile = () => {
    const file = path.join(ROOT, '.env')
    if (!fs.existsSync(file)) return {}
    return Object.fromEntries(
        fs.readFileSync(file, 'utf8')
            .split('\n')
            .filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('='))
            .map((line) => {
                const index = line.indexOf('=')
                return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
            })
    )
}

const env = { ...readEnvFile(), ...process.env }

const supabaseUrl = () => String(env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')

const deaccent = (value) =>
    String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')

const slugify = (value) =>
    deaccent(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

// Surname first, academic titles dropped — matches src/pages/reviews/*.
const personSlug = (fullName) => {
    const parts = String(fullName).trim().split(/\s+/).filter((p) => !NAME_TITLES.test(p))
    if (parts.length < 2) return slugify(fullName)
    const first = parts[0]
    const last = parts[parts.length - 1]
    return slugify(`${last} ${first}`)
}

/**
 * `people.name` is one string. The schema wants three fields.
 *
 * The rule is conservative on purpose, because the cost of the two mistakes is
 * not symmetric: a name left whole in `lastName` is visibly wrong in the Studio
 * and an editor fixes it in ten seconds, whereas a name split wrongly looks
 * finished and stays wrong. So the parser only splits the shape it is certain
 * about — an optional leading academic title, then exactly two words — and
 * hands everything else to `lastName` with an empty title and a reported
 * reason.
 *
 * Not handled deliberately, because no live row has them and guessing would be
 * inventing policy: trailing titles ("Jan Novák, Ph.D."), multiple given names,
 * compound surnames ("Nováková Kučerová"), and nobiliary particles. Each is
 * reported as `unsplit` so the person migrating can see exactly which rows to
 * look at.
 *
 * @returns {{academicTitle, firstName, lastName, confident, reason}}
 */
const splitPersonName = (rawName) => {
    const whole = squish(rawName)
    const unsplit = (reason) => ({
        academicTitle: '',
        firstName: '',
        lastName: whole,
        confident: false,
        reason,
    })

    if (!whole) return unsplit('prázdné jméno')

    const words = whole.split(' ')

    // Leading academic titles, however many ("Ing. Mgr. Jan Novák").
    const titles = []
    while (words.length && NAME_TITLES.test(words[0])) titles.push(words.shift())

    if (words.some((word) => TRAILING_TITLES.test(word))) {
        return unsplit('titul za jménem, nelze bezpečně oddělit')
    }
    if (words.length < 2) return unsplit('jméno má po odebrání titulu méně než dvě slova')
    if (words.length > 2) {
        // Czech needs three forms; "3 slov" in front of the person running this
        // is exactly the sloppiness that makes a tool feel unfinished.
        const noun = words.length <= 4 ? 'slova' : 'slov'
        return unsplit(`jméno má ${words.length} ${noun}, není jasné, kde končí křestní`)
    }

    return {
        academicTitle: titles.join(' '),
        firstName: words[0],
        lastName: words[1],
        confident: true,
        reason: '',
    }
}

const squish = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim()

// Stable stringify so "did the body change" is a string comparison and not a
// deep-equality helper with its own bugs.
const canonical = (value) => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value)
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/**
 * Reads from the legacy tables. GET only — the method is not a parameter, so
 * there is no code path in this file that can write to people/reviews/total.
 */
const legacyRequest = async (table) => {
    if (!LEGACY_TABLES.includes(table)) throw new Error(`Nepovolená tabulka: ${table}`)
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!key) throw new Error('Chybí NEXT_PUBLIC_SUPABASE_ANON_KEY')

    const response = await fetch(`${supabaseUrl()}/rest/v1/${table}?select=*`, {
        method: 'GET',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`Čtení ${table} selhalo: HTTP ${response.status} ${text}`)
    return JSON.parse(text)
}

const cmsRequest = async (method, pathAndQuery, body) => {
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) {
        throw new Error(
            'Chybí SUPABASE_SERVICE_ROLE_KEY.\n' +
            '  Supabase -> Project Settings -> API -> service_role.\n' +
            '  Přidejte do .env jako SUPABASE_SERVICE_ROLE_KEY (bez NEXT_PUBLIC_ prefixu).'
        )
    }

    const response = await fetch(`${supabaseUrl()}/rest/v1/${pathAndQuery}`, {
        method,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) {
        throw new Error(`${method} ${pathAndQuery} selhalo: HTTP ${response.status} ${text}`)
    }
    return text ? JSON.parse(text) : null
}

// ---------------------------------------------------------------------------
// Mapping: legacy row -> CMS document body
// ---------------------------------------------------------------------------

// The Benefit Program row in `people` is not a person. It exists so a review
// can be attributed to the programme rather than to a consultant.
const isProgramRow = (row) => squish(row.name).toLowerCase() === 'benefit program'

const mapConsultant = (row) => {
    const program = isProgramRow(row)
    const name = splitPersonName(row.name)

    return {
        legacySource: 'supabase.people',
        legacyId: String(row.id),
        type: 'consultant',
        // Carried on the plan item, not in the body: the report needs it and
        // the document does not.
        nameSplit: { source: squish(row.name), ...name },
        data: {
            academicTitle: name.academicTitle,
            firstName: name.firstName,
            lastName: name.lastName,
            slug: program ? 'benefit-program' : personSlug(row.name),
            kind: program ? 'program' : 'consultant',
            motto: squish(row.moto),
            story: squish(row.pribeh) || '',
            // Paths into /public, not uploads. Carried through as-is; the
            // media library takes over only when an editor re-uploads.
            portrait: row.src
                ? { url: row.src, alt: squish(row.alt) || squish(row.name), legacy: true }
                : null,
            // The schema's second photo. `people` has exactly one image column,
            // so there is nothing to put here and nothing is put here — an
            // invented second photo would be worse than an empty field, because
            // an empty field is a visible instruction to upload one.
            portraitDetail: null,
            phone: squish(row.tel) || '',
            email: squish(row.mail) || '',
            facebook: squish(row.fb) || '',
            instagram: squish(row.ig) || '',
            order: Number(row.id),
            stats: {
                likes: Number(row.likes) || 0,
                reviewCount: Number(row.reviews) || 0,
            },
            legacyId: Number(row.id),
        },
        // Consultants are on the site today, so they arrive published rather
        // than waiting for someone to approve content that is already live.
        // Nothing arrives archived: `archived_at` stays null and archiving is an
        // editorial decision made in the Studio afterwards.
        status: 'published',
        publishedAt: row.created_at,
    }
}

// The live table has no `approved` column, so everything in it is on the site
// right now, test rows included. "test", "TEst", "test 2", "TEST recenze" and
// one more are visible to the public today. They are imported (nothing is
// silently discarded) but land unapproved, which is the first thing the
// approval workflow is for.
const looksLikeTest = (row) => {
    const message = squish(row.message).toLowerCase()
    const name = squish(row.customer_name).toLowerCase()
    return (message.length < 20 && /test/.test(message)) || name === 'test'
}

const mapReview = (row, { approveAll }) => {
    const suspect = looksLikeTest(row)
    const approved = approveAll ? true : !suspect
    return {
        legacySource: 'supabase.reviews',
        legacyId: String(row.id),
        type: 'review',
        suspect,
        data: {
            customerName: squish(row.customer_name),
            consultantName: squish(row.consultant_name),
            message: squish(row.message),
            hashtag: squish(row.hashtag) || 'poradce',
            approved,
            likes: Number(row.likes) || 0,
            order: Number(row.number) || 0,
            submittedAt: row.created_at,
            source: 'import',
        },
        // Unapproved reviews are drafts, and drafts are invisible to the anon
        // key by RLS. That is what takes the test rows off the public site.
        status: approved ? 'published' : 'draft',
        publishedAt: approved ? row.created_at : null,
    }
}

// `total` is one row of site-wide counters. It becomes a siteCopy block rather
// than a content type of its own — it is three numbers the homepage prints.
const mapTotal = (row) => ({
    legacySource: 'supabase.total',
    legacyId: String(row.id),
    type: 'siteCopy',
    data: {
        key: 'global.counters',
        page: 'global',
        title: 'Souhrnná čísla',
        body: '',
        items: [
            { lead: '', label: 'Spokojených klientů', value: String(row.totalpeople ?? 0), note: '' },
            { lead: '', label: 'Recenzí', value: String(row.reviews ?? 0), note: '' },
            { lead: '', label: 'Líbí se', value: String(row.likes ?? 0), note: '' },
        ],
    },
    status: 'published',
    publishedAt: row.created_at,
})

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const buildPlan = async (options) => {
    const [people, reviews, total] = await Promise.all([
        legacyRequest('people'),
        legacyRequest('reviews'),
        legacyRequest('total'),
    ])

    const wanted = []
    if (options.only.has('consultant')) {
        people.sort((a, b) => a.id - b.id).forEach((row) => wanted.push(mapConsultant(row)))
    }
    if (options.only.has('review')) {
        reviews.sort((a, b) => a.id - b.id).forEach((row) => wanted.push(mapReview(row, options)))
    }
    if (options.only.has('siteCopy')) {
        total.forEach((row) => wanted.push(mapTotal(row)))
    }

    // Existing CMS documents, keyed by (source, legacy id). Absent tables are
    // not an error during a dry run — the plan is exactly the thing you want to
    // read before you have run the SQL.
    let existing = new Map()
    let tablesReady = true
    let tableError = null

    if (env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const rows = await cmsRequest(
                'GET',
                'cms_document?select=id,type,status,data,draft,legacy_source,legacy_id&legacy_source=not.is.null'
            )
            existing = new Map(rows.map((row) => [`${row.legacy_source}::${row.legacy_id}`, row]))
        } catch (err) {
            tablesReady = false
            tableError = err.message
        }
    } else {
        tablesReady = false
        tableError = 'SUPABASE_SERVICE_ROLE_KEY není nastaven, stav cílové tabulky nelze zjistit'
    }

    for (const item of wanted) {
        const current = existing.get(`${item.legacySource}::${item.legacyId}`)
        if (!current) {
            item.action = tablesReady ? 'create' : 'create?'
        } else {
            item.existingId = current.id
            // Compare against the body the document actually uses — `draft ??
            // data` (Contract 3). An unapproved review keeps its body in
            // `draft` with `data` empty, so comparing `data` alone would report
            // a change on every run and then patch the body into `data`,
            // quietly staging unmoderated text for publication.
            item.existingField = current.draft == null ? 'data' : 'draft'
            const currentBody = current.draft == null ? current.data : current.draft
            item.action = canonical(currentBody) === canonical(item.data) ? 'unchanged' : 'update'
        }
    }

    return {
        items: wanted,
        source: { people: people.length, reviews: reviews.length, total: total.length },
        tablesReady,
        tableError,
        warnings: collectWarnings(wanted, people, reviews),
    }
}

const collectWarnings = (items, people, reviews) => {
    const warnings = []

    const suspects = items.filter((i) => i.suspect)
    if (suspects.length) {
        warnings.push({
            level: 'info',
            text: `${suspects.length} recenzí vypadá jako test a importuje se jako NESCHVÁLENÝ koncept ` +
                  `(dnes jsou veřejně vidět): ${suspects.map((s) => `#${s.legacyId} "${s.data.message}"`).join(', ')}`,
        })
    }

    // A review naming a consultant we are not importing would render a name
    // that links nowhere. Compared against the ORIGINAL `people.name` string,
    // because that is what reviews.consultant_name was written from — comparing
    // against the recomposed three fields would report every row with an
    // unusual name as an orphan.
    const consultantNames = new Set(
        items.filter((i) => i.type === 'consultant').map((i) => i.nameSplit.source)
    )
    const orphans = items.filter(
        (i) => i.type === 'review' && consultantNames.size && !consultantNames.has(i.data.consultantName)
    )
    if (orphans.length) {
        warnings.push({
            level: 'warn',
            text: `${orphans.length} recenzí odkazuje na poradce, který není mezi importovanými: ` +
                  [...new Set(orphans.map((o) => o.data.consultantName))].join(', '),
        })
    }

    // Slugs are URLs that are already indexed; a mismatch means a 404.
    const generated = items.filter((i) => i.type === 'consultant').map((i) => i.data.slug)
    const missingPages = generated.filter((slug) => !EXISTING_REVIEW_SLUGS.includes(slug))
    if (missingPages.length) {
        warnings.push({
            level: 'info',
            text: `Slug bez existující stránky v src/pages/reviews/: ${missingPages.join(', ')} ` +
                  '(stránka pro tohoto poradce zatím neexistuje, import ji nevytvoří)',
        })
    }
    const orphanPages = EXISTING_REVIEW_SLUGS.filter(
        (slug) => generated.length && !generated.includes(slug)
    )
    if (orphanPages.length) {
        warnings.push({
            level: 'warn',
            text: `Existující stránka bez odpovídajícího poradce: ${orphanPages.join(', ')}`,
        })
    }

    const missingStory = items.filter((i) => i.type === 'consultant' && !i.data.story)
    if (missingStory.length) {
        warnings.push({
            level: 'info',
            text: `Poradci bez příběhu: ${missingStory.map((i) => i.nameSplit.source).join(', ')}`,
        })
    }

    // Rows the name parser would not split. Named individually, because the fix
    // is one edit per person in the Studio and a count alone does not say who.
    const unsplit = items.filter((i) => i.type === 'consultant' && !i.nameSplit.confident)
    if (unsplit.length) {
        warnings.push({
            level: 'warn',
            text: `${unsplit.length} jmen se nepodařilo bezpečně rozdělit; celé jméno jde do „Příjmení", titul zůstává prázdný: ` +
                  unsplit.map((i) => `"${i.nameSplit.source}" (${i.nameSplit.reason})`).join(', '),
        })
    }

    // The second photo. Stated as a note rather than left to be discovered when
    // an editor opens the first profile and finds an empty field.
    const consultants = items.filter((i) => i.type === 'consultant')
    if (consultants.length) {
        warnings.push({
            level: 'note',
            text: `Druhá fotka (portraitDetail) zůstává prázdná u všech ${consultants.length} poradců. ` +
                  'Tabulka people má jen jeden sloupec s obrázkem (src) a import žádnou druhou fotku nevymýšlí.',
        })
    }

    // Shared portraits. These are placeholders in the live data — the same file
    // reused for people who never had a photo taken — so importing them as-is
    // would put one stranger's face on several profiles.
    const bySrc = new Map()
    for (const person of people) {
        if (!person.src) continue
        if (!bySrc.has(person.src)) bySrc.set(person.src, [])
        bySrc.get(person.src).push(squish(person.name))
    }
    const shared = [...bySrc.entries()].filter(([, names]) => names.length > 1)
    if (shared.length) {
        warnings.push({
            level: 'warn',
            text: 'Stejná fotka u více lidí (v živých datech jde o zástupný portrét): ' +
                  shared.map(([src, names]) => `${src} → ${names.join(', ')}`).join(' | ') +
                  '. Import ji zkopíruje beze změny; nahradit ji musí editor.',
        })
    }

    const noPhoto = people.filter((person) => !person.src)
    if (noPhoto.length) {
        warnings.push({
            level: 'info',
            text: `Bez fotky úplně: ${noPhoto.map((p) => squish(p.name)).join(', ')}`,
        })
    }

    const shortMessages = items.filter((i) => i.type === 'review' && i.data.message.length < 10)
    if (shortMessages.length) {
        warnings.push({
            level: 'warn',
            text: `${shortMessages.length} recenzí je kratších než minimum 10 znaků ze schématu ` +
                  '(src/cms/schemas/review.js). Importují se, ale ve Studiu je nepůjde uložit beze změny.',
        })
    }

    // Counters are the one thing in this migration that does not belong in a
    // document, and saying so is more useful than quietly copying them.
    const totalLikes = people.reduce((sum, p) => sum + (Number(p.likes) || 0), 0)
    const reviewLikes = reviews.reduce((sum, r) => sum + (Number(r.likes) || 0), 0)
    warnings.push({
        level: 'note',
        text: `Počítadla se kopírují jako snapshot (people: ${totalLikes} likes, reviews: ${reviewLikes} likes). ` +
              'Web je dnes inkrementuje za běhu; v CMS dokumentu je editor přepíše při každém uložení. ' +
              'Dlouhodobě patří do vlastní tabulky, ne do těla dokumentu.',
    })

    return warnings
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const printPlan = (plan, options) => {
    const byAction = plan.items.reduce((acc, item) => {
        acc[item.action] = (acc[item.action] || 0) + 1
        return acc
    }, {})

    const byType = plan.items.reduce((acc, item) => {
        acc[item.type] = acc[item.type] || { create: 0, update: 0, unchanged: 0, 'create?': 0 }
        acc[item.type][item.action] += 1
        return acc
    }, {})

    console.log('')
    console.log(c.bold('  cms-migrate — plán'))
    console.log(c.dim(`  ${supabaseUrl()}`))
    console.log(c.dim(`  režim: ${options.write ? c.red('ZÁPIS') : c.green('dry run (nic se nezapíše)')}`))
    console.log('')

    console.log(c.bold('  Zdroj (živá data, jen čtení)'))
    console.log(`    people  ${String(plan.source.people).padStart(4)} řádků`)
    console.log(`    reviews ${String(plan.source.reviews).padStart(4)} řádků`)
    console.log(`    total   ${String(plan.source.total).padStart(4)} řádek`)
    console.log('')

    console.log(c.bold('  Zahozené sloupce (osobní údaje, GDPR)'))
    for (const [table, columns] of Object.entries(DROPPED_COLUMNS)) {
        console.log(`    ${table}: ${c.red(columns.join(', '))}  ${c.dim('— IP adresy, bez uvedeného právního titulu')}`)
    }
    console.log('')

    if (!plan.tablesReady) {
        console.log(c.yellow('  Cílová tabulka cms_document zatím nedostupná:'))
        console.log(c.dim(`    ${plan.tableError}`))
        console.log(c.dim('    Akce níže jsou označeny "create?" — počítá se s prázdnou tabulkou.'))
        console.log(c.dim('    Spusťte nejdřív src/cms/server/migrations/0001_cms_tables.sql.'))
        console.log('')
    }

    console.log(c.bold('  Dokumenty k zápisu'))
    for (const [type, counts] of Object.entries(byType)) {
        const parts = Object.entries(counts)
            .filter(([, n]) => n > 0)
            .map(([action, n]) => `${action} ${n}`)
        console.log(`    ${type.padEnd(12)} ${parts.join(', ')}`)
    }
    console.log(c.dim(`    ${'—'.repeat(40)}`))
    console.log(`    ${'celkem'.padEnd(12)} ${Object.entries(byAction).map(([a, n]) => `${a} ${n}`).join(', ')}`)
    console.log('')

    // Always printed, not only with --verbose. Splitting a person's name is the
    // one irreversible-looking judgement this migration makes, so whoever runs
    // it should have to look at all thirteen before they type --write.
    const consultants = plan.items.filter((item) => item.type === 'consultant')
    if (consultants.length) {
        const clean = consultants.filter((item) => item.nameSplit.confident)
        console.log(c.bold('  Rozdělení jmen (people.name -> titul / jméno / příjmení)'))
        console.log(c.dim(`    ${'původní'.padEnd(24)} ${'titul'.padEnd(7)} ${'jméno'.padEnd(12)} příjmení`))
        for (const item of consultants) {
            const split = item.nameSplit
            const mark = split.confident ? c.green('ok') : c.yellow('!!')
            console.log(
                `    ${mark} ${split.source.padEnd(22)} ${String(split.academicTitle || '—').padEnd(7)} ` +
                `${String(split.firstName || '—').padEnd(12)} ${split.lastName}` +
                (split.confident ? '' : c.dim(`   ← ${split.reason}`))
            )
        }
        console.log(c.dim(`    ${'—'.repeat(60)}`))
        console.log(
            `    rozděleno ${clean.length}/${consultants.length}, ` +
            `k ruční kontrole ${consultants.length - clean.length}`
        )
        console.log('')
    }

    if (options.verbose) {
        console.log(c.bold('  Detail'))
        for (const item of plan.items) {
            const label = item.type === 'consultant' ? item.nameSplit.source
                : item.type === 'review' ? `#${item.data.order} ${item.data.customerName}`
                : item.data.key
            const status = item.status || 'draft'
            console.log(`    ${item.action.padEnd(10)} ${item.type.padEnd(11)} ${c.dim(`[${status}]`)} ${label}`)
        }
        console.log('')
    }

    if (plan.warnings.length) {
        console.log(c.bold('  Poznámky'))
        for (const warning of plan.warnings) {
            const mark = warning.level === 'warn' ? c.yellow('!') : warning.level === 'note' ? c.cyan('i') : c.dim('·')
            console.log(`    ${mark} ${warning.text}`)
        }
        console.log('')
    }

    if (!options.write) {
        console.log(c.green('  Dry run. Nic se nezapsalo.'))
        console.log(c.dim('  Zápis: node scripts/cms-migrate.js --write'))
        console.log('')
    }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const applyPlan = async (plan) => {
    if (!plan.tablesReady) {
        throw new Error(
            'Cílová tabulka není připravená, zápis se neprovede.\n' +
            `  ${plan.tableError}\n` +
            '  Spusťte src/cms/server/migrations/0001_cms_tables.sql.'
        )
    }

    const results = { created: 0, updated: 0, unchanged: 0, failed: 0 }

    for (const item of plan.items) {
        if (item.action === 'unchanged') {
            results.unchanged += 1
            continue
        }

        try {
            if (item.action === 'create') {
                const status = item.status || 'published'
                await cmsRequest('POST', 'cms_document', {
                    type: item.type,
                    status,
                    // Migrated content is content that is already live, so its
                    // body goes into `data` rather than staging as a draft.
                    // Unapproved reviews are the exception and carry an empty
                    // published body they will never serve.
                    data: status === 'published' ? item.data : {},
                    draft: status === 'published' ? null : item.data,
                    published_at: status === 'published'
                        ? (item.publishedAt || new Date().toISOString())
                        : null,
                    legacy_source: item.legacySource,
                    legacy_id: item.legacyId,
                })
                results.created += 1
            } else {
                // Only the body is rewritten, and only in the slot the document
                // is already using. Publication state is an editorial decision
                // made after the first import; a re-run must not undo it, and
                // must not promote a draft body into `data` behind the
                // editor's back.
                await cmsRequest('PATCH', `cms_document?id=eq.${item.existingId}`, {
                    [item.existingField || 'data']: item.data,
                })
                results.updated += 1
            }
        } catch (err) {
            results.failed += 1
            console.error(c.red(`    selhalo ${item.type} ${item.legacyId}: ${err.message}`))
        }
    }

    console.log(c.bold('  Zápis dokončen'))
    console.log(`    vytvořeno ${results.created}, aktualizováno ${results.updated}, beze změny ${results.unchanged}, selhalo ${results.failed}`)
    console.log('')

    if (results.failed) process.exitCode = 1
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP = `
  cms-migrate — Supabase -> CMS dokumenty

  node scripts/cms-migrate.js [flags]

  --write            Provede zápis. Bez něj je to dry run a nic se nezapíše.
  --only=a,b         Jen vybrané typy: consultant, review, siteCopy.
  --approve-all      Importuje i testovací recenze jako schválené.
                     Výchozí chování je označit je jako neschválené koncepty.
  --verbose          Vypíše každý dokument, ne jen souhrn.
  --json             Plán jako JSON na stdout (pro skripty).
  --help             Tato nápověda.

  Čte: people, reviews, total (GET, anon klíč).
  Píše: cms_document (service_role klíč, jen s --write).
  Nikdy nemění ani nemaže původní tabulky.
`

const parseArgs = (argv) => {
    const options = {
        write: false,
        verbose: false,
        json: false,
        approveAll: false,
        only: new Set(['consultant', 'review', 'siteCopy']),
    }

    for (const arg of argv) {
        if (arg === '--help' || arg === '-h') {
            console.log(HELP)
            process.exit(0)
        } else if (arg === '--write' || arg === '--commit') {
            options.write = true
        } else if (arg === '--verbose' || arg === '-v') {
            options.verbose = true
        } else if (arg === '--json') {
            options.json = true
        } else if (arg === '--approve-all') {
            options.approveAll = true
        } else if (arg.startsWith('--only=')) {
            options.only = new Set(arg.slice(7).split(',').map((s) => s.trim()).filter(Boolean))
        } else if (arg === '--dry-run') {
            // Accepted and ignored: it is already the default. Someone typing it
            // is asking for the behaviour they are getting.
        } else {
            console.error(c.red(`  Neznámý přepínač: ${arg}`))
            console.log(HELP)
            process.exit(2)
        }
    }

    return options
}

const main = async () => {
    const options = parseArgs(process.argv.slice(2))

    if (!supabaseUrl() || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error(c.red('  Chybí NEXT_PUBLIC_SUPABASE_URL nebo NEXT_PUBLIC_SUPABASE_ANON_KEY (.env).'))
        process.exit(1)
    }

    const plan = await buildPlan(options)

    if (options.json) {
        console.log(JSON.stringify({
            mode: options.write ? 'write' : 'dry-run',
            source: plan.source,
            droppedColumns: DROPPED_COLUMNS,
            tablesReady: plan.tablesReady,
            warnings: plan.warnings,
            items: plan.items.map(({ suspect, ...item }) => ({ ...item, suspect: Boolean(suspect) })),
        }, null, 2))
        return
    }

    printPlan(plan, options)

    if (!options.write) return

    console.log(c.red('  Zapisuji do cms_document...'))
    console.log('')
    await applyPlan(plan)
}

main().catch((err) => {
    console.error('')
    console.error(c.red(`  ${err.message}`))
    console.error('')
    process.exit(1)
})
