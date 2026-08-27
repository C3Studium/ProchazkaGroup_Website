// The site configuration language.
//
// PURE and ISOMORPHIC — no `fs`, no database client, no DOM. `cms.config.js` at
// the repository root is written against this barrel, and the Studio may read
// that file in a browser for the same reason the site layer may read it on a
// server: nothing in here does any I/O.
//
// The loaded configuration is deliberately NOT exported from here. It lives one
// import away, in ./config.js, so that `cms.config.js` can import this barrel
// without the two forming a cycle.

export { OMIT, f } from './fields.js'
export {
    copyKeysOf,
    defineBlock,
    defineBlockList,
    defineCustom,
    defineList,
    definePage,
    defineSite,
    pageFor,
    resolvePage,
} from './define.js'
