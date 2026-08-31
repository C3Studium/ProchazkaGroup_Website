import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND, SITE } from "./_brand.js"

/**
 * Potvrzení odběru novinek — pro zákazníka.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Dřív měly tyhle e-maily fialovo-azurový
 * přechod a modré pozadí, které web nikde nemá.
 *
 * Bez emotikonů a bez „VIP" a „BEZPLATNÁ konzultace čeká!" — web mluví
 * střídmě a e-mail, který mluví jinak, vypadá, že přišel odjinud.
 */
function NewsletterUserEmailComponent({ name, email, personalizedGreeting }) {
    const greeting = personalizedGreeting?.trim()
        ? personalizedGreeting.trim()
        : name?.trim()
          ? `Dobrý den, ${name.trim()},`
          : "Dobrý den,"

    return (
        <EmailShell
            preview="Odběr novinek potvrzen."
            eyebrow="Newsletter"
            title="Odběr novinek potvrzen"
            footNote="Tenhle e-mail je potvrzení. Pokud jste nám nepsali, dejte nám prosím vědět."
        >
            <BrandText style={{ margin: 0 }}>{greeting}</BrandText>
            <BrandText>děkujeme za přihlášení. Píšeme jen tehdy, když máme co říct — žádné týdenní dávky.</BrandText>

            <div style={{ padding: "22px 0 4px" }}>
                <BrandButton href={`${SITE}/`}>Prohlédnout web</BrandButton>
            </div>
        </EmailShell>
    )
}

export default NewsletterUserEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý jinak:
// src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js výchozí.
export const newsletterUserEmail = NewsletterUserEmailComponent

export const subject = () => `Děkujeme za přihlášení k novinkám`

NewsletterUserEmailComponent.PreviewProps = {
    name: "Jana Filipská",
    email: "jana.filipska@example.cz",
}
