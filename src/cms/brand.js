// Jak se tenhle redakční systém jmenuje.
//
// Jedno místo, protože jinak jich bylo pět: přihlašovací obrazovka, její
// patička, hlavička e-mailu, předmět pozvánky a její patička — a ve všech
// pěti stálo natvrdo jméno jednoho zákazníka. Každý další web tak dostal
// Studio, které se hlásí cizím jménem, a nedalo se to přepsat jinak než
// forkem balíčku.
//
// `NEXT_PUBLIC_`, protože přihlašovací obrazovka je klientská. Není to
// tajemství — je to nápis na dveřích.
//
// Prázdno je platná odpověď: kdo jméno nevyplní, uvidí neutrální text místo
// cizího. Proto se nikde nepíše `brand || "něco"`, ale ptá se přes funkce
// níž, které to prázdno umí.

const configured = () => (process.env.NEXT_PUBLIC_CMS_BRAND || '').trim()

/** Jméno organizace, nebo prázdno. */
export const brandName = () => configured()

/** "Redakční systém X", nebo jen "Redakční systém". */
export const brandSubtitle = () => {
    const name = configured()
    return name ? `Redakční systém ${name}` : 'Redakční systém'
}

/** "X — interní nástroj", nebo jen "Interní nástroj". */
export const brandFootnote = () => {
    const name = configured()
    return name ? `${name} — interní nástroj` : 'Interní nástroj'
}

/**
 * "do redakčního systému X" — druhý pád, protože do věty v e-mailu se první
 * nehodí. Ohýbat `brandSubtitle()` v místě použití znamenalo `.toLowerCase()`
 * a `.replace()` nad českou větou, což je oprava, která platí do prvního
 * jiného pádu.
 */
export const brandGenitive = () => {
    const name = configured()
    return name ? `redakčního systému ${name}` : 'redakčního systému'
}
