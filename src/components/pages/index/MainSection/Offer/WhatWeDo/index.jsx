import Grid from "@/components/common/grid";
import BenefitCard from "../BenefitCard";
import Benefits from "../Benefits";
import Requirements from "../Requirements";
import TheWay from "../TheWay";
import { useRef, useState, useEffect, createRef, useCallback } from "react";
import { RealityIntroGridOut } from "../GridTransitionOut";
import Image from "next/image";
import { useScroll, useSpring, useTransform, motion, AnimatePresence } from "framer-motion";
import { set, throttle } from "lodash";

const sections = [
    { name: "Benefits", number: "00" },
    { name: "BenefitCard", number: "01" },
    { name: "BenefitCard", number: "02" },
    { name: "BenefitCard", number: "03" },
    { name: "BenefitCard", number: "04" },
    { name: "Requirements", number: "05" },
];

const benefits = [
    {
        text: "BUDETE MIT VÍCE ČASU DÍKY ORGANIZOVANÉMU PLÁNOVÁNÍ, TAK ABYSTE MOHLI TRÁVIT SVŮJ ČAS TÍM CO DĚLÁTE RÁDI.",
        subtext: "Budujeme finanční portfolia se sny těch, kteří věří v úspěch.",

    },
    {
        text: "KONTROLUJEME VAŠI SITUACI PRAVIDELNĚ PODLE TOHO JAK SE TRH VYVÍJÍ, ABYSTE NEMUSELI SEDĚT HODINY U DAT A TEXTŮ.",
        subtext: "Budujeme finanční portfolia se sny těch, kteří věří v úspěch.",
    },
    {
        text: "VELKOU PŘIDANOU HODNOTOU JE NEZÁVISLOST, DÍKY KTERÉ DOKÁŽEME VYTVOŘIT FINANČNÍ PLÁNY NA MÍRU VÁM, KLINETOVI.",
        subtext: "Budujeme finanční portfolia se sny těch, kteří věří v úspěch.",
    }
];

const visibleIcons = [
    {
        src: "/assets/svg/time.svg", alt: "benefit1"
    },
    {
        src: "/assets/svg/phone.svg", alt: "benefit2"
    },
    {
        src: "/assets/svg/law.svg", alt: "benefit3"
    },


]

export default function WhatWeDo() {
    const gridRef = useRef(null);
    const containerRef = useRef(null);
    const graphSvgRef = useRef(null);
    const pathRef = useRef(null);
    const sectionRefs = useRef([]);
    
    const [pathIndex, setPathIndex] = useState(0);
    const [pathPoints, setPathPoints] = useState([]);
    const [pathTotalLength, setPathTotalLength] = useState(0);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const smmothYProgress = useSpring(scrollYProgress, {
        stiffness: 300,
        damping: 30,
        restDelta: 0.001,
    });

    const pathLength = useTransform(
        smmothYProgress,
        [0, 1],
        [0, 1]
    );

    const sectionScale = useTransform(
        smmothYProgress,
        [0, 0.02, 0.95, 0.98],
        [0.9, 1, 1, 0.9]
    );

    const sectionY = useTransform(
        smmothYProgress,
        [0, 0.02, 0.95, 0.98],
        ["-20%", "0%", "0%", "-20%"]
    );

    // Add these transforms near the top of your component
    const icon1Y = useTransform(
        smmothYProgress,
        [0.16, 0.25, 0.3, 0.35, 0.5, 0.6],   
        ["-6vh", "-6vh", "-36vh", "-38vh", "-38vh", "-38vh"]  // Using vh units instead of pixels
    );
    
    const icon1X = useTransform(
        smmothYProgress,
        [0.15, 0.18, 0.3, 0.43, 0.45, 0.58, 0.6],
        ["0vw", "0vw", "0vw", "0vw", "-4vw", "-4vw", "-8vw"]  // Using vw units
    );
    
    const icon1Scale = useTransform(
        smmothYProgress,
        [0.15, 0.16, 0.25, 0.3, 0.5, 0.65],        // scroll progress points
        [0, 1.5, 1.5, 0.6, 0.6, 0.6]              // scale values
    );
    
    const icon1Opacity = useTransform(
        smmothYProgress,
        [0.1, 0.15, 0.16, 0.9],         // scroll progress points
        [0, 0, 1, 1]                    // opacity values
    );
    
    // Second icon
    const icon2Y = useTransform(
        smmothYProgress,
        [0.3, 0.4, 0.45, 0.6],
        ["-6vh", "-6vh", "-38vh", "-38vh"]  // Using vh units
    );

    const icon2X = useTransform(
        smmothYProgress,
        [0.3, 0.33, 0.45, 0.58, 0.6],
        ["0vw", "0vw", "0vw", "0vw", "-4vw"]  // Using vw units
    );
    
    const icon2Scale = useTransform(
        smmothYProgress,
        [0.3, 0.31, 0.4, 0.45],              // scroll progress points
        [0, 1.5, 1.5, 0.6]                   // scale values
    );
    
    const icon2Opacity = useTransform(
        smmothYProgress,
        [0.25, 0.3, 0.31, 0.9],         // scroll progress points
        [0, 0, 1, 1]                    // opacity values
    );
    
    // Third icon
    const icon3Y = useTransform(
        smmothYProgress,
        [0.45, 0.55, 0.6],
        ["-6vh", "-6vh", "-38vh"]  // Using vh units
    );
    
    const icon3X = useTransform(
        smmothYProgress,
        [0.45, 0.58, 0.6],
        ["0vw", "0vw", "0vw"]  // Using vw units
    );
    
    const icon3Scale = useTransform(
        smmothYProgress,
        [0.45, 0.46, 0.55, 0.6],              // scroll progress points
        [0, 1.5, 1.5, 0.6]                   // scale values
    );
    
    const icon3Opacity = useTransform(
        smmothYProgress,
        [0.4, 0.45, 0.46, 0.9],         // scroll progress points
        [0, 0, 1, 1]                    // opacity values
    );
    
    // Calculate path points for the circles and transitions
    useEffect(() => {
        if (!pathRef.current) return;
        
        // Get total length of the path
        const length = pathRef.current.getTotalLength();
        setPathTotalLength(length);
        
        // Calculate points at specific percentages
        const points = [
            { percent: 0, position: calculatePointAtPercentage(0.02, pathRef.current) },
            { percent: 0.15, position: calculatePointAtPercentage(0.16, pathRef.current) },
            { percent: 0.30, position: calculatePointAtPercentage(0.29, pathRef.current) },
            { percent: 0.45, position: calculatePointAtPercentage(0.44, pathRef.current) },
            { percent: 0.60, position: calculatePointAtPercentage(0.59, pathRef.current) },
            { percent: 0.80, position: calculatePointAtPercentage(0.78, pathRef.current) }
        ];
        
        setPathPoints(points);
    }, []);
    
    // Helper function to calculate point at a certain percentage of path
    function calculatePointAtPercentage(percentage, pathElement) {
        const length = pathElement.getTotalLength();
        const point = pathElement.getPointAtLength(length * percentage);
        return { x: point.x, y: point.y };
    }

    // Simple navigation function
    const navigateToIndex = (index) => {
        setPathIndex(index);
    };

    // Initialize section refs
    useEffect(() => {
        sectionRefs.current = Array(sections.length).fill(0).map((_, i) => sectionRefs.current[i] || createRef());
    }, []);

    const handleScroll = useCallback(
        throttle((value) => {
            if (value >= 0.9) setPathIndex(5);
            else if (value >= 0.8) setPathIndex(5);
            else if (value >= 0.6) setPathIndex(4);
            else if (value >= 0.45) setPathIndex(3);
            else if (value >= 0.3) setPathIndex(2);
            else if (value >= 0.15) setPathIndex(1);
            else setPathIndex(0);
        }, 150, { leading: true, trailing: false }, [pathIndex,])
    )

    useEffect(() => {
        if(typeof  window === 'undefined') return;

        const unsubscribeScroll = scrollYProgress.on("change", handleScroll);

        return () => {
            unsubscribeScroll();
            handleScroll.cancel();
        }
    }, [scrollYProgress, handleScroll]);

    return (
        <motion.section className="WhatWeDo" ref={containerRef}>
            <div className="WhatWeDo__ref" ref={gridRef}/>
            <div className="WhatWeDo__sticky">
                <div className="WhatWeDo__grid">
                    <RealityIntroGridOut ref={gridRef}/>
                </div>
                <motion.div className="WhatWeDo__sticky___wrapper" style={{ scale: sectionScale, top: sectionY }}>
                    {/* Section navigation */}
                    <div className="navigator">
                        <div className="navigator__container">
                            {sections.map((section, index) => (
                                <div 
                                    className={`navigator__item ${index === pathIndex ? 'active' : ''}`} 
                                    key={index}
                                    onClick={() => navigateToIndex(index)}
                                >
                                    <div className="number">
                                        <motion.p
                                        style={{
                                            color: pathIndex === index ? "#4BDADC" : "rgba(255, 255, 255, 0.6)",
                                        }}
                                            animate={{ opacity: pathIndex === index ? 1 : 0.6,
                                                color: pathIndex === index ? "#4BDADC" : "rgba(255, 255, 255, 0.6)",
                                                fontSize: pathIndex === index ? "2rem" : "1.5rem",
                                                y: pathIndex === index ? 0 : -10 
                                            }}
                                            transition={{ duration: 0.3, ease: [0.76, 0, 0.26, 1] }}
                                            className="number__text"
                                        >
                                            {section.number}
                                        </motion.p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="icon-progression-container">
                        {/* First icon (appears in section 1) */}
                        <motion.div
                            className="floating-icon"
                            style={{
                                x: icon1X,
                                y: icon1Y,
                                scale: icon1Scale,
                                opacity: icon1Opacity,
                                zIndex: 3
                            }}
                        >
                            <Image src={visibleIcons[0].src} alt={visibleIcons[0].alt || "Benefit icon"} height={100} width={100} />
                        </motion.div>
                        
                        {/* Second icon (appears in section 2) */}
                        <motion.div
                            className="floating-icon"
                            style={{
                                x: icon2X,
                                y: icon2Y,
                                scale: icon2Scale,
                                opacity: icon2Opacity,
                                zIndex: 2
                            }}
                        >
                            <Image src={visibleIcons[1].src} alt={visibleIcons[1].alt || "Benefit icon"} height={100} width={100} />
                        </motion.div>
                        
                        {/* Third icon (appears in section 3) */}
                        <motion.div
                            className="floating-icon"
                            style={{
                                x: icon3X,
                                y: icon3Y,
                                scale: icon3Scale,
                                opacity: icon3Opacity,
                                zIndex: 1
                            }}
                        >
                            <Image src={visibleIcons[2].src} alt={visibleIcons[2].alt || "Benefit icon"} height={100} width={100} />
                        </motion.div>
                    </div>
                    
                    {/* Section content containers */}
                    <div 
                        className="sections-wrapper" 
                        style={{ 
                            position: 'relative', 
                            width: '100%', 
                            height: '100%'
                        }}
                    >
                        <div className="section-transition-container">
                            {/* Benefit cards */}
                            {benefits.map((item, index) => (
                                <AnimatePresence key={`benefit-${index}`}>
                                    {pathIndex === index + 1 && (
                                        <motion.div 
                                            key={index}
                                            className="section-wrapper"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                pointerEvents: pathIndex === index + 1 ? 'auto' : 'none'
                                            }}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                                        >
                                            <div className="benefit-card-container">
                                                <div className="benefit-content">
                                                    <BenefitCard 
                                                        text={item.text} 
                                                        subtext={item.subtext}
                                                        icons={item.icons}
                                                        isActive={pathIndex === index + 1} // Pass active state
                                                        src={item.src}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            ))}
                            
                            {/* Special sections */}
                            <AnimatePresence key={'benefits'}>
                                {pathIndex === 0 && (
                                    <motion.div 
                                        className="section-wrapper"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: pathIndex === 0 ? 'auto' : 'none'
                                        }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                                    >
                                        <Benefits isActive={ pathIndex === 0}/>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* The Way section */}
                            <AnimatePresence key={'the-way'}>
                                {pathIndex === 4 && (
                                    <motion.div 
                                        className="section-wrapper"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: pathIndex === 4 ? 'auto' : 'none'
                                        }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                                    >
                                        <TheWay isActive={pathIndex === 4}/>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* Requirements section */}
                            <AnimatePresence key={'requirements'}>
                                {pathIndex === 5 && (
                                    <motion.div 
                                        className="section-wrapper"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: pathIndex === 5 ? 'auto' : 'none'
                                        }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                                    >
                                        <Requirements isActive={ pathIndex === 5}/>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                </motion.div>

                {/* Graph SVG without animations */}
                <svg
                    ref={graphSvgRef}
                    viewBox="0 0 1921 968" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="graph__svg"
                >
                    <defs>
                        <filter id="filterSVGgraph" x="-64.4766" y="0.773438" width="2038.28" height="966.766" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                            <feGaussianBlur stdDeviation="12.5" result="effect1_foregroundBlur_3456_17182"/>
                        </filter>
                        
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    
                    <motion.path 
                        ref={pathRef}
                        d="M-35.9714 939.543L68.0667 791.705L206.784 836.058L277.795 711.454L395.043 806.488L537.063 603.741L651.01 741.018L733.58 664.988L781.47 760.026L908.628 496.031L949.913 664.988L1100.19 348.194L1189.37 572.061L1242.21 460.128L1290.1 538.27L1331.39 460.128L1377.62 538.27L1494.87 204.582L1569.19 396.769L1686.44 164.455L1750.84 251.045L1945.71 29.2894" 
                        stroke="#4BDADC" 
                        strokeWidth="10"
                        filter="url(#filterSVGgraph)"
                        style={{
                            pathLength: pathLength,
                            willChange: 'transform',
                            transform: 'translateZ(0)',
                        }}
                    />
                    
                    {/* Circle points along the path */}
                    {pathPoints.map((point, index) => (
                        <motion.g key={index}>
                            <motion.circle 
                                cx={point.position?.x} 
                                cy={point.position?.y} 
                                r={20}
                                fill="rgba(75, 218, 220, 0.3)"
                                initial={{ scale: 0 }}
                                animate={{ 
                                    scale: pathIndex === index ? 1.5 : 1,
                                    opacity: pathIndex === index ? 1 : 0
                                }}
                                transition={{ duration: 0.7 }}
                                filter="url(#glow)"
                            />
                            
                            <motion.circle 
                                cx={point.position?.x} 
                                cy={point.position?.y} 
                                r={10}
                                fill={pathIndex === index ? "#4BDADC" : "#FFFFFF"}
                                stroke="#4BDADC"
                                strokeWidth={2}
                                initial={{ scale: 0 }}
                                animate={{ 
                                    scale: pathIndex === index ? 1.3 : 1,
                                    fill: pathIndex === index ? "#4BDADC" : "#FFFFFF",
                                    opacity: pathIndex === index ? 1 : 0
                                }}
                                transition={{ duration: 0.4 }}
                            />
                            
                            <motion.text
                                x={point.position?.x + 20}
                                y={point.position?.y - 15}
                                fill={pathIndex === index ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"}
                                fontSize="14"
                                fontWeight={pathIndex === index ? "600" : "400"}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: pathIndex === index ? 1 : 0}}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                {Math.round(point.percent * 100)}%
                            </motion.text>
                        </motion.g>
                    ))}
                </svg>
            </div>
        </motion.section>
    );
}