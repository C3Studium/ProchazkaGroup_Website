import Head from "next/head"
import { PagesNavigation } from "@/cms/runtime/pagesNavigation.jsx"

import { studioChrome } from "@/cms"
import PreviewHost from "@/cms/studio/preview/PreviewHost"
import { listSitePages } from "@/cms/server/pages"
import { getHomepageContent } from "@/cms/server/site"

// Registers this project's content types so the rail can name the document an
// editor came from ("Texty stránek" rather than "siteCopy"). Same import the
// Studio's entry point uses, and for the same reason — see dev/schemas.js.
import "@/cms/studio/dev/schemas"

/**
 * The preview's host document.
 *
 * It renders no site component at all. The page being previewed lives in an
 * iframe pointed at that page's own URL with `?edit=1` on it (see
 * src/cms/preview/frame.js), and everything this route contributes is the frame
 * around it: the device presets, the zoom, the page navigator, the draft switch
 * and the way back out.
 *
 * That split is the point of the whole build. A preview that renders the page
 * into its own document can only ever show one viewport — the reviewer's —
 * because `@media`, `vw` and `vh` are answered by the window and nothing else. An
 * iframe has its own window, so a 390px frame is a 390px browser rather than a
 * picture of one.
 *
 * This route is a sibling of the Studio's catch-all (`[[...path]].jsx`) and wins
 * over it because Next ranks a static segment above an optional catch-all.
 */

export async function getStaticProps(context) {
  const draft = Boolean(context.draftMode)

  // Read for its counts, not for its content: the frame fetches the page itself.
  // This is the same round trip the preview has always made, and it is what makes
  // "Načtený obsah" a fact rather than a guess — every section of the homepage
  // falls back to copy hardcoded in its own component, so a page that looks
  // perfect is not evidence that anything was read.
  //
  // Cannot reject; every read inside answers with empty rather than throwing.
  const content = await getHomepageContent({ draft })

  return {
    props: {
      mode: draft ? "draft" : "published",
      generatedAt: new Date().toISOString(),
      sources: summarise(content),
      // Read off src/pages, never typed out — see src/cms/server/pages.js.
      pages: listSitePages(),
    },
    revalidate: 15,
  }
}

/**
 * What the homepage received, counted on the server.
 *
 * Counted here rather than in the host component so the shapes in `content` —
 * which belong to the site layer — do not leak into a Studio component.
 */
function summarise(content) {
  const { offers = {}, whoWeAre = {}, reviews = [], consultants = [] } = content || {}
  return {
    reviews: reviews.length,
    consultants: consultants.length,
    partnerLogos: (offers.partnerLogos || []).length,
    copyLines: (offers.copyLines || []).length,
    whoWeAreChars: (whoWeAre.text || "").length,
  }
}

function StudioPreview({ mode, generatedAt, sources, pages }) {
  return (
    <>
      <Head>
        <title>Náhled — Studio</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PagesNavigation>
        <PreviewHost mode={mode} generatedAt={generatedAt} sources={sources} pages={pages} />
      </PagesNavigation>
    </>
  )
}

/**
 * The host document, not the previewed one: Studio chrome, so it is served the
 * bare shell. The page under glass is a separate document loaded by the iframe
 * and keeps the site's shell in full — see ./home. */
export default studioChrome(StudioPreview)
