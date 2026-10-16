/**
 * Turning whatever is stored in an image field into something croppable.
 *
 * A field's value has three shapes in this store, and only one of them can be
 * cropped without help. Measured, not assumed:
 *
 *   120  a bare path string — `"/assets/portraits/business/6.webp"`
 *    36  `{alt, url, legacy: true}` — written by the migration from the old tables
 *    52  the whole asset the picker writes, with `id` and `mime`
 *
 * The first version of the crop button was shown only when the value carried a
 * `mime`, which hid it on 156 of 208 values — every picture that had not been
 * re-picked since the migration. The check was also self-confirming: it was
 * verified with a query that could only find values which already had the field
 * it was testing for.
 *
 * So: decide "is this an image" from the URL when the value does not say, and
 * find the library row by path when the value has no id. Every `/assets/…` path
 * in a body IS a row — that is what the public import established — so the
 * lookup succeeds for the two older shapes and costs one request.
 */

const IMAGE_EXTENSION = /\.(webp|png|jpe?g|avif|gif)(\?|#|$)/i

/** The URL a value points at, whichever shape it is in. */
export const urlOf = (value) => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') return String(value.url || '')
    return ''
}

/**
 * Is this worth offering a crop on?
 *
 * The MIME when there is one, the file extension when there is not. A value
 * with neither is not an image this can help with.
 */
export const isCroppableImage = (value) => {
    if (!value) return false
    const mime = typeof value === 'object' ? String(value.mime || '') : ''
    if (mime) return mime.startsWith('image/')
    return IMAGE_EXTENSION.test(urlOf(value))
}

/**
 * The library row to crop, or null when the file is not in the library.
 *
 * Null is a real answer rather than an error: a body can point at a path that
 * was never imported, and "this file is not in the library, so it cannot be
 * cropped" is what an editor needs told.
 */
export const resolveCropTarget = async (port, value) => {
    if (value && typeof value === 'object' && value.id) return value

    const url = urlOf(value)
    if (!url) return null

    // A miss is a 404, which the port turns into a throw. Here it is an answer,
    // not a failure: a body can point at a path nobody ever imported, and the
    // caller needs "not in the library" rather than an error dialog.
    try {
        return await port.media.byPath(url)
    } catch (problem) {
        if (problem?.code === 'not_found' || problem?.status === 404) return null
        throw problem
    }
}
