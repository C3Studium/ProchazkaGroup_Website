/**
 * Clears the core's type registry, as a module side effect.
 *
 * This exists as its own file purely for evaluation order: it must run before
 * the schema modules register their types, and ES module imports are hoisted
 * above module-body statements. `./schemas.js` imports this first, so by the
 * time `@/cms/schemas` evaluates, the registry is empty and re-registering after
 * a hot reload does not trip the core's duplicate check.
 */
import { clearTypes } from "@/cms/core"

clearTypes()
