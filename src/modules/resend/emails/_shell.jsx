import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components"

import { BRAND, FONT, HEADER_IMAGE, SITE, caps } from "./_brand.js"

/**
 * Obálka, ve které chodí e-maily webu.
 *
 * ---------------------------------------------------------------------------
 * Proč hlavička je obrázek
 *
 * Web stojí na WebGL ploše, která se v e-mailu vykreslit nedá — v e-mailu není
 * skript ani plátno. Tenhle pruh je její snímek (`public/assets/email/
 * hlavicka.jpg`, 1200×400, 4 kB, protože je to plynulý přechod). Je vsazený
 * jako pozadí buňky A ZÁROVEŇ má buňka svou barvu: klient, který obrázky
 * nestáhne — a Outlook je ve výchozím nastavení nestahuje — uvidí tmavou
 * plochu, ne bílou díru s křížkem.
 *
 * ---------------------------------------------------------------------------
 * Proč tabulky a ne divy
 *
 * Ne z nostalgie. Outlook na Windows sází e-maily jádrem Wordu, které nezná
 * flex ani grid a zachází s `div` po svém; tabulka je jediná konstrukce, kterou
 * všichni klienti kreslí stejně. Stejný důvod, proč jsou styly v atributech a
 * ne ve třídách: Gmail zahazuje `<style>` v `<head>` u přeposlané zprávy.
 */

const OUTER = { margin: 0, padding: '28px 12px', backgroundColor: BRAND.bg, fontFamily: FONT }

const PANEL = {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: BRAND.panel,
    border: `1px solid ${BRAND.line}`,
}

/**
 * Tlačítko v jazyce webu: verzálky, prostrkání, tenký rám.
 *
 * Rohové značky, které nese `CornerButton` na stránce, tu nejsou — jsou to čtyři
 * absolutně umístěné prvky a absolutní pozicování je přesně to, co Outlook
 * kreslí každý po svém. Zůstává, co ten tvar dělá poznatelným: verzálky,
 * prostrkání 0.1em a tenká linka.
 */
export function BrandButton({ href, children, tone = 'accent' }) {
    const filled = tone === 'accent'
    return (
        <Link
            href={href}
            style={{
                display: 'inline-block',
                padding: '13px 26px',
                ...caps(13, '0.1em'),
                fontWeight: 400,
                textDecoration: 'none',
                color: filled ? BRAND.onAccent : BRAND.ink,
                backgroundColor: filled ? BRAND.accent : 'transparent',
                border: `1px solid ${filled ? BRAND.accent : BRAND.lineStrong}`,
            }}
        >
            {children}
        </Link>
    )
}

/** Řádek údaje — popiska verzálkami, hodnota pod ní. */
export function DataRow({ label, value, last = false }) {
    if (value === null || value === undefined || value === '') return null
    return (
        <tr>
            <td style={{ padding: '13px 16px', borderBottom: last ? 'none' : `1px solid ${BRAND.line}` }}>
                <Text style={{ margin: 0, ...caps(10, '0.12em'), color: BRAND.ink3 }}>{label}</Text>
                <Text style={{ margin: '4px 0 0', fontSize: '15px', lineHeight: '22px', color: BRAND.ink }}>
                    {value}
                </Text>
            </td>
        </tr>
    )
}

/** Rámeček kolem skupiny řádků. */
export function DataTable({ children }) {
    return (
        <table
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            style={{ backgroundColor: BRAND.raised, border: `1px solid ${BRAND.line}` }}
        >
            <tbody>{children}</tbody>
        </table>
    )
}

export function BrandText({ children, muted = false, style = {} }) {
    return (
        <Text
            style={{
                margin: '12px 0 0',
                fontSize: '15px',
                lineHeight: '24px',
                color: muted ? BRAND.ink3 : BRAND.ink2,
                ...style,
            }}
        >
            {children}
        </Text>
    )
}

export default function EmailShell({ preview, eyebrow, title, children, footNote }) {
    return (
        <Html lang="cs">
            <Head>
                {/* Klient si ho stáhne, nebo ne — proto rodina v FONT vždycky
                    končí systémovým bezpatkovým. */}
                <link rel="stylesheet" href={`${SITE}/Fonts/switzer/css/switzer.css`} />
            </Head>
            {preview ? <Preview>{preview}</Preview> : null}
            <Body style={OUTER}>
                <Container style={PANEL}>
                    <table width="100%" cellPadding="0" cellSpacing="0">
                        <tbody>
                            <tr>
                                <td
                                    background={HEADER_IMAGE}
                                    style={{
                                        backgroundColor: BRAND.bg,
                                        backgroundImage: `url(${HEADER_IMAGE})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        padding: '34px 32px 30px',
                                    }}
                                >
                                    <Text style={{ margin: 0, ...caps(11), color: BRAND.ink3 }}>
                                        Procházka Group
                                    </Text>
                                    {eyebrow ? (
                                        <Text style={{ margin: '14px 0 0', ...caps(10, '0.12em'), color: BRAND.accent }}>
                                            {eyebrow}
                                        </Text>
                                    ) : null}
                                    <Heading
                                        as="h1"
                                        style={{
                                            margin: '8px 0 0',
                                            fontSize: '25px',
                                            fontWeight: 300,
                                            letterSpacing: '0.5px',
                                            lineHeight: '32px',
                                            color: BRAND.ink,
                                        }}
                                    >
                                        {title}
                                    </Heading>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <Section style={{ padding: '24px 32px 4px' }}>{children}</Section>

                    <Section style={{ padding: '22px 32px 28px' }}>
                        <Hr style={{ margin: '0 0 16px', borderColor: BRAND.line }} />
                        {footNote ? (
                            <Text style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: '20px', color: BRAND.ink3 }}>
                                {footNote}
                            </Text>
                        ) : null}
                        <Text style={{ margin: 0, ...caps(10, '0.12em'), color: BRAND.ink3 }}>
                            <Link href={SITE} style={{ color: BRAND.ink3, textDecoration: 'none' }}>
                                prochazkagroup.cz
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
