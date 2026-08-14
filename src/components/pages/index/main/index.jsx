import Image from "next/image";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { useGlobalContext } from "@/context/LoadProvider";
import { usePerformance } from "@/context/PerformanceProvider"; // Add performance context
// import RotatingButton from "@/components/common/ui/stickyButtons/buttons/RotatingButton";
import SmallButton from "@/components/common/ui/stickyButtons/buttons/SmallButton";
import Grid from "@/components/common/grid";
import Link from "next/link";
import Magnetic from "@/components/common/Magnetic";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/hooks/trackEvent";
import NeonText from "@/components/common/TextAnim/neonText";
import TextType from "@/components/common/TextAnim/typingText";

export default function MainIntro() {
    const { firstLoad } = useGlobalContext();
    const { shouldReduceAnimations } = usePerformance(); // Use performance context

    const text = [
        "JEDNU DEKÁDU",
        "12 LET"
    ]

    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });
    const wrapperRef = useRef(null);
    const parallaxRef = useRef(null);
    const videoRef = useRef(null);



    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 1.5;
        }
    }, []);


    // Handle Reviews link click - track reviews page interest
    const handleReviewsClick = () => {
        trackEvent("reviews_page_clicked", {
            button_text: "Koukněte na recenze",
            button_location: "homepage_small_button",
            timestamp: new Date().toISOString(),
            page_section: "main_intro"
        });
    };

    // Handle RotatingButton click - track insurance reporting from homepage
    const handleInsuranceReportingClick = () => {
        trackEvent("insurance_reporting_clicked", {
            button_text: "Nahlášení Pojistného",
            button_location: "homepage_rotating_button",
            external_link: "https://www.pojistnehlaseni.cz/",
            timestamp: new Date().toISOString(),
            page_section: "main_intro"
        });
    };

    return (
        <>
            <section className="MainIntro" ref={parallaxRef}>
                <div className="MainIntro__Wrapper">
                    <div className="MainIntro__Wrapper__Image__wrapper">
                        <motion.div
                            className="MainIntro__Wrapper__Image__wrapper__parallax"
                        >
                            <div className="overlay" />
                            <Image
                                src='/assets/backgrounds/about.webp'
                                alt="background"
                                fill={true}
                                priority={true}
                                quality={90}
                                sizes="100vw"
                                placeholder="blur"
                                blurDataURL="data:image/webp"
                                style={{
                                    objectFit: "cover",
                                    objectPosition: "center",
                                }}
                            />
                        </motion.div>
                    </div>

                    <div className="MainIntro__Wrapper__Image__wrapper__content">
                        <div className="title">
                            <h1>
                                <NeonText
                                    text="BUDUJEME PRO LIDI STABILNÍ A KVALITNÍ FINANČNÍ PORADENSTVÍ UŽ PŘES"
                                    className="MainIntro__Wrapper__Image__wrapper__content__title"
                                />
                                <span className="highlighted">
                                    <TextType
                                        textColors={["#4bdadc"]}
                                        text={text}
                                        className="MainIntro__Wrapper__Image__wrapper__content__title__highlighted"
                                    />
                                </span>
                            </h1>
                        </div>
                        <div className="recenze">
                            <div className="recenze__text">
                                <span>
                                    Máme více než 3000 klientů, kterým pomáháme ke stabilní finanční
                                </span>
                                <span>
                                    nezávistlosti
                                    <Link href="/recenze">
                                        <SmallButton text="recenze" />
                                    </Link>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="MainIntro__Background">
                    <video
                        ref={videoRef}
                        src="/assets/video/kancl.mp4"
                        autoPlay
                        muted
                        loop
                        className="MainIntro__Background__video"
                    />
                    <div className="overlay" />
                </div>
                <div className="MainIntro__Buttons">
                    <div className="scroll__down">
                        <span className="scroll__down__arrow">↓</span>
                        <span className="scroll__down__text">Scroll down</span>
                    </div>
                    <div className="button__container">
                        <div className="text__container">
                            <p>
                                <span className="text__container__text">Klikněte zde pro <br /> přesunutí na pojistné <br /> hlášení</span>
                                <span className="text__container__arrow">→</span>
                            </p>
                        </div>
                        {/* <div className="button__container">
                            <Link href="https://www.pojistnehlaseni.cz/">
                                <RotatingButton
                                    text=" - Nahlášení Pojistného - Nahlášení Pojistného"
                                />
                            </Link>
                        </div> */}
                    </div>
                </div>
            </section>

            <section className="MainIntro__About">
                <div className="MainIntro__About__Wrapper">
                    <div className="MainIntro__About__Wrapper__Image">
                        <Image
                            src='/assets/backgrounds/conference2.webp'
                            alt="background"
                            fill={true}
                            priority={true}
                            quality={90}
                            sizes="100vw"
                            placeholder="blur"
                            blurDataURL="data:image/webp"
                            style={{
                                objectFit: "cover",
                                objectPosition: "center",
                            }}
                        />
                        <div className="overlay" />
                    </div>
                </div>
                <div className="MainIntro__About__Content">
                    <p>
                        JSME SKUPINA LIDÍ, KTERÁ POMÁHÁ VÁM LIDEM SE DOSTAT Z  FINAČNÍCH SITUACÍ A NEBO I VÁS I SEZNÁMIT JAK NÁŠ SYSTÉM V REPUBLICE FUNGUJE, NA CO SI DÁT POZOR, ČEMU SE VYHNOUT, A TVOŘÍME PRO VÁS POMOCNOU RUKU, KTERÉ SE MŮŽETE CHYTIT A VYBUDOVAT SI VLASTNÍ FINANČNÍ ZABEZPĚČENÍ DO BUDOUCNOSTI
                    </p>
                    <div className="divider" />
                </div>
            </section>
        </>
    )
}
