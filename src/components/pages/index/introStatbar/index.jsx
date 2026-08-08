import StatNumberVariable from "@/components/common/TextAnim/StatNumber";
import SubText from "@/components/common/TextAnim/SubText";
import Grid from "@/components/common/grid";
import RoundButton from "@/components/common/ui/stickyButtons/buttons/RoundButton";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import MainText from "@/components/common/TextAnim/MainText";

export default function IntroStatbar({ data = StatbarData }) {
    const containerRef = useRef(null);
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

        if (window.lenis) {
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
            <div className="IntroStatbar__content">
                <div className="data__wrapper">
                    {data.map((object, i) => {
                        const { value, name, barkingPoint } = object;
                        const numericValue = parseValue(value);
                        const suffix = getSuffix(value);

                        return (
                            <motion.div
                                className="data__item"
                                key={`dataitems${i}`}
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
                >
                    <p>
                        <span>
                            JSTE TU POPRVÉ?
                        </span>
                    </p>
                    <SubText
                        text={"TAK TOHLE NÍŽE JE PŘÍMO PRO VÁS"}
                        className={"subText__container"}
                    />
                </motion.div>
            </div>
            <motion.div
                className="data__item__cta__button"
            >
                <motion.div
                    className="data__item__button"
                >
                    <RoundButton
                        text={"Dostat se k věci"}
                        disableLink={false}
                        href="/offer"

                    />
                </motion.div>
                <div className="divider" />
            </motion.div>
            <motion.svg
                viewBox="0 0 1921 968"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="graph__svg"
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
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
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
                    animate="animate"
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