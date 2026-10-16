import Cookies from "js-cookie";

// Jediné místo, které ví, jak se ze souhlasu s cookies pozná „smí se měřit".
// Zapisuje ho CookiesProvider (`cookiePreferences` + `cookieConsentDate`, oboje
// na 180 dní); tady se jen čte — synchronně, aby se dalo zeptat i mimo React
// (trackEvent) a v okamžiku, kdy provider ještě nestihl načíst svůj stav.

export const PREFERENCES_COOKIE = "cookiePreferences";
export const CONSENT_DATE_COOKIE = "cookieConsentDate";

// Cookies, které po sobě nechají měřicí skripty. Smažou se, když návštěvník
// souhlas s analytikou vezme zpátky — jinak by odvolání nic neodvolalo.
export const ANALYTICS_COOKIES = ["_ga", "_gid", "_gat", "_clck", "_clsk", "CLID", "MUID"];

export const readPreferences = () => {
    if (typeof document === "undefined") return null;
    try {
        const raw = Cookies.get(PREFERENCES_COOKIE);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const hasAnalyticsConsent = () => readPreferences()?.analytics === true;

export const clearAnalyticsCookies = () => {
    if (typeof document === "undefined") return;
    // GA zapisuje na doménu o úroveň výš (.prochazkagroup.cz) a `_ga_<ID>`
    // má v názvu identifikátor měření — proto výčet i prefix a obě domény.
    const host = window.location.hostname;
    const parent = host.split(".").slice(-2).join(".");
    const names = Object.keys(Cookies.get()).filter(
        (name) => ANALYTICS_COOKIES.includes(name) || name.startsWith("_ga_"),
    );
    for (const name of names) {
        Cookies.remove(name, { path: "/" });
        Cookies.remove(name, { path: "/", domain: host });
        Cookies.remove(name, { path: "/", domain: `.${parent}` });
    }
};
