import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND, SITE } from "./_brand.js"

/**
 * Potvrzení žádosti o Benefit program — pro zákazníka.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Dřív měly tyhle e-maily fialovo-azurový
 * přechod a modré pozadí, které web nikde nemá.
 *
 * Bez emotikonů a bez „VIP" a „BEZPLATNÁ konzultace čeká!" — web mluví
 * střídmě a e-mail, který mluví jinak, vypadá, že přišel odjinud.
 */
function BenefitUserEmailComponent({ name, email, message, phone_number, consultant_name, applicationDate, personalizedGreeting, segment, timeContext }) {
    const greeting = personalizedGreeting?.trim()
        ? personalizedGreeting.trim()
        : name?.trim()
          ? `Dobrý den, ${name.trim()},`
          : "Dobrý den,"

    return (
        <EmailShell
            preview="Vaši žádost o Benefit program máme."
            eyebrow="Benefit program"
            title="Žádost máme"
            footNote="Tenhle e-mail je potvrzení. Pokud jste nám nepsali, dejte nám prosím vědět."
        >
            <BrandText style={{ margin: 0 }}>{greeting}</BrandText>
            <BrandText>děkujeme za zájem o Benefit program. Žádost jsme přijali a ozveme se vám do dvou pracovních dnů.</BrandText>

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
                <BrandButton href={`${SITE}/benefit-program`}>Jak program funguje</BrandButton>
            </div>
        </EmailShell>
    )
}

export default BenefitUserEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý jinak:
// src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js výchozí.
export const benefitUserEmail = BenefitUserEmailComponent

export const subject = () => `Vaši žádost o Benefit program jsme přijali`

BenefitUserEmailComponent.PreviewProps = {
    name: "Jana Filipská",
    email: "jana.filipska@example.cz",
    phone_number: "+420 776 157 476",
    consultant_name: "Mgr. Václav Procházka",
    message: "Ráda bych doporučila kolegu.",
}
