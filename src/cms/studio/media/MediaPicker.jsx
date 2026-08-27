import { Modal } from "../ui/Modal"
import MediaLibrary from "./MediaLibrary"

/**
 * Picker mode for `image` and `file` fields. It is the same library, in a modal,
 * with clicking a tile meaning "choose this" — so an editor who learns the media
 * screen already knows how to fill an image field.
 */
export default function MediaPicker({ open, onClose, onSelect, selectedId, title = "Vyberte obrázek" }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Klikněte na obrázek, nebo sem přetáhněte nový."
      size="xl"
    >
      <MediaLibrary
        mode="pick"
        selectedId={selectedId}
        onPick={(asset) => {
          onSelect(asset)
          onClose()
        }}
      />
    </Modal>
  )
}
