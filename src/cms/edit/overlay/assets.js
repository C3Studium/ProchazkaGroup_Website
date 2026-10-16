// The shape an image is stored in, and the four things a set of them can have
// done to it. Pure — no DOM, no port, no React — because "did remove take the
// right one" and "did the move land where the arrow pointed" are questions worth
// being able to answer without a browser.

/**
 * The shape `imageValue()` in `@/cms/server/site/read.js` already accepts, and
 * the one `fieldPatch` validates an `image` field against.
 *
 * The media library's asset carries more than this (created_at, the storage
 * key); a document field carries what a page needs to draw the picture. Copying
 * the subset rather than the asset is what keeps a stored field from drifting
 * every time the library adds a column.
 */
export function imageValue(asset) {
  if (!asset) return null
  return {
    id: asset.id,
    url: asset.url,
    alt: asset.alt || "",
    width: asset.width,
    height: asset.height,
    mime: asset.mime,
    filename: asset.filename,
  }
}

/**
 * What a dotted field path holds in a document body.
 *
 * Every popup body that reads a field needs this and none of them may guess: the
 * overlay can see what the page *rendered* — a `src` next/image rewrote, an alt
 * the component supplied a default for — and writing that back would store the
 * rendering instead of the content. So the bodies load the document and read the
 * stored value through here.
 */
export const valueAt = (body, path) =>
  String(path)
    .split(".")
    .reduce((node, key) => (node == null ? undefined : node[key]), body)

/** The body a popup should edit: the draft when there is one, otherwise what is
 *  published. The same order `bodyOf` uses in the Studio's own editor. */
export const bodyOfDoc = (doc) => doc?.draft ?? doc?.data ?? {}

/** Whatever is stored at an array field, as an array. A field that has never
 *  been set reads as empty rather than as a reason to refuse. */
export const asList = (value) => (Array.isArray(value) ? value : [])

export const addImage = (list, asset) => [...asList(list), imageValue(asset)]

export const replaceImage = (list, index, asset) =>
  asList(list).map((item, at) => (at === index ? imageValue(asset) : item))

export const removeImage = (list, index) => asList(list).filter((_, at) => at !== index)

/**
 * Move one member to an absolute position, or return the list unchanged when
 * either end of the move is off the list.
 *
 * Absolute rather than relative because dragging says "put this one here" and
 * only the keyboard says "one to the left". Expressing both against the same
 * function is what makes "did the drag land where the pointer was" and "did the
 * arrow land one across" the same question with one answer — the earlier build
 * had only the relative form, and a drag written on top of it would have had to
 * turn a target back into a delta and then back again.
 *
 * Unchanged rather than clamped: the caller disables the arrow at the ends, and
 * a clamp would make a stray call look like a successful reorder that stored the
 * same order — which is exactly the bug a reorder test is looking for.
 */
export function moveTo(list, from, to) {
  const items = asList(list)
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items
  if (from === to) return items
  const next = [...items]
  const [held] = next.splice(from, 1)
  next.splice(to, 0, held)
  return next
}

/** One step of `moveTo`, in the direction an arrow points. */
export const moveImage = (list, index, delta) => moveTo(list, index, index + delta)

/**
 * Same members, same order?
 *
 * Structural rather than by id, and the reason is the rule the whole build
 * follows: *Uložit* appears when the value differs from what is stored, so
 * "differs" has to mean every way it can differ. An id-wise comparison would
 * call a set unchanged after a picture's alt text was rewritten under it, and
 * the same JSON comparison is what `studio/lib/documents` already uses to decide
 * whether a document is dirty — one definition of "changed" across both forms.
 */
export const sameSet = (a, b) => JSON.stringify(asList(a)) === JSON.stringify(asList(b))
