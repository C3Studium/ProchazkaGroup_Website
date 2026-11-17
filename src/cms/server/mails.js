// Texty e-mailů, které web posílá — upravitelné ve Studiu. SERVER ONLY.
//
// ---------------------------------------------------------------------------
// Co to je
// ---------------------------------------------------------------------------
//
// Web má pár e-mailů (potvrzení z formuláře, poptávka majiteli…). Jejich
// znění bylo dosud v kódu a změna jedné věty znamenala nasazení. Tenhle modul
// dává každému e-mailu KATALOG polí s výchozím zněním a Studio (obrazovka
// E-maily) do nich pustí majitele: prázdné pole = výchozí znění z kódu,
// vyplněné = přepis. Odesílání si pak vezme `mailTexts()` a šablona dostane
// hotové texty.
//
// Web katalog DEKLARUJE (`defineMails`), šablony zůstávají jeho — knihovna
// neví, čím se e-maily vykreslují (React Email, vlastní JSX, cokoli), proto
// náhled dodává sám web funkcí `preview(texts)`, která vrátí HTML se
// vzorovými daty.
//
// ---------------------------------------------------------------------------
// Kde to leží
// ---------------------------------------------------------------------------
//
// V `cms_setting`, jeden řádek na e-mail (`mail.texts.<klíč>`), hodnota je
// plochý objekt `{ subject, <pole>: text }` jen s tím, co majitel přepsal.
// Stejná tabulka a stejná slovesa jako odesílatel (settings.js), takže to jede
// i nad souborovým úložištěm. Čtení nikdy nespadne: bez databáze platí kód.
//
// Zástupné symboly `{jméno}` v textech nahrazuje web při odesílání (`fill`),
// katalog je jen popisuje v nápovědě pole, aby je majitel nepřepsal omylem.

import { assertServer } from './env.js'
import { getAdminClient } from './supabaseAdmin.js'
import { invalid, notFound, serverError } from './errors.js'

const SETTING_TABLE = 'cms_setting'

/** Klíč řádku v `cms_setting`: `mail.texts.<klíč e-mailu>`. */
export const MAIL_TEXTS_PREFIX = 'mail.texts.'

const MAIL_KEY = /^[a-z0-9][a-z0-9-]{0,60}$/
const FIELD_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/
/** Víc než tohle není věta v e-mailu, ale příloha. */
const TEXT_MAX = 4000
const SUBJECT_MAX = 200

const text = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value))

/**
 * Katalog e-mailů webu. Volá se jednou, v modulu, který znají odesílání
 * i API routa (`handleCmsRequest(req, res, { mails })`).
 *
 * Každý e-mail: `{ key, title, audience, subject, fields, preview }`
 *   key        `kontakt-potvrzeni` — stálý, je to klíč v databázi
 *   title      jak se jmenuje v seznamu
 *   audience   'customer' (chodí zákazníkům) | 'owner' (chodí majiteli)
 *   subject    výchozí předmět
 *   fields     [{ key, label, default, hint?, lines? }]
 *                lines: true = víceřádkové pole (odstavec), jinak jeden řádek
 *   preview    async (texts) => string — HTML se vzorovými daty, pro Studio
 *   note?      věta pod formulářem (např. „jména a čísla doplní web")
 *
 * Chyba v deklaraci se hlásí hned, při startu — ne až ve Studiu.
 */
export const defineMails = (list) => {
    if (!Array.isArray(list)) throw new Error('defineMails: čeká se pole e-mailů')
    const seen = new Set()
    return Object.freeze(
        list.map((entry, index) => {
            const key = text(entry?.key).trim()
            if (!MAIL_KEY.test(key)) throw new Error(`defineMails: e-mail #${index + 1} má neplatný klíč "${key}" (malá písmena, číslice, pomlčky)`)
            if (seen.has(key)) throw new Error(`defineMails: klíč "${key}" je dvakrát`)
            seen.add(key)

            const fieldKeys = new Set()
            const fields = (Array.isArray(entry.fields) ? entry.fields : []).map((field, i) => {
                const fieldKey = text(field?.key).trim()
                if (!FIELD_KEY.test(fieldKey) || fieldKey === 'subject') {
                    throw new Error(`defineMails: ${key} — pole #${i + 1} má neplatný klíč "${fieldKey}"`)
                }
                if (fieldKeys.has(fieldKey)) throw new Error(`defineMails: ${key} — pole "${fieldKey}" je dvakrát`)
                fieldKeys.add(fieldKey)
                return Object.freeze({
                    key: fieldKey,
                    label: text(field.label).trim() || fieldKey,
                    default: text(field.default),
                    hint: text(field.hint).trim(),
                    lines: field.lines === true,
                })
            })

            return Object.freeze({
                key,
                title: text(entry.title).trim() || key,
                audience: entry.audience === 'owner' ? 'owner' : 'customer',
                subject: text(entry.subject).trim(),
                note: text(entry.note).trim(),
                fields: Object.freeze(fields),
                preview: typeof entry.preview === 'function' ? entry.preview : null,
            })
        }),
    )
}

/** E-mail podle klíče, nebo null. */
export const mailByKey = (mails, key) => (Array.isArray(mails) ? mails.find((m) => m.key === key) || null : null)

/**
 * Jen to, co majitel smí uložit: známá pole, řetězce, oříznuté. Prázdný
 * řetězec se neukládá — prázdné pole ZNAMENÁ výchozí znění, ne prázdný text.
 */
export const cleanMailTexts = (mail, values) => {
    const source = values && typeof values === 'object' && !Array.isArray(values) ? values : {}
    const out = {}
    const subject = text(source.subject).replace(/[\r\n]+/g, ' ').trim().slice(0, SUBJECT_MAX)
    if (subject) out.subject = subject
    for (const field of mail.fields) {
        const value = text(source[field.key]).replace(/\r\n?/g, '\n')
        const kept = field.lines ? value.replace(/\s+$/, '') : value.replace(/\s*\n\s*/g, ' ').trim()
        if (kept.trim()) out[field.key] = kept.slice(0, TEXT_MAX)
    }
    return out
}

/** Uložené přepisy jednoho e-mailu. Selhání čtení = `{}` (platí kód). */
export const readMailTexts = async (key) => {
    assertServer('readMailTexts')
    try {
        const { data, error } = await getAdminClient()
            .from(SETTING_TABLE)
            .select('value')
            .eq('key', MAIL_TEXTS_PREFIX + key)
            .maybeSingle()
        if (error) throw new Error(error.message)
        const value = data?.value
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    } catch (failure) {
        console.warn(`[cms] ${SETTING_TABLE}/${MAIL_TEXTS_PREFIX}${key} nelze přečíst, platí texty z kódu:`, failure.message)
        return {}
    }
}

/**
 * Zápis přepisů jednoho e-mailu. Celá hodnota najednou (Studio posílá všechna
 * pole), prázdný objekt = vrátit e-mail na výchozí znění.
 */
export const writeMailTexts = async (actor, mail, values) => {
    assertServer('writeMailTexts')
    if (!mail) throw notFound('Takový e-mail web nemá')

    const cleaned = cleanMailTexts(mail, values)
    const key = MAIL_TEXTS_PREFIX + mail.key
    const stamp = { value: cleaned, updated_by: actor?.id ?? null, updated_at: new Date().toISOString() }
    const db = getAdminClient()

    // Vymazání se ukládá jako prázdná hodnota, ne smazáním řádku — souborové
    // úložiště umí jen slovesa, která repozitář opravdu používá (settings.js).
    const existing = await db.from(SETTING_TABLE).select('key').eq('key', key).maybeSingle()
    if (existing.error) throw serverError('Uložení textů e-mailu selhalo')

    const { error } = existing.data
        ? await db.from(SETTING_TABLE).update(stamp).eq('key', key)
        : await db.from(SETTING_TABLE).insert({ key, ...stamp })
    if (error) throw serverError('Uložení textů e-mailu selhalo')

    return cleaned
}

/**
 * Texty, se kterými se opravdu posílá: přepis, jinak výchozí z katalogu.
 * Čistá funkce — `stored` je výsledek `readMailTexts`.
 *
 * @returns {{ subject: string, texts: Record<string, string> }}
 */
export const resolveMailTexts = (mail, stored = {}) => {
    const source = stored && typeof stored === 'object' ? stored : {}
    const texts = {}
    for (const field of mail.fields) {
        const own = text(source[field.key])
        texts[field.key] = own.trim() ? own : field.default
    }
    const subject = text(source.subject).trim() || mail.subject
    return { subject, texts }
}

/**
 * Totéž, ale rovnou z databáze — tohle volá odesílání.
 *
 *     const { subject, texts } = await mailTexts(mails, 'kontakt-potvrzeni')
 *
 * Nikdy nespadne: bez databáze přijdou texty z kódu.
 */
export const mailTexts = async (mails, key) => {
    const mail = mailByKey(mails, key)
    if (!mail) throw new Error(`mailTexts: e-mail "${key}" není v katalogu (defineMails)`)
    return resolveMailTexts(mail, await readMailTexts(key))
}

/**
 * Co vidí Studio: každý e-mail s výchozím zněním a s tím, co je přepsané.
 * Žádná funkce, žádné HTML — jen data pro formulář.
 */
export const mailCatalog = async (mails) => {
    const list = Array.isArray(mails) ? mails : []
    const stored = await Promise.all(list.map((mail) => readMailTexts(mail.key)))
    return list.map((mail, i) => ({
        key: mail.key,
        title: mail.title,
        audience: mail.audience,
        note: mail.note,
        hasPreview: Boolean(mail.preview),
        subject: { default: mail.subject, value: text(stored[i].subject) },
        fields: mail.fields.map((field) => ({
            key: field.key,
            label: field.label,
            hint: field.hint,
            lines: field.lines,
            default: field.default,
            value: text(stored[i][field.key]),
        })),
    }))
}

/** Jedna položka katalogu po uložení — stejný tvar jako v seznamu. */
export const mailCatalogItem = async (mails, key) => {
    const [item] = await mailCatalog([mailByKey(mails, key)].filter(Boolean))
    return item || null
}

/**
 * Náhled pro Studio: texty z formuláře (ne z databáze — majitel ještě
 * neuložil) dosazené do šablony webu se vzorovými daty.
 */
export const previewMail = async (mail, values) => {
    if (!mail) throw notFound('Takový e-mail web nemá')
    const { subject, texts } = resolveMailTexts(mail, cleanMailTexts(mail, values))
    if (!mail.preview) return { subject, html: null }
    let html
    try {
        html = await mail.preview(texts, { subject })
    } catch (failure) {
        throw invalid(`Náhled e-mailu se nepovedl: ${failure?.message || failure}`)
    }
    return { subject, html: text(html) }
}

/* ------------------------------------------------------------ pomůcky --- */

/**
 * `{jméno}` → hodnota. Neznámý symbol zůstane, jak je, ať je v náhledu vidět,
 * co web nedoplnil. Hodnoty jsou text, ne HTML — o escapování se stará
 * šablona, která je vykresluje.
 */
export const fill = (template, vars = {}) =>
    text(template).replace(/\{([^{}]+)\}/g, (match, name) => {
        const key = String(name).trim()
        return Object.prototype.hasOwnProperty.call(vars, key) && vars[key] != null ? String(vars[key]) : match
    })

/** Víceřádkové pole na odstavce: Enter ve Studiu = nový odstavec v e-mailu. */
export const lines = (value) =>
    text(value)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
