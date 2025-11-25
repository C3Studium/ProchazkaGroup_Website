import SubText from "@/components/anim/SubText"
import { motion } from "framer-motion"
import { useRef } from "react"

const requirements = [
    {
        text: 'Poznání klienta - Zjištění jeho potřeb, cílů a aktuálního stavu.',
        number: '1.',
        unit: 'První setkání',
    },
    {
        text: 'Příprava řešení a jeho finalizace - individuálně, nezávisle a objektivně',
        number: '2.',
        unit: 'Modelizace',
    },
    {
        text: 'Pravidelný, bezplatný a doživotní',
        number: '3.',
        unit: 'Servis',
    }
]

export default function Requirements({ isActive }) {
    const containerRef = useRef(null);
    
    // Container animation with staggered children
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
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

    // Header animations
    const headerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.6, 
                ease: [0.25, 0.1, 0.25, 1.0] 
            }
        },
        exit: { 
            opacity: 0, 
            y: -15,
            transition: { duration: 0.3 } 
        }
    };
    
    // Item animations with slide up effect
    const itemVariants = {
        hidden: { opacity: 0, y: 60 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.7, 
                ease: [0.2, 0.1, 0.3, 1.0] 
            }
        },
        exit: { 
            opacity: 0, 
            y: -20,
            transition: { duration: 0.3 } 
        }
    };
    
    return (
        <section className="Requirements" ref={containerRef}>
            <motion.div 
                className="Requirements__wrapper"
                variants={containerVariants}
                initial="hidden"
                animate={isActive ? "visible" : "hidden"}
                exit="exit"
            >
                <motion.div 
                    className="Requirements__header"
                    variants={headerVariants}
                >
                    <SubText 
                        className="maintext__container" 
                        text={'NEŠE SYSTÉMY JSME UDĚLALI TAK SAKRA HLOUPĚ LEHKÉ, ŽE NEMÁTE ŠANCI NEUSPĚT, TAKŽE JE ÚSPĚCH GARANTOVANÝ.'} 
                        initialColor={'#fff'}
                    />
                    <motion.div 
                        className="Requirements__content__header"
                        variants={headerVariants}
                    >
                        <SubText 
                            className={"Subtext__container"} 
                            text={"To, co by Vám bežně zabralo dekády,<br/>s námi dokážete během několika let."} 
                            initialColor="#fff"
                        />
                    </motion.div>
                </motion.div>
                
                <div className="Requirements__wrapper">
                    {requirements.map((item, index) => {
                        const { text, number, unit } = item
                        return (
                            <motion.div 
                                className="Requirements__item" 
                                key={`requirements${index}`}
                                variants={itemVariants}
                                custom={index}
                            >
                                <motion.div 
                                    className="number__wrapper"
                                    variants={itemVariants}
                                >
                                    <span className="number">{number}</span>
                                    <span className="unit">{unit}</span>
                                </motion.div>
                                <motion.p variants={itemVariants}>{text}</motion.p>
                            </motion.div>
                        )
                    })}
                </div>
            </motion.div>
        </section>
    )
}