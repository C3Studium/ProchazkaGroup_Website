import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

// Derived from the environment rather than written out, because the hostname IS
// the project ref and a pinned one goes stale silently: this was preconnecting
// to a Supabase project the site no longer uses, which costs a DNS lookup and a
// TLS handshake to a host nothing ever asks for. next.config.mjs derives the
// image host the same way and for the same reason.
// Stejný důvod jako u původu Supabase o řádek níž: identifikátor patří do
// prostředí, ne do dvou souborů najednou. Studio ho čte pod týmž jménem, aby
// odkaz na nástěnku Clarity mířil na tentýž projekt, který web měří — dvě
// natvrdo psaná ID se rozejdou a nikdo si toho nevšimne.
// Očištěno na znaky, které identifikátor Clarity smí mít. Hodnota se vsazuje
// do textu inline skriptu, a tam by cokoli neočekávaného nebyla překlepnutá
// konfigurace, ale cizí kód spuštěný na každé stránce.
const clarityProjectId =
  (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "").replace(/[^a-zA-Z0-9]/g, "") || null;

const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
  } catch {
    // No URL configured, or a malformed one. A preconnect is an optimisation;
    // its absence must never be what stops the document from rendering.
    return null;
  }
})();

export default function Document() {
  return (
    <Html lang="cs" data-preload="1">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KNTLJJ7L');
          `}
        </Script>
      </Head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-KNTLJJ7L"
            height="0" 
            width="0" 
            style={{display: 'none', visibility: 'hidden'}}
          />
        </noscript>
        
        <Main />
        <NextScript />
        
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N6QVWf64DT"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N6QVWF64DT');
          `}
        </Script>

        {/* Microsoft Clarity */}
        {clarityProjectId ? (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityProjectId}");
          `}
          </Script>
        ) : null}
      </body>
    </Html>
  );
}