"use client";

import { useEffect, useState } from "react";

// Dvě sady hodnot pro shaderový podklad, a jedno pravidlo, které mezi nimi
// vybírá.
//
// Shader je jedna plocha pod celým webem, ale nekouká se na ni na všech
// zařízeních stejně. Na telefonu drženém na výšku je to úzký vysoký pruh, do
// kterého se z tunelu vejde jiný kus než do širokého okna na stole — a hodnoty,
// které byly vyladěné na jedno, na druhém nesedí.
//
// Proto dvě sady místo jedné. UPRIGHT je přesně to, co tu bylo dosud, protože
// právě na to se to ladilo. LANDSCAPE zatím obsahuje totéž, takže se dnešním
// nasazením nic nezmění — je to místo, kde se ta druhá varianta bude ladit, ne
// změna, která už proběhla.

/** Svislý telefon a svislý tablet — sada, na kterou byl web vyladěný. */
export const UPRIGHT = Object.freeze({
    layers: 4,
    falloff: 1.15,
    blend: 4,
    feedback: 3,
    amplitude: 1.5,
    scale: 5,
    perspective: 1,
    zoom: 0.2,
    speed: 1.25,
    bands: 3,
    phase: 6,
    spread: 0,
    gamut: 0.1,
    contrast: 2.5,
    vignette: 1,
    opacity: 1,
    color: "#020e15",
    hotColor: "#98dbf8",
    backgroundColor: "#020e15",
    cursorInteraction: false
});

/**
 * Všechno ostatní — okno naležato, tedy i stůl.
 *
 * Zatím kopie té svislé, a to je záměr: rozdělení je hotové, ladění ne. Kdo to
 * bude ladit, mění jen čísla tady a druhé sady se to nedotkne.
 */

export const LANDSCAPE = Object.freeze({
    layers: 5,
    falloff: 1.15,
    blend: 4,
    feedback: 3,
    amplitude: 1.5,
    scale: 5,
    perspective: 1,
    zoom: 0.2,
    speed: 1.25,
    bands: 3,
    phase: 6,
    spread: 0,
    gamut: 0.1,
    contrast: 2,
    vignette: 0,
    opacity: 1,
    color: "#020e15",
    hotColor: "#98dbf8",
    backgroundColor: "#020e15",
    cursorInteraction: false
});

// Svisle A na dotyk. Ta druhá půlka je tam kvůli oknu na stole zúženému do
// výšky — je to pořád stůl a patří mu sada pro naležato, i když je okno vyšší
// než širší.
const UPRIGHT_QUERY = "(orientation: portrait) and (pointer: coarse)";

/**
 * Která sada platí teď, a hlídá si to sama.
 *
 * `matchMedia` a ne `resize`: orientace je vlastnost dotazu, takže se o otočení
 * zařízení dozvíme rovnou a nemusíme nic odvozovat z rozměrů okna. Posluchač se
 * odpojuje, protože podklad je sice mountovaný jednou v `_app`, ale nic to
 * negarantuje na věky.
 *
 * Startuje na sadě pro naležato a opravuje se v efektu: tohle běží i na serveru,
 * kde žádné okno není, a první klientský render musí souhlasit s tím, co server
 * poslal — jinak React hlásí neshodu.
 */
export const useTunnelPreset = () => {
    const [upright, setUpright] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(UPRIGHT_QUERY);
        const read = () => setUpright(query.matches);

        read();
        query.addEventListener("change", read);
        return () => query.removeEventListener("change", read);
    }, []);

    return upright ? UPRIGHT : LANDSCAPE;
};
