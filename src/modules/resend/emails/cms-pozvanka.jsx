import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components"

/**
 * Pozvánka do redakčního systému.
 *
 * ---------------------------------------------------------------------------
 * Proč vypadá jinak než ostatní e-maily projektu
 *
 * Deset šablon vedle téhle mluví ke KLIENTOVI: barvy webu, přechody, emotikony,
 * „kontaktujeme vás do 48 hodin". Tahle mluví k člověku, který má za chvíli
 * otevřít administraci — a ta je tmavá, střídmá a má jedinou akcentní barvu.
 * Když se pozvánka tváří jako marketingový e-mail a přistane v ní odkaz do
 * nástroje, který vypadá úplně jinak, je to o jeden důvod k nedůvěře víc.
 * Takže: paleta Studia, převzatá z jeho vlastních tokenů.
 *
 * ---------------------------------------------------------------------------
 * Proč tu není heslo
 *
 * Heslo poslané e-mailem zůstane ve schránce napořád — v odeslané poště
 * správce, v doručené příjemce, na každém zařízení, kde jsou přihlášení.
 * Pozvánka proto veze jen adresu a jméno; heslo předá správce jinou cestou.
 * Zvolit si vlastní heslo přes odkaz je lepší a je to další krok, ne tenhle.
 */

// Barvy jsou opsané ze src/cms/studio/styles/_tokens.module.scss. Opsané, ne
// importované: e-mailový klient nemá CSS proměnné ani stylopis projektu, takže
// každá hodnota musí být v atributu. Komentář je to jediné, co je drží spolu.
const C = {
    bg: "#08080a",
    panel: "#101011",
    raised: "#1a1a1d",
    line: "#2a2a2d",
    ink: "#f4f2ef",
    ink2: "#c6c3bd",
    ink3: "#918d87",
    accent: "#d8a657",
    onAccent: "#171104",
}

const ROLE_TITLES = { admin: "Správce", owner: "Majitel", member: "Člen" }

// Co ta role smí, řečeno pro člověka, ne pro schéma. Odpovídá src/cms/AUTH.md.
const ROLE_SAYS = {
    admin: "Máte přístup ke všemu — obsahu, uživatelům, nastavení i archivu.",
    owner: "Můžete upravovat obsah webu, schvalovat recenze a měnit zařazení poradců.",
    member: "Můžete upravovat obsah webu a schvalovat recenze, které přijdou od zákazníků.",
}

export const subject = "Přístup do redakčního systému Procházka Group"

export default function CmsInviteEmail({
    name = "",
    email = "",
    role = "member",
    studioUrl = "https://prochazkagroup.cz/studio",
    invitedBy = "",
}) {
    const roleTitle = ROLE_TITLES[role] || role
    const roleSays = ROLE_SAYS[role] || ROLE_SAYS.member
    const greeting = name?.trim() ? `Dobrý den, ${name.trim()},` : "Dobrý den,"

    return (
        <Html lang="cs">
            <Head />
            <Preview>Byl vám založen přístup do redakčního systému Procházka Group.</Preview>
            <Body
                style={{
                    margin: 0,
                    padding: "32px 12px",
                    backgroundColor: C.bg,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                }}
            >
                <Container
                    style={{
                        maxWidth: "560px",
                        margin: "0 auto",
                        backgroundColor: C.panel,
                        border: `1px solid ${C.line}`,
                        borderRadius: "3px",
                    }}
                >
                    <Section style={{ padding: "28px 32px 0" }}>
                        <Text
                            style={{
                                margin: 0,
                                fontSize: "11px",
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: C.ink3,
                            }}
                        >
                            Procházka Group — interní nástroj
                        </Text>
                        <Heading
                            as="h1"
                            style={{ margin: "10px 0 0", fontSize: "22px", fontWeight: 500, color: C.ink }}
                        >
                            Máte přístup do redakčního systému
                        </Heading>
                    </Section>

                    <Section style={{ padding: "20px 32px 0" }}>
                        <Text style={{ margin: 0, fontSize: "15px", lineHeight: "24px", color: C.ink2 }}>
                            {greeting}
                        </Text>
                        <Text style={{ margin: "12px 0 0", fontSize: "15px", lineHeight: "24px", color: C.ink2 }}>
                            {invitedBy?.trim()
                                ? `${invitedBy.trim()} vám založil${name?.trim() ? "" : "a"} účet ve Studiu — nástroji, kterým se spravuje obsah webu.`
                                : "Byl vám založen účet ve Studiu — nástroji, kterým se spravuje obsah webu."}
                        </Text>
                    </Section>

                    <Section style={{ padding: "22px 32px 0" }}>
                        <table
                            width="100%"
                            cellPadding="0"
                            cellSpacing="0"
                            style={{
                                backgroundColor: C.raised,
                                border: `1px solid ${C.line}`,
                                borderRadius: "3px",
                            }}
                        >
                            <tbody>
                                <tr>
                                    <td style={{ padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
                                        <Text style={{ margin: 0, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink3 }}>
                                            Přihlašovací e-mail
                                        </Text>
                                        <Text style={{ margin: "4px 0 0", fontSize: "15px", color: C.ink }}>{email}</Text>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: "14px 16px" }}>
                                        <Text style={{ margin: 0, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink3 }}>
                                            Role
                                        </Text>
                                        <Text style={{ margin: "4px 0 0", fontSize: "15px", color: C.ink }}>{roleTitle}</Text>
                                        <Text style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: "20px", color: C.ink3 }}>
                                            {roleSays}
                                        </Text>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    <Section style={{ padding: "24px 32px 0" }}>
                        <Link
                            href={studioUrl}
                            style={{
                                display: "inline-block",
                                padding: "11px 20px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: C.onAccent,
                                textDecoration: "none",
                                backgroundColor: C.accent,
                                borderRadius: "3px",
                            }}
                        >
                            Otevřít Studio
                        </Link>
                        <Text style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: "20px", color: C.ink3 }}>
                            Nebo zkopírujte adresu: {studioUrl}
                        </Text>
                    </Section>

                    <Section style={{ padding: "22px 32px 0" }}>
                        <Hr style={{ margin: 0, borderColor: C.line }} />
                        <Text style={{ margin: "18px 0 0", fontSize: "13px", lineHeight: "20px", color: C.ink3 }}>
                            <strong style={{ color: C.ink2 }}>Heslo v tomhle e-mailu není.</strong> Předá vám ho
                            správce webu jinou cestou — heslo poslané e-mailem už ve schránce zůstane. Po prvním
                            přihlášení si ho ve Studiu změňte.
                        </Text>
                        <Text style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: "20px", color: C.ink3 }}>
                            Pokud jste o přístup nežádali, tenhle e-mail ignorujte a dejte nám vědět.
                        </Text>
                    </Section>

                    <Section style={{ padding: "24px 32px 28px" }}>
                        <Text style={{ margin: 0, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink3 }}>
                            Procházka Group
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
