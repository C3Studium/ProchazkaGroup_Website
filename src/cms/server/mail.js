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
import site from '../site/config.js'
import { getAdminClient } from './supabaseAdmin.js'

const optional = (name) => String(process.env[name] || '').trim()

/** Je nastavený odesílatel? Bez něj se nic neposílá. */
/**
 * Umí tenhle projekt poslat e-mail?
 *
 * `site.mail === false` znamená, že poštu obsluhuje něco jiného — u e-shopu
 * Medusa, která posílá potvrzení objednávek i rezervace. Bez téhle podmínky
 * by CMS se stejnými klíči v prostředí posílalo pozvánky souběžně s ním,
 * z téže domény, a klíče v prostředí tam jsou právě proto, že je používá ten
 * druhý systém.
 *
 * Volba, ne přepínač instalátoru: `--mail=no` se dal zvolit jednou a pak už
 * nešel vzít zpátky jinak než mazáním proměnných.
 */
export const hasSender = () =>
    site?.mail !== false && Boolean(optional('RESEND_API_KEY') && senderAddress())

/**
 * Adresa, ze které se odesílá.
 *
 * Dvě proměnné, jedna odpověď. `CMS_MAIL_FROM` je to, co do .env.local zapisuje
 * instalátor (install/choices.mjs) — a do této opravy ji NIC nečetlo, takže
 * čerstvě nainstalovaný web s vyplněnou poštou stejně nic neposlal.
 * `RESEND_FROM_EMAIL` zůstává pro weby, které sdílejí odesílatele s vlastními
 * formuláři (viz src/pages/api/resend.js) a proměnnou už mají.
 */
export const senderAddress = () => optional('CMS_MAIL_FROM') || optional('RESEND_FROM_EMAIL')

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
export const sendInvite = async ({ to, name, role, invitedBy, password }) => {
    assertServer('sendInvite')

    if (!hasSender()) return { sent: false, reason: 'no-sender' }
    if (!to) return { sent: false, reason: 'no-address' }

    try {
        const [{ Resend }, { render }, template] = await Promise.all([
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'resend'),
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@react-email/render'),
            import('@/modules/resend/emails/cms-pozvanka.jsx'),
        ])

        const Component = template.default
        // Heslo jde šablonou dál a nikam jinam: neloguje se, neukládá se, žije
        // v tomto volání a v odeslaném e-mailu. Rozhodnutí je majitelovo — viz
        // AUTH.md, „Pozvánka do Studia".
        const html = await render(
            Component({ name, email: to, role, invitedBy, password, studioUrl: studioUrl() }),
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
 * Pravidelný přehled — šablona cms-statistiky.jsx konečně dostává spouštěč
 * (server/heartbeat.js). Stejná smlouva jako ostatní odchozí pošta: nikdy
 * nevyhodí výjimku, bez odesílatele se nic neposílá a výsledek se vrací,
 * aby volající (a jeho log) věděl, jak to dopadlo.
 *
 * Čísla jsou volitelná po jednom — co je null, šablona vynechá.
 *
 * @returns {Promise<{sent: number, reason?: string}>}
 */
export const sendDigest = async ({ period, published, reviewsNew, reviewsPending, mediaAdded }) => {
    assertServer('sendDigest')

    if (!hasSender()) return { sent: 0, reason: 'no-sender' }

    try {
        const to = await staffRecipients()
        if (!to.length) return { sent: 0, reason: 'no-recipients' }

        const [{ Resend }, { render }, template] = await Promise.all([
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'resend'),
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@react-email/render'),
            import('@/modules/resend/emails/cms-statistiky.jsx'),
        ])

        const html = await render(
            template.default({ period, published, reviewsNew, reviewsPending, mediaAdded, siteUrl: siteUrl() }),
        )

        const resend = new Resend(optional('RESEND_API_KEY'))
        const { error } = await resend.emails.send({
            from: senderAddress(),
            to,
            subject: template.subject({ period }),
            html,
        })
        if (error) throw new Error(error.message || String(error))

        return { sent: to.length }
    } catch (error) {
        const message = String(error?.message || error)
        console.warn(`[cms] přehled se neodeslal — ${message}`)
        return { sent: 0, reason: message }
    }
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
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@react-email/render'),
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
