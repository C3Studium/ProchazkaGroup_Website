import Head from "next/head"

import { footerStaticProps } from "@/cms/server/site"

// The only content on this route today is the patička, which `_app` renders
// and which therefore has to travel on this page's props. One shared
// implementation rather than a copy per page — see @/cms/server/site/footer.
export const getStaticProps = footerStaticProps
import ClipPathPage from "@/components/pages/offers/ClipPathPage"

export default function PrilezitostiPage() {
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
                    every page, which is what `footerStaticProps` above feeds.
                    The old <Footer /> that used to sit here would be a second
                    one. */}
                <ClipPathPage />
            </main>
        </>
    )
}