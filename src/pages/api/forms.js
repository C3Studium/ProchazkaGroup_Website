// /api/forms — jediná cesta, kterou z webu odchází e-mail z formuláře.
//
//   POST /api/forms   { form: "kontakt" | "zajem" | "recenze", data: {...} }
//
// ---------------------------------------------------------------------------
// Co tady NENÍ a nikdy být nesmí
// ---------------------------------------------------------------------------
//
// Adresa příjemce v těle požadavku. Předchozí trasa ji brala (`const { to } =
// req.body`, /api/resend) a byla to otevřená relay — kdokoli mohl odeslat
// e-mail z ověřené domény komukoli. Kam co jde, ví @/lib/mail/forms a nic
// jiného; klient pošle název formuláře a vyplněná data.
//
// ---------------------------------------------------------------------------
// Limit je součástí funkce, ne pojistka navíc
// ---------------------------------------------------------------------------
//
// Formulář bez limitu je tlačítko, kterým se dá cizí schránka zahltit — a tady
// o to víc, že každé odeslání je požadavek na Resend, který se počítá a platí.
// Pět odeslání za hodinu z jedné adresy je víc, než potřebuje kdokoli, kdo píše
// doopravdy. Používá se tentýž limiter jako u recenzí a reakcí
// (@/cms/server/rateLimit), aby na to byl v projektu jeden mechanismus.

import { clientKey, consume } from '@/cms/server/rateLimit.js'
import { adminRecipients, canSend, prepare, senderAddress } from '@/lib/mail/forms.js'

// Šablony se importují staticky a všechny: `import()` s proměnnou v cestě
// webpack nedokáže rozbalit a trasa by za běhu hlásila nenalezený modul.
// Deset souborů v serverovém balíku nic nestojí — do prohlížeče nejde ani jeden.
import * as kontaktAdmin from '@/modules/resend/emails/kontakt-admin.jsx'
import * as kontaktUser from '@/modules/resend/emails/kontakt-user.jsx'
import * as recenzeAdmin from '@/modules/resend/emails/recenze-admin.jsx'
import * as recenzeUser from '@/modules/resend/emails/recenze-user.jsx'
import * as zajemAdmin from '@/modules/resend/emails/zajem-admin.jsx'
import * as zajemUser from '@/modules/resend/emails/zajem-user.jsx'

const TEMPLATES = {
    'kontakt-admin': kontaktAdmin,
    'kontakt-user': kontaktUser,
    'zajem-admin': zajemAdmin,
    'zajem-user': zajemUser,
    'recenze-admin': recenzeAdmin,
    'recenze-user': recenzeUser,
}

/**
 * Kolik odeslání za hodinu z jedné adresy.
 *
 * Pět je víc, než potřebuje kdokoli, kdo píše doopravdy. `CONTACT_FORM_LIMIT`
 * je tam kvůli testování: proklikat si čtyři formuláře znamená osm e-mailů
 * a limit by to zarazil v polovině. Na produkci se nenastavuje.
 */
const LIMIT = {
    limit: Number(process.env.CONTACT_FORM_LIMIT) > 0 ? Number(process.env.CONTACT_FORM_LIMIT) : 5,
    windowMs: 60 * 60 * 1000,
}

/**
 * Jedna zpráva.
 *
 * Renderuje se na HTML, ne `react:`. Resend umí obojí, ale `render()` je
 * explicitní krok, který selže tady a dá se zalogovat — a hlavně je to tatáž
 * cesta, kterou už jede pozvánka do Studia (@/cms/server/mail), takže se
 * šablony chovají v obou případech stejně.
 */
const send = async ({ resend, render, name, to, data }) => {
    const template = TEMPLATES[name]
    if (!template) throw new Error(`neznámá šablona ${name}`)

    const Component = template.default
    const html = await render(Component(data))

    const { error } = await resend.emails.send({
        from: senderAddress(),
        to,
        subject: template.subject(data),
        html,
    })

    if (error) throw new Error(error.message || String(error))
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { form, data = {} } = req.body || {}

    const plan = prepare(form, data)
    if (!plan.ok) {
        // Odesílateli se neřekne, co přesně chybělo na serveru: rozdíl mezi
        // „neznámý formulář" a „chybí jméno" je informace o systému. Validaci
        // po polích dělá formulář sám, dřív než se sem pošle.
        console.warn(`[forms] odmítnuto — ${plan.reason}`)
        return res.status(400).json({ error: 'Zprávu se nepodařilo odeslat.' })
    }

    // Příjemce se zjišťuje tady, protože to je dotaz do databáze — e-mail
    // asistentky ze Studia. Pořadí zdrojů a proč je v @/lib/mail/forms.
    const to = await adminRecipients()

    if (!canSend() || !to.length) {
        // Chybí klíč, odesílatel nebo schránka. Není to chyba odesílatele
        // a nemá se mu tvrdit, že se zpráva odeslala.
        console.error(
            '[forms] odesílání není nastavené — klíč/odesílatel: ' + canSend() + ', příjemců: ' + to.length +
            ' (RESEND_API_KEY, RESEND_FROM_EMAIL, a buď CONTACT_FORM_TO, nebo e-mail asistentky ve Studiu)',
        )
        return res.status(503).json({ error: 'Odesílání e-mailů není na tomto webu nastavené.' })
    }

    // `consume` vrací { allowed, remaining, retryAfter }, ne boolean — objekt je
    // vždycky truthy, takže `if (!consume(...))` by limit nikdy nezastavil.
    const gate = consume(clientKey(req), LIMIT)
    if (!gate.allowed) {
        res.setHeader('Retry-After', String(gate.retryAfter))
        return res.status(429).json({ error: 'Příliš mnoho odeslání. Zkuste to prosím za chvíli.' })
    }

    const { definition, data: body, confirmTo } = plan

    try {
        const [{ Resend }, { render }] = await Promise.all([
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'resend'),
            import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@react-email/render'),
        ])
        const resend = new Resend(process.env.RESEND_API_KEY)

        // Zpráva do firmy. Na té záleží — když neprojde, odesílatel se to musí
        // dozvědět, protože jeho zpráva se nikam nedostala.
        await send({ resend, render, name: definition.admin, to, data: body })

        // Potvrzení odesílateli. Doplněk: když neprojde, zpráva do firmy už
        // leží ve schránce a odpovědět chybou by bylo tvrzení, že se nic
        // nestalo. Loguje se, ať to není tiché.
        if (confirmTo && definition.user) {
            try {
                await send({ resend, render, name: definition.user, to: confirmTo, data: body })
            } catch (error) {
                console.warn(`[forms] potvrzení pro ${confirmTo} se neodeslalo — ${error.message}`)
            }
        }

        return res.status(200).json({ ok: true })
    } catch (error) {
        console.error(`[forms] ${form} se neodeslal — ${error?.message || error}`)
        return res.status(502).json({ error: 'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu.' })
    }
}
