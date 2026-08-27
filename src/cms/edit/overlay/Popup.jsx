import { useEffect, useMemo, useState } from "react"

import * as core from "@/cms/core"
import { StudioProvider } from "@/cms/studio/context/StudioProvider"

import { bodyFor, titleFor } from "./modules"
import styles from "./sheet"

/**
 * The popup — one shell, a body per kind.
 *
 * Contract D says `image`, `imageSet`, `document` and `link` are the same
 * overlay affordance: the element highlights, the control offers one way in, and
 * a panel opens over the page. Building four panels would have produced four
 * scrims, four Escape handlers and four answers to "where is the close button",
 * and they would have started agreeing and stopped agreeing over time. So the
 * shell is here and the difference is `kind`.
 *
 * `text` is the one kind with no body, and that is not an omission: text is
 * edited in the real element, in the real layout, so wrapping and line breaks
 * are the truth as typed. A textarea in a dialog would be a different sentence
 * from the one the page will show.
 *
 * The bodies live in `modules.js` and are picked by `bodyFor(kind, actions)`.
 * `MediaModule` is the library, and it appears *inside* two of the others rather
 * than beside them — `ImageModule` is one picture with the library under it,
 * `SetModule` is a whole array with the library under it and drag-and-drop over
 * it, `ListModule` is an array of objects through the Studio's own array input,
 * `DocModule` is the type's own form, `ModerateModule` is a review's two
 * decisions and no form at all, `LinkModule` is a label and a target.
 *
 * **`actions` narrows, it does not add.** A review and a partner are both
 * `document`; `data-cms-actions="moderate"` is what says an editor may hide and
 * archive this one rather than rewrite it. The shell passes it to `bodyFor` and
 * asks nothing else about it — see modules.js for why that is not a sixth kind.
 *
 * **Where it is drawn.** Over the Studio, not over the framed page. The overlay
 * is mounted by the host and therefore already runs in the Studio's realm
 * (mount.jsx), so Overlay.jsx portals this into the Studio's document, where it
 * is full width even while the frame emulates a 390px phone, and where the
 * Studio's own stylesheet is already parsed. That replaced a `capabilities.media`
 * handshake and a pair of `media` messages; there is no boundary left to cross.
 *
 * **What every body needs and none of them should fetch for itself.**
 *
 *   port  Contract 2, created here the way `/studio/[[...path]]` creates it —
 *         the in-memory dev stub behind the same public flag, the HTTP port
 *         otherwise. Loaded when the panel first opens rather than with the
 *         overlay, because most editing sessions never open one.
 *   core  Contract 1. Imported directly; it is pure. The type registry it reads
 *         from is already populated, because the Studio page that is hosting
 *         this imported `@/cms/studio/dev/schemas` on the way in.
 *
 * The `--st-*` tokens come from `.root` in `overlay.module.scss`, which declares
 * them from the same mixin the Studio's root uses — one definition, installed in
 * both places, so this renders identically wherever it is portalled.
 */

const useDevPort = process.env.NEXT_PUBLIC_CMS_DEV_PORT === "1"

const loadPort = () =>
  useDevPort
    ? import("@/cms/studio/dev/devPort").then((module) => module.createDevPort())
    : import("@/cms/server/httpDataPort").then((module) => module.createHttpDataPort())

export default function Popup({
  kind,
  actions,
  docId,
  field,
  hrefField,
  href,
  typeName,
  onClose,
  onPick,
  onAlt,
  onRemove,
  onCommitSet,
  onCommitList,
  onCommitLink,
  onDocSaved,
  onModerated,
}) {
  const [port, setPort] = useState(null)
  const [failed, setFailed] = useState(null)

  useEffect(() => {
    let live = true
    loadPort().then(
      (created) => live && setPort(created),
      (error) => live && setFailed(error),
    )
    return () => {
      live = false
    }
  }, [])

  // Stable, because StudioProvider treats a new config object as new config.
  const config = useMemo(() => ({ title: "Knihovna" }), [])

  const Body = bodyFor(kind, actions)
  const title = titleFor(kind, actions, core.findType?.(typeName)?.title, field)

  // One prop bag, spread into whichever body was picked. A body reads what it
  // needs and ignores the rest — which is what keeps adding one from touching
  // this render at all, and keeps the contract in modules.js the only place the
  // names are written down.
  const props = {
    docId,
    field,
    hrefField,
    href,
    typeName,
    onClose,
    onPick,
    onAlt,
    onRemove,
    onSaved: onDocSaved,
    onModerated,
    // A set and a list commit the same way — the value at the annotated path,
    // written by one `save(docId, field, value)` — so the list falls back to the
    // set's handler rather than to nothing if the dispatch has not named one yet.
    onCommit: kind === "imageSet" ? onCommitSet : kind === "list" ? (onCommitList ?? onCommitSet) : onCommitLink,
  }

  return (
    <div className={styles.mediaScrim} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.mediaSurface} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.mediaHead}>
          <h2 className={styles.mediaTitle}>{title}</h2>
          <button type="button" className={styles.mediaClose} onClick={onClose} aria-label="Zavřít">
            ✕
          </button>
        </header>
        <div className={styles.mediaBody}>
          {failed ? (
            <p className={styles.mediaError}>Panel se nepodařilo načíst: {String(failed?.message || failed)}</p>
          ) : !port ? (
            <p className={styles.mediaLoading}>Načítám…</p>
          ) : (
            <StudioProvider core={core} port={port} config={config}>
              <Body {...props} />
            </StudioProvider>
          )}
        </div>
      </div>
    </div>
  )
}
