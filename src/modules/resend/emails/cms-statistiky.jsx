import StudioShell, { S, StudioButton, StudioRow, StudioTable, StudioText } from "./_studio.jsx"

/**
 * Přehled za období — pro správce a majitele.
 *
 * ---------------------------------------------------------------------------
 * Připravené dopředu, zatím nikým neodesílané
 *
 * Šablona existuje, odesílání ne: pravidelný e-mail potřebuje něco, co ho
 * v daný čas spustí, a to tenhle projekt zatím nemá. Až bude — cron na Vercelu
 * nebo naplánovaná úloha — dostane tahle šablona hotová čísla a nic se na ní
 * měnit nebude.
 *
 * Čísla jsou VOLITELNÁ, každé zvlášť. Přehled, který spadne, protože jedna
 * hodnota chybí, je horší než přehled bez jednoho řádku; co se nepodařilo
 * spočítat, se prostě nevypíše.
 */
export const subject = ({ period }) => `Přehled webu${period ? ` — ${period}` : ""}`

const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("cs-CZ") : null)

export default function CmsStatsEmail({
    period = "",
    published = null,
    reviewsNew = null,
    reviewsPending = null,
    likes = null,
    mediaAdded = null,
    topReview = null,
    siteUrl = "https://www.prochazkagroup.cz",
}) {
    const pending = num(reviewsPending)

    return (
        <StudioShell
            preview={`Co se na webu dělo${period ? ` — ${period}` : ""}.`}
            eyebrow={period || "Přehled"}
            title="Co se na webu dělo"
            siteUrl={siteUrl}
            footNote="Souhrn chodí správcům a majiteli. Čísla jsou za uvedené období."
        >
            <StudioText style={{ margin: 0 }}>Krátký přehled toho, co se od minule změnilo.</StudioText>

            <div style={{ paddingTop: "18px" }}>
                <StudioTable>
                    <StudioRow label="Publikovaných změn" value={num(published)} />
                    <StudioRow label="Nových recenzí" value={num(reviewsNew)} />
                    <StudioRow label="Čeká na schválení" value={pending} />
                    <StudioRow label="Nových „líbí se“" value={num(likes)} />
                    <StudioRow label="Přibylo do knihovny" value={num(mediaAdded)} last />
                </StudioTable>
            </div>

            {topReview ? (
                <div style={{ paddingTop: "18px" }}>
                    <StudioText muted style={{ margin: "0 0 8px" }}>Nejoblíbenější recenze období</StudioText>
                    <div style={{ padding: "16px", backgroundColor: S.raised, border: `1px solid ${S.line}`, borderRadius: "3px", fontSize: "15px", lineHeight: "24px", color: S.ink2 }}>
                        {topReview}
                    </div>
                </div>
            ) : null}

            {pending && Number(reviewsPending) > 0 ? (
                <StudioText>
                    {reviewsPending === 1 ? "Jedna recenze čeká" : `${pending} recenzí čeká`} na schválení — dokud je
                    někdo neprojde, na webu se neobjeví.
                </StudioText>
            ) : null}

            <div style={{ padding: "22px 0 4px" }}>
                <StudioButton href={`${siteUrl}/studio`}>Otevřít Studio</StudioButton>
            </div>
        </StudioShell>
    )
}

CmsStatsEmail.PreviewProps = {
    period: "srpen 2026",
    published: 14,
    reviewsNew: 6,
    reviewsPending: 5,
    likes: 128,
    mediaAdded: 80,
    topReview: "Profesionální přístup, poradil nám, jaký typ pojištění je pro naši rodinu nejvhodnější.",
}
