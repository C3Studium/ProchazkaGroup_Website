import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useSpring, useTransform } from 'framer-motion';
import { PrivacySections } from "@/constants/cookiesTerms";
import Magnetic from "@/components/anim/Magnetic";
import Link from "next/link";
import { useGlobalContext } from "@/context/LoadProvider";
import PixelateText from "../../index/main/neonText";
import Grid from "@/components/common/grid";

export default function TermsContent() {
    const sectionRef = useRef(null);
    const { firstLoad } = useGlobalContext(); // Access firstLoad state
    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });
    const [activeSection, setActiveSection] = useState(null);
    const sectionRefs = useRef([]);
    

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end start'],
    });

    const smoothYProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    const headerY = useTransform(
        smoothYProgress,
        [0, 0.15, 0.75, 1],
        [0, 0, -50, -80]
    );
    const textY = useTransform(
        smoothYProgress,
        [0, 0.5, 1],
        [0, 0, -50]
    );
    // Animation for cover container
    const coverAnim = {
        initial: {
            y: '-30%',
            opacity: 0
        },
        enter: {
            y: '0%',
            opacity: 1,
            transition: {
                delay: firstLoad ? 4.25 : 0.25,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    };

    const handleLinkClick = (id) => {
        const section = document.getElementById(id);
        section.scrollIntoView({ behavior: 'smooth' });
    };

        useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;
    
            for (let i = 0; i < sectionRefs.current.length; i++) {
                const section = sectionRefs.current[i];
                if (section) {
                    const rect = section.getBoundingClientRect();
                    const sectionTop = rect.top + window.scrollY;
                    const sectionBottom = sectionTop + rect.height;
    
                    if (sectionTop <= scrollPosition && sectionBottom > scrollPosition) {
                        // Use PrivacySections instead of CookiesSections
                        setActiveSection(PrivacySections[i].id);
                        break;
                    }
                }
            }
        };
    
        window.addEventListener('scroll', handleScroll);
        // Call once on initial load to set the initial active section
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section className="TermsContent">
            <Grid size="20vh" key={"TermsContent"}/>
            <div className="header">
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link>
                </Magnetic>
            </div>
            <div className="devider"></div>
            <motion.div 
                className="cover"
                initial="initial"
                animate="enter"
                ref={sectionRef}
                variants={coverAnim}
                style={{
                    transformOrigin: "center top",
                    willChange: "transform, opacity"
                }}
            >
                <Grid size="20vh" key={"Cover__TermsContent"}/>
                <div className="cover__header" ref={headingRef}>
                    <motion.p style={{ y: headerY }}>
                        <span>
                            <PixelateText 
                                text="VŠE O OCHRANĚ," 
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </span>

                        <span className="highlighted">
                            <PixelateText 
                                text="POUŽITÍ VAŠICH ÚDAJŮ" 
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </span>
                        <span>
                            <PixelateText 
                                text="A INFORMACÍ." 
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </span>
                    </motion.p>
                </div>
                <motion.div className="cover__desc" style={{ y: textY }}>
                    <h3>
                        Σ
                    </h3>
                    <p>
                        <PixelateText
                            text="Detaily a všechny podrobné informace" 
                            isInView={isInView}
                            firstLoad={firstLoad}
                        />
                    </p>
                </motion.div>
            </motion.div>

            <div className="info__content">
                <nav className="info__page__navbar">
                    <div className="info__page__stickyBar">
                        <h3>Obsah</h3>
                        <ul className="info__page__ul">
                            {PrivacySections.map((section, i) => (
                                <li className="info__page__li" key={i}>
                                    <motion.div
                                        className="info__page__dot"
                                        animate={{ backgroundColor: activeSection === section.id ? '#4bdadc' : '#22272d' }}
                                        transition={{ duration: 0.3 }}
                                    />
                                    {/* In your render method */}
                                    <motion.a
                                        href={`#${section.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleLinkClick(section.id);
                                        }}
                                        animate={{ 
                                            opacity: activeSection === section.id ? 1 : 0.6,
                                            fontWeight: activeSection === section.id ? "500" : "300",
                                            color: activeSection === section.id ? "#4bdadc" : "#050A10"
                                        }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {section.title}
                                    </motion.a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                <section className="info__block__main">
                    {PrivacySections.map((section, i) => (
                        <div key={i} className="info__block__section" ref={el => sectionRefs.current[i] = el}>
                            <h2 id={section.id}>{section.title}</h2>
                            <p>{section.content}</p>
                        </div>
                    ))}
                </section>
            </div>
        </section>
    );
}