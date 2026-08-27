"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, cubicBezier, motion, useReducedMotion } from "framer-motion";
import Arrow from "@/components/common/ui/Arrow";
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
    const [form, setForm] = useState({
        customerName: "",
        consultantName: "",
        message: "",
        website: "",
    });

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
                                cannot be dragged through it. */}
                            <div className="AddRev__scroll">
                                <label className="AddRev__field">
                                    <span>Vaše jméno <em>*</em></span>
                                    <input type="text" value={form.customerName} onChange={set("customerName")} data-cursor="frame" />
                                </label>

                                <label className="AddRev__field">
                                    <span>Koho se týká <em>*</em></span>
                                    <input
                                        type="text"
                                        list="addrev-consultants"
                                        value={form.consultantName}
                                        onChange={set("consultantName")}
                                        data-cursor="frame"
                                    />
                                    <datalist id="addrev-consultants">
                                        {consultants.map((name) => <option key={name} value={name} />)}
                                        <option value="Benefit Program" />
                                    </datalist>
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
            </AnimatePresence>
        </>
    );
}
