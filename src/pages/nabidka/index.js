import Head from "next/head";

import OfferHero from "@/components/pages/nabidka/OfferHero";
import StatRail from "@/components/pages/nabidka/StatRail";
import Seam from "@/components/pages/nabidka/Seam";
import OfferOpen from "@/components/pages/nabidka/OfferOpen";
import OfferGrid from "@/components/pages/nabidka/OfferGrid";
import Divergence from "@/components/pages/nabidka/Divergence";
import ReviewDrift from "@/components/pages/nabidka/ReviewDrift";
import ChooseAdvisor from "@/components/pages/index/ChooseAdvisor";
import {
    getAssistant,
    getContactContent,
    getFooterContent,
    getHomepageContent,
    getPageContent,
    readerFor,
    viewOf,
} from "@/cms/server/site";

// Not /nabidky — that route is the partner discounts page and has been for as
// long as there have been links to it. This one is the offer itself: why a
// household needs an advisor and what working with us looks like.
//
// This page took `footerStaticProps` until it grew a wall of reviews at the
// foot of it. A page with a reader of its own writes its own and calls the
// three shared ones alongside — see /o-nas and /recenze, which do the same.
//
// Nothing inside can reject: every read answers with empty rather than
// throwing, so an unreachable database yields the page with no reviews on it
// rather than a build failure.
const REVALIDATE_SECONDS = 600;

export async function getStaticProps(context) {
    // One call, three readers: published, draft, or the site as it stood at a
    // chosen moment. See @/cms/server/site/archive.js.
    const view = viewOf(context);
    const read = readerFor(view);

    // This page's own blocks AND the wall of reviews, in one round trip, from
    // the entry `cms.config.js` already carried for this route — the `reviews`
    // source it declared there is now read through it rather than beside it, so
    // the limit is stated once.
    //
    // The advisor block at the foot is the homepage's own, words and consultants
    // and all — read from the same place, so the two cannot come to say
    // different things.
    const [content, home, footer, contact, assistant] = await Promise.all([
        // `read` and `view` on all five, where the first two used to be read
        // published whoever was asking. Harmless for a visitor, wrong for both
        // of the other readers: it put unpublished copy beside published
        // reviews in the editor's preview, and it would put today's reviews
        // beside March's advisor block in the Archive.
        getPageContent("/nabidka", view),
        getHomepageContent(view),
        getFooterContent(view),
        getContactContent(view),
        getAssistant({ read }),
    ]);

    const { reviews = [], ...copy } = content || {};

    return {
        props: {
            content: copy,
            // An id per review, because the wall keys its cards by one and the
            // store's rows do not carry one the client can see.
            reviews: reviews.map((review, index) => ({ id: `r${index}`, ...review })),
            consultants: home?.consultants || [],
            advisorsCopy: home?.advisorsCopy || {},
            advisorFormCopy: home?.advisorFormCopy || {},
            footer,
            contact,
            assistant,
        },
        revalidate: REVALIDATE_SECONDS,
    };
}

export default function NabidkaPage({
    content = {},
    reviews = [],
    consultants = [],
    advisorsCopy = {},
    advisorFormCopy = {},
}) {
    // Every block below carries a `docId` only when this page is being rendered
    // for the Studio's editing frame — see `f.docId()` in @/cms/site/fields. On
    // the public page it is absent and every annotation helper answers nothing,
    // and a block the CMS does not hold leaves its section exactly as it ships.
    const { hero, rail, open, chain, chart, reviewsCopy } = content;

    return (
        <>
            <Head>
                <title>Naše nabídka | Procházka Group</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta
                    name="description"
                    content="Osm z deseti domácností v ČR je v dluzích nebo je ignoruje. Podívejte se, jak vypadá spolupráce s finančním poradcem od Procházka Group a co pro vás vyřešíme."
                />
                <meta
                    name="keywords"
                    content="finanční poradenství, nabídka služeb, finanční plán, zadlužení domácností, spolupráce s poradcem, Procházka Group, OVB Allfinanz"
                />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://prochazkagroup.cz/nabidka" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://prochazkagroup.cz/nabidka" />
                <meta property="og:title" content="Naše nabídka | Procházka Group" />
                <meta
                    property="og:description"
                    content="Jak vypadá spolupráce s finančním poradcem a co pro vás vyřešíme. Procházka Group, součást OVB Allfinanz."
                />
                <meta
                    property="og:image"
                    content="https://prochazkagroup.cz/assets/seo/mainpage.webp"
                />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://prochazkagroup.cz/nabidka" />
                <meta property="twitter:title" content="Naše nabídka | Procházka Group" />
                <meta
                    property="twitter:description"
                    content="Jak vypadá spolupráce s finančním poradcem a co pro vás vyřešíme."
                />
                <meta
                    property="twitter:image"
                    content="https://prochazkagroup.cz/assets/seo/mainpage.webp"
                />
            </Head>

            <main lang="cs" key="nabidka">
                <OfferHero copy={hero} />
                <StatRail copy={rail} close={rail?.close} cells={rail?.cells?.rows} />
                {/* The band ends on the map, pointing right. The page turns
                    downwards here: a line of type to change the subject, then
                    the offer itself. Neither is pinned and neither is driven by
                    the scroll — this is the part of the page there is most to
                    read. See OfferOpen and OfferGrid. */}
                <Seam from={0.5} to={0.06} bend={0.42} tall={16} />
                <OfferOpen copy={open} />
                <Seam from={0.06} to={0.34} bend={0.55} tall={14} />
                <OfferGrid blocks={chain} />
                {/* The argument the whole offer has been making, as one board
                    you can take hold of. See Divergence. */}
                <Seam from={0.5} to={0.5} bend={0.4} tall={16} />
                <Divergence copy={chart} />
                {/* And what it looks like from the other side. Next: the CTA
                    and the FAQ, and entry/exit animations tying these together
                    rather than leaving them stacked. */}
                <ReviewDrift reviews={reviews} copy={reviewsCopy} />
                {/* The homepage's own advisor block, on the same props. A page
                    that has just spent eight sections explaining the offer ends
                    where that one does: with somebody to ask.
                    
                    Pulled up over the foot of the review wall rather than set
                    below it: the wall fades out at its own bottom edge, so the
                    two overlap in the fade and the page hands over instead of
                    stopping and starting again. */}
                <div className="NabidkaHandover">
                    <ChooseAdvisor
                        consultants={consultants}
                        copy={advisorsCopy}
                        formCopy={advisorFormCopy}
                    />
                </div>
            </main>
        </>
    );
}
