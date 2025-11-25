import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "framer-motion"
import { useRef, useMemo } from "react"
import { usePerformance } from "@/context/PerformanceProvider"

import picture1 from '@public/assets/zoom/6.webp'
import picture2 from '@public/assets/zoom/1.webp'
import picture3 from '@public/assets/zoom/2.webp'
import picture4 from '@public/assets/zoom/3.webp'
import picture5 from '@public/assets/backgrounds/trophies2.webp'
import picture6 from '@public/assets/zoom/4.webp'
import picture7 from '@public/assets/backgrounds/nameCards.webp'
import picture8 from '@public/assets/zoom/7.webp'
import picture9 from '@public/assets/backgrounds/logoBannerBG.webp'

import Image from "next/image"
import Grid from "@/components/common/grid"
import Collage from "../eventCollage/collage"
import AboutTeam from "../aboutTeam"
import SubText from "@/components/anim/SubText"

export default function ParallaxExpanf() {
    // Performance
    const { shouldReduceAnimations } = usePerformance();
    
    const container = useRef(null)

    const { scrollYProgress } = useScroll({
        target: container,
        offset: [ 'start start', 'end end']
    })

    const smoothScrollY = useSpring(scrollYProgress, {
        stiffness: 50,
        damping: 30,
        restDelta: 0.1
    });

    const sectionOpacity = useTransform(
        smoothScrollY,
        [0, 0.3, 0.95, 0.98],
        [1, 1, 1, 0]
    );

    // Create both blurs and use them conditionally in the render
    const containerBlurTransform = useTransform(
        smoothScrollY,
        [0.295, 0.3, 0.4, 0.9, 0.95],
        [0, 15, 15, 15, 0]
    );

    const scale4 = useTransform(scrollYProgress, [ 0, 0.3], [ 1, 4])
    const scale5 = useTransform(scrollYProgress, [ 0, 0.3], [ 1, 5])
    const scale6 = useTransform(scrollYProgress, [ 0, 0.3], [ 1, 6])
    const scale8 = useTransform(scrollYProgress, [ 0, 0.3], [ 1, 8])
    const scale9 = useTransform(scrollYProgress, [ 0, 0.3], [ 1, 9])

    // For text animation
    const x = useTransform(
        scrollYProgress,
        [0, 0.3], 
        shouldReduceAnimations ? [3000, -6000] : [3000, -6000]
    );

    // Grid settings for pixelated effect - only for the first image
    const rows = 7;
    const columns = 11;

    
    // Generate grid tiles for the pixelated image
    const gridTiles = useMemo(() => {
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
                
                // Use distance from center for delay calculation
                // This creates a radial wave effect from the center
                const distanceFromCenter = Math.sqrt(Math.pow(rowDistance, 2) + Math.pow(colDistance, 2));
                const maxDistance = Math.sqrt(Math.pow(centerRow, 2) + Math.pow(centerCol, 2));
                
                // Create a delay factor between 0 and 0.2
                const delayFactor = (distanceFromCenter / maxDistance) * 0.05;
                
                tiles.push({
                    id: `tile-${tileIndex}`,
                    row,
                    col,
                    xOffset,
                    yOffset,
                    delayFactor
                });
            }
        }
        return tiles;
    }, [rows, columns]);

    const pictures = [
        {
            src: picture1,
            scale: scale4,
        },
        {
            src: picture2,
            scale: scale5,
        },
        {
            src: picture3,
            scale: scale6,
        },
        {
            src: picture4,
            scale: scale5,
        },
        {
            src: picture5,
            scale: scale4,
        },
        {
            src: picture6,
            scale: scale6,
        },
        {
            src: picture7,
            scale: scale8,
        },
        {
            src: picture8,
            scale: scale9,
        },
        {
            src: picture9,
            scale: scale5,
            isPixelated: true,
        }
    ]

    return (
        <motion.section className="ParallaxExpand">
            <div className="ParallaxExpand__whiteSpace">
                <Grid size="20vh" key={"ParallaxExpand__whiteSpace"}/>
            </div>
            <motion.div className="ParallaxExpand__sticky__container" ref={container}  style={{ opacity: sectionOpacity}} >
                <div className="ParallaxExpand__sticky">
                    <Grid size="20vh" key={"ParallaxExpand__sticky"}/>
                    {
                        pictures.map((pic, index) => {
                            const { src, scale, isPixelated } = pic
                            
                            if (isPixelated) {

                                // Pixelated grid for the last image
                                return (
                                    <motion.div 
                                    key={index} 
                                        style={{ 
                                            scale,
                                            filter: useTransform(containerBlurTransform, blur => `blur(${blur}px`)
                                        }} 
                                        className="image__wrapper"
                                    >
                                        <div 
                                            className="pixelated__grid__container"
                                            style={{ 
                                                display: 'grid',
                                                gridTemplateColumns: `repeat(${columns}, 2fr)`,
                                                gridTemplateRows: `repeat(${rows}, 2fr)`,
                                                zIndex: index,
                                                willChange: 'transform',
                                                rowGap: '0px',
                                                columnGap: '0px',
                                            }}
                                        >
                                            <Grid size="20vh" key={"pixelated__grid__container_"}/>
                                            {gridTiles.map((tile) => {
                                                // Create a custom blur transform for each tile with its own delay
                                                const tileBlur = useTransform(
                                                    smoothScrollY,
                                                    [0.24, 0.24 + tile.delayFactor, 0.294, 0.3, 0.92 + tile.delayFactor, 1],
                                                    [0, 0, 15, 0, 0, 20]
                                                );
                                                const tileOpacity = useTransform(
                                                    smoothScrollY,
                                                    [0.24, 0.24 + tile.delayFactor, 0.294, 0.3, 0.92 + tile.delayFactor, 1],
                                                    [1, 1, 0.7, 1, 1, 0]
                                                );

                                                // Stop animation when reaching near max
                                                const isNearMax = useMotionValueEvent(smoothScrollY, "change", (latest) => {
                                                    if (latest > 0.95) return true;
                                                    return false;
                                                });
                                                
                                                return (
                                                    <motion.div
                                                        key={tile.id}
                                                        className="pixelated__grid__tile"
                                                        style={{
                                                            filter: isNearMax ? `blur(${25 * centerIntensity}px)` : useTransform(tileBlur, blur => `blur(${blur}px)`),
                                                            opacity: useTransform(tileOpacity, opacity => `${opacity}`),
                                                            willChange: 'filter',
                                                            transform: 'translateZ(0)',
                                                        }}
                                                    >
                                                        <div 
                                                            className="pixelated__image__wrapper"
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                            }}
                                                        >
                                                            <div 
                                                                className="pixelated__image__container"
                                                                style={{
                                                                    width: `${columns * 100}%`,
                                                                    height: `${rows * 100}%`,
                                                                    transform: `translate(${tile.xOffset}%, ${tile.yOffset}%)`,
                                                                    position: 'relative',
                                                                }}
                                                            >
                                                                <Image
                                                                    src={src}
                                                                    alt="pixelated background"
                                                                    fill={true}
                                                                    sizes="100vw"
                                                                    quality={100}
                                                                    priority={tile.row < 2 && tile.col < 3}
                                                                    placeholder="blur"
                                                                    blurDataURL="data:image/webp"
                                                                />
                                                                <div
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: 0,
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                                                                        filter: `blur(${tileBlur}px)`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )
                            } else {
                                // Regular images for all others
                                return (
                                    <motion.div key={index} style={{ scale }} className="image__wrapper">
                                        <div className="image__container">
                                            <Image 
                                                src={src} 
                                                alt="image" 
                                                fill={true} 
                                                sizes="50vw"
                                                quality={100}
                                                priority={false}
                                                placeholder="blur" 
                                                blurDataURL="data:image/webp"
                                                style={{ zIndex: `${index}`}}
                                            />
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                                    zIndex: `${index + 1}`,
                                                }}
                                            />
                                        </div>
                                    </motion.div>
                                )
                            }
                        })
                    }
                    
                    {/* Integrated IntroCollage */}
                    <div className="IntroCollage">
                        <div className="sticky">                        
                            <div className="text__wrapper">
                                <motion.div className="text__container">
                                    <motion.p 
                                        className="filled-text"
                                        style={{
                                            x,
                                            willChange: 'transform',
                                            transform: 'translateZ(0)',
                                        }}
                                    >
                                        JSME TU PRO VÁS | UŽ PŘES JEDNU DEKÁDU
                                    </motion.p>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
                <Collage />
                <div 
                    className="ParallaxExpand__section__text"
                    style={
                        {
                            opacity: sectionOpacity,
                        }
                    }
                >
                    <SubText text={"TOHLE JE NÁŠ TÝM | SPOLEČNĚ TVOŘÍME BUDOUCNOST"} initialColor={'#fff'} />
                </div>
            </motion.div>
            <AboutTeam />
        </motion.section>
    )
}


