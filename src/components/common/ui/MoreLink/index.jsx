import Link from "next/link";
import Arrow from "@/components/common/ui/Arrow";
import { externalClass } from "@/components/common/ui/externalLink";

// A "více" link. The arrow is not part of the label — it is what the link does
// when you reach for it: the word sits alone until the pointer arrives, and the
// arrow is then opened out from the word's own edge rather than faded in on top
// of it. Nothing moves that was already readable.
//
// The rule under it is drawn on hover too, left to right, in the same direction
// as the arrow is travelling and as the eye is already going.
export default function MoreLink({
    href,
    direction = "right",
    className = "",
    children,
    ...rest
}) {
    return (
        <Link
            href={href}
            // Decided here, on the one element that has the href, rather than at
            // each call site — see ./externalLink.
            className={["moreLink", externalClass(href), className].filter(Boolean).join(" ")}
            data-cursor="frame"
            {...rest}
        >
            <span className="moreLink__label">{children}</span>
            <span className="moreLink__arrow">
                <Arrow direction={direction} />
            </span>
        </Link>
    );
}
