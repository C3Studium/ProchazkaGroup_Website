// index.jsx
import Grid from "@/components/common/grid";
import { useScroll, useTransform, motion, animate, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRef, useState, useMemo, useCallback, useLayoutEffect, useEffect } from "react";


export default function BenefitRewards() {
    const sectionScroll = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollTimeout = useRef(null);
    const isSnapping = useRef(false);
    const isVisible = useRef(false);
    const [passedLastPoint, setPassedLastPoint] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const checkTouch = () => {
            return (
                'ontouchstart' in window ||
                (window.navigator && window.navigator.maxTouchPoints > 0) ||
                (window.navigator && window.navigator.msMaxTouchPoints > 0)
            );
        };
        setIsTouchDevice(checkTouch());
    }, []);

    const snapActive = useRef(false);

    const { scrollYProgress } = useScroll({
        target: sectionScroll,
    });

    const points = 12;
    

    // Calculate peak points with useMemo to align with circles
    const peakPoints = useMemo(() => {
        // Instead of center points between sections, we'll place the transition points
        // closer to the circles, at about 80% of the way to the next circle
        return Array.from({ length: points }, (_, i) => {
            // Calculate the base position for each point (evenly spaced)
            const basePosition = i / points;
            
            // Add small offset to push transition points closer to the circles
            // The 1/(points*2) creates evenly spaced offsets
            // Multiplying by 0.8 shifts them closer to the circles
            const offset = (1 / (points * 2)) * 0.8;
            
            return basePosition + offset;
        });
    }, [points]);

    // Add activeIndex tracking for AnimatePresence
    useEffect(() => {
        const unsubscribe = scrollYProgress.onChange((value) => {
            // Determine which section is active based on the scroll value
            for (let i = 0; i < peakPoints.length; i++) {
                const currentPeak = peakPoints[i];
                const nextPeak = peakPoints[i + 1] || 1;
                const halfwayToNext = currentPeak + ((nextPeak - currentPeak) / 2);
                
                // If we're in this range, set this as the active index
                if (value < halfwayToNext) {
                    setActiveIndex(i);
                    break;
                }
            }
        });
        
        return () => unsubscribe();
    }, [scrollYProgress, peakPoints]);

    const circleProgress0 = useTransform(scrollYProgress, [0, peakPoints[0]], [1, 1], { clamp: true });
    const circleProgress1 = useTransform(scrollYProgress, [peakPoints[0] + 0.02, peakPoints[1] - 0.02], [0, 1], { clamp: true });
    const circleProgress2 = useTransform(scrollYProgress, [peakPoints[1] + 0.02, peakPoints[2] - 0.02], [0, 1], { clamp: true });
    const circleProgress3 = useTransform(scrollYProgress, [peakPoints[2] + 0.02, peakPoints[3] - 0.02], [0, 1], { clamp: true });
    const circleProgress4 = useTransform(scrollYProgress, [peakPoints[3] + 0.02, peakPoints[4] - 0.02], [0, 1], { clamp: true });
    const circleProgress5 = useTransform(scrollYProgress, [peakPoints[4] + 0.02, peakPoints[5] - 0.02], [0, 1], { clamp: true });
    const circleProgress6 = useTransform(scrollYProgress, [peakPoints[5] + 0.02, peakPoints[6] - 0.02], [0, 1], { clamp: true });
    const circleProgress7 = useTransform(scrollYProgress, [peakPoints[6] + 0.02, peakPoints[7] - 0.02], [0, 1], { clamp: true });
    const circleProgress8 = useTransform(scrollYProgress, [peakPoints[7] + 0.02, peakPoints[8] - 0.02], [0, 1], { clamp: true });
    const circleProgress9 = useTransform(scrollYProgress, [peakPoints[8] + 0.02, peakPoints[9] - 0.02], [0, 1], { clamp: true });
    const circleProgress10 = useTransform(scrollYProgress, [peakPoints[9] + 0.02, peakPoints[10] - 0.02], [0, 1], { clamp: true });
    const circleProgress11 = useTransform(scrollYProgress, [peakPoints[10] + 0.02, peakPoints[11] - 0.02], [0, 1], { clamp: true });

    // Segments anims aligned with circle transitions
    const segmentProgress0 = useTransform(scrollYProgress, [peakPoints[0], peakPoints[0] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress1 = useTransform(scrollYProgress, [peakPoints[1], peakPoints[1] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress2 = useTransform(scrollYProgress, [peakPoints[2], peakPoints[2] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress3 = useTransform(scrollYProgress, [peakPoints[3], peakPoints[3] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress4 = useTransform(scrollYProgress, [peakPoints[4], peakPoints[4] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress5 = useTransform(scrollYProgress, [peakPoints[5], peakPoints[5] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress6 = useTransform(scrollYProgress, [peakPoints[6], peakPoints[6] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress7 = useTransform(scrollYProgress, [peakPoints[7], peakPoints[7] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress8 = useTransform(scrollYProgress, [peakPoints[8], peakPoints[8] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress9 = useTransform(scrollYProgress, [peakPoints[9], peakPoints[9] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress10 = useTransform(scrollYProgress, [peakPoints[10], peakPoints[10] + 0.02], ['100%', '0%'], { clamp: true });
    const segmentProgress11 = useTransform(scrollYProgress, [peakPoints[11], peakPoints[11] + 0.02], ['100%', '0%'], { clamp: true });

    const rewards = [
        {
            name: "1.DOPORUČENÍ",
            number: '500,- ',
            moto: "POUKAZ - KAUFLAND NEBO SHELL",
            src: "/assets/benefit-cards/DOP01.webp",
            alt: "doporučení_1",
            circleAnim: circleProgress0,
            segmentAnim: segmentProgress0
        },
        {
            name: "2.DOPORUČENÍ",
            number: '500,- ',
            moto: "POUKAZ - KAUFLAND NEBO SHELL",
            src: "/assets/benefit-cards/DOP02.webp",
            alt: "doporučení_2",
            circleAnim: circleProgress1,
            segmentAnim: segmentProgress1
        },
        {
            name: "3.DOPORUČENÍ",
            number: '500,- ',
            moto: "POUKAZ - KAUFLAND NEBO SHELL",
            src: "/assets/benefit-cards/DOP03.webp",
            alt: "doporučení_3",
            circleAnim: circleProgress2,
            segmentAnim: segmentProgress2
        },
        {
            name: "4.DOPORUČENÍ",
            number: '500,- ',
            moto: "POUKAZ - KAUFLAND NEBO SHELL",
            src: "/assets/benefit-cards/DOP04.webp",
            alt: "doporučení_4",
            circleAnim: circleProgress3,
            segmentAnim: segmentProgress3
        },
        {
            name: "5.DOPORUČENÍ",
            number: '500,- ',
            moto: "POUKAZ - KAUFLAND NEBO SHELL",
            src: "/assets/benefit-cards/DOP05.webp",
            alt: "doporučení_5",
            circleAnim: circleProgress4,
            segmentAnim: segmentProgress4
        },
        {
            name: "6.DOPORUČENÍ",
            number: '1 000,-',
            moto: "POUKAZ - KAUFLAND, SHELL NEBO ALZA",
            src: "/assets/benefit-cards/DOP06.webp",
            alt: "doporučení_6",
            circleAnim: circleProgress5,
            segmentAnim: segmentProgress5
        },
        {
            name: "7.DOPORUČENÍ",
            number: '1 000,-',
            moto: "POUKAZ - KAUFLAND, SHELL NEBO ALZA",
            src: "/assets/benefit-cards/DOP07.webp",
            alt: "doporučení_7",
            circleAnim: circleProgress6,
            segmentAnim: segmentProgress6
        },
        {
            name: "8.DOPORUČENÍ",
            number: '1 000,-',
            moto: "POUKAZ - KAUFLAND, SHELL NEBO ALZA",
            src: "/assets/benefit-cards/DOP08.webp",
            alt: "doporučení_8",
            circleAnim: circleProgress7,
            segmentAnim: segmentProgress7
        },
        {
            name: "9.DOPORUČENÍ",
            number: '1 000,-',
            moto: "POUKAZ - KAUFLAND, SHELL NEBO ALZA",
            src: "/assets/benefit-cards/DOP09.webp",
            alt: "doporučení_9",
            circleAnim: circleProgress8,
            segmentAnim: segmentProgress8
        },
        {
            name: "10.DOPORUČENÍ",
            number: '1 000,-',
            moto: "POUKAZ - KAUFLAND, SHELL NEBO ALZA",
            src: "/assets/benefit-cards/DOP10.webp",
            alt: "doporučení_10",
            circleAnim: circleProgress9,
            segmentAnim: segmentProgress9
        },
        {
            name: "20.DOPORUČENÍ",
            number: '15 000,-',
            moto: "POUKAZ - ALZA, ABOUTYOU nebo ZALANDO",
            src: "/assets/benefit-cards/DOP11.webp",
            alt: "doporučení_11",
            circleAnim: circleProgress10,
            segmentAnim: segmentProgress10
        },
        {
            name: "30.DOPORUČENÍ",
            number: '25 000,-',
            moto: "POUKAZ - ALZA, WELLNESS (MORAVA NEBO ŠUMAVA)",
            src: "/assets/benefit-cards/DOP12.webp",
            alt: "doporučení_12",
            circleAnim: circleProgress11,
            segmentAnim: segmentProgress11
        },
    ]

    // Scroll handling with useCallback
    const handleScroll = useCallback(() => {
        try {
            // Safety checks
            if (!sectionScroll?.current || 
                !isVisible?.current || 
                isSnapping?.current || 
                !snapActive?.current || 
                !peakPoints || 
                peakPoints.length === 0 || 
                typeof window === 'undefined') return;
            
            // Clear existing timeout
            if (scrollTimeout?.current) {
                clearTimeout(scrollTimeout.current);
            }
            
            // Set timeout duration based on device
            const timeoutDuration = isTouchDevice ? 1000 : 50;
            
            scrollTimeout.current = setTimeout(() => {
                const element = sectionScroll.current;
                if (!element) return;
    
                // Calculate scroll progress
                const rect = element.getBoundingClientRect();
                const sectionScrollProgress = -rect.top / (rect.height - window.innerHeight);
                
                // Validate scroll progress
                if (isNaN(sectionScrollProgress) || !isFinite(sectionScrollProgress)) return;
                
                // Check last point
                if (sectionScrollProgress > peakPoints[peakPoints.length - 1]) {
                    setPassedLastPoint(true);
                    return;
                }
    
                // Reset on scroll up
                if (sectionScrollProgress < peakPoints[peakPoints.length - 1]) {
                    setPassedLastPoint(false);
                }
    
                // Continue only if not passed last point
                if (!passedLastPoint) {
                    let closestPeak = peakPoints[0];
                    let closestIndex = 0;
                    let minDistance = Math.abs(sectionScrollProgress - peakPoints[0]);
    
                    // Find closest peak
                    peakPoints.forEach((peak, index) => {
                        const distance = Math.abs(sectionScrollProgress - peak);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPeak = peak;
                            closestIndex = index;
                        }
                    });
    
                    // Adjust threshold based on device
                    const snapThreshold = isTouchDevice ? 0.1 / points : 0.03 / points;
                    
                    // Animate if beyond threshold
                    if (minDistance > snapThreshold) {
                        isSnapping.current = true;
                        setActiveIndex(closestIndex);
    
                        const targetScroll = window.scrollY + 
                            (closestPeak - sectionScrollProgress) * 
                            (rect.height - window.innerHeight);
    
                        let animation = animate(window.scrollY, targetScroll, {
                            type: "spring",
                            stiffness: isTouchDevice ? 200 : 400,
                            damping: isTouchDevice ? 40 : 30,
                            mass: isTouchDevice ? 1 : 0.5,
                            bounce: 0,
                            onComplete: () => {
                                isSnapping.current = false;
                            },
                            onUpdate: (value) => {
                                window.scrollTo({
                                    top: value,
                                    behavior: 'auto'
                                });
                            },
                            velocity: scrollYProgress.getVelocity() * (isTouchDevice ? 0.3 : 1),
                        });
    
                        // Cleanup animation on component unmount
                        return () => {
                            if (animation) animation.stop();
                        };
                    }
                }
            }, timeoutDuration);
        } catch (error) {
            console.error('Scroll handler error:', error);
            isSnapping.current = false;
            snapActive.current = false;
        }
    }, [
        peakPoints, 
        points, 
        scrollYProgress, 
        isTouchDevice, 
        passedLastPoint,
        setActiveIndex, 
        setPassedLastPoint
    ]);

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const element = sectionScroll.current;
        if (!element) return;
        
        let rafId;
        let observerTimeout;
        
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                
                const elementTop = entry.boundingClientRect.top;
                const elementBottom = entry.boundingClientRect.bottom;
                const windowHeight = window.innerHeight;
                
                const topThreshold = windowHeight * 0.1;
                const bottomThreshold = windowHeight * 0.9;
                
                const isWithinThreshold = 
                    elementTop <= topThreshold && 
                    elementBottom >= bottomThreshold;

                isVisible.current = entry.isIntersecting;
                snapActive.current = isWithinThreshold;
            },
            { 
                rootMargin: "-10% 0px -10% 0px",
                threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
            }
        );

        observer.observe(element);

        const handleScrollDebounced = () => {
            if (rafId) cancelAnimationFrame(rafId);
            
            rafId = requestAnimationFrame(() => {
                if (!isSnapping.current) handleScroll();
            });
        };

        window.addEventListener("scroll", handleScrollDebounced, { passive: true });

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (observerTimeout) clearTimeout(observerTimeout);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            if (observer) observer.disconnect();
            
            window.removeEventListener("scroll", handleScrollDebounced);
            
            isVisible.current = false;
            snapActive.current = false;
            isSnapping.current = false;
        };
    }, [handleScroll]);


    return (
        <section className="BenefitRewards" ref={sectionScroll}>
            <motion.div className="BenefitRewards__wrapper">
                <Grid size="20vh" key={"BenefitRewards__wrapper"}/> 
                {/* Main Info Section */}
                <div className="BenefitRewards__MainInfo">
                    <div className="BenefitRewards__MainInfo__icons__container">
                       <p>
                        CHCETE VĚDĚT CO PŘESNĚ DOSTANETE? 
                       </p>
                    </div>   
                </div>

                {/* Sub Info Section */}
                <div className="BenefitRewards__SubInfo">
                    <div className="BenefitRewards__SubInfo__Details">
                        <AnimatePresence mode="wait">
                            {rewards.map((reward, i) => (
                                activeIndex === i && (
                                    <motion.div 
                                        key={`details-${i}`} 
                                        className="BenefitRewards__SubInfo__Details__item"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <h3>{reward.name}</h3>
                                        <h4>{reward.number}</h4>
                                        <p>{reward.moto}</p>
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </div>
                    <div className="BenefitRewards__SubInfo__Moto">
                        <h2>
                            MÁTE CHUŤ <br />
                            BÝT AKTIVNÍMI? TO,<br />
                            JAK RYCHLE SE NA KONEC DOSTANETE, JE ČISTĚ NA VÁS.
                        </h2>
                    </div>
                </div>

                {/* Collage Section with Snapping Transform */}
                <div className="BenefitRewards__Collage">
                    <div className="BenefitRewards__Collage__pics">
                        <AnimatePresence mode="wait">
                            {rewards.map((reward, i) => (
                                activeIndex === i && (
                                    <motion.div 
                                        key={`pic-${i}`} 
                                        className="BenefitRewards__Collage__pic"
                                        initial={{ scale: 0.98, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.98, opacity: 0 }}
                                        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                                    >
                                        <Image 
                                            src={reward.src} 
                                            alt={reward.alt} 
                                            fill={true}
                                            quality={100}
                                            priority={false}
                                            sizes="50vw"
                                            placeholder="blur"
                                            blurDataURL="data:image/webp"
                                        />
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </div>
                    <div className="BenefitRewards__Collage__progress">
                        <div>
                            {rewards.map((person, i) => (
                                <div key={`circle-${i}`} className="progress__circle">
                                <motion.div style={{ scale: person.circleAnim }}></motion.div>
                                </div>
                            ))}
                        </div>
                        <div>
                            {rewards.map((person, i) => (
                                <div key={`segment-outline-${i}`} className="progress__segment">
                                <motion.div style={{ x: person.segmentAnim }}></motion.div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}