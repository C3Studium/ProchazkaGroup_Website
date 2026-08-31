import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND } from "./_brand.js"

/**
 * Nová poptávka služeb — pro kancelář.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Interní e-mail: žádné vítání ani sliby
 * o lhůtách, jen kdo psal, co, a čím se dá odpovědět.
 */
function ZajemAdminEmailComponent({ name, email, phone_number, consultant_name, message, inquiryDate }) {
    const when = new Date(inquiryDate || Date.now()).toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" })

    return (
        <EmailShell
            preview={`Nová poptávka od ${name || "návštěvníka"}`}
            eyebrow="Poptávka"
            title="Nový zájem o služby"
            footNote="Odesláno automaticky z webu."
        >
            <BrandText style={{ margin: 0 }}>Přišla poptávka z webu.</BrandText>

            <div style={{ paddingTop: "18px" }}>
                <DataTable>
                    <DataRow label="Jméno" value={name} />
                    <DataRow label="E-mail" value={email} />
                    <DataRow label="Telefon" value={phone_number} />
                    <DataRow label="Vybraný poradce" value={consultant_name} />
                    <DataRow label="Odesláno" value={when} last />
                </DataTable>
            </div>

            {msg ? (
                <div style={{ paddingTop: "18px" }}>
                    <BrandText muted style={{ margin: "0 0 8px" }}>Zpráva</BrandText>
                    <div style={{ padding: "16px", backgroundColor: BRAND.raised, border: `1px solid ${BRAND.line}`, fontSize: "15px", lineHeight: "24px", color: BRAND.ink, whiteSpace: "pre-wrap" }}>
                        {message}
                    </div>
                </div>
            ) : null}

            <div style={{ padding: "24px 0 4px" }}>
                <BrandButton href={`mailto:${email}?subject=${encodeURIComponent("Re: vaše poptávka — Procházka Group")}`}>Odpovědět</BrandButton>
            </div>
        </EmailShell>
    )
}

export default ZajemAdminEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý
// jinak: src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js
// výchozí. Sjednotit je by znamenalo sáhnout na obojí; tohle je jeden řádek.
export const zajemAdminEmail = ZajemAdminEmailComponent

export const subject = ({ name }) => `Nový zájem o služby — ${name || "web"}`

ZajemAdminEmailComponent.PreviewProps = {
    name: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    phone_number: "+420 777 123 456",
    consultant_name: "Mgr. Václav Procházka",
    message: "Zajímá mě hypotéka a přepojištění auta.",
}
