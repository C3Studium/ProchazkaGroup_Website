import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND, SITE } from "./_brand.js"

/**
 * Poděkování za recenzi — pro zákazníka.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Dřív měly tyhle e-maily fialovo-azurový
 * přechod a modré pozadí, které web nikde nemá.
 *
 * Bez emotikonů a bez „VIP" a „BEZPLATNÁ konzultace čeká!" — web mluví
 * střídmě a e-mail, který mluví jinak, vypadá, že přišel odjinud.
 */
function RecenzeUserEmailComponent({ customerName: name, email, message, consultantName, hashtag, created_at, personalizedGreeting }) {
    const greeting = personalizedGreeting?.trim()
        ? personalizedGreeting.trim()
        : name?.trim()
          ? `Dobrý den, ${name.trim()},`
          : "Dobrý den,"

    return (
        <EmailShell
            preview="Děkujeme za recenzi."
            eyebrow="Recenze"
            title="Děkujeme za recenzi"
            footNote="Tenhle e-mail je potvrzení. Pokud jste nám nepsali, dejte nám prosím vědět."
        >
            <BrandText style={{ margin: 0 }}>{greeting}</BrandText>
            <BrandText>děkujeme, že jste si našli čas. Recenzi jsme přijali; na webu se objeví, jakmile ji projdeme.</BrandText>

            {message ? (
                <div style={{ paddingTop: "16px" }}>
                    <div style={{ padding: "16px", backgroundColor: BRAND.raised, border: `1px solid ${BRAND.line}`, fontSize: "15px", lineHeight: "24px", color: BRAND.ink2, whiteSpace: "pre-wrap" }}>
                        {message}
                    </div>
                </div>
            ) : null}

            <div style={{ padding: "22px 0 4px" }}>
                <BrandButton href={`${SITE}/recenze`}>Zobrazit recenze</BrandButton>
            </div>
        </EmailShell>
    )
}

export default RecenzeUserEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý jinak:
// src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js výchozí.
export const recenzeUserEmail = RecenzeUserEmailComponent

export const subject = ({ customerName }) => `Děkujeme za vaši recenzi${customerName ? `, ${customerName}` : ""}`

RecenzeUserEmailComponent.PreviewProps = {
    customerName: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    consultantName: "Mgr. Václav Procházka",
    message: "Profesionální přístup, vše vysvětlil a poradil.",
}
