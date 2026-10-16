// Filtering and sorting a set of bodies already in hand — SERVER ONLY, PURE.
//
// `readPublished` asks the database for its rows and lets PostgREST do this
// work. The other two readers cannot: `readEditable` holds `draft ?? data`
// bodies, and `readAt` (archive.js) holds bodies lifted out of
// `cms_document_revision`, so in both cases the predicate has to run against the
// body the page will actually render rather than against the published column
// the query could have filtered on.
//
// It lives here rather than in either of them because they are the same problem
// twice, and the interesting parts — the loose comparison, the `data.` head, the
// refusal to guess at an operator — are the parts a second copy would get subtly
// wrong. Nothing here reads a document, a client or an environment variable.

/**
 * Read one value out of a body by the dotted path `content.js` uses in its
 * filters and sorts — `data.kind`, `data.order`. The `data.` head names the
 * document body in PostgREST terms and is stripped here, because by this point
 * the body in hand may have come from `draft` or from a revision instead.
 */
export const valueAt = (body, field) => {
    const segments = String(field).split('.')
    const path = segments[0] === 'data' || segments[0] === 'draft' ? segments.slice(1) : segments
    return path.reduce((node, key) => (node == null ? undefined : node[key]), body)
}

/**
 * Why filtering happens here rather than in the query.
 *
 * `content.js` filters on `data.kind`, `data.approved`, `data.page` — paths into
 * the *published* body. Sent to PostgREST unchanged they would ask the database
 * about `data->>kind` on a row whose kind an editor has just changed in `draft`,
 * and a partner switched from "local" to "financial" this morning would be
 * filtered by what it used to be. The whole point of the preview is to answer
 * "what does this look like with my edits", so the predicate has to run against
 * the same body the page will render. The archive reader wants the mirror image
 * of that argument: a body from March must be filtered by what it said in March.
 *
 * Deliberately narrow: bare-value equality only, which is every filter the site
 * layer actually passes. Anything richer is not silently ignored — it throws,
 * and the caller's try/catch turns it into an empty section plus a warning,
 * rather than a reader that quietly shows the wrong set.
 */
export const matchesBody = (body, filters) =>
    Object.entries(filters || {}).every(([field, expected]) => {
        if (expected === undefined) return true
        if (expected !== null && typeof expected === 'object') {
            throw new Error(
                `Filtr "${field}" používá operátor, který se nad tímto obsahem nedá vyhodnotit`
            )
        }
        const actual = valueAt(body, field)
        // Loose on purpose, and only here: `data.approved` is compared against
        // `true` while a hand-written document may hold the string "true".
        // content.js re-asserts the boolean afterwards either way.
        return actual === expected || String(actual) === String(expected)
    })

const compare = (left, right, direction) => {
    const sign = direction === 'desc' ? -1 : 1
    if (left == null && right == null) return 0
    if (left == null) return 1
    if (right == null) return -1
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * sign
    return String(left).localeCompare(String(right), 'cs') * sign
}

export const sortBodies = (bodies, sort) => {
    const entries = (Array.isArray(sort) ? sort : sort ? [sort] : []).filter(Boolean)
    if (!entries.length) return bodies
    return [...bodies].sort((a, b) => {
        for (const { field, direction } of entries) {
            const result = compare(valueAt(a, field), valueAt(b, field), direction)
            if (result !== 0) return result
        }
        return 0
    })
}
