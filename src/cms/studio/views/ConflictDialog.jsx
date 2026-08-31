import { useEffect, useMemo, useState } from "react"
import { useCore } from "../context/StudioProvider"
import { applyChoices, mergeReport, unanswered } from "../lib/merge"
import { plural } from "../lib/format"
import FieldRenderer from "../fields/FieldRenderer"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/controls"
import Icon from "../ui/Icon"
import styles from "./ConflictDialog.module.scss"

/**
 * What an editor sees when the server refuses their save because somebody else
 * got there first.
 *
 * ---------------------------------------------------------------------------
 * Why it is a resolve dialog and not a reload
 *
 * The sentence the Studio already shipped — *„Konflikt verzí — Někdo jiný obsah
 * mezitím změnil. Načtěte jej znovu."* — asks for a reload, and a reload throws
 * away everything the editor typed. That is fine advice for a system that
 * cannot merge; a document here is JSONB with a declared schema, so it can.
 * `lib/merge.js` argues the arithmetic; this is what it looks like.
 *
 * ---------------------------------------------------------------------------
 * Only the contested fields are questions
 *
 * The three quiet cases — nobody touched it, only I touched it, only they
 * touched it — are merged without a word, and the summary line at the top says
 * how many, so the merge is stated rather than assumed. Asking about a field
 * both people left alone would teach an editor that the answers do not matter,
 * and an editor who has learnt to click the first button is back where they
 * started.
 *
 * ---------------------------------------------------------------------------
 * Three values, not two
 *
 * Each contested field shows what it said when this tab opened it, and then
 * what each side made of it. Two final values side by side are a guess — the
 * one that reads like an improvement wins — and what actually decides it is
 * which of the two is a change the other person has not seen. That is only
 * visible against the version they both started from.
 *
 * Rendered by `FieldRenderer` in read-only mode rather than as JSON, because a
 * value has to be recognisable as the thing in the form the editor just left: a
 * select shows its label, a number its number, an image its thumbnail.
 *
 * ---------------------------------------------------------------------------
 * Keyboard and focus
 *
 * Every control is a real `<button>` in reading order, so Tab walks the choices
 * and Space/Enter takes them; `Modal` puts focus inside on open and closes on
 * Escape. It does NOT trap focus, which is a standing gap in `Modal.jsx` and is
 * left exactly as big as it was — nothing here relies on a trap, and the last
 * control in the dialog is the one an editor wants to reach anyway.
 */
export default function ConflictDialog({ open, typeName, base, mine, theirs, busy, onCancel, onResolve }) {
  const core = useCore()
  const type = typeName ? core.getType(typeName) : null

  const report = useMemo(
    () => mergeReport(type, base || {}, mine || {}, theirs || {}),
    [type, base, mine, theirs],
  )

  const [choices, setChoices] = useState({})
  // A second person resolving while this dialog is open re-opens it with a
  // newer `theirs`, and the answers given against the old one are no longer
  // answers to anything. Cleared on the identity of what is being compared
  // rather than on `open`, so re-rendering does not wipe a half-made decision.
  useEffect(() => setChoices({}), [report])

  const open_ = Boolean(open && (base || mine || theirs))
  if (!open_) return null

  const pending = unanswered(report, choices)
  const merged = () => applyChoices(report.entries, choices)

  const kept = report.entries.filter((entry) => entry.kind === "mine")
  const taken = report.entries.filter((entry) => entry.kind === "theirs")
  const agreed = report.entries.filter((entry) => entry.kind === "agreed")

  return (
    <Modal
      open
      size="xl"
      onClose={busy ? undefined : onCancel}
      title="Konflikt verzí"
      description="Někdo jiný obsah mezitím změnil. Níže je vidět, co změnil on a co vy — vyberte, co se má uložit."
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Zrušit a nic neukládat
          </Button>
          <Button
            variant="primary"
            icon="check"
            loading={busy}
            disabled={pending.length > 0}
            onClick={() => onResolve(merged())}
            title={
              pending.length
                // "u" + genitive, so the numeral does not have to agree with a
                // verb — 1 pole / 2 polí / 5 polí all read correctly after it.
                ? `Nejdřív rozhodněte u ${plural(pending.length, "pole", "polí", "polí")}`
                : "Uloží jednu sloučenou verzi"
            }
          >
            Uložit sloučenou verzi
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Summary kept={kept} taken={taken} agreed={agreed} conflicts={report.conflicts} />

        {report.conflicts.map((entry) => (
          <section key={entry.name} className={styles.conflict} aria-labelledby={`cf-${entry.name}`}>
            <header className={styles.head}>
              <h3 id={`cf-${entry.name}`} className={styles.fieldTitle}>
                {entry.title}
              </h3>
              <span className={styles.fieldPath}>{entry.name}</span>
            </header>

            <div className={styles.baseBox}>
              <p className={styles.boxLabel}>Verze, ze které jste oba vyšli</p>
              <Value entry={entry} side="base" />
            </div>

            <div className={styles.sides}>
              <Choice
                entry={entry}
                side="theirs"
                label="Jejich změna"
                hint="To, co je teď uložené"
                chosen={choices[entry.name] === "theirs"}
                onChoose={() => setChoices((current) => ({ ...current, [entry.name]: "theirs" }))}
              />
              <Choice
                entry={entry}
                side="mine"
                label="Vaše změna"
                hint="To, co máte na obrazovce"
                chosen={choices[entry.name] === "mine"}
                onChoose={() => setChoices((current) => ({ ...current, [entry.name]: "mine" }))}
              />
            </div>
          </section>
        ))}

        {/* The dialog can legitimately open with no question in it: the other
            editor changed a field this tab never touched, and the version guard
            refused the write anyway because it had no way to know that until
            the bodies were compared. Saying so is better than an empty box —
            and the button below still writes, because the merge is real work
            even when nobody has to choose. */}
        {!report.conflicts.length ? (
          <p className={styles.nothing} role="status">
            <Icon name="check" size={14} />
            <span>Žádné pole si neodporuje — obě úpravy se dají uložit vedle sebe.</span>
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

/**
 * What is being merged without asking, named rather than counted where it fits.
 *
 * Counted past four for the reason `describeChanges` in DocumentEditorView is:
 * a list long enough to scroll has stopped being evidence.
 */
const LIST_LIMIT = 4

function Summary({ kept, taken, agreed, conflicts }) {
  const names = (entries) => {
    const shown = entries.slice(0, LIST_LIMIT).map((entry) => entry.title)
    const rest = entries.length - shown.length
    return rest ? `${shown.join(", ")} a ${plural(rest, "další", "další", "dalších")}` : shown.join(", ")
  }

  return (
    <div className={styles.summary}>
      <ul className={styles.summaryList}>
        {kept.length ? (
          <li>
            <strong>Vaše</strong> úpravy zůstávají: {names(kept)}
          </li>
        ) : null}
        {taken.length ? (
          <li>
            <strong>Jejich</strong> úpravy se přebírají: {names(taken)}
          </li>
        ) : null}
        {agreed.length ? (
          <li>
            Shodli jste se na tom samém: {names(agreed)}
          </li>
        ) : null}
        {conflicts.length ? (
          <li className={styles.summaryAsk}>
            <Icon name="warning" size={13} />
            <span>
              Rozhodněte u {plural(conflicts.length, "pole", "polí", "polí")}: {names(conflicts)}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  )
}

/** One side of one contested field, as a button the whole panel belongs to. */
function Choice({ entry, side, label, hint, chosen, onChoose }) {
  return (
    <button
      type="button"
      className={`${styles.choice} ${chosen ? styles.chosen : ""}`}
      aria-pressed={chosen}
      onClick={onChoose}
    >
      <span className={styles.choiceHead}>
        <span className={styles.choiceMark} aria-hidden="true">
          {chosen ? <Icon name="check" size={12} /> : null}
        </span>
        <span className={styles.choiceLabel}>{label}</span>
        <span className={styles.choiceHint}>{hint}</span>
      </span>
      <span className={styles.choiceValue}>
        <Value entry={entry} side={side} />
      </span>
    </button>
  )
}

/**
 * One value, drawn by the field's own input.
 *
 * `bare` because the label is already the section heading, and a second copy of
 * it inside each of three boxes is noise. A field the schema no longer declares
 * has no input to draw it with and falls back to its JSON — rare, and better
 * than an empty box beside a decision.
 *
 * `inert` and not `readOnly` alone, and this is not belt-and-braces. A readOnly
 * input is still a tab stop: measured on the first build of this dialog, Tab
 * landed on three of them before it reached a decision, and one of the three
 * sat INSIDE the choice button, where a keyboard user could focus a control
 * that does nothing and Space would scroll rather than choose. `inert` takes
 * the whole subtree out of the tab order and out of the hit test at once, which
 * is also what removes the click-swallowing hack that used to be here.
 */
function Value({ entry, side }) {
  const value = entry[side]

  if (!entry.field) {
    return <pre className={styles.raw}>{JSON.stringify(value ?? null, null, 2)}</pre>
  }
  if (value === undefined || value === null || value === "") {
    return <p className={styles.emptyValue}>(prázdné)</p>
  }

  return (
    <div className={styles.value} inert>
      <FieldRenderer
        bare
        readOnly
        field={entry.field}
        value={value}
        path={`${side}.${entry.name}`}
        errors={[]}
        doc={{ [entry.name]: value }}
        onChange={() => {}}
      />
    </div>
  )
}
