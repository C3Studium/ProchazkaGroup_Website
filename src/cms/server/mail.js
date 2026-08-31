/**
 * Odchozí pošta CMS. SERVER ONLY.
 *
 * ---------------------------------------------------------------------------
 * Jeden odesílatel, ne druhý
 *
 * Projekt už jednoho má: Resend, `RESEND_API_KEY` a `RESEND_FROM_EMAIL`, kterým
 * odchází deset formulářových e-mailů webu. Tenhle modul se na něj napojuje a
 * nezakládá druhou cestu — dvě odesílací nastavení znamenají dvě domény
 * k ověření, dva klíče k rotaci a jednu, na kterou se zapomene.
 *
 * ---------------------------------------------------------------------------
 * Bez odesílatele se nic neposílá a nic se nerozbije
 *
 * `hasSender()` je celá podmínka. Web, který odesílatele nemá — a to je každý
 * nový projekt do chvíle, než mu ho někdo nastaví — zakládá uživatele dál,
 * jen bez pozvánky. Odesílání je doplněk k založení účtu, ne jeho součást:
 * účet už existuje a heslo už bylo vygenerováno, takže selhání pošty nesmí
 * ani vrátit chybu, ani vzít zpět něco, co se povedlo.
 */
import { assertServer, bootstrapAdmin, siteUrl } from './env.js'
import { getAdminClient } from './supabaseAdmin.js'

const optional = (name) => String(process.env[name] || '').trim()

/** Je nastavený odesílatel? Bez něj se nic neposílá. */
export const hasSender = () => Boolean(optional('RESEND_API_KEY') && senderAddress())

/**
 * Adresa, ze které se odesílá.
 *
 * `RESEND_FROM_EMAIL` je totéž, co používají formuláře webu (viz
 * src/pages/api/resend.js). Vlastní proměnná pro CMS by byla druhá adresa
 * k ověření u poskytovatele kvůli jednomu e-mailu za měsíc.
 */
export const senderAddress = () => optional('RESEND_FROM_EMAIL')

/** Kam vede Studio. Odvozeno z adresy webu, ne psáno zvlášť. */
export const studioUrl = () => `${siteUrl().replace(/\/+$/, '')}/studio`

/**
 * Pošli pozvánku do Studia.
 *
 * Nikdy nevyhodí výjimku. Volající je handler zakládání uživatele, kde už je
 * účet vytvořený — a odpovědět chybou na akci, která se povedla, je horší než
 * neodeslaný e-mail. Výsledek se vrací, aby ho rozhraní mohlo říct nahlas:
 * správce musí vědět, jestli má heslo předat sám.
 *
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export const sendInvite = async ({ to, name, role, invitedBy }) => {
    assertServer('sendInvite')

    if (!hasSender()) return { sent: false, reason: 'no-sender' }
    if (!to) return { sent: false, reason: 'no-address' }

    try {
        const [{ Resend }, { render }, template] = await Promise.all([
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'resend'),
            import('@react-email/render'),
            import('@/modules/resend/emails/cms-pozvanka.jsx'),
        ])

        const Component = template.default
        const html = await render(
            Component({ name, email: to, role, invitedBy, studioUrl: studioUrl() }),
        )

        const resend = new Resend(optional('RESEND_API_KEY'))
        const { error } = await resend.emails.send({
            from: senderAddress(),
            to,
            subject: template.subject,
            html,
        })

        if (error) throw new Error(error.message || String(error))
        return { sent: true }
    } catch (error) {
        const message = String(error?.message || error)
        console.warn(`[cms] pozvánka pro ${to} se neodeslala — ${message}`)
        return { sent: false, reason: message }
    }
}

/**
 * Komu chodí hlášení o provozu — správcům a majiteli, ne členům.
 *
 * Členové obsah upravují a publikují dnes a denně; e-mail o vlastní práci je
 * šum, který se po týdnu přestane číst — a s ním i ten, který si přečíst bylo
 * potřeba. Adresa z CMS_ADMIN_EMAIL je v seznamu vždycky, i kdyby řádek
 * v tabulce chyběl: správce je určený prostředím, ne sloupcem (server/auth.js).
 */
export const staffRecipients = async (exclude = '') => {
    assertServer('staffRecipients')

    const skip = String(exclude || '').trim().toLowerCase()
    const wanted = new Set()

    const admin = bootstrapAdmin()
    if (admin?.email) wanted.add(admin.email)

    try {
        const { data, error } = await getAdminClient()
            .from('cms_user')
            .select('email, role, disabled_at')
            .in('role', ['admin', 'owner'])
            .is('disabled_at', null)
        if (error) throw error
        for (const row of data || []) if (row.email) wanted.add(String(row.email).toLowerCase())
    } catch (error) {
        // Seznam se nenačetl — pošle se aspoň správci z prostředí. Hlášení
        // s jedním příjemcem je lepší než žádné.
        console.warn(`[cms] seznam příjemců se nenačetl — ${String(error?.message || error)}`)
    }

    // Kdo změnu udělal, o ní ví. Zpráva sama sobě je první e-mail, který si
    // člověk odfiltruje, a filtr pak spolkne i ty od ostatních.
    if (skip) wanted.delete(skip)

    return [...wanted]
}

/**
 * Hlášení o publikované změně.
 *
 * Nikdy nevyhodí výjimku a nikdy nezdrží odpověď o víc než odeslání: publikace
 * už proběhla a je vidět na webu, takže selhání pošty nesmí vypadat jako
 * selhání publikace.
 *
 * @returns {Promise<{sent: number, reason?: string}>}
 */
export const sendUpdateNotice = async ({ what, typeTitle, who, actorEmail, pages }) => {
    assertServer('sendUpdateNotice')

    if (!hasSender()) return { sent: 0, reason: 'no-sender' }

    try {
        const to = await staffRecipients(actorEmail)
        if (!to.length) return { sent: 0, reason: 'no-recipients' }

        const [{ Resend }, { render }, template] = await Promise.all([
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'resend'),
            import('@react-email/render'),
            import('@/modules/resend/emails/cms-aktualizace.jsx'),
        ])

        const when = new Date().toLocaleString('cs-CZ', { dateStyle: 'long', timeStyle: 'short' })
        const html = await render(
            template.default({ what, typeTitle, who, when, pages, siteUrl: siteUrl() }),
        )

        const resend = new Resend(optional('RESEND_API_KEY'))
        const { error } = await resend.emails.send({
            from: senderAddress(),
            to,
            subject: template.subject({ what }),
            html,
        })
        if (error) throw new Error(error.message || String(error))

        return { sent: to.length }
    } catch (error) {
        const message = String(error?.message || error)
        console.warn(`[cms] hlášení o změně se neodeslalo — ${message}`)
        return { sent: 0, reason: message }
    }
}
