// import Footer from "@/components/common/footer";
// import Navbar from "@/components/common/navbar";
// import Cursor from "@/components/common/navbar/cursor";
// import QNA from "@/components/common/qna";
// import BenefitReminder from "@/components/forms/BenefitReminder";
// import BenefitDetails from "@/components/pages/benefit/BenefitDetails";
// import BenefitProgramKeyframes from "@/components/pages/benefit/BenefitProgram";
// import Reviews from "@/components/pages/benefit/Reviews";
// import Contact from "@/components/pages/index/MainSection/Contact";
import Seo from "@/components/common/Seo";

import BenefitIntro from "@/components/pages/benefit/BenefitIntro";
import BenefitJourney from "@/components/pages/benefit/BenefitJourney";
import BenefitRide from "@/components/pages/benefit/BenefitRide";
import BenefitBothWin, { BenefitEnroll } from "@/components/pages/benefit/BenefitBothWin";
import BenefitReviews from "@/components/pages/benefit/BenefitReviews";
import QnaContact from "@/components/pages/index/QnaContact";

import {
    getAssistant,
    getContactContent, getNavbarContent,
    getFooterContent,
    getHomepageContent,
    getPageContent,
    getRoster,
    readerFor,
    viewOf,
} from "@/lib/site"

// This page took `footerStaticProps` until it grew a belt of reviews. A page
// with a reader of its own writes its own and calls the shared three
// alongside — see /o-nas and /nabidka, which do the same. Nothing inside can
// reject: every read answers with empty rather than throwing, so an
// unreachable database yields the page with no belt rather than a build
// failure.
const REVALIDATE_SECONDS = 600

export async function getStaticProps(context) {
    // One call, three readers: published, draft, or the site as it stood at a
    // chosen moment. See @/cms/server/site/archive.js.
    const view = viewOf(context)
    const read = readerFor(view)

    // The enrolment's "still no advisor" answer opens the homepage's whole
    // advisor block — read from the same place as the homepage, so the two
    // cannot come to say different things.
    //
    // The belt of reviews travels inside `content` rather than beside it: this
    // route declares `reviews` as one of its sources in cms.config.js, so
    // `getPageContent` already runs that query, and a second
    // `getApprovedReviews` here would be the same read twice per regeneration.
    const [content, home, footer, contact, navbar, assistant, roster] = await Promise.all([
        getPageContent("/benefit-program", view),
        getHomepageContent(view),
        getFooterContent(view),
        getContactContent(view),
        getNavbarContent(view),
        getAssistant({ read }),
        getRoster({ read }),
    ])

    return {
        props: {
            // The belt keys its cards by this rather than by position, and a
            // published review carries no id of its own — only the draft reader
            // attaches one, and the spread lets it win where it does.
            reviews: (content?.reviews || []).map((review, index) => ({ id: `r${index}`, ...review })),
            content,
            consultants: home?.consultants || [],
            advisorsCopy: home?.advisorsCopy || {},
            advisorFormCopy: home?.advisorFormCopy || {},
            footer,
            contact,
            navbar,
            assistant,
            roster,
        },
        revalidate: REVALIDATE_SECONDS,
    }
}

export default function BenefitProgramPage({
    reviews = [],
    content = {},
    consultants = [],
    advisorsCopy = {},
    advisorFormCopy = {},
}) {
    // WIP: Use differnt paths for phone viewports

    return (
        <>
            <Seo
                title="Benefit program – doporučte nás | Procházka Group"
                description="Doporučte nás někomu, komu pomůžeme s financemi. Když se stane naším klientem, dostanete poukaz – v programu až 47 500 Kč v odměnách."
                path="/benefit-program"
                keywords="benefit program, doporučení, odměna za doporučení, poukazy, Procházka Group, finanční poradenství Písek"
                // A WebPage, not a Product: the programme is not sold and has no
                // price, and a Product without one is a rich-result error.
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "WebPage",
                    "name": "Benefit program – doporučte nás",
                    "description": "Program pro klienty Procházka Group: za doporučení, ze kterého se stane nový klient, dostanete poukaz. V programu je celkem až 47 500 Kč v odměnách.",
                    "url": "https://www.prochazkagroup.cz/benefit-program",
                    "inLanguage": "cs",
                    "isPartOf": {
                        "@type": "WebSite",
                        "name": "Procházka Group",
                        "url": "https://www.prochazkagroup.cz"
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "Procházka Group",
                        "url": "https://www.prochazkagroup.cz"
                    }
                }}
            />
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
            {/* Every section owns its own fallbacks — each knows what "nothing"
                should look like for each of its fields — so all these props do
                is stop an absent `content` from being a property access on
                undefined. */}
            <main lang="cs">
                <BenefitIntro copy={content?.intro} />
                <BenefitJourney head={content?.journey} steps={content?.steps} />
                {/* Rewards + the printed cards as one horizontal bento
                    journey — grow-and-push from the navbar's wall, ridden
                    sideways. Replaces the ledger and the static bento. */}
                <BenefitRide copy={content?.ride} />
                <BenefitBothWin copy={content?.doubt} />
                {/* The doubt's answer in other people's words, then the way
                    in — the invitation lands after the proof, not before it. */}
                <BenefitReviews reviews={reviews} copy={content?.reviewsCopy} />
                <BenefitEnroll
                    consultants={consultants}
                    advisorsCopy={advisorsCopy}
                    advisorFormCopy={advisorFormCopy}
                    copy={content?.enroll}
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