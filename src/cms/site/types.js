// The library's door to the host's content types.
//
// `src/cms` must not import a file that belongs to one site. It still needs two
// things from one, though: the list of types to register, and the answer to
// "what does a document of type X call itself?" — the moderation queue prints a
// consultant's name, and a consultant's name is three stored parts joined in a
// convention only that site knows.
//
// So the host declares its types in cms.types.mjs and the library reads them
// through here. One seam, greppable, and the only place in src/cms that knows a
// project-specific file exists at all.
//
// Deliberately NOT the core registry. `registerType` is emptied and refilled by
// two `clearTypes()` calls in this project (server/resetTypes.js and
// studio/dev/resetTypes.js), so a lookup that happens to run between a reset and
// its refill answers `undefined`. This list is a frozen array built at module
// evaluation and never cleared, which is what a render path needs.

import { reviewSubjectType, types } from '@/lib/cms.types.mjs'

export { reviewSubjectType, types }

const byName = new Map(types.map((type) => [type.name, type]))

/**
 * The declared type of that name, or `undefined`.
 *
 * @param {string} name
 * @returns {object|undefined}
 */
export const typeNamed = (name) => byName.get(name)

/**
 * How a document of this type names itself, with a safe fallback.
 *
 * A type opts in by carrying `displayName(data)` — see src/content/types/
 * consultant.js. A type that does not gets its `title` field, then its `name`
 * field, then an empty string, so a caller never has to guard.
 *
 * @param {string} typeName
 * @param {object} data — a document body
 * @returns {string}
 */
export const displayNameOf = (typeName, data) => {
    const compose = typeNamed(typeName)?.displayName

    if (typeof compose === 'function') return compose(data) ?? ''

    return (typeof data?.title === 'string' && data.title) || (typeof data?.name === 'string' && data.name) || ''
}
