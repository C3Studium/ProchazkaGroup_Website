import Image from "next/image";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { stats } from "@/constants/pages/reviews";
import { useFetchDatabase } from "@/hooks/useFetchDatabase";
import { useEffect, useRef, useState } from "react";
import Grid from "@/components/common/grid";
import { useGlobalContext } from "@/context/LoadProvider";
import PixelateText from "../../index/main/neonText";
import ONViewLogo from "@/components/anim/onViewLogo";
import Magnetic from "@/components/anim/Magnetic";
import Link from "next/link";

export default function ReviewsIntro () {
    const [localStats, setLocalStats] = useState(stats);
    const [clipPathId] = useState(`clip-path-${Math.random().toString(36).substr(2, 9)}`);
    const {fetchTotal} = useFetchDatabase();
    const { firstLoad } = useGlobalContext();
    const headingRef = useRef(null);
    const isInView = useInView(headingRef, { once: true });
    const wrapperRef = useRef(null);
    const parallaxRef = useRef(null);
    const rectContainerRef = useRef(null);

    // Main parallax effect
    const { scrollYProgress: parallaxMainScroll } = useScroll({
        target: parallaxRef,
        offset: ["start start", "end start"]  
    });

    const smoothYScroll = useSpring(parallaxMainScroll, {
        stiffness: 100,
        damping: 20,
        restDelta: 0.001
    });
    
    // Transform values for background parallax effect
    const yPos = useTransform(smoothYScroll, [0, 1], ["0%", "10%"]);
    const scale = useTransform(smoothYScroll, [0, 1], [1.05, 1]);
    
    // Parallax for heading (more noticeable)
    const headingY = useTransform(smoothYScroll, [0, 1], ["-40%", "5%"]);
    
    // Subtle parallax for icons and logo container
    const rectContainerY = useTransform(smoothYScroll, [0, 1], ["0%", "5%"]);
    
    useEffect(() => {
        (async () => {
          const data = await fetchTotal();
          if (data) {
            const updated = localStats.map(item => {
              if(item.name === "clients") return {...item, number: data.totalpeople};
              if(item.name === "likes") return {...item, number: data.likes};
              if(item.name === "comments") return {...item, number: data.reviews};
              return item;
            });
            setLocalStats(updated);
          }
        })();
      }, []);

    const introAnim = {
        initial: {
            scale: 1.5,
            opacity: 0
        },
        enter: {
            scale: 1,
            opacity: 1,
            transition: {
                delay: firstLoad ? 4.5 : 0.5,
                duration: 1,
                ease: [ 0.76, 0, 0.24, 1],
            }
        }
    }
    
    const introbutton = {
        initial: {
            y: '200%'
        },
        enter: {
            y: '0%',
            transition: {
                delay: firstLoad ? 4 : 0.9,
                duration: 1,
                ease: [ 0.76, 0, 0.24, 1],
            }
        }
    }
    
    return (
        <section className="ReviewsIntro" ref={parallaxRef}>
            <div className="header">
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link>
                </Magnetic>
            </div>
            <motion.div 
                className="ReviewsIntro__Wrapper"
                ref={wrapperRef}
                initial="initial"
                animate="enter"
                variants={introAnim}
                style={{
                    transformOrigin: "center center",
                    willChange: "transform, opacity, scale"
                }}
            >
                <motion.div 
                    className="Heading"
                    ref={headingRef}
                    style={{
                        y: headingY,
                        willChange: "transform"
                    }}
                >
                    <h1>
                        <PixelateText 
                            text="PROHLÉDNĚ TĚ SI, CO O NÁS ŘÍKAJÍ NAŠI KLIENTI." 
                            isInView={isInView}
                            firstLoad={firstLoad} 
                        />
                        <span className="highlighted">
                            <PixelateText 
                                text="SPOKOJENOST KLIENTA JE NAŠI PŘEDNOSTÍ." 
                                isInView={isInView}
                                firstLoad={firstLoad}
                            />
                        </span>
                    </h1>
                </motion.div>
                
                <motion.div className="background__container">
                    <Grid color="rgba(94, 117, 141, 0.3)" size="20vh"/>
                    <svg 
                        className="clip-svg"
                        width="100%" 
                        height="100%" 
                        viewBox="0 0 1921 1081" 
                        preserveAspectRatio="xMidYMid slice"
                    >
                        <defs>
                            <clipPath id="reviews-background-clip">
                                <path d="M0.945312 50.2969C0.945312 22.6826 23.3311 0.296875 50.9453 0.296875H1870.95C1898.56 0.296875 1920.95 22.6826 1920.95 50.2969V920.824C1920.95 948.438 1898.56 970.824 1870.95 970.824H1404.95C1377.34 970.824 1354.95 993.21 1354.95 1020.82V1030.3C1354.95 1057.91 1332.57 1080.3 1304.95 1080.3H593.986C566.372 1080.3 543.986 1057.91 543.986 1030.3V1020.82C543.986 993.21 521.6 970.824 493.986 970.824H50.9453C23.3311 970.824 0.945312 948.438 0.945312 920.824V50.2969Z" />
                            </clipPath>
                        </defs>
                        
                        {/* Background overlay with clip path */}
                        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" clipPath="url(#reviews-background-clip)" />
                        
                        {/* Image inside foreignObject */}
                        <foreignObject x="0" y="0" width="100%" height="100%" clipPath="url(#reviews-background-clip)">
                            <motion.div 
                                className="image-container" 
                                xmlns="http://www.w3.org/1999/xhtml"
                                style={{
                                    position: "absolute",
                                    top: "0",
                                    left: "0",
                                    width: "100%",
                                    height: "100%",
                                    overflow: "hidden",
                                    clipPath: `url(#${clipPathId})`,
                                    scale,
                                    y: yPos,
                                    willChange: "transform, scale"
                                }}
                            >
                                <div className="cover"/>

                                <Image 
                                    src='/assets/backgrounds/trophies2.webp' 
                                    alt="background" 
                                    fill={true}
                                    sizes="100vw"
                                    quality={100}
                                    priority={true}
                                    placeholder="blur"
                                    blurDataURL="data:image/webp"
                                    style={{
                                        objectFit: "cover",
                                        objectPosition: "center",
                                    }}
                                />
                            </motion.div>
                            <div 
                                style={{
                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: '0',
                                    left: '0',
                                }}
                            />
                        </foreignObject>
                    </svg>
                </motion.div>
                <motion.div 
                    className="rect__container"
                    ref={rectContainerRef}
                    style={{
                        y: rectContainerY,
                        willChange: "transform"
                    }}
                >
                    <div className="logo__container">
                        <ONViewLogo />
                    </div>

                    <motion.div 
                        className="stats__container"
                        initial='initial'
                        animate='enter'
                        variants={introbutton}
                    >
                        {localStats.map(( stat, i) => {
                            const { name, number, src, alt } = stat
                            return(
                                <div className="stat" key={i}>
                                    <p>{number}</p>
                                    <Image 
                                        src={src} 
                                        alt={alt} 
                                        width={40} 
                                        height={40}
                                        quality={60}
                                        loading='lazy'
                                        placeholder='blur'
                                        blurDataURL='data:image/svg'
                                        priority={false}
                                    />
                                </div>
                            )
                        })}
                    </motion.div>
                </motion.div>
            </motion.div>
        </section>
    )
}