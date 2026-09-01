// What /o-nas reads — SERVER ONLY.
//
// Nothing is shaped here any more. The two hundred lines of "which item of which
// block is which prop" are `cms.config.js`, the generic reader is ./page.js, and
// what is left is this module's two remaining jobs:
//
//   1. `getAboutContent`, under the name three call sites already import it by.
//   2. `ABOUT_KEYS`, which is this package's own.
//
// It used to have a third: re-exporting `ABOUT_LINKS`, `PROMPT_LINES` and
// `SHOWCASE_VALUES` from the site's `valecms.config`, so that components could
// cite them by this path. That is gone, and it had to be.
//
// Those three are one site's content model — "item 3 of `o-nas.links` is the
// Instagram icon". Nothing in this package reads them; the re-export existed
// only so a comment's path would resolve. But a named re-export is a
// REQUIREMENT: every site that reached this module through the server barrel
// had to declare all three or fail to build, on names that mean nothing to it.
// One site's vocabulary became every site's obligation, for documentation.
//
// They are declared in that site's own `valecms.config.js` and used there. A
// comment wanting to cite them can name that file.
//
// The arguments that used to be made at length in this file — why the showcase
// and the history are fixed-length lists, why `items[].label` carries no mark on
// this page, why the roster is the consultant type — moved with the declarations
// they describe. See the /o-nas section of `cms.config.js`.

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
