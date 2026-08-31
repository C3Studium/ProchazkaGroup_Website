import { useState } from "react"
import { usePort, useRevision } from "../context/StudioProvider"
import { useToast } from "../context/ToastProvider"
import { useAsync, useDebounced } from "../hooks/useAsync"
import { formatBytes, formatRelative } from "../lib/format"
import { Button, IconButton, SearchInput } from "../ui/controls"
import { EmptyState, ErrorState, SkeletonGrid } from "../ui/feedback"
import { ConfirmDialog } from "../ui/Modal"
import Icon from "../ui/Icon"
import CropEditor from "@/cms/edit/overlay/CropEditor"
import UploadZone from "./UploadZone"
import styles from "./media.module.scss"

const PER_PAGE = 30

/**
 * The media browser, shared by the library screen and the image-field picker.
 * `mode` changes what a click means — selecting for a field, or opening the
 * detail panel to edit alt text — and nothing else, so the two never diverge.
 */
/**
 * Does this asset belong in a field that asked for `accept`?
 *
 * The library holds more than pictures — the site's three .mp4 clips are rows
 * in it since public assets were imported — and an image field must not offer
 * one. A video picked into an `image` field renders as a broken <img> on the
 * public site, which is a fault nothing else in the chain would catch: the
 * value is a valid asset object, so the schema check passes.
 *
 * `accept` is the field type's own string ("image/*"), so the rule lives with
 * the field rather than being restated here.
 */
const matchesAccept = (asset, accept) => {
    if (!accept || accept === "*/*") return true
    const mime = String(asset?.mime || "")
    return accept
        .split(",")
        .map((entry) => entry.trim())
        .some((entry) =>
            entry.endsWith("/*") ? mime.startsWith(entry.slice(0, -1)) : mime === entry,
        )
}

/** Video needs its own element; an <img> pointed at an .mp4 is a broken icon. */
const Preview = ({ asset, lazy = false }) =>
    String(asset?.mime || "").startsWith("video/") ? (
        <video src={asset.url} muted playsInline preload="metadata" />
    ) : (
        <img src={asset.url} alt={asset.alt || ""} {...(lazy ? { loading: "lazy" } : {})} />
    )

export default function MediaLibrary({ mode = "manage", onPick, selectedId, footerSlot, accept = null, multiple = false }) {
  const port = usePort()
  const toast = useToast()
  const { bump } = useRevision()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [active, setActive] = useState(null)
  const [confirming, setConfirming] = useState(null)
  // Showing only the files with no description. A filter rather than a warning,
  // because the warning could be read and not acted on: an editor who sees "80
  // bez popisu" and wants to fix it has to find those eighty among a hundred
  // and sixteen thumbnails by eye.
  const [onlyMissing, setOnlyMissing] = useState(false)
  // Two derived groupings, neither of them a taxonomy anybody maintains: the
  // folder is the file's own path, and "used / unused" is whether any document
  // references it. See server/mediaUsage.js.
  const [folder, setFolder] = useState("")
  const [usage, setUsage] = useState("")
  /**
   * What is marked in the picker, before anything is handed back.
   *
   * Clicking used to pick and close in one gesture, which is fast and leaves
   * nowhere to stand: there is no moment at which a picture is chosen but not
   * yet committed, so there is nothing to crop, nothing to reconsider, and no
   * way to take several. Marking first costs one extra click and buys all
   * three.
   *
   * Ids rather than assets, so a refresh after a crop cannot leave a stale copy
   * of the row marked.
   */
  const [marked, setMarked] = useState([])
  const debounced = useDebounced(search)

  // Once, and not per page: the folder list is a property of the library, not
  // of the page being looked at.
  const { data: folders } = useAsync(() => port.media.folders(), [port, nonce])

  const { data, error, loading, reload } = useAsync(
    () =>
      port.media.list({
        page,
        perPage: PER_PAGE,
        search: debounced,
        missingAlt: onlyMissing,
        folder,
        usage,
        // Only the library screen asks where things are used; the picker inside
        // a popup does not, and that spares it a read of every document.
        withUsage: mode === "manage",
      }),
    [port, page, debounced, nonce, onlyMissing, folder, usage, mode],
  )

  // Filtered here rather than in the query: `accept` is a field's rule, and the
  // server's list endpoint is the same one the library screen uses with no rule
  // at all. Paging counts the unfiltered page, so a page of pure video reads as
  // "nic tu není" rather than as an error — which is the truthful answer for a
  // field that cannot take any of it.
  const assets = (data?.rows || []).filter((asset) => matchesAccept(asset, accept))
  const total = data?.total || 0
  // From the server, over the whole library. The client used to tally the page
  // it happened to be holding, which with 116 files and a page of 24 reported a
  // fraction of the real number — and reported it as reassurance.
  const missingAlt = data?.missingAlt || 0

  const markedAssets = assets.filter((asset) => marked.includes(asset.id))
  const [cropping, setCropping] = useState(null)
  const [cropBusy, setCropBusy] = useState(false)

  const refresh = () => setNonce((current) => current + 1)

  /**
   * Re-frame a file from the library screen.
   *
   * Same call the on-page popup makes — one library row, id unchanged, the
   * original kept so the frame can be widened again (server/media.js crop()).
   * `setActive` with the answer rather than a reload, because the detail panel
   * is looking at this asset and has to show the new dimensions immediately;
   * `refresh` behind it updates the grid's thumbnail.
   */
  const cropAsset = async (asset, rect) => {
    try {
      const updated = await port.media.crop(asset.id, rect)
      setActive(updated)
      refresh()
      bump()
      toast.success(rect ? "Ořez uložen" : "Původní obrázek obnoven")
    } catch (failure) {
      toast.error("Ořez se nepodařilo uložit", { description: failure?.message })
      throw failure
    }
  }

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

  /**
   * Still called `remove`, and it ARCHIVES.
   *
   * The name is Contract 2's; the behaviour is server/media.js's since the
   * Archive landed. Nothing outside the Archive destroys a file any more —
   * ARCHIVE.md: "media.remove se mění na archivaci, mazací tlačítka jinde mizí"
   * — because an editor tidying the library must not be able to take the
   * pictures out from under every revision that still refers to them.
   *
   * The wording here follows the behaviour rather than the method name. Leaving
   * "Smazat" on a button that archives would be the worst of both: a person
   * would hesitate over a reversible action and would be told a file was
   * destroyed when it was not.
   */
  const remove = async (asset) => {
    try {
      await port.media.remove(asset.id)
      setConfirming(null)
      setActive(null)
      refresh()
      bump()
      toast.success("Vyřazeno z knihovny", {
        description: "Soubor zůstává v archivu a starší verze stránek ho pořád mají.",
      })
    } catch (failure) {
      toast.error("Vyřazení selhalo", { description: failure?.message })
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
          // Marked, not picked. Uploading used to hand the file straight back
          // and close, which was the fastest path when clicking a tile did the
          // same thing. Now that choosing is two steps, an upload that skipped
          // the second one would be the only way into this popup that cannot be
          // cropped or reconsidered.
          if (mode === "pick") setMarked(uploaded.map((asset) => asset.id))
          toast.success(`Nahráno ${uploaded.length} ${uploaded.length === 1 ? "soubor" : "souborů"}`)
        }}
      >
        {({ open }) => (
          <>
            <div className={styles.libraryBar}>
              <SearchInput value={search} onChange={setSearch} placeholder="Hledat podle názvu nebo popisu…" />
              {missingAlt > 0 || onlyMissing ? (
                <button
                  type="button"
                  className={styles.altWarning}
                  data-active={onlyMissing ? "true" : undefined}
                  title={
                    onlyMissing
                      ? "Zpět na celou knihovnu"
                      : "Ukázat jen soubory bez popisu — bez něj jsou nepřístupné a horší pro SEO"
                  }
                  onClick={() => {
                    // Page 1: the filtered set is shorter, and staying on page
                    // four of a list that now has one page shows nothing at all.
                    setPage(1)
                    setOnlyMissing((current) => !current)
                  }}
                >
                  <Icon name="warning" size={12} />
                  {onlyMissing ? `Chybí popisek: ${missingAlt} — zobrazit vše` : `Chybí popisek (${missingAlt})`}
                </button>
              ) : null}
              {folders?.length ? (
                <select
                  className={styles.filterSelect}
                  value={folder}
                  aria-label="Složka"
                  onChange={(event) => {
                    setPage(1)
                    setFolder(event.target.value)
                  }}
                >
                  <option value="">Všechny složky</option>
                  {folders.map((entry) => (
                    <option key={entry.path} value={entry.path}>
                      {entry.path.replace(/^\/?assets\//, "").replace(/^\//, "")} ({entry.count})
                    </option>
                  ))}
                </select>
              ) : null}

              <select
                className={styles.filterSelect}
                value={usage}
                aria-label="Použití"
                onChange={(event) => {
                  setPage(1)
                  setUsage(event.target.value)
                }}
              >
                <option value="">Použité i nepoužité</option>
                <option value="used">Jen použité</option>
                <option value="unused">Jen nepoužité</option>
              </select>

              <span className={styles.grow} />
              <span className={styles.count}>{total} souborů</span>

              {mode === "pick" ? (
                <>
                  {/* Only for one marked raster: cropping two pictures to the
                      same rectangle is not a thing anybody means. */}
                  <Button
                    variant="secondary"
                    icon="fit"
                    disabled={markedAssets.length !== 1 || !String(markedAssets[0]?.mime || "").startsWith("image/")}
                    onClick={() => setCropping(markedAssets[0])}
                  >
                    Oříznout
                  </Button>
                  <Button
                    variant="primary"
                    icon="check"
                    disabled={!markedAssets.length}
                    onClick={() => onPick?.(multiple ? markedAssets : markedAssets[0])}
                  >
                    {multiple && markedAssets.length > 1 ? `Použít (${markedAssets.length})` : "Použít"}
                  </Button>
                </>
              ) : null}
              <Button variant="secondary" icon="upload" onClick={open}>
                Nahrát
              </Button>
            </div>

            <div className={styles.libraryBody}>
              {/* In place of the grid, not in a dialog over it: the picker is
                  already inside a modal, and a modal over a modal is a stack
                  the escape key cannot unwind predictably. */}
              {cropping ? (
                <CropEditor
                  asset={cropping}
                  busy={cropBusy}
                  onCancel={() => setCropping(null)}
                  onApply={async (rect) => {
                    setCropBusy(true)
                    try {
                      await cropAsset(cropping, rect)
                      setCropping(null)
                    } finally {
                      setCropBusy(false)
                    }
                  }}
                  onReset={async () => {
                    setCropBusy(true)
                    try {
                      await cropAsset(cropping, null)
                      setCropping(null)
                    } finally {
                      setCropBusy(false)
                    }
                  }}
                />
              ) : loading && !data ? (
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
                      marked={marked.includes(asset.id)}
                      onClick={() => {
                        if (mode !== "pick") return setActive(asset)
                        setMarked((current) =>
                          multiple
                            ? current.includes(asset.id)
                              ? current.filter((id) => id !== asset.id)
                              : [...current, asset.id]
                            : current.includes(asset.id)
                              ? []
                              : [asset.id],
                        )
                      }}
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
          onCrop={cropAsset}
          onDelete={() => setConfirming(active)}
        />
      ) : null}

      {footerSlot}

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Vyřadit soubor z knihovny?"
        tone="secondary"
        description={
          `„${confirming?.filename}" zmizí z knihovny, ale nesmaže se: zůstane v archivu a všechny starší ` +
          "verze stránek ho dál zobrazují. Pokud je použitý na publikované stránce, zůstane tam i nadále. " +
          "Opravdu smazat jde jen v Archivu."
        }
        confirmLabel="Vyřadit z knihovny"
        onClose={() => setConfirming(null)}
        onConfirm={() => remove(confirming)}
      />
    </div>
  )
}

function AssetTile({ asset, selected, marked, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.tile} ${selected ? styles.tileSelected : ""} ${marked ? styles.tileMarked : ""}`}
      aria-pressed={marked ? "true" : undefined}
      onClick={onClick}
    >
      <span className={styles.thumb}>
        {/* Plain <img>/<video>: sources include blob: URLs from the dev port
            and remote storage hosts that next/image would need configuring for. */}
        <Preview asset={asset} lazy />
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

/** Which page a block belongs to, in the words the Studio uses elsewhere. */
const PAGE_TITLES = {
  index: "Úvodní stránka",
  "o-nas": "O nás",
  nabidka: "Nabídka",
  nabidky: "Slevy partnerů",
  "benefit-program": "Benefit program",
  recenze: "Recenze",
  kontakt: "Kontakt",
  cookies: "Cookies",
  "ochrana-soukromi": "Ochrana soukromí",
  global: "Společné (patička, kontakt)",
}

/**
 * Where this file appears.
 *
 * The question an editor actually has before archiving something, and the one
 * the library could not answer until now — 74 of 116 files are referenced by
 * nothing at all, and there was no way to tell which.
 */
function AssetUsage({ places }) {
  if (!places) return null

  if (!places.length) {
    return (
      <p className={styles.usageNone}>
        <Icon name="warning" size={12} />
        Nikde se nepoužívá — je bezpečné ho archivovat.
      </p>
    )
  }

  return (
    <div className={styles.usage}>
      <p className={styles.detailLabel}>Používá se na {places.length} místech</p>
      <ul className={styles.usageList}>
        {places.map((place) => (
          <li key={`${place.id}-${place.key || ""}`}>
            <span className={styles.usageWhere}>{PAGE_TITLES[place.page] || place.page || place.type}</span>
            <span className={styles.usageWhat}>{place.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AssetDetail({ asset, onClose, onSave, onDelete, onCrop }) {
  const [alt, setAlt] = useState(asset.alt || "")
  const [cropping, setCropping] = useState(false)
  const [busy, setBusy] = useState(false)
  const dirty = alt !== (asset.alt || "")
  // PDFs and the three .mp4 clips are library rows too, and neither has a crop.
  const croppable = String(asset.mime || "").startsWith("image/")

  const apply = async (rect) => {
    setBusy(true)
    try {
      await onCrop(asset, rect)
      setCropping(false)
    } finally {
      setBusy(false)
    }
  }

  if (cropping) {
    return (
      <aside className={styles.detail} key={`${asset.id}-crop`}>
        <div className={styles.detailHead}>
          <h3 className={styles.detailTitle}>Oříznout</h3>
          <IconButton icon="close" label="Zavřít" onClick={() => setCropping(false)} />
        </div>
        <CropEditor
          asset={asset}
          busy={busy}
          onCancel={() => setCropping(false)}
          onApply={apply}
          onReset={() => apply(null)}
        />
      </aside>
    )
  }

  return (
    <aside className={styles.detail} key={asset.id}>
      <div className={styles.detailHead}>
        <h3 className={styles.detailTitle}>Detail souboru</h3>
        <IconButton icon="close" label="Zavřít" onClick={onClose} />
      </div>

      <div className={styles.detailBody}>
        <div className={styles.detailPreview}>
          <Preview asset={asset} />
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

        <AssetUsage places={asset.usedIn} />

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
        {/* Not `danger`, because it is not destructive any more — see `remove`
            above. The one button in this admin that destroys a file lives in
            the Archive and says so. */}
        <Button variant="secondary" icon="archive" size="sm" onClick={onDelete}>
          Vyřadit z knihovny
        </Button>
        {croppable ? (
          <Button variant="secondary" icon="image" size="sm" onClick={() => setCropping(true)}>
            {asset.crop ? "Upravit ořez" : "Oříznout"}
          </Button>
        ) : null}
        <span className={styles.grow} />
        <Button variant="primary" size="sm" disabled={!dirty} onClick={() => onSave(asset, alt)}>
          Uložit popis
        </Button>
      </div>
    </aside>
  )
}
