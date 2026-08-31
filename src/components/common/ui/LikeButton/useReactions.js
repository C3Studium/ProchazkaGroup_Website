import { useCallback, useEffect, useRef, useState } from "react";

/**
 * „Líbí se" na veřejné stránce — stav, přepnutí a smíření se serverem.
 *
 * ---------------------------------------------------------------------------
 * Proč se stav načítá až v prohlížeči
 *
 * Stránka je staticky generovaná a to samé HTML dostane každý. Nemůže tedy nést
 * odpověď na „lajkoval jsem tohle já", protože „já" je otisk IP, který zná jen
 * server. Tlačítko se proto vykreslí v neutrálním stavu a hned po připojení se
 * zeptá. Kdyby se to řešilo v prohlížeči (localStorage), rozešlo by se to
 * s pravdou při každém vymazání dat a mezi dvěma prohlížeči na jednom připojení.
 *
 * ---------------------------------------------------------------------------
 * Proč se číslo mění hned a teprve pak se ověří
 *
 * Veřejné stránky mají desetiminutové okno ISR, takže číslo z props je starší
 * než teď. Kdyby klik čekal na server, vypadalo by to půl vteřiny jako by se nic
 * nestalo. Změní se tedy okamžitě a server ho vzápětí přepíše svým — včetně
 * případu, kdy se hlas nezapsal.
 *
 * Odebrání jde stejnou cestou, a to je ta část, na které záleží: kdo klikne
 * omylem, musí mít cestu zpět, a číslo po zrušení nesmí zůstat o jedna vyšší.
 */

const ENDPOINT = "/api/cms/reactions";

export function useReactions(type, ids) {
    // Ids come from props and are stable per render; joining them is what makes
    // the effect below run once per SET rather than once per render.
    const key = (ids || []).filter(Boolean).join(",");

    const [liked, setLiked] = useState(() => new Set());
    const [counts, setCounts] = useState(() => ({}));
    const [ready, setReady] = useState(false);
    // Requests in flight, so a double click cannot send two POSTs and end up
    // reconciling against the older answer.
    const busy = useRef(new Set());

    useEffect(() => {
        if (!key) return undefined;
        let live = true;

        fetch(`${ENDPOINT}?type=${encodeURIComponent(type)}&ids=${encodeURIComponent(key)}`)
            .then((response) => (response.ok ? response.json() : null))
            .then((answer) => {
                if (!live || !answer) return;
                setLiked(new Set(answer.liked || []));
                setCounts(answer.counts || {});
                setReady(true);
            })
            // Silent: a wall that renders with the numbers it was built with is
            // the page working, just not freshly. Nothing here is worth an error
            // in front of a reader.
            .catch(() => {});

        return () => {
            live = false;
        };
    }, [type, key]);

    const toggle = useCallback(
        async (id) => {
            if (!id || busy.current.has(id)) return;
            busy.current.add(id);

            const wasLiked = liked.has(id);
            const delta = wasLiked ? -1 : 1;

            // Straight away, both directions.
            setLiked((current) => {
                const next = new Set(current);
                if (wasLiked) next.delete(id);
                else next.add(id);
                return next;
            });
            setCounts((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));

            try {
                const response = await fetch(ENDPOINT, {
                    method: wasLiked ? "DELETE" : "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ type, id }),
                });
                const answer = response.ok ? await response.json() : null;
                if (!answer) throw new Error("odmítnuto");

                // The server's word wins, always. It is what closes the case the
                // optimistic path cannot see: a vote refused because this
                // visitor had already used theirs from another tab, or a
                // withdrawal of a vote that was no longer there.
                setLiked((current) => {
                    const next = new Set(current);
                    if (answer.liked) next.add(id);
                    else next.delete(id);
                    return next;
                });
                setCounts((current) => ({ ...current, [id]: answer.count }));
            } catch {
                // Put it back. A number that stayed moved after a failed request
                // is a lie the reader has no way to notice.
                setLiked((current) => {
                    const next = new Set(current);
                    if (wasLiked) next.add(id);
                    else next.delete(id);
                    return next;
                });
                setCounts((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) - delta) }));
            } finally {
                busy.current.delete(id);
            }
        },
        [liked, type],
    );

    /** The count to print: the server's when it has spoken, the built-in until then. */
    const countOf = useCallback((id, fallback = 0) => (id in counts ? counts[id] : fallback), [counts]);

    return { liked, ready, toggle, countOf, isLiked: (id) => liked.has(id) };
}
