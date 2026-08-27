import Image from "next/image";
import { ENTERS, PHOTO, RISE, group } from "@/components/common/ui/entrance";
import MoreLink from "@/components/common/ui/MoreLink";
import Lines, { hasLines } from "@/components/common/ui/lines";
import GridDistortion from "@/components/common/ui/GridDistortion";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useTransform } from "framer-motion";
import { RiArrowDownSLine } from "@remixicon/react";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { editable, editableList, editableLink } from "@/cms/edit";

// Copy comes from the CMS — siteCopy "index.qna", "index.qna.otazky" and
// "index.qna.formular" (see @/cms/server/site). Everything below is what the
// section shipped with and what it falls back to: an empty database, a missing
// table or a failed query all leave it rendering exactly what it rendered before
// any of this was wired.
//
// These are NOT the `qna` documents in the Studio. That type holds the real
// questions and answers for /kariera, and wiring this section to it would change
// what the homepage says — which is the one thing this change may not do. The
// five below are the placeholders the section was designed with, and they are
// held as one siteCopy block so that they can be edited without deciding, in
// passing, that the homepage now shows the career FAQ.
//
// FIVE, and the count is this file's: the list's height is what the answer
// column is measured against. An editor changes what a question asks.
const questions = [
    {
        q: "Jak nás můžete kontaktovat?",
        a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    },
    {
        q: "S jakými společnostmi spolupracujeme?",
        a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
        q: "S čím se na nás můžete obracet?",
        a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
        q: "Je tato služba pro klienta zdarma?",
        a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
        q: "Co je to Benefit program?",
        a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
];

// Six, for the same reason: the row's wrap is measured against them.
const topics = [
    "Otázky/odpovědi",
    "Otázky/odpovědi",
    "Otázky/odpovědi",
    "Otázky/odpovědi",
    "Otázky/odpovědi",
    "Kontakt",
];

// The section's own labels. What is NOT here: the four inputs' placeholders,
// which are an attribute rather than a text node and have nothing on the page
// for a caret to go in.
//
// The heading, "Máte nějaký<br />dotaz?", used to be absent for the reason the
// other three broken elements were — it is one element holding two lines. It is
// stored as one string with a `\n` in it now (see @/components/common/ui/lines)
// and this is its fallback, in the shape the site layer answers with.
const FALLBACK_HEADING = [
    [["Máte nějaký", false]],
    [["dotaz?", false]],
];

const HEAD = {
    text: "Některé z nich jsme už zodpověděli. Nebo se nás rovnou zeptejte",
    photo: { src: "/assets/backgrounds/conferenceFront.webp", alt: "" },
    contactTab: "Kontakt",
    qnaTab: "QNA",
    answerHeading: "Odpověď",
};

const FORM = {
    fieldLabels: ["Jméno", "Email", "Tel. číslo", "Subjekt"],
    prefix: "+420",
    topicsLabel: "Téma:",
    messageHeading: "Vaše zpráva:",
    message: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    gdpr: "Kliknutím na tlačítko souhlasíte ke zpracování vašich osobních údajů",
    moreLabel: "více",
    submit: "Poslat zprávu",
};

// Which array the Q&A pairs are stored in, and what a member's two halves are
// called in it.
//
const Corners = () => (
    <>
        <span className="corner corner--tl" />
        <span className="corner corner--tr" />
        <span className="corner corner--bl" />
        <span className="corner corner--br" />
    </>
);

// Panel swap: the outgoing panel fades out, the incoming one fades in from
// the side it arrives from (kontakt sits left of qna in the switch).
const panelVariants = {
    initial: (direction) => ({ opacity: 0, x: direction * 30 }),
    enter: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } },
    exit: (direction) => ({ opacity: 0, x: direction * -30, transition: { duration: 0.3, ease: [0.76, 0, 0.24, 1] } }),
};

const rowVariants = {
    initial: { opacity: 0, y: 12 },
    enter: (i) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.76, 0, 0.24, 1], delay: 0.15 + i * 0.05 },
    }),
};

// One section, two states: the QNA list and the contact form. The switch and the
// answer swap are animated; the words are the CMS's.
// The head goes first and the rest follows it, a beat apart.
const HEAD_GROUP = group(0.05);

export default function QnaContact({ copy = {} }) {
    // Three documents: the section's chrome, the five questions, and the form.
    // Split because each is a list an editor reads as one thing, and a
    // positional list that runs to twenty is one nobody can check.
    const docId = copy.docId;
    const questionsCopy = copy.questions || {};
    const questionsDoc = questionsCopy.docId;
    // A question opens ITS OWN pair; the answer beside it opens the whole array.
    // Both are the `list` kind and the only difference is how much of the path is
    // named — `questions.3` is one member, `questions` is the array. That is what
    // was asked for: a question and its answer are one thing to edit, and the
    // block beside them is where you reorder or add one.
    //
    // The prefix is asked for rather than assumed. The pairs moved out of
    // `items[]` into a `questions[]` array of their own, and the site layer
    // reports which shape it actually read (server/site/homepage.js) — a store
    // seeded before that move still answers `items`. Naming the wrong one does
    // not fail loudly: the write returns 200 into a field no reader looks at, and
    // the text reverts in front of the editor, which reads as worse than not
    // being editable at all.
    const pairListPath = (index) =>
        questionsCopy.field === "questions" ? `questions.${index}` : `items.${index}`;

    const formCopy = copy.form || {};
    const formDoc = formCopy.docId;
    const head = {
        // Mark and lines apart: the mark is the field's declaration and holds
        // even when the value falls back. See MainIntro.
        headingMark: copy.heading?.mark,
        heading: hasLines(copy.heading?.lines) ? copy.heading.lines : FALLBACK_HEADING,
        text: copy.text || HEAD.text,
        photo: copy.photo?.src ? copy.photo : HEAD.photo,
        contactTab: copy.contactTab || HEAD.contactTab,
        qnaTab: copy.qnaTab || HEAD.qnaTab,
        answerHeading: copy.answerHeading || HEAD.answerHeading,
    };
    // Merged onto this file's own list by position, and truncated to it.
    const rows = questions.map((item, index) => ({
        q: questionsCopy.items?.[index]?.q || item.q,
        a: questionsCopy.items?.[index]?.a || item.a,
    }));
    const form = {
        fieldLabels: FORM.fieldLabels.map((l, i) => formCopy.fieldLabels?.[i] || l),
        prefix: formCopy.prefix || FORM.prefix,
        topicsLabel: formCopy.topicsLabel || FORM.topicsLabel,
        topics: topics.map((t, i) => formCopy.topics?.[i] || t),
        messageHeading: formCopy.messageHeading || FORM.messageHeading,
        message: formCopy.message || FORM.message,
        gdpr: formCopy.gdpr || FORM.gdpr,
        moreLabel: formCopy.moreLabel || FORM.moreLabel,
        submit: formCopy.submit || FORM.submit,
    };

    const [mode, setMode] = useState("qna"); // "qna" | "kontakt"
    const [activeQuestion, setActiveQuestion] = useState(0);
    const direction = mode === "qna" ? 1 : -1;

    const sectionRef = useRef(null);
    const progress = useSectionProgress(sectionRef);

    // background network: verticals first, horizontals branching off them
    const v1Draw = useTransform(progress, [0.1, 0.45], [0, 1]);
    const h1Draw = useTransform(progress, [0.38, 0.66], [0, 1]);
    const v2Draw = useTransform(progress, [0.3, 0.62], [0, 1]);
    const h2Draw = useTransform(progress, [0.55, 0.85], [0, 1]);
    const dotOpacity = useTransform(progress, [0.7, 0.9], [0, 1]);

    return (
        <motion.section
            className="QnaContact"
            ref={sectionRef}
            initial="hidden"
            whileInView="shown"
            viewport={ENTERS}
        >
            {/* The faint 11.25vw grid that used to be washed over this whole
                section is gone. The page already has a lattice — the one that
                lights under the pointer — and a second, static one printed
                behind the content was the same idea said twice. What is left is
                the structural lines, which carry on from the section above. */}
            <motion.div className="QnaContact__bgLine QnaContact__bgLine--v1" style={{ scaleY: v1Draw }} />
            <motion.div className="QnaContact__bgLine QnaContact__bgLine--v2" style={{ scaleY: v2Draw }} />
            <motion.div className="QnaContact__bgLine QnaContact__bgLine--h1" style={{ scaleX: h1Draw }} />
            <motion.div className="QnaContact__bgLine QnaContact__bgLine--h2" style={{ scaleX: h2Draw }} />
            <motion.span className="QnaContact__bgDot" style={{ opacity: dotOpacity }} />

            <motion.div className="QnaContact__head" variants={HEAD_GROUP}>
                {/* The fourth of the four "nejde editovat" reports: one element,
                    two lines, a `\n` in the store and a `<br />` on the page.
                    The annotation is on the <h2> itself — it is the box the
                    entrance is measured against and it holds nothing else. The
                    mark travels because it is the field's declaration; this
                    section has no rule for the accent class, so an editor who
                    used it here would store a run this heading draws plainly. */}
                <motion.h2 {...editable(docId, "headline", "text", head.headingMark)} variants={RISE}>
                    <Lines lines={head.heading} />
                </motion.h2>

                {/* The frame, not the canvas: GridDistortion paints the same
                    file on a plane over the picture, so the box that owns
                    `imageSrc` is what an editor means by "this photo". */}
                <motion.div
                    {...editable(docId, "image", "image")}
                    className="QnaContact__head__photo"
                    variants={PHOTO}
                >
                    <GridDistortion imageSrc={head.photo.src} cellSize={40}>
                        <Image
                            src={head.photo.src}
                            alt={head.photo.alt}
                            fill={true}
                            quality={80}
                            sizes="20vw"
                            style={{ objectFit: "cover", objectPosition: "center" }}
                        />
                    </GridDistortion>
                </motion.div>

                <motion.p {...editable(docId, "body", "text")} className="QnaContact__head__text" variants={RISE}>
                    {head.text}
                </motion.p>
            </motion.div>

            <motion.div className="QnaContact__switch" role="tablist" variants={RISE}>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "kontakt"}
                    className={`QnaContact__switch__btn ${mode === "kontakt" ? "isActive" : ""}`}
                    onClick={() => setMode("kontakt")}
                    data-cursor="frame"
                    {...editable(docId, "items.0.label", "text")}
                >
                    <Corners />
                    {head.contactTab}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "qna"}
                    className={`QnaContact__switch__btn ${mode === "qna" ? "isActive" : ""}`}
                    onClick={() => setMode("qna")}
                    data-cursor="frame"
                    {...editable(docId, "items.1.label", "text")}
                >
                    <Corners />
                    {head.qnaTab}
                </button>
            </motion.div>

            <motion.div className="QnaContact__body" variants={RISE}>
                <AnimatePresence mode="wait" custom={direction}>

                    {mode === "qna" ? (
                        <motion.div
                            key="qna"
                            className="QnaContact__panel QnaContact__panel--qna"
                            custom={direction}
                            variants={panelVariants}
                            initial="initial"
                            animate="enter"
                            exit="exit"
                        >
                            <ul className="QnaContact__questions">
                                {rows.map((item, index) => (
                                    <motion.li
                                        key={item.q}
                                        {...editableList(questionsDoc, pairListPath(index))}
                                        data-cursor="frame"
                                        custom={index}
                                        variants={rowVariants}
                                        initial="initial"
                                        animate="enter"
                                        className={index === activeQuestion ? "isActive" : ""}
                                        onClick={() => setActiveQuestion(index)}
                                    >
                                        {item.q}
                                    </motion.li>
                                ))}
                            </ul>

                            <div className="QnaContact__answer">
                                <h3 {...editable(docId, "items.2.label", "text")}>{head.answerHeading}</h3>
                                <AnimatePresence mode="wait">
                                    {/* The answer to whichever question is open,
                                        so the field path moves with the
                                        selection — question and answer are the
                                        label and the value of one item. */}
                                    <motion.p
                                        {...editableList(questionsDoc, questionsCopy.field === "questions" ? "questions" : "items")}
                                        key={activeQuestion}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}
                                    >
                                        {rows[activeQuestion].a}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="kontakt"
                            className="QnaContact__panel QnaContact__panel--kontakt"
                            custom={direction}
                            variants={panelVariants}
                            initial="initial"
                            animate="enter"
                            exit="exit"
                        >
                            <div className="QnaContact__fields">
                                {[
                                    { label: form.fieldLabels[0], name: "name" },
                                    { label: form.fieldLabels[1], name: "email" },
                                ].map((field, index) => (
                                    <motion.label
                                        key={field.name}
                                        custom={index}
                                        variants={rowVariants}
                                        initial="initial"
                                        animate="enter"
                                        className="QnaContact__field"
                                    >
                                        <span {...editable(formDoc, `items.${index}.label`, "text")} className="label">{field.label}</span>
                                        <input type="text" name={field.name} placeholder="Lorem ipsum" data-cursor="frame" />
                                    </motion.label>
                                ))}

                                <motion.label
                                    custom={2}
                                    variants={rowVariants}
                                    initial="initial"
                                    animate="enter"
                                    className="QnaContact__field"
                                >
                                    <span {...editable(formDoc, "items.2.label", "text")} className="label">{form.fieldLabels[2]}</span>
                                    <span {...editable(formDoc, "items.4.label", "text")} className="prefix">{form.prefix} <RiArrowDownSLine size={15} /></span>
                                    <input type="tel" name="phone" placeholder="Lorem ipsum" data-cursor="frame" />
                                </motion.label>

                                <motion.label
                                    custom={3}
                                    variants={rowVariants}
                                    initial="initial"
                                    animate="enter"
                                    className="QnaContact__field"
                                >
                                    <span {...editable(formDoc, "items.3.label", "text")} className="label">{form.fieldLabels[3]}</span>
                                    <input type="text" name="subject" placeholder="Lorem ipsum" data-cursor="frame" />
                                </motion.label>

                                <motion.div
                                    custom={4}
                                    variants={rowVariants}
                                    initial="initial"
                                    animate="enter"
                                    className="QnaContact__field QnaContact__field--topics"
                                >
                                    <span {...editable(formDoc, "items.5.label", "text")} className="label">{form.topicsLabel}</span>
                                    <div className="topics">
                                        {form.topics.map((topic, index) => (
                                            <button
                                                key={index}
                                                {...editable(formDoc, `items.${6 + index}.label`, "text")}
                                                type="button"
                                                className="topic"
                                                data-cursor="frame"
                                            >
                                                <Corners />
                                                {topic}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>

                            <div className="QnaContact__message">
                                <h3 {...editable(formDoc, "items.12.label", "text")}>{form.messageHeading}</h3>
                                {/* The message the box opens with is the block's
                                    `body`, not one of its items. Unannotated: a
                                    textarea's value is not a text node, so there
                                    is nothing here an in-place editor could put a
                                    caret in — and the Studio locks a whole field
                                    at a time, so on an item it would have been
                                    editable nowhere at all. */}
                                <textarea
                                    data-cursor="frame"
                                    name="message"
                                    defaultValue={form.message}
                                />
                                <div className="QnaContact__message__foot">
                                    <p {...editable(formDoc, "items.13.label", "text")} className="gdpr">
                                        {form.gdpr}
                                    </p>
                                    {/* /ochrana-soukromi is a path on this site,
                                        so only the word is editable — the target
                                        is the site's own routing. */}
                                    <MoreLink
                                        {...editableLink(formDoc, { text: "items.14.label" })}
                                        href="/ochrana-soukromi"
                                        direction="upRight"
                                        className="more"
                                    >
                                        {form.moreLabel}
                                    </MoreLink>
                                    <button
                                        {...editable(formDoc, "items.15.label", "text")}
                                        type="button"
                                        className="QnaContact__send"
                                        data-cursor="frame"
                                    >
                                        <Corners />
                                        {form.submit}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </motion.div>
        </motion.section>
    );
}
