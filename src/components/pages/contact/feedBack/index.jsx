import Grid from "@/components/common/grid";
import FeedbackForm from "@/components/forms/feedback";
import { useScroll, motion, useInView, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { useGlobalContext } from "@/context/LoadProvider";
import PixelateText from "../../index/main/neonText";
import Magnetic from "@/components/anim/Magnetic";
import Link from "next/link";

//NOTE: FeedBack and contact are switched

export default function FeedbackIntro() {
    const sectionRef = useRef(null);
    const { firstLoad } = useGlobalContext();
    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });
    
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end start']
    });
    
    const smoothYProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    const headerY = useTransform(
        smoothYProgress,
        [0, 0.15, 0.75, 1],
        [0, 0, -50, -80]
    );
    
    const textY = useTransform(
        smoothYProgress,
        [0, 0.5, 1],
        [0, 0, -50]
    );
    
    // Animation for cover container
    const coverAnim = {
        initial: {
            y: '-30%',
            opacity: 0
        },
        enter: {
            y: '0%',
            opacity: 1,
            transition: {
                delay: firstLoad ? 4.25 : 0.25,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    };
    
    return (
        <section className="FeedbackIntro" ref={sectionRef}>
            <div className="pageIndex">
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link>
                </Magnetic>
            </div>
            
            <motion.div 
                className="Cover"
                initial="initial"
                animate="enter"
                variants={coverAnim}
                style={{
                    transformOrigin: "center top",
                    willChange: "transform, opacity"
                }}
            >
                <Grid size="20vh" key={"Cover_feedbackintro"}/>
                <div className="MainText" ref={headingRef}>
                    <motion.div style={{ y: headerY }}>
                        <h1>
                            <span>
                                <PixelateText
                                    text="NA COKOLIV, CO SE ZEPTÁTE,"
                                    isInView={isInView}
                                    firstLoad={firstLoad}
                                />
                            </span>
                            <span className="highlighted">
                                <PixelateText
                                    text="EXISTUJE 100% JISTÁ ODPOVĚĎ."
                                    isInView={isInView}
                                    firstLoad={firstLoad}
                                />
                            </span>
                            <span>
                                <PixelateText
                                    text="MY VÁM BĚHEM PÁR MOMENTŮ"
                                    isInView={isInView}
                                    firstLoad={firstLoad}
                                />
                            </span>
                            <span>
                                <PixelateText
                                    text="ODPOVÍME"
                                    isInView={isInView}
                                    firstLoad={firstLoad}
                                />
                            </span>
                            <span className="highlighted">
                                <PixelateText
                                    text="S JEDNÍM ŘEŠENÍM."
                                    isInView={isInView}
                                    firstLoad={firstLoad}
                                />
                            </span>
                        </h1>
                    </motion.div>
                </div>
                
                <motion.div className="Header" style={{ y: textY }}>
                    <div className="Header__text">
                        <h3>σ</h3>
                        <p>
                            <PixelateText
                                text="Váš dotaz nebo jakoukoliv otázku nám napište sem:"
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </p>
                    </div>
                </motion.div>
            </motion.div>
            
            <FeedbackForm scroll={scrollYProgress}/>
        </section>
    );
}