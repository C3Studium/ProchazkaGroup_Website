// Hlídka nad `--st-font`.
//
// Své vlastní písmo si Studio od 0.1.41 veze (viz ../styles/font.js), takže
// za normálních okolností tahle kontrola mlčí. Smysl má tam, kde `--st-font`
// přepíše hostitel na rodinu, kterou na svém stroji nemá — pak se kreslí
// systémovým, které bývá širší.
//
// Nespadne nic; jen každý těsný kus chromu drží text širší, než s jakým
// návrh počítal. Zalomení, které k tomu přibylo, přetok chytá — ale správné
// písmo nenahradí.
//
// Proto se to ozve. Kontrola je jeden dotaz na `document.fonts` a hlásí se
// jednou za život stránky.

let told = false

/** Jméno rodiny z `--st-font`, bez uvozovek. */
const firstFamily = (root) => {
    const stack = getComputedStyle(root).getPropertyValue("--st-font") || ""
    const first = stack.split(",")[0]?.trim() || ""
    return first.replace(/^['"]|['"]$/g, "")
}

/**
 * Je tahle rodina na stroji k dispozici?
 *
 * Měřením, ne přes `document.fonts.check()`. Ta odpovídá na jinou otázku, než
 * na jakou vypadá: podle specifikace vrací `true`, když se text dá vykreslit
 * bez čekání na nějaký nenačtený `@font-face` — a pro rodinu, ke které žádný
 * `@font-face` neexistuje, není na co čekat. Změřeno: pro vymyšlené jméno
 * vrací `true` stejně jako pro skutečné písmo, takže by chybějící rodinu
 * nepoznala nikdy.
 *
 * Šířka řetězce vykresleného v `"Rodina", monospace` proti témuž v samotném
 * `monospace` odpoví spolehlivě: když se rovnají, rodina se nepoužila.
 * Řetězec je schválně z písmen s velmi rozdílnou šířkou, ať je rozdíl velký
 * i u písem podobných metrik.
 */
const available = (family) => {
    try {
        const context = document.createElement("canvas").getContext("2d")
        if (!context) return true
        const probe = "mmmmmwwwwwiiiii"
        context.font = `48px monospace`
        const base = context.measureText(probe).width
        context.font = `48px "${family}", monospace`
        return Math.abs(context.measureText(probe).width - base) > 0.5
    } catch {
        // Bez plátna se ptát nedá. Mlčet je lepší než hlásit poplach.
        return true
    }
}

/**
 * Řekne, když písmo Studia na tomhle stroji není.
 *
 * @param {HTMLElement|null} root  kořen Studia
 */
export const reportMissingFont = async (root) => {
    if (told || !root || typeof document === "undefined") return

    // Až po `fonts.ready`, a to ze dvou důvodů.
    //
    // Kdyby se ptalo hned při připojení, hlásilo by to chybějící písmo na
    // každém webu, který si Switzer stahuje ze sítě — v tu chvíli ještě
    // opravdu není. Falešný poplach na správně nastaveném projektu je horší
    // než žádná hláška.
    //
    // A druhá věc: `--st-font` může přepsat hostitel svým stylopisem, který
    // se taky nemusí stihnout načíst dřív než tenhle kód. Rodina se proto
    // čte až tady.
    try {
        await document.fonts?.ready
    } catch {
        /* prohlížeč bez Font Loading API — měření níž funguje i tak */
    }
    if (told) return

    const family = firstFamily(root)
    if (!family || available(family)) return

    told = true
    console.warn(
        `[cms] Písmo "${family}" na tomhle stroji není, Studio se kreslí náhradním. `
            + `Náhradní bývá širší, takže řady tlačítek zalomí jinak, než jak jsou navržené. `
            + `Buď ho projekt dodej (@font-face), nebo přepiš --st-font na kořeni Studia na písmo, které máš.`,
    )
}
