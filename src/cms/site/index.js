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
    defineGlobals,
    defineList,
    definePage,
    defineSite,
    pageFor,
    readsAt,
    resolvePage,
    undeclaredCustom,
} from './define.js'

// Which routes a document is on — the same declarations read the other way
// round, so that publishing can regenerate exactly the pages that changed.
export { dynamicPages, routesForDocument, sourceHolds } from './deps.js'
