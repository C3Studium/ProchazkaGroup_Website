"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, cubicBezier, motion } from "framer-motion";
import { toast } from "sonner";
import GridDistortion from "@/components/common/ui/GridDistortion";
import MoreLink from "@/components/common/ui/MoreLink";
import Arrow from "@/components/common/ui/Arrow";
import { EXTERNAL_CLASS } from "@/components/common/ui/externalLink";
import { editable, editableDoc, editableLink, isEditMode } from "@/cms/edit";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// The sheet's own words come from the CMS (siteCopy "global.contact" — see
// getContactContent in @/cms/server/site/footer, where CONTACT_LINES names the
// positions this file spells as literals). These are what it shipped with and
// what it falls back to; a route whose getStaticProps hands down nothing renders
// exactly this.
//
// The non-breaking space in the dial prefix is the markup's own and is load
// bearing, which is why these lines are read as `title` / `items[].label` rather
// than through `plainText()` — `\s` in JavaScript matches U+00A0.
const FALLBACK = {
    eyebrow: "Spojme se",
    claim: "Napište nám a ozveme se vám zpátky — obvykle do jednoho pracovního dne.",
    labels: [
        "Jméno",
        "Email",
        "Telčíslo",
        "+420 |",
        "Preferovaný čas hovoru",
        "Od",
        "Do",
        "Kliknutím na tlačítko souhlasíte ke zpracování vašich osobních údajů",
        "více",
        "Poslat zprávu",
        "Nebo rovnou",
    ],
};

/** One label, by position, falling back on the one the sheet shipped with. */
const labelAt = (copy, index) =>
    copy?.labels?.[index]?.trim() ? copy.labels[index].trim() : FALLBACK.labels[index];

// Whose sheet this is comes from the Studio — the `assistant` type, read on
// every page beside the patička because this opens from the navigation and the
// navigation has no props of its own. See @/cms/server/site/footer.
//
// Nothing is hardcoded here, and the empty state is deliberate rather than
// defensive: with no row in the Studio the right-hand half shows the frame and
// the labels and no invented name. A placeholder person on a contact sheet is a
// lie the reader cannot check.

const Req = () => <em className="ContactModal__req" aria-hidden="true">*</em>;

// The contact sheet, opened from the word in the navbar.
//
// It is the home page's CTA with its two useful halves and nothing else: the
// form on the left, the person who will read it on the right. No advisor list —
// this is the general way in, and choosing a particular advisor is what
// /o-nas and the CTA are for.
// Everything the Tab key is allowed to reach. `[href]` rather than `a` because
// an anchor without one is not a stop, and the negated `[tabindex="-1"]` because
// an element taken out of the order by hand means it.
const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function ContactModal({ open, onClose, assistant, copy }) {
    const [mounted, setMounted] = useState(false);
    const closeRef = useRef(null);
    const wrapRef = useRef(null);
    const backdropRef = useRef(null);
    const [values, setValues] = useState({
        name: "", email: "", phone: "", timeFrom: "", timeTo: "",
    });

    useEffect(() => setMounted(true), []);

    // Where the keyboard is while the sheet is up.
    //
    // The sheet used to open from one place — the word in the bar — and leaving
    // focus on that word was survivable. It now opens from five buttons in the
    // page as well, so a reader who takes one is told a dialog opened and then
    // finds the caret still in the section behind it, tabbing through a page
    // that has a sheet over it. Focus goes to the control that closes the sheet
    // and comes back to whatever opened it.
    //
    // `preventScroll` because the page under the sheet is one long scroll-driven
    // timeline: focusing an element in it scrolls it, and the section an editor
    // or a visitor came from would have moved by the time the sheet closes.
    //
    // Keyed on `open` alone. `onClose` is an inline arrow at the call site and
    // therefore a new function on every render of the bar; including it would
    // re-run this — and the lenis effect below — on renders where nothing about
    // the sheet changed.
    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement;
        // After the frame the portal is painted in — `focus()` on an element
        // that is not laid out yet does nothing.
        const frame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
        return () => {
            cancelAnimationFrame(frame);
            opener?.focus?.({ preventScroll: true });
        };
    }, [open]);

    // Escape closes it, and Tab cannot leave it.
    //
    // `aria-modal` tells an assistive technology that the rest of the page is
    // inert; it does not make it so, and the sheet is a `<div>` over a page that
    // still has every one of its own links in the tab order. Without this a
    // reader who tabs past the submit button is silently back in the section
    // behind the sheet, reading a page they cannot see.
    //
    // Written here rather than pulled in: a focus trap is a dozen lines and a
    // dependency for it would be a dependency in the public bundle of every
    // route on the site. `<dialog>` would have given it for free, and is what
    // this should become — but it also owns the top layer, the backdrop and the
    // open/close transition, and framer-motion draws all three today.
    //
    // The order is read at each keystroke rather than once on open, because the
    // sheet's own contents move: the person's half appears only when there is a
    // row for her, and her two addresses are two more stops.
    useEffect(() => {
        if (!open) return;
        window.lenis?.stop();
        const onKey = (e) => {
            if (e.key === "Escape") { onClose(); return; }
            if (e.key !== "Tab") return;
            const wrap = wrapRef.current;
            if (!wrap) return;
            // `getClientRects()` and not `offsetParent`, which is null for a
            // fixed element — and this sheet is fixed.
            const stops = [...wrap.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
            if (!stops.length) return;
            const first = stops[0];
            const last = stops[stops.length - 1];
            const active = document.activeElement;
            // Focus that is already outside — the address bar, a click on the
            // backdrop — comes back to whichever end the key was heading for,
            // rather than being left where the browser put it.
            if (!wrap.contains(active)) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus({ preventScroll: true });
            } else if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus({ preventScroll: true });
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus({ preventScroll: true });
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.lenis?.start();
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    // The two ways out of the sheet, inside the editing surface.
    //
    // `@/cms/edit/overlay/lock` stops every pointer event at the framed page's
    // document in the capture phase, so while editing is armed neither the ✕ nor
    // the backdrop runs its own `onClick` — measured: both left the sheet open,
    // which is the same "kliknutí nic nedělá" the layering bug produced. Escape
    // still worked, and one key is not a way out of a dialog an editor was
    // invited to open.
    //
    // A capture listener on the same node is what lock.js leaves room for (it
    // uses `stopPropagation`, not the immediate form). It is installed only
    // while the sheet is up and only inside the surface, so a visitor's sheet
    // closes the way it always did, through React.
    //
    // Matched on the refs rather than on the class names: these are two elements
    // in this file, and a selector would be their identity written a second time
    // in the one place that already holds it.
    useEffect(() => {
        if (!open || !isEditMode()) return undefined;
        const onClick = (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target === backdropRef.current || closeRef.current?.contains(target)) {
                event.preventDefault();
                onClose();
            }
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, [open, onClose]);

    const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

    const onSubmit = (event) => {
        event.preventDefault();
        if (!values.name.trim() || !values.email.trim() || !values.phone.trim()) {
            toast.error("Vyplňte prosím jméno, e-mail a telefon.");
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
            toast.error("Zkontrolujte prosím e-mailovou adresu.");
            return;
        }
        // Stops in the same place the home page's CTA stops, and deliberately:
        // `useResend` wants a template name and a mailbox that nobody has given
        // yet. See TODO.md. Inventing a destination here would be worse than
        // saying so.
        toast.error("Odesílání formuláře zatím není napojené.");
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        ref={backdropRef}
                        className="ContactModal__backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: GLIDE }}
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    <div ref={wrapRef} className="ContactModal__wrap" role="dialog" aria-modal="true" aria-label="Spojme se">
                        <motion.div
                            className="ContactModal"
                            initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
                            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
                            exit={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
                            transition={{ duration: 0.65, ease: GLIDE }}
                        >
                            <button
                                ref={closeRef}
                                type="button"
                                className="ContactModal__close"
                                onClick={onClose}
                                data-cursor="frame"
                                aria-label="Zavřít"
                            >
                                <span /><span />
                            </button>

                            {/* The scroll lives one level in, so the ✕ above
                                stays pinned to the sheet's corner while a
                                short viewport scrolls the halves under it —
                                absolute children of a scroller travel with
                                its content, and on a phone that took the only
                                way out off the screen. */}
                            <div className="ContactModal__scroll">

                            {/* --- left: the form -------------------------- */}
                            <div className="ContactModal__formCol">
                                <span
                                    {...editable(copy?.docId, "title", "text")}
                                    className="ContactModal__eyebrow"
                                >
                                    {copy?.eyebrow?.trim() ? copy.eyebrow.trim() : FALLBACK.eyebrow}
                                </span>
                                <p
                                    {...editable(copy?.docId, "body", "text")}
                                    className="ContactModal__claim"
                                >
                                    {copy?.claim?.trim() ? copy.claim.trim() : FALLBACK.claim}
                                </p>

                                <form className="ContactModal__form" onSubmit={onSubmit} noValidate>
                                    <span className="corner corner--tl" />
                                    <span className="corner corner--tr" />
                                    <span className="corner corner--bl" />
                                    <span className="corner corner--br" />

                                    {/* The word, not the whole label: the label
                                        also carries the required mark and the
                                        rule after it, and an editor saving the
                                        label would store "Jméno* |". The added
                                        <span>s are bare and inline, and the only
                                        `span` rule in this stylesheet belongs to
                                        the close button. Same decision the
                                        showcase's eyebrow made. */}
                                    <label>
                                        <span className="label">
                                            <span {...editable(copy?.docId, "items.0.label", "text")}>{labelAt(copy, 0)}</span>
                                            <Req />&nbsp;|
                                        </span>
                                        <input type="text" name="name" value={values.name} onChange={set("name")} data-cursor="frame" />
                                    </label>
                                    <label>
                                        <span className="label">
                                            <span {...editable(copy?.docId, "items.1.label", "text")}>{labelAt(copy, 1)}</span>
                                            <Req />&nbsp;|
                                        </span>
                                        <input type="email" name="email" value={values.email} onChange={set("email")} data-cursor="frame" />
                                    </label>
                                    <label>
                                        <span className="label">
                                            <span {...editable(copy?.docId, "items.2.label", "text")}>{labelAt(copy, 2)}</span>
                                            <Req />&nbsp;|
                                        </span>
                                        <div className="telRow">
                                            <span
                                                {...editable(copy?.docId, "items.3.label", "text")}
                                                className="prefix"
                                            >
                                                {labelAt(copy, 3)}
                                            </span>
                                            <input type="tel" name="phone" value={values.phone} onChange={set("phone")} data-cursor="frame" />
                                        </div>
                                    </label>

                                    <div className="timeRow">
                                        <span
                                            {...editable(copy?.docId, "items.4.label", "text")}
                                            className="label"
                                        >
                                            {labelAt(copy, 4)}
                                        </span>
                                        <div className="times">
                                            {/* The word inside its own <span>: the
                                                <label> holds the input as well,
                                                and an annotation on it would edit
                                                both. */}
                                            <label>
                                                <span {...editable(copy?.docId, "items.5.label", "text")}>{labelAt(copy, 5)}</span>{" "}
                                                <input type="text" name="timeFrom" value={values.timeFrom} onChange={set("timeFrom")} data-cursor="frame" />
                                            </label>
                                            <label>
                                                <span {...editable(copy?.docId, "items.6.label", "text")}>{labelAt(copy, 6)}</span>{" "}
                                                <input type="text" name="timeTo" value={values.timeTo} onChange={set("timeTo")} data-cursor="frame" />
                                            </label>
                                        </div>
                                    </div>

                                    <p className="gdpr">
                                        <span {...editable(copy?.docId, "items.7.label", "text")}>{labelAt(copy, 7)}</span>{" "}
                                        {/* Words only: /ochrana-soukromi is a path
                                            on this site. */}
                                        <MoreLink
                                            {...editableLink(copy?.docId, { text: "items.8.label" })}
                                            href="/ochrana-soukromi"
                                        >
                                            {labelAt(copy, 8)}
                                        </MoreLink>
                                    </p>

                                    {/* The last line of the form, and written
                                        as a line: a rule out of the left
                                        margin and the button on the end of it.
                                        Full width and centred it was the only
                                        filled shape in a sheet drawn in
                                        hairlines — and this is the same send
                                        the home page's CTA ends on. */}
                                    <div className="ContactModal__send">
                                        <span className="ContactModal__send__rule" aria-hidden="true" />
                                        <button
                                            {...editable(copy?.docId, "items.9.label", "text")}
                                            type="submit"
                                            className="cornerButton ContactModal__submit"
                                            data-cursor="frame"
                                        >
                                            <span className="corner corner--tl" />
                                            <span className="corner corner--tr" />
                                            <span className="corner corner--bl" />
                                            <span className="corner corner--br" />
                                            {labelAt(copy, 9)}
                                            <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* --- right: who reads it --------------------- */}
                            {/* The whole half, as her own document: her name, her
                                role, her photograph and both her addresses are
                                fields of one `assistant` row, and what an editor
                                wants from clicking any of them is the form they
                                already know. `id` reaches here only in draft mode
                                — see `provenance` in @/cms/server/site/content. */}
                            <div
                                {...editableDoc(assistant?.id, "assistant")}
                                className="ContactModal__person"
                            >
                                <div className="ContactModal__photo" data-cursor="frame">
                                    {assistant?.photo?.src ? (
                                        <GridDistortion imageSrc={assistant.photo.src} cellSize={42}>
                                            <Image
                                                src={assistant.photo.src}
                                                alt={assistant.photo.alt || assistant.name || ""}
                                                fill={true}
                                                quality={90}
                                                sizes="24vw"
                                                style={{ objectFit: "cover", objectPosition: "top center" }}
                                            />
                                        </GridDistortion>
                                    ) : (
                                        <span className="ContactModal__photo__empty" aria-hidden="true" />
                                    )}
                                </div>

                                {assistant?.name && (
                                    <h2 className="ContactModal__name">{assistant.name}</h2>
                                )}
                                {assistant?.role && (
                                    <span className="ContactModal__role">{assistant.role}</span>
                                )}

                                <span className="ContactModal__rule" aria-hidden="true" />

                                {(assistant?.email || assistant?.phone) && (
                                    <span
                                        {...editable(copy?.docId, "items.10.label", "text")}
                                        className="ContactModal__or"
                                    >
                                        {labelAt(copy, 10)}
                                    </span>
                                )}
                                {/* mailto: and tel: leave the site, so both
                                    carry the marker. Neither is annotated
                                    separately: they are two fields of the one
                                    `assistant` row the whole column already
                                    opens, and a second offer on top of it would
                                    be two ways to change the same address. */}
                                {assistant?.email && (
                                    <a href={`mailto:${assistant.email}`} className={`ContactModal__link ${EXTERNAL_CLASS}`} data-cursor="frame">
                                        {assistant.email}
                                    </a>
                                )}
                                {assistant?.phone && (
                                    <a href={`tel:${assistant.phone.replace(/\s+/g, "")}`} className={`ContactModal__link ${EXTERNAL_CLASS}`} data-cursor="frame">
                                        {assistant.phone}
                                    </a>
                                )}
                            </div>

                            <span className="ContactModal__seam" aria-hidden="true" />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
}
