/**
 * One definition of "these two bodies say the same thing".
 *
 * Here rather than on either side of the wire because both sides ask it and
 * they must not answer differently: the server decides whether a save is worth
 * storing as a draft (server/documents.js) and the Studio decides whether a
 * draft is worth showing, offering to publish, or warning about before it is
 * thrown away (studio/lib/documents.js). Two implementations would agree on the
 * day they were written.
 *
 * Contract 1's folder is the home for pure logic both builds import, which is
 * what this is — it touches no network, no database and no DOM.
 *
 * WHY NOT `JSON.stringify(a) === JSON.stringify(b)`. `data` and `draft` are two
 * independently stored jsonb columns and jsonb does not keep the key order it
 * was handed — Postgres stores object keys sorted, so a body read back is in the
 * store's order rather than the writer's. The two columns are also filled by
 * different code paths: publish() copies a whole body across, patchField()
 * rebuilds one through `setPath`, which appends a previously-absent key at the
 * end. Two bodies with identical content and different key order are the same
 * body, and stringify would call them different — which is precisely the false
 * "you have unpublished changes" this exists to stop.
 *
 * Object keys are sorted. Array order is left alone, because in an array order
 * IS content: moving a consultant to the top of a list is an edit.
 *
 * `undefined` properties are dropped rather than serialised as null, which is
 * what JSON.stringify does on the way into the store — so a body compared
 * before it has made that trip agrees with the same body after it.
 */
export const canonicalJson = (value) => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
}

export const sameJson = (a, b) => canonicalJson(a ?? null) === canonicalJson(b ?? null)
