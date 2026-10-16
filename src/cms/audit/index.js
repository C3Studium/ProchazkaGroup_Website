// The annotation audit — PURE and ISOMORPHIC, and never on a public route.
//
// It is reached from exactly two places: the Studio's editing view, which runs
// it over the page an editor is looking at, and a dev-only API route the
// deliberate scan drives. Both live outside the site's bundle. Nothing here is
// imported by `@/cms/edit`'s barrel, which is the module a public component
// loads, and nothing here may be — see the note at the head of that file.

export { fromDocument, fromHtml } from './annotations.js'
export { auditPage, pagesFor } from './audit.js'
export { reportLines } from './report.js'
