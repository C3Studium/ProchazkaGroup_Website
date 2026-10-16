import Seo from "@/components/common/Seo"

import { getAssistant, getContactContent, getNavbarContent, getFooterContent, getPageContent, getRoster, readerFor, viewOf } from "@/lib/site"

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

    const [content, footer, contact, navbar, assistant, roster] = await Promise.all([
        getPageContent("/nabidky", view),
        getFooterContent(view),
        getContactContent(view),
        getNavbarContent(view),
        getAssistant({ read: readerFor(view) }),
        getRoster({ read: readerFor(view) }),
    ])

    return {
        props: { content, footer, contact, navbar, assistant, roster },
        revalidate: REVALIDATE_SECONDS,
    }
}

export default function PrilezitostiPage({ content }) {
    return (
        <>
            <Seo
                title="Partneři a slevy pro klienty | Procházka Group"
                description="Slevy u partnerů jen pro klienty Procházka Group: 50 % na předplatné Pojistné hlášení, 10 % v Eleven Cosmetic a další výhody u lokálních firem."
                path="/nabidky"
                keywords="slevy pro klienty, partneři, Pojistné hlášení, Eleven Cosmetic, re-kvítka, Procházka Group výhody, Písek"
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "OfferCatalog",
                    "name": "Procházka Group – slevy u partnerů pro klienty",
                    "description": "Slevy a výhody u partnerů Procházka Group, určené jen pro naše klienty.",
                    "url": "https://www.prochazkagroup.cz/nabidky",
                    "provider": {
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
                        "employee": {
                            "@type": "Person",
                            "name": "Václav Procházka",
                            "jobTitle": "Vedoucí kanceláře"
                        }
                    },
                    // The deals actually on the page — see @/constants/nabidkypage.
                    // Only the two that are agreed; one still being negotiated
                    // and an empty slot are not offers.
                    "itemListElement": [
                        {
                            "@type": "Offer",
                            "description": "50% sleva na roční předplatné pro klienty Procházka Group",
                            "url": "https://www.pojistnehlaseni.cz/",
                            "itemOffered": {
                                "@type": "Service",
                                "name": "Pojistné hlášení – předplatné",
                                "provider": { "@type": "Organization", "name": "Pojistné hlášení", "url": "https://www.pojistnehlaseni.cz/" }
                            }
                        },
                        {
                            "@type": "Offer",
                            "description": "10% sleva na jakýkoli produkt pro klienty Procházka Group",
                            "url": "https://www.elevencosmetic.cz/",
                            "itemOffered": {
                                "@type": "Service",
                                "name": "Kosmetický salon Eleven Cosmetic",
                                "provider": { "@type": "Organization", "name": "Eleven Cosmetic", "url": "https://www.elevencosmetic.cz/" }
                            }
                        }
                    ]
                }}
            />
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