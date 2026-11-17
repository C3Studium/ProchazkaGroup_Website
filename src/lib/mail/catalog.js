// Katalog e-mailů webu pro Studio (obrazovka E-maily). SERVER ONLY.
//
// Deklaruje šest e-mailů z formulářů (kontakt, poptávka, recenze — vždy
// zákazníkovi a kanceláři) s poli, která jde přepsat. Výchozí znění je
// v src/modules/resend/emails/_texts.js (sdílí ho šablona i náhled). Náhled
// pro Studio vykreslí šablonu se vzorovými daty (PreviewProps) a s texty
// z formuláře. Odesílání (pages/api/forms.js) si bere přepisy přes
// `mailTexts(mails, název šablony)`.
//
// API routa ho předává: pages/api/cms/[...route].js → { mails }.

import { render } from '@react-email/render'
import { defineMails } from '@/cms/server/mails.js'
import { MAILS } from '@/modules/resend/emails/_texts.js'
import * as kontaktAdmin from '@/modules/resend/emails/kontakt-admin.jsx'
import * as kontaktUser from '@/modules/resend/emails/kontakt-user.jsx'
import * as recenzeAdmin from '@/modules/resend/emails/recenze-admin.jsx'
import * as recenzeUser from '@/modules/resend/emails/recenze-user.jsx'
import * as zajemAdmin from '@/modules/resend/emails/zajem-admin.jsx'
import * as zajemUser from '@/modules/resend/emails/zajem-user.jsx'

/** Šablony podle názvu — stejný seznam jako v pages/api/forms.js. */
export const TEMPLATES = Object.freeze({
    'kontakt-user': kontaktUser,
    'kontakt-admin': kontaktAdmin,
    'zajem-user': zajemUser,
    'zajem-admin': zajemAdmin,
    'recenze-user': recenzeUser,
    'recenze-admin': recenzeAdmin,
})

// Pořadí v seznamu: nejdřív co chodí zákazníkům, pak kanceláři.
const ORDER = ['kontakt-user', 'zajem-user', 'recenze-user', 'kontakt-admin', 'zajem-admin', 'recenze-admin']

export const mails = defineMails(
    ORDER.map((name) => {
        const copy = MAILS[name]
        const template = TEMPLATES[name]
        return {
            key: name,
            title: copy.title,
            audience: copy.audience,
            subject: copy.subject,
            fields: copy.fields,
            note: 'Jméno, e-mail, telefon, poradce a zprávu doplní web z formuláře.',
            preview: (texts) => render(template.default({ ...template.default.PreviewProps, texts })),
        }
    }),
)
