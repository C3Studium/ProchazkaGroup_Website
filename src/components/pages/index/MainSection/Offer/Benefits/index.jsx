import StatNumberVariable from "@/components/common/TextAnim/StatNumber";
import SubText from "@/components/common/TextAnim/SubText";
import { motion } from "framer-motion";
import { useRef } from "react";

const introStats = [
    {
        value: '12',
        barkingPoint: '7',
        name: 'Let na trhu'
    },
    {
        value: '3000+',
        barkingPoint: '2500',
        name: 'Spokojených klientů'
    },
    {
        value: '9000+',
        barkingPoint: '8000',
        name: 'Podepsaných smluv'
    },
    {
        value: '43',
        barkingPoint: '36',
        name: 'Partnerskchých Společností'
    }
]

export default function Benefits({ isActive }) {
    const containerRef = useRef(null);

    // Container animation with staggered children
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.1,
            }
        },
        exit: {
            opacity: 0,
            transition: {
                staggerChildren: 0.05,
                staggerDirection: -1
            }
        }
    };

    // Stats item variants with a nice slide-up and scale effect
    const statsItemVariants = {
        hidden: { opacity: 0, y: 40, scale: 0.95 },
        visible: i => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.1, 0.25, 1.0],
                delay: i * 0.1 // Additional delay based on item index
            }
        }),
        exit: {
            opacity: 0,
            y: -15,
            transition: { duration: 0.3 }
        }
    };

    // Text content variants
    const textVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.1, 0.25, 1.0],
                delay: 0.4 // Delay text until after stats appear
            }
        },
        exit: {
            opacity: 0,
            y: -15,
            transition: { duration: 0.3 }
        }
    };

    const parseValue = (value) => {
        // Improved to handle numbers before suffixes like M+
        return parseFloat(value.replace(/[^0-9.]/g, ''));
    }

    // Enhanced function to get suffix like M+, +, etc.
    const getSuffix = (value) => {
        // Match M+, B+, K+ without requiring space
        const suffixMatch = value.match(/([KMB]\+?)/i);
        if (suffixMatch) {
            return suffixMatch[0];
        }
        // Check for just + at the end
        if (value.includes('+')) {
            return '+';
        }
        // Check for currency suffix
        if (value.includes(',-')) {
            return ',-';
        }
        return '';
    }

    return (
        <motion.div
            className="Benefits"
            ref={containerRef}
            variants={containerVariants}
            initial="hidden"
            animate={isActive ? "visible" : "hidden"}
            exit="exit"
        >
            <motion.div
                className="data__wrapperB"
                variants={containerVariants}
            >
                {introStats.map((object, i) => {
                    const { value, name, barkingPoint } = object;
                    const numericValue = parseValue(value);
                    const suffix = getSuffix(value);

                    return (
                        <motion.div
                            className="data__item"
                            key={`dataitems${i}`}
                            custom={i}
                            variants={statsItemVariants}
                        >
                            <motion.div
                                className="number__wrapper"
                                variants={statsItemVariants}
                                custom={i}
                            >
                                <StatNumberVariable
                                    number={numericValue}
                                    EndDuration={2}
                                    StartDuration={1}
                                    BreakPoint={parseValue(barkingPoint)}
                                    delay={i * 0.2}
                                    isActive={isActive} // Pass the active state to control number animation
                                />
                                {suffix && (
                                    <motion.span
                                        className="suffix"
                                        variants={statsItemVariants}
                                        custom={i}
                                    >
                                        {suffix}
                                    </motion.span>
                                )}
                            </motion.div>
                            <motion.p
                                variants={statsItemVariants}
                                custom={i}
                            >
                                {name}
                            </motion.p>
                        </motion.div>
                    )
                })}
            </motion.div>

            <motion.div
                className="text__container"
                variants={textVariants}
            >
                <motion.div
                    className="subtext"
                    variants={textVariants}
                >
                    <SubText
                        className={"subtext__container"}
                        initialColor={'#fff'}
                        text={'VAŠE STAROSTI S PENĚZI NEJSOU JEN ČÍSLA, JSOU TO ROKY ŽIVOTA, KTERÝ MŮŽETE JEŠTĚ ZACHRÁNIT. CO VŠECHNO ZÍSTKÁTE S NAŠI SPOLUPRÁCÍ'}
                    />
                </motion.div>
            </motion.div>
        </motion.div>
    )
}