/**
 * Registers this project's content types with the core.
 *
 * Importing `@/cms/schemas` has the side effect of calling `defineType` for each
 * one, and the core keeps a loud duplicate check — so a hot reload that
 * re-evaluates a schema module would throw on the second registration.
 * `clearTypes()` is the documented escape hatch, and it has to run *before* the
 * schema modules evaluate.
 *
 * That ordering is why this is two files rather than two statements: ES modules
 * hoist imports above any code in the module body, so `clearTypes()` written
 * here would run after the schemas had already registered. Import order is
 * evaluation order, so `./resetTypes` — whose entire body is the reset — runs
 * first instead.
 *
 * The Studio's entry point imports this module rather than `@/cms/schemas`.
 */
import { hasType } from "@/cms/core"
import { registerType } from "@/cms/core/registry.js"

import "./resetTypes"
import schemas from "@/cms/schemas"

// `clearTypes()` empties the registry; the schema modules refill it only when
// they EVALUATE, and a module evaluates once. So a reset that runs after
// `@/cms/schemas` has already been imported by something else in the same
// module graph — `studio/dev/resetTypes.js` is the other half of this pincer,
// and any module reaching a schema for its field descriptors is a third — takes
// the registry from seven types to nought and nothing puts them back. Every
// request after it answers "Neznámý typ dokumentu".
//
// Measured, not inferred: importing the barrel, calling `clearTypes()` and
// asking `listTypes()` gives `[assistant, consultant, offer, partner, qna,
// review, siteCopy]` then `[]`; the loop below gives all seven back.
//
// Re-registering what the reset just removed costs one pass over seven frozen
// objects and makes the order the resets happen in stop mattering.
for (const type of schemas) {
    if (!hasType(type.name)) registerType(type)
}

export default schemas
