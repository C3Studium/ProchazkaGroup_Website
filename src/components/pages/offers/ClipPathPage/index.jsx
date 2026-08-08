import MainText from "@/components/anim/MainText";
import SubText from "@/components/anim/SubText";
import Grid from "@/components/common/grid";
import RoundButton from "@/components/common/ui/stickyButtons/buttons/RoundButton";
import CustomImage from "@/components/common/ui/stickyImage";
import { projects } from "@/constants/nabidkypage";
import { usePerformance } from "@/context/PerformanceProvider";
import { useGlobalContext } from "@/context/LoadProvider"; // Added import
import { useScroll, useTransform, motion, useInView, useSpring } from "framer-motion"; // Added useInView
import { useRef } from "react";
import PixelateText from "../../index/main/neonText";
import Magnetic from "@/components/common/Magnetic";
import Link from "next/link";
import { trackEvent } from "@/hooks/trackEvent";

export default function ClipPathPage() {
    const sectionRef = useRef(null);
    const { firstLoad } = useGlobalContext(); // Access firstLoad state
    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });


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


    return (
        <section className="ClipPathPage">
            <Grid size="20vh" key={"ClipPathPage"} />
            <div className="header">
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link>
                </Magnetic>
            </div>
            <div className="devider"></div>

            {/* Apply animation to cover */}
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
                <Grid size="20vh" key={"Cover__ClipPathPage"} />
                <div className="cover__header" ref={headingRef}>
                    <motion.p style={{ y: headerY }}>
                        <span>
                            <PixelateText
                                text="SLEVY A VÝHODNÉ NABÍDKY"
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </span>

                        <span className="highlighted">
                            <PixelateText
                                text="EXCLUSIF ET SEULEMENT"
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </span>
                        <span>
                            <PixelateText
                                text="PRO NAŠE KLIENTY."
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
                            text="Domlouváme exklusivní nabídky pro lepší podmínky"
                            isInView={isInView}
                            firstLoad={firstLoad}
                        />
                    </p>
                </motion.div>
            </motion.div>

            {projects.map((project, index) => {
                const { number, title, description, href, src, alt, text } = project;
                return (
                    <Galery
                        number={number}
                        title={title}
                        description={description}
                        href={href}
                        src={src}
                        alt={alt}
                        text={text}
                        key={index}
                    />
                )
            })}
        </section>
    )
}

// Existing Galery component remains unchanged
const Galery = ({ number, title, description, href, src, alt, text }) => {
    //Performace 
    const { shouldReduceAnimations } = usePerformance();

    const sectionRef = useRef();

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'end start'],
    });

    const x = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        [400, -100, -200]
    );

    // Handle partner link click with specific tracking
    const handlePartnerClick = () => {
        // Create specific event names for each partner
        const eventMap = {
            'Pojistné Hlášení': 'partner_pojistne_hlaseni_clicked',
            'ElevenCosmetic': 'partner_eleven_cosmetic_clicked',
            'ReKvítka': 'partner_rekvitka_clicked',
            'Project 04': 'partner_project_04_clicked'
        };

        const eventName = eventMap[title] || `partner_${title.toLowerCase().replace(/\s+/g, '_')}_clicked`;

        trackEvent(eventName, {
            partner_name: title,
            partner_number: number,
            partner_index: index,
            partner_url: href,
            button_text: "Více informací",
            timestamp: new Date().toISOString(),
            page_section: "offers_gallery"
        });
    };

    return (
        <div className="ClipPathPage__Galery" ref={sectionRef}>
            <motion.div
                className="ClipPathPage__Galery__Image"
                style={{
                    position: 'fixed',
                    top: '25%',
                    left: '5%',
                    width: '40vw',
                    height: '60vh',
                    zIndex: 1,
                    clipPath: useTransform(
                        scrollYProgress,
                        [0, 0.3, 0.7, 1],
                        [
                            'inset(100% 0 0 0)',
                            'inset(0 0 0 0)',
                            'inset(0 0 0 0)',
                            'inset(0 0 100% 0)'
                        ]
                    )
                }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 40,
                }}
            >
                <CustomImage src={src} altText={alt} />
            </motion.div>

            <div className="ClipPathPage__Galery__Content">
                <div className="ClipPathPage__Galery__Content__Header">
                    <p>
                        {number}
                    </p>
                    <p>
                        {title}
                    </p>
                </div>
                <div className="ClipPathPage__Galery__Content__devider" />
                <MainText text={description} initialColor={'#050A10'} />
                <SubText initialColor="#050A10" className={'ClipPathPage__Galery__Content__p'} text={text} />
                <div className="ClipPathPage__Galery__Content__Button">
                    <motion.div
                        style={shouldReduceAnimations ? { x: -50 } : { x }}
                        onClick={handlePartnerClick}  // Track click event
                    >
                        <RoundButton href={href} text="Více informací" />
                    </motion.div>
                    <div className="ClipPathPage__Galery__Content__Button__devider" />
                </div>
            </div>
        </div>
    );
};