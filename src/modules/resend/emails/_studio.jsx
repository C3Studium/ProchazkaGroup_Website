import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components"

/**
 * Obálka e-mailů, které posílá redakční systém.
 *
 * Sourozenec `_shell.jsx`, ale v paletě Studia, ne webu — a ten rozdíl je
 * záměrný. E-mail z formuláře čte zákazník a má vypadat jako web. Tenhle čte
 * někdo, kdo za chvíli otevře administraci, a ta je tmavá, střídmá a má jedinou
 * akcentní barvu. Kdyby pozvánka nebo hlášení o změně vypadaly jako
 * marketingový e-mail, byl by to o jeden důvod k nedůvěře víc.
 *
 * Hodnoty jsou opsané ze src/cms/studio/styles/_tokens.module.scss. Opsané, ne
 * importované: e-mailový klient nemá CSS proměnné ani stylopis projektu.
 */
export const S = Object.freeze({
    bg: "#08080a",
    panel: "#101011",
    raised: "#1a1a1d",
    line: "#2a2a2d",
    ink: "#f4f2ef",
    ink2: "#c6c3bd",
    ink3: "#918d87",
    accent: "#d8a657",
    onAccent: "#171104",
})

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

export const caps = (size = 11, spacing = "0.14em") => ({
    fontSize: `${size}px`,
    letterSpacing: spacing,
    textTransform: "uppercase",
})

export function StudioButton({ href, children }) {
    return (
        <Link
            href={href}
            style={{
                display: "inline-block",
                padding: "11px 20px",
                fontSize: "14px",
                fontWeight: 500,
                color: S.onAccent,
                textDecoration: "none",
                backgroundColor: S.accent,
                borderRadius: "3px",
            }}
        >
            {children}
        </Link>
    )
}

export function StudioRow({ label, value, last = false }) {
    if (value === null || value === undefined || value === "") return null
    return (
        <tr>
            <td style={{ padding: "13px 16px", borderBottom: last ? "none" : `1px solid ${S.line}` }}>
                <Text style={{ margin: 0, ...caps(10, "0.12em"), color: S.ink3 }}>{label}</Text>
                <Text style={{ margin: "4px 0 0", fontSize: "15px", lineHeight: "22px", color: S.ink }}>{value}</Text>
            </td>
        </tr>
    )
}

export function StudioTable({ children }) {
    return (
        <table width="100%" cellPadding="0" cellSpacing="0"
            style={{ backgroundColor: S.raised, border: `1px solid ${S.line}`, borderRadius: "3px" }}>
            <tbody>{children}</tbody>
        </table>
    )
}

export function StudioText({ children, muted = false, style = {} }) {
    return (
        <Text style={{ margin: "12px 0 0", fontSize: "15px", lineHeight: "24px", color: muted ? S.ink3 : S.ink2, ...style }}>
            {children}
        </Text>
    )
}

export default function StudioShell({ preview, eyebrow, title, children, footNote, siteUrl = "https://www.prochazkagroup.cz" }) {
    return (
        <Html lang="cs">
            <Head />
            {preview ? <Preview>{preview}</Preview> : null}
            <Body style={{ margin: 0, padding: "32px 12px", backgroundColor: S.bg, fontFamily: FONT }}>
                <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: S.panel, border: `1px solid ${S.line}`, borderRadius: "3px" }}>
                    <Section style={{ padding: "28px 32px 0" }}>
                        <Text style={{ margin: 0, ...caps(11), color: S.ink3 }}>Procházka Group — interní nástroj</Text>
                        {eyebrow ? (
                            <Text style={{ margin: "14px 0 0", ...caps(10, "0.12em"), color: S.accent }}>{eyebrow}</Text>
                        ) : null}
                        <Heading as="h1" style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 500, color: S.ink }}>
                            {title}
                        </Heading>
                    </Section>

                    <Section style={{ padding: "18px 32px 0" }}>{children}</Section>

                    <Section style={{ padding: "22px 32px 28px" }}>
                        <Hr style={{ margin: "0 0 16px", borderColor: S.line }} />
                        {footNote ? (
                            <Text style={{ margin: "0 0 10px", fontSize: "13px", lineHeight: "20px", color: S.ink3 }}>{footNote}</Text>
                        ) : null}
                        <Text style={{ margin: 0, ...caps(10, "0.12em"), color: S.ink3 }}>
                            <Link href={`${siteUrl}/studio`} style={{ color: S.ink3, textDecoration: "none" }}>Studio</Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
