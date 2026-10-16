// Srdeční tep CMS — SERVER ONLY.
//
// ---------------------------------------------------------------------------
// Proč tohle existuje
//
// Supabase na free plánu USPÍ projekt po ~7 dnech bez provozu přes jeho API
// bránu — a uspaný projekt znamená web bez obsahu a bez obrázků, bez chyby,
// která by řekla proč. Cron UVNITŘ databáze (pg_cron) tomu nepomůže: počítá
// se provoz přes bránu, ne aktivita v Postgres.
//
// Tenhle modul je proto stavěný na volání ZVENČÍ — z čehokoli, co už někde
// běží (naplánovaná úloha Medusy, cron na Vercelu, GitHub Actions). Každé
// zavolání sáhne přes Supabase API na několik počtů, což je přesně ten provoz,
// který projekt drží vzhůru. A protože „prázdný ping jednou za čas" je přesně
// ten druh věci, o které se za půl roku neví, jestli ještě běží, nese s sebou
// důkaz: jednou za DIGEST_DAYS pošle správcům přehledový e-mail — šablonu
// cms-statistiky.jsx, která na svůj spouštěč čekala od svého vzniku.
//
// Doporučený rytmus volání je DENNĚ, ne jednou za pět dní: práh uspání je
// sedm dní, takže pětidenní kadence znamená, že jediný nepovedený běh projekt
// uspí. Denní ping je levný (čtyři HEAD dotazy) a e-mail stejně odejde jen
// jednou za období — o rozestupu rozhoduje razítko v cms_setting, ne kdo a
// jak často volá.
//
// ---------------------------------------------------------------------------
// Zabezpečení
//
// Endpoint je dosažitelný bez session (cron žádnou nemá), autentizuje ho
// CMS_CRON_SECRET v porovnání konstantním časem. Bez nastaveného tajemství
// se odmítá celý — heartbeat, který může spustit kdokoli, je nástroj na
// vyčerpání denního limitu Resend.

import { createHash, timingSafeEqual } from 'node:crypto'

import { forbidden, serverError } from './errors.js'
import { assertServer } from './env.js'
import { sendDigest } from './mail.js'
import { getAdminClient } from './supabaseAdmin.js'

const DIGEST_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000

/** Klíč razítka v cms_setting; formát podléhá check constraintu z 0006. */
export const HEARTBEAT_KEY = 'heartbeat'

const optional = (name) => String(process.env[name] || '').trim()

export const cronSecret = () => optional('CMS_CRON_SECRET')

/**
 * Porovnání tajemství konstantním časem. Přes SHA-256 obou stran, aby
 * timingSafeEqual dostal stejně dlouhé buffery i pro tajemství špatné délky —
 * délka zadaného tajemství jinak prosákne tím, že porovnání vůbec neproběhne.
 */
export const cronSecretMatches = (presented) => {
    const expected = cronSecret()
    if (!expected) return false
    const a = createHash('sha256').update(String(presented || '')).digest()
    const b = createHash('sha256').update(expected).digest()
    return timingSafeEqual(a, b)
}

const db = () => getAdminClient()

/** HEAD count, a když selže, null — přehled bez řádku je lepší než žádný. */
const countRows = async (build) => {
    try {
        const { count, error } = await build()
        if (error) return null
        return count ?? 0
    } catch {
        return null
    }
}

/** Razítko posledního přehledu, nebo null. */
const readStamp = async () => {
    const { data, error } = await db()
        .from('cms_setting')
        .select('value')
        .eq('key', HEARTBEAT_KEY)
        .maybeSingle()
    if (error) throw serverError('Čtení razítka heartbeatu selhalo')
    const at = data?.value?.last_mail_at
    return typeof at === 'string' && at ? at : null
}

const writeStamp = async (at) => {
    const existing = await db()
        .from('cms_setting')
        .select('key')
        .eq('key', HEARTBEAT_KEY)
        .maybeSingle()

    const write = existing?.data
        ? db().from('cms_setting').update({ value: { last_mail_at: at } }).eq('key', HEARTBEAT_KEY)
        : db().from('cms_setting').insert({ key: HEARTBEAT_KEY, value: { last_mail_at: at } })

    const { error } = await write
    if (error) throw serverError('Zápis razítka heartbeatu selhal')
}

const czechDate = (iso) =>
    new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })

/**
 * Jeden tep: sáhni na databázi, a když je čas, pošli přehled.
 *
 * Dotazy před rozhodnutím o e-mailu, ne za ním — udržet projekt vzhůru je
 * práce KAŽDÉHO tepu, e-mail jen některých. Všechna čísla jsou volitelná
 * (šablona vynechá řádek, ne celý přehled), takže jeden spadlý dotaz nezhasne
 * ani ping, ani zprávu.
 *
 * @returns {Promise<{db: object, mail: {sent: number|boolean, reason?: string}, nextMailAfter: string}>}
 */
export const beat = async ({ secret } = {}) => {
    assertServer('heartbeat')

    if (!cronSecretMatches(secret)) {
        throw forbidden(
            cronSecret()
                ? 'Neplatné tajemství heartbeatu'
                : 'Heartbeat je vypnutý — nastavte CMS_CRON_SECRET'
        )
    }

    const stamp = await readStamp()
    const since = stamp || new Date(Date.now() - DIGEST_DAYS * DAY_MS).toISOString()

    const touched = {
        documents: await countRows(() =>
            db().from('cms_document').select('id', { count: 'exact', head: true })
        ),
        published: await countRows(() =>
            db()
                .from('cms_document_revision')
                .select('id', { count: 'exact', head: true })
                .eq('reason', 'publish')
                .gt('changed_at', since)
        ),
        mediaAdded: await countRows(() =>
            db().from('cms_media').select('id', { count: 'exact', head: true }).gt('created_at', since)
        ),
        reviewsNew: await countRows(() =>
            db()
                .from('cms_document')
                .select('id', { count: 'exact', head: true })
                .eq('type', 'review')
                .gt('created_at', since)
        ),
    }

    const due = !stamp || Date.now() - new Date(stamp).getTime() >= DIGEST_DAYS * DAY_MS
    let mail = { sent: 0, reason: 'not-due' }

    if (due) {
        const now = new Date().toISOString()
        mail = await sendDigest({
            period: `${czechDate(since)} – ${czechDate(now)}`,
            published: touched.published,
            reviewsNew: touched.reviewsNew,
            mediaAdded: touched.mediaAdded,
        })
        // Razítko se posouvá jen po odeslaném přehledu. Neodeslaný (chybí
        // odesílatel, spadl Resend) se zkusí znovu při dalším tepu — přehled
        // se opozdí o den, ale neztratí; a databáze byla dotčena tak jako tak.
        if (mail.sent) await writeStamp(now)
    }

    return {
        db: touched,
        mail,
        nextMailAfter: new Date(
            (stamp ? new Date(stamp).getTime() : Date.now()) + DIGEST_DAYS * DAY_MS
        ).toISOString(),
    }
}
