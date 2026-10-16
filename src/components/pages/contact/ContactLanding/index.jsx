import { useEffect, useRef } from "react";

import CornerButton from "@/components/common/ui/CornerButton";
import { CONTACT_TRIGGER, openContactModal } from "@/components/common/ContactModal/open";
import { useGlobalContext } from "@/context/LoadProvider";

// /kontakt. Kontakt na tomhle webu není stránka, ale list, který otevírá lišta
// — a /kontakt je adresa, na kterou vedou jeho tlačítka pro prostřední klik,
// vyhledávač a prohlížeč bez JavaScriptu. Kdo sem přijde, dostane rovnou ten
// list; a kdo ho zavře, nestojí na prázdné stránce: má tu nadpis, cestu zpátky
// k listu a pod tím patičku se všemi kontakty.
export default function ContactLanding() {
    // Při prvním načtení až po úvodní oponě — jinak se list otevře pod ní.
    const { gate } = useGlobalContext();
    const opened = useRef(false);

    useEffect(() => {
        if (gate !== "go" || opened.current) return undefined;
        // Lišta list registruje ve vlastním efektu. Je vykreslená před stránkou,
        // takže bývá hotová dřív — ale ne zaručeně, proto ještě jeden snímek.
        const frame = requestAnimationFrame(() => {
            opened.current = true;
            openContactModal();
        });
        return () => cancelAnimationFrame(frame);
    }, [gate]);

    return (
        <section className="ContactLanding">
            <p className="ContactLanding__eyebrow"><em>§</em> Kontakt</p>
            <h1 className="ContactLanding__title">Spojme se</h1>
            <p className="ContactLanding__lead">
                Napište nám a ozveme se vám zpátky, obvykle do jednoho pracovního dne.
                Telefon, e-mail i adresu kanceláře najdete níže.
            </p>
            <CornerButton href="/kontakt" {...CONTACT_TRIGGER}>
                Napsat zprávu
            </CornerButton>
        </section>
    );
}
