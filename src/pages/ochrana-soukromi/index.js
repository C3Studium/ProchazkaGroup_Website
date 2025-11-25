import Head from "next/head"
import Navbar from "@/components/common/navbar"
import Cursor from "@/components/common/navbar/cursor"
import Footer from "@/components/common/footer"
import TermsContent from "@/components/pages/gdpr/TermsPage"

export default function PrivacyPolicyPage() {
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
            <main lang="cs">
                <Navbar />
                <Cursor />
                <TermsContent />
                <Footer />
            </main>
        </>
    )
}