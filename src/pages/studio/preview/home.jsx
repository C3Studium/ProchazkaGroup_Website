import Head from "next/head"

import Home from "@/pages/index"
import { getFooterContent, getHomepageContent } from "@/cms/server/site"

/**
 * The homepage, under glass.
 *
 * The only page of the site the preview does not frame at its own address. Every
 * other route is loaded as itself — `/o-nas?edit=1` — because this site reads its
 * own pathname in five components and a preview served from a different URL
 * renders its navigation differently from the site (see src/cms/preview/frame.js).
 *
 * The homepage cannot be, and the reason is one sentence: `src/pages/index.js`
 * calls `getHomepageContent()` with no arguments and must keep doing so.
 * src/cms/server/site/homepage.js states the guarantee that follows — the public
 * homepage cannot reach a draft no matter what the preview does — and a preview
 * feature is not a good enough reason to spend it. So the draft switch lives here,
 * on a route only the Studio's iframe loads, and the public page keeps its
 * promise. The cost is paid on this page alone: `usePathname()` answers
 * `/studio/preview/home` rather than `/`, which nothing on the homepage branches
 * on today. It stops being a cost the day index.js may read `context.draftMode`,
 * at which point this file is deleted.
 *
 * The important line is the import above: `Home` is the actual default export of
 * `src/pages/index.js`, rendered with props from the same reader the public page
 * calls. Not a copy of its JSX — a copy would be right on the day it was written,
 * and every section added afterwards would be missing from the preview with
 * nobody noticing until an editor trusted it.
 *
 * No panel, no chrome, nothing of the Studio at all. All of that is in the parent
 * document now (src/cms/studio/preview/PreviewHost.jsx); this is the page as a
 * visitor gets it, in a window the size of the device, which is the only way
 * `@media`, `vw` and `vh` can answer honestly.
 */

/**
 * How draft mode is wired, in one function.
 *
 * `context.draftMode` is true exactly when the request carries the bypass cookie
 * that /api/studio/preview sets, and Next turns off static generation for those
 * requests — so this runs per request, against the database, for a signed-in
 * editor only. Everything else about the page is unchanged, which is the whole
 * argument for using the framework's own mechanism instead of a `?draft=1` flag:
 * one render path, one set of props, no branch inside a component that can be
 * true in the preview and false in production.
 */
export async function getStaticProps(context) {
  const draft = Boolean(context.draftMode)

  // Cannot reject — every read inside answers with empty rather than throwing.
  // See src/cms/server/site/read.js and draft.js.
  const [content, footer] = await Promise.all([
    getHomepageContent({ draft }),
    // The patička is rendered by _app under this route as under every other, so
    // the draft copy of it has to travel with this page's props or the one page
    // the Studio frames as a mirror would be the one page whose footer is not
    // editable.
    getFooterContent({ draft }),
  ])

  return {
    props: { content, footer },
    // Only reached on the published side; a draft request bypasses the cache
    // entirely. Much shorter than the public page's ten minutes because the two
    // are answering different questions — the public page is optimising for a
    // visitor who must never wait on the CMS, this one is answering "is my change
    // live yet" and would be useless if it could be nine minutes stale.
    revalidate: 15,
  }
}

export default function PreviewHome({ content }) {
  return (
    <>
      {/* The homepage, and nothing else. An `EditSurface` wrapper stood here and
          was what armed editing — the arrangement that made this the only page
          the overlay worked on, because it is the only framed page whose bundle
          is not the public one. The overlay is mounted by the host now
          (@/cms/edit/overlay/mount) and the flag is set by `_app` in any document
          the preview host frames, so this route is back to being what its name
          says: the homepage, rendered with props that may have come from a
          draft. */}
      <Home content={content} />
      {/* After <Home>, so these win the dedupe. next/head keeps the last element
          for a given meta name, and the homepage sets `index, follow` — which
          must not be what a draft render of it answers with. The mirror also
          carries an X-Robots-Tag header (next.config.mjs); this is the half that
          survives being saved to disk. */}
      <Head>
        <title>Náhled — Studio</title>
        <meta key="robots" name="robots" content="noindex, nofollow" />
        <link key="canonical" rel="canonical" href="https://prochazkagroup.cz" />
      </Head>
    </>
  )
}
