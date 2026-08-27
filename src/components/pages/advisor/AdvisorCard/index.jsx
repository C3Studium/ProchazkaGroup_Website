"use client";

import { useState } from "react";
import Image from "next/image";
import { cubicBezier, motion } from "framer-motion";
import { toast } from "sonner";
import { RiChat3Line, RiThumbUpLine } from "@remixicon/react";
import GridDistortion from "@/components/common/ui/GridDistortion";
import { useGlobalContext } from "@/context/LoadProvider";
import MoreLink from "@/components/common/ui/MoreLink";
import Arrow from "@/components/common/ui/Arrow";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);
const OFFICE_CITY = "Písek";

// Google's own review form for the office, and the only way a review of ours
// can also become one of theirs.
//
// It cannot be automatic. Google's API can read reviews and reply to them but
// never create one, and its form takes no prefilled text — the URL tricks that
// used to preselect a star rating are closed, and a link attempting it breaks
// their policies as well as breaking. So the reader is handed their own words
// on the clipboard and Google's empty form, and types nothing twice.
//
// The place id is not in the repository yet. Until it is, the Google half
// simply does not render: half a handoff is a dead link on a printed card's
// landing page, which is worse than no offer at all.
const GOOGLE_PLACE_ID = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID || "";
const googleReviewUrl = GOOGLE_PLACE_ID
    ? `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`
    : null;
const Req = () => <em className="AdvCard__req" aria-hidden="true">*</em>;

// One advisor, on one card, at the width of a phone — and one thing to do on it.
//
// This is the page behind the QR code on that person's business card. It is
// built to be read on a phone and it stays that width everywhere: a layout that
// reflowed into three columns on a laptop would be a different page for the same
// visit. On a wide screen the card simply stands in the middle and the shader
// fills the rest, which is why nothing here has a background of its own.
//
// The one composition that is not that one is a phone held sideways, where the
// screen is 390px tall and the portrait alone is 550px of it. There the card
// puts the person beside the ask instead of above it — see the `phs-h` block at
// the bottom of the stylesheet.
//
// It is the home page's CTA folded in half — its right-hand column (photograph,
// name, counts) over its middle one (the form) — because on a card-sized page
// the person has to arrive before the ask.
//
// The form is a REVIEW, not a callback. Two things follow from that. The
// consultant is not chosen: the code that was scanned already said who, so the
// name travels in the body and never appears as a field. And it posts to
// /api/cms/reviews, the site's own public endpoint, which builds the stored body
// itself and forces `approved: false` — the older `useReviewForm` hook writes to
// Supabase, which is not where the wall at /recenze reads from.
//
// The phone number that stood here is gone. It is a real thing to want, but it
// was a second call to action on a page that exists for one, and the number is
// already on the card this was scanned from.
export default function AdvisorCard({ advisor }) {
    const { gate } = useGlobalContext();
    // The card is the page's only surface and the portrait lives inside it,
    // so both enter at "ground" — a photo opening inside a still-invisible
    // card would be no photo at all when the preloader's window opens. The
    // card has no separately-animated text children to hold back for "go".
    const ground = gate !== "hold";
    const [values, setValues] = useState({ customerName: "", message: "", website: "" });
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    // Kept apart from `values`: the form is unmounted the moment it is sent, and
    // the clipboard button needs the words after that.
    const [written, setWritten] = useState("");
    const [copied, setCopied] = useState(false);

    const copyText = async () => {
        try {
            await navigator.clipboard.writeText(written);
            setCopied(true);
            setTimeout(() => setCopied(false), 2600);
        } catch {
            // Refused, or no clipboard at all over plain http. Saying so beats a
            // button that silently did nothing.
            toast.error("Zkopírování se nepovedlo, označte prosím text ručně.");
        }
    };

    const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

    const onSubmit = async (event) => {
        event.preventDefault();
        if (!values.customerName.trim()) return toast.error("Doplňte prosím jméno.");
        if (!values.message.trim()) return toast.error("Napište prosím pár slov.");

        setBusy(true);
        try {
            const res = await fetch("/api/cms/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: values.customerName,
                    // Not a field. The page knows whose it is.
                    consultantName: advisor.name,
                    message: values.message,
                    website: values.website,
                }),
            });
            if (!res.ok) throw new Error(String(res.status));
            setWritten(values.message);
            setSent(true);
        } catch {
            toast.error("Odeslání se nepovedlo. Zkuste to prosím znovu.");
        } finally {
            setBusy(false);
        }
    };

    const photo = advisor.portrait?.src;

    return (
        <div className="AdvCard">
            <motion.article
                className="AdvCard__card"
                initial={{ opacity: 0, y: "3vh" }}
                animate={ground ? { opacity: 1, y: "0vh" } : undefined}
                transition={{ duration: 0.68, ease: GLIDE, delay: 0 }}
            >
                {/* --- the person -------------------------------------------- */}
                {/* A group, not a wrapper: it is `display: contents` at every
                    width the card is a single column, so the portrait layout is
                    exactly what it was without it. It becomes a real column
                    only on a phone held sideways, where the person stands
                    beside the ask instead of three screens above it. */}
                <div className="AdvCard__head">
                    <motion.div
                        className="AdvCard__photo"
                        data-cursor="frame"
                        initial={{ clipPath: "inset(100% 0% 0% 0%)", scale: 1.06 }}
                        animate={ground ? { clipPath: "inset(0% 0% 0% 0%)", scale: 1 } : undefined}
                        transition={{ duration: 0.9, ease: GLIDE, delay: 0 }}
                    >
                        {photo ? (
                            <GridDistortion imageSrc={photo} cellSize={40}>
                                <Image
                                    src={photo}
                                    alt={advisor.portrait?.alt || advisor.name}
                                    fill={true}
                                    quality={90}
                                    sizes="(orientation: landscape) and (max-height: 520px) 280px, 440px"
                                    style={{ objectFit: "cover", objectPosition: "top center" }}
                                />
                            </GridDistortion>
                        ) : (
                            <span className="AdvCard__photo__empty" aria-hidden="true" />
                        )}
                    </motion.div>

                    <div className="AdvCard__who">
                        <h1 className="AdvCard__name">
                            {advisor.firstName}<br />{advisor.lastName}
                            <span className="AdvCard__city">{OFFICE_CITY}</span>
                        </h1>

                        <div className="AdvCard__stats">
                            <span>{advisor.likes ?? 0} <RiThumbUpLine size={18} /></span>
                            <span>{advisor.reviewCount ?? 0} <RiChat3Line size={18} /></span>
                        </div>
                    </div>

                    {advisor.motto && <p className="AdvCard__motto">{advisor.motto}</p>}

                    <span className="AdvCard__rule" aria-hidden="true" />
                </div>

                {sent ? (
                    <motion.div
                        className="AdvCard__thanks"
                        initial={{ opacity: 0, y: "1.4vh" }}
                        animate={{ opacity: 1, y: "0vh" }}
                        transition={{ duration: 0.6, ease: GLIDE }}
                    >
                        <span className="corner corner--tl" />
                        <span className="corner corner--tr" />
                        <span className="corner corner--bl" />
                        <span className="corner corner--br" />
                        <h2>Děkujeme</h2>
                        <p>
                            Recenzi jsme přijali. Zveřejníme ji, jakmile ji projdeme.
                        </p>

                        {googleReviewUrl && (
                            <div className="AdvCard__google">
                                <span className="AdvCard__google__rule" aria-hidden="true" />
                                <p className="AdvCard__google__ask">
                                    Pomohlo by nám to i na Googlu. Text máte napsaný —
                                    zkopírujte si ho a vložte.
                                </p>
                                <div className="AdvCard__google__row">
                                    <button
                                        type="button"
                                        className="cornerButton AdvCard__copy"
                                        onClick={copyText}
                                        data-cursor="frame"
                                    >
                                        <span className="corner corner--tl" />
                                        <span className="corner corner--tr" />
                                        <span className="corner corner--bl" />
                                        <span className="corner corner--br" />
                                        {copied ? "Zkopírováno" : "Zkopírovat text"}
                                    </button>
                                    <a
                                        href={googleReviewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cornerButton AdvCard__toGoogle"
                                        data-cursor="frame"
                                    >
                                        <span className="corner corner--tl" />
                                        <span className="corner corner--tr" />
                                        <span className="corner corner--bl" />
                                        <span className="corner corner--br" />
                                        Otevřít Google
                                        <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                                    </a>
                                </div>
                            </div>
                        )}

                        <MoreLink href="/recenze" direction="upRight">Zobrazit recenze</MoreLink>
                    </motion.div>
                ) : (
                    <form className="AdvCard__form" onSubmit={onSubmit} noValidate>
                        <span className="corner corner--tl" />
                        <span className="corner corner--tr" />
                        <span className="corner corner--bl" />
                        <span className="corner corner--br" />

                        <h2>Napište recenzi</h2>
                        <p className="AdvCard__form__for">
                            na <em>{advisor.name}</em>
                        </p>

                        <label>
                            <span className="label">Vaše jméno<Req />&nbsp;|</span>
                            <input
                                type="text"
                                name="customerName"
                                value={values.customerName}
                                onChange={set("customerName")}
                                data-cursor="frame"
                            />
                        </label>

                        <label>
                            <span className="label">Vaše zkušenost<Req />&nbsp;|</span>
                            <textarea
                                name="message"
                                rows={6}
                                value={values.message}
                                onChange={set("message")}
                                data-cursor="frame"
                            />
                        </label>

                        {/* Left empty by people and filled by scripts — the
                            endpoint drops anything that arrives with it set. */}
                        <input
                            type="text"
                            className="AdvCard__trap"
                            tabIndex={-1}
                            autoComplete="off"
                            value={values.website}
                            onChange={set("website")}
                            aria-hidden="true"
                        />

                        <p className="gdpr">
                            Odesláním souhlasíte se zpracováním osobních údajů{" "}
                            <MoreLink href="/ochrana-soukromi">více</MoreLink>
                        </p>

                        <button type="submit" className="cornerButton AdvCard__submit" data-cursor="frame" disabled={busy}>
                            <span className="corner corner--tl" />
                            <span className="corner corner--tr" />
                            <span className="corner corner--bl" />
                            <span className="corner corner--br" />
                            {busy ? "Odesílám…" : "Odeslat recenzi"}
                            <span className="cornerButton__arrow"><Arrow direction="upRight" /></span>
                        </button>

                        <p className="AdvCard__note">Recenze se zveřejní až po schválení.</p>
                    </form>
                )}
            </motion.article>
        </div>
    );
}
