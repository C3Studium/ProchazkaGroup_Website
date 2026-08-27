import { useState } from "react"
import { registerInput, registerKind } from "../registry"
import FieldRenderer from "../FieldRenderer"
import { useCore } from "../../context/StudioProvider"
import { Button, IconButton } from "../../ui/controls"
import Icon from "../../ui/Icon"
import styles from "./inputs.module.scss"

/**
 * The two containers. Both recurse through FieldRenderer rather than rendering
 * controls themselves, so a nested field gets the same input resolution, the
 * same error display and the same label treatment as a top-level one.
 */

function ObjectInput({ value, onChange, path, errors, doc, readOnly, fields = [] }) {
  const body = value && typeof value === "object" ? value : {}

  return (
    <div className={styles.object}>
      {fields.map((child) => (
        <FieldRenderer
          key={child.name}
          field={child}
          value={body[child.name]}
          path={`${path}.${child.name}`}
          errors={errors}
          doc={doc}
          parent={body}
          readOnly={readOnly}
          onChange={(next) => onChange({ ...body, [child.name]: next })}
        />
      ))}
    </div>
  )
}

/**
 * Array field. `ui.members` is always an array of member definitions — one for
 * the common case, several for a polymorphic list — so the "add" control becomes
 * a menu only when there is a real choice to make.
 */
function ArrayInput({ value, onChange, path, errors, doc, readOnly, members = [], polymorphic, sortable = true, title }) {
  const core = useCore()
  const items = Array.isArray(value) ? value : []
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [adding, setAdding] = useState(false)

  if (!members.length) {
    return <p className={styles.notice}>Toto pole nemá definovaný typ položky.</p>
  }

  const memberFor = (item) => {
    if (members.length === 1) return members[0]
    return members.find((member) => member.name === item?._type || member.type === item?._type) || members[0]
  }

  const add = (member) => {
    // `emptyValue` is the core's own zero for a field, including any
    // `initialValue` and the `_type` tag a polymorphic member needs.
    onChange([...items, core.emptyValue(member)])
    setAdding(false)
  }

  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const toggle = (index) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <div className={styles.array}>
      {items.length === 0 ? (
        <p className={styles.arrayEmpty}>Zatím žádné položky.</p>
      ) : (
        <ol className={styles.arrayList}>
          {items.map((item, index) => {
            const member = memberFor(item)
            const itemPath = `${path}.${index}`
            const isRecord = member.type === "object"
            const hasError = errors?.some(
              (error) => error.path === itemPath || String(error.path).startsWith(`${itemPath}.`),
            )
            const isOpen = !collapsed.has(index)

            return (
              <li key={index} className={`${styles.arrayItem} ${hasError ? styles.arrayItemError : ""}`}>
                <div className={styles.arrayHead}>
                  <span className={styles.arrayIndex}>{index + 1}</span>
                  {isRecord ? (
                    <button type="button" className={styles.arrayToggle} onClick={() => toggle(index)}>
                      <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={13} />
                      <span className={styles.arraySummary}>{summarise(member, item) || `Položka ${index + 1}`}</span>
                    </button>
                  ) : (
                    <span className={styles.arraySpacer} />
                  )}
                  {hasError ? <Icon name="warning" size={12} className={styles.arrayWarn} /> : null}
                  {!readOnly ? (
                    <div className={styles.arrayControls}>
                      {sortable ? (
                        <>
                          {/* Buttons rather than drag: keyboard-reachable, no
                              dependency, and these lists are short. */}
                          <IconButton icon="chevronUp" label="Nahoru" size={12} disabled={index === 0} onClick={() => move(index, -1)} />
                          <IconButton
                            icon="chevronDown"
                            label="Dolů"
                            size={12}
                            disabled={index === items.length - 1}
                            onClick={() => move(index, 1)}
                          />
                        </>
                      ) : null}
                      <IconButton
                        icon="trash"
                        label="Odebrat"
                        size={12}
                        tone="danger"
                        onClick={() => onChange(items.filter((_, i) => i !== index))}
                      />
                    </div>
                  ) : null}
                </div>

                {isOpen ? (
                  <div className={styles.arrayBody}>
                    {isRecord ? (
                      (member.fields || []).map((child) => (
                        <FieldRenderer
                          key={child.name}
                          field={child}
                          value={item?.[child.name]}
                          path={`${itemPath}.${child.name}`}
                          errors={errors}
                          doc={doc}
                          parent={item}
                          readOnly={readOnly}
                          onChange={(next) =>
                            onChange(items.map((entry, i) => (i === index ? { ...entry, [child.name]: next } : entry)))
                          }
                        />
                      ))
                    ) : (
                      <FieldRenderer
                        field={member}
                        value={item}
                        path={itemPath}
                        errors={errors}
                        doc={doc}
                        parent={items}
                        readOnly={readOnly}
                        bare
                        onChange={(next) => onChange(items.map((entry, i) => (i === index ? next : entry)))}
                      />
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}

      {!readOnly ? (
        polymorphic && adding ? (
          <div className={styles.addChoices}>
            {members.map((member) => (
              <button key={member.name || member.type} type="button" className={styles.choice} onClick={() => add(member)}>
                {member.title || member.name || member.type}
              </button>
            ))}
            <IconButton icon="close" label="Zrušit" size={13} onClick={() => setAdding(false)} />
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            className={styles.arrayAdd}
            onClick={() => (polymorphic ? setAdding(true) : add(members[0]))}
          >
            Přidat {memberNoun(members)}
          </Button>
        )
      ) : null}
    </div>
  )
}

/**
 * What "Přidat …" is adding. An array member often has no title of its own —
 * `of: [{ type: "object", fields: [...] }]` is the common spelling — and
 * `defineField` then falls back to the type name, which would put "Přidat
 * object" in front of an editor. Only a title the schema actually chose is used.
 */
function memberNoun(members) {
  if (members.length !== 1) return "položku"
  const { title, type, name } = members[0]
  const authored = title && title !== type && title !== name
  return authored ? title.toLowerCase() : "položku"
}

/** First non-empty string in an item, used as a collapsed row's label. */
function summarise(member, item) {
  if (typeof item === "string") return item
  if (!item || typeof item !== "object") return null
  for (const child of member.fields || []) {
    const candidate = item[child.name]
    if (typeof candidate === "string" && candidate.trim()) return candidate
  }
  return null
}

registerInput("object", ObjectInput)
registerInput("array", ArrayInput)
registerKind("record", ObjectInput)
registerKind("collection", ArrayInput)

export { ObjectInput, ArrayInput }
