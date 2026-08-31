import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND, SITE } from "./_brand.js"

/**
 * Potvrzení poptávky — pro zákazníka.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Dřív měly tyhle e-maily fialovo-azurový
 * přechod a modré pozadí, které web nikde nemá.
 *
 * Bez emotikonů a bez „VIP" a „BEZPLATNÁ konzultace čeká!" — web mluví
 * střídmě a e-mail, který mluví jinak, vypadá, že přišel odjinud.
 */
function ZajemUserEmailComponent({ name, email, phone_number, consultant_name, message, inquiryDate, personalizedGreeting }) {
    const greeting = personalizedGreeting?.trim()
        ? personalizedGreeting.trim()
        : name?.trim()
          ? `Dobrý den, ${name.trim()},`
          : "Dobrý den,"

    return (
        <EmailShell
            preview="Vaši poptávku máme. Ozveme se."
            eyebrow="Poptávka"
            title="Vaši poptávku máme"
            footNote="Tenhle e-mail je potvrzení. Pokud jste nám nepsali, dejte nám prosím vědět."
        >
            <BrandText style={{ margin: 0 }}>{greeting}</BrandText>
            <BrandText>děkujeme za váš zájem. Poptávku jsme přijali a ozveme se vám do dvou pracovních dnů.</BrandText>

            <div style={{ paddingTop: "18px" }}>
                <BrandText muted style={{ margin: "0 0 8px" }}>Co jsme od vás dostali</BrandText>
                <DataTable>
                    <DataRow label="Jméno" value={name} />
                    <DataRow label="E-mail" value={email} />
                    <DataRow label="Telefon" value={phone_number} />
                    <DataRow label="Vybraný poradce" value={consultant_name} last />
                </DataTable>
            </div>

            {message ? (
                <div style={{ paddingTop: "16px" }}>
                    <div style={{ padding: "16px", backgroundColor: BRAND.raised, border: `1px solid ${BRAND.line}`, fontSize: "15px", lineHeight: "24px", color: BRAND.ink2, whiteSpace: "pre-wrap" }}>
                        {message}
                    </div>
                </div>
            ) : null}

            <div style={{ padding: "22px 0 4px" }}>
                <BrandButton href={`${SITE}/nabidka`}>Naše nabídka</BrandButton>
            </div>
        </EmailShell>
    )
}

export default ZajemUserEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý jinak:
// src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js výchozí.
export const zajemUserEmail = ZajemUserEmailComponent

export const subject = () => `Vaši poptávku jsme přijali — Procházka Group`

ZajemUserEmailComponent.PreviewProps = {
    name: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    phone_number: "+420 777 123 456",
    consultant_name: "Mgr. Václav Procházka",
    message: "Zajímá mě hypotéka a přepojištění auta.",
}
