import Footer from "@/components/common/footer";
import Preloader from "@/components/common/PreLoader";
import QNA from "@/components/common/qna";
import IntroStatbar from "@/components/pages/index/introStatbar";
import MainIntro from "@/components/pages/index/main";
import MainPageSection from "@/components/pages/index/MainSection";
import Contact from "@/components/pages/index/MainSection/Contact";
import IntroSMain from "@/components/pages/index/MainSection/IntroS";
import Testimonials from "@/components/pages/index/Testimonials";
import { StatbarData } from "@/constants/mainpage";
import Head from "next/head";

//WIP: Every index has to be a logo, not a greek letters

export default function Home() {
  return (
    <>
      <Head>
        <title>Procházka Group | Finanční Poradenství | OVB Allfinanz</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Procházka Group poskytuje profesionální finanční poradenství, řešení pojištění a investic. Součást OVB Allfinanz. Komplexní finanční služby pro jednotlivce i firmy v Písku a okolí." />
        <meta name="keywords" content="finanční poradenství, investice, pojištění, Procházka Group, finance, wealth management, OVB Allfinanz, Písek, finanční konzultace" />
        <meta name="author" content="Procházka Group" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://prochazkagroup.cz" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://prochazkagroup.cz" />
        <meta property="og:title" content="Procházka Group | Finanční Poradenství | OVB Allfinanz" />
        <meta property="og:description" content="Profesionální finanční poradenství, řešení pojištění a investic. Součást OVB Allfinanz s kanceláří v Písku." />
        <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/mainpage.webp" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://prochazkagroup.cz" />
        <meta property="twitter:title" content="Procházka Group | Finanční Poradenství | OVB Allfinanz" />
        <meta property="twitter:description" content="Profesionální finanční poradenství, řešení pojištění a investic. Součást OVB Allfinanz s kanceláří v Písku." />
        <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/mainpage.webp" />

        {/* Schema.org markup */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FinancialService",
            "name": "Procházka Group",
            "description": "Profesionální finanční poradenství, řešení pojištění a investic pro jednotlivce i firmy.",
            "url": "https://prochazkagroup.cz",
            "logo": "https://prochazkagroup.cz/favicon.ico",
            "image": "https://prochazkagroup.cz/assets/seo/mainpage.webp",
            "telephone": "+420 705 500 200",
            "email": "asistentka.prochazka@ovbone.cz",
            "foundingDate": "2013",
            "parentOrganization": {
              "@type": "Organization",
              "name": "OVB Allfinanz",
              "foundingDate": "1993",
              "url": "https://www.ovb.cz"
            },
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Smetanova 78/1",
              "addressLocality": "Písek",
              "postalCode": "397 01",
              "addressCountry": "CZ"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "49.3087",
              "longitude": "14.1475"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+420 705 500 200",
              "email": "asistentka.prochazka@ovbone.cz",
              "contactType": "customer service",
              "availableLanguage": ["Czech"],
              "areaServed": "CZ"
            },
            "employee": {
              "@type": "Person",
              "name": "Václav Procházka",
              "jobTitle": "Vedoucí kanceláře"
            },
            "sameAs": [
              "https://www.facebook.com/prochazkagroup",
              "https://www.instagram.com/prochazkagroup",
              "https://www.linkedin.com/company/prochazkagroup"
            ],
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "opens": "09:00",
                "closes": "17:00"
              }
            ],
            // WIP: adjust all of the SEO's with the correct data
            "areaServed": {
              "@type": "City",
              "name": "Písek"
            },
            "priceRange": "$"
          })}
        </script>
      </Head>
      <main lang="cs" key="index">
        <MainIntro />
        <IntroStatbar data={StatbarData} />
        <IntroSMain />
        <Testimonials />
        <Contact text={'VYBERTE SI KDO VÁM JE NEJVÍCE SYMPATICKÝ A UDĚLEJTE KROK V PŘED HNED.  PROTOŽE PRVNÍ KROK ZA VÁS NIKDO NEUDĚLÁ.'} />
        <QNA />
      </main>
    </>
  )
}