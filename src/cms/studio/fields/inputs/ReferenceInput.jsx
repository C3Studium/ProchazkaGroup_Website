import { useState } from "react"
import { registerInput, registerKind } from "../registry"
import { useCore, usePort } from "../../context/StudioProvider"
import { useAsync, useDebounced } from "../../hooks/useAsync"
import { previewOf } from "../../lib/documents"
import { Modal } from "../../ui/Modal"
import { IconButton, SearchInput } from "../../ui/controls"
import { EmptyState, Spinner } from "../../ui/feedback"
import Icon from "../../ui/Icon"
import styles from "./inputs.module.scss"

/**
 * Reference field. Stores `{ _ref, _type }` — the id only, since unlike an image
 * a referenced document is expected to change and the site resolves it at render
 * time.
 *
 * The label is resolved by fetching the target and running *its own* `preview()`,
 * so a reference to a partner reads as that partner's name rather than a uuid,
 * without this component knowing anything about partners.
 */
function ReferenceInput({ value, onChange, readOnly, to = [], title }) {
  const port = usePort()
  const core = useCore()
  const [picking, setPicking] = useState(false)

  const { data: target, loading } = useAsync(
    () => (value?._ref ? port.get({ id: value._ref }) : Promise.resolve(null)),
    [port, value?._ref],
  )

  const label = target ? previewOf(core.getType(target.type), target) : null

  return (
    <div className={styles.reference}>
      {value?._ref ? (
        <div className={styles.refChip}>
          <Icon name="link" size={13} className={styles.refIcon} />
          <span className={styles.refText}>
            {loading ? (
              <Spinner size={12} />
            ) : label ? (
              <>
                <span className={styles.refTitle}>{label.title}</span>
                {label.subtitle ? <span className={styles.refSub}>{label.subtitle}</span> : null}
              </>
            ) : (
              // The target was deleted. Say so plainly instead of leaving a
              // blank chip that reads as a permanent loading state.
              <span className={styles.refBroken}>Odkazovaný dokument neexistuje</span>
            )}
          </span>
          {!readOnly ? (
            <>
              <IconButton icon="more" label="Vyměnit" size={13} onClick={() => setPicking(true)} />
              <IconButton icon="close" label="Odebrat" size={13} onClick={() => onChange(null)} />
            </>
          ) : null}
        </div>
      ) : (
        <button type="button" className={styles.refEmpty} disabled={readOnly} onClick={() => setPicking(true)}>
          <Icon name="link" size={14} />
          <span>Vybrat…</span>
        </button>
      )}

      <ReferencePicker
        open={picking}
        targets={to}
        title={title}
        onClose={() => setPicking(false)}
        onSelect={(doc) => {
          onChange({ _ref: doc.id, _type: doc.type })
          setPicking(false)
        }}
      />
    </div>
  )
}

function ReferencePicker({ open, targets, title, onClose, onSelect }) {
  const port = usePort()
  const core = useCore()
  const [search, setSearch] = useState("")
  const [typeName, setTypeName] = useState(targets[0] || null)
  const debounced = useDebounced(search)

  const { data, loading } = useAsync(
    () => (open && typeName ? port.list({ type: typeName, search: debounced, perPage: 40 }) : Promise.resolve(null)),
    [port, typeName, debounced, open],
  )

  const type = typeName ? core.getType(typeName) : null
  const rows = data?.rows || []

  return (
    <Modal open={open} onClose={onClose} title={title ? `Vyberte: ${title}` : "Vyberte dokument"} size="md">
      <div className={styles.pickerBar}>
        {targets.length > 1 ? (
          <div className={styles.pickerTabs}>
            {targets.map((target) => (
              <button
                key={target}
                type="button"
                className={`${styles.pickerTab} ${typeName === target ? styles.pickerTabOn : ""}`}
                onClick={() => setTypeName(target)}
              >
                {core.getType(target)?.title || target}
              </button>
            ))}
          </div>
        ) : null}
        <SearchInput value={search} onChange={setSearch} autoFocus />
      </div>

      {loading && !data ? (
        <div className={styles.pickerLoading}>
          <Spinner size={18} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon="search"
          title="Nic nenalezeno"
          description={search ? `Pro „${search}" tu nic není.` : "Tento typ zatím nemá žádné dokumenty."}
        />
      ) : (
        <ul className={styles.pickerList}>
          {rows.map((doc) => {
            const preview = previewOf(type, doc)
            return (
              <li key={doc.id}>
                <button type="button" className={styles.pickerRow} onClick={() => onSelect(doc)}>
                  <span className={styles.pickerTitle}>{preview.title}</span>
                  {preview.subtitle ? <span className={styles.pickerSub}>{preview.subtitle}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

registerInput("reference", ReferenceInput)
registerKind("relation", ReferenceInput)

export { ReferenceInput }
