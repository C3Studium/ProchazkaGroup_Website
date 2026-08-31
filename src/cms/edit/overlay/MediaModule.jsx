import MediaLibrary from "@/cms/studio/media/MediaLibrary"

/**
 * Picking an image, without a second media library.
 *
 * There is one media browser in this project and this is it — the same
 * `MediaLibrary` the Studio's own screen and its image fields render, in "pick"
 * mode. Copying its grid, its upload zone and its missing-alt warning into the
 * overlay would have produced a second thing that is right on the day it is
 * written and wrong after the first change to either.
 *
 * That reasoning is why this file is three lines: the scrim, the header, the
 * data port and the Studio provider it used to own moved into `Popup.jsx` when
 * the other bodies arrived, because all of them needed exactly the same frame.
 * What is left is the library, and it is now a body used *inside* two others —
 * `ImageModule` puts the current picture above it, `SetModule` puts the set
 * above it — which is why it is still worth its own file.
 *
 * **Uploading works.** The note here used to say it did not, because the
 * file-backed store had no object store behind it and `media.upload` refused in
 * words. It has one: `server/ports/fileStorage.js` writes the bytes, the type
 * and dimensions are read back out of them, and the asset is served from
 * `/api/cms/asset/<key>`. The affordance is the library's own — the button in
 * its bar and the drop zone around the grid — and in `pick` mode a single
 * uploaded file is handed straight back as the pick, so uploading and choosing
 * are one gesture.
 */
export default function MediaModule({ onPick, selectedId, accept = "image/*" }) {
  // `accept` defaults to images because both callers are image surfaces. It is
  // a parameter rather than a constant so a field type that accepts something
  // else — `file`, with `accept: "*/*"` — reaches the same library without this
  // file learning about it.
  return <MediaLibrary mode="pick" onPick={onPick} selectedId={selectedId} accept={accept} />
}
