import MainText from "@/components/anim/MainText";
import StatNumberVariable from "@/components/anim/StatNumber";
import SubText from "@/components/anim/SubText";
import Grid from "@/components/common/grid";
import RoundButton from "@/components/ui/stickyButtons/buttons/RoundButton";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";

export default function IntroStatbar({data = StatbarData}) {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { 
        once: false,  
        amount: 0.1,
    });
    
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });
    
    // Create smooth progress for scrollYProgress
    const smoothYProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });
        
    // Header parallax effect
    const headerY = useTransform(
        smoothYProgress,
        [0, 1],
        [0, 100] 
    );

    const buttonX = useTransform(
        smoothYProgress,
        [0, 0.6, 1],
        [0, -100, -200 ]
    );
    
    // Graph parallax
    const graphY = useTransform(
        smoothYProgress,
        [0, 1],
        [0, 150]
    );
    
    // CTA button parallax
    const ctaY = useTransform(
        smoothYProgress,
        [0, 1],
        [0, -70]
    );
    
    const parseValue = (value) => {
        return parseFloat(value.replace(/[^0-9.]/g, ''));
    }
    
    const getSuffix = (value) => {
        const suffixMatch = value.match(/([KMB]\+?)/i);
        if (suffixMatch) {
            return suffixMatch[0];
        }
        if (value.includes('+')) {
            return '+';
        }
        if (value.includes(',-')) {
            return ',-';
        }
        return '';
    }

    const pathVariants = {
        initial: {
            pathLength: 0,
        },
        animate: {
            pathLength: 1,
            transition: {
                duration: 3,
                ease: [0.87, 0, 0.13, 1],
            },
        },
    };

        const scrollTo = (e) => {
        e.preventDefault();
        
        if(window.lenis) {
            // Force Lenis to be active regardless of animation state
            window.lenis.start();
            
            // Set a flag to prevent other components from stopping Lenis
            window.forceScroll = true;
            
            // Scroll to target with smooth animation
            window.lenis.scrollTo("#offer", {
                offset: -50,
                duration: 2.5,           // Longer duration for smoother scroll
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Smooth easing curve
                immediate: false,        // Changed to false for smooth scrolling
                force: true              // Still force the scroll to happen
            });
            
            // Reset the flag after scrolling completes
            setTimeout(() => {
                window.forceScroll = false;
            }, 3000); // Increased timeout to match longer duration
        } else {
            const target = document.querySelector("#offer");
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
            }
        }
    }

    return (
        <div className="IntroStatbar" ref={containerRef}>
            <Grid size="20vh"/>
            <motion.div 
                className="IntroStatbar__header"
                style={{y: headerY}}
            >
                <SubText 
                    text={"JSME SKUPINA LIDÍ, KTERÁ POMÁHÁ VÁM LIDEM SE DOSTAT Z TĚŽKÝCH FINAČNÍCH SITUACÍ A NEBO I VÁS I SEZNÁMIT JAK NÁŠ SYSTÉM V REPUBLICE FUNGUJE, NA CO SI DÁT POZOR, ČEMU SE VYHNOUT, A TVOŘÍME PRO VÁS POMOCNOU RUKU, KTERÉ SE MŮŽETE CHYTIT A VYBUDOVAT SI VLASTNÍ FINANČNÍ ZABEZPĚČENÍ DO BUDOUCNOSTI"} 
                    className={"subText__container"}
                />
            </motion.div>
            <div className="IntroStatbar__content">
                <div className="data__wrapper">
                    {data.map((object, i) => {
                        const { value, name, barkingPoint } = object;
                        const numericValue = parseValue(value);
                        const suffix = getSuffix(value);
                        
                        const itemStyle = {
                            y: useTransform(
                                smoothYProgress,
                                [0, 1],
                                [0, 30 + (i * 15)]
                            ),
                            x: useTransform(
                                smoothYProgress,
                                [0, 1],
                                [0, i % 2 === 0 ? 20 : -20]
                            ),
                            scale: useTransform(
                                smoothYProgress,
                                [0, 1],
                                [1, 0.95 + (i * 0.01)]
                            )
                        };
                        
                        return (
                            <motion.div 
                                className="data__item" 
                                key={`dataitems${i}`}
                                style={itemStyle}
                            >
                                <div className="number__wrapper">
                                    <StatNumberVariable
                                        number={numericValue}
                                        EndDuration={2}
                                        StartDuration={1}
                                        BreakPoint={parseValue(barkingPoint)}
                                        delay={i * 0.2}
                                    />
                                    {suffix && <span className="suffix">{suffix}</span>}
                                </div>
                                <p>{name}</p>
                            </motion.div>
                        )
                    })}
                </div>
                <motion.div 
                    className="data__item__text"
                    style={{ 
                        y: useTransform(smoothYProgress, [0, 1], [0, 50]) 
                    }}
                >
                    <MainText 
                        text={"JSTE TU POPRVÉ?"} 
                        className={"mainText__container"}
                    />
                    <SubText 
                        text={"TAK TOHLE NÍŽE JE PŘÍMO PRO VÁS"} 
                        className={"subText__container"}
                    />
                </motion.div>
            </div>
            <motion.div 
                className="data__item__cta__button"
                style={{ y: ctaY }}
            >
                <motion.div 
                    className="data__item__button" 
                    style={{ x: buttonX }}
                >
                    <RoundButton 
                        text={"Dostat se k věci"} 
                        disableLink={false} 
                        href="/#offer" 
                        onClick={scrollTo}
                    />
                </motion.div>
                <div className="divider"/>
            </motion.div>
            <motion.svg
                viewBox="0 0 1921 968" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="graph__svg"
                style={{ y: graphY }}
            >
                <defs>
                    <filter 
                        id="filterSVGgraph" 
                        x="-64.4766" 
                        y="0.773438" 
                        width="2038.28" 
                        height="966.766" 
                        filterUnits="userSpaceOnUse" 
                        colorInterpolationFilters="sRGB"
                    >
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur 
                            stdDeviation="12.5" 
                            result="effect1_foregroundBlur_3456_17182"
                        />
                    </filter>
                </defs>
                <motion.path 
                    d="M-35.9714 939.543L68.0667 791.705L206.784 836.058L277.795 711.454L395.043 806.488L537.063 603.741L651.01 741.018L733.58 664.988L781.47 760.026L908.628 496.031L949.913 664.988L1100.19 348.194L1189.37 572.061L1242.21 460.128L1290.1 538.27L1331.39 460.128L1377.62 538.27L1494.87 204.582L1569.19 396.769L1686.44 164.455L1750.84 251.045L1945.71 29.2894" 
                    stroke="#4BDADC" 
                    strokeWidth="10"
                    filter="url(#filterSVGgraph)"
                    variants={pathVariants}
                    initial="initial"
                    animate={isInView ? "animate" : "initial"}
                    onError={(e) => {
                        // If animation fails, at least show the path
                        e.target.style.pathLength = 1;
                        e.target.style.transition = 'none';
                    }}
                />
            </motion.svg>
        </div>
    );
}