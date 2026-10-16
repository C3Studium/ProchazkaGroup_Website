import StudioShell, { S, StudioButton, StudioRow, StudioTable, StudioText } from "./_studio.jsx"

/**
 * Někdo publikoval změnu — pro správce a majitele.
 *
 * Publikování je jediná akce v celém systému, kterou uvidí veřejnost. Kdo za
 * web odpovídá, se o ní má dozvědět, aniž by musel chodit do Studia se dívat.
 *
 * Členům se neposílá. Ti obsah upravují a publikují dnes a denně; e-mail o
 * vlastní práci je šum, který se po týdnu přestane číst — a s ním i ten, který
 * si přečíst bylo potřeba.
 */
export const subject = ({ what }) => `Na webu je změna${what ? ` — ${what}` : ""}`

export default function CmsUpdateEmail({
    what = "",
    typeTitle = "",
    who = "",
    when = "",
    pages = [],
    siteUrl = "https://www.prochazkagroup.cz",
}) {
    const paths = (pages || []).filter(Boolean)

    return (
        <StudioShell
            preview={`${who || "Někdo"} publikoval změnu na webu.`}
            eyebrow="Publikováno"
            title="Na webu je změna"
            siteUrl={siteUrl}
            footNote="Tenhle e-mail chodí správcům a majiteli při každém publikování. Členům ne."
        >
            <StudioText style={{ margin: 0 }}>
                {who ? `${who} publikoval` : "Někdo publikoval"} změnu, která je od téhle chvíle vidět na webu.
            </StudioText>

            <div style={{ paddingTop: "18px" }}>
                <StudioTable>
                    <StudioRow label="Co se změnilo" value={what} />
                    <StudioRow label="Typ obsahu" value={typeTitle} />
                    <StudioRow label="Kdo" value={who} />
                    <StudioRow label="Kdy" value={when} last={!paths.length} />
                    {paths.length ? (
                        <StudioRow label="Dotčené stránky" value={paths.join(", ")} last />
                    ) : null}
                </StudioTable>
            </div>

            <div style={{ padding: "22px 0 4px" }}>
                <StudioButton href={`${siteUrl}/studio`}>Otevřít Studio</StudioButton>
            </div>

            <StudioText muted>
                Předchozí verze zůstává v archivu — vrátit se k ní jde ve Studiu, nic se nepřepsalo nenávratně.
            </StudioText>
        </StudioShell>
    )
}

CmsUpdateEmail.PreviewProps = {
    what: "Úvodní obrazovka",
    typeTitle: "Texty na webu",
    who: "Jana Filipská",
    when: "29. srpna 2026 v 16:24",
    pages: ["/", "/o-nas"],
}
