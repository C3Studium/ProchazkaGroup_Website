/**
 * Public surface of the Studio.
 *
 * The page mounts `<Studio core={…} port={…} />` and nothing else. Everything
 * below this file is private to the admin — no other part of the site should
 * import from `studio/` directly.
 */

export { default as Studio } from "./Studio.jsx"
export { default } from "./Studio.jsx"

// Extension points, for wiring at the entry point rather than inside the admin.
export { registerInput, registerKind } from "./fields/registry.js"
export { registerStatsSource } from "./stats/statsSource.js"
export { createClaritySource, CLARITY_PROJECT_ID } from "./stats/clarity.js"
