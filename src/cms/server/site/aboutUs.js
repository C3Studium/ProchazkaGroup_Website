// What /o-nas reads — SERVER ONLY.
//
// Nothing is shaped here any more. The two hundred lines of "which item of which
// block is which prop" are `cms.config.js`, the generic reader is ./page.js, and
// what is left is this module's two remaining jobs:
//
//   1. `getAboutContent`, under the name three call sites already import it by.
//   2. The named position maps, which are content-model documentation rather
//      than shaping — "item 3 of `o-nas.links` is the Instagram icon". Several
//      components' comments cite them BY THIS PATH (AboutHero, Colleagues,
//      ContinuePrompt, MemberShowcase), and those files are not this build's to
//      edit, so the names stay reachable from here. They are declared in
//      `cms.config.js`, next to the blocks that use them, and re-exported.
//
// The arguments that used to be made at length in this file — why the showcase
// and the history are fixed-length lists, why `items[].label` carries no mark on
// this page, why the roster is the consultant type — moved with the declarations
// they describe. See the /o-nas section of `cms.config.js`.

export { ABOUT_LINKS, PROMPT_LINES, SHOWCASE_VALUES } from '@/cms/site/config'
export { ABOUT_COPY_KEYS as ABOUT_KEYS } from '@/cms/visualEditing'

import { getPageContent } from './page.js'

/**
 * Everything /o-nas needs, in one round trip.
 *
 * `draft` and `at` are the caller's switches on exactly the terms ./page.js sets
 * out: the public build calls it with no arguments and therefore cannot reach a
 * draft, an old version, or carry a document id. Forwarded rather than named,
 * because this function is the route's name for `getPageContent` and nothing
 * else.
 *
 * @param {{ draft?: boolean, at?: string|null }} [options]
 */
export const getAboutContent = (options) => getPageContent('/o-nas', options)
