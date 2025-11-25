import Head from "next/head"
import Footer from "@/components/common/footer"
import Navbar from "@/components/common/navbar"
import Cursor from "@/components/common/navbar/cursor"
import QNA from "@/components/common/qna"
import FeedbackIntro from "@/components/pages/contact/feedBack"

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>Kontakt | Procházka Group</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Kontaktujte Procházka Group pro profesionální finanční poradenství. Najdete nás v Písku. Jsme součástí OVB Allfinanz a jsme tu pro vaše dotazy ohledně investic a pojištění." />
        <meta name="keywords" content="kontakt Procházka Group, finanční poradce kontakt, pobočka Písek, konzultace, finanční poradenství, OVB Allfinanz" />
        <meta name="author" content="Procházka Group" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://prochazkagroup.cz/kontakt" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://prochazkagroup.cz/kontakt" />
        <meta property="og:title" content="Kontakt | Procházka Group" />
        <meta property="og:description" content="Kontaktujte nás pro profesionální finanční poradenství. Procházka Group, součást OVB Allfinanz." />
        <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/kontakt.webp" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://prochazkagroup.cz/kontakt" />
        <meta property="twitter:title" content="Kontakt | Procházka Group" />
        <meta property="twitter:description" content="Kontaktujte nás pro profesionální finanční poradenství. Součást OVB Allfinanz." />
        <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/kontakt.webp" />

        {/* Schema.org markup */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Procházka Group - Kontakt",
            "description": "Kontaktní stránka pro finanční poradenství",
            "url": "https://prochazkagroup.cz/kontakt",
            "mainEntity": {
              "@type": "Organization",
              "name": "Procházka Group",
              "url": "https://prochazkagroup.cz",
              "parentOrganization": {
                "@type": "Organization",
                "name": "OVB Allfinanz",
                "foundingDate": "1993"
              }
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+420 705 500 200",
              "email": "asistentka.prochazka@ovbone.cz",
              "contactType": "customer service",
              "areaServed": "CZ",
              "availableLanguage": ["Czech"]
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
          })}
        </script>
      </Head>
      <main lang="cs">
        <Cursor />
        <Navbar />
        <FeedbackIntro />
        <QNA />
        <Footer />
      </main>
    </>
  )
}