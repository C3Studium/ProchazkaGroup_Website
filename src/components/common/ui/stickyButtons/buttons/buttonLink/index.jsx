import Link from "next/link";
import { ScrollToText } from "@/components/common/TextAnim/scrollToText";
import CornerMarks from "@/components/common/ui/CornerMarks";
import { TRIGGER_ATTR } from "@/components/common/ContactModal/open";

// A navbar link: the word, and four corner marks that close around it when you
// reach for it. That is all of it now.
//
// What used to be here, and why none of it is: a magnetic wrapper that pulled
// the button off its own position towards the pointer; a rotate-and-squash
// transform that leaned the word at whatever angle the pointer sat; a reversal
// that spelled the label backwards for 150ms on entry; and four violet rules
// that drew a box round it. Five things happening on one word in a navigation
// bar. The corners say the same thing on their own.
export default function ButtonLink({ href, textRotate = "", text = "", kontakt = "", onClick }) {
    const label = textRotate || text;
    const Inner = kontakt === "" ? Link : "button";
    // The contact word is a button and always has been — it simply had nothing
    // behind it. `onClick` is what it was missing.
    //
    // It says which dialog it opens twice over, to two different readers: to a
    // screen reader, which otherwise announces a button whose name is a word and
    // whose effect is a surprise; and to `ContactModal/open`, which cannot use
    // this `onClick` at all inside the editing surface — the interaction lock
    // stops the click before React sees it, so the sheet is opened from a
    // capture listener that finds the button by this marker. See open.js.
    const innerProps = kontakt === ""
        ? { href }
        : { type: "button", id: "button", onClick, "aria-haspopup": "dialog", [TRIGGER_ATTR]: "" };

    return (
        <div className="rotateText" data-cursor="frame" data-marks>
            <CornerMarks />
            <Inner {...innerProps} className="rotateText__text">
                <span className="rotateText__text__content">
                    <ScrollToText text={label} duration={0.5} />
                </span>
            </Inner>
        </div>
    );
}
