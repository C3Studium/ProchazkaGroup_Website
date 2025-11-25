import SubText from "@/components/anim/SubText";
import { useOnWindowResize } from "@/hooks/useOnWindowResize";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ReactCountryFlag from "react-country-flag";




export default function TheWay({ isActive }) {
    const [ isMobile, setIsMobile ] = useState(false)
        const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    
    useOnWindowResize(() => {
        setIsMobile(window.innerWidth < 910)
    })

    // Example data (replace with real years/countries)
    const loopData = [
        { year: '1970', country: 'DE', label: 'Germany' },
        { year: '1991', country: 'AT', label: 'Austria' },
        { year: '1992', country: 'CZ', label: 'Czech Republic' },
        { year: '1992', country: 'PL', label: 'Poland' },
        { year: '1992', country: 'HU', label: 'Hungary' },
        { year: '1993', country: 'SK', label: 'Slovakia' },
        { year: '1993', country: 'GR', label: 'Greece' },
        { year: '1995', country: 'CH', label: 'Switzerland' },
        { year: '1998', country: 'HR', label: 'Croatia' },
        { year: '2002', country: 'IT', label: 'Italy' },
        { year: '2002', country: 'ES', label: 'Spain' },
        { year: '2002', country: 'RO', label: 'Romania' },
        { year: '2003', country: 'FR', label: 'France' },
        { year: '2007', country: 'UA', label: 'Ukraine' },
        { year: '2018', country: 'BE', label: 'Belgium' },
    ];


const ANIMATION_DURATION = 1.5;
    const DELAY_BETWEEN = 0.5;
    const STEP = 100 / loopData.length;

    // Single line animation controller
    const lineControls = useAnimation();

    // Animate the line and step through the items
    useEffect(() => {
        let isCancelled = false;
        let running = true;

        async function runLoop() {
            while (!isCancelled && isActive && running) {
                for (let i = 0; i < loopData.length; i++) {
                    setActiveIndex(i);
                    // Animate the line: expand to next step
                    await lineControls.start({
                        width: [`${i * STEP}%`, `${(i + 1) * STEP}%`],
                        transition: {
                            duration: ANIMATION_DURATION,
                            ease: "easeInOut"
                        }
                    });
                    // Wait for the rest of the step and delay
                    await new Promise(res => setTimeout(res, (ANIMATION_DURATION + DELAY_BETWEEN) * 1000));
                    if (isCancelled || !isActive) return;
                }
                // Shrink back to 0% at the end
                await lineControls.start({
                    width: ["100%", "0%"],
                    transition: {
                        duration: ANIMATION_DURATION,
                        ease: "easeInOut"
                    }
                });
                setActiveIndex(0);
            }
        }

        if (isActive) {
            running = true;
            // Start from 0%
            lineControls.set({ width: "0%" });
            runLoop();
        } else {
            running = false;
            // Only reset after mount
            if (containerRef.current) {
                lineControls.start({ width: "0%" });
            }
            setActiveIndex(0);
        }

        return () => {
            isCancelled = true;
            running = false;
            lineControls.stop && lineControls.stop();
        };
    // eslint-disable-next-line
    }, [isActive]);
    
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
    // Content animation for image/text
    const contentVariants = {
        initial: { opacity: 0, scale: 0.8 },
        animate: { 
            opacity: 1, 
            scale: 1, 
            transition: { 
                duration: 0.5, 
                ease: "easeOut" 
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
    
    // Graph animation with scale effect
    const graphVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.98 },
        visible: { 
            opacity: 1, 
            y: 0,
            scale: 1,
            transition: { 
                duration: 0.8, 
                ease: [0.2, 0.1, 0.3, 1.0],
                delay: 0.3 // Delay graph animation after headers
            }
        },
        exit: { 
            opacity: 0, 
            y: -20,
            transition: { duration: 0.3 } 
        }
    };
    
    return (
        <section className="GraphTheWay" ref={containerRef}>
            <motion.div 
                className="MainSection__wrapper"
                variants={containerVariants}
                initial="hidden"
                animate={isActive ? "visible" : "hidden"}
                exit="exit"
            >
                <motion.div 
                    className="Graph__header"
                    variants={headerVariants}
                >
                    <SubText 
                        className="maintext__container" 
                        text={'PRACUJEME S DESÍTKY LET PROVĚŘENÝM SYSTÉMEM, KTERÝ JE NEJEN OSVĚDČENÝ V ČR ALE I PO CELÉ EVROPĚ.'} 
                        initialColor={'#fff'}
                    />
                    <motion.div 
                        className="Graph__content__header"
                        variants={headerVariants}
                    >
                        <SubText 
                            className={"Subtext__container"} 
                            // WIP: Add here text about the growth of OVB
                            text={"To, co by Vám bežně zabralo dekády,<br/>s námi dokážete během několika let."} 
                            initialColor="#fff"
                        />
                    </motion.div>
                </motion.div>
                
                <motion.div 
                    className="Graph__wrapper"
                    variants={graphVariants}
                >
                    <div className="Graph__wrapper__container" style={{ position: "relative" }}>
                        {/* Single animated line */}
                        <motion.div
                            className="Graph__content__mainline"
                            animate={lineControls}
                            initial={{ width: "0%", left: 0, right: "auto" }}
                        />
                        <div className="Graph__content">
                            <div className="Graph__content__anim__container" style={{ position: "relative" }}>
                                {loopData.map((item, index) => (
                                    <div
                                        key={index}
                                        className="Graph__content__anim"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            marginBottom: 24,
                                            position: "relative",
                                            zIndex: 2
                                        }}
                                    >
                                        {/* Animated content */}
                                        <motion.div
                                            className="Graph__content__anim__text"
                                            variants={contentVariants}
                                            initial="initial"
                                            animate={activeIndex === index && isActive ? "animate" : "initial"}
                                        >
                                            <ReactCountryFlag
                                                countryCode={item.country}
                                                svg
                                                style={{
                                                    width: isMobile ? "30px" : "50px",
                                                    height: isMobile ? "30px" : "50px",
                                                    borderRadius: "4px",
                                               
                                                    objectFit: "cover"
                                                }}
                                                title={item.label}
                                            />
                                            <p>
                                                {item.year}
                                            </p>
                                        </motion.div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    )
}