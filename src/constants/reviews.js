// Komu recenze patří, jak se to píše na kartě.
//
// Tenhle řádek stál nahoře na kartě jako `#poradce` — což byla `hashtag`,
// a ta není volný štítek, ale KATEGORIE: `poradce` nebo `benefitprogram`,
// a nic jiného (viz cms/schemas/review.js). Server si ji navíc odvozuje ze
// jména poradce, takže neříkala nic, co by už nebylo na kartě napsané:
// nahoře stálo „#poradce" a dole jméno toho poradce. Dvakrát totéž, jednou
// zkratkou a jednou pořádně.
//
// Takže nahoře je teď rovnou to jméno a dole už není. Karta říká jednu věc
// jednou. `hashtag` v datech i ve Studiu ZŮSTÁVÁ — filtruje se podle ní, které
// recenze se objeví na které stránce (lib/site/people.js), takže je to pořád
// funkční pole, jen se nevypisuje.
//
// Jedno místo, protože to kreslí pět různých komponent: zeď na /recenze i její
// rozkliknutá karta, drift na /nabídka, benefitové recenze i jejich karta a
// ukázka na hlavní stránce. Pět kopií jedné formulace jsou čtyři místa, kde se
// rozejde.

/** Program není člověk, ale v datech sedí ve stejném poli jako poradce. */
const BENEFIT_PROGRAMME = "benefit program";

/**
 * „Pro – Jan Novák". Vrací `null`, když recenze poradce nemá — volající pak
 * ten řádek vůbec nevykreslí, místo aby tam nechal viset samotné „Pro –".
 *
 * @param {{ consultantName?: string }} review
 * @returns {string | null}
 */
export const reviewCredit = (review) => {
    const raw = typeof review?.consultantName === "string" ? review.consultantName.trim() : "";
    if (!raw) return null;

    // Benefitové recenze mají v `consultantName` doslova „benefit program",
    // malými písmeny, protože to tam zapisuje submission hook a ne editor.
    // Velké písmeno je sazba, ne oprava dat.
    const name = raw.toLowerCase() === BENEFIT_PROGRAMME ? "Benefit program" : raw;

    // Pomlčka, ne spojovník: je to předěl mezi dvěma částmi věty, ne složené
    // slovo. Stejná, jakou sází zbytek webu.
    return `Pro – ${name}`;
};
