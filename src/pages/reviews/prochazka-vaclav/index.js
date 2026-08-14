import Head from "next/head"

import { useFetchDatabase } from "@/hooks/useFetchDatabase"
import { useEffect, useState } from "react"
import {
    FaFacebookF,
    FaInstagram,
    FaEnvelope
} from 'react-icons/fa';
// import ContactIntro from "@/components/pages/personReviews/contact"

export default function PersonFeebackPage1() {

    const { fetchClovek } = useFetchDatabase()

    const [personData, setPersonData] = useState({
        name: 'Václav Procházka',
        moto: 'V životě i v byznysu se snažím vyvarovat dvou zásadních chyb - jednat unáhleně anebo nejednat vůbec.',
        number: '01',
        databaseName: 'Václav Procházka'
    })

    const icons = [
        { name: "mail", src: FaEnvelope, href: "mailto:vaclav.prochazka2@ovbmail.cz" },
        { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/vaclav.prochazka.5?locale=cs_CZ" },
        { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/prochazka_vaclav?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" },
        //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/" }
    ]


    // WIP: Switch the layout to be reversed =photo on the left and bg on the right
    const srcbg = "/assets/backgrounds/mainOffice.webp"
    const srcp = "/assets/portraits/business/11.webp"

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchClovek("Václav Procházka")
                if (data && data.length > 0) {
                    setPersonData(prev => ({
                        ...prev,
                        name: data[0].name,
                        moto: data[0].moto
                    }))
                }
            }
            catch (err) {
                console.log(err)
            }
        }
        loadData();
    }, [fetchClovek])



    return (
        <>
            <Head>
                <title>{`${personData.name} | Vedoucí kanceláře | Procházka Group`}</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content={`${personData.name} - vedoucí kanceláře a hlavní finanční poradce Procházka Group, součást OVB Allfinanz. Expert na investice a finanční plánování.`} />
                <meta name="keywords" content={`${personData.name}, Procházka Group vedoucí, finanční poradce, investiční expert, finanční plánování, OVB Allfinanz`} />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href={`https://prochazkagroup.cz/reviews/prochazka-vaclav`} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="profile" />
                <meta property="og:url" content={`https://prochazkagroup.cz/reviews/prochazka-vaclav`} />
                <meta property="og:title" content={`${personData.name} | Vedoucí kanceláře | Procházka Group`} />
                <meta property="og:description" content={`Vedoucí kanceláře a hlavní finanční poradce ${personData.name} z Procházka Group, součást OVB Allfinanz.`} />
                <meta property="og:image" content={`https://prochazkagroup.cz${srcp}`} />
                <meta property="profile:first_name" content="Václav" />
                <meta property="profile:last_name" content="Procházka" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://prochazkagroup.cz/reviews/prochazka-vaclav`} />
                <meta property="twitter:title" content={`${personData.name} | Vedoucí kanceláře | Procházka Group`} />
                <meta property="twitter:description" content={`Vedoucí kanceláře a hlavní finanční poradce ${personData.name}. Součást OVB Allfinanz.`} />
                <meta property="twitter:image" content={`https://prochazkagroup.cz${srcp}`} />

                {/* Schema.org markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Person",
                        "name": personData.name,
                        "jobTitle": "Vedoucí kanceláře",
                        "worksFor": {
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
                            }
                        },
                        "description": personData.moto,
                        "image": `https://prochazkagroup.cz${srcp}`,
                        "url": `https://prochazkagroup.cz/reviews/prochazka-vaclav`,
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "contactType": "professional",
                            "telephone": "+420 705 500 200",
                            "email": "asistentka.prochazka@ovbmail.cz",
                            "areaServed": "CZ",
                            "availableLanguage": ["Czech"]
                        }
                    })}
                </script>
            </Head>
            <main lang="cs" key="person-page">
                {/* <ContactIntro name={personData.name} moto={personData.moto} number={personData.number} databaseName={personData.databaseName} icons={icons} srcbg={srcbg} srcp={srcp} /> */}
            </main>
        </>
    )
}