import Image from "next/image";
import { AnimatePresence, motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import RotatingButton from "@/components/common/ui/stickyButtons/buttons/RotatingButton";
import RoundButton from "@/components/common/ui/stickyButtons/buttons/RoundButton";
import MainText from "@/components/common/TextAnim/MainText";
import SubText from "@/components/common/TextAnim/SubText";
import Grid from "@/components/common/grid";
import PixelateText from "../../index/main/neonText";
import { useGlobalContext } from "@/context/LoadProvider";
import Magnetic from "@/components/common/Magnetic";
import Link from "next/link";
import SVGButton from "@/components/common/ui/stickyButtons/buttons/SvgButton";
import { trackEvent } from "@/hooks/trackEvent";


const draw = {
    initial: { pathLength: 0, opacity: 0 },
    animate: (i) => {
        const delay = i * 0.15;
        return {
            pathLength: 1.1,
            opacity: 1,
            transition: {
                ease: [0.76, 0, 0.24, 1],
                pathLength: { delay, duration: 1.5, type: 'spring', bounce: 0 },
                opacity: { delay, duration: i * 0.5 },
            }
        }
    },
}

const textDrawAnim = {
    initial: { opacity: 0, y: 20 },
    animate: (i) => {
        const delay = i * 0.15;
        return {
            opacity: 1,
            y: 0,
            transition: {
                ease: [0.76, 0, 0.24, 1],
                opacity: { delay, duration: i * 0.75 },
                y: { delay, duration: i * 0.5 },
            }
        }
    },
}

const values = [
    {
        title: "Zkušenosti",
    },
    {
        title: "Odbornost",
    },
    {
        title: "Vzdělání",
    },
    {
        title: "Vize",
    },
    {
        title: "Cíle",
    },
    {
        title: "Zaměření",
    },
    {
        title: "Znalosti",
    }
]

export default function AboutInto() {
    const { firstLoad } = useGlobalContext();
    const introRef = useRef(null);
    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });
    const mainContentRef = useRef(null);
    const parallaxRef = useRef(null);

    const [open, setOpen] = useState(false);

    const [dimensions, setDimensions] = useState({
        width: 0,
        height: 0
    });

    // Add parallax effect
    const { scrollYProgress: parallaxMainScroll } = useScroll({
        target: parallaxRef,
        offset: ["start start", "end start"]
    });

    const smoothYScroll = useSpring(parallaxMainScroll, {
        stiffness: 100,
        damping: 20,
        restDelta: 0.001
    })

    // Transform values for parallax effect (subtle movement)
    const yPos = useTransform(smoothYScroll, [0, 1], ["0%", "10%"]);
    const scale = useTransform(smoothYScroll, [0, 1], [1.05, 1]);

    const { scrollYProgress } = useScroll({
        target: mainContentRef,
        offset: ['start end', 'end end']
    })
    const rotation = useMemo(() => [0, 120, 240], []);
    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isPortrait = dimensions.width / dimensions.height < 0.9;

    const imageAnimX = useTransform(
        scrollYProgress,
        [0, 0.35, 0.45, 0.55, 0.65, 1],
        isPortrait ? ["-50%", "-50%", "-50%", "-50%", "-350%", "-350%"] :
            ["-50%", "-50%", "-100%", "-100%", "-350%", "-350%"]
    )
    const imageAnimScale = useTransform(
        scrollYProgress,
        [0, 0.35, 0.45, 0.55, 0.65, 1],
        isPortrait ? [1, 1, 1.15, 1.15, 1.15, 1.15] : [1, 1, 1.25, 1.25, 1.25, 1.25]
    )
    const imageAnimY = useTransform(
        scrollYProgress,
        [0, 0.35, 0.45, 0.55, 0.65, 1],
        isPortrait ? ["35%", "35%", "75%", "75%", "75%", "75%"] :
            ["35%", "35%", "35%", "35%", "35%", "35%"]
    )

    const sectionX = useTransform(
        scrollYProgress,
        [0.55, 1],
        isPortrait ? ["5%", "0%"] : ["50%", "0%"]
    )
    const sectionOpacity1 = useTransform(
        scrollYProgress,
        [0, 0.55, 1],
        [1, 1, 0]
    )

    const sectionOpacity2 = useTransform(
        scrollYProgress,
        [0.65, 1],
        [0, 1]
    )

    const buttonOpacity2 = useTransform(
        scrollYProgress,
        dimensions.width <= 740
            ? [0.1, 0.45]  // Mobile breakpoints
            : [0.65, 1],    // Desktop breakpoints
        [1, 0]             // Opacity values
    )
    const buttonscale2 = useTransform(
        scrollYProgress,
        dimensions.width <= 740
            ? [0.1, 0.45]  // Mobile breakpoints
            : [0.65, 1],    // Desktop breakpoints
        [1, 0]             // Opacity values
    )

    // Updated intro animation to match MainIntro
    const introAnim = {
        initial: {
            scale: 1.5,
            opacity: 0
        },
        enter: {
            scale: 1,
            opacity: 1,
            transition: {
                delay: firstLoad ? 4.5 : 0.5,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    }

    const introbutton = {
        initial: {
            y: '200%'
        },
        enter: {
            y: '0%',
            transition: {
                delay: 0.5,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    }

    const circlePath = "M50,50 m-45,0 a45,45 0 1,0 90,0 a45,45 0 1,0 -90,0";

    // Handle RoundButton click - track career interest
    const handleCareerInterestClick = () => {
        trackEvent("career_interest_clicked", {
            button_text: "Zájem o pozici?",
            button_location: "about_page_floating",
            timestamp: new Date().toISOString(),
            page_section: "about_intro"
        });
    };

    // Handle RotatingButton click - track insurance reporting
    const handleInsuranceReportingClick = () => {
        trackEvent("insurance_reporting_clicked", {
            button_text: "Nahlášení Pojistného",
            button_location: "about_page_rotating",
            external_link: "https://www.pojistnehlaseni.cz/",
            timestamp: new Date().toISOString(),
            page_section: "about_intro"
        });
    };

    return (
        <section className="About" ref={introRef}>
            <AnimatePresence mode="wait">
                {open && (
                    <VideoModem setOpen={setOpen} />
                )}
            </AnimatePresence>
            <motion.div className="button__container__round"
                style={{
                    opacity: buttonOpacity2
                }}
                onClick={handleCareerInterestClick}
            >
                {/* add here teh same reposnive design as in main intro */}
                <RoundButton href='/kontakt' text='Zájem o pozici?' disableLink={false} />
            </motion.div>
            <div className="header">
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link>
                </Magnetic>
            </div>
            <motion.div
                className="button__container"
                initial='initial'
                animate='enter'
                variants={introbutton}
                style={{
                    transformOrigin: "center center",
                    willChange: "transform, opacity",
                    scale: buttonscale2,
                    opacity: buttonOpacity2
                }}
                onClick={handleInsuranceReportingClick}
            >
                <Link href="https://www.pojistnehlaseni.cz/">
                    <RotatingButton text=" - Nahlášení Pojistného - Nahlášení Pojistného" />
                </Link>
            </motion.div>
            <motion.section className="AboutInto"
                initial='initial'
                animate='enter'
                variants={introAnim}
                ref={parallaxRef}
                style={{
                    transformOrigin: "center center",
                    // willChange: "transform, opacity, scale"
                }}
            >
                <div className="AboutInto__wrapper">
                    <Grid size="20vh" key={"AboutInto__wrapper"} />
                    <div className="cover" />
                    <motion.div className="background"
                        style={{
                            y: yPos,
                            scale: scale
                        }}
                    >
                        {/* Background image with blur effect */}
                        <Image
                            src='/assets/backgrounds/logoBannerBG.webp'
                            alt="background-photo"
                            fill={true}
                            sizes="100vw"
                            priority={true}
                            quality={100}
                            placeholder="blur"
                            blurDataURL="data:image/webp"
                        />
                    </motion.div>
                    <div className="mainHeader" ref={headingRef}>
                        <h1>
                            <PixelateText
                                text="JSME TU PRO VÁS UŽ PŘES"
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                            <span className="highlighted">
                                <PixelateText
                                    text="JEDNU DEKÁDU"
                                    isInView={isInView}
                                    firstLoad={firstLoad}
                                />
                            </span>
                        </h1>
                    </div>
                    <motion.div className="ImageFixed"
                        style={{
                            x: imageAnimX,
                            scale: imageAnimScale,
                            y: imageAnimY
                        }}
                    >
                        <Image
                            src='/assets/backgrounds/about.webp'
                            alt="team_photo"
                            fill={true}
                            sizes="50vw"
                            priority={true}
                            quality={100}
                            placeholder="blur"
                            blurDataURL="data:image/webp"
                        />
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 1000,
                                width: "100px",
                                height: "100px",
                                opacity: 0.5,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                cursor: "pointer"
                            }}
                        >
                            <Magnetic sensitivity={0.05}>
                                <div
                                    onClick={() => setOpen(true)}
                                    style={{
                                        width: "100px",
                                        height: "100px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        cursor: "pointer"
                                    }}
                                >
                                    <Image
                                        src="/assets/svg/playbutton.svg"
                                        alt="play_button"
                                        width={100}
                                        height={100}
                                        priority={true}
                                    />
                                </div>
                            </Magnetic>
                        </div>
                    </motion.div>
                </div>
            </motion.section>
            <div className="AboutUs" ref={mainContentRef}>
                <div className="AboutUs__Sticky">
                    <Grid size="20vh" key={"AboutUs__Sticky"} />
                    <motion.div className="AboutUs__Sticky__content"
                        style={{
                            x: sectionX
                        }}
                    >
                        <div className="AboutUs__Sticky__content__Container">
                            <div className="AboutUs__Sticky__content__Container__wrapper">
                                <motion.div className="AboutUs__Sticky__content__1"
                                    style={{
                                        opacity: sectionOpacity1
                                    }}
                                >
                                    <div className="Header">
                                        <div className="Header__container">
                                            <h2>ξ</h2>
                                            <p>13 let praxe, individuální přístup a výsledky</p>
                                        </div>
                                        <div className="devider" />
                                    </div>
                                    <div className="MainText">
                                        <MainText initialColor={'#fff'} text="Založil jsem tým, který dnes tvoří 10 schopných lidí - a všichni sdílíme stejnou vizi." />
                                        <div className="devider" />
                                    </div>
                                    <div className="subText">
                                        <div className="subText__text">
                                            <SubText text={'Našim klientům šetříme čas, starosti a hlavně peníze. <br/> Ať už jde o řešení bydlení, pojištění <br/> nebo vytváření rezerv – vše stavíme na zkušenostech, <br/> které jsme roky sbírali v praxi.'} />
                                        </div>

                                        <div className="devider" />
                                    </div>
                                </motion.div>
                                <motion.div className="AboutUs__Sticky__content__2"
                                    style={{
                                        opacity: sectionOpacity2
                                    }}
                                >
                                    <div className="Header">
                                        <div className="Header__container">
                                            <h2>ξ</h2>
                                            <p>Tým, který roste s klienty i spolupracovníky</p>
                                        </div>
                                        <div className="devider" />
                                    </div>
                                    <div className="subText1">
                                        <div className="subText__text">
                                            <p>
                                                Dáváme šanci novým kolegům vybudovat si úspěšné podnikání ve financích. Učíme je pracovat poctivě, efektivně a se smyslem.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="MainText">
                                        <div className="devider" />
                                        <p>Těší mě, když vidím jak si mí spolupracovníci plní své cíle a jdou směrem k finanční nezávislosti.
                                        </p>
                                        <div className="devider" />
                                    </div>
                                    <div className="subText2">
                                        <div className="subText__text">
                                            <p>
                                                Nezávislost nám umožňuje vybírat produkty podle potřeb klienta. Nejsme vázáni na banky či pojišťovny — pracujeme výhradně pro lidi.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                        <motion.div className="AboutUs__Sticky__content__values" style={{ opacity: isPortrait ? sectionOpacity2 : 1 }}>
                            <div className="Header">
                                <div className="Header__container">
                                    <h2>01</h2>
                                    <p>Máme nediskutabilní hodnoty <br /> a pevné zásady</p>
                                </div>
                            </div>
                            <div className="Values__container">
                                <div className="Values__container__values">
                                    <div className="Values__container__values__container">
                                        {values.slice(0, 1).map((item, index) => (
                                            <div className="Values__container__values__item" key={index}>
                                                <div className="Values__container__values__item__text">
                                                    <motion.p
                                                        initial='initial'
                                                        whileInView='animate'
                                                        variants={textDrawAnim}
                                                        custom={index + 1}
                                                    >
                                                        {item.title}
                                                    </motion.p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="Values__container__values__container">
                                        {values.slice(1, 4).map((item, index) => (
                                            <div className="Values__container__values__item" key={index}>
                                                <div className="Values__container__values__item__text">
                                                    <motion.p
                                                        initial='initial'
                                                        whileInView='animate'
                                                        variants={textDrawAnim}
                                                        custom={index + 1}
                                                    >
                                                        {item.title}
                                                    </motion.p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="Values__container__values__container">
                                        {values.slice(4, 7).map((item, index) => (
                                            <div className="Values__container__values__item" key={index}>
                                                <div className="Values__container__values__item__text">
                                                    <motion.p
                                                        initial='initial'
                                                        whileInView='animate'
                                                        variants={textDrawAnim}
                                                        custom={index + 1}
                                                    >
                                                        {item.title}
                                                    </motion.p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="svg__fillc__Ccontainer">
                                    {[0, 1, 2].map((index) => (
                                        <motion.svg
                                            key={`circle-${index}`}
                                            viewBox="0 0 100 100"
                                            initial='initial'
                                            whileInView='animate'
                                            style={{
                                                transform: `rotate(${rotation[index]}deg)`,
                                                transformOrigin: "50% 50%"
                                            }}
                                        >
                                            <motion.path
                                                variants={draw}
                                                custom={index + 1}
                                                d={circlePath}
                                                fill="none"
                                                strokeLinecap="round"
                                            />
                                        </motion.svg>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                    </motion.div>
                </div>
            </div>
        </section>

    )
}


const VideoModem = ({ setOpen }) => {
    const videoRef = useRef(null);
    const [paused, setPaused] = useState(false);

    const handlePausePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setPaused(false);
        } else {
            videoRef.current.pause();
            setPaused(true);
        }
    };
    const expand = {
        initial: {
            x: "100%",
            opacity: 0,
        },
        enter: {
            x: "0%",
            opacity: 1,
            transition: {
                delay: 0.5,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        },
        exit: {
            x: "-100%",
            opacity: 0,
            transition: {
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    }

    useEffect(() => {
        // Stop Lenis when modal is open, start when closed
        if (typeof window !== "undefined" && window.lenis) {
            window.lenis.stop();
            return () => {
                window.lenis.start();
            };
        }
    }, []);

    return (
        <motion.div
            className="video__container"
            initial='initial'
            animate='enter'
            exit='exit'
            variants={expand}
            style={{
                transformOrigin: "center center",
                willChange: "transform, opacity",
                width: "100vw",
                height: "100vh",
                position: "fixed",
                top: 0,
                zIndex: 1000,
                backgroundColor: "var(--bgColor2)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: "100vw", // or any max width you want
                    maxWidth: "1920px",
                    aspectRatio: "16/10",
                    background: "#000",
                    boxShadow: "0 0 40px #000a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <video
                    src="/assets/video/kancl.mp4"
                    ref={videoRef}
                    autoPlay
                    loop
                    playsInline
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "1vw",
                        background: "#000",
                    }}
                    onClick={handlePausePlay}
                />
                <AnimatePresence>
                    {paused && (
                        <div
                            style={{
                                position: "fixed",
                                top: "47.5vh",
                                left: "47.5vw",
                                zIndex: 1000,
                                width: "25vw",
                                height: "25vw",
                            }}

                            onClick={handlePausePlay}

                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.5,
                                ease: [0.76, 0, 0.24, 1],
                            }}
                        >
                            <Image
                                src="/assets/svg/playbutton.svg"
                                alt="play_button"
                                width={100}
                                height={100}
                                priority={true}
                            />
                        </div>

                    )}
                </AnimatePresence>
                <div
                    style={{
                        position: "fixed",
                        top: "50px",
                        left: "50px",
                        zIndex: 1001,
                    }}
                >
                    <SVGButton
                        src="/assets/svg/exit.svg"
                        altText="exit_button"
                        onClick={() => setOpen(false)}
                    />
                </div>
            </div>
        </motion.div>
    );
}