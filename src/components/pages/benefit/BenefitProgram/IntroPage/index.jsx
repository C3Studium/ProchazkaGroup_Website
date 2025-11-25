import Magnetic from "@/components/anim/Magnetic";
import Grid from "@/components/common/grid";
import PixelateText from "@/components/pages/index/main/neonText";
import { useGlobalContext } from "@/context/LoadProvider";
import { useScroll, motion, useTransform, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";



export default function IntroPageBenefit() {
    const { firstLoad } = useGlobalContext();
    const sectionRef = useRef(null);
    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });
    const [windowDimensions, setWindowDimensions] = useState({
        width: 0,
        height: 0
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };
        
        // Initial dimensions
        handleResize();
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end start'],
    });

    const height = useTransform(
        scrollYProgress,
        [0,1],
        windowDimensions.width >= 1000 && windowDimensions.height > windowDimensions.width
            ? ['120vh','90vh']
            : ['140vh','100vh']
    );

    const borderRadiusValue = useTransform(
        scrollYProgress,
        [0, 0.9, 1],
        windowDimensions.width >= 1000 && windowDimensions.height > windowDimensions.width
            ? ['30%', "0%", '0%']
            : ['45%', "0%", '0%']
    );

    const introAnim = {
        initial: {
            scale: 1.5,
            opacity: 0
        },
        enter: {
            scale: 1,
            opacity: 1,
            transition: {
                delay: firstLoad  ?  4.25 : 0.25,
                duration: 1,
                ease: [ 0.76, 0, 0.24, 1],
            }
        }
    }

    return(
        <motion.section 
            className="IntroPageBenefit" 
            ref={sectionRef}
            style={{
                height,
                borderBottomLeftRadius: borderRadiusValue,
                borderBottomRightRadius: borderRadiusValue,
            }}
        > 
            <Grid size="20vh" key={"IntroPageBenefit"}/> 
            <div className="header" ref={headingRef}>
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link>
                </Magnetic>
            </div>
            <motion.div 
            
                style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    zIndex: '0',

                }}
                initial="initial"
                animate="enter" 
                variants={introAnim}
            >
                <Image 
                    src="/assets/backgrounds/trophies.webp" 
                    alt="Benefit Program Intro Page" 
                    fill={true}
                    priority={true}
                    quality={100}
                    sizes="100vw"
                    placeholder="blur"
                    blurDataURL="data:image/webp"
                    className="background-image"
                />
            </motion.div>
            <div className="cover"/>
            <div className="text">
                <h1>
                    <PixelateText 
                        text="BENEFIT" 
                        isInView={isInView}
                        firstLoad={firstLoad} 
                    />
                    <span className="highlighted">
                        <PixelateText 
                            text="PROGRAM" 
                            isInView={isInView}
                            firstLoad={firstLoad}
                        />
                    </span>
                </h1>
            </div>
        </motion.section>
    );
}