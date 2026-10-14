/**
 * Vymění v databázi zbytky ukázkových textů — angličtinu, Lorem ipsum,
 * „Project 04" a „Všechna práva udělena" — za češtinu, kterou mají komponenty
 * dnes jako zálohu.
 *
 * Proč skript, a ne jen nové zálohy v kódu: `cms-seed-copy.mjs` založil bloky
 * z tehdejších záloh, a bloky v databázi mají přednost. Oprava zálohy se tedy
 * na webu neprojeví, dokud v databázi stojí původní text.
 *
 * Mění pole JEN tehdy, když v něm doslova stojí původní ukázkový text. Cokoli,
 * co už někdo ve Studiu přepsal, zůstane, jak to je — skript se dá pustit na
 * běžícím webu a opakovaně. Opravuje publikovanou verzi (`data`) i rozepsaný
 * koncept (`draft`), pokud ho dokument má.
 *
 *     node scripts/cms-fix-copy.mjs           vypíše, co by změnil
 *     node scripts/cms-fix-copy.mjs --write   zapíše
 *
 * Databázi vybírá CMS_DATABASE stejně jako ostatní skripty (viz cms.database.js).
 */

import cmsDatabase from '../cms.database.js'
const { applyDatabaseEnv, describeDatabase } = cmsDatabase

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const loadEnvFile = () => {
    const file = path.join(ROOT, '.env')
    if (!fs.existsSync(file)) return
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
        const at = trimmed.indexOf('=')
        const name = trimmed.slice(0, at).trim()
        if (!(name in process.env)) process.env[name] = trimmed.slice(at + 1).trim()
    }
}

loadEnvFile()
const database = applyDatabaseEnv()

const LOREM_LONG = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const HISTORY_TITLE = '2023-11-15 | Annual Company Meeting'
const HISTORY_BODY = 'A weekend retreat focused on team-building activities to strengthen collaboration and communication among team members.'
const SCROLL_DOWN = 'Posuňte dolů'

// [cesta, původní text, nový text]. Nové texty jsou tytéž, které stojí jako
// záloha v komponentách — po opravě se web chová stejně, ať odpoví databáze,
// nebo záloha.
const SITE_COPY = {
    'o-nas.history.01': [
        ['title', HISTORY_TITLE, 'Tým | Začínáme u lidí'],
        ['body', HISTORY_BODY, 'Za každou smlouvou stojí člověk, který vám ji srozumitelně vysvětlí. Stavíme na týmu poradců, kteří se navzájem učí a podporují.'],
    ],
    'o-nas.history.02': [
        ['title', HISTORY_TITLE, 'Kancelář | Místo, kam se dá přijít'],
        ['body', HISTORY_BODY, 'Naše kancelář v Písku je otevřená každému, kdo chce mít ve svých financích jasno – v klidu, bez spěchu a bez závazků.'],
    ],
    'o-nas.history.03': [
        ['title', HISTORY_TITLE, 'Klienti | Rodiny, ne čísla'],
        ['body', HISTORY_BODY, 'Důvěřuje nám přes 3000 klientů. Ke každému přistupujeme individuálně, protože žádné dvě rodiny nemají stejné plány.'],
    ],
    'o-nas.history.04': [
        ['title', HISTORY_TITLE, 'Růst | Další kapitola'],
        ['body', HISTORY_BODY, 'Rosteme spolu s našimi klienty. Přibývají noví poradci i místa, kde se s námi můžete potkat.'],
    ],
    'global.footer': [
        ['items.2.label', '2024 © ProcházkaGroup Všechna práva udělena', '© Procházka Group. Všechna práva vyhrazena.'],
    ],
    'global.contact': [
        ['items.1.label', 'Email', 'E-mail'],
        ['items.2.label', 'Telčíslo', 'Tel. číslo'],
    ],
    'nabidky.partner.01': [
        ['image.alt', 'Project 01', 'Náhled webu pojistnehlaseni.cz'],
    ],
    'nabidky.partner.02': [
        ['image.alt', 'Project 02', 'Náhled webu kosmetického salonu Eleven Cosmetic'],
    ],
    'nabidky.partner.03': [
        ['image.alt', 'Project 03', 'Náhled webu květinového studia re-kvítka'],
    ],
    'nabidky.partner.04': [
        ['title', 'Project 04', 'Nový partner'],
        ['image.alt', 'Project 04', ''],
        // Bez odkazu se tlačítko „Navštívit stránky" u karty nekreslí.
        ['items.0.value', 'https://www.google.com', ''],
    ],
    'index.hero': [
        ['items.0.label', 'Scroll down', SCROLL_DOWN],
    ],
    'index.first-time': [
        ['items.6.label', 'Scroll down', SCROLL_DOWN],
    ],
    'index.clients': [
        ['items.3.label', 'Scroll down', SCROLL_DOWN],
    ],
    'index.reviews': [
        ['items.1.label', 'Scroll down', SCROLL_DOWN],
    ],
    'nabidka.hero': [
        ['items.1.label', 'Scroll', 'Dolů'],
    ],
    'index.qna': [
        ['items.1.label', 'QNA', 'Otázky'],
    ],
    'index.qna.otazky': [
        ['questions.0.answer', LOREM_LONG, 'Napište nám přes formulář vedle, zavolejte nebo si rovnou vyberte svého poradce. Ozveme se vám a domluvíme schůzku – osobně v kanceláři, nebo online, jak vám to bude vyhovovat.'],
        ['questions.1.answer', LOREM_SHORT, 'Spolupracujeme se 43 partnerskými společnostmi – bankami, pojišťovnami, investičními a penzijními společnostmi. Díky tomu vám můžeme porovnat nabídky napříč trhem a doporučit tu, která vám opravdu sedí.'],
        ['questions.2.answer', LOREM_SHORT, 'S čímkoli, co se týká vašich financí: hypotéka, úvěry a jejich konsolidace, pojištění, investice, spoření nebo zajištění na penzi. Pomůžeme vám i se sestavením rodinného rozpočtu.'],
        ['questions.3.answer', LOREM_SHORT, 'Ano. Konzultace i analýza vašich financí jsou pro vás zdarma a k ničemu vás nezavazují. Rozhodnutí, zda a jaký produkt sjednat, je vždy jen na vás.'],
        ['questions.4.answer', LOREM_SHORT, 'Program pro naše klienty: když nás doporučíte a z vašeho doporučení se stane nový klient, dostanete odměnu. Vyhráváte vy i ten, koho jste doporučili. Podrobnosti najdete na stránce Benefit program.'],
    ],
    'index.qna.formular': [
        // Text, kterým se otevíralo pole zprávy — a který odešel jako zpráva
        // každému, kdo ho nepřepsal.
        ['body', LOREM_LONG, ''],
        ['items.1.label', 'Email', 'E-mail'],
        ['items.3.label', 'Subjekt', 'Předmět'],
        ['items.6.label', 'Otázky/odpovědi', 'Hypotéka'],
        ['items.7.label', 'Otázky/odpovědi', 'Investice'],
        ['items.8.label', 'Otázky/odpovědi', 'Pojištění'],
        ['items.9.label', 'Otázky/odpovědi', 'Penze'],
        ['items.10.label', 'Otázky/odpovědi', 'Úvěry'],
        ['items.11.label', 'Kontakt', 'Jiné'],
    ],
}

// Texty tak jednoznačné, že je stačí najít kdekoli v bloku `siteCopy`: pole,
// jehož CELÁ hodnota je přesně tahle, se vymění, ať leží na jakékoli cestě.
const ANYWHERE = [
    ['Vyplňte formu', 'Vyplňte formulář'],
    ['Od modestních začátků', 'Od skromných začátků'],
]

// Nabídka „Project 04" existuje i jako samostatný dokument typu `offer`.
const OFFER_FIXES = [
    ['title', 'Project 04', 'Nový partner'],
    ['url', 'https://www.google.com', ''],
]

const getAt = (obj, dotted) =>
    dotted.split('.').reduce((at, part) => (at == null ? undefined : at[part]), obj)

const setAt = (obj, dotted, value) => {
    const parts = dotted.split('.')
    const last = parts.pop()
    const parent = parts.reduce((at, part) => at[part], obj)
    parent[last] = value
}

const short = (s) => `„${s.slice(0, 40)}${s.length > 40 ? '…' : ''}"`

// Všechny řetězce v dokumentu, s cestou: [['items.0.label', 'Vyplňte formu'], …]
const leaves = (value, at = '') => {
    if (typeof value === 'string') return [[at, value]]
    if (!value || typeof value !== 'object') return []
    return Object.entries(value).flatMap(([key, inner]) => leaves(inner, at ? `${at}.${key}` : key))
}

// Vrátí opravenou kopii a seznam změn; `null`, když není co měnit.
const fix = (body, fixes, anywhere = []) => {
    if (!body || typeof body !== 'object') return null
    const next = structuredClone(body)
    const changes = []
    for (const [where, from, to] of fixes) {
        if (getAt(next, where) !== from) continue
        setAt(next, where, to)
        changes.push(`${where}: ${short(from)} → ${short(to)}`)
    }
    for (const [where, value] of leaves(next)) {
        const hit = anywhere.find(([from]) => from === value)
        if (!hit) continue
        setAt(next, where, hit[1])
        changes.push(`${where}: ${short(hit[0])} → ${short(hit[1])}`)
    }
    return changes.length ? { next, changes } : null
}

const write = process.argv.includes('--write')

console.log(`Databáze: ${describeDatabase(database)}\n`)

const { getAdminClient } = await import('../src/cms/server/supabaseAdmin.js')
const db = getAdminClient()

const { data: rows, error: readError } = await db
    .from('cms_document')
    .select('id, type, status, data, draft, updated_at')
    .in('type', ['siteCopy', 'offer'])
    .limit(1000)
if (readError) {
    console.error('Čtení selhalo:', readError.message)
    process.exit(1)
}

const plan = []
for (const row of rows || []) {
    const siteCopy = row.type === 'siteCopy'
    const fixes = siteCopy
        ? SITE_COPY[row?.data?.key] || []
        : row?.data?.slug?.current === 'project-04' ? OFFER_FIXES : []
    const anywhere = siteCopy ? ANYWHERE : []

    const data = fix(row.data, fixes, anywhere)
    const draft = fix(row.draft, fixes, anywhere)
    if (!data && !draft) continue

    const label = row.type === 'siteCopy' ? row.data.key : `offer ${row.data.slug.current}`
    console.log(`~ ${label} (${row.id})`)
    for (const line of data?.changes || []) console.log(`     ${line}`)
    for (const line of draft?.changes || []) console.log(`     koncept — ${line}`)
    plan.push({ row, label, data, draft })
}

if (!plan.length) {
    console.log('\nŽádný ukázkový text nezbyl. Nic k zápisu.')
    process.exit(0)
}

if (!write) {
    console.log(`\nNic jsem nezapsal. Spusť znovu s --write (${plan.length} dokumentů).`)
    process.exit(0)
}

// Po jednom: když jeden zápis neprojde, ostatní projít mají a musí se dát říct
// který. Podmínka na `id` A na původní `updated_at` je pojistka proti souběhu —
// kdyby mezitím někdo ve Studiu publikoval, zápis nic nenajde a nepřepíše ho.
let selhalo = 0
for (const { row, label, data, draft } of plan) {
    const patch = { updated_at: new Date().toISOString() }
    if (data) patch.data = data.next
    if (draft) patch.draft = draft.next
    const { data: updated, error } = await db
        .from('cms_document')
        .update(patch)
        .eq('id', row.id)
        .eq('updated_at', row.updated_at)
        .select('id')
    if (error || !updated?.length) {
        console.error(`✗ ${label} — ${error ? error.message : 'dokument se mezitím změnil, přeskočeno'}`)
        selhalo += 1
        continue
    }
    console.log(`✓ ${label}`)
}

process.exit(selhalo ? 1 : 0)
