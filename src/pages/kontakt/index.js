import Seo from "@/components/common/Seo"
import ContactLanding from "@/components/pages/contact/ContactLanding"

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Kontakt | Procházka Group"
        description="Napište nám nebo zavolejte – ozveme se obvykle do jednoho pracovního dne. Kancelář Procházka Group najdete na Smetanově 78/1 v Písku."
        path="/kontakt"
        keywords="kontakt Procházka Group, finanční poradce kontakt, pobočka Písek, konzultace, finanční poradenství, OVB Allfinanz"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Procházka Group - Kontakt",
          "description": "Kontaktní stránka pro finanční poradenství",
          "url": "https://www.prochazkagroup.cz/kontakt",
          "mainEntity": {
            "@type": "Organization",
            "name": "Procházka Group",
            "url": "https://www.prochazkagroup.cz",
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
        }}
      />
      <main lang="cs" key="contact-page">
        <ContactLanding />
      </main>
    </>
  )
}


/**
 * Patička, kontaktní list a texty panelu menu.
 *
 * Tahle routa nemá obsah z CMS, ale lišta nad ní ho má — `_app` ji vykresluje
 * pod každou routou a props si sám načíst neumí. Bez tohohle by menu právě tady
 * ukazovalo texty zadrátované v kódu, zatímco všude jinde ty upravené, a lišilo
 * by se to jen na dvou adresách z jedenácti. To je přesně ten druh rozdílu, co
 * se najde až u zákazníka.
 *
 * `footerStaticProps` je na to napsaný — viz lib/site/footer.js.
 */
export { footerStaticProps as getStaticProps } from "@/lib/site"
