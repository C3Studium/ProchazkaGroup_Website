// Kam chodí zprávy z formulářů — jako nastavení, které ve skutečnosti leží
// v dokumentu.
//
// Web to zapíná v konfiguraci: `mail: { recipient: { type, field } }`
// (site/define.js) — třeba e-mail v kartě asistentky, kterou web zároveň
// ukazuje v kontaktním panelu a ze které jeho formuláře berou příjemce. Tady
// nevzniká žádná druhá kopie: Nastavení → E-maily čte a zapisuje přesně to
// pole. Upravit ho v dokumentu, nebo tady, je totéž. Aby ho člen nepřepsal,
// dá web tomu poli `editRoles: ['admin', 'owner']`.
//
// Zápis jde přes datový port Studia s přihlášeným uživatelem, ne přímo do
// tabulky. Port kontroluje `editRoles` pole (člen adresu nezmění, ať přijde
// odkudkoli), zapisuje revizi a publikuje stejně jako tlačítko ve Studiu.
//
// SERVER ONLY.

import site from '../site/config.js'
import { createSupabaseDataPort } from './adapter.js'
import { invalid } from './errors.js'
import { findType } from './validation.js'

const EMAIL = /^[^\s@<>",]+@[^\s@<>",]+\.[^\s@<>",]+$/

/** `{ type, field }` z konfigurace webu, nebo null, když to web nespravuje ve Studiu. */
export const recipientSource = () => site?.mailRecipient || null

/**
 * Dokument, ve kterém adresa leží: první publikovaný podle `order`, tedy
 * tentýž, který čte web. Bez publikovaného ten první vůbec.
 */
const findDocument = async (port, type) => {
    const sort = { field: 'data.order', direction: 'asc' }
    const published = await port.list({ type, sort, perPage: 1, filters: { status: 'published' } })
    if (published.rows?.[0]) return published.rows[0]
    const any = await port.list({ type, sort, perPage: 1 })
    return any.rows?.[0] || null
}

/**
 * @returns {Promise<null | { address, documentId, documentTitle, typeTitle, field, pending }>}
 *   null = web adresu ve Studiu nespravuje.
 *   `pending` = v kartě je neuložený koncept s jinou adresou, než jakou čte web.
 */
export const readMailRecipient = async (user) => {
    const source = recipientSource()
    if (!source) return null

    const port = createSupabaseDataPort({ user })
    const doc = await findDocument(port, source.type)
    const live = doc?.status === 'published' ? String(doc.data?.[source.field] || '').trim() : ''
    const draft = doc?.draft ? String(doc.draft?.[source.field] || '').trim() : null

    return {
        address: live,
        pending: draft !== null && draft !== live ? draft : null,
        documentId: doc?.id || null,
        documentTitle: doc ? String(doc.data?.name || doc.data?.title || doc.draft?.name || doc.draft?.title || '').trim() : '',
        field: source.field,
        type: source.type,
        // Jména pro obrazovku, ze schématu — Nastavení nemá vědět, že u tohohle
        // webu jde o „Asistentku" a pole „E-mail".
        typeTitle: findType(source.type)?.title || source.type,
        fieldTitle: findType(source.type)?.fields?.find((f) => f.name === source.field)?.title || source.field,
    }
}

/**
 * Uloží adresu do dokumentu a publikuje ji.
 *
 * Publikuje se jen tehdy, když karta neměla rozpracovaný koncept: tlačítko
 * Uložit v Nastavení nesmí omylem zveřejnit cizí nedokončenou úpravu (třeba
 * novou fotku). V tom případě adresa zůstane v konceptu a obrazovka řekne, že
 * platí až po publikaci karty.
 */
export const writeMailRecipient = async (user, patch) => {
    const source = recipientSource()
    if (!source) throw invalid('Tento web adresu pro formuláře ve Studiu nespravuje')

    const address = String(patch?.address || '').trim()
    if (!EMAIL.test(address)) {
        throw invalid('Adresa pro zprávy z formulářů není platný e-mail', [
            { path: 'recipient', message: 'Zadejte e-mail, např. info@vasedomena.cz' },
        ])
    }

    const port = createSupabaseDataPort({ user })
    const doc = await findDocument(port, source.type)
    if (!doc) throw invalid('Karta, ve které adresa leží, zatím neexistuje. Založte ji ve Studiu.')

    const hadDraft = Boolean(doc.draft)
    await port.patchField({ id: doc.id, field: source.field, value: address })
    if (!hadDraft) await port.publish({ id: doc.id })

    return { ...(await readMailRecipient(user)), published: !hadDraft }
}
