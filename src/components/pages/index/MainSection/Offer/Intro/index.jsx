import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import SubText from "@/components/common/TextAnim/SubText";
import Image from "next/image";
import Grid from "@/components/common/grid";
import MainText from "@/components/common/TextAnim/MainText";

export default function IntroOffer() {
    const sectionRef = useRef(null);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start 0.75", "end start"],
    });

    // Parallax transforms (always enabled)
    const headerY = useTransform(scrollYProgress, [0, 1], [150, -150]);
    const headerOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const headerScale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.9, 1, 1, 1]);
    const headerRotateX = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [5, 0, 0, -5]);

    const mainTextY = useTransform(scrollYProgress, [0.05, 1], [180, -100]);
    const mainTextOpacity = useTransform(scrollYProgress, [0.05, 0.25, 0.75, 0.95], [0, 1, 1, 0]);
    const mainTextScale = useTransform(scrollYProgress, [0.05, 0.25, 0.75, 0.95], [0.85, 1, 1, 1]);

    const imageY = useTransform(scrollYProgress, [0.1, 1], [100, -60]);
    const imageScale = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0.7, 1, 1, 1]);
    const imageOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0, 1, 1, 0]);
    const imageRotate = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [-5, 0, 0, 5]);

    const subTextY = useTransform(scrollYProgress, [0.15, 1], [120, -80]);
    const subTextOpacity = useTransform(scrollYProgress, [0.15, 0.35, 0.65, 0.85], [0, 1, 1, 0]);
    const subTextScale = useTransform(scrollYProgress, [0.15, 0.35, 0.65, 0.85], [0.8, 1, 1, 1]);

    return (
        <section className="IntroOffer" ref={sectionRef} id="offer">
            <Grid size="20vh" />
            <div className="IntroOffer__container">
                <motion.div
                    className="IntroOffer__header"
                    style={{
                        y: headerY,
                        opacity: headerOpacity,
                        scale: headerScale,
                        rotateX: headerRotateX,
                        transformPerspective: "1000px"
                    }}
                >
                    <div className="header__wrapper">
                        <h3>δ</h3>
                        <p>Náším snem je vaše<br /> finanční nezávislost: </p>
                    </div>
                    <div className="devider" />
                </motion.div>

                <motion.div
                    className="IntroOffer__MainText"
                    style={{
                        y: mainTextY,
                        opacity: mainTextOpacity,
                        scale: mainTextScale,
                    }}
                >
                    <MainText
                        text={'NEMÁTE NA SVÉ FINANCE ČAS?<br /><br />HODINA VAŠEHO ČASU VÁS DĚLÍ OD<br />OKAMŽIKU, KDY SE<br />O VAŠE FINANCE BUDE STARAT OPRAVDOVÝ PROFESIONÁL.'}
                    />

                    <motion.div
                        className="IntroOffer__image__container"
                        style={{
                            y: imageY,
                            scale: imageScale,
                            opacity: imageOpacity,
                            rotate: imageRotate
                        }}
                    >
                        <Image
                            src="/assets/prebuild/svg/shapeMain.svg"
                            fill={true}
                            alt="shape"
                            priority={true}
                            quality={90}
                            sizes="50vw"
                        />
                    </motion.div>
                </motion.div>

                <motion.div
                    className="IntroOffer__subText"
                    style={{
                        y: subTextY,
                        opacity: subTextOpacity,
                        scale: subTextScale,
                    }}
                >
                    <SubText
                        initialColor="#fff"
                        className={'subtext__div'}
                        text={'Každým dnem, kdy vaše finance nepracují pro Vás<br/>ztrácíte hodnotu, kterou už nikdy nezískáte zpět.'}
                    />
                </motion.div>
            </div>
        </section>
    )
}