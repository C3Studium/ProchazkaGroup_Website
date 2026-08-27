import { useCallback, useRef, useState } from "react"
import { usePort } from "../context/StudioProvider"
import { useToast } from "../context/ToastProvider"
import Icon from "../ui/Icon"
import styles from "./media.module.scss"

/**
 * Drag-and-drop upload.
 *
 * Two details that decide whether this feels reliable: a drag counter, because
 * `dragleave` fires when the pointer crosses a child element and a naive
 * implementation flickers the drop state; and per-file progress, because a
 * photographer's 6 MB JPEG on a hotel wifi looks like a hang otherwise.
 */
export default function UploadZone({ onUploaded, compact, children }) {
  const port = usePort()
  const toast = useToast()
  const input = useRef(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [queue, setQueue] = useState([])

  const upload = useCallback(
    async (files) => {
      const images = Array.from(files).filter((file) => file.type.startsWith("image/"))
      const rejected = files.length - images.length
      if (rejected > 0) {
        toast.error(`${rejected} ${rejected === 1 ? "soubor nebyl" : "souborů nebylo"} nahráno`, {
          description: "Nahrát lze jen obrázky.",
        })
      }
      if (!images.length) return

      setQueue(images.map((file) => ({ name: file.name, status: "uploading" })))

      const uploaded = []
      for (const [index, file] of images.entries()) {
        try {
          // Alt text is left empty on purpose and asked for right after the
          // upload — guessing it would produce alt text nobody ever corrects.
          const asset = await port.media.upload(file, { alt: "" })
          uploaded.push(asset)
          setQueue((current) => current.map((entry, i) => (i === index ? { ...entry, status: "done" } : entry)))
        } catch (error) {
          setQueue((current) =>
            current.map((entry, i) => (i === index ? { ...entry, status: "failed", error } : entry)),
          )
          toast.error(`Nahrání „${file.name}" selhalo`, { description: error?.message })
        }
      }

      setTimeout(() => setQueue([]), 900)
      if (uploaded.length) onUploaded?.(uploaded)
    },
    [port, toast, onUploaded],
  )

  const onDrop = (event) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (event.dataTransfer?.files?.length) upload(event.dataTransfer.files)
  }

  return (
    <div
      className={`${styles.dropZone} ${compact ? styles.dropCompact : ""} ${dragging ? styles.dropActive : ""}`}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current -= 1
        if (dragDepth.current <= 0) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) upload(event.target.files)
          event.target.value = ""
        }}
      />

      {children ? (
        children({ open: () => input.current?.click(), dragging })
      ) : (
        <button type="button" className={styles.dropInner} onClick={() => input.current?.click()}>
          <span className={styles.dropIcon}>
            <Icon name="upload" size={compact ? 16 : 20} strokeWidth={1.1} />
          </span>
          <span className={styles.dropTitle}>
            {dragging ? "Pusťte soubory sem" : "Přetáhněte obrázky nebo klikněte"}
          </span>
          {!compact ? <span className={styles.dropHint}>JPG, PNG, WEBP · více souborů najednou</span> : null}
        </button>
      )}

      {queue.length ? (
        <ul className={styles.queue}>
          {queue.map((entry, index) => (
            <li key={`${entry.name}-${index}`} className={styles[`queue_${entry.status}`]}>
              <Icon
                name={entry.status === "done" ? "check" : entry.status === "failed" ? "warning" : "upload"}
                size={12}
              />
              <span className={styles.queueName}>{entry.name}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* A full-surface overlay, so dropping anywhere on the library works and
          the target is not a small dashed box in a corner. */}
      {dragging ? (
        <div className={styles.dropOverlay} aria-hidden="true">
          <Icon name="upload" size={22} strokeWidth={1.1} />
          <span>Pusťte pro nahrání</span>
        </div>
      ) : null}
    </div>
  )
}
