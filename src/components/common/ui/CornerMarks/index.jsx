// Four corner marks for something that has none of its own until you reach it.
//
// CornerButton draws its corners inline, because there they are part of the
// button's resting look and only spread on hover. The navbar's three links have
// no frame at all standing still — they are words in a bar — so theirs are a
// separate piece that arrives and leaves.
//
// The host has to carry `data-marks`; that is what the stylesheet hangs the
// hover on, rather than a bare descendant selector that would fire under
// anything at all.
export default function CornerMarks({ className = "" }) {
    return (
        <span className={`cornerMarks ${className}`.trim()} aria-hidden="true">
            <span className="cornerMarks__mark cornerMarks__mark--tl" />
            <span className="cornerMarks__mark cornerMarks__mark--tr" />
            <span className="cornerMarks__mark cornerMarks__mark--bl" />
            <span className="cornerMarks__mark cornerMarks__mark--br" />
        </span>
    );
}
