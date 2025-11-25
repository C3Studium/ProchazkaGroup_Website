import MainText from "@/components/anim/MainText";
import SubText from "@/components/anim/SubText";
import { motion, useInView, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useRef, useEffect } from "react";

export default function BenefitCard({ text, subtext, icons, isActive, src }) {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { 
        once: false,  
        amount: 0.1,
    });

    // Define container and stagger animation variants
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

    // Child element variants for staggered animation
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.5, 
                ease: [0.25, 0.1, 0.25, 1.0] 
            }
        },
        exit: { 
            opacity: 0, 
            y: -15,
            transition: { duration: 0.3 } 
        }
    };

    return(
        <motion.section 
            className="BenefitCard"
            ref={containerRef}
            variants={containerVariants}
            initial="hidden"
            animate={isActive ? "visible" : "hidden"}
            exit="exit"
        >
            {icons && (
                <motion.div 
                    className="BenefitCard__container__icons"
                    variants={itemVariants}
                >
                    {icons.map((icon, index) => (
                        <Image
                            key={index}
                            src={icon.src}
                            alt={icon.alt}
                            width={150}
                            height={150}
                        />
                    ))}
                </motion.div>
            )}
            
            <motion.div 
                className="BenefitCard__container__subtext"
                variants={itemVariants}
            >
                <SubText text={""} className="subtext__container" initialColor="#fff"/>
            </motion.div>
            
            <motion.div 
                className="BenefitCard__container__text"
                variants={itemVariants}
            >
                <SubText text={text} className="mainText__container" initialColor="#fff"/>
            </motion.div>
        </motion.section>
    )
}