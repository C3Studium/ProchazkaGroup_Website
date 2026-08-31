import { Modal } from "../ui/Modal"
import MediaLibrary from "./MediaLibrary"

/**
 * Picker mode for `image` and `file` fields. It is the same library, in a modal,
 * so an editor who learns the media screen already knows how to fill an image
 * field.
 *
 * Clicking a tile MARKS it; the bar's Použít is what hands it over. That is one
 * click more than picking on the first tap, and it is the click that makes room
 * for the other two things this popup now offers — cropping the picture before
 * taking it, and taking several at once for a field that holds several.
 */
export default function MediaPicker({ open, onClose, onSelect, selectedId, multiple = false, accept = null, title = "Vyberte obrázek" }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Označte obrázek a potvrďte Použít. Nebo sem přetáhněte nový."
      size="xl"
    >
      <MediaLibrary
        mode="pick"
        selectedId={selectedId}
        multiple={multiple}
        accept={accept}
        onPick={(picked) => {
          onSelect(picked)
          onClose()
        }}
      />
    </Modal>
  )
}
