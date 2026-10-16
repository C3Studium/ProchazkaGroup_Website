// The attribute names of Contract A′, in one place.
//
// They are a public contract in the literal sense: the `editable*()` helpers
// write them, the overlay reads them back off the DOM, and the two never speak
// to each other any other way. A string typed twice is a feature that works
// until someone renames half of it, so nothing else in this folder spells them
// out.

export const DOC_ATTR = "data-cms-doc"
export const FIELD_ATTR = "data-cms-field"
export const KIND_ATTR = "data-cms-kind"

/**
 * The field path of a link's target, when the target is editable.
 *
 * Separate from `FIELD_ATTR` rather than a second value in it, because a link
 * that carries both is carrying two *different* fields — the visible label and
 * the URL — and the overlay offers a different affordance for each. See the
 * three shapes in `editableLink`.
 */
export const HREF_ATTR = "data-cms-href"

/** The content type behind a whole-document annotation, so the popup can find
 *  the schema without a round trip. */
export const TYPE_ATTR = "data-cms-type"

/**
 * The name of the inline emphasis this field carries, when it carries any.
 *
 * The overlay cannot work this out by looking: a rule loose enough to find the
 * accent span in Offers finds WhoWeAre's per-character reveal spans too. So the
 * fact is declared on the field (`options.mark` in the schema), travels here,
 * and is looked up in `@/cms/schemas/marks` by the overlay — which is in the
 * Studio's bundle, where the encode/decode pair may live. Absent on almost every
 * annotated element, and absent everywhere outside the preview.
 */
export const MARK_ATTR = "data-cms-mark"

/**
 * An element that only REFLECTS a field it does not edit.
 *
 * The overlay's optimistic state is the DOM of the one element the annotation
 * sits on — so when the same value is drawn on the page a second time (a table
 * of contents, a breadcrumb, the other faces of a flip animation), that copy
 * learns about a keystroke only after save-and-rerender, and an editor watches
 * two "same" texts disagree while typing. Before this attribute every project
 * solved that with its own MutationObserver on the edited element.
 *
 * Value: `"<doc>:<field>"` — the same id and field path the source element's
 * annotation carries, split at the FIRST colon (a field path can contain dots
 * but never a colon). While that field is being edited in place, the overlay
 * rewrites the mirror's text alongside the edited element; on cancel it puts
 * the mirror's own nodes back, exactly as it does for the element itself.
 *
 * A mirror is a reflection, not a second place to edit: it is deliberately NOT
 * part of EDITABLE_SELECTOR, the hit-test never offers it, and an element that
 * carries both a mirror and a field annotation is treated as a source (the
 * mirror half is ignored) — reflecting a field into the element that edits it
 * would feed the editor its own output.
 */
export const MIRROR_ATTR = "data-cms-mirror"

/** The attribute's value for one field of one document — the one spelling,
 *  written here so the helper and the overlay cannot drift. */
export const mirrorValue = (docId, field) => `${docId}:${field}`

/**
 * Every annotated element.
 *
 * Three alternatives rather than one, because "a document id plus a field path"
 * stopped being the only complete annotation. A whole-document annotation names
 * a type and no field; an icon link names a target and no field. What every
 * branch keeps is the original property — a document id **and** something to do
 * with it, never an id on its own, because a half-annotation looks editable, is
 * picked up by the overlay, and posts a save that cannot be routed.
 */
export const EDITABLE_SELECTOR =
  `[${DOC_ATTR}][${FIELD_ATTR}], [${DOC_ATTR}][${HREF_ATTR}], [${DOC_ATTR}][${TYPE_ATTR}]`

/**
 * How a popup is narrowed, when it is narrowed at all.
 *
 * `moderate` is the only value today: a review is a client's words, so its
 * `document` popup offers hide and archive and nothing else. It is an attribute
 * rather than a sixth kind because the *shape* is unchanged — one document, one
 * form — and what differs is which of that form's actions an editor is allowed.
 * Absent means "everything this kind offers".
 */
/**
 * „Tenhle prvek zůstává v režimu úprav živý."
 *
 * V režimu úprav je stránka exponát: štít přes celou plochu pohltí hover i klik,
 * takže se k prvkům nedostane nic (viz `silencePage` v overlay/Overlay.jsx).
 * U většiny stránky je to správně — shader nemá reagovat, odkaz nemá vést pryč.
 *
 * Jenže některý obsah je vidět teprve potom, co se na něj sáhne: dlaždice, která
 * ukáže popisek až při najetí, karta poradce, která se rozbalí až po kliknutí.
 * Ten obsah je editovatelný, ale editor se k němu nedostane, protože se k němu
 * nedostane ukazatel — a vypadá to, že úpravy nefungují.
 *
 * Prvek s tímhle atributem dostane ve štítu díru: události k němu chodí
 * doopravdy, takže jeho vlastní hover i klik fungují jako na webu. Co se
 * NEDĚJE, je navigace — odkaz uvnitř se aktivuje, ale nikam nevede, protože
 * odejít ze stránky uprostřed úprav není totéž co rozbalit dlaždici.
 */
/**
 * Kořen povrchu — „když se edituje TENHLE povrch, platí jen to, co je uvnitř".
 *
 * Modál leží nad stránkou, ale stránka pod ním nezmizela: patičku i hero
 * vykresluje `_app` dál a hit-test je hledá geometricky po celém dokumentu.
 * Editor pak klikne vedle dlaždice a označí se mu text, který je o dvě vrstvy
 * níž a v modálu vůbec není — nebo hůř, uloží do něj to, co psal do modálu.
 *
 * Hodnotou je jméno povrchu, aby se kořeny dvou povrchů na téže stránce
 * nepletly. Platí jen tehdy, když Studio ten povrch opravdu edituje; jindy se
 * hit-test chová jako vždycky, tedy přes celou stránku.
 */
export const SURFACE_ROOT_ATTR = "data-cms-surface-root"

export const INTERACTIVE_ATTR = "data-cms-interactive"

export const ACTIONS_ATTR = "data-cms-actions"
export const ACTIONS_MODERATE = "moderate"

export const KIND_TEXT = "text"
/** One block, several stored strings. See `editableLines`. */
export const KIND_LINES = "lines"
export const KIND_IMAGE = "image"
export const KIND_IMAGE_SET = "imageSet"
/** An array of objects — a Q&A pair, a whole list of them — edited whole. */
export const KIND_LIST = "list"
export const KIND_DOCUMENT = "document"
export const KIND_LINK = "link"

/**
 * The `*` of a `lines` field path, and how to turn it into a real one.
 *
 * `items.*.label` is the spelling `@/cms/schemas/marks` already uses for "the
 * one member of this list", so the annotation says which array it is a line of
 * without also having to say how many lines there are — which is the number the
 * editor is about to change.
 */
export const LINE_WILDCARD = "*"
export const linePath = (template, index) => String(template).replace(LINE_WILDCARD, String(index))
/** The array a `lines` template is a member of: `items.*.label` -> `items`. */
export const lineArrayPath = (template) => String(template).split(`.${LINE_WILDCARD}.`)[0]
/** What each member holds the line in: `items.*.label` -> `label`. */
export const lineLeafPath = (template) => String(template).split(`.${LINE_WILDCARD}.`)[1] || ""

/**
 * The one link on this site that is never content — SEE `editableLink`.
 *
 * `components/common/ui/stickyButtons/buttons/MyButton` renders "Kód od C3
 * Studium" pointing at this host. It is the developer's own credit rather than
 * the client's copy, and the ask names it as the single link that is out of
 * scope. Stated here rather than only in prose because prose is not checkable:
 * the overlay matches a selected link's live target against this and refuses to
 * offer editing, so the rule holds even if somebody annotates that button by
 * mistake later. Matched on the host, so http/https and a trailing slash are the
 * same answer.
 */
export const CREDIT_HOST = "matejforejt.com"
