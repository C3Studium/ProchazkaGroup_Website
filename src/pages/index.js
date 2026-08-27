// import Footer from "@/components/common/footer";
// import Preloader from "@/components/common/PreLoader";
// import QNA from "@/components/common/qna";
// import IntroStatbar from "@/components/pages/index/introStatbar";
import MainIntro from "@/components/pages/index/main";
import WhoWeAre from "@/components/pages/index/WhoWeAre";
import HorizontalScroll from "@/components/pages/index/HorizontalScroll";
import Offers from "@/components/pages/index/Offers";
import ReviewsPreview from "@/components/pages/index/ReviewsPreview";
import ChooseAdvisor from "@/components/pages/index/ChooseAdvisor";
import QnaContact from "@/components/pages/index/QnaContact";
// import MainPageSection from "@/components/pages/index/MainSection";
// import Contact from "@/components/pages/index/MainSection/Contact";
// import IntroSMain from "@/components/pages/index/MainSection/IntroS";
// import Testimonials from "@/components/pages/index/Testimonials";
// import { StatbarData } from "@/constants/mainpage";
import Head from "next/head";
import { useRef } from "react";
import { getAssistant, getFooterContent, getHomepageContent } from "@/cms/server/site";

//WIP: Every index has to be a logo, not a greek letters

// ISR rather than SSR, and the reason is what this page is.
//
// Every section below is a scroll-driven animation over copy that an editor
// changes a few times a year. getServerSideProps would put a database round
// trip in front of the first byte of every visit — on a page whose whole
// character is that it starts instantly — to re-fetch text that did not change
// between those visits. So the page is built once and served from the edge as
// static HTML, and `revalidate` lets a publish reach the public site without a
// deploy: the first request after the window regenerates it in the background
// while still serving the cached copy, so no visitor ever waits for the CMS.
//
// Ten minutes is the trade being made: an editor's change is live within ten
// minutes, and the database is asked about the homepage at most six times an
// hour no matter how much traffic it takes.
const REVALIDATE_SECONDS = 600;

export async function getStaticProps() {
  // Cannot reject — every read inside answers with empty rather than throwing,
  // so a missing table or an unreachable database yields a page identical to
  // the one that shipped rather than a build failure. See src/cms/server/site.
  // Both with no arguments, and that is the guarantee this page keeps: neither
  // reader can reach a draft from here no matter what the preview does. The
  // editable copy of this page is served to the Studio by
  // /studio/preview/home, which is the only caller allowed to pass `draft`.
  const [content, footer, assistant] = await Promise.all([
    getHomepageContent(),
    getFooterContent(),
        getAssistant(),
  ]);

  return {
    // `footer` is read by _app, not by this page — the patička is rendered
    // under every route and belongs to none. See @/cms/server/site/footer.
    props: { content, footer, assistant },
    revalidate: REVALIDATE_SECONDS,
  };
}

export default function Home({ content }) {
  // Non-sticky wrapper around hero + WhoWeAre: gives the pinned hero its
  // scroll travel and serves as the progress target for its parallax.
  const heroStackRef = useRef(null);

  // The page never decides what to render on missing content — each section
  // owns its own fallback, because each one knows what "nothing" should look
  // like for it. All this does is stop an absent `content` from being a
  // property access on undefined.
  const {
    hero = {},
    horizontal = {},
    offers = {},
    whoWeAre = {},
    reviews = [],
    reviewsCopy = {},
    consultants = [],
    advisorsCopy = {},
    advisorFormCopy = {},
    qna = {},
  } = content || {};

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
        <div className="HeroStack" ref={heroStackRef}>
          <MainIntro scrollTarget={heroStackRef} copy={hero} />
          {/* `docId` is the siteCopy block each section's copy came from, and it
              is present only when this page is being rendered inside the Studio
              preview — see editableDoc() in @/cms/server/site/homepage. It is
              what lets a section mark its own text and photo as editable; on the
              public homepage it is undefined and the annotation helper answers
              with nothing.

              Every section below takes one now, and most take a `copy` object
              that carries it alongside the words. The shape of each is the
              seam's, not this page's: what this file does is hand each section
              its own block and nothing else. */}
          <WhoWeAre
            scrollTarget={heroStackRef}
            text={whoWeAre.text}
            photo={whoWeAre.photo}
            docId={whoWeAre.docId}
          />
        </div>
        <HorizontalScroll copy={horizontal} />
        <Offers
          partnerLogos={offers.partnerLogos}
          copyLines={offers.copyLines}
          photo={offers.photo}
          title={offers.title}
          docId={offers.docId}
          copyMark={offers.copyMark}
        />
        <ReviewsPreview reviews={reviews} copy={reviewsCopy} />
        <ChooseAdvisor
          consultants={consultants}
          copy={advisorsCopy}
          formCopy={advisorFormCopy}
        />
        <QnaContact copy={qna} />
        {/* <IntroStatbar data={StatbarData} /> */}
        {/* <IntroSMain /> */}
        {/* <Testimonials /> */}
        {/* <Contact text={'VYBERTE SI KDO VÁM JE NEJVÍCE SYMPATICKÝ A UDĚLEJTE KROK V PŘED HNED.  PROTOŽE PRVNÍ KROK ZA VÁS NIKDO NEUDĚLÁ.'} /> */}
        {/* <QNA /> */}
      </main>
    </>
  )
}