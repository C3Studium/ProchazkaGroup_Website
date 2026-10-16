import { useEffect, useRef } from "react";
import Script from "next/script";

import { useCookies } from "@/context/CookiesProvider";
import { clearAnalyticsCookies } from "@/helpers/consent";
import { setClarityConsent } from "@/hooks/trackEvent";

// Měřicí skripty — Google Tag Manager, Google Analytics a Microsoft Clarity.
//
// Stávaly v _document.js a načítaly se každému hned po otevření stránky, ještě
// než mohl kdokoli na cokoli kliknout. To zákon o elektronických komunikacích
// (§ 89 odst. 3) ani GDPR nedovolují: analytické cookies jdou až po souhlasu.
// Tady se proto vykreslí teprve tehdy, když CookiesProvider hlásí souhlas
// s kategorií `analytics` — tedy nikdy na serveru a nikdy dřív než po kliknutí
// v liště nebo po načtení dřív uloženého souhlasu.
//
// GTM je pod analytikou, protože dnes nic jiného nenese. Kdyby do kontejneru
// přibyly reklamní značky, patří pod `marketing`.

const GTM_ID = "GTM-KNTLJJ7L";
const GA_ID = "G-N6QVWF64DT";

// Očištěno na znaky, které identifikátor Clarity smí mít. Hodnota se vsazuje
// do textu inline skriptu, a tam by cokoli neočekávaného nebyla překlepnutá
// konfigurace, ale cizí kód spuštěný na každé stránce.
const CLARITY_ID =
    (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "").replace(/[^a-zA-Z0-9]/g, "") || null;

export default function ConsentScripts() {
    const { preferences, hasConsented } = useCookies();
    const allowed = hasConsented && preferences.analytics === true;

    // Odvolání souhlasu. Skript, který už běží, se z paměti stránky vyndat nedá,
    // takže se smažou jeho cookies a stránka se načte znovu — tentokrát bez něj.
    const was = useRef(allowed);
    useEffect(() => {
        if (was.current && !allowed) {
            setClarityConsent(false);
            clearAnalyticsCookies();
            window.location.reload();
        }
        was.current = allowed;
    }, [allowed]);

    if (!allowed) return null;

    return (
        <>
            <Script id="google-tag-manager" strategy="afterInteractive">
                {`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
                `}
            </Script>

            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
                `}
            </Script>

            {CLARITY_ID ? (
                <Script id="microsoft-clarity" strategy="afterInteractive">
                    {`
                    (function(c,l,a,r,i,t,y){
                        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                    })(window, document, "clarity", "script", "${CLARITY_ID}");
                    window.clarity("consent");
                    `}
                </Script>
            ) : null}
        </>
    );
}
