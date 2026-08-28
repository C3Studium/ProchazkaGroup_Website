import MoreLink from "@/components/common/ui/MoreLink";
import GridDistortion from "@/components/common/ui/GridDistortion";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { motion, useTransform } from "framer-motion";
import { ENTERS, PHOTO, RISE, group } from "@/components/common/ui/entrance";
import { toast } from "sonner";
import { RiMapPinLine, RiThumbUpLine, RiChat3Line, RiArrowDownSLine, RiPhoneLine } from "@remixicon/react";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { EXTERNAL_CLASS } from "@/components/common/ui/externalLink";
import { editable, editableDoc, editableLink } from "@/cms/edit";

// What this section renders when the CMS has nothing to say — an unreachable
// database, an empty table, or a build made before anyone published a
// consultant. Byte for byte what the section shipped with, so "no content" and
// "content system not installed yet" both look like the page that was designed.
// Archived consultants never arrive here: they are filtered out by the RLS
// policy on cms_document, not by anything in this file.
const FALLBACK_ADVISORS = Array.from({ length: 11 }, (_, index) => ({
    slug: `placeholder-${index}`,
    name: "Jmeno a prijmeni",
    firstName: "Ondřej",
    lastName: "Efenberk",
    portrait: { src: "/assets/portraits/business/11.webp", alt: "Ondřej Efenberk" },
    phone: "+420 776 157 476",
    likes: 369,
    reviewCount: 24,
}));

// The office, not the consultant: `consultant` has no geographic field and
// inventing one to fill this line would be inventing data.
const OFFICE_CITY = "Písek";
const OFFICE_PHONE = "+420 776 157 476";

// The section's own words, from siteCopy "index.advisors" and
// "index.advisors.formular" (see @/cms/server/site). These are what it shipped
// with and what it falls back to: an empty database, a missing table or a failed
// query all leave it rendering exactly what it rendered before any of this was
// wired.
//
// What is deliberately NOT here:
//
//   "Zvolit<br />poradce"  a hard line break. The in-place editor flattens an
//                          element to one text node, so `textContent` of
//                          `A<br />B` is "AB" and the first click would join the
//                          two lines.
//   Jméno / Email / Telčíslo   each is `Jméno<Req />&nbsp;|`: the asterisk and
//                          the rule are drawn by elements inside the label
//                          rather than characters in it, so an in-place edit
//                          would read them back as part of the word and store
//                          "Jméno* |".
//   the consent line       it holds the "více" link inside it, so editing the
//                          sentence would swallow the link's words. The link
//                          itself is annotated; the sentence is not.
//   the placeholders       an attribute, not a text node — nothing on the page
//                          for a caret to go in.
const COPY = {
    whereHead: "Kde nás najdete |",
    address: "Smetanova 78/1, 39701 Písek",
    helpLine: "Potřebujete poradit?\u00a0 | 8-16",
    phone: { label: OFFICE_PHONE, href: `tel:${OFFICE_PHONE.replace(/[^\d+]/g, "")}` },
    claim: "Přidejte se k našim 3000+ klientům, kteří už dávno začali vyhrávat.",
    callText: "Zavolejte nebo napište",
    city: OFFICE_CITY,
};

const FORM_COPY = {
    heading: "Vyplňte formu",
    timeLabel: "Preferovaný čas hovoru",
    timeFrom: "Od",
    timeTo: "Do",
    moreLabel: "více",
    submit: "Poslat zprávu",
};

/** `+420 776 157 476` -> `+420776157476`, which is what a tel: href wants. */
const telHref = (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;

// What the form will not go without, and what to call each one when it is
// missing. The labels are the words on screen, so the message names the field
// the reader is looking at rather than the key it is stored under.
const REQUIRED = [
    ["name", "Jméno"],
    ["email", "Email"],
    ["phone", "Telefonní číslo"],
];

const EMPTY = { name: "", email: "", phone: "", timeFrom: "", timeTo: "" };

// Deliberately loose: a stricter pattern rejects addresses that are perfectly
// valid, and the only thing that ever really proves an address is sending to it.
const LOOKS_LIKE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Column stagger, from the shared entrance set. The three offsets start the
// columns in reading order — list, then form, then the profile beside it.
const LEFT = group(0.05);
const MIDDLE = group(0.18);
const RIGHT = group(0.3);

// The mark on a field that will not be skipped. Its own component so the three
// of them cannot drift apart, and so the character is never read out: the
// requirement is already carried by the field, and a screen reader announcing
// "hvězdička" after every label is noise.
const Req = () => <span className="req" aria-hidden="true">*</span>;

// Advisor picker + contact form. The form sits in the CENTER column (eyes go
// to the middle), the selected advisor's profile on the right. Verticals at
// 31vw and 65vw continue ReviewsPreview's endpoints above.
export default function ChooseAdvisor({ consultants, copy = {}, formCopy = {} }) {
    const sectionRef = useRef(null);

    // Two documents, because the form is a dozen labels an editor reads as a
    // form and a positional list that long is one nobody can check.
    const docId = copy.docId;
    const formDocId = formCopy.docId;
    const text = {
        whereHead: copy.whereHead || COPY.whereHead,
        address: copy.address || COPY.address,
        helpLine: copy.helpLine || COPY.helpLine,
        phone: {
            label: copy.phone?.label || COPY.phone.label,
            href: copy.phone?.href || COPY.phone.href,
        },
        claim: copy.claim || COPY.claim,
        callText: copy.callText || COPY.callText,
        city: copy.city || COPY.city,
    };
    const form = {
        heading: formCopy.heading || FORM_COPY.heading,
        timeLabel: formCopy.timeLabel || FORM_COPY.timeLabel,
        timeFrom: formCopy.timeFrom || FORM_COPY.timeFrom,
        timeTo: formCopy.timeTo || FORM_COPY.timeTo,
        moreLabel: formCopy.moreLabel || FORM_COPY.moreLabel,
        submit: formCopy.submit || FORM_COPY.submit,
    };
    const progress = useSectionProgress(sectionRef);

    // One published consultant is enough to switch over; anything less keeps
    // the designed placeholder rather than rendering a half-empty column.
    const advisors = useMemo(
        () => (Array.isArray(consultants) && consultants.length ? consultants : FALLBACK_ADVISORS),
        [consultants],
    );

    // Index rather than slug: the list is short, it is re-derived from the same
    // memo, and an index cannot go stale against a re-ordered list the way a
    // remembered slug can.
    const [selected, setSelected] = useState(0);
    const active = advisors[Math.min(selected, advisors.length - 1)] || FALLBACK_ADVISORS[0];

    // Controlled, because the check on submit has to read them. Nothing else
    // depends on them changing, so one object is enough.
    const [values, setValues] = useState(EMPTY);
    const set = (field) => (event) =>
        setValues((prev) => ({ ...prev, [field]: event.target.value }));

    const onSubmit = (event) => {
        event.preventDefault();

        const missing = REQUIRED.filter(([field]) => !values[field].trim());
        if (missing.length) {
            const names = missing.map(([, label]) => label);
            toast.error(
                names.length === 1
                    ? `Vyplňte prosím ${names[0].toLowerCase()}.`
                    : `Vyplňte prosím: ${names.join(", ")}.`,
            );
            return;
        }

        if (!LOOKS_LIKE_EMAIL.test(values.email)) {
            toast.error("Zkontrolujte prosím e-mailovou adresu.");
            return;
        }

        // TODO: the send. `useResend` posts { template, to, data } to
        // /api/resend, but which template and which mailbox is a content
        // decision, not one to guess at — so the form validates and stops here
        // rather than telling anyone their message went somewhere it did not.
        toast.error("Odesílání formuláře zatím není napojené.");
    };

    // The two column rules carry on from ReviewsPreview above (31vw and 65vw),
    // so they draw downwards first; the rest branches off them.
    const vLeftDraw = useTransform(progress, [0.08, 0.45], [0, 1]);
    const vRightDraw = useTransform(progress, [0.12, 0.5], [0, 1]);
    const hClaimDraw = useTransform(progress, [0.4, 0.68], [0, 1]);
    const vClaimDraw = useTransform(progress, [0.58, 0.8], [0, 1]);
    const accentDraw = useTransform(progress, [0.5, 0.78], [0, 1]);
    const hNameDraw = useTransform(progress, [0.66, 0.9], [0, 1]);
    const hHelpDraw = useTransform(progress, [0.74, 1], [0, 1]);

    return (
        <motion.section
            className="ChooseAdvisor"
            ref={sectionRef}
            initial="hidden"
            whileInView="shown"
            viewport={ENTERS}
        >

            {/* Left column — advisor list */}
            <motion.div className="ChooseAdvisor__left" variants={LEFT}>
                <motion.h2 variants={RISE}>Zvolit<br />poradce</motion.h2>
                <motion.ul className="ChooseAdvisor__list" variants={LEFT}>
                    {/* A consultant is a document, not copy: the name on screen
                        is composed from three fields (see consultantFullName),
                        so there is no one field an in-place edit could write
                        back to. Clicking one opens the form an editor already
                        knows. */}
                    {advisors.map((advisor, index) => (
                        <motion.li
                            key={advisor.slug || index}
                            {...editableDoc(advisor.id, "consultant")}
                            variants={RISE}
                            className={index === selected ? "isActive" : ""}
                            onClick={() => setSelected(index)}
                            data-cursor="frame"
                        >
                            <span className="name">{advisor.name}</span>
                            <span className="radio" />
                        </motion.li>
                    ))}
                </motion.ul>
                <motion.div className="ChooseAdvisor__where" variants={RISE}>
                    <div className="ChooseAdvisor__where__head">
                        <h3 {...editable(docId, "items.0.label", "text")}>{text.whereHead}</h3>
                        <span className="pin"><RiMapPinLine size={22} /></span>
                    </div>
                    <p {...editable(docId, "items.1.label", "text")}>{text.address}</p>
                </motion.div>
                <motion.div className="ChooseAdvisor__help" variants={RISE}>
                    <span {...editable(docId, "items.2.label", "text")}>{text.helpLine}</span>
                    {/* A tel: target leaves this site, so both halves are
                        editable — the words that are printed and the number that
                        is dialled — and the element carries the marker that says
                        so rather than leaving it to be read off the href. */}
                    <a
                        {...editableLink(docId, { text: "items.3.label", href: "items.3.value" })}
                        href={text.phone.href}
                        className={`cornerButton ${EXTERNAL_CLASS} ChooseAdvisor__help__phone`}
                        data-cursor="frame"
                    >
                        <span className="corner corner--tl" />
                        <span className="corner corner--tr" />
                        <span className="corner corner--bl" />
                        <span className="corner corner--br" />
                        {text.phone.label}
                    </a>
                </motion.div>
            </motion.div>

            {/* The same choice as the roster above, as the one control a phone
                renders as a proper picker — the OS wheel, over ten names, in
                one tap instead of a screen of scrolling. It writes the same
                index, so the photograph, the name, the counts and the number
                answer a change here exactly as they answer a tap on a row.

                Both controls are in the markup at every width and the
                stylesheet decides which is on. Nothing about that is worked
                out at runtime, so the section that ships is the section that
                renders — no second paint, no flash of the wrong one — and a
                `display: none` control is out of the accessibility tree as
                well as off the screen, so a reader is never offered the roster
                twice.

                A native <select> rather than a listbox of our own: it is the
                only control that hands a phone its own picker, and the roles,
                the focus trapping and the type-ahead a hand-rolled one owes
                are all things this gets from the platform for nothing. */}
            <motion.label className="ChooseAdvisor__pick" variants={RISE}>
                <span className="ChooseAdvisor__pick__label">Zvolit poradce</span>
                <span className="ChooseAdvisor__pick__field">
                    <select
                        className="ChooseAdvisor__pick__select"
                        value={selected}
                        onChange={(event) => setSelected(Number(event.target.value))}
                    >
                        {advisors.map((advisor, index) => (
                            <option key={advisor.slug || index} value={index}>
                                {advisor.name}
                            </option>
                        ))}
                    </select>
                    <RiArrowDownSLine className="ChooseAdvisor__pick__chevron" size={20} aria-hidden="true" />
                </span>
            </motion.label>

            {/* Middle column — contact form (the conversion action, center stage) */}
            <motion.div className="ChooseAdvisor__formCol" variants={MIDDLE}>
                <motion.p {...editable(docId, "items.4.label", "text")} className="ChooseAdvisor__claim" variants={RISE}>
                    {text.claim}
                </motion.p>
                <motion.form className="ChooseAdvisor__form" variants={MIDDLE} onSubmit={onSubmit} noValidate>
                    <span className="corner corner--tl" />
                    <span className="corner corner--tr" />
                    <span className="corner corner--bl" />
                    <span className="corner corner--br" />
                    <motion.h3 {...editable(formDocId, "items.0.label", "text")} variants={RISE}>{form.heading}</motion.h3>
                    <motion.label variants={RISE}>
                        <span className="label">Jméno<Req />&nbsp;|</span>
                        <input
                            type="text"
                            name="name"
                            placeholder="Lorem ipsum"
                            value={values.name}
                            onChange={set("name")}
                            data-cursor="frame"
                        />
                    </motion.label>
                    <motion.label variants={RISE}>
                        <span className="label">Email<Req />&nbsp;|</span>
                        <input
                            type="email"
                            name="email"
                            placeholder="Lorem ipsum"
                            value={values.email}
                            onChange={set("email")}
                            data-cursor="frame"
                        />
                    </motion.label>
                    <motion.label variants={RISE}>
                        <span className="label">Telčíslo<Req />&nbsp;|</span>
                        <div className="telRow">
                            <span className="prefix">+420 <RiArrowDownSLine size={16} /> |</span>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="Lorem ipsum"
                                value={values.phone}
                                onChange={set("phone")}
                                data-cursor="frame"
                            />
                        </div>
                    </motion.label>
                    <motion.div className="timeRow" variants={RISE}>
                        <span {...editable(formDocId, "items.1.label", "text")} className="label">{form.timeLabel}</span>
                        <div className="times">
                            <label {...editable(formDocId, "items.2.label", "text")}>{form.timeFrom} <input type="text" name="timeFrom" value={values.timeFrom} onChange={set("timeFrom")} data-cursor="frame" /></label>
                            <label {...editable(formDocId, "items.3.label", "text")}>{form.timeTo} <input type="text" name="timeTo" value={values.timeTo} onChange={set("timeTo")} data-cursor="frame" /></label>
                        </div>
                    </motion.div>
                    <motion.p className="gdpr" variants={RISE}>
                        Kliknutím na tlačítko souhlasíte ke zpracování vašich osobních údajů{" "}
                        {/* /ochrana-soukromi is a path on this site, so only the
                            word is editable — the target is the site's own
                            routing rather than content. */}
                        <MoreLink
                            {...editableLink(formDocId, { text: "items.4.label" })}
                            href="/ochrana-soukromi"
                        >
                            {form.moreLabel}
                        </MoreLink>
                    </motion.p>
                    <motion.button
                        {...editable(formDocId, "items.5.label", "text")}
                        type="submit"
                        className="cornerButton ChooseAdvisor__submit"
                        variants={RISE}
                        data-cursor="frame"
                    >
                        <span className="corner corner--tl" />
                        <span className="corner corner--tr" />
                        <span className="corner corner--bl" />
                        <span className="corner corner--br" />
                        {form.submit}
                    </motion.button>
                </motion.form>
            </motion.div>

            {/* Right column — selected advisor profile */}
            <motion.div className="ChooseAdvisor__profile" variants={RIGHT}>
                {/* The portrait belongs to the consultant, not to this block:
                    replacing it is a change to their record, so the whole
                    document is annotated and the picture is picked in the form
                    that owns it. */}
                <motion.div {...editableDoc(active.id, "consultant")} className="ChooseAdvisor__photo" variants={PHOTO}>
                    {/* `portrait` is the first of the consultant's two photos —
                        the one whose schema description says it appears here.
                        A consultant with none keeps the designed placeholder
                        rather than leaving a hole in the column.

                        The <Image> is the picture; the canvas over it is the
                        pointer's effect on it. Written this way the photo keeps
                        its responsive sizing and format switching, and a browser
                        with no WebGL simply never gets the second layer. */}
                    <GridDistortion
                        imageSrc={active.portrait?.src || FALLBACK_ADVISORS[0].portrait.src}
                        alt={active.portrait?.alt || active.name || ""}
                        cellSize={44}
                    >
                        <Image
                            src={active.portrait?.src || FALLBACK_ADVISORS[0].portrait.src}
                            alt={active.portrait?.alt || active.name || ""}
                            fill={true}
                            quality={90}
                            // matches styles.scss, in the order the rules
                            // themselves stack: half a card beside the call on
                            // a phone held upright (≤600 portrait), full column
                            // width when the section merely stacks (≤820), 38vw
                            // beside the name in phone landscape, 26vw in the
                            // desktop grid. On the phone it is a square thumb of
                            // `min(150px, 40vw)`: 40vw is the honest figure at
                            // 320 and slightly generous above it, where the 150
                            // ceiling binds — and a picture asked for slightly
                            // large is a few kilobytes, one asked for small is
                            // blurred.
                            sizes="(max-width: 600px) and (orientation: portrait) 40vw, (max-width: 820px) 88vw, (max-height: 520px) 38vw, 26vw"
                            style={{ objectFit: "cover", objectPosition: "top center" }}
                        />
                    </GridDistortion>
                </motion.div>
                {/* Phone only: the number as a target beside the face rather
                    than as a line of type under it. A second element and not
                    the link at the foot of this column restyled, because what
                    changes is the CONTENT — a mark where the digits were — and
                    no rule can swap a text node for an SVG.

                    It dials what that link dials, off the same fallback, so
                    the two cannot point at different numbers. The words it
                    does not print it says instead: with no text inside it,
                    `aria-label` is the only name it has, and it states the
                    number so a reader hears what it is about to call. */}
                <motion.a
                    href={telHref(active.phone || OFFICE_PHONE)}
                    className={`cornerButton ${EXTERNAL_CLASS} ChooseAdvisor__iconCall`}
                    aria-label={`Zavolat na ${active.phone || OFFICE_PHONE}`}
                    variants={RISE}
                >
                    <span className="corner corner--tl" />
                    <span className="corner corner--tr" />
                    <span className="corner corner--bl" />
                    <span className="corner corner--br" />
                    <RiPhoneLine size={22} aria-hidden="true" />
                </motion.a>
                <motion.h3 className="ChooseAdvisor__name" variants={RISE}>
                    {active.firstName}<br />{active.lastName}
                    <span {...editable(docId, "items.6.label", "text")} className="city">{text.city}</span>
                </motion.h3>
                <motion.div className="ChooseAdvisor__social" variants={RISE}>
                    <span>{active.likes ?? 0} <RiThumbUpLine size={20} /></span>
                    <span>{active.reviewCount ?? 0} <RiChat3Line size={20} /></span>
                </motion.div>
                <motion.span {...editable(docId, "items.5.label", "text")} className="ChooseAdvisor__callText" variants={RISE}>{text.callText}</motion.span>
                {/* Falls back to the office line: a consultant with no phone
                    number must not render a dead `tel:` link.

                    The number is the consultant's own field, so the whole
                    document is what opens; the marker still goes on, because
                    what it states is where the link goes and that is true
                    whichever popup the annotation asks for. */}
                <motion.a
                    {...editableDoc(active.id, "consultant")}
                    href={telHref(active.phone || OFFICE_PHONE)}
                    className={`cornerButton ${EXTERNAL_CLASS} ChooseAdvisor__phone`}
                    variants={RISE}
                    data-cursor="frame"
                >
                    <span className="corner corner--tl" />
                    <span className="corner corner--tr" />
                    <span className="corner corner--bl" />
                    <span className="corner corner--br" />
                    {active.phone || OFFICE_PHONE}
                </motion.a>
            </motion.div>

            {/* Structural lines — verticals continue ReviewsPreview's endpoints */}
            <motion.div className="ChooseAdvisor__line ChooseAdvisor__line--vLeft" style={{ scaleY: vLeftDraw }} />
            <motion.div className="ChooseAdvisor__line ChooseAdvisor__line--vRight" style={{ scaleY: vRightDraw }} />
            <motion.div className="ChooseAdvisor__line ChooseAdvisor__line--vAccent" style={{ scaleY: accentDraw }} />
            <motion.div className="ChooseAdvisor__line ChooseAdvisor__line--hClaim" style={{ scaleX: hClaimDraw }} />
            <motion.div className="ChooseAdvisor__line ChooseAdvisor__line--vClaim" style={{ scaleY: vClaimDraw }} />
            <motion.div className="ChooseAdvisor__line ChooseAdvisor__line--hHelp" style={{ scaleX: hHelpDraw }} />
            <motion.div className="ChooseAdvisor__line ChooseAdvisor__line--hName" style={{ scaleX: hNameDraw }} />
        </motion.section>
    );
}
