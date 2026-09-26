"use client";
import NotFound404 from "@/components/pages/notFound/404";
import Head from "next/head";

import {
    getAssistant,
    getContactContent,
    getFooterContent,
    getNavbarContent,
    getNotFoundContent,
    getRoster,
    readerFor,
    viewOf,
} from "@/lib/site";


export default function Page404({ content }) {
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
                {/* `content` nese `docId` jen tehdy, když stránku vykresluje
                    editační rám Studia — viz `f.docId()` v @/cms/site/fields.
                    Na veřejné stránce tam není a každá anotace odpoví prázdnem. */}
                <NotFound404 content={content} />
            </main>
        </>
    )
}


// Kratší okno než zbytek webu, a je to důsledek, ne preference: publikace tuhle
// routu nepřegeneruje — `/404` není stránka v `cms.config.js`, protože
// `res.revalidate` na ni vždycky selže (vysvětleno v @/lib/site/notFound.js).
// Jediné, co změnu na web dostane, je tedy vypršení ISR, a tak je krátké.
// Stránka je malá a skoro se nečte, takže častější přegenerování nic nestojí.
const REVALIDATE_SECONDS = 60;

/**
 * Vlastní čtečka místo sdíleného `footerStaticProps` — od chvíle, kdy má tahle
 * stránka vlastní texty.
 *
 * Rozcestník je jediná stránka webu, kterou čte člověk, co se ztratil, a jediná,
 * která dosud neměla z CMS ani slovo. Teď má dva bloky (`404.uvod` a `404.tipy`)
 * a k nim všechno, co `_app` vozí pod každou routou: patičku, kontaktní list,
 * asistentku, podtexty menu a poradce.
 *
 * `viewOf(context)` čte podepsanou náhledovou cookie a odpoví jedním ze tří
 * čtení — publikovaný web, koncept, nebo web k vybranému okamžiku. Návštěvník
 * cookie nenese, takže dostane staticky vygenerovanou stránku bez `docId`.
 *
 * Nemůže selhat: každé čtení uvnitř odpoví prázdnem místo výjimky, takže
 * nedostupná databáze znamená stránku s texty ze zálohy, ne spadlý build.
 */
export async function getStaticProps(context) {
    const view = viewOf(context);

    const [content, footer, contact, navbar, assistant, roster] = await Promise.all([
        getNotFoundContent(view),
        getFooterContent(view),
        getContactContent(view),
        getNavbarContent(view),
        getAssistant({ read: readerFor(view) }),
        getRoster({ read: readerFor(view) }),
    ]);

    return {
        props: { content, footer, contact, navbar, assistant, roster },
        revalidate: REVALIDATE_SECONDS,
    };
}
