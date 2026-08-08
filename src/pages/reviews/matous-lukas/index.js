import Head from "next/head"

import { useFetchDatabase } from "@/hooks/useFetchDatabase"
import { useEffect, useState } from "react"
import {
    FaEnvelope,
    FaFacebookF,
    FaInstagram,
    FaLinkedinIn,
    FaTwitter,
} from 'react-icons/fa';
import ContactIntro from "@/components/pages/personReviews/contact"


export default function PersonFeebackPage2() {
    const { fetchClovek } = useFetchDatabase()

    const [personData, setPersonData] = useState({
        name: 'Lukáš Matouš',
        moto: 'Nemysli na minulost, žij v přítomnosti a mysli na budoucnost.',
        number: '06',
        databaseName: 'Lukáš Matouš'
    })
    const srcbg = "/assets/backgrounds/secondOffice.webp"
    const srcp = "/assets/portraits/business/18.webp"

    const icons = [
        { name: "mail", src: FaEnvelope, href: "mailto:lukas.matous1@ovbmail.cz" },
        { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/lukas.matous.3?locale=cs_CZ" },
        { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/matous.lukas?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" },
        //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/"}
    ]

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchClovek("Lukáš Matouš")
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
                <title>{`${personData.name} | Finanční Poradce | Procházka Group`}</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content={`${personData.name} - profesionální finanční poradce Procházka Group, součást OVB Allfinanz. Specializace na investice, pojištění a finanční plánování.`} />
                <meta name="keywords" content={`${personData.name}, finanční poradce, Procházka Group, investiční poradenství, finanční plánování, OVB Allfinanz`} />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href={`https://prochazkagroup.cz/reviews/efenberk-ondrej`} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="profile" />
                <meta property="og:url" content={`https://prochazkagroup.cz/reviews/efenberk-ondrej`} />
                <meta property="og:title" content={`${personData.name} | Finanční Poradce | Procházka Group`} />
                <meta property="og:description" content={`Profesionální finanční poradce ${personData.name} z týmu Procházka Group, součást OVB Allfinanz.`} />
                <meta property="og:image" content={`https://prochazkagroup.cz${srcp}`} />
                <meta property="profile:first_name" content="Lukáš" />
                <meta property="profile:last_name" content="Matouš" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://prochazkagroup.cz/reviews/efenberk-ondrej`} />
                <meta property="twitter:title" content={`${personData.name} | Finanční Poradce | Procházka Group`} />
                <meta property="twitter:description" content={`Profesionální finanční poradce ${personData.name} z týmu Procházka Group, součást OVB Allfinanz.`} />
                <meta property="twitter:image" content={`https://prochazkagroup.cz${srcp}`} />

                {/* Schema.org markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Person",
                        "name": personData.name,
                        "jobTitle": "Finanční Poradce",
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
                        "url": `https://prochazkagroup.cz/reviews/efenberk-ondrej`,
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "contactType": "professional",
                            "areaServed": "CZ",
                            "availableLanguage": ["Czech"]
                        },
                        "colleague": {
                            "@type": "Person",
                            "name": "Lukáš Matouš",
                            "jobTitle": "Finanční Poradce",
                            "worksFor": {
                                "@type": "Organization",
                                "name": "Procházka Group",
                                "url": "https://prochazkagroup.cz"
                            }
                        }
                    })}
                </script>
            </Head>
            <main lang="cs" key="person-page">
                <ContactIntro name={personData.name} moto={personData.moto} number={personData.number} databaseName={personData.databaseName} icons={icons} srcbg={srcbg} srcp={srcp} />
            </main>
        </>
    )
}