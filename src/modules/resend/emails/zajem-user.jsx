import EmailShell, { BrandButton, BrandText, DataRow, DataTable } from "./_shell.jsx"
import { BRAND, SITE } from "./_brand.js"
import { fill, paragraphs, textsFor } from "./_texts.js"

/**
 * Potvrzení poptávky — pro zákazníka.
 *
 * Vzhled je obálka `_shell.jsx` — barvy a typografie změřené na živém webu,
 * v hlavičce snímek jeho shaderu. Bez emotikonů a bez „VIP" — web mluví
 * střídmě a e-mail, který mluví jinak, vypadá, že přišel odjinud.
 *
 * Texty jdou přepsat ve Studiu (E-maily): `texts` jsou přepisy nad výchozím
 * zněním z ./_texts.js; bez nich (náhled) platí výchozí.
 */
function ZajemUserEmailComponent({ name, email, phone_number, consultant_name, message, personalizedGreeting, texts }) {
    const t = textsFor("zajem-user", texts)
    const vars = { jméno: name?.trim() || "" }
    const greeting = personalizedGreeting?.trim() ? personalizedGreeting.trim() : fill(t.greeting, vars)

    return (
        <EmailShell preview="Vaši poptávku máme. Ozveme se." eyebrow={fill(t.eyebrow, vars)} title={fill(t.title, vars)} footNote={paragraphs(fill(t.footNote, vars)).join(" ")}>
            <BrandText style={{ margin: 0 }}>{greeting}</BrandText>
            {paragraphs(fill(t.lead, vars)).map((line, i) => (
                <BrandText key={i}>{line}</BrandText>
            ))}

            <div style={{ paddingTop: "18px" }}>
                <BrandText muted style={{ margin: "0 0 8px" }}>{fill(t.summary, vars)}</BrandText>
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

            {t.button.trim() ? (
                <div style={{ padding: "22px 0 4px" }}>
                    <BrandButton href={`${SITE}/nabidka`}>{fill(t.button, vars)}</BrandButton>
                </div>
            ) : null}
        </EmailShell>
    )
}

export default ZajemUserEmailComponent

// Dvě jména pro jednu komponentu, protože ji volají dva soubory a každý jinak:
// src/pages/api/resend.js bere pojmenovaný export, resend-enhanced.js výchozí.
export const zajemUserEmail = ZajemUserEmailComponent

/** Předmět — výchozí, nebo přepis ze Studia (`texts.subject`). */
export const subject = (data = {}, texts) => fill(textsFor("zajem-user", texts).subject, { jméno: data.name })

ZajemUserEmailComponent.PreviewProps = {
    name: "Karel Šrámek",
    email: "karel.sramek@example.cz",
    phone_number: "+420 777 123 456",
    consultant_name: "Mgr. Václav Procházka",
    message: "Zajímá mě hypotéka a přepojištění auta.",
}
