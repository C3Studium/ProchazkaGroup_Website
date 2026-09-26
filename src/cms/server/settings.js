// What the deployment is actually configured to do — facts, never secrets.
//
// ---------------------------------------------------------------------------
// THE RULE THIS FILE EXISTS TO HOLD
// ---------------------------------------------------------------------------
//
// No function here returns the VALUE of a secret. Not SUPABASE_SERVICE_ROLE_KEY,
// not CMS_SESSION_SECRET, not CMS_ADMIN_PASSWORD, not CMS_IP_HASH_SALT. Not
// masked, not the last four characters, not behind a "reveal" the owner has to
// click. Set or not set, and nothing more.
//
// The reason is mechanical rather than a matter of taste. Anything this module
// returns is JSON on the wire, in a browser tab, in that tab's memory, in the
// devtools network panel, and in whatever the person's browser syncs — and a
// service-role key is the credential that bypasses every RLS policy in
// migrations/0001. There is no version of "the owner is trusted" that makes
// putting it there a good trade, because the owner already has a way to read
// their own environment: the place they typed it in. A settings screen that
// prints it converts a secret held in one system into a secret held in five.
//
// If a future ask is "just show me the first six characters so I can tell which
// key it is", the answer is a fingerprint — a hash — not a substring. Which is
// what `keyFingerprint` below is for, and it is deliberately NOT wired into the
// status payload: nobody has needed it yet.
//
// The other half of the rule is that this is the only way the Studio learns any
// of it. No component reads `process.env`: the server-only names are undefined
// in a browser bundle by construction (env.js's header explains why), and a
// NEXT_PUBLIC_ mirror of any of them would publish the value.

import { createHash } from 'node:crypto'

import {
    assertServer,
    hasServiceRoleKey,
    isProduction,
    mediaBucket,
    storageDriver,
    supabaseUrl,
} from './env.js'
import { invalid, serverError } from './errors.js'
import { getAdminClient } from './supabaseAdmin.js'

/**
 * `https://gkzobudtjpucpstclmli.supabase.co` -> `gkzobudtjpucpstclmli`.
 *
 * The project ref is in every request URL the browser already makes and in the
 * anon key's payload; it identifies WHICH Supabase project, which is exactly the
 * question an owner staring at two environments needs answered. It is not a
 * credential and treating it as one would leave the screen unable to say
 * anything useful at all.
 */
const projectRef = (url) => {
    const match = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in|net)/i.exec(String(url || ''))
    return match ? match[1] : null
}

/**
 * A short SHA-256 of a value, for telling two configurations apart without
 * carrying either of them. Unused by `readStatus` on purpose — see the header.
 */
export const keyFingerprint = (value) =>
    value ? createHash('sha256').update(String(value)).digest('hex').slice(0, 12) : null

const present = (name) => Boolean(String(process.env[name] || '').trim())

/**
 * The status payload.
 *
 * Every entry is a boolean, an enum, or a non-secret identifier. Read the list
 * as the set of things that would otherwise be found out by guessing:
 *
 *   - whether the service-role key is set, and therefore which persistence is
 *     live. env.js `hasServiceRoleKey()` is the one question that decides both
 *     the document store and the storage driver, so it is reported once and the
 *     two consequences are reported next to it.
 *   - which Supabase project the deployment points at.
 *   - which account bootstrapped as owner. An address, and the owner's own; it
 *     is already on the users screen.
 */
export const readStatus = () => {
    assertServer('readStatus')

    const serviceRole = hasServiceRoleKey()

    let url = null
    try {
        url = supabaseUrl()
    } catch {
        // required() throws when it is unset, which is itself the answer.
        url = null
    }

    return {
        environment: isProduction() ? 'production' : 'development',

        supabase: {
            url,
            projectRef: projectRef(url),
            anonKeySet: present('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
            serviceRoleKeySet: serviceRole,
        },

        // "Which store is live" is derived from the same call the code makes,
        // not restated. A screen that answered from a second definition would
        // eventually be confidently wrong.
        persistence: {
            driver: serviceRole ? 'supabase' : 'file',
            storageDriver: storageDriver(),
            mediaBucket: mediaBucket(),
            // The file store refuses to run in production (fileStore/store.js):
            // Vercel's filesystem is per-invocation, so saves would vanish. A
            // deployment in that state is broken and should say so here.
            fileStoreInProduction: isProduction() && !serviceRole,
        },

        auth: {
            // The address, never the password. AUTH.md: the pair is a seed and
            // is inert once an owner exists, which is worth showing because
            // "CMS_ADMIN_PASSWORD is still set" reliably reads as a back door
            // to someone who has not read that document.
            bootstrapEmail: String(process.env.CMS_ADMIN_EMAIL || '').trim().toLowerCase() || null,
            bootstrapPasswordSet: present('CMS_ADMIN_PASSWORD'),
            sessionSecretSet: present('CMS_SESSION_SECRET'),
            ipHashSaltSet: present('CMS_IP_HASH_SALT'),
        },

    }
}


/* --------------------------------------------------------- jazyky webu --- */
//
// Tady končí to, co říká prostředí, a začíná to, co si vybral majitel. Dvě
// odlišné otázky a schválně dva různé zdroje — nahoře `process.env`, tady řádek
// v `cms_setting` (migrations/0006). Je to v jednom souboru proto, že obojí
// odpovídá jedné obrazovce Nastavení, ne proto, že by to bylo totéž.
//
// Proč v databázi a ne v konfiguraci: jazyk přidává majitel z prohlížeče a má
// se to projevit při dalším požadavku, ne při dalším nasazení (I18N.md, oddíl 1).
// Konfigurační soubor by znamenal, že přidání jazyka je práce pro programátora.
//
// POZOR, a Nastavení to musí říct nahlas: nový jazyk v téhle tabulce NEVYROBÍ
// novou routu. Stránky vznikají při buildu, takže přidání jazyka je vždycky
// dvoukrokové — tady a pak nasazení.

const SETTING_TABLE = 'cms_setting'

/** Stabilní klíč, napsaný doslova tady a nikde jinde. */
export const SITE_LANGUAGES_KEY = 'site.languages'

/**
 * Jak vypadá web, do kterého nikdo nesáhl: jeden jazyk, čeština, zapnutá.
 *
 * Jeden jazyk není zvláštní případ, je to výchozí stav — všechno kolem musí
 * fungovat i pro něj, protože tak to pojede dřív, než někdo přidá druhý.
 */
export const SITE_LANGUAGES_DEFAULTS = Object.freeze({
    default: 'cs',
    list: Object.freeze([Object.freeze({ code: 'cs', label: 'Čeština', enabled: true })]),
})

// BCP 47, týž tvar, jaký přijme CHECK v migrations/0013. Kdyby se tyhle dva
// rozešly, dal by se v Nastavení přidat jazyk, do kterého pak nejde uložit
// jediné slovo — a chyba by se ukázala až u prvního překladu.
const CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

const LABEL_MAX = 60

/**
 * Cokoli -> platný seznam jazyků.
 *
 * Používá se na cestě z databáze, ne do ní — stejná asymetrie jako
 * u manageWidget.js: kdo napíše nesmysl, ten se to dozví (`validate`), ale řádek,
 * který nesmysl z jakéhokoli důvodu obsahuje, nesmí shodit veřejnou stránku.
 * Nejhorší, co se smí stát, je web v češtině.
 */
const coerce = (value) => {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    const seen = new Set()
    const list = (Array.isArray(source.list) ? source.list : [])
        .map((entry) => {
            const code = String(entry?.code || '').trim()
            if (!CODE.test(code) || seen.has(code)) return null
            seen.add(code)
            return {
                code,
                label: String(entry?.label || code).trim().slice(0, LABEL_MAX) || code,
                enabled: entry?.enabled !== false,
            }
        })
        .filter(Boolean)

    if (!list.length) return { ...SITE_LANGUAGES_DEFAULTS, list: [...SITE_LANGUAGES_DEFAULTS.list] }

    // Výchozí jazyk musí v seznamu být. Je to ten, jehož obsah leží v základním
    // řádku `cms_document`; kdyby ukazoval jinam, četl by se obsah, který tam
    // nikdo nenapsal.
    const fallback = String(source.default || '').trim()
    return {
        default: list.some((entry) => entry.code === fallback) ? fallback : list[0].code,
        list,
    }
}

/**
 * Totéž, ale odmítá to, co by `coerce` tiše opravil.
 *
 * Výchozí jazyk se nedá smazat ani přejmenovat bez migrace dat, takže se to
 * refuzuje tady — ne až v okamžiku, kdy web přestane mít texty.
 */
const validate = (patch) => {
    const source = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}
    const list = Array.isArray(source.list) ? source.list : null
    if (!list || !list.length) throw invalid('Seznam jazyků nesmí být prázdný')

    const seen = new Set()
    for (const entry of list) {
        const code = String(entry?.code || '').trim()
        if (!CODE.test(code)) {
            throw invalid(`Neplatný kód jazyka: ${JSON.stringify(entry?.code)}`, {
                code: 'Kód je BCP 47, například cs, en, de nebo pt-BR.',
            })
        }
        if (seen.has(code)) throw invalid(`Jazyk „${code}" je v seznamu dvakrát`)
        seen.add(code)

        if (entry?.label != null && String(entry.label).length > LABEL_MAX) {
            throw invalid(`Název jazyka „${code}" je delší než ${LABEL_MAX} znaků`)
        }
        if (entry?.enabled != null && typeof entry.enabled !== 'boolean') {
            throw invalid(`Hodnota „enabled" u jazyka „${code}" musí být true nebo false`)
        }
    }

    const fallback = String(source.default || '').trim()
    if (!seen.has(fallback)) {
        throw invalid('Výchozí jazyk musí být v seznamu', {
            default: `Vyberte jeden z: ${[...seen].join(', ')}`,
        })
    }
    // Vypnutý výchozí jazyk by znamenal web bez jediného jazyka, ve kterém
    // obsah opravdu je.
    if (list.some((entry) => String(entry?.code).trim() === fallback && entry?.enabled === false)) {
        throw invalid('Výchozí jazyk nejde vypnout')
    }

    return coerce(source)
}

/**
 * Jazyky, jak je má tenhle web nastavené.
 *
 * Chybějící řádek, nezmigrovaná databáze i úložiště, které odmítne běžet,
 * odpovídají výchozím hodnotami, ne chybou — stejná pozice jako
 * `readManageWidget`. Čte to cesta, po které se vykresluje veřejná stránka,
 * a „web je česky" je na každou z těch situací správná odpověď; 500 na veřejné
 * routě proto, že si nikdo neotevřel Nastavení, není.
 */
export const readSiteLanguages = async () => {
    assertServer('readSiteLanguages')

    try {
        const { data, error } = await getAdminClient()
            .from(SETTING_TABLE)
            .select('value')
            .eq('key', SITE_LANGUAGES_KEY)
            .maybeSingle()

        if (error) throw new Error(error.message)
        return coerce(data?.value)
    } catch (failure) {
        console.warn(
            `[cms] ${SETTING_TABLE}/${SITE_LANGUAGES_KEY} nelze přečíst, použity výchozí hodnoty:`,
            failure.message
        )
        return { ...SITE_LANGUAGES_DEFAULTS, list: [...SITE_LANGUAGES_DEFAULTS.list] }
    }
}

/** Kódy zapnutých jazyků, v pořadí ze seznamu — to, na co se ptá routování. */
export const readEnabledLanguages = async () => {
    const languages = await readSiteLanguages()
    return languages.list.filter((entry) => entry.enabled).map((entry) => entry.code)
}

/**
 * Zápis. Jen pro majitele — kontroluje se to v handleru, dřív než se sem dojde,
 * tedy tam, kde v tomhle serveru bydlí každá autorizace.
 *
 * Select-then-insert-or-update a ne `upsert`, ze stejného důvodu jako
 * v manageWidget.js: souborové úložiště umí jen slovesa, která repozitář
 * opravdu používá.
 */
export const writeSiteLanguages = async (actor, patch) => {
    assertServer('writeSiteLanguages')

    const value = validate(patch)
    const stamp = { value, updated_by: actor?.id ?? null, updated_at: new Date().toISOString() }
    const db = getAdminClient()

    const existing = await db.from(SETTING_TABLE).select('key').eq('key', SITE_LANGUAGES_KEY).maybeSingle()
    if (existing.error) throw serverError('Uložení jazyků selhalo')

    const { error } = existing.data
        ? await db.from(SETTING_TABLE).update(stamp).eq('key', SITE_LANGUAGES_KEY)
        : await db.from(SETTING_TABLE).insert({ key: SITE_LANGUAGES_KEY, ...stamp })

    if (error) throw serverError('Uložení jazyků selhalo')

    return value
}
