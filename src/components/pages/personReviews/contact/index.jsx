//NOTE:FeedBack and contact are switched

import Magnetic from "@/components/anim/Magnetic";
import Grid from "@/components/common/grid";
import ContactForm from "@/components/forms/contact";
import { TestPeople } from "@/constants/people";
import { useScroll } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGlobalContext } from "@/context/LoadProvider";
import { useInView, useSpring, useTransform, motion } from "framer-motion";

export default function ContactIntro({name, number, moto, databaseName, icons, srcbg, srcp}) {
    const { firstLoad } = useGlobalContext();
    const sectionRef = useRef(null);
    
    const { scrollYProgress: parallaxScrollYProgress } = useScroll({
        target: sectionRef,
        offset: [ 'start start', 'end end']
    });
    
    const smoothYScroll = useSpring(parallaxScrollYProgress, {
        stiffness: 100,
        damping: 20,
        restDelta: 0.001
    });
    
    // Add parallax effect
    const yPos = useTransform(smoothYScroll, [0, 1], ["0%", "10%"]);
    const scale = useTransform(smoothYScroll, [0, 1], [1.05, 1]);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: [ 'start start', 'end end']
    })


    // Animation variants for the main wrapper
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
                ease: [0.76, 0, 0.24, 1],
            }
        }
    };
    const introAnim2 = {
        initial: {
            scale: 1.5,
        },
        enter: {
            scale: 1,
            transition: {
                delay: firstLoad ? 4.5 : 0.5,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    };
    
    // Animation for elements that slide from bottom
    const slideUpAnim = {
        initial: {
            y: '200%',
            opacity: 0
        },
        enter: {
            y: '0%',
            opacity: 1,
            transition: {
                delay: firstLoad ? 4 : 0.9,
                duration: 1,
                ease: [0.76, 0, 0.24, 1],
            }
        }
    };

    
    const points = TestPeople.length
    return (
        <section className="ContactIntro" ref={sectionRef}>
            <div className="headerPage">
                <Magnetic sensitivity={0.05}>
                    <Link href="/">
                        <h2>ProchazkaGroup</h2>
                    </Link>
                </Magnetic>
            </div>
            <div className="grid__container">
                <Grid size="20vh"/>
            </div>
            <motion.div 
                className="background__img"
                initial="initial"
                animate="enter"
                variants={introAnim2}
            >
                <motion.div
                    className="background__img__container"
                    style={{
                        y: yPos,
                        scale: scale,
                    }}
                >
                    <Image 
                        src={srcbg} 
                        alt='background_image' 
                        fill={true}
                        style={{ objectFit: 'cover'}}
                        sizes="100vw"
                        quality={100}
                        priority={true}
                        placeholder="blur"
                        blurDataURL="data:image/webp"
                    />
                </motion.div>
            </motion.div>
            <div className="cover"/>
            <motion.div 
                className="ContactIntro__wrapper"
                initial="initial"
                animate="enter"
                variants={introAnim}
                style={{
                    transformOrigin: "center center",
                    willChange: "transform, opacity, scale"
                }}
            >
                {/* Main Info Section */}
                <div className="ContactIntro__MainInfo">
                    <motion.div 
                        className="ContactIntro__MainInfo__header"
                        variants={slideUpAnim}
                    >
                        <div className="ContactIntro__MainInfo__header__container">
                            <h2>{name}</h2>
                        </div>
                    </motion.div>
                    <motion.div 
                        className="ContactIntro__MainInfo__text__container"
                        variants={slideUpAnim}
                    >
                        <div className="ContactIntro__MainInfo__text">
                            <div className="ContactIntro__MainInfo__text__container__text">
                                <p>{number}</p>
                                <p>{moto}</p>
                            </div>
                        </div>
                    </motion.div>
                    <div className="ContactIntro__MainInfo__icons__container">
                        <div className="ContactIntro__MainInfo__icons">
                            {icons.map((icon, i) => {
                                const IconComponent = icon.src;
                                return (
                                    <Magnetic key={`magnetic-${icon.name}`} sensitivity={0.1}>
                                        <Link href={icon.href}>
                                            <IconComponent 
                                                size={40}
                                                aria-label={icon.name}
                                                className="social__icon"
                                            />
                                        </Link>
                                    </Magnetic>
                                );
                            })}
                        </div>
                    </div>
                </div>
    
    
                {/* Collage Section with Snapping Transform */}
                <div className="ContactIntro__Collage"> 
                    <div className="ContactIntro__Collage__pics">
                        <div className="ContactIntro__Collage__pic">
                            <Image 
                                src={srcp}
                                alt="profile_pic1" 
                                fill={true}
                                quality={100}
                                priority={true}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                placeholder="blur"
                                blurDataURL="data:image/webp"
                                className="object-cover w-full h-full"
                            />
                        </div>
                    </div>
                    <div className="ContactIntro__Collage__progress">
                        <div>
                            {Array.from({ length: points }).map((_, i) => (
                                <div key={`circle-${i}`} className="progress__circle">
                                    <div></div>
                                </div>
                            ))}
                        </div>
                        <div>
                            {Array.from({ length: points }).map((_, i) => (
                                <div key={`segment-outline-${i}`} className="progress__segment">
                                    <div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
            <ContactForm scroll={scrollYProgress} name={databaseName}/>
        </section>
    )
}
