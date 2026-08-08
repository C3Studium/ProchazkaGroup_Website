import Footer from "@/components/common/footer"

import QNA from "@/components/common/qna"
import AboutInto from "@/components/pages/aboutUs/about"
import ParallaxExpanf from "@/components/pages/aboutUs/parallaxExpand"
import Head from "next/head"

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>Procházka Group | O nás</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Poznejte tým Procházka Group. Jsme tu pro vás již přes dekádu a poskytujeme profesionální finanční poradenství založené na důvěře a expertize." />
        <meta name="keywords" content="Procházka Group tým, finanční poradci, historie společnosti, finanční experti, hodnoty společnosti, OVB Allfinanz" />
        <meta name="author" content="Procházka Group" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://prochazkagroup.cz/o-nas" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://prochazkagroup.cz/o-nas" />
        <meta property="og:title" content="Procházka Group | O nás" />
        <meta property="og:description" content="Poznejte tým profesionálních finančních poradců Procházka Group, součást OVB Allfinanz." />
        <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/about.webp" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://prochazkagroup.cz/o-nas" />
        <meta property="twitter:title" content="Procházka Group | O nás" />
        <meta property="twitter:description" content="Poznejte tým profesionálních finančních poradců Procházka Group, součást OVB Allfinanz." />
        <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/about.webp" />

        {/* Schema.org markup */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "mainEntity": {
              "@type": "Organization",
              "name": "Procházka Group",
              "description": "Profesionální finanční poradenství s více než desetiletou tradicí, součást OVB Allfinanz",
              "url": "https://prochazkagroup.cz",
              "foundingDate": "2013",
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
              "employees": {
                "@type": "Person",
                "name": "Václav Procházka",
                "jobTitle": "Vedoucí kanceláře"
              }
            }
          })}
        </script>
      </Head>
      <main lang="cs" key="about-page">
        <AboutInto />
        <ParallaxExpanf />
        <QNA />
        <Footer />
      </main>
    </>
  )
}