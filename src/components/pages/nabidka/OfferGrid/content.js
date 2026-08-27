// The offer, as one chain of blocks read downwards. The words are the old
// design's own — short, because this part of the page is a list of what we do
// and not an essay about it.

const WALLET = { photo: "/assets/backgrounds/wallet_2000.webp", position: "center" };
const DESK = { photo: "/assets/backgrounds/deskWork_2000.webp", position: "center 42%" };
const PHONE = { photo: "/assets/backgrounds/onPhone_2000.webp", position: "center 38%" };

// One list, in reading order: a heading, the blocks that answer it, the next
// heading. The side is which half of the spine the block stands on.
export const CHAIN = [
    {
        kind: "head",
        side: "right",
        n: "03",
        title: "Co všechno pro vás vyřešíme",
        lead: "To, co by vám trvalo několik dekád, zvládneme během několika let.",
    },
    {
        kind: "box",
        side: "left",
        n: "03.01",
        title: "Bez stresu a presu",
        body: "Smlouvy a rezervy sledujeme za vás. Když se objeví něco výhodnějšího, dáme vědět.",
        ...WALLET,
    },
    {
        kind: "box",
        side: "right",
        n: "03.02",
        title: "Kontrola nad situací",
        body: "Přes tři tisíce portfolií hlídáme průběžně. Vy u toho sedět nemusíte.",
        ...DESK,
    },
    {
        kind: "box",
        side: "left",
        n: "03.03",
        title: "Nezávislost na trhu",
        body: "Nejsme vázaní na jednu společnost ani na banku. Plán je na míru vám, ne produktu.",
        ...PHONE,
    },

    {
        kind: "head",
        side: "right",
        n: "04",
        title: "Nejste experti na finanční trh?",
        lead: "Nikdo z nás nemá desítky hodin týdně na sledování trhu. Uděláte jen tolik, abyste si vytvořili rezervy — výsledky profesionálů máte i tak.",
    },
    {
        kind: "box",
        side: "left",
        n: "04.01",
        title: "Trh sledujeme my",
        body: "Vy si řeknete, kolik chcete odkládat. Kam to půjde a kdy se to má přesunout, je naše práce.",
        ...PHONE,
    },
    {
        kind: "box",
        side: "right",
        n: "04.02",
        title: "Rozhodnutí zůstávají vaše",
        body: "Dostanete čísla a možnosti, ne pokyny. Podepisujete jen to, čemu rozumíte.",
        ...DESK,
    },

    {
        kind: "head",
        side: "left",
        n: "05",
        title: "Jak s námi můžete začít",
        lead: "Tři kroky, které jsou u všech stejné.",
    },
    {
        kind: "box",
        side: "right",
        n: "05.01",
        title: "První schůzka",
        body: "Projdeme, kde jste teď a co byste chtěli. Nic se nepodepisuje a nic neplatíte.",
        ...DESK,
    },
    {
        kind: "box",
        side: "left",
        n: "05.02",
        title: "Modelování",
        body: "Postavíme plán na míru a ukážeme, co dělá s vašimi penězi v čase.",
        ...WALLET,
    },
    {
        kind: "box",
        side: "right",
        n: "05.03",
        title: "Pravidelný servis",
        body: "Portfolio hlídáme dál. Změní-li se trh nebo váš život, změní se s ním plán.",
        ...PHONE,
    },

    {
        kind: "head",
        side: "left",
        n: "06",
        title: "Co vás to stojí",
        lead: "Vás nic. Platí nás partnerské společnosti, se kterými smlouvu nakonec uzavřete.",
    },
    {
        kind: "box",
        side: "right",
        n: "06.01",
        title: "Schůzka i plán zdarma",
        body: "Platíte až za produkt, který si vyberete — a ten byste platili tak jako tak.",
        ...WALLET,
    },
    {
        kind: "box",
        side: "left",
        n: "06.02",
        title: "Třiačtyřicet partnerů",
        body: "Protože jich máme tolik, nemáme důvod tlačit vás k jednomu z nich.",
        ...DESK,
    },
];
