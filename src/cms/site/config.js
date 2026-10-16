// The one place the repository-root configuration is reached from.
//
// The `@/` alias, because the configuration lives in `src/lib` with the rest of
// this site's own code. It is the site's description of itself, not a module of
// the CMS — but it is still source, edited as often as a component, and it
// belongs where somebody would look for source. Naming that path once here
// means nothing else has to spell it.
//
// Importing this module is safe from a browser bundle — see ./index.js. It pulls
// in nothing but the configuration and the language it is written in: the schema
// TYPES are reached by whoever resolves a page, not from here, for the
// evaluation-order reason ./define.js sets out at length.

import site from '@/lib/cms.config.js'

// The named position maps travel too. They are content-model documentation —
// "item 3 of `o-nas.links` is the Instagram icon" — and the components' comments
// cite them, so they have to be reachable from the server barrel as well.
export * from '@/lib/cms.config.js'

// Ruční objekt se stejnými klíči projde čtením i buildem a ozve se až při
// publikaci, hláškou o nedefinované vlastnosti kdesi v revalidaci. Konfigurace
// je jediné místo, které umí pojmenovat skutečný problém, tak se kontroluje
// tady — při startu, ne až něco selže.
if (!site || typeof site !== 'object' || !site.__cmsSite) {
    throw new Error(
        'cms.config.js nebyl sestavený přes defineSite(). Obal export do ' +
            "defineSite({ pages: [...], globals: defineGlobals({...}) }) z '@/cms/site'.",
    )
}

export { site }
export default site
