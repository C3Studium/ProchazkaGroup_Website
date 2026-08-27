import { useRef, useState } from "react"
import { registerInput } from "../registry"
import Icon from "../../ui/Icon"
import styles from "./inputs.module.scss"

/**
 * Rich text without a rich-text engine.
 *
 * Adding Slate, Lexical or TipTap would be the largest runtime dependency in the
 * project for a field type this site uses in three places, and SPEC.md asks for
 * a reason before any new dependency. Markdown in a textarea gives the client
 * bold, links and lists with no bundle cost, no schema for a document model, and
 * a value that stays a plain string — which is what `data` JSONB wants anyway.
 *
 * The toolbar wraps the selection rather than opening a syntax cheat-sheet, so
 * the client never has to know it is writing Markdown.
 */

// Keyed by the core's toolbar vocabulary, so a schema narrowing
// `options.toolbar` narrows what is offered here without a change to this file.
const MARKS = [
  { id: "bold", glyph: "B", label: "Tučně", wrap: ["**", "**"], hint: "Ctrl+B" },
  { id: "italic", glyph: "I", label: "Kurzíva", wrap: ["_", "_"], hint: "Ctrl+I" },
  { id: "h2", glyph: "H2", label: "Nadpis", line: "## " },
  { id: "h3", glyph: "H3", label: "Podnadpis", line: "### " },
  { id: "link", icon: "link", label: "Odkaz", wrap: ["[", "](https://)"] },
  { id: "ul", icon: "list", label: "Odrážky", line: "- " },
  { id: "ol", glyph: "1.", label: "Číslovaný seznam", line: "1. " },
]

function RichTextInput({ value, onChange, id, readOnly, toolbar, rows, placeholder, maxLength }) {
  const area = useRef(null)
  const [preview, setPreview] = useState(false)
  // The core holds richText as a string; an array of blocks is accepted on the
  // way in so a portable-text editor can replace this later. Read it as text.
  const text = typeof value === "string" ? value : Array.isArray(value) ? "" : (value ?? "")
  const marks = MARKS.filter((mark) => !toolbar || toolbar.includes(mark.id))
  const length = text.length

  const apply = (mark) => {
    const node = area.current
    if (!node) return

    const start = node.selectionStart
    const end = node.selectionEnd
    const selected = text.slice(start, end)

    let next
    let caret

    if (mark.line) {
      // Line marks attach to the start of every selected line.
      const lineStart = text.lastIndexOf("\n", start - 1) + 1
      const block = text.slice(lineStart, end)
      const marked = block
        .split("\n")
        .map((line) => (line.startsWith(mark.line) ? line.slice(mark.line.length) : `${mark.line}${line}`))
        .join("\n")
      next = text.slice(0, lineStart) + marked + text.slice(end)
      caret = lineStart + marked.length
    } else {
      const [open, close] = mark.wrap
      next = `${text.slice(0, start)}${open}${selected}${close}${text.slice(end)}`
      caret = selected ? start + open.length + selected.length + close.length : start + open.length
    }

    onChange(next)
    requestAnimationFrame(() => {
      node.focus()
      node.setSelectionRange(caret, caret)
    })
  }

  const onKeyDown = (event) => {
    if (!(event.metaKey || event.ctrlKey)) return
    const key = event.key.toLowerCase()
    const shortcut = marks.find((mark) => mark.hint?.toLowerCase().endsWith(key))
    if (shortcut) {
      event.preventDefault()
      apply(shortcut)
    }
  }

  return (
    <div className={styles.rich}>
      <div className={styles.richBar}>
        {marks.map((mark) => (
          <button
            key={mark.id}
            type="button"
            className={styles.richButton}
            disabled={readOnly || preview}
            title={mark.hint ? `${mark.label} (${mark.hint})` : mark.label}
            onClick={() => apply(mark)}
          >
            <span className={styles.richGlyph} data-mark={mark.id}>
              {mark.icon ? <Icon name={mark.icon} size={13} /> : mark.glyph}
            </span>
          </button>
        ))}
        <span className={styles.richSpacer} />
        <button
          type="button"
          className={`${styles.richButton} ${preview ? styles.richButtonOn : ""}`}
          onClick={() => setPreview((current) => !current)}
          title="Náhled"
        >
          <Icon name={preview ? "eyeOff" : "eye"} size={14} />
        </button>
      </div>

      {preview ? (
        <div className={styles.richPreview}>
          {text ? renderMarkdown(text) : <span className={styles.richEmpty}>Zatím nic k zobrazení.</span>}
        </div>
      ) : (
        <textarea
          id={id}
          ref={area}
          className={styles.richArea}
          rows={rows || 9}
          value={text}
          readOnly={readOnly}
          placeholder={placeholder || "Pište…  **tučně**, _kurzíva_, - odrážka"}
          onKeyDown={onKeyDown}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {maxLength && length > 0 ? (
        <span className={`${styles.richCount} ${length > maxLength ? styles.counterOver : ""}`}>
          {length} / {maxLength}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Preview-only Markdown. Deliberately minimal and escaped first — the output is
 * built from React elements, never `dangerouslySetInnerHTML`, so a paste from a
 * hostile source cannot inject markup into the admin.
 */
function renderMarkdown(text) {
  return text.split(/\n{2,}/).map((block, index) => {
    const heading = block.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      const Tag = `h${Math.min(heading[1].length + 1, 4)}`
      return (
        <Tag key={index} className={styles.previewHeading}>
          {inline(heading[2])}
        </Tag>
      )
    }

    if (/^\s*[-*]\s+/m.test(block)) {
      return (
        <ul key={index} className={styles.previewList}>
          {block.split("\n").map((line, lineIndex) => (
            <li key={lineIndex}>{inline(line.replace(/^\s*[-*]\s+/, ""))}</li>
          ))}
        </ul>
      )
    }

    return (
      <p key={index} className={styles.previewParagraph}>
        {inline(block)}
      </p>
    )
  })
}

function inline(text) {
  const tokens = String(text).split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g)
  return tokens.map((token, index) => {
    if (/^\*\*[^*]+\*\*$/.test(token)) return <strong key={index}>{token.slice(2, -2)}</strong>
    if (/^_[^_]+_$/.test(token)) return <em key={index}>{token.slice(1, -1)}</em>
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer noopener">
          {link[1]}
        </a>
      )
    }
    return token
  })
}

registerInput("richText", RichTextInput)
export { RichTextInput }
