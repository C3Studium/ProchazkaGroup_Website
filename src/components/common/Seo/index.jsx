import Head from "next/head";

// Hlavička stránky pro vyhledávače a sdílení — jedno místo pro celý web.
//
// Dřív si ji každá stránka psala sama, a každá trochu jinak: twitter tagy přes
// `property` místo `name`, nikde `og:site_name`, `og:locale` ani alt a rozměry
// náhledu, popisy přes 160 znaků (Google je usekne) a u /recenze/[slug] žádný
// twitter vůbec. Tady se sada skládá vždy celá a ze stejných hodnot, takže
// Facebook, Instagram, WhatsApp, LinkedIn, X i Google dostanou tentýž titulek,
// popis a obrázek.
//
// Náhledy jsou JPG 1200×630 v /assets/seo/og (vyrobené ze stejnojmenných WebP
// o složku výš): WebP neumí LinkedIn ani starší klienti a 1,91 : 1 je poměr,
// na který ořezávají všichni.

export const SITE_URL = "https://prochazkagroup.cz";
export const SITE_NAME = "Procházka Group";

const DEFAULT_IMAGE = {
    src: "/assets/seo/og/mainpage.jpg",
    width: 1200,
    height: 630,
    alt: "Procházka Group – finanční poradenství v Písku. Budujeme pro lidi stabilní a kvalitní finanční poradenství už přes jednu dekádu.",
};

const absolute = (src) => (/^https?:\/\//.test(src) ? src : `${SITE_URL}${src}`);

const mimeOf = (src) => {
    const ext = src.split("?")[0].split(".").pop().toLowerCase();
    return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[ext] || null;
};

/**
 * @param {object}  props
 * @param {string}  props.title        celý titulek, jak ho ukáže Google i náhled
 * @param {string}  props.description  ≤ 160 znaků; jde i do og/twitter
 * @param {string}  [props.path]       cesta stránky ("/o-nas"); bez ní žádný canonical ani og:url
 * @param {object}  [props.image]      { src, width, height, alt } — výchozí je hlavní náhled
 * @param {string}  [props.type]       og:type, výchozí "website"
 * @param {boolean} [props.noindex]    stránka mimo vyhledávání (404, formuláře recenzí)
 * @param {string}  [props.keywords]
 * @param {object|object[]} [props.jsonLd]  strukturovaná data schema.org
 */
export default function Seo({
    title,
    description,
    path,
    image = DEFAULT_IMAGE,
    type = "website",
    noindex = false,
    keywords,
    jsonLd,
}) {
    const url = path != null ? `${SITE_URL}${path === "/" ? "" : path}` : null;
    const img = { ...DEFAULT_IMAGE, ...image };
    const imgUrl = absolute(img.src);
    const mime = mimeOf(img.src);
    // Rozměry jen u obrázku, o kterém je známe: špatné číslo je horší než žádné.
    const sized = image === DEFAULT_IMAGE || (image.width && image.height);
    const card = sized && img.width / img.height >= 1.5 ? "summary_large_image" : "summary";

    return (
        <Head>
            <title>{title}</title>
            {/* viewport je jednou pro celý web v _app. */}
            <meta name="description" content={description} />
            {keywords ? <meta name="keywords" content={keywords} /> : null}
            <meta name="author" content={SITE_NAME} />
            <meta name="robots" content={noindex ? "noindex, follow" : "index, follow, max-image-preview:large"} />
            {url ? <link rel="canonical" href={url} /> : null}

            {/* Open Graph — Facebook, Instagram, WhatsApp, LinkedIn, Messenger, Slack… */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content="cs_CZ" />
            {url ? <meta property="og:url" content={url} /> : null}
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={imgUrl} />
            <meta property="og:image:secure_url" content={imgUrl} />
            {mime ? <meta property="og:image:type" content={mime} /> : null}
            {sized ? <meta property="og:image:width" content={String(img.width)} /> : null}
            {sized ? <meta property="og:image:height" content={String(img.height)} /> : null}
            <meta property="og:image:alt" content={img.alt} />

            {/* X / Twitter — čte `name`, ne `property`. */}
            <meta name="twitter:card" content={card} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imgUrl} />
            <meta name="twitter:image:alt" content={img.alt} />

            {jsonLd ? (
                <script
                    type="application/ld+json"
                    // Bez `<` v datech by šlo i jako dítě; takhle se „</script>"
                    // v kterémkoli textu nemůže stát koncem skriptu.
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
                />
            ) : null}
        </Head>
    );
}
