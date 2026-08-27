/**
 * Clears the core's type registry, as a module side effect.
 *
 * Its own file purely for evaluation order: it has to run before the schema
 * modules register their types, and ES imports are hoisted above module-body
 * statements, so a `clearTypes()` call alongside an import would run after it.
 * `./registerSchemas.js` imports this first.
 *
 * The Studio has its own copy under `studio/dev/` for the same reason. They are
 * deliberately not shared — the server must not import anything from the
 * Studio's tree, and one line is a cheaper duplicate than that dependency.
 */
import { clearTypes } from "@/cms/core"

clearTypes()
