/**
 * Makes every content type known to the server.
 *
 * Importing `@/cms/schemas` calls `defineType` for each one; the registry is
 * what `assertKnownType` consults on every request that names a type. Any
 * server entry point that reaches the adapter must import this module first.
 *
 * `./resetTypes` runs ahead of the schemas so a hot reload does not trip the
 * core's duplicate-type check. On a cold start it is a no-op.
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
