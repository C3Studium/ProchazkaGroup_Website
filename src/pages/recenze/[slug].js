import Head from "next/head"

import AdvisorCard from "@/components/pages/advisor/AdvisorCard"
import { getConsultants, getAssistant, getContactContent, getFooterContent, readEditable, readPublished } from "@/cms/server/site"

// One page per published consultant, and it exists to collect a review for that
// one person — this is the address behind the QR code on their business card,
// so the visitor already knows whose page they are on and never picks a name
// from a list.
//
// Generated from the CMS rather than kept as twelve copies of the same file.
// Adding somebody is an edit in the Studio; all this route needs is a slug.
//
// Under /recenze rather than /poradci because that is what the page does. It
// sits beside the wall at /recenze, which is where these end up once approved.
const REVALIDATE_SECONDS = 600

export async function getStaticPaths() {
    const consultants = await getConsultants({ kind: 'consultant' })
    return {
        paths: consultants
            .filter((c) => c.slug)
            .map((c) => ({ params: { slug: c.slug } })),
        // A consultant added after the last build still gets a page: the first
        // request renders it and it is cached from then on. Without this the
        // Studio could publish somebody who 404s until the next deploy, which is
        // the whole thing this route exists to stop.
        fallback: 'blocking',
    }
}

export async function getStaticProps({ params, ...context }) {
    // Same switch every other route's reader takes, and it was missing here for
    // the same reason it was missing on /recenze: this page writes its own
    // getStaticProps instead of taking `footerStaticProps`. Without it the
    // patička and the contact sheet carry no document id inside the Studio's
    // editing frame, so nothing on either can be clicked.
    const draft = Boolean(context?.draftMode)
    const read = draft ? readEditable : readPublished

    const [consultants, footer, contact, assistant] = await Promise.all([
        getConsultants({ kind: 'consultant' }),
        getFooterContent({ draft }),
        getContactContent({ draft }),
        getAssistant({ read }),
    ])

    const advisor = consultants.find((c) => c.slug === params.slug) || null
    // Archived or renamed rather than merely missing: a slug that no longer
    // belongs to anybody has to 404, not render an empty card.
    if (!advisor) return { notFound: true, revalidate: REVALIDATE_SECONDS }

    return { props: { advisor, footer, contact, assistant }, revalidate: REVALIDATE_SECONDS }
}

export default function AdvisorPage({ advisor }) {
    const title = `Recenze — ${advisor.name} | Procházka Group`
    const description = `Napište recenzi na ${advisor.name}, finančního poradce Procházka Group.`
    const url = `https://prochazkagroup.cz/recenze/${advisor.slug}`

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content={description} />
                {/* Nothing to find here: it is a form for one person, reached from
                    a printed code rather than from a search. */}
                <meta name="robots" content="noindex, follow" />
                <link rel="canonical" href={url} />

                <meta property="og:type" content="profile" />
                <meta property="og:url" content={url} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                {advisor.portrait?.src && (
                    <meta property="og:image" content={`https://prochazkagroup.cz${advisor.portrait.src}`} />
                )}

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Person",
                        name: advisor.name,
                        jobTitle: "Finanční poradce",
                        url,
                        worksFor: {
                            "@type": "Organization",
                            name: "Procházka Group",
                            url: "https://prochazkagroup.cz",
                        },
                        ...(advisor.phone ? { telephone: advisor.phone } : {}),
                    })}
                </script>
            </Head>
            <main lang="cs" key={`advisor-${advisor.slug}`}>
                <AdvisorCard advisor={advisor} />
            </main>
        </>
    )
}
