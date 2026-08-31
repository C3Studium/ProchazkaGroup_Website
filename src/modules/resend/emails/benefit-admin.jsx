import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND } from "./_brand.js"

/**
 * Nová žádost o Benefit program — pro kancelář.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Interní e-mail: žádné vítání ani sliby
 * o lhůtách, jen kdo psal, co, a čím se dá odpovědět.
 */
function BenefitAdminEmailComponent({ name, email, message, phone_number, consultant_name, benefitType = "Benefit Program", applicationDate }) {
    const when = new Date(applicationDate || Date.now()).toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" })

    return (
        <EmailShell
            preview={`Nová žádost o benefit od ${name || "návštěvníka"}`}
            eyebrow="Benefit program"
            title="Nová žádost o benefit"
            footNote="Odesláno automaticky z webu."
        >
            <BrandText style={{ margin: 0 }}>Přišla žádost o zapojení do Benefit programu.</BrandText>

            <div style={{ paddingTop: "18px" }}>
                <DataTable>
                    <DataRow label="Jméno" value={name} />
                    <DataRow label="E-mail" value={email} />
                    <DataRow label="Telefon" value={phone_number} />
                    <DataRow label="Vybraný poradce" value={consultant_name} />
                    <DataRow label="Typ benefitu" value={benefitType} />
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
                <BrandButton href={`mailto:${email}?subject=${encodeURIComponent("Re: vaše žádost o benefit — Procházka Group")}`}>Odpovědět</BrandButton>
            </div>
        </EmailShell>
    )
}

export default BenefitAdminEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý
// jinak: src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js
// výchozí. Sjednotit je by znamenalo sáhnout na obojí; tohle je jeden řádek.
export const benefitAdminEmail = BenefitAdminEmailComponent

export const subject = ({ name }) => `Nová žádost o benefit — ${name || "web"}`

BenefitAdminEmailComponent.PreviewProps = {
    name: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    phone_number: "+420 777 123 456",
    consultant_name: "Mgr. Václav Procházka",
    benefitType: "Benefit Program",
    message: "Dobrý den, rád bych doporučil kolegu z práce.",
}
