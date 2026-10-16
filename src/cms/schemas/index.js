// Every content type this installation knows.
//
// This used to be the list itself — seven imports and an array — which meant the
// library carried one client's document types inside it. The list now lives in
// cms.types.mjs at the repo root, where a site can change it without editing the
// CMS, and this file is what the two registration points import.
//
// Importing it still has the side effect they rely on: reaching a type module
// evaluates it, and evaluating it calls `defineType`, which registers. So a
// single import of this barrel is what makes every type known to
// `getType`/`listTypes`, exactly as before.
//
// What is left in this directory are the types that are mechanisms rather than
// content — `siteCopy`, `review`, `uiText`, and the mark encoding in marks.js —
// because the config system, the moderation queue and the key→text dictionary
// are written against them.
//
// Být v téhle složce ale NEZNAMENÁ být zaregistrovaný: registruje se tím, že se
// modul vyhodnotí, a vyhodnotí ho jedině import. Pro tyhle tři ho dělá
// `valecms.types.mjs` v kořeni webu —
//
//     import uiText from '@c3studium/valecms/schemas/uiText.js'
//     export const types = [siteCopy, review, uiText, …]
//
// — takže web, který slovník nechce, ho nepřidá a žádný typ navíc ve Studiu
// nemá.

import { types } from '../site/types.js'

export const schemas = types

// Order matters only for the Studio's sidebar; cms.types.mjs sets it.
export const schemaNames = schemas.map((schema) => schema.name)

export default schemas
