import { useState } from "react"
import { usePort, useRevision } from "../context/StudioProvider"
import { useToast } from "../context/ToastProvider"
import { useAsync, useDebounced } from "../hooks/useAsync"
import { formatBytes, formatRelative } from "../lib/format"
import { Button, IconButton, SearchInput } from "../ui/controls"
import { EmptyState, ErrorState, SkeletonGrid } from "../ui/feedback"
import { ConfirmDialog } from "../ui/Modal"
import Icon from "../ui/Icon"
import UploadZone from "./UploadZone"
import styles from "./media.module.scss"

const PER_PAGE = 30

/**
 * The media browser, shared by the library screen and the image-field picker.
 * `mode` changes what a click means — selecting for a field, or opening the
 * detail panel to edit alt text — and nothing else, so the two never diverge.
 */
export default function MediaLibrary({ mode = "manage", onPick, selectedId, footerSlot }) {
  const port = usePort()
  const toast = useToast()
  const { bump } = useRevision()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [active, setActive] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const debounced = useDebounced(search)

  const { data, error, loading, reload } = useAsync(
    () => port.media.list({ page, perPage: PER_PAGE, search: debounced }),
    [port, page, debounced, nonce],
  )

  const assets = data?.rows || []
  const total = data?.total || 0
  const missingAlt = assets.filter((asset) => !asset.alt?.trim()).length

  const refresh = () => setNonce((current) => current + 1)

  const saveAlt = async (asset, alt) => {
    try {
      const updated = await port.media.update(asset.id, { alt })
      setActive(updated)
      refresh()
      bump()
      toast.success("Popis uložen")
    } catch (failure) {
      toast.error("Popis se nepodařilo uložit", { description: failure?.message })
    }
  }

  const remove = async (asset) => {
    try {
      await port.media.remove(asset.id)
      setConfirming(null)
      setActive(null)
      refresh()
      bump()
      toast.success("Soubor smazán")
    } catch (failure) {
      toast.error("Smazání selhalo", { description: failure?.message })
    }
  }

  return (
    <div className={styles.library}>
      <UploadZone
        onUploaded={(uploaded) => {
          refresh()
          bump()
          // Straight into the detail panel: alt text is easiest to write while
          // the editor still remembers what they just uploaded.
          if (mode === "manage") setActive(uploaded[0])
          if (mode === "pick" && uploaded.length === 1) onPick?.(uploaded[0])
          toast.success(`Nahráno ${uploaded.length} ${uploaded.length === 1 ? "soubor" : "souborů"}`)
        }}
      >
        {({ open }) => (
          <>
            <div className={styles.libraryBar}>
              <SearchInput value={search} onChange={setSearch} placeholder="Hledat podle názvu nebo popisu…" />
              {missingAlt > 0 ? (
                <span className={styles.altWarning} title="Obrázky bez popisu jsou nepřístupné a horší pro SEO">
                  <Icon name="warning" size={12} />
                  {missingAlt} bez popisu
                </span>
              ) : null}
              <span className={styles.grow} />
              <span className={styles.count}>{total} souborů</span>
              <Button variant="secondary" icon="upload" onClick={open}>
                Nahrát
              </Button>
            </div>

            <div className={styles.libraryBody}>
              {loading && !data ? (
                <SkeletonGrid count={12} />
              ) : error ? (
                <ErrorState error={error} onRetry={reload} />
              ) : assets.length === 0 ? (
                <EmptyState
                  icon="image"
                  title={search ? "Nic nenalezeno" : "Knihovna je prázdná"}
                  description={
                    search
                      ? `Pro „${search}" tu není žádný soubor. Zkuste jiný výraz.`
                      : "Přetáhněte sem obrázky, nebo je vyberte tlačítkem Nahrát."
                  }
                  action={
                    search ? (
                      <Button variant="secondary" onClick={() => setSearch("")}>
                        Zrušit hledání
                      </Button>
                    ) : (
                      <Button variant="primary" icon="upload" onClick={open}>
                        Nahrát obrázky
                      </Button>
                    )
                  }
                />
              ) : (
                <div className={styles.grid}>
                  {assets.map((asset) => (
                    <AssetTile
                      key={asset.id}
                      asset={asset}
                      selected={selectedId === asset.id || active?.id === asset.id}
                      onClick={() => (mode === "pick" ? onPick?.(asset) : setActive(asset))}
                    />
                  ))}
                </div>
              )}

              {total > PER_PAGE ? (
                <div className={styles.pager}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="chevronLeft"
                    disabled={page === 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Předchozí
                  </Button>
                  <span className={styles.pagerLabel}>
                    {page} / {Math.ceil(total / PER_PAGE)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconRight="chevronRight"
                    disabled={page >= Math.ceil(total / PER_PAGE)}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Další
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </UploadZone>

      {active && mode === "manage" ? (
        <AssetDetail
          asset={active}
          onClose={() => setActive(null)}
          onSave={saveAlt}
          onDelete={() => setConfirming(active)}
        />
      ) : null}

      {footerSlot}

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Smazat soubor?"
        description={`„${confirming?.filename}" bude odstraněn. Pokud je použit v nějakém dokumentu, zůstane tam prázdné místo.`}
        confirmLabel="Smazat"
        onClose={() => setConfirming(null)}
        onConfirm={() => remove(confirming)}
      />
    </div>
  )
}

function AssetTile({ asset, selected, onClick }) {
  return (
    <button type="button" className={`${styles.tile} ${selected ? styles.tileSelected : ""}`} onClick={onClick}>
      <span className={styles.thumb}>
        {/* Plain <img>: sources include blob: URLs from the dev port and remote
            storage hosts that next/image would need configuring for. */}
        <img src={asset.url} alt={asset.alt || ""} loading="lazy" />
      </span>
      <span className={styles.tileMeta}>
        <span className={styles.tileName}>{asset.filename}</span>
        <span className={styles.tileSub}>
          {asset.width && asset.height ? `${asset.width}×${asset.height}` : formatBytes(asset.size)}
        </span>
      </span>
      {!asset.alt?.trim() ? (
        <span className={styles.tileFlag} title="Chybí popis obrázku">
          <Icon name="warning" size={11} />
        </span>
      ) : null}
    </button>
  )
}

function AssetDetail({ asset, onClose, onSave, onDelete }) {
  const [alt, setAlt] = useState(asset.alt || "")
  const dirty = alt !== (asset.alt || "")

  return (
    <aside className={styles.detail} key={asset.id}>
      <div className={styles.detailHead}>
        <h3 className={styles.detailTitle}>Detail souboru</h3>
        <IconButton icon="close" label="Zavřít" onClick={onClose} />
      </div>

      <div className={styles.detailBody}>
        <div className={styles.detailPreview}>
          <img src={asset.url} alt={asset.alt || ""} />
        </div>

        <label className={styles.detailLabel} htmlFor={`alt-${asset.id}`}>
          Popis obrázku (alt)
        </label>
        <textarea
          id={`alt-${asset.id}`}
          className={styles.detailInput}
          rows={3}
          value={alt}
          placeholder="Co je na obrázku vidět?"
          onChange={(event) => setAlt(event.target.value)}
        />
        <p className={styles.detailHint}>
          Přečtou ho odečítače obrazovky a vyhledávače. Popisujte obsah, ne „obrázek".
        </p>

        <dl className={styles.detailFacts}>
          <div>
            <dt>Soubor</dt>
            <dd title={asset.filename}>{asset.filename}</dd>
          </div>
          <div>
            <dt>Rozměry</dt>
            <dd>{asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "—"}</dd>
          </div>
          <div>
            <dt>Velikost</dt>
            <dd>{formatBytes(asset.size)}</dd>
          </div>
          <div>
            <dt>Nahráno</dt>
            <dd>{formatRelative(asset.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.detailFoot}>
        <Button variant="danger" icon="trash" size="sm" onClick={onDelete}>
          Smazat
        </Button>
        <span className={styles.grow} />
        <Button variant="primary" size="sm" disabled={!dirty} onClick={() => onSave(asset, alt)}>
          Uložit popis
        </Button>
      </div>
    </aside>
  )
}
