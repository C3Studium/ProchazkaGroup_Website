// Které formuláře web má, co posílají a komu — SERVER ONLY.
//
// ---------------------------------------------------------------------------
// PŘÍJEMCE URČUJE SERVER. NIKDY KLIENT.
// ---------------------------------------------------------------------------
//
// Tohle je celý důvod, proč tenhle soubor existuje.
//
// Předchozí podoba brala adresu z těla požadavku — `const { template, to } =
// req.body` v /api/resend. Bez session, bez limitu, bez seznamu povolených
// adres. Kdokoli na světě mohl POSTnout požadavek a odeslat e-mail
// z prochazkagroup.cz komukoli, s textem, který si zvolil. To není chybějící
// kontrola, to je otevřená relay: spam odeslaný z ověřené domény, který
// zákazník nepošle, ale dostane za něj doménu na blacklist.
//
// Klient tedy posílá JEN název formuláře a vyplněná data. Kam to půjde, ví
// výhradně tento modul.
//
// ---------------------------------------------------------------------------
// Dva e-maily na jedno odeslání
// ---------------------------------------------------------------------------
//
// `admin` jde do firmy, `user` je potvrzení odesílateli. Druhý se posílá na
// adresu, kterou člověk vyplnil ve formuláři, a jen na ni — proto je
// `userField` součástí definice a ne domněnka: recenzní formulář jmenuje pole
// jinak než kontaktní.
//
// Potvrzení je volitelné. Když se neodešle, formulář se tím nekazí — zpráva do
// firmy je ta, na které záleží, a odpověď „neodesláno" u akce, která se
// povedla, je horší než chybějící potvrzovací e-mail.

const optional = (name) => String(process.env[name] || '').trim()

/** Seznam adres z proměnné prostředí. Smí jich být víc, oddělené čárkou. */
const listFrom = (name) =>
    optional(name)
        .split(',')
        .map((address) => address.trim())
        .filter(Boolean)

/**
 * Kam chodí zprávy z formulářů. Tři zdroje, v tomhle pořadí.
 *
 *   1. e-mail ASISTENTKY ze Studia      — normální odpověď
 *   2. `CONTACT_FORM_TO`                — záloha, když ho ve Studiu nevyplnili
 *   3. `CMS_ADMIN_EMAIL`                — poslední instance, správce Studia
 *
 * ---------------------------------------------------------------------------
 * Proč asistentka, a ne nový objekt v CMS
 * ---------------------------------------------------------------------------
 *
 * Protože ta osoba v CMS už je, už má pole `email`, a je to přesně ten člověk,
 * kterému ty zprávy chodí. Nový objekt „schránka pro formuláře" by byl druhé
 * místo, které říká totéž — a dvě místa se dřív nebo později rozejdou: někdo
 * změní asistentku ve Studiu, formuláře budou dál chodit na starou adresu
 * a nikdo si toho nevšimne, protože obě nastavení vypadají správně.
 *
 * Mění se to tedy ve Studiu, v kartě asistentky, bez zásahu do kódu — a tohle
 * pořadí je právě to, co tu větu dělá pravdivou: kdyby prostředí vyhrávalo,
 * editor by si ve Studiu změnil adresu a nic by se nestalo.
 *
 * ---------------------------------------------------------------------------
 * Co z toho plyne pro testování
 * ---------------------------------------------------------------------------
 *
 * `CONTACT_FORM_TO` NENÍ vypínač, kterým se pošta přesměruje. Platí teprve ve
 * chvíli, kdy asistentka ve Studiu e-mail nemá. Kdo chce zprávy dočasně jinam,
 * má dvě možnosti, a obě jsou poctivější než proměnná, která tiše přebíjí
 * obsah:
 *
 *   - vyprázdnit pole e-mail v kartě asistentky (pak platí `CONTACT_FORM_TO`),
 *   - nebo tam na tu dobu napsat tu druhou adresu přímo.
 *
 * ---------------------------------------------------------------------------
 *
 * Žádná adresa tu NENÍ napsaná natvrdo — ani asistentčina. Kdyby byla, byla by
 * to čtvrtá pravda o jedné věci.
 *
 * Nikdy nevyhodí výjimku: nedostupné CMS nemá znamenat neodeslaný formulář,
 * takže se spadne na prostředí a jde se dál. Tohle je ten případ, kdy záloha
 * v prostředí opravdu zachraňuje — ne „chtěl jsem to přesměrovat", ale
 * „databáze neodpověděla".
 *
 * @returns {Promise<string[]>}
 */
export const adminRecipients = async () => {
    try {
        // Importuje se až tady, ne na vrchu souboru: tenhle modul čte i
        // validace formuláře, a ta nemá mít důvod sahat na databázi.
        const { getAssistant } = await import('@/lib/site/people.js')
        const assistant = await getAssistant()
        const email = String(assistant?.email || '').trim()
        if (email) return [email]
    } catch (error) {
        console.warn(`[forms] e-mail asistentky nelze přečíst — ${error?.message || error}`)
    }

    const backup = listFrom('CONTACT_FORM_TO')
    if (backup.length) return backup

    return listFrom('CMS_ADMIN_EMAIL')
}

/** Adresa, ze které se odesílá. Stejné dvě proměnné jako @/cms/server/mail. */
export const senderAddress = () => optional('CMS_MAIL_FROM') || optional('RESEND_FROM_EMAIL')

/**
 * Je nastavený odesílatel? Příjemce se kontroluje zvlášť, až když je zjištěný —
 * je to dotaz do databáze a tenhle předpoklad musí jít ověřit bez něj.
 */
export const canSend = () => Boolean(optional('RESEND_API_KEY') && senderAddress())

// Volný schválně. Striktnější vzor odmítá adresy, které jsou úplně v pořádku,
// a jediné, co adresu opravdu ověří, je odeslání na ni. Stejný vzor jako
// v ChooseAdvisor, aby formulář a server neříkaly dvě různé věci.
const LOOKS_LIKE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Nejdelší hodnota, která se přijme. Delší je plnění schránky, ne zpráva. */
const LIMITS = { short: 200, message: 5000 }

/**
 * Předvolba a číslo jako jedno telefonní číslo.
 *
 * Tohle je `fullPhoneNumber` z @/cms/dialPrefixes, ale přepsané tady, a ne
 * importované: ten modul je `"use client"` s React hooky a tenhle běží na
 * serveru. Jsou to tři řádky a import kvůli nim by zatáhl React do API trasy.
 *
 * Mezera mezi nimi, ne nic: takhle se telefonní číslo píše.
 */
const joinPhone = (dial, phone) => {
    const number = String(phone ?? '').trim()
    if (!number) return ''
    const prefix = String(dial ?? '').trim()
    if (!prefix || number.startsWith('+')) return number
    return `${prefix} ${number}`
}

/** Je ta předvolba vůbec předvolba? Nedůvěřuje se jí: skládá se do `tel:`. */
const safeDial = (dial) => (/^\+[0-9]{1,4}$/.test(String(dial || '').trim()) ? String(dial).trim() : '')

const text = (value, limit = LIMITS.short) => String(value ?? '').trim().slice(0, limit)

/**
 * Definice jednoho formuláře.
 *
 * `clean` je ta podstatná část: z toho, co přišlo po drátě, vybere pole, která
 * šablona zná, a nic jiného nepropustí. Šablony se renderují do HTML, takže
 * neočekávaný klíč v datech je neočekávaný obsah v e-mailu.
 *
 * Názvy polí jsou `snake_case` tam, kde je tak mají šablony
 * (`phone_number`, `consultant_name`) — ty soubory jsou napsané a měnit je
 * kvůli estetice by znamenalo měnit deset šablon místo jednoho mapování.
 */
export const FORMS = Object.freeze({
    // Kontaktní arch, který otevírá lišta, a formulář pod přepínačem v QnA
    // sekci. Dva formuláře, jedna šablona: obojí je „někdo nám píše".
    kontakt: Object.freeze({
        admin: 'kontakt-admin',
        user: 'kontakt-user',
        userField: 'email',
        required: ['name', 'email'],
        clean: (body) => ({
            name: text(body.name),
            email: text(body.email),
            phone_number: joinPhone(safeDial(body.dial), body.phone),
            consultant_name: text(body.consultant),
            message: withCallWindow(text(body.message, LIMITS.message), body),
        }),
    }),

    // Poradenský formulář na úvodní stránce: žádost o zavolání, u konkrétního
    // poradce. Vlastní šablona, protože to není obecný dotaz — na druhé straně
    // má někdo zavolat, a jméno poradce je ta nejdůležitější řádka.
    zajem: Object.freeze({
        admin: 'zajem-admin',
        user: 'zajem-user',
        userField: 'email',
        required: ['name', 'email'],
        clean: (body) => ({
            name: text(body.name),
            email: text(body.email),
            phone_number: joinPhone(safeDial(body.dial), body.phone),
            consultant_name: text(body.consultant),
            message: withCallWindow(text(body.message, LIMITS.message), body),
            inquiryDate: new Date().toISOString(),
        }),
    }),

    // Recenze. Uložení dělá /api/cms/reviews, tudy jde jen oznámení — viz
    // komentář v AddReview. Proto se tu nic nevaliduje nad rámec e-mailu:
    // obsah už prošel schématem recenze na druhé straně.
    recenze: Object.freeze({
        admin: 'recenze-admin',
        user: 'recenze-user',
        userField: 'email',
        required: ['customerName'],
        clean: (body) => ({
            customerName: text(body.customerName),
            email: text(body.email),
            consultantName: text(body.consultantName),
            hashtag: text(body.hashtag),
            message: text(body.message, LIMITS.message),
            created_at: new Date().toISOString(),
        }),
    }),
})

/**
 * Preferovaný čas hovoru na konec zprávy.
 *
 * Do zprávy, a ne jako vlastní pole: šablony berou pojmenované propy
 * (`name`, `email`, `message`, `phone_number`, `consultant_name`) a klíč, který
 * nečekají, React zahodí. Dvě políčka, která člověk vyplnil, by tedy ve
 * e-mailu nebyla vůbec — což je horší než řádka na konci textu.
 *
 * Kdyby to časem mělo mít v e-mailu vlastní řádek, patří to do šablon
 * `kontakt-admin.jsx` a `zajem-admin.jsx` jako nový prop; do té doby je tohle
 * ta poctivá verze.
 */
const withCallWindow = (message, body) => {
    const from = text(body.timeFrom, 32)
    const to = text(body.timeTo, 32)
    if (!from && !to) return message

    const when = from && to ? `${from}–${to}` : from || to
    const line = `Preferovaný čas hovoru: ${when}`
    return message ? `${message}\n\n${line}` : line
}

/**
 * Co se smí odeslat, nebo proč ne.
 *
 * Vrací `{ ok: false, reason }` místo výjimky, aby trasa mohla rozhodnout, co
 * z toho se dozví klient. Odesílateli se nikdy neřekne víc než „nepovedlo se":
 * rozdíl mezi „neznámý formulář" a „chybí pole" je informace o serveru.
 */
export const prepare = (form, body = {}) => {
    const definition = FORMS[form]
    if (!definition) return { ok: false, reason: `unknown-form:${form}` }

    const data = definition.clean(body)

    const missing = definition.required.filter((field) => !data[field])
    if (missing.length) return { ok: false, reason: `missing:${missing.join(',')}` }

    const reply = data[definition.userField]
    // Potvrzení jen na adresu, která jako adresa vypadá. Neplatná není důvod
    // zprávu do firmy zahodit — jen se na ni nic nepošle.
    const confirmTo = reply && LOOKS_LIKE_EMAIL.test(reply) ? reply : null

    return { ok: true, definition, data, confirmTo }
}
