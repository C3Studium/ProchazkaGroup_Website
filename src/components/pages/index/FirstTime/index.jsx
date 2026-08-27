import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Arrow, { SCROLL_NUDGE } from "@/components/common/ui/Arrow";
import CornerButton from "@/components/common/ui/CornerButton";
import SplitText from "@/components/common/ui/SplitText";
import { CONTACT_TRIGGER } from "@/components/common/ContactModal/open";
import { editable, editableLink } from "@/cms/edit";

// Copy comes from the CMS (siteCopy "index.first-time" — see @/cms/server/site).
// Everything below is what the panel shipped with and what it falls back to: an
// empty database, a missing table or a failed query all leave it rendering
// exactly what it rendered before any of this was wired.
//
// FOUR stats, and the count is this file's rather than the CMS's: the layout
// keys each column off its index (`FirstTime__stat--3` in styles.scss) and the
// rules between them are drawn against four. So the words are merged onto these
// by position and truncated to them — an editor changes what a stat says, not
// how many there are.
const STATS = [
    { value: "12", label: "Let na trhu" },
    { value: "3000+", label: "Spokojených klientů" },
    { value: "43", label: "partnerských společností" },
    { value: "9000+", label: "podepsaných smluv" },
];

const FALLBACK_LEAD = "Koukněte na to, jak vám můžeme pomoct, protože nejde jen o peníze.";
const FALLBACK_HEADING = "Jste tu poprvé?";
const FALLBACK_SCROLL_HINT = "Scroll down";
const FALLBACK_CTA = "Mám zájem";

// One stat block; own component so each can hold its own staggered transform.
// The figure and the caption are separate fields because they are separate
// elements — `items[n].value` and `items[n].label` of the same item.
const Stat = ({ value, label, index, progress, docId }) => {
    const start = 0.6 + index * 0.04;
    const opacity = useTransform(progress, [start, start + 0.22], [0, 1]);
    const y = useTransform(progress, [start, start + 0.22], [10, 0]);

    return (
        <motion.div className={`FirstTime__stat FirstTime__stat--${index}`} style={{ opacity, y }}>
            <span {...editable(docId, `items.${index}.value`, "text")} className="FirstTime__stat__value">{value}</span>
            <span {...editable(docId, `items.${index}.label`, "text")} className="FirstTime__stat__label">{label}</span>
        </motion.div>
    );
};

// Stats + CTA section, and the first panel of the horizontal scroll. Its top
// line grows out of the exact point where WhoWeAre's connector lands on it
// (64% of the line's length), then the verticals hang off it and the content
// follows — all finished before the horizontal ride starts.
export default function FirstTime({ enterProgress, copy = {} }) {
    const docId = copy.docId;
    const stats = STATS.map((stat, index) => ({
        value: copy.stats?.[index]?.value || stat.value,
        label: copy.stats?.[index]?.label || stat.label,
    }));
    const lead = copy.lead || FALLBACK_LEAD;
    const heading = copy.heading || FALLBACK_HEADING;
    const scrollHint = copy.scrollHint || FALLBACK_SCROLL_HINT;
    const cta = copy.cta || FALLBACK_CTA;
    // stand-alone fallback: fully drawn
    const settled = useMotionValue(1);
    const progress = enterProgress ?? settled;

    // Second, softer spring for the copy only — the words trail the rules
    // slightly, which is what keeps the reveal from feeling mechanical.
    const copyProgress = useSpring(progress, {
        stiffness: 110,
        damping: 30,
        restDelta: 0.0005,
    });

    // Ranges sit late and run long on purpose: the drawing should still be
    // finishing as the panel pins, not be long over by the time you get there.
    // The connector coming down out of WhoWeAre stops at that section's bottom
    // edge; this picks it up and carries it across the head-room row to the
    // top line. It draws first — the line has to arrive before the rule it
    // lands on can grow out of the junction.
    const connectorDraw = useTransform(progress, [0.02, 0.42], [0, 1]);
    const topDraw = useTransform(progress, [0.18, 0.68], [0, 1]);
    const dividerDraw = useTransform(progress, [0.42, 0.86], [0, 1]);
    const rowDraw = useTransform(progress, [0.48, 0.92], [0, 1]);
    // The long one: draws last and by far the slowest, left→right, carrying
    // the eye on towards panels 2 and 3 where the HScroll baseline continues
    // it. It starts early and is still going when the panel pins.
    const bottomDraw = useTransform(progress, [0.35, 1], [0, 1]);

    const buttonOpacity = useTransform(progress, [0.62, 0.82], [0, 1]);
    const buttonY = useTransform(progress, [0.62, 0.82], [12, 0]);
    const scrollOpacity = useTransform(progress, [0.88, 1], [0, 1]);

    return (
        <section className="FirstTime">
            {/* Structural lines draw themselves in: the top line outwards from
                the connector's landing point, then the verticals down from it */}
            <motion.div
                className="FirstTime__line FirstTime__line--connectorIn"
                style={{ scaleY: connectorDraw }}
            />
            <motion.div
                className="FirstTime__line FirstTime__line--top"
                style={{ scaleX: topDraw }}
            />
            <motion.div
                className="FirstTime__line FirstTime__line--statsDivider"
                style={{ scaleY: dividerDraw }}
            />
            <motion.div
                className="FirstTime__line FirstTime__line--statsRow"
                style={{ scaleX: rowDraw }}
            />
            <motion.div
                className="FirstTime__line FirstTime__line--bottom"
                style={{ scaleX: bottomDraw }}
            />

            {stats.map((stat, index) => (
                <Stat
                    key={stat.label}
                    value={stat.value}
                    label={stat.label}
                    index={index}
                    progress={progress}
                    docId={docId}
                />
            ))}

            <div className="FirstTime__cta">
                <motion.div style={{ opacity: buttonOpacity, y: buttonY }}>
                    {/* Words only, and no target to edit: this button opens the
                        contact sheet rather than going anywhere. /kontakt stays
                        on the element as what a middle click and a browser with
                        no JavaScript get — the route exists and renders the
                        patička — but the sheet is the conversion path and the
                        page behind it has no content of its own to lose. */}
                    <CornerButton
                        {...editableLink(docId, { text: "items.7.label" })}
                        href="/kontakt"
                        {...CONTACT_TRIGGER}
                    >
                        {cta}
                    </CornerButton>
                </motion.div>
                {/* The paragraph, not the run of word-spans inside it: SplitText
                    puts one <span> per word in here for the reveal, and the
                    in-place editor works over whatever the element holds. This
                    is the box whose wrapping is the truth. */}
                <p {...editable(docId, "items.4.label", "text")}>
                    <SplitText
                        text={lead}
                        progress={copyProgress}
                        from={0.66}
                        to={0.94}
                    />
                </p>
                <h2 {...editable(docId, "items.5.label", "text")}>
                    <SplitText
                        text={heading}
                        progress={copyProgress}
                        from={0.72}
                        to={1}
                        rise="0.35em"
                    />
                </h2>
            </div>

            <motion.div className="FirstTime__scroll" style={{ opacity: scrollOpacity }}>
                <motion.span className="FirstTime__scroll__arrow" {...SCROLL_NUDGE}>
                    <Arrow direction="down" />
                </motion.span>
                <span {...editable(docId, "items.6.label", "text")} className="FirstTime__scroll__text">{scrollHint}</span>
            </motion.div>
        </section>
    );
}
