// Rolování uvnitř overlaye, na stránce, která si scroll unesla.
//
// Overlay se vykresluje do dokumentu rámované stránky — a na téhle stránce
// běží web hostitele se vším, co si na scroll nasadil. Lenis, GSAP
// ScrollSmoother i Locomotive dělají totéž: poslouchají `wheel` na `window`
// s `passive: false` a zavolají `preventDefault()`, protože scroll si počítají
// sami. Prohlížeč pak neroluje NIC — ani panel, nad kterým je kurzor.
//
// Uvnitř overlaye je to vidět jako "knihovna médií nejde rolovat": mřížka
// přetéká, posuvník je vidět, kolečko nedělá nic. A protože ta samá stránka
// mimo overlay roluje výborně, vypadá to jako chyba dialogu.
//
// Zavírá se to dvěma způsoby, protože ani jeden sám nestačí:
//
//   1. `data-lenis-prevent` — Lenisova vlastní úniková cesta. Je dokumentovaná
//      a v jeho distribuci je to jediný atribut, který takhle funguje. Řeší to
//      správně: Lenis událost nad tímhle podstromem ignoruje a nechá ji
//      prohlížeči.
//
//   2. Zastavení bubliny na kořeni overlaye. Lenis není jediný a ostatní
//      žádný opt-out nemají. `wheel` bublá od cíle vzhůru; posluchač na
//      `window` je až za námi, takže když ji zastavíme tady, nedostane ji.
//      Výchozí akce — tedy samotné rolování panelu — se tím nedotkneme, ta
//      na propagaci nezávisí.
//
// Co to NEřeší: hijacker, který poslouchá na `window` v capture fázi. Ten
// běží dřív než cokoli našeho a jediná obrana by byla `preventDefault` na
// jeho vlastní událost, což by rozbilo rolování i nám. Zatím žádná z těch tří
// knihoven to tak nedělá.

const EVENTS = ["wheel", "touchmove"]

/**
 * Zapoj na kořen overlaye. Vrací funkci, která to zase odpojí.
 *
 * @param {HTMLElement|null} root
 */
export const keepScroll = (root) => {
    if (!root) return () => {}

    root.setAttribute("data-lenis-prevent", "")

    // Bublina, ne capture: v capture fázi bychom událost zastavili DŘÍV, než
    // se dostane k panelu uvnitř, a jeho vlastní posluchače bychom umlčeli.
    const stop = (event) => event.stopPropagation()
    for (const name of EVENTS) root.addEventListener(name, stop, { passive: true })

    return () => {
        root.removeAttribute("data-lenis-prevent")
        for (const name of EVENTS) root.removeEventListener(name, stop)
    }
}
