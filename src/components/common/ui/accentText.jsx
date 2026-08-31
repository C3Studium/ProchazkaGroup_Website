import { editableList, isEditMode } from "@/cms/edit";
import { TextType } from "@/components/common/TextAnim/typingText";

// The accented half of a heading — its own box, apart from the words before it.
//
// One value is a coloured span, exactly what the asterisks used to produce.
// Several are the same span typing itself out and swapping between them — "už
// přes JEDNU DEKÁDU" becoming "už přes 12 LET" and back.
//
// The count decides, not a flag. A switch saying "animate this one" is a second
// thing to keep in step with the content, and the first time somebody adds a
// second wording and forgets to turn it on, the page silently shows one.
//
// ---------------------------------------------------------------------------
// Why it stops animating while somebody is editing
//
// Two reasons, and the second is the one that was reported. A box that retypes
// itself every two seconds cannot be clicked with any confidence — the thing
// under the pointer is a different length by the time the click lands. And an
// animation passes through EMPTY between its two wordings: an empty inline
// element has no box, so for a moment there is nothing to click and nothing to
// see, which is what "delete the text and it turns into ordinary white" is.
//
// In edit mode it therefore renders the first wording, still, with the whole
// list one click away. Never empty: with no wording at all it shows a
// placeholder, so the box an editor needs is always there to aim at.
const ACCENT = "hl";

/** Is there an accent to draw at all? */
export const hasAccent = (accent) => Array.isArray(accent) && accent.some((entry) => entry?.trim());

/** What the box says when the field is empty and somebody is editing. */
const PLACEHOLDER = "Zvýrazněný text";

export default function AccentText({
    accent,
    docId,
    field = "accent",
    markClass,
    typingSpeed = 55,
    pauseDuration = 2400,
}) {
    const values = (accent || []).map((entry) => String(entry ?? "").trim()).filter(Boolean);
    const className = [ACCENT, markClass].filter(Boolean).join(" ");
    const editing = isEditMode();

    if (editing) {
        // One element, one address: the whole list. Clicking it opens every
        // wording at once, which is the only sane way to edit something that
        // swaps — editing "the text on screen" would mean editing whichever of
        // them the animation happened to be showing.
        const attrs = docId ? editableList(docId, field) : {};
        return (
            <span className={className} {...attrs} data-cms-empty={values.length ? undefined : "true"}>
                {values[0] || PLACEHOLDER}
            </span>
        );
    }

    if (!values.length) return null;

    // One wording: a plain span, and deliberately NOT the typing component with
    // a single entry. That would still mount a timer, still draw a cursor, and
    // still animate on every load — motion nobody asked for on a heading that
    // has nothing to swap to.
    if (values.length === 1) return <span className={className}>{values[0]}</span>;

    return (
        <TextType
            className={className}
            text={values}
            typingSpeed={typingSpeed}
            pauseDuration={pauseDuration}
            deletingSpeed={32}
            // The heading is above the fold and the swap is the point of it, so
            // it starts on load rather than waiting to be scrolled to.
            startOnVisible={false}
            showCursor
            cursorCharacter="_"
        />
    );
}
