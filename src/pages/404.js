"use client";
import NotFound404 from "@/components/pages/notFound/404";
import Seo from "@/components/common/Seo";

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
            <Seo
                title="Stránka nenalezena (404) | Procházka Group"
                description="Tahle stránka neexistuje nebo se přestěhovala. Pokračujte na hlavní stránku Procházka Group – finanční poradenství v Písku."
                noindex
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "Procházka Group",
                    "url": "https://www.prochazkagroup.cz",
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
                }}
            />
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
