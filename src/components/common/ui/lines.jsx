import { Fragment } from "react";

// A stored value with hard line breaks, drawn the way the JSX literal drew it.
//
// Four elements on the homepage are one element containing `<br />`: the hero's
// <h1>, the Benefit-program paragraph, "Prohlédněte si další recenze" and "Máte
// nějaký dotaz?". All four were reported as "nejde editovat" and all four for
// the same reason — the words were hardcoded in the component, so there was
// nothing to annotate against. They are now one stored string with `\n` in it,
// already cut at the breaks and decoded into `[text, marked]` runs by the site
// layer (`headline` in @/cms/server/site/homepage).
//
// What comes out of here has to be what the literal produced, character for
// character. These elements sit inside scroll-driven timelines measured against
// their boxes, so the rule is: one `<br />` between lines, one space between
// runs, and NO wrapper — the annotation goes on the element that holds this.
//
// ACCENT is the class the schema declares for its one mark (`HIGHLIGHT` in
// @/cms/schemas/marks) and it is spelled out here rather than imported, because
// that module is deliberately unreachable from a component: importing it would
// put the encode/decode pair in the public bundle. The overlay recognises a
// marked run by this class, so a section that already paints the accent with a
// class of its own passes it as `markClass` and the run carries both — the
// declared one is what is read, the section's own is what is seen.
const ACCENT = "hl";

/** Is there anything to draw? An empty CMS answer decodes to one empty line. */
export const hasLines = (lines) =>
    Array.isArray(lines) && lines.some((parts) => Array.isArray(parts) && parts.length);

export default function Lines({ lines, markClass }) {
    const accent = [ACCENT, markClass].filter(Boolean).join(" ");

    return lines.map((parts, line) => (
        <Fragment key={line}>
            {line > 0 ? <br /> : null}
            {parts.map(([text, marked], run) => {
                // The separator rides on the run before it, so a line with no
                // accent in it is ONE text node — which is what the literal was,
                // and what `encode` reads back (see marks.js: it is documented
                // as the inverse of rendering, not of decoding).
                const tail = run < parts.length - 1 ? " " : "";
                return marked ? (
                    <Fragment key={run}>
                        <span className={accent}>{text}</span>
                        {tail}
                    </Fragment>
                ) : (
                    <Fragment key={run}>{text + tail}</Fragment>
                );
            })}
        </Fragment>
    ));
}
