import {
  ACTIONS_ATTR,
  DOC_ATTR,
  FIELD_ATTR,
  HREF_ATTR,
  KIND_ATTR,
  KIND_DOCUMENT,
  KIND_IMAGE,
  KIND_IMAGE_SET,
  KIND_LINES,
  KIND_LINK,
  KIND_LIST,
  KIND_TEXT,
  LINE_WILDCARD,
  MARK_ATTR,
  TYPE_ATTR,
} from "./attrs"
import { isEditMode } from "./mode"

// Contract A′ — field provenance, and three shapes that are not a single field.
//
//     <h2 {...editable(doc, "heading")}>{heading}</h2>
//     <motion.div {...editable(doc, "photo", "image")} className="Offers__photo">
//
// An element is editable because it says so, and it says so with attributes
// rather than a wrapper element. That is not a style preference: the homepage is
// a tuned scroll timeline and a wrapper is a new box in it — a new containing
// block, a new stacking context, a new thing for `height: 100%` to resolve
// against. Attributes change no layout, no timing and no transform, which is the
// only way this feature can be added to `src/components/pages/index/` under a
// rule that forbids changing any of the three.

// One frozen object for the public site's answer. `editable()` is called on
// every render of every annotated element; there is no reason for the common
// case to allocate. Frozen so a caller that mutates a spread source is loud
// about it in development instead of poisoning the next call.
const NONE = Object.freeze({})

/**
 * The id to put in `data-cms-doc`.
 *
 * Callers pass whatever they have. A siteCopy block reaches a component as a
 * shaped object with no id on it (see `@/cms/server/site/content.js`), so in
 * practice what arrives is the key — "index.who-we-are" — as a bare string.
 * Objects are accepted too, in the shapes the CMS actually produces, because a
 * helper that only took strings would push `doc.id ?? doc.key` into every call
 * site and one of them would get it wrong.
 */
function docId(doc) {
  if (typeof doc === "string") return doc.trim()
  if (typeof doc === "number") return String(doc)
  if (doc && typeof doc === "object") {
    const id = doc.id ?? doc._id ?? doc.docId ?? doc.key ?? doc.slug
    return typeof id === "string" || typeof id === "number" ? String(id).trim() : ""
  }
  return ""
}

/**
 * Attributes marking one field of one document as editable in the preview, or
 * `{}` everywhere else.
 *
 * @param {string|object} doc    the document, or its id/key
 * @param {string} field         the field path being rendered here
 * @param {"text"|"image"} [kind]
 * @param {string} [mark]        the inline emphasis this field carries, by name.
 *                               Not a decision the component makes: it is the
 *                               field's own `options.mark`, resolved by the
 *                               server that shaped the props (see
 *                               `@/cms/server/site/homepage.js`) and handed down
 *                               with `docId`. A positional string rather than an
 *                               options object because this helper runs on every
 *                               render of every annotated element on the public
 *                               site, where the answer is `{}`.
 */
export function editable(doc, field, kind, mark) {
  if (!isEditMode()) return NONE

  const id = docId(doc)
  const name = typeof field === "string" ? field.trim() : ""
  // A half-annotated element is worse than an unannotated one: it looks
  // editable, is picked up by the overlay, and posts a save the parent cannot
  // route. Both halves or neither.
  if (!id || !name) return NONE

  const attrs = {
    [DOC_ATTR]: id,
    [FIELD_ATTR]: name,
    [KIND_ATTR]: kind === KIND_IMAGE ? KIND_IMAGE : KIND_TEXT,
  }
  // Only when there is one. An attribute present and empty would have to be
  // tested for twice — once for the attribute, once for the value — and the
  // overlay's question is "does this field carry emphasis", which is one test.
  const named = typeof mark === "string" ? mark.trim() : ""
  if (named) attrs[MARK_ATTR] = named

  return attrs
}

/** A field path, trimmed, or "" — the same reading `editable()` does. */
const fieldName = (value) => (typeof value === "string" ? value.trim() : "")

/**
 * One block of copy that is stored as several strings — edited as one.
 *
 * The Offers copy is four `items[].label`s drawn as four lines. Annotating each
 * line separately is what the page's markup suggests and it is the wrong unit:
 * an editor reads the block, so an editor edits the block, and the number of
 * lines is one of the things they are editing. Four annotations cannot express
 * "and now there are three", because a line that is going away has no element
 * left to click.
 *
 * So the annotation goes on the **container** and names the array with a `*` in
 * place of the index — `items.*.label`. The overlay edits the whole block in
 * place, line for line, and the save puts line *i* back into `items.i.label`;
 * adding or removing a line changes the array's length, which is a write to the
 * array itself. See `attrs.js` for the three readings of the template and
 * `overlay/text.js` for what a line is on screen.
 *
 * Everything `editable()` says about `mark` holds here too — the accent is the
 * field's own declaration, and every line of the block carries the same one
 * because they are all the same field.
 *
 * @param {string|object} doc
 * @param {string} field   a path with exactly one `*`, e.g. "items.*.label"
 * @param {string} [mark]
 */
export function editableLines(doc, field, mark) {
  if (!isEditMode()) return NONE

  const id = docId(doc)
  const name = fieldName(field)
  // Without the wildcard there is no way to say which line is which, and a
  // block edited as one that saved to one field would weld four lines into it.
  if (!id || !name || !name.includes(LINE_WILDCARD)) return NONE

  const attrs = { [DOC_ATTR]: id, [FIELD_ATTR]: name, [KIND_ATTR]: KIND_LINES }
  const named = typeof mark === "string" ? mark.trim() : ""
  if (named) attrs[MARK_ATTR] = named
  return attrs
}

/**
 * An array of objects, edited whole in a popup — a Q&A pair and its siblings.
 *
 * Distinct from `lines` by what a member *is*: a line is one string and belongs
 * on the page, a member here is an object with two or three fields of its own
 * and belongs in a form. The same annotation serves both entry points the ask
 * names — the whole array, and one member of it — because a path that ends in an
 * index (`items.3`) is still a path to a thing this popup can render.
 */
export function editableList(doc, field) {
  if (!isEditMode()) return NONE

  const id = docId(doc)
  const name = fieldName(field)
  if (!id || !name) return NONE

  return { [DOC_ATTR]: id, [FIELD_ATTR]: name, [KIND_ATTR]: KIND_LIST }
}

/**
 * An array-of-images field, edited as a whole.
 *
 * The set is the unit, not the picture: adding, removing and reordering are all
 * writes to the same array, so the annotation names the array and the popup owns
 * the members. Annotating each `<img>` separately would give an editor three
 * affordances that can each half-succeed, and no way to say "this one goes
 * first".
 */
export function editableSet(doc, field) {
  if (!isEditMode()) return NONE

  const id = docId(doc)
  const name = fieldName(field)
  if (!id || !name) return NONE

  return { [DOC_ATTR]: id, [FIELD_ATTR]: name, [KIND_ATTR]: KIND_IMAGE_SET }
}

/**
 * The whole document, as the form its type already describes.
 *
 * A partner, an offer or a consultant on the page is one row rendered by one
 * component, and what an editor wants from clicking it is the form they already
 * know — every field, its validation, its tabs. So the annotation carries the
 * type name and the overlay renders the type's own fields with the Studio's own
 * `FieldRenderer`. No field path: there is no one field, and the type is the
 * only thing the popup cannot work out from the id alone without a round trip.
 *
 * `actions` narrows what that form may do without changing what it is. A review
 * is the case that needs it: the words are a client's, so the job on this
 * surface is moderation and the popup offers hide and archive only. Passed as a
 * string rather than inferred from the type, because the same type is edited in
 * full in the Studio — it is a statement about *this surface*, not about
 * reviews.
 *
 * @param {string|object} doc
 * @param {string|object} type  the content type, or its name
 * @param {string} [actions]    e.g. `ACTIONS_MODERATE`
 */
export function editableDoc(doc, type, actions) {
  if (!isEditMode()) return NONE

  const id = docId(doc)
  // Accepts the type object as well as its name, because a component that has
  // one in hand should not have to remember which property holds the name.
  const name = typeof type === "string" ? type.trim() : fieldName(type?.name)
  if (!id || !name) return NONE

  const attrs = { [DOC_ATTR]: id, [KIND_ATTR]: KIND_DOCUMENT, [TYPE_ATTR]: name }
  const narrowed = fieldName(actions)
  if (narrowed) attrs[ACTIONS_ATTR] = narrowed
  return attrs
}

/**
 * A link or a button, in one of three shapes — decided by which fields are
 * passed, not by a mode.
 *
 *     editableLink(doc, { text: "items.0.label" })            // stays on this page
 *     editableLink(doc, { text: "title", href: "url" })       // goes elsewhere
 *     editableLink(doc, { href: "instagram" })                // an icon
 *
 * A link that goes somewhere on the same page has nothing to retarget, so only
 * its words are editable. A link to another page has both. An icon has no words
 * on screen at all, so it has only a target. There is no fourth attribute saying
 * which of the three this is, and therefore no way for the annotation and the
 * affordance to disagree: the overlay offers exactly what is here.
 *
 * **`MyButton` is never annotated with this.** See `CREDIT_HOST` in ./attrs —
 * the overlay refuses a link pointing there even if this is called on one.
 *
 * @param {string|object} doc
 * @param {{text?: string, href?: string}} fields
 */
export function editableLink(doc, { text, href } = {}) {
  if (!isEditMode()) return NONE

  const id = docId(doc)
  const label = fieldName(text)
  const target = fieldName(href)
  // Neither half is required, but one of them is: an annotation carrying only a
  // document id is an element that highlights and then offers nothing.
  if (!id || (!label && !target)) return NONE

  const attrs = { [DOC_ATTR]: id, [KIND_ATTR]: KIND_LINK }
  if (label) attrs[FIELD_ATTR] = label
  if (target) attrs[HREF_ATTR] = target
  return attrs
}

export default editable
