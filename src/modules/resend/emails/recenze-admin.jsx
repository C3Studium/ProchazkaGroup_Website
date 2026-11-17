import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND } from "./_brand.js"
import { fill, paragraphs, textsFor } from "./_texts.js"

/**
 * Nová recenze ke schválení — pro kancelář.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Interní e-mail: žádné vítání ani sliby
 * o lhůtách, jen kdo psal, co, a čím se dá odpovědět.
 *
 * Texty jdou přepsat ve Studiu (E-maily): `texts` jsou přepisy nad výchozím
 * zněním z ./_texts.js; bez nich (náhled) platí výchozí.
 */
function RecenzeAdminEmailComponent({ customerName, email, message, consultantName, hashtag, created_at, texts }) {
    const t = textsFor("recenze-admin", texts)
    const vars = { jméno: customerName?.trim() || "" }
    const when = new Date(created_at || Date.now()).toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" })

    return (
        <EmailShell
            preview={`Nová recenze od ${customerName || "zákazníka"}`}
            eyebrow={fill(t.eyebrow, vars)}
            title={fill(t.title, vars)}
            footNote={paragraphs(fill(t.footNote, vars)).join(" ")}
        >
            {paragraphs(fill(t.lead, vars)).map((line, i) => (
                <BrandText key={i} style={i ? undefined : { margin: 0 }}>{line}</BrandText>
            ))}

            <div style={{ paddingTop: "18px" }}>
                <DataTable>
                    <DataRow label="Zákazník" value={customerName} />
                    <DataRow label="E-mail" value={email} />
                    <DataRow label="Poradce" value={consultantName} />
                    <DataRow label="Štítek" value={hashtag ? `#${hashtag}` : null} />
                    <DataRow label="Odesláno" value={when} last />
                </DataTable>
            </div>

            {message ? (
                <div style={{ paddingTop: "18px" }}>
                    <BrandText muted style={{ margin: "0 0 8px" }}>{fill(t.messageTitle, vars)}</BrandText>
                    <div style={{ padding: "16px", backgroundColor: BRAND.raised, border: `1px solid ${BRAND.line}`, fontSize: "15px", lineHeight: "24px", color: BRAND.ink, whiteSpace: "pre-wrap" }}>
                        {message}
                    </div>
                </div>
            ) : null}

            {email && t.button.trim() ? (
                <div style={{ padding: "24px 0 4px" }}>
                    <BrandButton href={`mailto:${email}?subject=${encodeURIComponent("Děkujeme za recenzi — Procházka Group")}`}>{fill(t.button, vars)}</BrandButton>
                </div>
            ) : null}
        </EmailShell>
    )
}

export default RecenzeAdminEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý
// jinak: src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js
// výchozí. Sjednotit je by znamenalo sáhnout na obojí; tohle je jeden řádek.
export const recenzeAdminEmail = RecenzeAdminEmailComponent

/** Předmět — výchozí, nebo přepis ze Studia (`texts.subject`); {jméno} = zákazník. */
export const subject = (data = {}, texts) => fill(textsFor("recenze-admin", texts).subject, { jméno: data.customerName || "web" })

RecenzeAdminEmailComponent.PreviewProps = {
    customerName: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    consultantName: "Mgr. Václav Procházka",
    hashtag: "poradce",
    message: "Profesionální přístup, vše vysvětlil a poradil. Mohu jen doporučit.",
}
