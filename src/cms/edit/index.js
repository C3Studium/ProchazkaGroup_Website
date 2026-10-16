// Visual editing — the half of it the site itself is allowed to import.
//
// `import { editable } from "./index.js"` appears in components that are on the
// public homepage, so this barrel is deliberately three lines long and reaches
// nothing else. The overlay, the media module and the Studio components they
// pull in are behind `./overlay/mount`, which only the preview host imports, and
// which loads the component tree through `import()` so it lands in its own async
// chunk of the Studio's build.
//
// Adding an export here that touches `overlay/` would put the entire editing
// surface into the public bundle. Do not. The four helpers below reach exactly
// two modules — ./attrs, which is a list of strings, and ./mode, which is one
// boolean — and that is the whole of what a public route downloads about
// editing.
//
// `./arm` is the one other module the site layer loads — `_app` calls it, on
// every route — and it is deliberately not exported here: it is not something a
// component asks for, and keeping it out of this barrel keeps the barrel's rule
// easy to check.

export {
  editable,
  editable as default,
  editableDoc,
  editableIn,
  editableLines,
  editableLink,
  editableList,
  editableMirror,
  editableSet,
  interactive,
} from "./editable.js"
export { isEditMode } from "./mode.js"
// Živý náhled povrchu (docs/I18N.md §7.3). Tady smí být ze stejného důvodu jako
// `isEditMode`: sahá na `react` a na ../preview/frame.js, což je seznam
// řetězců, a na nic z `overlay/`. Na veřejném webu vrací vždycky `false`.
export { SURFACE_ATTR, surfaceRoot, useStudioSurface } from "./surface.js"
export {
  ACTIONS_ATTR,
  ACTIONS_MODERATE,
  CREDIT_HOST,
  DOC_ATTR,
  EDITABLE_SELECTOR,
  FIELD_ATTR,
  HREF_ATTR,
  KIND_ATTR,
  MARK_ATTR,
  MIRROR_ATTR,
  TYPE_ATTR,
} from "./attrs.js"
