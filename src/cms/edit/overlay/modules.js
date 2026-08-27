// The popup's bodies, and the one question that picks between them.
//
// `Popup.jsx` is the shell — the scrim, the dialog, the header, the data port
// and the Studio provider — and every kind that opens one shares all of it. What
// differs is the body, and there are now six of them. This module is the seam:
// the shell imports the resolver, the dispatch in `Overlay.jsx` imports the
// names, and neither has to know how many bodies exist or reach past this file
// to find one.
//
// It exists because two builds share this folder. The kind table, the annotation
// attributes and the control that opens a popup are `Overlay.jsx`/`attrs.js`;
// the bodies are here. A barrel means adding a body is one export and one line
// of `bodyFor`, rather than an edit to a file the other build is holding.
//
// ---------------------------------------------------------------------------
// The prop contract, stated once
//
// Every body is rendered by the shell with the props it names below. The shell
// passes them; `Overlay.jsx` supplies the values off the selection and the
// handlers that write.
//
//   ImageModule     docId, field, onPick, onAlt, onRemove, onClose
//   SetModule       docId, field, onCommit(list), onClose
//   ListModule      docId, field, onCommit(value), onClose
//   DocModule       docId, typeName, onSaved(doc), onClose
//   ModerateModule  docId, onModerated("unpublish" | "archive")
//   LinkModule      docId, field, hrefField, href, onCommit({text, href}), onClose
//
// `SetModule` and `ListModule` take and return the value at the annotated path,
// so a single `save(docId, field, value)` serves both — the same call the image
// bodies already make. Nothing here writes; the overlay's `save()` is the one
// path that serialises writes per field, tracks them for *Náhled* and reports
// the server's own sentence on the control. The one exception is
// `ModerateModule`, which calls `port.unpublish` / `port.archive` directly:
// those are not field writes, they touch no body, and there is nothing for the
// overlay to put back on the page.

import DocModule from "./DocModule"
import ImageModule from "./ImageModule"
import LinkModule from "./LinkModule"
import ListModule from "./ListModule"
import MediaModule from "./MediaModule"
import ModerateModule from "./ModerateModule"
import SetModule from "./SetModule"

export { DocModule, ImageModule, LinkModule, ListModule, MediaModule, ModerateModule, SetModule }

/**
 * Which body a popup shows.
 *
 * `actions` narrows a kind rather than adding one, which is the whole reason it
 * is a second attribute: a review and a partner are both `document` — the same
 * annotation, the same id, the same type registry — and what differs is what an
 * editor is allowed to do on this surface. Making "review" its own kind would
 * have put the name of a content type in the overlay's kind table, and next
 * year's read-only type would need another one.
 *
 * Unknown values fall through to the kind's own body rather than to nothing: an
 * annotation carrying an `actions` this build does not know is a page that is
 * ahead of the overlay, and the honest answer to that is the ordinary editor,
 * not an empty dialog.
 */
export function bodyFor(kind, actions) {
  if (kind === "document" && actions === "moderate") return ModerateModule
  if (kind === "document") return DocModule
  if (kind === "imageSet") return SetModule
  if (kind === "list") return ListModule
  if (kind === "link") return LinkModule
  return ImageModule
}

/**
 * The dialog's heading, per body — its accessible name as well as its title, so
 * the two cannot disagree.
 *
 * A document's is the type's own title, which is the word the editor knows the
 * thing by from the Studio's sidebar. A moderated one is not: "Recenze" would
 * name the record, and what the popup is for is the decision.
 */
export function titleFor(kind, actions, typeTitle, field) {
  if (kind === "document" && actions === "moderate") return "Recenze zákazníka"
  if (kind === "document") return typeTitle || "Upravit záznam"
  if (kind === "imageSet") return "Sada obrázků"
  // A path ending in an index is one member of the list, which is a different
  // thing to open even though it is the same body — the same discriminator
  // `ListModule` resolves against the schema, applied here to the path alone
  // because a heading may not wait for a document to load.
  if (kind === "list") return /\.\d+$/.test(String(field || "")) ? "Položka seznamu" : "Seznam položek"
  if (kind === "link") return "Odkaz"
  return "Obrázek"
}
