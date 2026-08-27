import { useState } from "react"
import { registerInput, registerKind } from "../registry"
import MediaPicker from "../../media/MediaPicker"
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
    </div>
  )
}

function Picker({ open, isImage, title, selectedId, onClose, onChange }) {
  return (
    <MediaPicker
      open={open}
      selectedId={selectedId}
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
