"use client";

import { useEffect, useState } from "react";

// Telefonní předvolby — to, co si z knihovny bere WEB.
//
// Dvojče k `server/dialPrefixes.js`, které vlastní uložený seznam a trasu
// /api/cms/dial-prefixes. Tenhle soubor je jeho klientská polovina a nesmí
// z něj nic importovat: ten modul sahá na `getAdminClient()` a servisní klíč,
// a jeden import v komponentě formuláře by ho zatáhl do balíku, který stáhne
// návštěvník. Výchozí seznam proto nebydlí ani tady, ani tam, ale ve
// `dialPrefixes.data.js` — v souboru bez importů, na který dosáhnou obě
// strany, aniž by jedna viděla druhou.
//
// Co tím web získá: nic z toho už nepíše. Žádný typ dokumentu, žádné fixtury,
// žádný čtenář v getStaticProps a žádný kontext protažený čtyřmi řetězy propů.
// Jeden import a hotovo.
//
//     import { useDialPrefixes, fullPhoneNumber } from "@/cms/dialPrefixes"
//
// Viz DIAL-PREFIXES.md, kde je rozepsané, proč je číselník států funkcí
// nástroje a ne obsahem webu.

import { DIAL_PREFIX_DEFAULTS, defaultDialPrefixes as copy } from "./dialPrefixes.data.js";

// Výchozí seznam se re-exportuje, ať web nemusí vědět, že je ve vlastním
// souboru. Ten soubor existuje kvůli serveru, ne kvůli volajícímu.
export { DIAL_PREFIX_DEFAULTS };

/** Na čem pole telefonu startuje: první země seznamu. */
export const defaultDial = (prefixes) =>
    (Array.isArray(prefixes) && prefixes[0]?.code) || DIAL_PREFIX_DEFAULTS[0].code;

/**
 * Výchozí předvolba jako prostá konstanta, pro místa, kde se na hook nedosáhne
 * — typicky prázdný formulář zapsaný v `const EMPTY = {...}` nad komponentou.
 *
 * Je to VÝCHOZÍ SEZNAM, ne ten nastavený: v tu chvíli ještě není načtený
 * a modul na vrchu souboru se stejně vyhodnotí jen jednou. Nevadí to, protože
 * to dorovnává ovladač — když se hodnota v načteném seznamu nenajde, srovná ji
 * na první položku a formuláři to oznámí. Kdo tu opravu nemá, ať sáhne po
 * `useDefaultDial()`.
 */
export const DEFAULT_DIAL = DIAL_PREFIX_DEFAULTS[0].code;

/**
 * Předvolba a číslo jako jedno telefonní číslo.
 *
 * Formuláře si obojí drží zvlášť, protože to jsou dvě pole — a to je správně,
 * dokud se z nich něco neodesílá. Ve chvíli, kdy se odesílá, musí do zprávy
 * jít složené číslo: samotné „777 111 222" je číslo, na které se nedá zavolat
 * odnikud, a předvolba na vlastním řádku je údaj, který nikdo nepřečte jako
 * jeho součást.
 *
 * Je to jedna věta a je v knihovně schválně: každý web, který tohle pole
 * použije, má aspoň tři formuláře, a tři vlastní spojení jsou tři místa, kde
 * se na předvolbu zapomene.
 *
 * Mezera mezi nimi, ne nic: takhle se telefonní číslo píše.
 */
export const fullPhoneNumber = (dial, phone) => {
    const number = String(phone ?? "").trim();
    if (!number) return "";
    const prefix = String(dial ?? "").trim();
    // Číslo, které si předvolbu už nese, se nedostane dvakrát.
    if (!prefix || number.startsWith("+")) return number;
    return `${prefix} ${number}`;
};

// ---------------------------------------------------------------------------
// Načtení
// ---------------------------------------------------------------------------
//
// JEDEN DOTAZ NA ZÁLOŽKU, ne jeden na formulář. Cache je na modulu, tedy sdílená
// všemi, kdo hook zavolají, a rozpracovaný slib se vrací dalším volajícím — bez
// toho by čtyři formuláře na jedné stránce poslaly čtyři dotazy na tutéž
// odpověď, a to jsou tři dotazy navíc pokaždé.
//
// PROČ FETCH A NE PROPY. Ve `_app` si v Pages Routeru nejde načíst nic, aniž by
// celý web přišel o statickou generaci (`App.getInitialProps` to vypne všem
// stránkám). Dřívější řešení to obcházelo tím, že seznam vezla každá stránka na
// propech ze svého `getStaticProps` a `_app` ho vkládal do kontextu — devět
// stránek, devět míst, kde se na to dá zapomenout. Tohle je jeden dotaz
// z prohlížeče a knihovna si ho řeší sama.
//
// CENA: první vykreslení seznam nemá. Proto se startuje na výchozím seznamu
// a ne na prázdnu — pole telefonu je tak použitelné od prvního snímku a po
// odpovědi se jen doplní to, co si vlastník nastavil. Prázdný seznam na jeden
// snímek by byl formulář, do kterého na okamžik nejde napsat telefon.

let cached = null;
let inFlight = null;

/** Odpověď serveru -> seznam, nebo výchozí. Tvar na drátě je `{ items }`. */
const unwrap = (body) => {
    const items = Array.isArray(body) ? body : body?.items;
    return Array.isArray(items) && items.length ? items : copy();
};

/**
 * Seznam předvoleb, jednou za záložku.
 *
 * Mimo prohlížeč — tedy při serverovém průchodu — vrací výchozí seznam a nic
 * neposílá. To je správně a je to i nutné: první klientský render se musí
 * shodnout s tím, co poslal server, jinak React hlásí neshodu.
 */
export const fetchDialPrefixes = async () => {
    if (cached) return cached;
    if (typeof window === "undefined") return copy();
    if (inFlight) return inFlight;

    inFlight = fetch("/api/cms/dial-prefixes", { credentials: "same-origin" })
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
            cached = unwrap(body);
            return cached;
        })
        .catch(() => {
            // Offline, přerušeno, nebo trasa, která tam není. Výchozí seznam je
            // na všechny tři správná odpověď — formulář funguje dál.
            //
            // Necachuje se: příští stránka to zkusí znovu. Výpadek sítě není
            // odpověď, kterou má smysl si pamatovat do konce návštěvy.
            return copy();
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
};

/**
 * Předvolby pro komponentu. Nikdy prázdné.
 *
 * @returns {{ iso: string|null, code: string, label: string }[]}
 */
export const useDialPrefixes = () => {
    const [prefixes, setPrefixes] = useState(() => cached || copy());

    useEffect(() => {
        let live = true;
        fetchDialPrefixes().then((list) => {
            if (live) setPrefixes(list);
        });
        return () => {
            live = false;
        };
    }, []);

    return prefixes;
};

/** Výchozí předvolba pro `useState` ve formuláři. */
export const useDefaultDial = () => defaultDial(useDialPrefixes());
