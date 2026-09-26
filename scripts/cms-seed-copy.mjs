/**
 * Založí globální bloky textů, které v databázi ještě nejsou.
 *
 * Vlastní skript, ne řádek v `cms-seed.mjs`: ten migruje lidi a recenze ze
 * staré databáze a spouští se jednou za život projektu. Tohle se má dát pustit
 * na běžícím webu, aniž by hrozilo, že se u toho sáhne na cokoli jiného.
 *
 * Zapisuje hodnoty, které dnes stojí v komponentách jako záloha — po spuštění
 * se tedy na webu nic nezmění. Změní se jen to, že to jde upravit ve Studiu.
 *
 * Existující blok nechává být. Doplnit chybějící se proto dá kdykoli a
 * opakovaně; přepsat rozepsaný text editora nejde ani omylem.
 *
 * POŘADÍ POLOŽEK JE VAZBA na technické klíče, které v CMS nejsou:
 *
 *   global.cookies   kategorie souhlasu (`necessary`, `functional`, …) —
 *                    podle nich se souhlas ukládá
 *   global.navbar    adresa dlaždice (`/nabidka`, `contact`, …) — podle ní
 *                    odkaz vede
 *   404.tipy         která dlaždice L je která — první stojí v horní řadě
 *                    vedle cesty domů, zbylé čtyři v dolní
 *
 * A pořadí položek je vazba i tam, kde na druhé straně není klíč, ale pole
 * v konfiguraci: `global.cookies.popisky`, `global.contact.hlasky`
 * a `recenze.hlasky` jsou pojmenované pozice (`COOKIES_CHROME`,
 * `CONTACT_NOTICES`, `REVIEW_NOTICES` v src/lib/cms.config.js). Přehodit je
 * znamená napsat na ukládací tlačítko „Poskytovatelé".
 *
 * Přehodit položky tedy neznamená přeuspořádat text, ale rozpojit ho od toho,
 * k čemu patří. Viz komentáře v components/modems/Cookies a constants/common.
 *
 *     node scripts/cms-seed-copy.mjs           vypíše, co by udělal
 *     node scripts/cms-seed-copy.mjs --write   zapíše
 */

import cmsDatabase from '../cms.database.js'
const { applyDatabaseEnv } = cmsDatabase

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
applyDatabaseEnv?.()

const BLOCKS = [
    {
        key: 'global.cookies',
        page: 'global',
        title: 'Nastavení cookies',
        body:
            'Zde můžete upravit své preference ohledně cookies. ' +
            'Nezbytné cookies jsou vždy povoleny pro správné fungování webu.',
        items: [
            { label: 'Nezbytné', value: 'Nutné pro fungování webu' },
            { label: 'Funkční', value: 'Vylepšují funkcionalitu webu' },
            { label: 'Analytické', value: 'Měření návštěvnosti a chování uživatelů' },
            { label: 'Marketingové', value: 'Cílená reklama' },
        ],
    },
    {
        key: 'global.navbar',
        page: 'global',
        title: 'Menu — panel',
        // Osm dlaždic v pořadí, v jakém je má `NavPages` v constants/common.js.
        // `label` je slovo na dlaždici, `value` popisek pod ním; kam dlaždice
        // vede, tady není a být nemá — to je kód.
        items: [
            { label: 'Hlavní stránka', value: 'Kde to začíná.' },
            { label: 'Nabídka', value: 'Proč vůbec potřebujete poradce.' },
            { label: 'Benefit program', value: 'Odměny po příčkách.' },
            { label: 'Kontakt', value: 'Ozvěte se. Odpovídáme týž den.' },
            { label: 'O nás', value: 'Lidé, historie, kancelář v Písku.' },
            { label: 'Poradci', value: 'Vyberte si, kdo vám sedne.' },
            { label: 'Recenze', value: 'Co říkají klienti, celé.' },
            { label: 'Partneři', value: 'Banky a pojišťovny, se kterými pracujeme.' },
        ],
    },
    {
        key: 'global.cookies.popisky',
        page: 'global',
        title: 'Nastavení cookies — popisky',
        // Všechno v modálu, co není kategorie. Vlastní blok proto, že `items`
        // bloku výš JSOU čtyři kategorie — sedmá položka by v editorově seznamu
        // stála vedle nich jako pátá.
        items: [
            { label: 'Správa předvoleb', value: 'Nadhoz nad nadpisem' },
            { label: 'vždy zapnuto', value: 'U kategorie, kterou vypnout nejde' },
            { label: 'Poskytovatelé', value: 'Návěští seznamu poskytovatelů' },
            { label: 'Cookies', value: 'Návěští seznamu souborů' },
            { label: 'Uložit', value: 'Slova na ukládacím tlačítku' },
            { label: 'Zavřít nastavení cookies', value: 'Popisek zavíracího křížku pro odečítač obrazovky' },
        ],
    },
    {
        key: 'global.contact.hlasky',
        page: 'global',
        title: 'Kontakt — hlášky formuláře',
        // `value` je popisek řádku pro editora, na web nejde. V `items` je to
        // jediné, podle čeho pozná, kdy se hláška ukáže — stejně jako u podtextů
        // menu.
        items: [
            { label: 'Vyplňte prosím jméno, e-mail a telefon.', value: 'Když chybí povinné pole' },
            { label: 'Zkontrolujte prosím e-mailovou adresu.', value: 'Když e-mail nevypadá jako e-mail' },
            { label: 'Odesílání formuláře zatím není napojené.', value: 'Dokud odesílání není hotové' },
        ],
    },
    {
        key: 'recenze.hlasky',
        page: 'recenze',
        title: 'Recenze — hlášky formuláře',
        // Jeden blok pro /recenze i /recenze/[slug]: obě routy posílají recenzi
        // stejnou cestou, takže dvě sady stejných vět by byly dvě místa, kde se
        // dá změnit jen jedno.
        items: [
            { label: 'Doplňte prosím jméno.', value: 'Když chybí jméno' },
            { label: 'Vyberte prosím poradce.', value: 'Když není vybraný poradce' },
            { label: 'Napište prosím pár slov.', value: 'Když chybí text recenze' },
            { label: 'Děkujeme. Recenzi zveřejníme, jakmile ji projdeme.', value: 'Po úspěšném odeslání' },
            { label: 'Odeslání se nepovedlo. Zkuste to prosím znovu.', value: 'Když odeslání selže' },
            { label: 'Zkopírování se nepovedlo, označte prosím text ručně.', value: 'Když se text nepodaří zkopírovat' },
            { label: 'Vyberte poradce', value: 'Výzva v rozbalovacím seznamu' },
            { label: 'Zavřít', value: 'Popisek zavíracího křížku' },
        ],
    },
    {
        key: 'nabidka.pas.pusobeni',
        page: 'nabidka',
        title: 'Naše působení na trhu',
        body: 'To, co by vám trvalo několik dekád, zvládneme během několika let. Když do toho opravdu půjdete.',
        // items[0] je pořadové číslo kapitoly, items[1..4] čtyři čtverce
        // v pořadí, v jakém je pás staví. Popisek čtverce a jeho místo na zdi
        // spojuje jedině pozice — v CMS žádný klíč čtverce není.
        items: [
            { label: '01', value: 'Pořadové číslo kapitoly' },
            { value: '3000+', label: 'spokojených klientů' },
            { value: '12+', label: 'let na trhu' },
            { value: '43', label: 'partnerských společností' },
            { value: '9000+', label: 'podepsaných smluv' },
        ],
    },
    {
        key: 'nabidka.pas.historie',
        page: 'nabidka',
        title: 'Historie našeho systému',
        body:
            'Naše organizace roste už od roku 1970. Šestnáct trhů, na které jsme přišli ' +
            'jeden po druhém — najeďte na zemi a uvidíte, odkdy.',
        // Pozice 1–4 zůstávají prázdné schválně: jsou to čtverce první kapitoly
        // a výzva pod mapou má vlastní pozici, aby jedna adresa neznamenala
        // v jednom bloku počet a v druhém větu. Viz komentář v cms.config.js.
        items: [
            { label: '02', value: 'Pořadové číslo kapitoly' },
            { label: '', value: '' },
            { label: '', value: '' },
            { label: '', value: '' },
            { label: '', value: '' },
            { label: 'Ťukněte na zemi a uvidíte, odkdy tam jsme', value: 'Výzva pod mapou, dokud se nikoho nedotkl prst' },
        ],
    },
    {
        key: '404.uvod',
        page: '404',
        // Slova nadhozu. `title` proto, že na stránce sdílejí odstavec
        // s `<em>404</em>` a vlastní prvek nemají — upravují se formulářem.
        title: 'Stránka nenalezena',
        items: [
            { label: 'Nejrychlejší cesta', value: 'Popisek nad cestou domů' },
            { label: 'Zpět na hlavní stránku', value: 'Slova na cestě domů' },
        ],
    },
    {
        key: '404.tipy',
        page: '404',
        title: 'Rozcestník — tipy',
        // Pět dlaždic v pořadí, v jakém je rozcestník sází: první nahoře vedle
        // cesty domů, zbylé čtyři dole. Šestá by se neobjevila na konci řady,
        // ale nikde — šířky se počítají z pevných polí v komponentě.
        items: [
            { label: 'Tip 01', value: 'Všechno podstatné je v menu nahoře.' },
            { label: 'Tip 02', value: 'Nabídka má vlastní stránku — co pro vás vyřešíme a za kolik.' },
            { label: 'Tip 03', value: 'Recenze klientů najdete pod vlastní adresou /recenze.' },
            { label: 'Tip 04', value: 'Spojit se s námi jde kdykoli — vpravo nahoře.' },
            { label: 'Tip 05', value: 'Benefit program: doporučení, které se počítá.' },
        ],
    },
]

const write = process.argv.includes('--write')

const { getAdminClient } = await import('../src/cms/server/supabaseAdmin.js')
const db = getAdminClient()

// Jedno čtení pro všechny bloky. `siteCopy` jich v tomhle projektu nemá ani sto
// a druhý dotaz na řádek by byl druhý způsob, jak se to může rozejít.
const { data: existing, error: readError } = await db
    .from('cms_document')
    .select('id, status, data')
    .eq('type', 'siteCopy')
    .limit(500)
if (readError) {
    console.error('Čtení selhalo:', readError.message)
    process.exit(1)
}

const have = new Map((existing || []).map((row) => [row?.data?.key, row]))
const chybi = BLOCKS.filter((block) => !have.has(block.key))

for (const block of BLOCKS) {
    const found = have.get(block.key)
    if (found) {
        console.log(`✓ ${block.key} — už existuje (${found.status}), nesahám na něj`)
        continue
    }
    console.log(`+ ${block.key} — chybí, založím:`)
    console.log(`     nadpis:  ${block.title}`)
    if (block.body) console.log(`     text:    ${block.body.slice(0, 58)}…`)
    for (const item of block.items || []) {
        console.log(`     položka: ${item.label} — ${item.value}`)
    }
}

if (!chybi.length) {
    console.log('\nVšechno je na místě. Nic k zápisu.')
    process.exit(0)
}

if (!write) {
    console.log(`\nNic jsem nezapsal. Spusť znovu s --write (${chybi.length} k založení).`)
    process.exit(0)
}

// Po jednom, ne dávkou. Když jeden zápis neprojde, ostatní projít mají a musí
// se dát říct který — dávka by odpověděla jednou chybou za celek.
let selhalo = 0
for (const block of chybi) {
    const now = new Date().toISOString()
    const { data: created, error } = await db
        .from('cms_document')
        .insert({ type: 'siteCopy', status: 'published', data: block, published_at: now })
        .select('id')
        .single()
    if (error) {
        console.error(`✗ ${block.key} — zápis selhal: ${error.message}`)
        selhalo += 1
        continue
    }
    console.log(`✓ ${block.key} — založený a publikovaný (${created.id})`)
}

process.exit(selhalo ? 1 : 0)
