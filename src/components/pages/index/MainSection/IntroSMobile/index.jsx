import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { motion, useScroll, useMotionValue, animate } from "framer-motion"
import MainText from "@/components/anim/MainText"
import SubText from "@/components/anim/SubText"
import RoundButton from "@/components/ui/stickyButtons/buttons/RoundButton"
import NextImage from "next/image"
import RollingIcons from "@/components/anim/RollingIcons"
import Grid from "@/components/common/grid"
import { throttle } from "lodash"
import { usePerformance } from "@/context/PerformanceProvider"

/**
 * IntroSMobile - Ultra-Optimized Mobile Animation System
 *
 * Performance Optimization Strategy:
 * 1. Static SVG paths (no morphing calculations)
 * 2. Pre-calculated opacity transitions
 * 3. Throttled scroll handling with animation locks
 * 4. Emergency fallback for extremely low-end devices
 * 5. Optimized image preloading and switching
 *
 * Target Performance: 60fps on all mobile devices
 * Memory Usage: Minimal with static paths and discrete state management
 * CPU Usage: Reduced through throttled updates and animation locks
 */

export default function IntroSMobile() {
    const { shouldReduceAnimations } = usePerformance();
    const [activeSection, setActiveSection] = useState(0);
    const [prevSection, setPrevSection] = useState(0);
    const [transitioning, setTransitioning] = useState(false);
    const section = useRef(null);
    const lastScrollValue = useRef(0);
    const animationInProgress = useRef(false);
    const lastAnimationTime = useRef(0);

    // Emergency fallback for extremely low-end devices
    const shouldDisableAllAnimations = useMemo(() => {
        return shouldReduceAnimations && (
            navigator.hardwareConcurrency <= 2 ||
            (navigator.deviceMemory && navigator.deviceMemory <= 2)
        );
    }, [shouldReduceAnimations]);

    // Static path that won't change - optimized for mobile
    const staticPath = "M60 160L60 160 160 60 621 60 1232 60 1760 60 1860 60 1860 160 1860 698 1860 920 1760 1020 1232 1020 160 1020 60 1020 60 920 60 390 60 160Z";

    // Image paths - optimized preloading
    const imageValues = [
        "/assets/backgrounds/behindLaptop.webp",
        "/assets/backgrounds/conference2.webp",
        "/assets/backgrounds/nameCards.webp"
    ];

    // Set up section opacities with initial values - optimized motion values
    const benefitSectionOpacity = useMotionValue(1);
    const aboutSectionOpacity = useMotionValue(0);
    const offersSectionOpacity = useMotionValue(0);
    const iconsOpacity = useMotionValue(0);

    // Pre-calculated transition configurations for maximum performance
    const transitionConfigs = useMemo(() => ({
        duration: shouldReduceAnimations ? 0.4 : 0.7, // Faster on low-end devices
        ease: "easeInOut",
        staggerDelay: shouldReduceAnimations ? 0.1 : 0.2
    }), [shouldReduceAnimations]);

    // Optimized scroll progress with minimal processing
    const {scrollYProgress} = useScroll({
        target: section,
        offset: ['start end', 'end start']
    });
    
    // Ultra-optimized scroll handler with performance locks
    const handleScroll = useCallback(
        throttle((value) => {
            // Skip if animation in progress or on extremely low-end devices
            if (animationInProgress.current || shouldDisableAllAnimations) return;

            const scrollDelta = Math.abs(value - lastScrollValue.current);
            lastScrollValue.current = value;

            // Skip small scroll movements to reduce processing
            if (scrollDelta < 0.01) return;

            let targetIndex;
            if (value >= 0.67) {
                targetIndex = 2;
            } else if (value >= 0.33) {
                targetIndex = 1;
            } else {
                targetIndex = 0;
            }

            // Only update if section changed and enough time has passed
            const timeSinceLastAnimation = Date.now() - lastAnimationTime.current;
            const minAnimationInterval = shouldReduceAnimations ? 300 : 500;

            if (activeSection !== targetIndex && timeSinceLastAnimation > minAnimationInterval) {
                animationInProgress.current = true;
                lastAnimationTime.current = Date.now();

                // Store previous section for transition
                setPrevSection(activeSection);
                setTransitioning(true);

                // Use optimized transition with device-specific timing
                updateSectionVisibility(targetIndex, transitionConfigs.duration);
                setActiveSection(targetIndex);

                // Reset flags after animation completes
                setTimeout(() => {
                    animationInProgress.current = false;
                    setTransitioning(false);
                }, transitionConfigs.duration * 1000 + 100);
            }
        }, shouldReduceAnimations ? 50 : 100), // More frequent checks on capable devices
        [activeSection, shouldDisableAllAnimations, shouldReduceAnimations, transitionConfigs.duration]
    );

    // Setup scroll handler
    useEffect(() => {
        const unsubscribeScroll = scrollYProgress.on("change", handleScroll);
        
        return () => {
            unsubscribeScroll();
            handleScroll.cancel();
        };
    }, [scrollYProgress, handleScroll]);
    
    // Optimized initialization with performance checks
    useEffect(() => {
        // Set initial state - optimized for immediate rendering
        benefitSectionOpacity.set(1);
        aboutSectionOpacity.set(0);
        offersSectionOpacity.set(0);
        iconsOpacity.set(0);

        // Skip preloading on extremely low-end devices to save memory
        if (!shouldDisableAllAnimations) {
            // Optimized image preloading with priority
            imageValues.forEach((src, index) => {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = src;
                link.as = 'image';
                link.crossOrigin = 'anonymous';
                link.importance = index === 0 ? 'high' : 'low';
                document.head.appendChild(link);
            });
        }
    }, [shouldDisableAllAnimations]);

    // Ultra-optimized transition system with pre-calculated timings
    const updateSectionVisibility = useCallback((targetIdx, duration) => {
        const staggerDelay = transitionConfigs.staggerDelay;

        switch(targetIdx) {
            case 0:
                // Parallel fade-out for performance
                animate(aboutSectionOpacity, 0, {
                    duration: duration * 0.5,
                    ease: transitionConfigs.ease
                });
                animate(offersSectionOpacity, 0, {
                    duration: duration * 0.5,
                    ease: transitionConfigs.ease
                });
                animate(iconsOpacity, 0, {
                    duration: duration * 0.4,
                    ease: transitionConfigs.ease
                });

                // Staggered fade-in
                animate(benefitSectionOpacity, 1, {
                    duration: duration * 0.7,
                    delay: staggerDelay,
                    ease: transitionConfigs.ease
                });
                break;

            case 1:
                animate(benefitSectionOpacity, 0, {
                    duration: duration * 0.5,
                    ease: transitionConfigs.ease
                });
                animate(offersSectionOpacity, 0, {
                    duration: duration * 0.5,
                    ease: transitionConfigs.ease
                });
                animate(iconsOpacity, 0, {
                    duration: duration * 0.4,
                    ease: transitionConfigs.ease
                });

                animate(aboutSectionOpacity, 1, {
                    duration: duration * 0.7,
                    delay: staggerDelay,
                    ease: transitionConfigs.ease
                });
                break;

            case 2:
                animate(benefitSectionOpacity, 0, {
                    duration: duration * 0.5,
                    ease: transitionConfigs.ease
                });
                animate(aboutSectionOpacity, 0, {
                    duration: duration * 0.5,
                    ease: transitionConfigs.ease
                });

                animate(offersSectionOpacity, 1, {
                    duration: duration * 0.7,
                    delay: staggerDelay,
                    ease: transitionConfigs.ease
                });

                animate(iconsOpacity, 1, {
                    duration: duration * 0.7,
                    delay: staggerDelay * 1.5,
                    ease: transitionConfigs.ease
                });
                break;
        }
    }, [transitionConfigs]);
    
    return (
        <section className="IntroSMain" ref={section}>
            <div className="IntroSMain__section"/>
            <div className="IntroSMain__section"/>
            <div className="IntroSMain__section"/>

            <div className="IntroSMain__sticky"> 
                <div className="IntroSMain__sticky__container"> 
                    <Grid size="20vh"/>
                    
                    {/* Content sections with only opacity animations to avoid SCSS issues */}
                    <motion.div 
                        className="IntroSMain__Benefit"
                        style={{ opacity: benefitSectionOpacity }}
                    >
                        <div className="IntroSMain__Benefit__over">
                            <MainText 
                                text="BENEFIT PROGRAM.<br />STAČÍ, ABY SE Z VAŠEHO DOPORUČENÍ STAL NOVÝ KLIENT, A PENÍZE JSOU VAŠE. VYHRÁVÁTE JAK VY TAK I DRUHÝ." 
                                className="mainText__container"
                            />
                            <SubText 
                                text="Ať už chcete splatit hypotéku, zajistit lepší budoucnost pro děti, nebo si dopřát něco navíc. Benefit program vám k tomu pomůže. Prostě doporučte, a sledujte, jak roste nejen váš úspěch, ale i jejich díky Vám." 
                                className="subText__container" 
                            />
                        </div>
                        <div className="IntroSMain__Benefit__under">
                            <NextImage 
                                src="/assets/prebuild/svg/graphMain.svg"
                                alt="benefit-icon"  
                                width={200}
                                height={200}
                                priority={false}
                                quality={90}
                            />
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        className="IntroSMain__About"
                        style={{ opacity: aboutSectionOpacity }}
                    >
                        <div className="IntroSMain__About__over">
                            <SubText 
                                text="Náš tým roste a zraje s jediným cílem: přinášet vám výsledky, a splnit naši misi." 
                                className="subText__container" 
                            />
                            <MainText 
                                text="UMOŽŇUJEME VYVÍJET NOVÉ ÚSPĚŠNÉ PŘÍBĚHY, A TO NEJEN TY VAŠE. SPOLEČNĚ BUDUJEME TÝM EXPERTŮ, NA KTERÉ SE MŮŽETE SPOLEHNOUT." 
                                className="mainText__container"
                            />
                        </div>
                        <div className="IntroSMain__About__under">
                            <NextImage 
                                src="/assets/prebuild/svg/teamMain.svg"
                                alt="about-icon"  
                                width={200}
                                height={200}
                                priority={false}
                                quality={90}
                            />
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        className="IntroSMain__Offers"
                        style={{ opacity: offersSectionOpacity }}
                    >
                        <div className="IntroSMain__Offers__over">
                            <MainText 
                                text="VYJEDNALI JSME PRO NAŠE KLIENTY SLEVY A SKVĚLÉ NABÍDKY TAKY MIMO NAŠÍ OBLAST, ABYSTE UŠETŘILI I U KAŽDODENNÍCH POTŘEB. " 
                                className="mainText__container"
                            />
                        </div>
                        <div className="IntroSMain__Offers__under">
                            <NextImage 
                                src="/assets/prebuild/svg/offerMain.svg"
                                alt="offers-icon"  
                                width={200}
                                height={200}
                                priority={false}
                                quality={90}
                            />
                        </div>
                    </motion.div>

                    <motion.div 
                        className="IntroSMain__Offers__under__icons"
                        style={{ opacity: iconsOpacity }}
                    >
                        <div className="logos__container">
                            <div className="logos__wrapper">
                                <div className="header">
                                    <p>NAŠI PARTNEŘI:</p>
                                </div>
                                <div className="devider__wrapper"/>
                                <RollingIcons baseVelocity={2.5}/>
                                <div className="devider__wrapper"/>
                            </div>
                        </div>
                        
                        <div className="logos__container">
                            <div className="logos__wrapper">
                                <div className="header">
                                    <p>LOKALNI PARTNEŘI:</p>
                                </div>
                                <div className="devider__wrapper"/>
                                <RollingIcons baseVelocity={2.5}/>
                                <div className="devider__wrapper"/>
                            </div>
                        </div>
                    </motion.div>
                    
                    <div className="divider"/>
                    
                    {/* Ultra-optimized button container */}
                    <div className="IntroSMain__button__container">
                        <div className="IntroSMain__button" style={{ translateX: "0%" }}>
                            {/* Performance-optimized button animations */}
                            {[
                                { text: "Zobrazit Program", href: "/benefit-program", section: 0 },
                                { text: "Náš tým expertů", href: "/o-nas", section: 1 },
                                { text: "Získat Nabídky", href: "/nabidky", section: 2 }
                            ].map((button, index) => (
                                <motion.div
                                    key={index}
                                    className="IntroSMain__button__subcontainer"
                                    style={{
                                        opacity: shouldDisableAllAnimations ?
                                            (activeSection === index ? 1 : 0) :
                                            (activeSection === index ? 1 : 0),
                                        display: activeSection === index ? 'flex' : 'none',
                                        position: 'absolute',
                                        top: "50%",
                                        left: 0,
                                        width: '100%',
                                        willChange: shouldDisableAllAnimations ? "auto" : "opacity",
                                        transform: "translateZ(0)",
                                    }}
                                >
                                    <motion.div className="IntroSMain__button__subcontainer__inner">
                                        <RoundButton text={button.text} href={button.href} />
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Ultra-optimized SVG with performance improvements */}
                    <svg
                        width="100%"
                        height="100%"
                        viewBox='0 0 1920 1080'
                        xmlns="http://www.w3.org/2000/svg"
                        className="IntroSMain__svg"
                        preserveAspectRatio="xMidYMid meet"
                        style={{
                            willChange: shouldDisableAllAnimations ? "auto" : "transform",
                            backfaceVisibility: "hidden",
                            transform: "translateZ(0)",
                            isolation: "isolate",
                            contain: "paint layout style",
                            shapeRendering: "optimizeSpeed",
                            transition: transitioning && !shouldDisableAllAnimations ?
                                `opacity ${transitionConfigs.duration * 0.4}s ease` : "none",
                            opacity: shouldDisableAllAnimations ? 0.9 : 1, // Slight opacity for static fallback
                        }}
                    >
                        <path
                            d={staticPath}
                            fill={`url(#pattern${activeSection})`}
                            style={{
                                willChange: "auto", // Static path, no morphing
                                transform: "translateZ(0)",
                                shapeRendering: "optimizeSpeed",
                                vectorEffect: "non-scaling-stroke",
                            }}
                        />

                        <defs>
                            {/* Optimized pattern definitions */}
                            {imageValues.map((src, i) => (
                                <pattern
                                    key={`pattern${i}`}
                                    id={`pattern${i}`}
                                    patternUnits="userSpaceOnUse"
                                    width="100%"
                                    height="100%"
                                >
                                    <image
                                        href={src}
                                        x={0}
                                        y={0}
                                        width="100%"
                                        height="100%"
                                        preserveAspectRatio="xMidYMid slice"
                                        crossOrigin="anonymous"
                                        style={{
                                            willChange: "auto",
                                            pointerEvents: "none",
                                            transform: "translateZ(0)",
                                            imageRendering: shouldReduceAnimations ? "optimizeSpeed" : "optimizeQuality",
                                        }}
                                    />
                                    <rect
                                        x="0"
                                        y="0"
                                        width="100%"
                                        height="100%"
                                        fill="rgba(0,0,0,0.7)"
                                    />
                                </pattern>
                            ))}
                        </defs>
                    </svg>

                    {/* Preload images - conditionally based on device performance */}
                    {!shouldDisableAllAnimations && (
                        <div style={{ display: 'none', visibility: 'hidden', width: 0, height: 0 }}>
                            {imageValues.map((src, i) => (
                                <link
                                    key={`preload-${i}`}
                                    rel="preload"
                                    as="image"
                                    href={src}
                                    importance={i === 0 ? "high" : "low"}
                                    crossOrigin="anonymous"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}