// Deset komponent, ze kterých jsou e-maily téhle knihovny postavené.
//
// Byl to `@react-email/components`. Ten je od autorů **zastaralý** — ne
// rozbitý, ale bez podpory a bez nástupce: nejnovější vydaná verze je zároveň
// ta odepsaná. Nechat v balíčku závislost, kterou nikdo neopraví, znamená jen
// čekat, až se rozejde s Reactem.
//
// Vyhodit ji se ukázalo jako malá práce, protože ty komponenty nedělají nic
// chytrého. Jsou to obaly, které vracejí značky, jaké e-mailoví klienti umí:
// tabulky místo flexboxu, inline styly místo tříd, `<td>` jako box. Celá ta
// znalost je v deseti komponentách níž a nikde jinde.
//
// Značky odpovídají tomu, co `@react-email/components` opravdu vydával —
// včetně věcí, které vypadají jako přebytek a nejsou (obalová tabulka v
// `Body`, rozepsané okraje v `Text`, výplň v `Preview`). Ověřeno tím, že
// vyrenderované e-maily jsou před i po znak po znaku stejné.
//
// `@react-email/render` zůstává: ten zastaralý není a dělá něco jiného —
// z Reactu udělá řetězec a přilepí doctype.
//
// Předaný `style` přebíjí výchozí, ne naopak. Šablony se na to spoléhají.

/* --------------------------------------------------------------- kostra -- */

export function Html({ children, lang = "en", dir = "ltr", ...props }) {
    return (
        <html {...props} dir={dir} lang={lang}>
            {children}
        </html>
    )
}

export function Head({ children, ...props }) {
    return (
        <head {...props}>
            <meta content="text/html; charset=UTF-8" httpEquiv="Content-Type" />
            {/* Bez tohohle si iOS Mail text přeskládá sám a rozbije tabulky. */}
            <meta name="x-apple-disable-message-reformatting" />
            {children}
        </head>
    )
}

/**
 * Pozadí se maluje dvakrát, a to schválně.
 *
 * Gmail a Outlook.com `<body>` zahodí a jeho styl s ním; zůstane obsah v
 * jejich vlastním `<div>`. Proto barvu dostane i tabulka na celou šířku uvnitř
 * — ta přežije. Na `<body>` zbyde jen pozadí, celý zbytek stylu jde do `<td>`.
 */
export function Body({ children, style, ...props }) {
    return (
        <body {...props} style={{ background: style?.background, backgroundColor: style?.backgroundColor }}>
            <table border={0} width="100%" cellPadding="0" cellSpacing="0" role="presentation" align="center">
                <tbody>
                    <tr>
                        <td style={style}>{children}</td>
                    </tr>
                </tbody>
            </table>
        </body>
    )
}

const PREVIEW_MAX_LENGTH = 150

// Nedělitelná mezera a šest neviditelných znaků. Viditelného nic, délku ano.
const WHITE_SPACE_CODES = "\u00a0\u200c\u200b\u200d\u200e\u200f\ufeff"

/**
 * Text, který klient ukáže v seznamu zpráv vedle předmětu.
 *
 * Za textem je výplň z neviditelných znaků. Bez ní klient dobere náhled prvním
 * viditelným textem z těla, tedy obvykle "Zobrazit v prohlížeči". Sto padesát
 * znaků je délka, po které už žádný klient nedobírá.
 */
export function Preview({ children = "", ...props }) {
    const text = (Array.isArray(children) ? children.join("") : String(children)).substring(0, PREVIEW_MAX_LENGTH)
    return (
        <div
            style={{
                display: "none",
                overflow: "hidden",
                lineHeight: "1px",
                opacity: 0,
                maxHeight: 0,
                maxWidth: 0,
            }}
            data-skip-in-text={true}
            {...props}
        >
            {text}
            {text.length < PREVIEW_MAX_LENGTH ? <div>{WHITE_SPACE_CODES.repeat(PREVIEW_MAX_LENGTH - text.length)}</div> : null}
        </div>
    )
}

/* ----------------------------------------------------------------- bloky -- */

/** Tabulka jako box: `<div>` s `max-width` starší Outlook ignoruje. */
export function Container({ children, style, ...props }) {
    return (
        <table
            align="center"
            width="100%"
            {...props}
            border={0}
            cellPadding="0"
            cellSpacing="0"
            role="presentation"
            style={{ maxWidth: "37.5em", ...style }}
        >
            <tbody>
                <tr style={{ width: "100%" }}>
                    <td>{children}</td>
                </tr>
            </tbody>
        </table>
    )
}

export function Section({ children, style, ...props }) {
    return (
        <table
            align="center"
            width="100%"
            border={0}
            cellPadding="0"
            cellSpacing="0"
            role="presentation"
            {...props}
            style={style}
        >
            <tbody>
                <tr>
                    <td>{children}</td>
                </tr>
            </tbody>
        </table>
    )
}

export function Hr({ style, ...props }) {
    return <hr {...props} style={{ width: "100%", border: "none", borderTop: "1px solid #eaeaea", ...style }} />
}

/* ------------------------------------------------------------------ text -- */

export function Heading({ as: Tag = "h1", children, style, ...props }) {
    return (
        <Tag {...props} style={style}>
            {children}
        </Tag>
    )
}

/**
 * Zkratku `margin` rozepíše na čtyři strany.
 *
 * Outlook na Windows (Word jako renderer) `margin` u odstavce neumí a zahodí
 * ho celý. `margin-top` a spol. umí. Píše se proto obojí: zkratka pro všechny
 * ostatní a longhandy za ní pro Outlook.
 */
function parseMargin(value) {
    if (typeof value === "number") return { marginTop: value, marginBottom: value, marginLeft: value, marginRight: value }
    const v = String(value).trim().split(/\s+/)
    // Jedna hodnota platí pro všechny strany, dvě pro svislé a vodorovné,
    // tři pro horní / vodorovné / dolní, čtyři odshora po směru hodin.
    if (v.length === 1) return { marginTop: v[0], marginBottom: v[0], marginLeft: v[0], marginRight: v[0] }
    if (v.length === 2) return { marginTop: v[0], marginRight: v[1], marginBottom: v[0], marginLeft: v[1] }
    if (v.length === 3) return { marginTop: v[0], marginRight: v[1], marginBottom: v[2], marginLeft: v[1] }
    if (v.length === 4) return { marginTop: v[0], marginRight: v[1], marginBottom: v[2], marginLeft: v[3] }
    return { marginTop: undefined, marginBottom: undefined, marginLeft: undefined, marginRight: undefined }
}

function computeMargins(properties) {
    let result = { marginTop: undefined, marginRight: undefined, marginBottom: undefined, marginLeft: undefined }
    for (const [key, value] of Object.entries(properties)) {
        if (key === "margin") result = parseMargin(value)
        else if (key === "marginTop") result.marginTop = value
        else if (key === "marginRight") result.marginRight = value
        else if (key === "marginBottom") result.marginBottom = value
        else if (key === "marginLeft") result.marginLeft = value
    }
    return result
}

export function Text({ style, ...props }) {
    const defaults = {}
    if (style?.marginTop === undefined) defaults.marginTop = "16px"
    if (style?.marginBottom === undefined) defaults.marginBottom = "16px"
    const margins = computeMargins({ ...defaults, ...style })
    return <p {...props} style={{ fontSize: "14px", lineHeight: "24px", ...style, ...margins }} />
}

export function Link({ target = "_blank", style, ...props }) {
    return <a {...props} style={{ color: "#067df7", textDecorationLine: "none", ...style }} target={target} />
}
