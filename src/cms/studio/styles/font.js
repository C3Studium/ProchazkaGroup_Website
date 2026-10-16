// Písmo Studia — jedno, vlastní, přibalené.
//
// Do 0.1.40 tokeny žádaly `Switzer-Variable`, které balíček nikdy nedodával.
// Kde ho projekt neměl, kreslilo se Studio systémovým písmem — na Windows
// Segoe UI, znatelně širším —, každý těsný kus chromu držel text širší, než
// s jakým návrh počítal, a tlačítka přetékala. Hledalo se to v CSS panelu,
// kde příčina nebyla.
//
// Teď si ho Studio veze. Je to Inter (SIL Open Font License 1.1, licence
// leží vedle souboru), zúžený na 227 znaků, které Studio opravdu kreslí:
// ASCII, česká, slovenská a polská diakritika, uvozovky, pomlčky a pár
// symbolů. Z 325 kB zbylo 35 kB.
//
// ---------------------------------------------------------------------------
// Proč přes FontFace API a ne `@font-face` ve stylopisu
//
// `@font-face` uvnitř shadow rootu se NEREGISTRUJE — prohlížeč pravidla
// o písmu bere jen z dokumentu. Jakmile se Studio nebo overlay přesune do
// stínového stromu, deklarace v jeho vlastním CSS by přestala platit a písmo
// by zmizelo. `document.fonts.add()` míří na dokument vždycky, takže tahle
// cesta přežije obojí.
//
// Druhý důvod je rám náhledu: je to jiný dokument s vlastní sadou písem.
// Overlay v něm kreslí své ovládání a musí si písmo zaregistrovat sám —
// proto funkce bere `doc`, ne aby se spoléhala na globální `document`.
//
// Vlastní jméno rodiny, ne "Inter": kdyby se jmenovalo stejně, převzal by ho
// hostitel, který má vlastní Inter jiné verze nebo jiného řezu, a Studio by
// se kreslilo něčím, co nemá pod kontrolou.

// Data URI, ne import souboru. Next pro JS import fontu loader nemá —
// webpack na něm skončí na `Module parse failed: Unexpected character`
// a shodí build hostitele. Viz scripts/generate-font.mjs.
import { FONT_URL } from "./fonts/valecms-sans.js"

export const FAMILY = "ValeCMS Sans"

const done = new WeakSet()

/**
 * Zaregistruje písmo Studia do dokumentu. Opakované volání nic nestojí.
 *
 * @param {Document|null} doc
 */
export const registerStudioFont = (doc = typeof document === "undefined" ? null : document) => {
    if (!doc?.fonts || done.has(doc)) return
    done.add(doc)
    try {
        // `100 900` je celý rozsah proměnné osy, ne výčet řezů: jeden soubor
        // obsluhuje 300 až 600, které tokeny používají, bez dalších stažení.
        const face = new (doc.defaultView || window).FontFace(FAMILY, `url(${FONT_URL}) format("woff2")`, {
            weight: "100 900",
            style: "normal",
            display: "swap",
        })
        doc.fonts.add(face)
        face.load().catch(() => {
            // Nenačetlo se — písmo se prostě nepoužije a Studio spadne na
            // systémové. Hlásit to nemá komu: buď je balíček rozbitý, nebo
            // je offline, a obojí je vidět jinde a dřív.
        })
    } catch {
        // Prohlížeč bez FontFace API. Systémové písmo je pořád čitelné.
    }
}
