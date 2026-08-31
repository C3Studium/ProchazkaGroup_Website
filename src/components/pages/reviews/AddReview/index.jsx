"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, cubicBezier, motion, useReducedMotion } from "framer-motion";
import Arrow from "@/components/common/ui/Arrow";
import { RiArrowDownSLine } from "@remixicon/react";
import { toast } from "sonner";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// The one thing this page asks of the reader, kept where it can always be
// reached: a fixed plate in the corner rather than a button somewhere down the
// wall. Hairline, dimmed, square — the plate the partners page uses.
//
// It posts to /api/cms/reviews, which is this site's own public endpoint: it
// builds the stored body itself, forces `approved: false`, and carries a
// honeypot. The older `useReviewForm` hook writes to Supabase instead, which is
// NOT where this page reads its reviews from — wiring the form to that would
// have submissions land in a database nothing on the site displays.
export default function AddReview({ consultants = [] }) {
    const [open, setOpen] = useState(false);
    // Calm, not killed: the sheet still fades, it just stops travelling.
    const calm = useReducedMotion();
    const [busy, setBusy] = useState(false);
    // The portal's gate. `document.body` does not exist while this renders on
    // the server, so the overlay is mounted on the client's first commit and
    // never server-rendered — the same shape ReviewWall uses for the review
    // sheet a few lines down the page.
    const [mounted, setMounted] = useState(false);
    const [form, setForm] = useState({
        customerName: "",
        consultantName: "",
        message: "",
        website: "",
    });

    useEffect(() => setMounted(true), []);

    // The roster the picker is built from. `consultants` arrives from
    // /recenze as plain names — `consultants.map((c) => c.name)` — so a blank
    // one is a record with no name rather than a person, and it would open the
    // list with an unpickable empty row in it.
    const roster = consultants.filter(Boolean);

    useEffect(() => {
        if (!open) return;
        window.lenis?.stop();
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => {
            window.lenis?.start();
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.customerName.trim()) return toast.error("Doplňte prosím jméno.");
        if (!form.consultantName.trim()) return toast.error("Vyberte prosím poradce.");
        if (!form.message.trim()) return toast.error("Napište prosím pár slov.");

        setBusy(true);
        try {
            const res = await fetch("/api/cms/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(String(res.status));
            toast.success("Děkujeme. Recenzi zveřejníme, jakmile ji projdeme.");
            setForm({ customerName: "", consultantName: "", message: "", website: "" });
            setOpen(false);
        } catch {
            toast.error("Odeslání se nepovedlo. Zkuste to prosím znovu.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="AddRev">
                <button
                    type="button"
                    className="AddRev__button"
                    data-cursor="frame"
                    onClick={() => setOpen(true)}
                >
                    <span className="corner corner--tl" />
                    <span className="corner corner--tr" />
                    <span className="corner corner--bl" />
                    <span className="corner corner--br" />
                    Napsat recenzi
                    <Arrow direction="upRight" />
                </button>
            </div>

            {/* Out of the wall and onto the document.

                Both layers below are `position: fixed`, and fixed means "the
                viewport" only while no ancestor is transformed. `<main>` IS
                transformed — the preloader and PageVeil scale it and hand it
                `will-change: transform` for the length of a run — and an
                ancestor with either of those becomes the containing block for
                every fixed descendant. Measured on /recenze at 1920×1080,
                scrolled 1200px down, with a transform on `<main>`: the sheet
                came out at y=-1200 with the card at y=-1007, and the backdrop
                sized itself to the whole document (1920×3270) instead of the
                screen. The sheet is laid out against the page rather than the
                window, so it lands wherever the reader is not.

                A portal takes it out of that ancestry altogether, which is what
                ReviewSheet on this same page and the ContactModal already do.
                Nothing about the sheet's own CSS changes. */}
            {mounted && createPortal(
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            className="AddRev__backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: GLIDE }}
                            onClick={() => setOpen(false)}
                            aria-hidden="true"
                        />
                        {/* The layer, not the card. It is `inset: 0` and lays
                            the card out inside its own padding, which is what
                            keeps the sheet on screen: the card used to be
                            `top: 50%` centred by a CSS `translateY(-50%)`, and
                            framer-motion writes its own transform for the `y`
                            it animates — so the centring was overwritten the
                            moment the sheet opened and the card hung off the
                            bottom of every viewport with `Odeslat` below the
                            fold. Measured, before: the send button sat at
                            y=876 in an 844-tall phone and y=1098 in a 1080-tall
                            desktop. Nothing here transforms, so nothing fights.
                            Only the card takes pointer events; taps beside it
                            reach the backdrop and close. */}
                        <motion.form
                            className="AddRev__sheet"
                            onSubmit={submit}
                            initial={{ opacity: 0, y: calm ? 0 : "3vh" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: calm ? 0 : "1.5vh" }}
                            transition={{ duration: 0.45, ease: GLIDE }}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Napsat recenzi"
                        >
                            <div className="AddRev__card">
                            {/* Pinned to the card, above the scroller. In a
                                390-tall landscape phone the head is the first
                                thing that scrolls away, and with it the only
                                way out of a sheet that has stopped the page. */}
                            <div className="AddRev__panel__head">
                                <span className="AddRev__panel__eyebrow">Recenze</span>
                                <button
                                    type="button"
                                    className="AddRev__close"
                                    onClick={() => setOpen(false)}
                                    data-cursor="frame"
                                    aria-label="Zavřít"
                                >
                                    <span /><span />
                                </button>
                            </div>
                            <span className="AddRev__panel__rule" aria-hidden="true" />

                            {/* The scroll lives here rather than on the card,
                                so the head stays put and the page behind
                                cannot be dragged through it.

                                `data-lenis-prevent` because the page's scroll
                                is stopped while the sheet is up and a stopped
                                lenis still takes the wheel and the touch drag
                                off the window without handing this element
                                anything. It only matters where the card is
                                taller than the window and clamps — a short
                                laptop, a phone in landscape — but that is
                                exactly where the send button is the part below
                                the fold. Same attribute, same reason, as
                                ContactModal and RevSheet. */}
                            <div className="AddRev__scroll" data-lenis-prevent>
                                {/* The three modifiers below carry no look of
                                    their own. They are the handles the
                                    landscape-phone rule places the form's two
                                    columns with, and a stylesheet that has to
                                    find "the first field" by counting children
                                    breaks the next time a field is added. */}
                                <label className="AddRev__field AddRev__field--name">
                                    <span>Vaše jméno <em>*</em></span>
                                    <input type="text" value={form.customerName} onChange={set("customerName")} data-cursor="frame" />
                                </label>

                                {/* The one field that is a choice rather than a
                                    sentence, and now the control that says so.
                                    It was an `<input list>` — a suggest box you
                                    could also type a stranger's name into —
                                    while the form's own check has always read
                                    «Vyberte prosím poradce», choose. A native
                                    <select> is what that sentence describes: it
                                    hands a phone its own wheel, and the roles,
                                    the focus handling and the type-ahead a
                                    hand-rolled listbox would owe come from the
                                    platform for nothing.

                                    At every width, deliberately. Which advisor
                                    this is about is a closed question on a
                                    desktop exactly as it is on a phone, and the
                                    site already answers it this way in two other
                                    places — the homepage CTA and the benefit
                                    programme — so the look is theirs, the shared
                                    `pickField` in styles/system/_controls.scss.

                                    With no roster it falls back to what was here
                                    before. See the note in styles.scss: a picker
                                    whose only choice is «Benefit Program» would
                                    turn a CMS outage into a review page that
                                    cannot be told which person the review is
                                    about, and typing a name is worse than
                                    picking one but far better than that. */}
                                <label className="AddRev__field AddRev__field--pick">
                                    <span>Koho se týká <em>*</em></span>
                                    {roster.length > 0 ? (
                                        <span className="AddRev__pick__field">
                                            <select
                                                className="AddRev__pick__select"
                                                value={form.consultantName}
                                                onChange={set("consultantName")}
                                                data-cursor="frame"
                                            >
                                                {/* Disabled rather than merely
                                                    empty: the field is required,
                                                    so the blank is a state to
                                                    leave and never one to come
                                                    back to. It is also what the
                                                    reset after a successful send
                                                    returns the control to. */}
                                                <option value="" disabled>Vyberte poradce</option>
                                                {roster.map((name) => <option key={name} value={name}>{name}</option>)}
                                                <option value="Benefit Program">Benefit Program</option>
                                            </select>
                                            <RiArrowDownSLine className="AddRev__pick__chevron" size={20} aria-hidden="true" />
                                        </span>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                list="addrev-consultants"
                                                value={form.consultantName}
                                                onChange={set("consultantName")}
                                                data-cursor="frame"
                                            />
                                            <datalist id="addrev-consultants">
                                                <option value="Benefit Program" />
                                            </datalist>
                                        </>
                                    )}
                                </label>

                                <label className="AddRev__field AddRev__field--text">
                                    <span>Vaše zkušenost <em>*</em></span>
                                    <textarea rows={5} value={form.message} onChange={set("message")} data-cursor="frame" />
                                </label>

                                {/* Left empty by people and filled by scripts — the
                                    endpoint drops anything that arrives with it set. */}
                                <input
                                    type="text"
                                    className="AddRev__trap"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={form.website}
                                    onChange={set("website")}
                                    aria-hidden="true"
                                />

                                <button type="submit" className="AddRev__send" data-cursor="frame" disabled={busy}>
                                    <span className="corner corner--tl" />
                                    <span className="corner corner--tr" />
                                    <span className="corner corner--bl" />
                                    <span className="corner corner--br" />
                                    {busy ? "Odesílám…" : "Odeslat"}
                                    <Arrow direction="upRight" />
                                </button>

                                <p className="AddRev__note">
                                    Recenze se zveřejní až po schválení.
                                </p>
                            </div>
                            </div>
                        </motion.form>
                    </>
                )}
            </AnimatePresence>,
            document.body,
            )}
        </>
    );
}
