// import Footer from "@/components/common/footer";
// import Navbar from "@/components/common/navbar";
// import Cursor from "@/components/common/navbar/cursor";
// import ReviewsList from "@/components/modems/Rezence";
// import ReviewsIntro from "@/components/pages/reviews/reviews";
import Head from "next/head";

export default function ReviewsPage() {
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
                {/* <ReviewsIntro /> */}
                {/* <ReviewsList /> */}
                {/* <Footer /> */}
            </main>
        </>
    )
}