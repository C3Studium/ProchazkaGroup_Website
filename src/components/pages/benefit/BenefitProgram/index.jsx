import Image from "next/image";
import IntroPageBenefit from "./IntroPage";
import InfoBenefitS from "./InfoSection";
import { useRef, useState, useEffect } from "react";
import { useScroll, motion, useTransform, AnimatePresence } from "framer-motion";
import Grid from "@/components/common/grid";
import { useGlobalContext } from "@/context/LoadProvider";
import SVGButton from "@/components/common/ui/stickyButtons/buttons/SvgButton";
import Magnetic from "@/components/common/Magnetic";

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
                    src="/assets/video/benefit_program.mp4"
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

export default function BenefitProgramKeyframes() {
    const sectionRef = useRef(null);
    const { firstLoad } = useGlobalContext();
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'end end'],
    });

    const [open, setOpen] = useState(false);

    const headerMove = useTransform(
        scrollYProgress,
        [0, 0.5, 0.6, 0.7, 0.8, 1],
        ['0vw', '0vw', '-20vw', '-20vw', '100vw', '100vw']
    );

    const introAnim = {
        initial: {
            scale: 1.5,
            opacity: 0
        },
        enter: {
            scale: 1,
            opacity: 1,
            transition: {
                delay: firstLoad ? 4 : 0.25,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    };

    return (
        <section className="BenefitProgramKeyFrames"
            style={{
                zIndex: open ? 1000 : 50,
            }}
        >
            <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
                <Grid size="20vh" key={"BenefitProgramKeyFrames"} />
            </div>
            <IntroPageBenefit />
            <motion.div
                className="BenefitProgramKeyFramesImage"
                style={{
                    x: headerMove,
                }}
                variants={introAnim}
                initial="initial"
                animate="enter"
            >
                <Image
                    src='/assets/prebuild/small-tree.webp'
                    alt="small-tree"
                    fill={true}
                    sizes="50vw"
                    quality={100}
                    priority={true}
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
            <AnimatePresence mode="wait">
                {open && (
                    <VideoModem setOpen={setOpen} />
                )}
            </AnimatePresence>
            <InfoBenefitS ref={sectionRef} scroll={scrollYProgress} />
        </section>
    )
}