import Magnetic from "@/components/anim/Magnetic";
import SubText from "@/components/anim/SubText";
import Grid from "@/components/common/grid";
import { useScroll, useTransform, motion, animate, useAnimation, AnimatePresence, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useMemo, useCallback, useLayoutEffect, useEffect } from "react";
import { FaFacebookF, FaGlobe, FaInstagram, FaLinkedinIn, FaTwitter, FaYoutube, FaEnvelope } from "react-icons/fa";
import PixelateText from "../../index/main/neonText";


export default function AboutTeam() {
    const sectionScroll = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollTimeout = useRef(null);
    const isSnapping = useRef(false);
    const isVisible = useRef(false);
    const [passedLastPoint, setPassedLastPoint] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const headingRef = useRef([]);
    const numberRef = useRef([]);
    const isInView = useInView(headingRef, { once: true });
    const isInView2 = useInView(headingRef, { once: true });



    const snapActive = useRef(false);


    const { scrollYProgress } = useScroll({
        target: sectionScroll,
    });

    const points = 11;
    // Calculate peak points with useMemo

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

    // Replace opacity transforms with activeIndex tracking
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

    // Circle anims with adjusted transition points
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
    const circleProgress10 = useTransform(scrollYProgress, [peakPoints[9] + 0.02, 1], [0, 1], { clamp: true });
    
    
    
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

    const people = [
        {
            name: "Václav Procházka ",
            number: '01',
            moto: "V životě i v byznysu se snažím vyvarovat dvou zásadních chyb - jednat unáhleně anebo nejednat vůbec.",
            src: "/assets/portraits/business/11.webp",
            alt: "profile_pic1",
            src2: "/assets/portraits/casual/11.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress0,
            segmentAnim: segmentProgress0,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:vaclav.prochazka2@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/vaclav.prochazka.5?locale=cs_CZ" },
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/prochazka_vaclav?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" },
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/" }
            ]
        },
        {
            name: "Michaela Marková",
            number: '02',
            moto: "Každý klient má svůj příběh - my ho respektujeme a společně hledáme cestu k úspěchu.",
            src: "/assets/portraits/business/8.webp",
            alt: "profile_pic1",
            src2: "/assets/prebuild/cactus.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress1,
            segmentAnim: segmentProgress1,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:michaela.markova@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/misa.markova.940?locale=cs_CZ" },
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/mark_michaela?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" },
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/" }
            ]
        },
        {
            name: "Ondřej Efenberk",
            number: '03',
            moto: "Důležité je být připraven než v budoucnu nemile překvapen.",
            src: "/assets/portraits/business/17.webp",
            alt: "profile_pic1",
            src2: "/assets/portraits/casual/17.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress2,
            segmentAnim: segmentProgress2,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:ondrej.efenberk@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/ondrej.efenberk?locale=cs_CZ" },
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/ondrej_efenberk?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" },
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/" }
            ]
        },
        {
            name: "Tereza Posnerová",
            number: '04',
            moto: "Buď tím, kdo druhým otevírá cestu k úspěchu.",
            src: "/assets/portraits/business/12.webp",
            alt: "profile_pic1",
            src2: "/assets/portraits/casual/12.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress3,
            segmentAnim: segmentProgress3,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:tereza.posnerova@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/tereza.posnerova?locale=cs_CZ" },
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/teruu_na?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/" }
            ]
        },
        {
            name: "Tereza Marková",
            number: '05',
            moto: "Věnuji čas vašim financím, abyste mohli věnovat čas svému životu.",
            src: "/assets/portraits/business/6.webp",
            alt: "profile_pic1",
            src2: "/assets/portraits/casual/6.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress4,
            segmentAnim: segmentProgress4,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:tereza.markova6@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/terezka.markova.73/?locale=cs_CZ" },
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/terka.markova/"},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/" }
            ]
        },
        {
            name: "Lukáš Matouš",
            number: '06',
            moto: "Nemysli na minulost, žij v přítomnosti a mysli na budoucnost.",
            src: "/assets/portraits/business/18.webp",
            alt: "profile_pic1",
            src2: "/assets/prebuild/rock.webp",
            alt2: "profile_pic1",
            circleAnim: circleProgress5,
            segmentAnim: segmentProgress5,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:lukas.matous1@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/lukas.matous.3?locale=cs_CZ"},
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/matous.lukas?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/"}
            ]
        },
        {
            name: "Olga Kaslová",
            number: '07',
            moto: "Pomohu Vašim financím, Vy si můžete užívat život bez starostí.",
            src: "/assets/portraits/business/15.webp",
            alt: "profile_pic1",
            src2: "/assets/prebuild/cactus.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress6,
            segmentAnim: segmentProgress6,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:olga.kaslova@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/olga.kaslova?locale=cs_CZ"},
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/okaslova?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/"}
            ]
        },
        {
            name: "Lukáš Vituj",
            number: '08',
            moto: "Čísla nikdy nelžou a pravda vítězí.",
            src: "/assets/portraits/business/19.webp",
            alt: "profile_pic1",
            src2: "/assets/portraits/casual/19.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress7,
            segmentAnim: segmentProgress7,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:vituj@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/profile.php?id=100008797333828&locale=cs_CZ"},
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/lukasvituj7?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/"}
            ]
        },
        {
            name: "Kristýna Fürbachová",
            number: '09',
            moto: "Když už nám hoří dům, alespoň se ohřejeme.",
            src: "/assets/portraits/business/9.webp",
            alt: "profile_pic1",
            src2: "/assets/prebuild/water.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress8,
            segmentAnim: segmentProgress8,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:servis.prochazka@ovbone.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/tynuse.furbachova?locale=cs_CZ"},
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/tynus.furbachova/"},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/"}
            ]
        },
        {
            name: "Anna Štofflová",
            number: '10',
            moto: "Kvalitní informace jsou klíč ke všemu, i k penězům.",
            src: "/assets/portraits/business/2.webp",
            alt: "profile_pic1",
            src2: "/assets/prebuild/water.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress9,
            segmentAnim: segmentProgress9,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:anna.stofflova@ovbmail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/anicka.stofflova?locale=cs_CZ"},
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/annastofflova?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/"}
            ]
        },
        {
            name: "Jana Filipská",
            number: '11',
            moto: "Kvalitní informace jsou klíč ke všemu, i k penězům.",
            src: "/assets/portraits/business/20.webp",
            alt: "profile_pic1",
            src2: "/assets/portraits/casual/20.webp",
            alt2: "profile_pic2",
            circleAnim: circleProgress10,
            segmentAnim: segmentProgress10,
            icons: [
              { name: "mail", src: FaEnvelope, href: "mailto:jana.filipska1@ovbamail.cz"},
              { name: "facebook", src: FaFacebookF, href: "https://www.facebook.com/jana.filip.77?locale=cs_CZ"},
              { name: "instagram", src: FaInstagram, href: "https://www.instagram.com/jana.filipska/?utm_source=ig_web_button_share_sheet"},
            //   { name: "mainWeb", src: FaGlobe, href: "https://www.ovbone.cz/"}
            ]
        },
    ]
    // Enhanced snap detection and animation
    // Updated handleScroll
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
        <motion.section className="AboutTeam" ref={sectionScroll} id="poradci">
            <motion.div
                className="AboutTeam__sticky"
            >
                <motion.div className="AboutTeam__sticky__wrapper"> 
                    <motion.div className="AboutTeam__wrapper">
                        <Grid size="20vh" key={"AboutTeam__wrapper"}/>
                        {/* Main Info Section */}
                        <div className="AboutTeam__MainInfo">
                            {/* <div className="AboutTeam__SubInfo__Moto">
                                <h2>
                                    CELKOVÉ HESLO PRO KOMPLETNĚ CELÝ TÝM KTERÉHO SE DRŽÍ NEBO
                                    VIZE CO CHTEJÍ VYTVOŘIT 
                                </h2>
                            </div> */}
                            <div className="AboutTeam__MainInfo__header">
                                <AnimatePresence mode="wait">
                                    {people.map((person, i) => (
                                        activeIndex === i && (
                                            <motion.div 
                                                key={`header-${i}`} 
                                                className="AboutTeam__MainInfo__header__container"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ duration: 0.5 }}
                                                ref={(el) => (headingRef.current[i] = el)}
                                            >
                                                <h2>
                                                    <PixelateText 
                                                        text={person.name}
                                                        isInView={isInView}
                                                    />
                                                </h2>
                                            </motion.div>
                                        )
                                    ))}
                                </AnimatePresence>
                            </div>
                            <div className="AboutTeam__MainInfo__text__container">
                                <div className="AboutTeam__MainInfo__text">
                                    <AnimatePresence mode="wait">
                                        {people.map((person, i) => (
                                            activeIndex === i && (
                                                <motion.div 
                                                    key={`text-${i}`} 
                                                    className="AboutTeam__MainInfo__text__container__text"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ duration: 0.5 }}
                                                    ref={(el) => (numberRef.current[i] = el)}
                                                >
                                                    <p className="number__text">
                                                        <PixelateText 
                                                            text={person.number}
                                                            isInView={isInView2}
                                                        />
                                                    </p>
                                                    <SubText
                                                        text={person.moto}
                                                        initialColor="#fff"
                                                        className={"moto__text__subtext"}
                                                    />
                                                </motion.div>
                                            )
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="AboutTeam__MainInfo__icons__container">
                                <div className="AboutTeam__MainInfo__icons">
                                    <AnimatePresence mode="wait">
                                        {people.map((person, i) => (
                                            activeIndex === i && (
                                            <motion.div 
                                                key={`icons-container-${i}`} 
                                                className="AboutTeam__MainInfo__person__icons"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                {/* Inner map for the specific person's icons */}
                                                {person.icons.map((icon, iconIndex) => {
                                                const IconComponent = icon.src;
                                                return (
                                                    <motion.div
                                                        key={`icon-${i}-${iconIndex}`}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ 
                                                            opacity: 1, 
                                                            scale: 1,
                                                            transition: { 
                                                            delay: iconIndex * 0.1,  // Staggered animation
                                                            duration: 0.4
                                                            } 
                                                        }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="icon__wrapper"
                                                    >
                                                    <Magnetic sensitivity={0.1}>
                                                        <Link href={icon.href} target="_blank" rel="noopener noreferrer">
                                                            <IconComponent 
                                                                size={40}
                                                                aria-label={icon.name}
                                                                className="social__icon"
                                                            />
                                                        </Link>
                                                    </Magnetic>
                                                    </motion.div>
                                                );
                                                })}
                                            </motion.div>
                                            )
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Collage Section with Snapping Transform */}
                        <div className="AboutTeam__Collage">
                            <div className="AboutTeam__Collage__pics">
                                <AnimatePresence mode="wait">
                                    {people.map((person, i) => (
                                        activeIndex === i && (
                                            <motion.div 
                                                key={`pic-${i}`} 
                                                className="AboutTeam__Collage__pic"
                                                initial={{ scale: 0.95, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.95, opacity: 0 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <PixelatedImage 
                                                    src={person.src}
                                                    alt={person.alt}
                                                    src2={person.src2}
                                                    alt2={person.alt2}
                                                    index={i}
                                                    isTouchDevice={isTouchDevice}
                                                />
                                            </motion.div>
                                        )
                                    ))}
                                </AnimatePresence>
                            </div>
                            <div className="AboutTeam__Collage__progress">
                                <div>
                                    {people.map((person, i) => (
                                        <div key={`circle-${i}`} className="progress__circle">
                                        <motion.div style={{ scale: person.circleAnim }}></motion.div>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    {people.map((person, i) => (
                                        <div key={`segment-outline-${i}`} className="progress__segment">
                                        <motion.div style={{ x: person.segmentAnim }}></motion.div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.section>
    )
}


const PixelatedImage = ({ src, alt, src2, alt2, index, isTouchDevice }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const controls = useAnimation();
    const [gridParams, setGridParams] = useState({
        tileSize: "5vw",
        rows: 8,
        columns: 8
    });
    
    useEffect(() => {
        if(isClicked || isHovered) {
            setIsRevealed(true);
        }
        else {
            setIsRevealed(false);
        }
    }, [isClicked, isHovered]);
    
    // Effect to handle screen size changes
    useEffect(() => {
        const handleResize = () => {
            // Only update grid params if screen width changes across the 600px threshold
            const isSmallScreen = window.innerWidth <= 600;
            
            setGridParams(prevParams => {
                // Check if we need to update (crossing the threshold)
                const wasSmallScreen = prevParams.rows === 6;
                
                if (isSmallScreen && !wasSmallScreen) {
                    // Switch to small screen layout
                    return {
                        tileSize: "8vw",  // Larger tiles
                        rows: 10,          // Fewer rows
                        columns: 10        // Fewer columns
                    };
                } else if (!isSmallScreen && wasSmallScreen) {
                    // Switch to normal layout
                    return {
                        tileSize: "5vw",  // Original size
                        rows: 8,          // Original rows
                        columns: 8        // Original columns
                    };
                }
                
                // No change needed
                return prevParams;
            });
        };
        
        // Set initial grid params
        handleResize();
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
        
        // Clean up
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Recalculate grid tiles when grid params change
    const gridTiles = useMemo(() => {
        const { rows, columns } = gridParams;
        const tiles = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const tileIndex = row * columns + col;
                const xOffset = -(col * (100 / columns));
                const yOffset = -(row * (100 / rows));

                // Calculate distance from center for delay
                const centerRow = Math.floor(rows / 2);
                const centerCol = Math.floor(columns / 2);
                const rowDistance = Math.abs(row - centerRow);
                const colDistance = Math.abs(col - centerCol);
                
                // Calculate radial distance
                const distanceFromCenter = Math.sqrt(Math.pow(rowDistance, 2) + Math.pow(colDistance, 2));
                const maxDistance = Math.sqrt(Math.pow(centerRow, 2) + Math.pow(centerCol, 2));
                
                // Create a delay factor between 0 and 0.5
                const delayFactor = (distanceFromCenter / maxDistance) * 0.5;

                tiles.push({
                    id: `team-tile-${index}-${tileIndex}`,
                    row,
                    col,
                    xOffset,
                    yOffset,
                    delayFactor
                });
            }
        }
        return tiles;
    }, [gridParams, index]);

    // Animation controls
    useEffect(() => {
        if (isClicked || isHovered) {
            controls.start("visible");
        } else {
            controls.start("hidden");
        }
    }, [isHovered, isClicked, controls]);

    const handleClick = () => {
        if (isTouchDevice) {
            setIsClicked(!isClicked);
        }
    };

    const handleHoverEnter = () => {
        if (!isTouchDevice) {
            setIsHovered(true);
        }
    };

    const handleHoverLeave = () => {
        if (!isTouchDevice) {
            setIsHovered(false);
        }
    };
    
    return (
        <motion.div 
            className="AboutTeam__Collage__pic__pixelated__image"
            onClick={handleClick}
            onHoverStart={handleHoverEnter}
            onHoverEnd={handleHoverLeave}
        >
            {/* Original image (background) */}
            <div className="AboutTeam__Collage__pic__background">
                <Image 
                    src={src2} 
                    alt={alt2}
                    fill={true}
                    sizes="50vw"
                    quality={100}
                    priority={false}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/webp"
                />
            </div>
            
            {/* Pixelated overlay */}
            <div className="AboutTeam__Collage__pic__pixelated">
                <motion.div 
                    className="pixelated__grid__container"
                    initial="hidden"
                    animate={controls}
                    style={{ 
                        gridTemplateColumns: `repeat(${gridParams.columns}, ${gridParams.tileSize})`,
                        gridTemplateRows: `repeat(${gridParams.rows}, ${gridParams.tileSize})`,
                    }}
                >
                    {gridTiles.map((tile) => (
                        <motion.div
                            key={tile.id}
                            className="pixelated__grid__tile"
                            initial={{ opacity: 1, filter: "blur(0px)" }}
                            animate={isRevealed 
                                ? { opacity: 0, filter: "blur(10px)", transition: { duration: 0.5, delay: tile.delayFactor, ease: "easeIn" } }
                                : { opacity: 1, filter: "blur(0px)", transition: { duration: 0.5, delay: tile.delayFactor, ease: "easeOut" } }
                            }
                            style={{
                                willChange: 'opacity',
                                transform: 'translateZ(0)',
                                backfaceVisibility: 'hidden',
                                overflow: 'hidden',
                            }}
                        >
                            <div 
                                className="pixelated__image__wrapper"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'relative'
                                }}
                            >
                                <div 
                                    className="pixelated__image__container"
                                    style={{
                                        width: `${gridParams.columns * 100}%`,
                                        height: `${gridParams.rows * 100}%`,
                                        position: 'absolute',
                                        translate: `${tile.xOffset}% ${tile.yOffset}%`,
                                        top: 0,
                                        left: 0,
                                    }}
                                >
                                    <Image
                                        src={src}
                                        alt={`${alt} tile`}
                                        fill={true}
                                        sizes="100vw"
                                        quality={100}
                                        priority={true}
                                        placeholder="blur"
                                        blurDataURL="data:image/webp"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </motion.div>
    );
};