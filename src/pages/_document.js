import { Html, Head, Main, NextScript } from "next/document";

// Derived from the environment rather than written out, because the hostname IS
// the project ref and a pinned one goes stale silently: this was preconnecting
// to a Supabase project the site no longer uses, which costs a DNS lookup and a
// TLS handshake to a host nothing ever asks for. next.config.mjs derives the
// image host the same way and for the same reason.
//
// Měřicí skripty (GTM, Google Analytics, Clarity) tu bývaly a běžely každému
// bez souhlasu. Jsou v @/components/common/ConsentScripts a načtou se až po
// souhlasu s analytickými cookies.
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
        {/* viewport tu není schválně: v _document ho Next nedoporučuje a
            stránky ho přidávaly podruhé. Je jednou v _app (next/head). */}
        <link rel="icon" href="/favicon.ico" />
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
