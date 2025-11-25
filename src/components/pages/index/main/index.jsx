import Image from "next/image";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { useGlobalContext } from "@/context/LoadProvider";
import { usePerformance } from "@/context/PerformanceProvider"; // Add performance context
import RotatingButton from "@/components/ui/stickyButtons/buttons/RotatingButton";
import SmallButton from "@/components/ui/stickyButtons/buttons/SmallButton";
import Grid from "@/components/common/grid";
import Link from "next/link";
import Magnetic from "@/components/anim/Magnetic";
import { useEffect, useRef } from "react";
import PixelateText from "./neonText";
import { trackEvent } from "@/hooks/trackEvent";

export default function MainIntro () {
    const { firstLoad } = useGlobalContext();
    const { shouldReduceAnimations } = usePerformance(); // Use performance context
    
    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });
    const wrapperRef = useRef(null);
    const parallaxRef = useRef(null);

    // Conditionally setup parallax effect based on performance
    const { scrollYProgress } = useScroll({
        target: parallaxRef,
        offset: ["start start", "end start"],
        // Skip measuring scroll on low performance devices
        enabled: !shouldReduceAnimations
    });

    // Use simpler spring settings for lower performance devices
    const smoothYScroll = useSpring(scrollYProgress, {
        stiffness: shouldReduceAnimations ? 50 : 100,
        damping: shouldReduceAnimations ? 10 : 20,
        restDelta: 0.001
    });
    
    // Reduce or eliminate parallax movement on lower performance devices
    const yPos = useTransform(
        smoothYScroll, 
        [0, 1], 
        shouldReduceAnimations ? ["0%", "0%"] : ["0%", "10%"]
    );
    
    // Simplify scale transform on lower performance devices
    const scale = useTransform(
        smoothYScroll, 
        [0, 1], 
        shouldReduceAnimations ? [1, 1] : [1.05, 1]
    );

    // Simplify intro animation for lower performance devices
    const introAnim = {
        initial: {
            scale: shouldReduceAnimations ? 1.2 : 1.5, // Reduce scale amount
            opacity: 0
        },
        enter: {
            scale: 1,
            opacity: 1,
            transition: {
                delay: firstLoad ? (shouldReduceAnimations ? 3 : 4.5) : 0.5, // Reduce delay
                duration: shouldReduceAnimations ? 0.7 : 1, // Faster animation
                ease: shouldReduceAnimations ? "easeOut" : [0.76, 0, 0.24, 1], // Simpler easing
            }
        }
    };
    
    const introbutton = {
        initial: {
            y: shouldReduceAnimations ? '100%' : '200%' // Reduced distance
        },
        enter: {
            y: '0%',
            transition: {
                delay: firstLoad ? (shouldReduceAnimations ? 3 : 4) : 0.9,
                duration: shouldReduceAnimations ? 0.7 : 1,
                ease: shouldReduceAnimations ? "easeOut" : [0.76, 0, 0.24, 1],
            }
        }
    };


    // Handle Reviews link click - track reviews page interest
    const handleReviewsClick = () => {
        trackEvent("reviews_page_clicked", {
            button_text: "Koukněte na recenze",
            button_location: "homepage_small_button",
            timestamp: new Date().toISOString(),
            page_section: "main_intro"
        });
    };

    // Handle RotatingButton click - track insurance reporting from homepage
    const handleInsuranceReportingClick = () => {
        trackEvent("insurance_reporting_clicked", {
            button_text: "Nahlášení Pojistného",
            button_location: "homepage_rotating_button",
            external_link: "https://www.pojistnehlaseni.cz/",
            timestamp: new Date().toISOString(),
            page_section: "main_intro"
        });
    };

    return (
        <motion.section className="MainIntro">
            <div className="header">
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link> 
                </Magnetic>
            </div>
            <motion.div 
                className="MainIntro__Wrapper"
                ref={wrapperRef}
                initial="initial"
                animate="enter"
                variants={introAnim}
                style={{
                    transformOrigin: "center center",
                    willChange: shouldReduceAnimations ? "opacity" : "transform, opacity, scale"
                }}
            >
                <motion.div 
                    className="Heading"
                    ref={headingRef}
                >
                    <h1>
                        <PixelateText 
                            text="BUDUJEME PRO LIDI STABILNÍ A KVALITNÍ FINANČNÍ PORADENSTVÍ UŽ PŘES" 
                            isInView={isInView}
                            firstLoad={firstLoad}
                        />
                        <span className="highlighted">
                            <PixelateText 
                                text="JEDNU DEKÁDU" 
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </span>
                    </h1>
                </motion.div>

                <motion.div 
                    className="background__container"
                    ref={parallaxRef}
                >
                    <Grid size="20vh"/>
                    <svg 
                        className="clip-svg"
                        width="100%" 
                        height="100%" 
                        viewBox="0 0 1920 1080" 
                        preserveAspectRatio="xMidYMid slice"
                    >
                        <defs>
                            <clipPath id="background-clip">
                                <path d="M0.53125 38.4766C0.53125 10.8623 22.917 -11.5234 50.5312 -11.5234L1870.53 -11.5234C1898.14 -11.5234 1920.53 10.8623 1920.53 38.4766V1018.48C1920.53 1046.09 1898.14 1068.48 1870.53 1068.48H591.929C564.314 1068.48 541.929 1046.09 541.929 1018.48L541.929 993.563C541.929 965.949 519.543 943.563 491.929 943.563H50.5313C22.917 943.563 0.53125 921.177 0.53125 893.563L0.53125 38.4766Z" />
                            </clipPath>
                        </defs>
                        
                        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" clipPath="url(#background-clip)" />
                        
                        <foreignObject x="0" y="0" width="100%" height="100%" clipPath="url(#background-clip)">
                            {shouldReduceAnimations ? (
                                // Static version for low-performance devices
                                <div 
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        position: 'absolute',
                                        top: '0',
                                        left: '0',
                                        clipPath: 'url(#background-clip)',
                                        overflow: 'hidden',
                                        zIndex: -1,
                                    }} 
                                    className="image-container" 
                                    xmlns="http://www.w3.org/1999/xhtml"
                                >
                                    <Image 
                                        src='/assets/backgrounds/callBGShelf.webp' 
                                        alt="background" 
                                        fill={true} 
                                        priority={true} 
                                        quality={shouldReduceAnimations ? 70 : 90} // Reduce quality for performance
                                        sizes="100vw"
                                        placeholder="blur"
                                        blurDataURL="data:image/webp"
                                        style={{
                                          objectFit: "cover",
                                          objectPosition: "center",
                                        }}
                                    />
                                </div>
                            ) : (
                                // Animated parallax version for high-performance devices
                                <motion.div 
                                    style={{
                                        y: yPos,
                                        scale: scale,
                                        width: '100%',
                                        height: '100%',
                                        position: 'absolute',
                                        top: '0',
                                        left: '0',
                                        clipPath: 'url(#background-clip)',
                                        overflow: 'hidden',
                                        zIndex: -1,
                                    }} 
                                    className="image-container" 
                                    xmlns="http://www.w3.org/1999/xhtml"
                                >
                                    <Image 
                                        src='/assets/backgrounds/callbg2.webp' 
                                        alt="background" 
                                        fill={true} 
                                        priority={true} 
                                        quality={90}
                                        sizes="100vw"
                                        placeholder="blur"
                                        blurDataURL="data:image/webp"
                                        style={{
                                          objectFit: "cover",
                                          objectPosition: "center",
                                        }}
                                    />
                                </motion.div>
                            )}
                            <div 
                                style={{
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: '0',
                                    left: '0',
                                    clipPath: 'url(#background-clip)',
                                }}
                            />
                        </foreignObject>
                    </svg>
                </motion.div>

            </motion.div>
            <motion.div 
                className="rect__container"
                initial='initial'
                animate='enter'
                variants={introbutton}
                onClick={handleReviewsClick}
            >            
                <Link className="rect__bottom" href="/recenze">
                    <SmallButton text="Koukněte na recenze"/>
                </Link>
            </motion.div>
            <motion.div
                className="button__container"
                initial='initial'
                animate='enter'
                variants={introbutton}
            >
                <Link className="button__bottom" href="https://www.pojistnehlaseni.cz/">
                    <RotatingButton 
                        text=" - Nahlášení Pojistného - Nahlášení Pojistného" 
                    />
                </Link>
            </motion.div>
        </motion.section>
    )
}