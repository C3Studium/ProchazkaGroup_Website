"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, cubicBezier, motion } from "framer-motion";
import { RiMailLine, RiPhoneLine } from "@remixicon/react";
import { dial } from "@/constants/roster";
import { EXTERNAL_CLASS } from "@/components/common/ui/externalLink";
import { surfaceRoot } from "@/cms/edit";

const GLIDE = cubicBezier(0.22, 1, 0.36, 1);

// Poradce celý — portrét, motto, příběh a jak se mu ozvat.
//
// Otevírá se ze stěny poradců v panelu menu na počítači a tabletu. Na telefonu
// ne: tam karta jen vybírá a volá se z panelu pod stěnou, protože telefon je
// zařízení, ze kterého se volá, a modál navíc by byl krok před tím, kvůli
// čemu tam člověk přišel. Na širší obrazovce je to obráceně — číslo se tam
// stejně opisuje do telefonu a „kdo to vlastně je" je otázka, na kterou karta
// s mottem neodpovídá.
//
// Vzorem je ContactModal, tentýž rám i chování: portál do `body`, závoj,
// Escape, past na Tab a fokus zpátky na kartu, ze které se modál otevřel.
// Dvě věci jsou jinak, a obě proto, že modál leží NAD otevřeným panelem menu:
//
//   - Scroll stránky nezastavuje ani nespouští. Zastavil ho už panel, a
//     `lenis.start()` při zavření by stránku pod ještě otevřeným panelem
//     rozjel.
//   - Escape se chytá ve fázi capture a dál nepouští. Panel poslouchá tutéž
//     klávesu (krok zpět ze stěny poradců do menu) a zaregistroval se dřív;
//     bez toho by jedno Escape zavřelo modál i stěnu naráz.

const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * @param {object|null} person   záznam z rosteru (constants/roster.js): name, moto,
 *                               story, src, srcAlt, tel, email; `null` = zavřeno
 * @param {number}      [order]  pořadí na stěně, 1-based — jen pro štítek „01"
 * @param {() => void}  onClose
 * @param {string}      [studioRoot] jméno povrchu ve Studiu, viz cms/edit/surface.js
 */
export default function AdvisorModal({ person, order = null, onClose, studioRoot = null }) {
    const [mounted, setMounted] = useState(false);
    const closeRef = useRef(null);
    const wrapRef = useRef(null);
    const open = Boolean(person);

    // Portál až po mountu: nic z modálu se na serveru nekreslí, takže první
    // klientský render je prázdný stejně jako serverový.
    useEffect(() => setMounted(true), []);

    // Fokus na zavírací křížek, po zavření zpátky na kartu.
    useEffect(() => {
        if (!open) return undefined;
        const opener = document.activeElement;
        const frame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
        return () => {
            cancelAnimationFrame(frame);
            opener?.focus?.({ preventScroll: true });
        };
    }, [open]);

    // Escape a Tab. Capture + stopImmediatePropagation — viz komentář nahoře.
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose();
                return;
            }
            if (e.key !== "Tab") return;
            const wrap = wrapRef.current;
            if (!wrap) return;
            const stops = [...wrap.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
            if (!stops.length) return;
            const first = stops[0];
            const last = stops[stops.length - 1];
            const active = document.activeElement;
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
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [open, onClose]);

    if (!mounted) return null;

    // Detailní portrét, když ho poradce má; jinak tentýž, co je na stěně.
    const photo = person?.srcAlt || person?.src || null;
    const tel = dial(person?.tel);
    const story = person?.story?.trim() || "";
    const moto = person?.moto?.trim() || "";

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        key="backdrop"
                        {...surfaceRoot(studioRoot)}
                        className="AdvisorModal__backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: GLIDE }}
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    <div
                        key="wrap"
                        {...surfaceRoot(studioRoot)}
                        ref={wrapRef}
                        className="AdvisorModal__wrap"
                        role="dialog"
                        aria-modal="true"
                        aria-label={person.name}
                    >
                        <motion.div
                            className="AdvisorModal"
                            initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
                            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
                            exit={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
                            transition={{ duration: 0.65, ease: GLIDE }}
                        >
                            <button
                                ref={closeRef}
                                type="button"
                                className="AdvisorModal__close"
                                onClick={onClose}
                                data-cursor="frame"
                                aria-label="Zavřít"
                            >
                                <span /><span />
                            </button>

                            {/* Scroll o úroveň níž, aby křížek zůstal v rohu, když
                                se na nízké obrazovce text posouvá; a
                                `data-lenis-prevent`, protože zastavený Lenis
                                kolečko pořád bere oknu — viz ContactModal__scroll. */}
                            <div className="AdvisorModal__scroll" data-lenis-prevent>
                                <div className="AdvisorModal__photo">
                                    {photo ? (
                                        <Image
                                            src={photo}
                                            alt={person.name}
                                            fill
                                            sizes="(max-width: 900px) 90vw, 32vw"
                                            quality={85}
                                            style={{ objectFit: "cover", objectPosition: "center 18%" }}
                                        />
                                    ) : (
                                        <span className="AdvisorModal__photo__empty" aria-hidden="true" />
                                    )}
                                </div>

                                <div className="AdvisorModal__text">
                                    <span className="AdvisorModal__eyebrow">
                                        Poradce{order ? <> &middot; {String(order).padStart(2, "0")}</> : null}
                                    </span>
                                    <h2 className="AdvisorModal__name">{person.name}</h2>
                                    {moto && <p className="AdvisorModal__moto">{moto}</p>}

                                    {story && (
                                        <>
                                            <span className="AdvisorModal__rule" aria-hidden="true" />
                                            <span className="AdvisorModal__label">Příběh</span>
                                            <p className="AdvisorModal__story">{story}</p>
                                        </>
                                    )}

                                    {(tel || person.email) && (
                                        <div className="AdvisorModal__reach">
                                            {tel && (
                                                <a href={tel} className={`AdvisorModal__link ${EXTERNAL_CLASS}`} data-cursor="frame">
                                                    <RiPhoneLine size={15} aria-hidden="true" />
                                                    {person.tel}
                                                </a>
                                            )}
                                            {person.email && (
                                                <a href={`mailto:${person.email}`} className={`AdvisorModal__link ${EXTERNAL_CLASS}`} data-cursor="frame">
                                                    <RiMailLine size={15} aria-hidden="true" />
                                                    {person.email}
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
}
