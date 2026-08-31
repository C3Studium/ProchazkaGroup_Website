import Head from "next/head"

import { getAssistant, getContactContent, getFooterContent, getPageContent, readerFor, viewOf } from "@/cms/server/site"

import CookiesContent from "@/components/pages/cookies/CookiesPage"

// ISR, on the same terms as /o-nas and the homepage: a legal notice an editor
// changes a few times a year, and `revalidate` is what lets a publish reach the
// public site without a deploy.
const REVALIDATE_SECONDS = 600

/**
 * This page's own reader, in place of the shared `footerStaticProps` it used
 * while it had no copy of its own.
 *
 * `viewOf(context)` reads Next's signed preview cookie and answers with one of
 * three things — the published site, the draft, or the site as it stood at a
 * chosen moment. A visitor carries no cookie and therefore gets the statically
 * generated page, the published bodies and no document id in its props; the
 * moment cannot arrive any other way, because there is no query parameter to
 * type. Same arrangement as /o-nas, and the note there explains why this route
 * is framed at its own URL rather than at a mirror.
 *
 * Cannot reject: every read inside answers with empty rather than throwing, so
 * an absent table or an unreachable database yields the page the component
 * ships with rather than a build failure. See @/cms/server/site/read.
 */
export async function getStaticProps(context) {
    const view = viewOf(context)

    const [content, footer, contact, assistant] = await Promise.all([
        getPageContent("/cookies", view),
        getFooterContent(view),
        getContactContent(view),
        // The same read the rest of this page uses. Read published even for an
        // editor, she would arrive with no document id and the contact sheet
        // would have nothing on it to click.
        getAssistant({ read: readerFor(view) }),
    ])

    return {
        props: { content, footer, contact, assistant },
        revalidate: REVALIDATE_SECONDS,
    }
}

export default function CookiesPage({ content }) {
    return (
        <>
            <Head>
                <title>Zásady používání cookies | Procházka Group</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Informace o používání cookies na webu Procházka Group. Zjistěte, jak používáme cookies pro zlepšení vašeho zážitku z prohlížení." />
                <meta name="keywords" content="cookies, zásady cookies, ochrana soukromí, GDPR, Procházka Group cookies, OVB Allfinanz" />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://prochazkagroup.cz/cookies" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://prochazkagroup.cz/cookies" />
                <meta property="og:title" content="Zásady používání cookies | Procházka Group" />
                <meta property="og:description" content="Informace o používání cookies a ochraně soukromí na webu Procházka Group, součást OVB Allfinanz." />
                <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/cookies.webp" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://prochazkagroup.cz/cookies" />
                <meta property="twitter:title" content="Zásady cookies | Procházka Group" />
                <meta property="twitter:description" content="Informace o cookies a ochraně soukromí. Součást OVB Allfinanz." />
                <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/cookies.webp" />

                {/* Schema.org markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        "name": "Zásady používání cookies",
                        "description": "Informace o používání cookies na webu Procházka Group",
                        "url": "https://prochazkagroup.cz/cookies",
                        "publisher": {
                            "@type": "Organization",
                            "name": "Procházka Group",
                            "url": "https://prochazkagroup.cz",
                            "parentOrganization": {
                                "@type": "Organization",
                                "name": "OVB Allfinanz",
                                "foundingDate": "1993"
                            },
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": "Smetanova 78/1",
                                "addressLocality": "Písek",
                                "postalCode": "397 01",
                                "addressCountry": "CZ"
                            },
                            "employee": {
                                "@type": "Person",
                                "name": "Václav Procházka",
                                "jobTitle": "Vedoucí kanceláře"
                            },
                            "contactPoint": {
                                "@type": "ContactPoint",
                                "telephone": "+420 705 500 200",
                                "email": "asistentka.prochazka@ovbone.cz",
                                "contactType": "customer service"
                            }
                        },
                        "inLanguage": "cs-CZ",
                        "isPartOf": {
                            "@type": "WebSite",
                            "name": "Procházka Group",
                            "url": "https://prochazkagroup.cz"
                        }
                    })}
                </script>
            </Head>
            <main lang="cs">
                {/* `content` carries a `docId` per block only when this page is
                    being rendered for the Studio's editing frame — see
                    `f.docId()` in @/cms/site/fields. On the public page it is
                    absent and every annotation helper answers with nothing. */}
                <CookiesContent content={content} />
            </main>
        </>
    )
}