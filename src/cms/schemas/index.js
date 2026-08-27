// This project's content types.
//
// Importing a schema module registers it with the core (defineType has that
// side effect), so importing this barrel once — from the Studio's entry point —
// is what makes every type known to getType/listTypes. The array is exported
// as well for anything that wants the set without relying on registration
// order.
//
// Adding a content type is a file here plus a line below. No migration: every
// document is a row of JSONB in cms_document.

import assistant from './assistant.js'
import consultant from './consultant.js'
import offer from './offer.js'
import partner from './partner.js'
import qna from './qna.js'
import review from './review.js'
import siteCopy from './siteCopy.js'

export const schemas = [siteCopy, partner, consultant, assistant, review, offer, qna]

// Order matters only for the Studio's sidebar; it is the order an editor is
// most likely to want, not alphabetical.
export const schemaNames = schemas.map((schema) => schema.name)

export { siteCopy, partner, consultant, assistant, review, offer, qna }

export default schemas
