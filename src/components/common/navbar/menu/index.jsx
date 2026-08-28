import { ScrollToText } from "../../TextAnim/scrollToText";
import CornerMarks from "@/components/common/ui/CornerMarks";
import ButtonLink from "../../ui/stickyButtons/buttons/buttonLink";
import { usePathname } from "next/navigation";

// The bar: three words, and four corner marks that close around whichever one
// you have reached for.
//
// It used to carry a great deal more — a magnetic wrapper pulling the middle
// button towards the pointer, a rotate-and-squash transform leaning it at the
// pointer's angle, and four violet rules drawing a box round the word. All of
// it went, and the corners do the work now. They are the same mark the buttons
// in the page use, so the bar and the page say "this can be used" the same way.
//
// The middle one is now a real <button>. It was a <div> with an onClick, which
// no keyboard can reach and no screen reader announces as anything — on the
// only control that opens the site's navigation. It also says what it does to
// what, so a reader is told the panel is open without having to find it.
//
// The mark beside the word is one hairline that splits into two as the panel
// opens. It is the same gesture the panel is made of — a cut opening — at the
// size of a button, so the thing you press and the thing it does are one idea.
export default function Menu({ menu, setMenu, onContact }) {
    const pathname = usePathname();

    // The word on the button and the name it answers to, stated once so the two
    // cannot drift. The name has to be stated at all because ScrollToText draws
    // the word out of one column per letter and every column carries the whole
    // forty-three-letter alphabet behind an overflow — visible to the eye as
    // four letters, and to the accessibility tree as "A Á B C Č D Ď E…". Left to
    // its contents this button announces itself as the alphabet at every width;
    // measured. Below 380 across there is no visible word at all (see
    // styles.scss) and this is the only name it has.
    const word = menu ? "Close" : "Menu";

    return (
        <div className="navbar__container">
            <ButtonLink textRotate="Procházka Group" href="/" />

            <button
                type="button"
                className="navbar__menu"
                data-cursor="frame"
                data-marks
                aria-expanded={menu}
                aria-controls="navPanel"
                aria-label={word}
                onClick={() => setMenu(!menu)}
            >
                <CornerMarks />

                <span className="navbar__cut" aria-hidden="true">
                    <span />
                    <span />
                </span>

                <div className="navbar__text">
                    <div className="navbar__text__content">
                        <ScrollToText text={word} duration={0.5} />
                    </div>
                </div>
            </button>

            <ButtonLink
                textRotate={pathname === "/o-nas" ? "Navázat Spolupráci" : "Spojit se"}
                kontakt={true}
                onClick={onContact}
            />
        </div>
    );
}
