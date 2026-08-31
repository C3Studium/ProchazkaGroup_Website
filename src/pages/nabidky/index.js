import Head from "next/head"

import { getAssistant, getContactContent, getFooterContent, getPageContent, readerFor, viewOf } from "@/cms/server/site"

import ClipPathPage from "@/components/pages/offers/ClipPathPage"

// ISR, on the same terms as /cookies and /o-nas: a partner's discount changes a
// few times a year, and `revalidate` is what lets a publish reach the public
// site without a deploy.
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
 * type. Same arrangement as /cookies.
 *
 * Cannot reject: every read inside answers with empty rather than throwing, so
 * an absent table or an unreachable database yields the page the component
 * ships with rather than a build failure. See @/cms/server/site/read.
 */
export async function getStaticProps(context) {
    const view = viewOf(context)

    const [content, footer, contact, assistant] = await Promise.all([
        getPageContent("/nabidky", view),
        getFooterContent(view),
        getContactContent(view),
        getAssistant({ read: readerFor(view) }),
    ])

    return {
        props: { content, footer, contact, assistant },
        revalidate: REVALIDATE_SECONDS,
    }
}

export default function PrilezitostiPage({ content }) {
    return (
        <>
            <Head>
                <title>Exkluzivní Nabídky a Slevy | Procházka Group</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Objevte exkluzivní nabídky a speciální slevy pouze pro klienty Procházka Group. Výhodné podmínky finančních produktů a služeb na míru." />
                <meta name="keywords" content="exkluzivní nabídky, finanční slevy, VIP podmínky, Procházka Group výhody, speciální nabídky, OVB Allfinanz" />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://prochazkagroup.cz/nabidky" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://prochazkagroup.cz/nabidky" />
                <meta property="og:title" content="Exkluzivní Nabídky a Slevy | Procházka Group" />
                <meta property="og:description" content="Speciální nabídky a VIP podmínky pro klienty Procházka Group, součást OVB Allfinanz." />
                <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/partners.webp" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://prochazkagroup.cz/nabidky" />
                <meta property="twitter:title" content="Exkluzivní Nabídky | Procházka Group" />
                <meta property="twitter:description" content="Speciální nabídky a VIP podmínky pro klienty. Součást OVB Allfinanz." />
                <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/partners.webp" />

                {/* Schema.org markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "OfferCatalog",
                        "name": "Procházka Group - Exkluzivní Nabídky",
                        "description": "Katalog exkluzivních nabídek a slev pro klienty",
                        "url": "https://prochazkagroup.cz/nabidky",
                        "provider": {
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
                            }
                        },
                        "itemListElement": [
                            {
                                "@type": "Offer",
                                "itemOffered": {
                                    "@type": "Service",
                                    "name": "VIP Finanční Poradenství",
                                    "description": "Exkluzivní finanční služby pro členy"
                                }
                            }
                        ]
                    })}
                </script>
            </Head>
            <main lang="cs" key="offers-page">
                {/* The patička is not mounted here: _app renders SiteFooter for
                    every page, which is what the `footer` prop above feeds. The
                    old <Footer /> that used to sit here would be a second one. */}
                {/* The section owns every fallback — it knows what "nothing"
                    should look like for each field — so all this does is stop an
                    absent `content` from being a property access on undefined. */}
                <ClipPathPage section={content?.section} chapters={content?.chapters} />
            </main>
        </>
    )
}