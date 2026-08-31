// This site's content types.
//
// The companion to cms.config.js: that file says what the site's PAGES are made
// of, this one says what its CONTENT is made of. Both belong to the site rather
// than to the CMS, which is the whole point — `src/cms` is meant to be liftable
// into another project, and a library that carries a hard-coded list of one
// client's document types is not liftable, it is forked.
//
// Three of the seven come from the library, because they are mechanisms rather
// than content: `siteCopy` is the keyed block every page's copy lives in, and
// `review` is the type the moderation queue is written against. The other five
// describe this business and live in src/content/types.
//
// **Order is the Studio's sidebar order**, not alphabetical — it is the order an
// editor is most likely to want. It is also the order this project has always
// had; keep it unless someone asks for a different one.
//
// Adding a type is a file in src/content/types and a line below. No migration:
// every document is a row of JSONB keyed by `type`.

import review from '@/cms/schemas/review'
import siteCopy from '@/cms/schemas/siteCopy'

import assistant from '@/content/types/assistant'
import consultant from '@/content/types/consultant'
import offer from '@/content/types/offer'
import partner from '@/content/types/partner'
import qna from '@/content/types/qna'

export const types = [siteCopy, partner, consultant, assistant, review, offer, qna]

/**
 * Who a review is about.
 *
 * The moderation queue matches a submitted review against the person it names,
 * and "person" is this site's `consultant`. That is a fact about this site, so
 * it is declared here rather than spelled out inside the library — see
 * `src/cms/site/types.js`, which is the only door library code uses to reach it.
 */
export const reviewSubjectType = 'consultant'

export default types
