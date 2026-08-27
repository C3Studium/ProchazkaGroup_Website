// import Footer from "@/components/common/footer"

// import QNA from "@/components/common/qna"
// import AboutInto from "@/components/pages/aboutUs/about"
// import ParallaxExpanf from "@/components/pages/aboutUs/parallaxExpand"
import AboutHero from "@/components/pages/aboutUs/AboutHero"
import MemberShowcase from "@/components/pages/aboutUs/MemberShowcase"
import Colleagues from "@/components/pages/aboutUs/Colleagues"
import ContinuePrompt from "@/components/pages/aboutUs/ContinuePrompt"
import History from "@/components/pages/aboutUs/History"
import QnaContact from "@/components/pages/index/QnaContact"
import Head from "next/head"
import { AnimatePresence } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import { getAboutContent, getAssistant, getContactContent, getFooterContent, readEditable, readPublished } from "@/cms/server/site"

// ISR, on the same terms as the homepage (src/pages/index.js): three
// scroll-driven sections over copy an editor changes a few times a year, so the
// page is built once and `revalidate` is what lets a publish reach the public
// site without a deploy.
const REVALIDATE_SECONDS = 600

/**
 * Unlike the homepage, this page reads `context.draftMode`.
 *
 * The homepage may not, and `@/cms/server/site/homepage.js` states the guarantee
 * that buys — which is why the Studio frames it at /studio/preview/home instead
 * of at "/". That exception costs one thing (`usePathname()` answers the mirror's
 * address) and it is spent on the one page where the guarantee was judged worth
 * it. Every other route is framed at its own URL precisely so its navigation
 * renders the way the site's does (see @/cms/preview/frame), and a mirror for
 * this page would buy back the hydration bug that arrangement was built to
 * remove.
 *
 * `context.draftMode` is true exactly when the request carries the bypass cookie
 * that /api/studio/edit sets for a signed-in editor, and Next turns off static
 * generation for those requests. So this runs per request, against the database,
 * for an editor only; a visitor gets the statically generated page and no
 * document id in its props.
 */
export async function getStaticProps(context) {
  const draft = Boolean(context.draftMode)

  // Cannot reject — every read inside answers with empty rather than throwing,
  // so a missing table or an unreachable database yields a page identical to
  // the one that shipped rather than a build failure. See src/cms/server/site.
  const [content, footer, contact, assistant] = await Promise.all([
    getAboutContent({ draft }),
    getFooterContent({ draft }),
    getContactContent({ draft }),
    // The same read the rest of this page uses. Without it she is read published
    // even for an editor, which means no document id and a contact sheet nothing
    // on it can be clicked in — measured that way on /recenze before this.
    getAssistant({ read: draft ? readEditable : readPublished }),
  ])

  return {
    props: { content, footer, contact, assistant },
    revalidate: REVALIDATE_SECONDS,
  }
}

export default function AboutPage({ content }) {
  // Two switches, not one. `armed` is set the moment the prompt below comes into
  // view: the history is mounted then, but out of the flow and invisible, purely
  // so the browser can fetch its first photograph while nobody is waiting.
  // `open` is the hold completing, and by then there is nothing left to do but
  // animate. Mounting on `open` alone put two seconds between the button filling
  // and the first photograph appearing — see the note on the History component.
  const [historyArmed, setHistoryArmed] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Until the history has been asked for, the page ends at the prompt: the
  // footer would put an ending under something that is offering to continue.
  // A body attribute rather than a prop, because the footer is mounted once in
  // _app and does not belong to this page.
  useEffect(() => {
    document.body.dataset.footer = historyOpen ? "shown" : "hidden"
    return () => { delete document.body.dataset.footer }
  }, [historyOpen])

  // Called once the section has finished introducing itself, so the page is not
  // scrolling towards something that is still clipped shut. Lenis owns the
  // scroll, so it has to be asked rather than told.
  const scrollToHistory = useCallback(() => {
    const el = document.querySelector(".History")
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    if (window.lenis) window.lenis.scrollTo(top, { duration: 1.4 })
    else window.scrollTo({ top, behavior: "smooth" })
  }, [])

  // The page never decides what to render on missing content — each section owns
  // its own fallback, because each one knows what "nothing" should look like for
  // it. All this does is stop an absent `content` from being a property access
  // on undefined.
  const { hero = {}, showcase = {}, colleagues = {}, prompt = {}, history = [] } = content || {}

  return (
    <>
      <Head>
        <title>Procházka Group | O nás</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Poznejte tým Procházka Group. Jsme tu pro vás již přes dekádu a poskytujeme profesionální finanční poradenství založené na důvěře a expertize." />
        <meta name="keywords" content="Procházka Group tým, finanční poradci, historie společnosti, finanční experti, hodnoty společnosti, OVB Allfinanz" />
        <meta name="author" content="Procházka Group" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://prochazkagroup.cz/o-nas" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://prochazkagroup.cz/o-nas" />
        <meta property="og:title" content="Procházka Group | O nás" />
        <meta property="og:description" content="Poznejte tým profesionálních finančních poradců Procházka Group, součást OVB Allfinanz." />
        <meta property="og:image" content="https://prochazkagroup.cz/assets/seo/about.webp" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://prochazkagroup.cz/o-nas" />
        <meta property="twitter:title" content="Procházka Group | O nás" />
        <meta property="twitter:description" content="Poznejte tým profesionálních finančních poradců Procházka Group, součást OVB Allfinanz." />
        <meta property="twitter:image" content="https://prochazkagroup.cz/assets/seo/about.webp" />

        {/* Schema.org markup */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "mainEntity": {
              "@type": "Organization",
              "name": "Procházka Group",
              "description": "Profesionální finanční poradenství s více než desetiletou tradicí, součást OVB Allfinanz",
              "url": "https://prochazkagroup.cz",
              "foundingDate": "2013",
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
              },
              "employees": {
                "@type": "Person",
                "name": "Václav Procházka",
                "jobTitle": "Vedoucí kanceláře"
              }
            }
          })}
        </script>
      </Head>
      <main lang="cs" key="about-page">
        {/* `docId` is the siteCopy block each section's copy came from, and it
            is present only when this page is being rendered for the Studio's
            editing frame — see the note on editableDoc() in
            @/cms/server/site/aboutUs. It is what lets a section mark its own
            text and photos as editable; on the public page it is undefined and
            the annotation helper answers with nothing. */}
        <AboutHero
          title={hero.title}
          marks={hero.marks}
          photo={hero.photo}
          badge={hero.badge}
          docId={hero.docId}
        />
        <MemberShowcase
          members={showcase.members}
          footnote={showcase.footnote}
          extras={showcase.extras}
          docId={showcase.docId}
        />
        {/* It stands aside once the history has been asked for — its two
            halves part again, the way they closed on their way in. It keeps its
            height while it does, so nothing the reader is looking at moves, and
            it comes back if they scroll back up into it. */}
        <Colleagues
          headingLines={colleagues.headingLines}
          links={colleagues.links}
          roster={colleagues.roster}
          docId={colleagues.docId}
          dismissed={historyOpen}
        />

        {/* The history is not rendered on page load: four more viewports of
            section, and its photographs, would be paid for on every visit by
            everyone, including the readers who never open it. Reaching the
            prompt is what arms it — that is a deliberate scroll to the end of
            the page, and from there it costs nothing until it is opened. */}
        <AnimatePresence>
          {!historyOpen && (
            <ContinuePrompt
              key="prompt"
              copy={prompt}
              docId={prompt.docId}
              onArm={() => setHistoryArmed(true)}
              onContinue={() => setHistoryOpen(true)}
            />
          )}
        </AnimatePresence>
        {/* Deliberately not inside the AnimatePresence above, and deliberately
            not sequenced after it: while it is closed it is fixed and invisible,
            so the two can share the page, and the prompt collapsing while the
            history opens is what removes the pause between them. */}
        {(historyArmed || historyOpen) && (
          <History open={historyOpen} onReady={scrollToHistory} panels={history} />
        )}

        {/* The same questions the home page answers, and the page ends the way
            that one does. It belongs to the history rather than to the page: it
            is what comes after the last panel, so it appears when the history
            does and not before — the prompt above is still offering to continue,
            and putting an FAQ under that offer answers it for the reader. */}
        {historyOpen && <QnaContact />}
        {/* <AboutInto /> */}
        {/* <ParallaxExpanf /> */}
        {/* <QNA /> */}
        {/* <Footer /> */}
      </main>
    </>
  )
}