"use client";
import Navbar from "@/components/common/navbar";
import Cursor from "@/components/common/navbar/cursor";
import Intro404 from "@/components/pages/notFound/404";
import Head from "next/head";


export default function Page404() {
    return (
        <>
            <Head>
                <title>404: Stránka nenalezena | Procházka Group</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Omlouváme se, ale požadovaná stránka nebyla nalezena. Navštivte naši hlavní stránku Procházka Group, součást OVB Allfinanz, pro více informací o finančním poradenství." />
                <meta name="robots" content="noindex, nofollow" />
                <link rel="canonical" href="https://prochazkagroup.cz" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content="404: Stránka nenalezena | Procházka Group" />
                <meta property="og:description" content="Omlouváme se, ale požadovaná stránka nebyla nalezena. Procházka Group, součást OVB Allfinanz." />

                {/* Error page specific */}
                <meta name="prerender-status-code" content="404" />

                {/* Simple Schema.org markup for business info */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
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
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "telephone": "+420 705 500 200",
                            "email": "info@prochazkagroup.cz",
                            //WIP: make change here to the email
                            "contactType": "customer service"
                        }
                    })}
                </script>
            </Head>
            <main key="404">
                <Intro404 />
            </main>
        </>
    )
}