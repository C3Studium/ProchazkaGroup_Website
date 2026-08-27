import Link from "next/link";
import { externalClass } from "@/components/common/ui/externalLink";

// Text framed by four corner marks that spread on hover (styles.scss). The
// cursor carries four of its own and closes them around itself here — see the
// Cursor component — but the two are independent: this button's hover is the
// same whether a cursor is drawn on the page or not.
// `...rest` so a call site can put attributes on the real <a> — which is what
// the visual editor's annotations are, and the only way this button can carry
// one without gaining a wrapper element. See `editableLink` in @/cms/edit.
//
// Whether the target leaves the site is decided here rather than at the call
// sites, because this component is the one place that has the href in hand on
// every one of them — and a marker applied by hand goes stale the first time an
// editor retargets a link the CMS supplies. See ./externalLink.
// With an href it is a link; without one it is a real <button> — the benefit
// page's enrolment fork answers in place rather than navigating, and a Link
// with no destination is a prop-type error, not a button.
export default function CornerButton({ href, onClick, className = "", children, ...rest }) {
    const marks = (
        <>
            <span className="corner corner--tl" />
            <span className="corner corner--tr" />
            <span className="corner corner--bl" />
            <span className="corner corner--br" />
            {children}
        </>
    );

    if (!href) {
        return (
            <button
                {...rest}
                type="button"
                className={["cornerButton", className].filter(Boolean).join(" ")}
                onClick={onClick}
                data-cursor="frame"
            >
                {marks}
            </button>
        );
    }

    return (
        <Link
            {...rest}
            href={href}
            className={["cornerButton", externalClass(href), className].filter(Boolean).join(" ")}
            onClick={onClick}
            data-cursor="frame"
        >
            {marks}
        </Link>
    );
}
