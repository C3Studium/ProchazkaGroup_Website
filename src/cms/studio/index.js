/**
 * Public surface of the Studio.
 *
 * The page mounts `<Studio core={…} port={…} />` and nothing else. Everything
 * below this file is private to the admin — no other part of the site should
 * import from `studio/` directly.
 */

export { default as Studio } from "./Studio"
export { default } from "./Studio"

// Extension points, for wiring at the entry point rather than inside the admin.
export { registerInput, registerKind } from "./fields/registry"
export { registerStatsSource } from "./stats/statsSource"
export { createClaritySource, CLARITY_PROJECT_ID } from "./stats/clarity"
