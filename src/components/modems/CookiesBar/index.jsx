import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";

import CornerButton from "@/components/common/ui/CornerButton";
import CookiesModem from "@/components/modems/Cookies";
import { useCookies } from "@/context/CookiesProvider";
import { useGlobalContext } from "@/context/LoadProvider";

// Lišta se souhlasem s cookies. Ukazuje se, dokud návštěvník neodpoví — a dokud
// neodpoví, neběží žádné měření (viz ConsentScripts). Tři cesty ven, rovnocenné:
// přijmout vše, odmítnout vše, nebo si vybrat v tomtéž okně, jaké otevírá
// stránka /cookies. „Odmítnout" je stejně velké tlačítko jako „Přijmout",
// protože souhlas, který jde jednoduše dát, musí jít stejně jednoduše nedat.

const slide = {
    initial: { y: "110%", opacity: 0 },
    animate: { y: "0%", opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.8 } },
    exit: { y: "110%", opacity: 0, transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } },
};

export default function CookiesBar() {
    const { showBanner, acceptAllCookies, rejectAllCookies } = useCookies();
    const [settings, setSettings] = useState(false);
    const { pathname } = useRouter();
    // Až po úvodní oponě: lišta přes preloader by byla první věc, kterou
    // návštěvník uvidí, a zakrývala by mu načítání.
    const { gate } = useGlobalContext();

    // Náhledy Studia běží ve stejném shellu jako web; lišta by v nich jen
    // zakrývala to, co se upravuje.
    const studio = pathname.startsWith("/studio");
    const visible = showBanner && gate === "go" && !settings && !studio;

    // Co dalšího stojí u spodního okraje (widget novinek), musí lištu obejít:
    // obě jsou `position: fixed` na stejné vrstvě a bublina novinek jinak
    // ležela přes „Nastavení" a brala mu kliknutí. Lišta proto hlásí, že je
    // vidět, a jak je vysoká — `html[data-cookiebar]` a `--cookiebar-h` — a
    // NewsWidget se podle toho zvedne. Výška se měří, protože na telefonu se
    // tlačítka zalomí a lišta je dvakrát vyšší.
    const barRef = useRef(null);
    useEffect(() => {
        const root = document.documentElement;
        const el = barRef.current;
        if (!visible || !el) return undefined;
        const measure = () => root.style.setProperty("--cookiebar-h", `${el.offsetHeight}px`);
        measure();
        root.setAttribute("data-cookiebar", "1");
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => {
            ro.disconnect();
            root.removeAttribute("data-cookiebar");
            root.style.removeProperty("--cookiebar-h");
        };
    }, [visible]);

    return (
        <>
            <AnimatePresence>
                {visible && (
                    <motion.aside
                        ref={barRef}
                        key="cookiesBar"
                        className="CookiesBar"
                        role="region"
                        aria-label="Souhlas s cookies"
                        {...slide}
                    >
                        <span className="corner corner--tl" />
                        <span className="corner corner--tr" />
                        <span className="corner corner--bl" />
                        <span className="corner corner--br" />

                        <div className="CookiesBar__text">
                            <p className="CookiesBar__eyebrow">
                                <em>§</em> Cookies
                            </p>
                            <p className="CookiesBar__lead">
                                Nezbytné cookies potřebujeme, aby web fungoval. S vaším svolením
                                použijeme i analytické cookies, které nám ukážou, jak web zlepšit.
                                Více v <Link href="/cookies" data-cursor="frame">zásadách cookies</Link>.
                            </p>
                        </div>

                        <div className="CookiesBar__actions">
                            <CornerButton className="CookiesBar__accept" onClick={acceptAllCookies}>
                                Přijmout vše
                            </CornerButton>
                            <CornerButton onClick={rejectAllCookies}>
                                Odmítnout
                            </CornerButton>
                            <button
                                type="button"
                                className="CookiesBar__settings"
                                onClick={() => setSettings(true)}
                                data-cursor="frame"
                            >
                                Nastavení
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {settings && (
                    <CookiesModem setSettings={setSettings} settings={settings} />
                )}
            </AnimatePresence>
        </>
    );
}
