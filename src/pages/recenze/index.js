import Head from "next/head";

import ReviewsHero from "@/components/pages/reviews/ReviewsHero";
import ReviewWall from "@/components/pages/reviews/ReviewWall";
import { getApprovedReviews, getConsultants, getAssistant, getContactContent, getFooterContent, readEditable, readPublished } from "@/cms/server/site"

// ISR on the same terms as the other pages: reviews are approved by an editor a
// few times a month, and `revalidate` is what lets an approval reach the public
// site without a deploy.
const REVALIDATE_SECONDS = 600

export async function getStaticProps(context) {
    // This page read `getFooterContent()` with no arguments, which is the public
    // reading whoever is asking: inside the Studio's editing frame the patička
    // therefore carried no document id and none of its four annotated lines
    // existed. Measured — 0 annotated elements on /recenze against 4 on /kontakt
    // and /nabidky, which take the shared `footerStaticProps` and get the switch
    // for free. `draft` is true exactly when the request carries the bypass
    // cookie /api/studio/edit sets for a signed-in editor.
    const draft = Boolean(context?.draftMode)
    const read = draft ? readEditable : readPublished

    // Cannot reject — every read inside answers with empty rather than throwing,
    // so an unreachable database yields the page with an empty wall rather than
    // a build failure. See @/cms/server/site.
    const [reviews, consultants, footer, contact, assistant] = await Promise.all([
        getApprovedReviews({ limit: 200 }),
        getConsultants({ kind: 'consultant' }),
        getFooterContent({ draft }),
        getContactContent({ draft }),
        getAssistant({ read }),
    ])

    return {
        props: {
            // An id per review, because the wall places each card by attribute
            // and the store's rows do not carry one the client can see.
            reviews: reviews.map((review, index) => ({ id: `r${index}`, ...review })),
            consultants: consultants.map((c) => c.name).filter(Boolean),
            footer,
            contact,
            assistant,
        },
        revalidate: REVALIDATE_SECONDS,
    }
}

export default function ReviewsPage({ reviews = [], consultants = [] }) {
    return (
        <>
            <Head>
                <title>Recenze a Hodnocení | Procházka Group</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Přečtěte si recenze a hodnocení klientů Procházka Group. Zjistěte, jak pomáháme klientům dosáhnout jejich finančních cílů prostřednictvím profesionálního poradenství." />
                <meta name="keywords" content="recenze Procházka Group, hodnocení finančního poradenství, zkušenosti klientů, finanční poradci reference, OVB Allfinanz" />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://prochazkagroup.cz/recenze" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://prochazkagroup.cz/recenze" />
                <meta property="og:title" content="Recenze a Hodnocení | Procházka Group" />
                <meta property="og:description" content="Hodnocení a zkušenosti klientů s finančním poradenstvím Procházka Group, součást OVB Allfinanz." />
                <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/reviews.webp" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://prochazkagroup.cz/recenze" />
                <meta property="twitter:title" content="Recenze a Hodnocení | Procházka Group" />
                <meta property="twitter:description" content="Hodnocení a zkušenosti klientů s finančním poradenstvím Procházka Group, součást OVB Allfinanz." />
                <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/reviews.webp" />

                {/* Schema.org markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "LocalBusiness",
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
                        },
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.8",
                            "reviewCount": "150"
                        },
                        "review": {
                            "@type": "Review",
                            "reviewRating": {
                                "@type": "Rating",
                                "ratingValue": "5"
                            },
                            "author": {
                                "@type": "Person",
                                "name": "Spokojení klienti"
                            }
                        }
                    })}
                </script>
            </Head>
            <main lang="cs" key="reviews-page">
                <ReviewsHero count={reviews.length} />
                <ReviewWall reviews={reviews} consultants={consultants} />
            </main>
        </>
    )
}