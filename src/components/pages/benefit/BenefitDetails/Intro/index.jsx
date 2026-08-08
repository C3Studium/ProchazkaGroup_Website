import SubText from "@/components/common/TextAnim/SubText";
import Grid from "@/components/common/grid";
import { useScroll, useTransform, motion } from "framer-motion";
import Image from "next/image";
import { useRef, useState } from "react";

export default function Intro() {
    // generate unique ID for the clipPath
    const [clipPathId] = useState(`clip-path-${Math.random().toString(36).substr(2, 9)}`);

    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start 0.5", "end 0.5"],
    })

    const moveY1 = useTransform(
        scrollYProgress,
        [0, 0.25, 1],
        [-100, 0, 0]
    )
    const moveY2 = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 1],
        [-100, -100, 0, 0]
    )
    const moveY3 = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 0.75, 1],
        [-100, -100, -100, 0, 0]
    )

    const opacity1 = useTransform(
        scrollYProgress,
        [0, 0.25, 1],
        [0, 1, 1]
    )
    const opacity2 = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 1],
        [0, 0, 1, 1]
    )
    const opacity3 = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 0.75, 1],
        [0, 0, 0, 1, 1]
    )

    const imageOpacity1 = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 1],
        [1, 1, 0, 0]
    )

    const imageOpacity2 = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 0.75, 1],
        [0, 0, 1, 0, 0]
    )
    const imageOpacity3 = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 0.75, 1],
        [0, 0, 0, 1, 1]
    )

    const moveY = useTransform(
        scrollYProgress,
        [0, 0.2, 0.5, 0.8, 1],
        ["-20vh", "0vh", "0vh", "0vh", "20vh"]
    )

    const points = [
        {
            number: "01",
            text: 'Staňte se součástí programu',
            scrollY: moveY1,
            opacity: opacity1,
            src: "/assets/backgrounds/join.jpg",
            alt: "Intro Image",
            imgOpacity: imageOpacity1,
        },
        {
            number: "02",
            text: 'Přiveďte nového klienta',
            scrollY: moveY2,
            opacity: opacity2,
            src: "/assets/backgrounds/callBG.webp",
            alt: "Intro Image",
            imgOpacity: imageOpacity2,
        },
        {
            number: "03",
            text: 'Získejte odměnu',
            scrollY: moveY3,
            opacity: opacity3,
            src: "/assets/backgrounds/trophies.webp",
            alt: "Intro Image",
            imgOpacity: imageOpacity3,
        },
    ]

    return (
        <motion.div className="Intro" ref={sectionRef} style={{ y: moveY }}>
            <div className="Intro__sticky__wrapper">
                <Grid size="20vh" key={"Intro__sticky__wrapper"} />
                <div className="Intro__container">
                    <div className="Intro__header">
                        {points.map((item, index) => {
                            const { number, text } = item
                            return (
                                <motion.div className="Intro__header__item" key={`intro${index}`} style={{ y: item.scrollY, opacity: item.opacity }}>
                                    <h3>{number}</h3>
                                    <p>{text}</p>
                                </motion.div>
                            )
                        }
                        )}
                    </div>
                    <div className="Intro__text">
                        <SubText initialColor="#050A10" text={"Za každou novou smlouvu dostanete přímou odměnu, aniž by kdokoli musel něco platit navíc. Pomáháte, budujete, vyděláváte. To je smysl programu."} />
                    </div>
                </div>

                <div className="Image__container">
                    {/* Container with direct CSS clip-path */}
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            clipPath: `path('M0.140928 100.383C0.140972 45.1543 44.9125 0.382812 100.141 0.382812H900.141C955.369 0.382812 1000.14 45.1543 1000.14 100.383V550.383C1000.14 605.611 955.369 650.383 900.141 650.383H565.791C518.893 650.383 480.875 612.365 480.875 565.467V565.467C480.875 518.569 442.857 480.551 395.959 480.551H100.141C44.9122 480.551 0.140661 435.779 0.140705 380.551L0.140928 100.383Z')`,
                            WebkitClipPath: `path('M0.140928 100.383C0.140972 45.1543 44.9125 0.382812 100.141 0.382812H900.141C955.369 0.382812 1000.14 45.1543 1000.14 100.383V550.383C1000.14 605.611 955.369 650.383 900.141 650.383H565.791C518.893 650.383 480.875 612.365 480.875 565.467V565.467C480.875 518.569 442.857 480.551 395.959 480.551H100.141C44.9122 480.551 0.140661 435.779 0.140705 380.551L0.140928 100.383Z')`,
                            '@supports not (clip-path: path("M0 0"))': {
                                clipPath: 'polygon(0% 15%, 0% 100%, 40% 100%, 40% 74%, 56% 74%, 56% 87%, 90% 87%, 100% 87%, 100% 15%, 100% 0%, 10% 0%)'
                            }
                        }}
                    >
                        {points.map((item, index) => {
                            const { src, alt } = item
                            return (
                                <motion.div className="Intro__image__container" key={`introImage${index}`} style={{ opacity: item.imgOpacity }}>
                                    <Image
                                        src={src}
                                        fill={true}
                                        alt={alt}
                                        priority={true}
                                        quality={100}
                                    />
                                </motion.div>
                            )
                        })}
                    </div>
                    <div className="Intro__image__container__numbers">
                        {points.map((item, index) => {
                            const { number } = item
                            return (
                                <motion.div className="Intro__image__number" key={`introImageNumber${index}`} style={{ opacity: item.imgOpacity }}>
                                    <h3>{number}</h3>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}