import { createContext, useContext, useMemo } from "react";

import { DIAL_PREFIXES } from "@/constants/dialPrefixes";

// Které země jdou vybrat před telefonním číslem, pro celý web najednou.
//
// Kontext, a ne prop, kvůli tomu, kde ta pole stojí. Telefon se zadává na čtyřech
// místech a každé z nich má vlastní cestu, kudy k němu tečou texty: kontaktní
// arch bere `copy` z lišty, poradenský formulář na úvodní stránce `formCopy`,
// QnA formulář `copy.form` a recenzní formulář zase svoje. Protáhnout stejný
// seznam čtyřmi různými řetězy propů znamená čtyři místa, kde se zapomene —
// a je to jeden seznam, který se na všech čtyřech místech chová stejně.
//
// Hodnota jede na propech každé stránky (`getDialPrefixes` v @/lib/site) a
// `_app` ji vloží sem. Stránka, která ji neveze, dostane seznam ze
// @/constants/dialPrefixes — stejný fallback jako všude jinde na tomhle webu.
const DialPrefixContext = createContext(DIAL_PREFIXES);

export function DialPrefixProvider({ prefixes, children }) {
    // Prázdné pole není odpověď, je to nenačtená odpověď: kdyby se seznam
    // propsal prázdný, pole by nenabídlo vůbec nic a číslo by nešlo zadat.
    const value = useMemo(
        () => (Array.isArray(prefixes) && prefixes.length ? prefixes : DIAL_PREFIXES),
        [prefixes],
    );

    return <DialPrefixContext.Provider value={value}>{children}</DialPrefixContext.Provider>;
}

/** Seznam předvoleb. Nikdy prázdný — viz fallback výše. */
export const useDialPrefixes = () => useContext(DialPrefixContext);

/** Na čem pole začíná: první položka seznamu, aby se ty dvě nerozešly. */
export const useDefaultDial = () => useDialPrefixes()[0]?.code || DIAL_PREFIXES[0].code;
