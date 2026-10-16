"use client";

import { useEffect, useMemo } from "react";

import Dropdown from "@/components/common/ui/Dropdown";
import { useDialPrefixes } from "@/cms/dialPrefixes";

// Předvolba před telefonním číslem.
//
// Od chvíle, kdy stejný seznam chtěly i tři výběry poradce, je tohle jen jeho
// zvláštní případ: veškerá mechanika — klávesnice, zavírání klikem vedle,
// otevření nahoru, když dole není místo — žije v @/components/common/ui/Dropdown
// a tenhle soubor jen říká, co do něj nasypat a jak se to má chovat, když se
// seznam ve Studiu změní.
//
// Drží si třídu `prefix`, kterou zdědil po prvku, jejž nahradil, a to je celá
// integrační strategie: tři formuláře si `.telRow .prefix` stylují samy —
// kontaktní arch 0,9rem v 55% bílé, poradenský formulář na úvodní stránce
// a QnA formulář každý po svém — a dědění po nich je to, co dovolí jednomu
// komponentu stát ve všech třech, aniž by se kterýkoli z nich překresloval.
//
// CO UKAZUJE ZAVŘENÝ. Jen předvolbu, nic víc.
//
// Název země v zavřeném ovladači byl první pokus a byl špatně: „+420 Česko" je
// skoro polovina řádku, na kterém má stát telefonní číslo. Země je v rozbaleném
// seznamu, kde si ji člověk vybírá, a v popisku pro odečítač obrazovky. Na řádku
// zůstane číslo.
//
// ODKUD SEZNAM. Z knihovny — `useDialPrefixes` v @/cms/dialPrefixes. Předvolby
// jsou nativní funkce Studia, ne obsah tohohle webu: upravují se v Nastavení,
// sekce **Telefonní předvolby**, a web si je stáhne jedním dotazem za záložku.
// Tenhle soubor o tom neví nic víc než to jméno.
//
// Když databáze neodpoví, hook vrátí výchozí seznam knihovny a formuláře
// fungují dál. Viz src/cms/DIAL-PREFIXES.md.
export default function DialPrefix({
    value,
    defaultValue,
    onChange,
    name = "dial",
    // Svislice, kterou dva z těch formulářů kreslí za předvolbou. Patří
    // k linkování toho pole, ne k tomuhle ovladači, takže se předává
    // a nepředpokládá — QnA formulář ji nemá.
    separator = false,
    size = 16,
    ...rest
}) {
    const prefixes = useDialPrefixes();

    // Kód je to, co se ukáže zavřené; země je druhý sloupec v seznamu.
    const options = useMemo(
        () => prefixes.map((entry) => ({ value: entry.code, label: entry.code, hint: entry.label })),
        [prefixes],
    );

    const current = value !== undefined ? value : undefined;

    // Uložená hodnota, která v seznamu není, se srovná na první položku.
    //
    // Tři formuláře si výchozí předvolbu nastavují z `DEFAULT_DIAL`, jeden
    // z nich v konstantě mimo komponentu, kde se na hook nedosáhne — a ta
    // konstanta je výchozí seznam knihovny, ne ten načtený, protože v tu chvíli
    // ještě načtený není. Když se seznam v Nastavení přerovná nebo se z něj
    // Česko vyhodí, ukazoval by
    // ovladač první položku seznamu, ale formulář by odeslal tu starou. Tohle je
    // ta jedna věta, která to drží spolu — a je tady, ne ve třech formulářích,
    // protože je to vlastnost seznamu, ne kteréhokoli z nich.
    useEffect(() => {
        if (!prefixes.length || current === undefined) return;
        if (prefixes.some((entry) => entry.code === current)) return;
        onChange?.({ target: { name, value: prefixes[0].code } });
        // `current` schválně mimo závislosti: efekt ho opravuje, a kdyby na něm
        // visel, opravoval by sám sebe.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefixes]);

    const selected = prefixes.find((entry) => entry.code === (current ?? defaultValue));

    return (
        <Dropdown
            className="prefix DialPrefix"
            options={options}
            value={value}
            defaultValue={defaultValue ?? prefixes[0]?.code}
            onChange={onChange}
            name={name}
            size={size}
            align
            // Zavřený ovladač ukazuje jen číslo, takže samotné „+421" je
            // všechno, co by odečítač přečetl. Tohle je ta chybějící půlka.
            label={`Předvolba země: ${selected?.label || selected?.code || ""}`}
            {...rest}
        >
            {separator ? <span className="DialPrefix__rule">|</span> : null}
        </Dropdown>
    );
}
