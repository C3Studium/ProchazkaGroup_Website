import { useEffect, useState } from "react"
import { registerInput, registerKind } from "../registry"
import { usePort } from "../../context/StudioProvider"
import { useToast } from "../../context/ToastProvider"
import CropEditor from "@/cms/edit/overlay/CropEditor"
import { Modal } from "../../ui/Modal"
import MediaPicker from "../../media/MediaPicker"
import { isCroppableImage, resolveCropTarget } from "../../media/cropTarget"
import { Button, IconButton } from "../../ui/controls"
import Icon from "../../ui/Icon"
import styles from "./inputs.module.scss"

/**
 * Asset fields — `image` and `file`, told apart by `ui.assetKind`.
 *
 * The stored value is the asset object Contract 2's `media.upload` returns, kept
 * whole rather than reduced to an id: the public site renders `data` directly
 * and should not need a lookup per image to draw a page. The trade is that
 * editing alt text in the library does not retro-edit documents, which is the
 * right way round — a document's alt text can be context-specific.
 */
function AssetInput({ value, onChange, readOnly, assetKind = "image", title }) {
  const [picking, setPicking] = useState(false)
  const [cropping, setCropping] = useState(false)
  const isImage = assetKind === "image"

  // A migration can leave a bare URL string where an object is expected; render
  // it rather than showing an empty field over data that exists.
  const asset = typeof value === "string" ? { url: value } : value

  if (!asset) {
    return (
      <>
        <button type="button" className={styles.assetEmpty} disabled={readOnly} onClick={() => setPicking(true)}>
          <Icon name={isImage ? "image" : "folder"} size={17} strokeWidth={1.1} />
          <span>{isImage ? "Vybrat obrázek z knihovny" : "Vybrat soubor"}</span>
        </button>
        <Picker open={picking} isImage={isImage} title={title} onClose={() => setPicking(false)} onChange={onChange} />
      </>
    )
  }

  if (!isImage) {
    return (
      <>
        <div className={styles.fileRow}>
          <Icon name="document" size={15} />
          <a href={asset.url} target="_blank" rel="noreferrer" className={styles.fileName}>
            {asset.filename || asset.name || asset.url}
          </a>
          {!readOnly ? <IconButton icon="close" label="Odebrat" onClick={() => onChange(null)} /> : null}
        </div>
        <Picker open={picking} isImage={false} title={title} onClose={() => setPicking(false)} onChange={onChange} />
      </>
    )
  }

  return (
    <div className={styles.asset}>
      <div className={styles.assetFilled}>
        <span className={styles.assetThumb}>
          <img src={asset.url} alt={asset.alt || ""} />
        </span>
        <div className={styles.assetInfo}>
          <span className={styles.assetName}>{asset.filename || asset.alt || "Vybraný obrázek"}</span>
          {asset.alt?.trim() ? (
            <span className={styles.assetAlt}>{asset.alt}</span>
          ) : (
            <span className={styles.assetMissing}>
              <Icon name="warning" size={11} />
              Chybí popis obrázku
            </span>
          )}
          {!readOnly ? (
            <div className={styles.assetActions}>
              <Button size="sm" variant="ghost" icon="image" onClick={() => setPicking(true)}>
                Vyměnit
              </Button>
              {/* Between the two, because that is the order of the decisions:
                  is this the right picture, is it framed right, do I want it at
                  all. Only for a raster — a PDF in a file field has no crop. */}
              {isCroppableImage(asset) ? (
                <Button size="sm" variant="ghost" icon="fit" onClick={() => setCropping(true)}>
                  {asset.crop ? "Upravit ořez" : "Upravit"}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" icon="trash" onClick={() => onChange(null)}>
                Odebrat
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Picker
        open={picking}
        isImage
        title={title}
        selectedId={asset.id}
        onClose={() => setPicking(false)}
        onChange={onChange}
      />

      <CropDialog
        open={cropping}
        asset={asset}
        onClose={() => setCropping(false)}
        onChange={onChange}
      />
    </div>
  )
}

/**
 * The crop, in a dialog over the form.
 *
 * It writes the library row — one asset, same id, original kept
 * (server/media.js crop()) — and then hands the updated asset back to the
 * field, exactly as picking one does. Without that second half the row would
 * change and this field would go on showing the URL it was saved with; see
 * src/cms/MEDIA.md on why a crop applies where it was applied.
 */
function CropDialog({ open, asset, onClose, onChange }) {
  const port = usePort()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [target, setTarget] = useState(null)
  const [problem, setProblem] = useState(null)

  // The value may be a bare path or a legacy object with no id; the row it
  // points at is what can be cropped. See media/cropTarget.js.
  useEffect(() => {
    if (!open) return
    let live = true
    setTarget(null)
    setProblem(null)
    resolveCropTarget(port, asset)
      .then((found) => {
        if (!live) return
        if (found) setTarget(found)
        else setProblem("Tenhle soubor není v knihovně médií, takže ho nejde oříznout.")
      })
      .catch((failure) => live && setProblem(failure?.message || "Soubor se nepodařilo najít"))
    return () => {
      live = false
    }
  }, [open, port, asset])

  if (!open) return null

  const apply = async (rect) => {
    setBusy(true)
    try {
      const updated = await port.media.crop(target.id, rect)
      // The whole asset back into the field, which also upgrades a bare path or
      // a legacy object to the shape the picker writes.
      onChange(updated)
      onClose()
      toast.success(rect ? "Ořez uložen" : "Původní obrázek obnoven")
    } catch (failure) {
      toast.error("Ořez se nepodařilo uložit", { description: failure?.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title="Oříznout obrázek" onClose={onClose} size="xl">
      {problem ? (
        <p className={styles.assetMissing}>
          <Icon name="warning" size={12} />
          {problem}
        </p>
      ) : target ? (
        <CropEditor asset={target} busy={busy} onCancel={onClose} onApply={apply} onReset={() => apply(null)} />
      ) : null}
    </Modal>
  )
}

function Picker({ open, isImage, title, selectedId, onClose, onChange }) {
  return (
    <MediaPicker
      open={open}
      selectedId={selectedId}
      // An image field must not be offered the library's three .mp4 clips: the
      // value would be a valid asset object and the public page would render a
      // broken <img>. See MediaLibrary's matchesAccept.
      accept={isImage ? "image/*" : null}
      title={isImage ? `Vyberte obrázek${title ? `: ${title}` : ""}` : "Vyberte soubor"}
      onClose={onClose}
      // The whole asset, unmodified — the port owns its shape, not this input.
      onSelect={(asset) => onChange(asset)}
    />
  )
}

registerInput("image", AssetInput)
registerInput("file", AssetInput)
registerKind("asset", AssetInput)

export { AssetInput }
