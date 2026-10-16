import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND } from "./_brand.js"

/**
 * Nová zpráva z kontaktního formuláře — pro kancelář.
 *
 * Vzhled je obálka `_shell.jsx`: barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Dřív měl tenhle e-mail fialovo-azurový
 * přechod a modré pozadí, které web nikde nemá.
 *
 * Interní e-mail, takže žádné vítání a žádné sliby o lhůtách — jen kdo psal,
 * co, a jedno tlačítko, kterým se dá odpovědět.
 */
function KontaktAdminEmailComponent({ name, email, message, phone_number, consultant_name }) {
    const when = new Date().toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" })

    return (
        <EmailShell
            preview={`Nová zpráva od ${name || "návštěvníka"}`}
            eyebrow="Kontaktní formulář"
            title="Nová zpráva z webu"
            footNote="Odesláno automaticky z kontaktního formuláře na webu."
        >
            <BrandText style={{ margin: 0 }}>Přišla zpráva z kontaktního formuláře.</BrandText>

            <div style={{ paddingTop: "18px" }}>
                <DataTable>
                    <DataRow label="Jméno" value={name} />
                    <DataRow label="E-mail" value={email} />
                    <DataRow label="Telefon" value={phone_number} />
                    <DataRow label="Vybraný poradce" value={consultant_name} />
                    <DataRow label="Odesláno" value={when} last />
                </DataTable>
            </div>

            {message ? (
                <div style={{ paddingTop: "18px" }}>
                    <BrandText muted style={{ margin: "0 0 8px" }}>
                        Zpráva
                    </BrandText>
                    <div
                        style={{
                            padding: "16px",
                            backgroundColor: BRAND.raised,
                            border: `1px solid ${BRAND.line}`,
                            fontSize: "15px",
                            lineHeight: "24px",
                            color: BRAND.ink,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {message}
                    </div>
                </div>
            ) : null}

            <div style={{ padding: "24px 0 4px" }}>
                <BrandButton href={`mailto:${email}?subject=${encodeURIComponent(`Re: vaše zpráva — Procházka Group`)}`}>
                    Odpovědět
                </BrandButton>
            </div>
        </EmailShell>
    )
}

export default KontaktAdminEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý
// jinak: src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js
// výchozí. Sjednotit je by znamenalo sáhnout na obojí; tohle je jeden řádek.
export const kontaktAdminEmail = KontaktAdminEmailComponent

export const subject = ({ name }) => `Nová kontaktní zpráva — ${name || "web"}`

// Ukázková data pro `pnpm run dev:email`. Bez nich se náhled kreslí prázdný a
// nejde na něm posoudit, co e-mail dělá s dlouhou zprávou nebo chybějícím
// telefonem.
KontaktAdminEmailComponent.PreviewProps = {
    name: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    phone_number: "+420 777 123 456",
    consultant_name: "Mgr. Václav Procházka",
    message:
        "Dobrý den,\nrádi bychom probrali hypotéku na první bydlení a přepojištění auta.\nKdy by se vám to hodilo?",
}
