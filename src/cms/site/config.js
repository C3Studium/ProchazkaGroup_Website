// The one place the repository-root configuration is reached from.
//
// A relative path rather than the `@/` alias, because the alias maps to `src/`
// and the configuration is deliberately at the root: it is this site's
// description of itself, on a level with next.config.mjs, not a module of the
// CMS. Naming that path once means nothing else has to spell it.
//
// Importing this module is safe from a browser bundle — see ./index.js. It pulls
// in nothing but the configuration and the language it is written in: the schema
// TYPES are reached by whoever resolves a page, not from here, for the
// evaluation-order reason ./define.js sets out at length.

import site from '../../../cms.config.js'

// The named position maps travel too. They are content-model documentation —
// "item 3 of `o-nas.links` is the Instagram icon" — and the components' comments
// cite them, so they have to be reachable from the server barrel as well.
export * from '../../../cms.config.js'

export { site }
export default site
