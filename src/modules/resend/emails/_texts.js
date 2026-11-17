// Texty e-mailů z formulářů — výchozí znění a popis polí pro Studio
// (obrazovka E-maily). Jedno místo pro šablony (tahle složka), katalog
// (src/lib/mail/catalog.js) i náhled `pnpm run dev:email`.
//
// Zástupný symbol {jméno} doplňuje šablona (`fill` níže) — jméno z formuláře.
//
// Tenhle soubor NESMÍ importovat nic serverového (@/cms/server): čte ho
// i náhledový server React Email, který běží mimo Next.

const customer = (title, subject, { eyebrow, heading, lead, summary, button, buttonHint }) => ({
    title,
    audience: 'customer',
    subject,
    fields: [
        { key: 'eyebrow', label: 'Štítek nad nadpisem', default: eyebrow },
        { key: 'title', label: 'Nadpis', default: heading },
        { key: 'greeting', label: 'Oslovení', default: 'Dobrý den, {jméno},', hint: '{jméno} doplní web; bez jména zůstane jen „Dobrý den,“.' },
        { key: 'lead', label: 'Text', default: lead, lines: true },
        ...(summary ? [{ key: 'summary', label: 'Nadpis shrnutí', default: summary, hint: 'Nad tabulkou s údaji z formuláře.' }] : []),
        { key: 'button', label: 'Tlačítko', default: button, hint: buttonHint },
        {
            key: 'footNote',
            label: 'Drobný text dole',
            default: 'Tenhle e-mail je potvrzení. Pokud jste nám nepsali, dejte nám prosím vědět.',
            lines: true,
        },
    ],
})

const office = (title, subject, { eyebrow, heading, lead, messageTitle, footNote }) => ({
    title,
    audience: 'owner',
    subject,
    fields: [
        { key: 'eyebrow', label: 'Štítek nad nadpisem', default: eyebrow },
        { key: 'title', label: 'Nadpis', default: heading },
        { key: 'lead', label: 'Text', default: lead, lines: true },
        { key: 'messageTitle', label: 'Nadpis nad zprávou', default: messageTitle, hint: 'Jen když zákazník něco napsal.' },
        { key: 'button', label: 'Tlačítko', default: 'Odpovědět', hint: 'Otevře odpověď zákazníkovi.' },
        { key: 'footNote', label: 'Drobný text dole', default: footNote, lines: true },
    ],
})

/** Katalog: klíč = název šablony (soubor v téhle složce). */
export const MAILS = Object.freeze({
    'kontakt-user': customer('Potvrzení zprávy — zákazníkovi', 'Vaši zprávu jsme přijali — Procházka Group', {
        eyebrow: 'Kontaktní formulář',
        heading: 'Vaši zprávu máme',
        lead: 'děkujeme, že jste nám napsali. Zprávu jsme přijali a ozveme se vám do dvou pracovních dnů.',
        summary: 'Co jsme od vás dostali',
        button: 'Prohlédnout recenze',
        buttonHint: 'Vede na stránku Recenze.',
    }),
    'kontakt-admin': office('Nová zpráva z kontaktu — vám', 'Nová kontaktní zpráva — {jméno}', {
        eyebrow: 'Kontaktní formulář',
        heading: 'Nová zpráva z webu',
        lead: 'Přišla zpráva z kontaktního formuláře.',
        messageTitle: 'Zpráva',
        footNote: 'Odesláno automaticky z kontaktního formuláře na webu.',
    }),
    'zajem-user': customer('Potvrzení poptávky — zákazníkovi', 'Vaši poptávku jsme přijali — Procházka Group', {
        eyebrow: 'Poptávka',
        heading: 'Vaši poptávku máme',
        lead: 'děkujeme za váš zájem. Poptávku jsme přijali a ozveme se vám do dvou pracovních dnů.',
        summary: 'Co jsme od vás dostali',
        button: 'Naše nabídka',
        buttonHint: 'Vede na stránku Nabídka.',
    }),
    'zajem-admin': office('Nová poptávka — vám', 'Nový zájem o služby — {jméno}', {
        eyebrow: 'Poptávka',
        heading: 'Nový zájem o služby',
        lead: 'Přišla poptávka z webu.',
        messageTitle: 'Zpráva',
        footNote: 'Odesláno automaticky z webu.',
    }),
    'recenze-user': customer('Poděkování za recenzi — zákazníkovi', 'Děkujeme za vaši recenzi, {jméno}', {
        eyebrow: 'Recenze',
        heading: 'Děkujeme za recenzi',
        lead: 'děkujeme, že jste si našli čas. Recenzi jsme přijali; na webu se objeví, jakmile ji projdeme.',
        button: 'Zobrazit recenze',
        buttonHint: 'Vede na stránku Recenze.',
    }),
    'recenze-admin': office('Nová recenze — vám', 'Nová recenze — {jméno}', {
        eyebrow: 'Recenze',
        heading: 'Nová recenze ke schválení',
        lead: 'Přišla nová recenze. Na webu se objeví, až ji někdo schválí ve Studiu.',
        messageTitle: 'Text recenze',
        footNote: 'Odesláno automaticky z webu.',
    }),
})

/** Výchozí texty šablony, přepsané tím, co přišlo ze Studia. */
export const textsFor = (name, texts) => {
    const mail = MAILS[name]
    if (!mail) throw new Error(`_texts: šablona ${name} nemá texty`)
    const out = { subject: mail.subject }
    for (const field of mail.fields) out[field.key] = field.default
    for (const [key, value] of Object.entries(texts || {})) {
        if (typeof value === 'string' && value.trim() && (key in out)) out[key] = value
    }
    return out
}

/**
 * `{jméno}` → hodnota. Stejné chování jako `fill` z @/cms/server/mails —
 * opsané sem, protože tenhle modul nesmí sahat na server. Prázdná hodnota
 * symbol odstraní i s čárkou/pomlčkou před ním („Dobrý den, {jméno}," →
 * „Dobrý den,"; „Nová recenze — {jméno}" → „Nová recenze").
 */
export const fill = (template, vars = {}) =>
    String(template || '')
        .replace(/(\s*[,—–-]?\s*)\{([^{}]+)\}/g, (match, lead, name) => {
            const key = String(name).trim()
            if (!(key in vars)) return match
            const value = String(vars[key] ?? '').trim()
            return value ? `${lead}${value}` : ''
        })
        .replace(/[ \t]{2,}/g, ' ')
        .trim()

/** Víceřádkové pole na odstavce (Enter ve Studiu = nový odstavec). */
export const paragraphs = (text) =>
    String(text || '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
