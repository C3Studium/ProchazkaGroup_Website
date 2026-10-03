"use client";

import { useCallback, useState } from "react";

// Odeslání formuláře na /api/forms.
//
// Nahrazuje `useResend`, a to v jedné jediné věci: NEPOSÍLÁ ADRESU PŘÍJEMCE.
// Starý hook bral `to` a předával ho trase, která ho poslušně použila — takže
// o tom, komu web pošle e-mail, rozhodoval kód v prohlížeči. Kam co jde, ví
// teď výhradně server (@/lib/mail/forms).
//
// Co z toho formulář dostane: `send`, `sending` a to, že dvojklik na tlačítko
// nepošle dvě zprávy.

/**
 * Oznámení, na kterém nezávisí výsledek akce.
 *
 * Pro recenze: uložení dělá /api/cms/reviews a to je ta akce, která se povedla
 * nebo nepovedla. E-mail je zpráva o ní — když neodejde, recenze v databázi
 * pořád je, a říct člověku „nepovedlo se" by bylo tvrzení, že se nic nestalo.
 *
 * Nikdy nevyhodí výjimku a nikdo na ni nečeká. Selhání se zapíše do konzole,
 * ať není tiché; víc se s tím na straně prohlížeče udělat nedá.
 */
export const notifyForm = (form, data) =>
    fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, data }),
    })
        .then((res) => {
            if (!res.ok) console.warn(`[forms] oznámení ${form} neodešlo — HTTP ${res.status}`);
        })
        .catch(() => console.warn(`[forms] oznámení ${form} neodešlo — síť`));

export default function useFormSubmit(form) {
    const [sending, setSending] = useState(false);

    const send = useCallback(
        async (data) => {
            // Druhé kliknutí, dokud první letí, se zahodí. Tlačítko si stav
            // hlídá samo přes `sending`, ale `disabled` dorazí až po
            // překreslení a prst je rychlejší.
            if (sending) return { ok: false, error: "sending" };

            setSending(true);
            try {
                const res = await fetch("/api/forms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ form, data }),
                });

                // Odpověď nemusí být JSON — 502 z proxy nebo spadlá funkce
                // vrátí HTML, a `res.json()` by pak hodilo výjimku, která se
                // formuláři jeví jako něco úplně jiného než „nepovedlo se".
                const payload = await res.json().catch(() => null);

                if (!res.ok) {
                    return { ok: false, error: payload?.error || "Zprávu se nepodařilo odeslat." };
                }
                return { ok: true };
            } catch {
                // Odpojená síť. Jediná situace, kterou tenhle hook zná a trasa ne.
                return { ok: false, error: "Zkontrolujte prosím připojení a zkuste to znovu." };
            } finally {
                setSending(false);
            }
        },
        [form, sending],
    );

    return { send, sending };
}
