import MediaLibrary from "../media/MediaLibrary"
import { ViewHeader } from "./ViewLayout"

/**
 * The media screen is the library component at full size. The picker used by
 * image fields is the same component in a modal, so anything learned here
 * transfers — and there is only one place where uploading, alt text and
 * deletion are implemented.
 */
export default function MediaView() {
  return (
    <>
      <ViewHeader
        title="Knihovna médií"
        subtitle="Obrázky pro celý web. Přetáhněte soubory kamkoli do knihovny."
      />
      <MediaLibrary mode="manage" />
    </>
  )
}
