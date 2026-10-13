"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, cubicBezier, motion, useReducedMotion } from "framer-motion";
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

// Nástup obsahu. Rám se rozvine (clip-path, jako ContactModal) a teprve do
// otevírajícího se rámu nastoupí text odshora po řádcích, linka se dokreslí
// zleva a fotka se z mírného přiblížení usadí. Jedno gesto, ne pět efektů:
// všechno jde stejným směrem a stejnou křivkou.
//
// S omezeným pohybem (macOS „Omezit pohyb") jen prolnutí, ~0,4 s — nikdy
// skok z nuly, ten působí jako chyba, ne jako ohleduplnost.
const textIn = (calm) => ({
    hidden: {},
    shown: { transition: { staggerChildren: calm ? 0 : 0.07, delayChildren: calm ? 0.1 : 0.32 } },
});
const lineIn = (calm) => ({
    hidden: { opacity: 0, y: calm ? 0 : 14 },
    shown: { opacity: 1, y: 0, transition: { duration: calm ? 0.4 : 0.7, ease: GLIDE } },
});
const ruleIn = (calm) => ({
    hidden: { scaleX: calm ? 1 : 0, opacity: calm ? 0 : 1 },
    shown: { scaleX: 1, opacity: 1, transition: { duration: calm ? 0.4 : 0.9, ease: GLIDE } },
});

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
    const calm = useReducedMotion() ?? false;

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
                            key="sheet"
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
                            <div key={person.name} className="AdvisorModal__scroll" data-lenis-prevent>
                                <div className="AdvisorModal__photo">
                                    {photo ? (
                                        <motion.div
                                            className="AdvisorModal__photo__in"
                                            initial={{ scale: calm ? 1 : 1.08, opacity: calm ? 0 : 1 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: calm ? 0.4 : 1.2, ease: GLIDE }}
                                        >
                                            <Image
                                                src={photo}
                                                alt={person.name}
                                                fill
                                                sizes="(max-width: 900px) 90vw, 36vw"
                                                quality={85}
                                                // Obličej je u všech portrétů v horní třetině;
                                                // na střed by vysoký výřez useknul hlavu.
                                                style={{ objectFit: "cover", objectPosition: "center 22%" }}
                                            />
                                        </motion.div>
                                    ) : (
                                        <span className="AdvisorModal__photo__empty" aria-hidden="true" />
                                    )}
                                </div>

                                <motion.div
                                    className="AdvisorModal__text"
                                    variants={textIn(calm)}
                                    initial="hidden"
                                    animate="shown"
                                >
                                    <motion.span className="AdvisorModal__eyebrow" variants={lineIn(calm)}>
                                        Poradce{order ? <> &middot; {String(order).padStart(2, "0")}</> : null}
                                    </motion.span>
                                    <motion.h2 className="AdvisorModal__name" variants={lineIn(calm)}>{person.name}</motion.h2>
                                    {moto && <motion.p className="AdvisorModal__moto" variants={lineIn(calm)}>{moto}</motion.p>}

                                    {story && (
                                        <>
                                            <motion.span className="AdvisorModal__rule" aria-hidden="true" variants={ruleIn(calm)} />
                                            <motion.span className="AdvisorModal__label" variants={lineIn(calm)}>Příběh</motion.span>
                                            <motion.p className="AdvisorModal__story" variants={lineIn(calm)}>{story}</motion.p>
                                        </>
                                    )}

                                    {(tel || person.email) && (
                                        <motion.div className="AdvisorModal__reach" variants={lineIn(calm)}>
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
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
}
