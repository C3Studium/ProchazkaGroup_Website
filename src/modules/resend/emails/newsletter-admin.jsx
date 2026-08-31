import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND } from "./_brand.js"

/**
 * Nový odběratel newsletteru — pro kancelář.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Interní e-mail: žádné vítání ani sliby
 * o lhůtách, jen kdo psal, co, a čím se dá odpovědět.
 */
function NewsletterAdminEmailComponent({ name, email, subscriptionDate }) {
    const when = new Date(subscriptionDate || Date.now()).toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" })

    return (
        <EmailShell
            preview={`Nový odběratel: ${email || ""}`}
            eyebrow="Newsletter"
            title="Nový odběratel"
            footNote="Odesláno automaticky z webu."
        >
            <BrandText style={{ margin: 0 }}>K odběru novinek se přihlásil nový člověk.</BrandText>

            <div style={{ paddingTop: "18px" }}>
                <DataTable>
                    <DataRow label="Jméno" value={name} />
                    <DataRow label="E-mail" value={email} />
                    <DataRow label="Přihlášeno" value={when} last />
                </DataTable>
            </div>

            <div style={{ padding: "24px 0 4px" }}>
                <BrandButton href={`mailto:${email}?subject=${encodeURIComponent("Procházka Group")}`}>Odpovědět</BrandButton>
            </div>
        </EmailShell>
    )
}

export default NewsletterAdminEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý
// jinak: src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js
// výchozí. Sjednotit je by znamenalo sáhnout na obojí; tohle je jeden řádek.
export const newsletterAdminEmail = NewsletterAdminEmailComponent

export const subject = ({ name }) => `Nový odběratel newsletteru — ${name || "web"}`

NewsletterAdminEmailComponent.PreviewProps = {
    name: "Jana Filipská",
    email: "jana.filipska@example.cz",
}
