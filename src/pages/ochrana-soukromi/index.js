import Head from "next/head"

import { getAssistant, getContactContent, getFooterContent, getPageContent, readerFor, viewOf } from "@/cms/server/site"

import TermsContent from "@/components/pages/gdpr/TermsPage"

// ISR, on the same terms as the homepage and /o-nas: a legal notice is changed a
// few times a year, and `revalidate` is what lets a publish reach the public
// site without a deploy.
const REVALIDATE_SECONDS = 600

/**
 * The page's own reader, replacing `footerStaticProps` now that this route has
 * copy of its own.
 *
 * `viewOf(context)` reads Next's preview cookie and answers with one of three
 * things — the published site, the draft, or the site as it stood at a chosen
 * moment — on exactly the terms /o-nas sets out. A visitor carries no cookie,
 * gets the statically generated page, the published bodies and no document id in
 * its props; the Studio's editing frame is the only caller that gets anything
 * else. The patička, the contact sheet and the assistant travel because `_app`
 * renders all three and has no data fetching of its own.
 *
 * Cannot reject: every read inside answers with empty rather than throwing, so
 * an empty CMS or an unreachable database yields the page the component ships
 * with rather than a build failure. See src/cms/server/site/read.js.
 */
export async function getStaticProps(context) {
    const view = viewOf(context)

    const [content, footer, contact, assistant] = await Promise.all([
        getPageContent("/ochrana-soukromi", view),
        getFooterContent(view),
        getContactContent(view),
        getAssistant({ read: readerFor(view) }),
    ])

    return {
        props: { content, footer, contact, assistant },
        revalidate: REVALIDATE_SECONDS,
    }
}

export default function PrivacyPolicyPage({ content }) {
    return (
        <>
            <Head>
                <title>Ochrana soukromí | Procházka Group</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Ochrana osobních údajů a zásady zpracování dat společnosti Procházka Group. Zjistěte, jak chráníme vaše soukromí." />
                <meta name="keywords" content="ochrana soukromí, GDPR, zpracování dat, osobní údaje, Procházka Group, OVB Allfinanz" />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://prochazkagroup.cz/ochrana-soukromi" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://prochazkagroup.cz/ochrana-soukromi" />
                <meta property="og:title" content="Ochrana soukromí | Procházka Group" />
                <meta property="og:description" content="Zásady ochrany osobních údajů a zpracování dat. Procházka Group, součást OVB Allfinanz." />
                <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/gdpr.webp" />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://prochazkagroup.cz/ochrana-soukromi" />
                <meta property="twitter:title" content="Ochrana soukromí | Procházka Group" />
                <meta property="twitter:description" content="Zásady ochrany osobních údajů. Součást OVB Allfinanz." />
                <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/gdpr.webp" />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        "name": "Ochrana soukromí",
                        "description": "Zásady ochrany osobních údajů Procházka Group",
                        "url": "https://prochazkagroup.cz/ochrana-soukromi",
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
            <main lang="cs" key="privacy-policy-page">
                {/* The section owns every fallback — it knows what "nothing"
                    should look like for each field — so all this does is stop an
                    absent `content` from being a property access on undefined. */}
                <TermsContent hero={content?.hero} sections={content?.sections} />
            </main>
        </>
    )
}