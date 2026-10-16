// Výchozí seznam telefonních předvoleb — a nic jiného.
//
// Vlastní soubor bez jediného importu, protože ho potřebují obě strany, které
// se navzájem importovat nesmí: `server/dialPrefixes.js` sahá na servisní klíč
// a nikdy nesmí do balíku pro prohlížeč, `dialPrefixes.js` je React hook, který
// v prohlížeči jede. Kdyby si jeden z nich seznam přivlastnil, druhý by ho
// musel opsat — a dva seznamy zemí jsou dva seznamy, které se rozejdou.
//
// Je to VÝCHOZÍ STAV, ne názor. Vlastník si ho přepíše v Nastavení; tohle je
// to, co web umí, dokud to neudělá — a taky to, čím odpovídá databáze, která
// zrovna neběží.
//
// Česko vede, a je tedy předvybrané. Slovensko je druhá půlka přirozeného
// dosahu: jedna hranice, jeden jazyk, který se tu čte bez překládání. Zbytek
// jsou země, ze kterých se sem nejčastěji volá.

export const DIAL_PREFIX_DEFAULTS = Object.freeze(
    [
        { iso: "CZ", code: "+420", label: "Česko" },
        { iso: "SK", code: "+421", label: "Slovensko" },
        { iso: "AT", code: "+43", label: "Rakousko" },
        { iso: "DE", code: "+49", label: "Německo" },
        { iso: "PL", code: "+48", label: "Polsko" },
        { iso: "HU", code: "+36", label: "Maďarsko" },
        { iso: "GB", code: "+44", label: "Spojené království" },
        { iso: "IE", code: "+353", label: "Irsko" },
        { iso: "NL", code: "+31", label: "Nizozemsko" },
        { iso: "CH", code: "+41", label: "Švýcarsko" },
        { iso: "IT", code: "+39", label: "Itálie" },
        { iso: "ES", code: "+34", label: "Španělsko" },
        { iso: "US", code: "+1", label: "USA / Kanada" },
    ].map((entry) => Object.freeze(entry)),
);

/**
 * Výchozí seznam jako čerstvá, měnitelná kopie.
 *
 * Zmrazené pole je tu proto, aby ho nikdo nepřepsal, ne aby ho komponenta
 * dostala a spadla na prvním `sort`.
 */
export const defaultDialPrefixes = () => DIAL_PREFIX_DEFAULTS.map((entry) => ({ ...entry }));
