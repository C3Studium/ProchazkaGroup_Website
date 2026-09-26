// /api/cms/settings/*  — the owner's configuration surface.
//
//   GET    /settings/status              environment facts   (owner)
//   GET    /settings/probe               anon exposure probe (owner)
//   GET    /settings/keys                API keys            (owner)
//   POST   /settings/keys                issue one           (owner)
//   DELETE /settings/keys/:id            revoke              (owner)
//   GET    /settings/sessions            who is signed in    (owner)
//   DELETE /settings/sessions/:id        end one             (owner)
//   POST   /settings/sessions/revoke-all sign out everywhere (owner)
//   GET    /settings/languages           jazyky webu         (session)
//   PUT    /settings/languages           uložit seznam       (owner)
//   GET    /settings/studio-language     jazyk Studia        (session)
//   PUT    /settings/studio-language     přepnout ho         (owner)
//
// requireOwner() is called ONCE, at the top, before any branch — so there is no
// route below it that can be added without the check, and no second
// authorisation path to keep in step. handlers/documents.js has the same shape
// with requireUser(); this is that pattern with the stronger role.
//
// The Studio also hides the screen from an editor. That is a courtesy. This is
// the control, and it answers 403 whatever the UI believed.
//
// ---------------------------------------------------------------------------
// Dvě čtení, která stačí redaktorovi — a proč to pravidlo výš neruší
// ---------------------------------------------------------------------------
//
// `GET /settings/languages` a `GET /settings/studio-language` se ptají na
// session, ne na vlastníka. Důvod je věcný: seznam jazyků potřebuje výběr
// jazyka v editaci a jazyk Studia potřebuje samo Studio, a obojí používá
// redaktor, který na tuhle obrazovku nikdy nevkročí. Kdyby ta dvě čtení
// odpovídala 403, editace by musela mít vlastní zdroj pravdy o jazycích —
// tedy druhou definici, která se dřív nebo později rozejde.
//
// Pravidlo, o které tu jde a které platí dál beze změny: pod `/settings/*`
// se nedostane nikdo bez přihlášení a nic se tu nezapíše bez vlastníka.
// Autorizace je pořád jedno volání nad každou větví, jen si u jazyků vybírá
// mezi `requireUser` a `requireOwner` podle metody. Veřejné čtení by tenhle
// namespace mít nesměl — handlers/widget.js vysvětluje, proč kvůli tomu bydlí
// jinde.

import { currentSessionHash, requireOwner, requireUser } from '../auth.js'
import { createApiKey, listApiKeys, revokeApiKey } from '../apiKeys.js'
import { listSessions, revokeAllSessions, revokeSession } from '../sessions.js'
import { probeAnonAccess } from '../anonProbe.js'
import { readSiteLanguages, readStatus, writeSiteLanguages } from '../settings.js'
import { getAdminClient } from '../supabaseAdmin.js'
import { invalid, notFound, serverError } from '../errors.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

const handleKeys = async (req, res, segments) => {
    const actor = await requireOwner(req, res)
    const [id] = segments

    if (!id) {
        if (req.method === 'GET') return sendJson(res, 200, await listApiKeys())
        if (req.method === 'POST') {
            const body = await readJson(req)
            // 201 with the token in the body. It is in a no-store response over
            // TLS to the owner who asked for it, and this is the only time it
            // exists outside a digest — users.js's generated password, exactly.
            return sendJson(res, 201, await createApiKey(actor, { name: body.name }))
        }
        return methodNotAllowed(res, ['GET', 'POST'])
    }

    if (req.method === 'DELETE') return sendJson(res, 200, await revokeApiKey(actor, id))
    return methodNotAllowed(res, ['DELETE'])
}

const handleSessions = async (req, res, segments) => {
    await requireOwner(req, res)
    const [id] = segments

    if (!id) {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        return sendJson(res, 200, await listSessions({ currentHash: currentSessionHash(req) }))
    }

    // POST /sessions/revoke-all — a transition rather than a DELETE on a
    // collection, for the same reason publish/unpublish are POSTs: the server
    // owns what "all" means at the moment of the click.
    if (id === 'revoke-all') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        const body = await readJson(req)
        const ended = await revokeAllSessions({
            userId: body.userId || null,
            // Default: keep this browser signed in. sessions.js argues it; the
            // caller may pass `keepCurrent: false` to include itself, which is
            // what a per-row revoke of your own session does.
            keepHash: body.keepCurrent === false ? null : currentSessionHash(req),
        })
        return sendJson(res, 200, { ended })
    }

    if (req.method === 'DELETE') {
        await revokeSession(id)
        return sendJson(res, 204)
    }

    return methodNotAllowed(res, ['DELETE'])
}

/* --------------------------------------------------------- jazyky webu --- */

/**
 * Seznam jazyků webu. Čtení pro každého přihlášeného, zápis jen pro vlastníka.
 *
 * Autorizace je schválně jeden výraz nad oběma větvemi, ne dvě volání uvnitř
 * nich: takhle nejde přidat metodu, která by kontrolu obešla, a je na jednom
 * řádku vidět, že rozdíl mezi čtením a zápisem je role, nic jiného.
 *
 * Tvar i pravidla drží `../settings.js` (`writeSiteLanguages` -> `validate`) —
 * tedy i to, že výchozí jazyk musí v seznamu být a nesmí být vypnutý. Handler
 * nic z toho neopakuje; druhá kopie pravidla je pravidlo, které se rozejde.
 */
const handleLanguages = async (req, res, segments) => {
    if (segments.length) return methodNotAllowed(res, ['GET', 'PUT'])
    if (req.method !== 'GET' && req.method !== 'PUT') return methodNotAllowed(res, ['GET', 'PUT'])

    const actor = req.method === 'GET' ? await requireUser(req, res) : await requireOwner(req, res)

    if (req.method === 'GET') return sendJson(res, 200, await readSiteLanguages())

    const body = await readJson(req)
    // Vrací se to, co se uložilo, ne to, co přišlo: server tvar normalizuje
    // (ořeže názvy, doplní `enabled`, srovná výchozí jazyk) a obrazovka se má
    // dorovnat na jeho odpověď — stejně jako u widgetu.
    return sendJson(res, 200, await writeSiteLanguages(actor, body))
}

/* -------------------------------------------------------- jazyk Studia --- */
//
// POZOR, plete se to: tohle NENÍ jazyk obsahu. `site.languages` výš říká, v
// kolika jazycích je web; `studio.language` říká, v jakém jazyce mluví admin
// na obsluhu. Web může být trojjazyčný a Studio česky, i naopak. Proto dva
// klíče a dva endpointy, ne jeden se dvěma poli.
//
// Čtení a zápis jsou zatím tady, a ne v `../settings.js`: je to jeden skalár
// s jediným konzumentem — touhle routou. Jakmile ho bude potřebovat i server
// sám (katalog textů v `src/i18n/` u serverových hlášek, e-maily), přestěhuje
// se to vedle `readSiteLanguages`, protože pak už to nebude věc handleru.

const SETTING_TABLE = 'cms_setting'

/** Stabilní klíč, napsaný doslova tady a nikde jinde (I18N.md, oddíl 8). */
export const STUDIO_LANGUAGE_KEY = 'studio.language'

/**
 * Jazyky, které Studio umí. Ne seznam přání — seznam toho, co má katalog
 * `src/i18n/` skutečně přeložené. Přidat sem kód, pro který katalog nemá texty,
 * znamená Studio v polovině anglicky a v polovině česky.
 */
export const STUDIO_LANGUAGES = Object.freeze(['cs', 'en'])

const STUDIO_LANGUAGE_DEFAULT = 'cs'

/** Cokoli -> platný kód. Na cestě z databáze; nesmyslný řádek dá češtinu. */
const coerceStudioLanguage = (value) => {
    const code = String(value?.code ?? value ?? '').trim().toLowerCase()
    return STUDIO_LANGUAGES.includes(code) ? code : STUDIO_LANGUAGE_DEFAULT
}

/**
 * Jazyk Studia. Chybějící řádek ani nepojízdné úložiště není chyba — je to
 * odpověď „česky", stejná pozice jako u `readSiteLanguages`.
 */
export const readStudioLanguage = async () => {
    try {
        const { data, error } = await getAdminClient()
            .from(SETTING_TABLE)
            .select('value')
            .eq('key', STUDIO_LANGUAGE_KEY)
            .maybeSingle()

        if (error) throw new Error(error.message)
        return coerceStudioLanguage(data?.value)
    } catch (failure) {
        console.warn(
            `[cms] ${SETTING_TABLE}/${STUDIO_LANGUAGE_KEY} nelze přečíst, použita výchozí čeština:`,
            failure.message
        )
        return STUDIO_LANGUAGE_DEFAULT
    }
}

/**
 * Zápis. Odmítá to, co by čtení tiše opravilo — kdo pošle `de`, ten se to
 * dozví, místo aby si myslel, že má Studio německy.
 *
 * Select-then-insert-or-update a ne `upsert`, ze stejného důvodu jako
 * `writeSiteLanguages`: souborové úložiště umí jen slovesa, která repozitář
 * opravdu používá.
 */
const writeStudioLanguage = async (actor, code) => {
    const wanted = String(code || '').trim().toLowerCase()
    if (!STUDIO_LANGUAGES.includes(wanted)) {
        throw invalid('Neznámý jazyk Studia', {
            code: `Vyberte jeden z: ${STUDIO_LANGUAGES.join(', ')}`,
        })
    }

    const stamp = {
        value: { code: wanted },
        updated_by: actor?.id ?? null,
        updated_at: new Date().toISOString(),
    }
    const db = getAdminClient()

    const existing = await db.from(SETTING_TABLE).select('key').eq('key', STUDIO_LANGUAGE_KEY).maybeSingle()
    if (existing.error) throw serverError('Uložení jazyka Studia selhalo')

    const { error } = existing.data
        ? await db.from(SETTING_TABLE).update(stamp).eq('key', STUDIO_LANGUAGE_KEY)
        : await db.from(SETTING_TABLE).insert({ key: STUDIO_LANGUAGE_KEY, ...stamp })

    if (error) throw serverError('Uložení jazyka Studia selhalo')

    return wanted
}

/**
 * `available` chodí s odpovědí schválně: obrazovka pak nabízí to, co server
 * opravdu umí, a přidání třetího jazyka Studia je změna na jednom místě.
 */
const handleStudioLanguage = async (req, res, segments) => {
    if (segments.length) return methodNotAllowed(res, ['GET', 'PUT'])
    if (req.method !== 'GET' && req.method !== 'PUT') return methodNotAllowed(res, ['GET', 'PUT'])

    const actor = req.method === 'GET' ? await requireUser(req, res) : await requireOwner(req, res)

    if (req.method === 'GET') {
        return sendJson(res, 200, { code: await readStudioLanguage(), available: [...STUDIO_LANGUAGES] })
    }

    const body = await readJson(req)
    const code = await writeStudioLanguage(actor, body?.code)
    return sendJson(res, 200, { code, available: [...STUDIO_LANGUAGES] })
}

export const handleSettings = async (req, res, segments) => {
    const [section, ...rest] = segments

    if (section === 'keys') return handleKeys(req, res, rest)
    if (section === 'sessions') return handleSessions(req, res, rest)
    if (section === 'languages') return handleLanguages(req, res, rest)
    if (section === 'studio-language') return handleStudioLanguage(req, res, rest)

    if (section === 'status') {
        await requireOwner(req, res)
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        // Booleans and identifiers only. src/cms/server/settings.js holds the
        // rule and the reasoning; nothing here reads process.env itself.
        return sendJson(res, 200, readStatus())
    }

    if (section === 'probe') {
        await requireOwner(req, res)
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        // Only when asked, never on render: the client calls this from a button
        // and the module holds its answer for a minute either way.
        return sendJson(res, 200, await probeAnonAccess({ force: req.query.force === '1' }))
    }

    if (!section) throw invalid('Chybí sekce nastavení')
    throw notFound('Neznámý endpoint nastavení')
}
