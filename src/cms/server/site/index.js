// Public-site content layer — SERVER ONLY.
//
// Import this from getStaticProps / getServerSideProps, never from a component.
// Unlike `@/cms/server`, this barrel does not assert at import time: Next's SSG
// transform drops getStaticProps and its exclusive imports from the client
// bundle, and nothing in here executes at module scope, so a stray import costs
// bundle size rather than a runtime crash on a public page.
//
// Everything below reads published documents only — `status = 'published'`,
// body from `data`, never `draft` — and answers with empty rather than throwing
// when the CMS is unavailable. See read.js for why that is the contract.

export {
    readPublished,
    readOnePublished,
    imageValue,
    plainText,
    slugValue,
    stringValue,
    numberValue,
} from './read.js'

// The one exception to the published-only rule above, and it is not reachable
// from a public page: `readEditable` needs the service role key and is called
// only by the Studio preview, behind Next's draft-mode cookie. See draft.js.
export { readEditable } from './draft.js'

export {
    getSiteCopy,
    getPartners,
    getApprovedReviews,
    getConsultants,
    getAssistant,
} from './content.js'

// One generic reader for every configured route. `cms.config.js` says which
// documents a page holds and where each field lands; ./page.js runs the queries
// and hands the answers to the pure resolver in @/cms/site. The homepage's
// 512-line hand-written seam is gone; `getHomepageContent` is one line of this.
export { getPageContent, getHomepageContent, parseHighlights, COPY_KEYS } from './page.js'

// The two seams not yet on the configuration. `footer.js` is the one that is
// not a page: `_app` renders the patička under every route, so every page's
// reader hands the same block down through `props.footer`. `aboutUs.js` is a
// page and is next; see the note at the head of ./page.js.
export { getAboutContent, ABOUT_KEYS, ABOUT_LINKS, PROMPT_LINES, SHOWCASE_VALUES } from './aboutUs.js'
export {
    getFooterContent,
    getContactContent,
    footerStaticProps,
    FOOTER_KEY,
    FOOTER_LINES,
    FOOTER_LINKS,
    CLAIM_LINES,
    CONTACT_LINES,
    GLOBAL_KEYS,
} from './footer.js'
