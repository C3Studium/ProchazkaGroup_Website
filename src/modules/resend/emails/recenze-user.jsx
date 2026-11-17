import EmailShell, { BrandButton, BrandText } from "./_shell.jsx"
import { BRAND, SITE } from "./_brand.js"
import { fill, paragraphs, textsFor } from "./_texts.js"

/**
 * Poděkování za recenzi — pro zákazníka.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Bez emotikonů a bez „VIP" — web mluví
 * střídmě a e-mail, který mluví jinak, vypadá, že přišel odjinud.
 *
 * Texty jdou přepsat ve Studiu (E-maily): `texts` jsou přepisy nad výchozím
 * zněním z ./_texts.js; bez nich (náhled) platí výchozí.
 */
function RecenzeUserEmailComponent({ customerName: name, message, personalizedGreeting, texts }) {
    const t = textsFor("recenze-user", texts)
    const vars = { jméno: name?.trim() || "" }
    const greeting = personalizedGreeting?.trim() ? personalizedGreeting.trim() : fill(t.greeting, vars)

    return (
        <EmailShell preview="Děkujeme za recenzi." eyebrow={fill(t.eyebrow, vars)} title={fill(t.title, vars)} footNote={paragraphs(fill(t.footNote, vars)).join(" ")}>
            <BrandText style={{ margin: 0 }}>{greeting}</BrandText>
            {paragraphs(fill(t.lead, vars)).map((line, i) => (
                <BrandText key={i}>{line}</BrandText>
            ))}

            {message ? (
                <div style={{ paddingTop: "16px" }}>
                    <div style={{ padding: "16px", backgroundColor: BRAND.raised, border: `1px solid ${BRAND.line}`, fontSize: "15px", lineHeight: "24px", color: BRAND.ink2, whiteSpace: "pre-wrap" }}>
                        {message}
                    </div>
                </div>
            ) : null}

            {t.button.trim() ? (
                <div style={{ padding: "22px 0 4px" }}>
                    <BrandButton href={`${SITE}/recenze`}>{fill(t.button, vars)}</BrandButton>
                </div>
            ) : null}
        </EmailShell>
    )
}

export default RecenzeUserEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý jinak:
// src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js výchozí.
export const recenzeUserEmail = RecenzeUserEmailComponent

/** Předmět — výchozí, nebo přepis ze Studia (`texts.subject`). */
export const subject = (data = {}, texts) => fill(textsFor("recenze-user", texts).subject, { jméno: data.customerName })

RecenzeUserEmailComponent.PreviewProps = {
    customerName: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    consultantName: "Mgr. Václav Procházka",
    message: "Profesionální přístup, vše vysvětlil a poradil.",
}
