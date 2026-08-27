// import Footer from "@/components/common/footer";
// import Navbar from "@/components/common/navbar";
// import Cursor from "@/components/common/navbar/cursor";
// import QNA from "@/components/common/qna";
// import BenefitReminder from "@/components/forms/BenefitReminder";
// import BenefitDetails from "@/components/pages/benefit/BenefitDetails";
// import BenefitProgramKeyframes from "@/components/pages/benefit/BenefitProgram";
// import Reviews from "@/components/pages/benefit/Reviews";
// import Contact from "@/components/pages/index/MainSection/Contact";
import Head from "next/head";

import BenefitIntro from "@/components/pages/benefit/BenefitIntro";
import BenefitJourney from "@/components/pages/benefit/BenefitJourney";
import BenefitRide from "@/components/pages/benefit/BenefitRide";
import BenefitBothWin, { BenefitEnroll } from "@/components/pages/benefit/BenefitBothWin";
import BenefitReviews from "@/components/pages/benefit/BenefitReviews";
import QnaContact from "@/components/pages/index/QnaContact";

import {
    getApprovedReviews,
    getAssistant,
    getContactContent,
    getFooterContent,
    getHomepageContent,
    readEditable,
    readPublished,
} from "@/cms/server/site"

// This page took `footerStaticProps` until it grew a belt of reviews. A page
// with a reader of its own writes its own and calls the shared three
// alongside — see /o-nas and /nabidka, which do the same. Nothing inside can
// reject: every read answers with empty rather than throwing, so an
// unreachable database yields the page with no belt rather than a build
// failure.
const REVALIDATE_SECONDS = 600

export async function getStaticProps(context) {
    const draft = Boolean(context?.draftMode)
    const read = draft ? readEditable : readPublished

    // The enrolment's "still no advisor" answer opens the homepage's whole
    // advisor block — read from the same place as the homepage, so the two
    // cannot come to say different things.
    const [reviews, home, footer, contact, assistant] = await Promise.all([
        getApprovedReviews({ limit: 16 }),
        getHomepageContent(),
        getFooterContent({ draft }),
        getContactContent({ draft }),
        getAssistant({ read }),
    ])

    return {
        props: {
            reviews: reviews.map((review, index) => ({ id: `r${index}`, ...review })),
            consultants: home?.consultants || [],
            advisorsCopy: home?.advisorsCopy || {},
            advisorFormCopy: home?.advisorFormCopy || {},
            footer,
            contact,
            assistant,
        },
        revalidate: REVALIDATE_SECONDS,
    }
}

export default function BenefitProgramPage({
    reviews = [],
    consultants = [],
    advisorsCopy = {},
    advisorFormCopy = {},
}) {
    // WIP: Use differnt paths for phone viewports

    return (
        <>
            <Head>
                <title>Benefit Program | Procházka Group</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Exkluzivní benefit program Procházka Group. Získejte přístup k VIP výhodám, speciálním nabídkám a osobním konzultacím. Staňte se součástí našeho prémiového programu." />
                <meta name="keywords" content="benefit program, VIP výhody, finanční benefity, Procházka Group členství, prémiové služby, finanční poradenství výhody" />
                <meta name="author" content="Procházka Group" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://prochazkagroup.cz/benefit-program" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://prochazkagroup.cz/benefit-program" />
                <meta property="og:title" content="Exkluzivní Benefit Program | Procházka Group" />
                <meta property="og:description" content="Objevte výhody členství v benefit programu Procházka Group. Prémiové služby a VIP přístup." />
                <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/benefitprogram.webp" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://prochazkagroup.cz/benefit-program" />
                <meta property="twitter:title" content="Benefit Program | Procházka Group" />
                <meta property="twitter:description" content="Prémiové výhody a VIP služby pro členy benefit programu." />
                <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/benefitprogram.webp" />

                {/* Schema.org markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Product",
                        "name": "Procházka Group Benefit Program",
                        "description": "Exkluzivní členský program s VIP výhodami a prémiovými službami",
                        "offers": {
                            "@type": "Offer",
                            "description": "Členství v benefitním programu",
                            "url": "https://prochazkagroup.cz/benefit-program",
                            "priceCurrency": "CZK",
                            "availability": "https://schema.org/InStock",
                            "seller": {
                                "@type": "Organization",
                                "name": "Procházka Group"
                            }
                        },
                        "brand": {
                            "@type": "Brand",
                            "name": "Procházka Group"
                        },
                        "category": "Financial Services",
                        "benefits": [
                            "VIP finanční poradenství",
                            "Prémiové konzultace",
                            "Speciální nabídky",
                            "Osobní přístup"
                        ]
                    })}
                </script>
            </Head>
            {/* The order is the reader's questions, in the order they ask them,
                and not the order the sections happen to look best in:
                  what is it → how do I get in → what do I actually get →
                  what does the reward look like → is this a trick.
                It is worth stating because it is the one thing about this page
                that is not a matter of taste. A referral programme is met with
                suspicion, and every section here is answering a specific doubt;
                shuffling them would leave a doubt standing while the page
                talked about something else.

                The three sections this page does NOT build are the last two
                below plus the CTA inside them. Reviews, questions and the
                contact form already exist on the homepage and are imported as
                they stand — a second implementation of a FAQ is a second set of
                answers to keep true. */}
            <main lang="cs">
                <BenefitIntro />
                <BenefitJourney />
                {/* Rewards + the printed cards as one horizontal bento
                    journey — grow-and-push from the navbar's wall, ridden
                    sideways. Replaces the ledger and the static bento. */}
                <BenefitRide />
                <BenefitBothWin />
                {/* The doubt's answer in other people's words, then the way
                    in — the invitation lands after the proof, not before it. */}
                <BenefitReviews reviews={reviews} />
                <BenefitEnroll
                    consultants={consultants}
                    advisorsCopy={advisorsCopy}
                    advisorFormCopy={advisorFormCopy}
                />

                {/* Both fall back to their own shipped copy when given nothing,
                    so they render today. Wiring this route's CMS content to
                    them is a separate job from the redesign. */}
                <QnaContact />

                {/* Superseded by the five sections above. Left commented rather
                    than deleted until the redesign is signed off — they are the
                    only place some of this page's copy still exists. */}
                {/* <BenefitProgramKeyframes /> */}
                {/* <BenefitDetails /> */}
                {/* <Reviews /> */}
                {/* <BenefitReminder /> */}
            </main>
        </>
    )
}