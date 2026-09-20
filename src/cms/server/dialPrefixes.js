// Telefonní předvolby, které nabízí každé pole s telefonem — SERVER ONLY.
//
// Jeden řádek v cms_setting (migrations/0006), držící seznam zemí, ze kterých
// si návštěvník vybírá před číslem. Vlastník ho upravuje v /studio/settings.
//
// ---------------------------------------------------------------------------
// Proč je to nastavení nástroje, a ne typ dokumentu
// ---------------------------------------------------------------------------
//
// Obojí bylo napsané a to druhé zahozené, takže tohle není domněnka.
//
// Jako typ dokumentu to fungovalo a mělo tři vady. Seznam stál v postranním
// menu vedle Poradců a Recenzí — tedy vedle věcí, které editor mění týdně,
// ačkoli na předvolby sáhne jednou za rok. Každá další instalace knihovny si
// ten typ musela napsat znovu, včetně fixtur a čtenáře. A hlavně: „+420 je
// Česko" není obsah. Je to číselník, platí stejně na každém webu na světě
// a nikdo ho nevymýšlí — kdežto všechno ostatní v cms_document napsal člověk,
// který za to odpovídá.
//
// Číselník, který je pro všechny instalace stejný, patří do nástroje. Proto
// DIAL_PREFIX_DEFAULTS níž: čistá instalace předvolby UMÍ, aniž by kdokoli
// cokoli zakládal, a řádek v cms_setting vzniká teprve ve chvíli, kdy se
// vlastník rozhodne ten výchozí seznam změnit.
//
// ---------------------------------------------------------------------------
// Pořadí je pořadí v poli
// ---------------------------------------------------------------------------
//
// Žádné číslo `order` a žádný přepínač `active`. Seznam v nastavení je seznam,
// ze kterého se řádky přetahují a mažou — číslo pořadí vedle přetahování je
// druhá pravda o tomtéž a dřív nebo později si obě odporují. A zemi, kterou
// nechcete nabízet, prostě smažete; vypínač je tam jen proto, aby v seznamu
// zůstal řádek, který nic nedělá.
//
// PRVNÍ ZEMĚ JE VÝCHOZÍ. Na té pole telefonu startuje, takže „co je
// předvybrané" se nastavuje pořadím a ne dalším zaškrtávátkem, které jde
// zaškrtnout dvakrát.
//
// ---------------------------------------------------------------------------
// Validace není zdvořilost
// ---------------------------------------------------------------------------
//
// `code` se skládá s číslem, které návštěvník napsal, a výsledek je telefonní
// číslo, na které někdo zavolá. Předvolba bez plus není předvolba, je to číslo
// navíc nalepené zepředu. Kontroluje se to proti úzkému vzoru a co neprojde,
// se ODMÍTNE S HLÁŠKOU, nikdy se tiše neopraví — tiše opravené nastavení je
// nastavení, které se nastaví špatně dvakrát.

import { invalid, serverError } from './errors.js'
import { assertServer } from './env.js'
import { getAdminClient } from './supabaseAdmin.js'
// Výchozí seznam. Vlastní soubor bez importů, protože ho potřebuje i klientská
// polovina, a ta tenhle modul vidět nesmí — sahá na servisní klíč.
import { DIAL_PREFIX_DEFAULTS, defaultDialPrefixes } from '../dialPrefixes.data.js'

const TABLE = 'cms_setting'

/** Stabilní, psaný literálně tady a nikde jinde. Vyhoví check constraintu z 0006. */
export const DIAL_PREFIXES_KEY = 'dial_prefixes'

export { DIAL_PREFIX_DEFAULTS }

// Plus a jedna až čtyři číslice. Nejdelší předvolby na světě mají tři
// (+998), čtvrtá číslice je rezerva — a nic širšího, protože tenhle řetězec
// končí v `tel:` odkazu a ve zprávě, kterou někdo bude vytáčet.
const CODE = /^\+[0-9]{1,4}$/

// Dvě písmena podle ISO 3166-1 alpha-2. Nepovinné: drží zemi pohromadě, i když
// se přejmenuje nebo přerovná, ale seznam funguje i bez něj.
const ISO = /^[A-Za-z]{2}$/

// Strop na délku seznamu. Zemí je na světě necelá dvoustovka a tohle pole jede
// v odpovědi endpointu, který nevyžaduje přihlášení — neohraničený seznam je
// neohraničená odpověď.
const MAX_ENTRIES = 250

const db = () => getAdminClient()

/** Jedna položka, očištěná. `iso` je velkými, nebo není vůbec. */
const clean = (entry) => {
    const source = entry && typeof entry === 'object' ? entry : {}
    const iso = String(source.iso ?? '').trim().toUpperCase()

    return {
        iso: ISO.test(iso) ? iso : null,
        code: String(source.code ?? '').trim(),
        label: String(source.label ?? '').trim(),
    }
}

/**
 * Cokoli -> platný seznam. Používá se na cestě z databáze stejně jako do ní,
 * takže řádek zapsaný starší verzí tohohle souboru nebo upravený ručně nemůže
 * dostat na web předvolbu, která není předvolba.
 *
 * Prázdný výsledek znamená výchozí seznam. Formulář, který nenabídne jedinou
 * zemi, je formulář, do kterého nejde napsat telefon — a to je horší než
 * zobrazit třináct zemí, o kterých nikdo nerozhodl.
 */
const coerce = (value) => {
    const items = Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : []

    const seen = new Set()
    const list = []

    for (const entry of items.slice(0, MAX_ENTRIES)) {
        const item = clean(entry)
        if (!CODE.test(item.code) || !item.label) continue
        // Dvě země se stejnou předvolbou jsou v rozbaleném seznamu dva řádky,
        // mezi kterými se nedá rozhodnout. První vyhrává.
        if (seen.has(item.code)) continue
        seen.add(item.code)
        list.push(item)
    }

    return list.length ? list : defaultDialPrefixes()
}

/**
 * Totéž, ale odmítá to, co by `coerce` mlčky zahodil.
 *
 * Zápisy jdou tudy, čtení přes `coerce`. Ta nesouměrnost je záměr: vlastníkovi,
 * který napíše „420", se to řekne, a řádek, který to nějak obsahuje, se přežije.
 */
const validate = (list) => {
    if (!Array.isArray(list)) {
        throw invalid('Seznam předvoleb musí být pole')
    }
    if (list.length === 0) {
        throw invalid('Seznam nesmí být prázdný', {
            items: 'Nechte aspoň jednu zemi — pole telefonu na první z nich startuje.',
        })
    }
    if (list.length > MAX_ENTRIES) {
        throw invalid(`Seznam smí mít nejvýš ${MAX_ENTRIES} zemí`)
    }

    const seen = new Map()
    const clean_ = []

    list.forEach((entry, index) => {
        const item = clean(entry)
        // Číslo řádku, ne pořadí od nuly: hláška se čte vedle seznamu na
        // obrazovce, kde je první řádek první.
        const where = `Řádek ${index + 1}`

        if (!item.label) {
            throw invalid(`${where}: chybí název země`, { [`items.${index}.label`]: 'Povinné' })
        }
        if (item.label.length > 60) {
            throw invalid(`${where}: název země je moc dlouhý`, { [`items.${index}.label`]: 'Nejvýš 60 znaků' })
        }
        if (!CODE.test(item.code)) {
            throw invalid(`${where}: předvolba se píše jako +420 — plus a jedna až čtyři číslice`, {
                [`items.${index}.code`]: 'Neplatná předvolba',
            })
        }
        if (entry?.iso && !item.iso) {
            throw invalid(`${where}: kód země jsou dvě písmena, například CZ`, {
                [`items.${index}.iso`]: 'Neplatný kód',
            })
        }
        if (seen.has(item.code)) {
            throw invalid(`${where}: předvolba ${item.code} už je na řádku ${seen.get(item.code) + 1}`, {
                [`items.${index}.code`]: 'Duplicitní předvolba',
            })
        }

        seen.set(item.code, index)
        clean_.push(item)
    })

    return clean_
}

/**
 * Co se právě nabízí.
 *
 * Chybějící řádek, nezmigrovaná databáze, úložiště, které tenhle klíč nikdy
 * nedrželo, i úložiště, které vůbec neběží — na všechno se odpovídá výchozím
 * seznamem, ne chybou. Čte to trasa bez přihlášení a „předvolby vypadají jako
 * po instalaci" je na každou z těch situací správná odpověď; 500 na veřejné
 * trase proto, že nikdo ještě neotevřel nastavení, není.
 *
 * try/catch je kolem všeho, ne jen kolem dotazu, a ten čtvrtý případ je proč:
 * v produkčním buildu bez SUPABASE_SERVICE_ROLE_KEY `getAdminClient()` HODÍ
 * výjimku dřív, než se dotaz sestaví (souborové úložiště odmítá běžet
 * v produkci, fileStore/store.js), takže kontrola vráceného `error` ji nikdy
 * neuvidí. Nasazení v tom stavu je rozbité a říká to nahlas jinde; tohle mu
 * rozbíjet nemá co. Selhání se loguje, ať není tiché.
 *
 * Totožná úvaha i tvar jako `readManageWidget` v ./manageWidget.js.
 */
export const readDialPrefixes = async () => {
    assertServer('readDialPrefixes')

    try {
        const { data, error } = await db()
            .from(TABLE)
            .select('value')
            .eq('key', DIAL_PREFIXES_KEY)
            .maybeSingle()

        if (error) throw new Error(error.message)
        return coerce(data?.value)
    } catch (failure) {
        console.warn(
            `[cms] ${TABLE}/${DIAL_PREFIXES_KEY} nelze přečíst, použity výchozí předvolby:`,
            failure.message,
        )
        return defaultDialPrefixes()
    }
}

/**
 * Zapsat je. Jen vlastník — kontroluje se v handlers/dialPrefixes.js, dřív než
 * se sem dojde, tedy tam, kde na tomhle serveru bydlí každá jiná autorizace.
 *
 * Select-then-insert-or-update, ne upsert: souborové úložiště implementuje
 * slovesa, která repozitáře opravdu používají (fileStore/client.js to říká
 * nahlas), a přidat do něj `upsert` kvůli jednomu volajícímu znamená další
 * sloveso, které musí být správně ve dvou backendech. Dva dotazy nad tabulkou
 * s jedním řádkem na klíč za třetí implementaci nestojí.
 *
 * Uloží se `{ items }`, ne holé pole: sloupec má default `'{}'::jsonb`, takže
 * objekt je tvar, do kterého ta tabulka míří, a pojmenovaný klíč nechává místo
 * pro něco dalšího, aniž by se měnil tvar, který už někdo čte.
 */
export const writeDialPrefixes = async (actor, list) => {
    assertServer('writeDialPrefixes')

    const items = validate(list)
    const stamp = {
        value: { items },
        updated_by: actor?.id ?? null,
        updated_at: new Date().toISOString(),
    }

    const existing = await db().from(TABLE).select('key').eq('key', DIAL_PREFIXES_KEY).maybeSingle()
    if (existing.error) throw serverError('Uložení předvoleb selhalo')

    const { error } = existing.data
        ? await db().from(TABLE).update(stamp).eq('key', DIAL_PREFIXES_KEY)
        : await db().from(TABLE).insert({ key: DIAL_PREFIXES_KEY, ...stamp })

    if (error) throw serverError('Uložení předvoleb selhalo')

    return items
}
