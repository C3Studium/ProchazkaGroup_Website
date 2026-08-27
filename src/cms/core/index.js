/**
 * Contract 1 — the schema layer.
 *
 * Everything the Studio (build B) and the server (build C) may import from
 * `@/cms/core`. Nothing here touches the network, the database or the DOM; the
 * whole folder is pure logic with no runtime dependencies, which is what lets
 * the same validation run in the browser on a keystroke and on the server on a
 * write and agree about the answer.
 *
 * See README.md in this folder for how to declare a type, how to add a field
 * type, and what is guaranteed to be present on a normalised field.
 */

// The spec's seven.
export { defineType } from "./defineType.js"
export { defineField } from "./defineField.js"
export { getType, listTypes } from "./registry.js"
export { validateDocument, emptyDocument } from "./validate.js"
export { FIELD_TYPES } from "./fieldTypes.js"

// The rest of the surface, all additive.
export { findType, hasType, clearTypes } from "./registry.js"
export { validateValue, emptyValue } from "./validate.js"
export {
  FIELD_TYPE_NAMES,
  getFieldType,
  hasFieldType,
  listFieldTypes,
  registerFieldType,
  isEmptyValue,
} from "./fieldTypes.js"
export { isField } from "./defineField.js"
export { createRule, isRule, RULE_FLAGS } from "./rules.js"
export { CmsSchemaError } from "./errors.js"
