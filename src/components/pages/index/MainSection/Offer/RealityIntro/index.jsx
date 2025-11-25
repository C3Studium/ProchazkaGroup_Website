import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { dataR } from "@/constants/mainpage";
import Image from "next/image";
import Grid from "@/components/common/grid";

export default function RealityIntro({ ref, rows = 5, columns = 12, tileSize = "20vh" }) {
    const section = ref;
    const [isMounted, setIsMounted] = useState(false);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    
    useEffect(() => {
        setIsMounted(true);
        return() => setIsMounted(false);
    },[]);

    // Get scroll progress
    const { scrollYProgress } = useScroll(isMounted ? {
        target: section,
        offset: ['start end', 'end start']
    } : { target: undefined});
    
    // Images to use
    const imageValues = [
        "/assets/backgrounds/family.webp",
        "/assets/backgrounds/behindLaptop2.webp",
        "/assets/backgrounds/callBGShelf.webp"
    ];
    
    // Define transition points for animation stages
    const transitionPoints = {
        firstImageEnter: [0, 0.1],         
        firstToSecond: [0.25, 0.35],         
        secondImageStable: [0.45, 0.5],    
        secondToThird: [0.5, 0.6],         
        thirdImageStable: [0.6, 0.85],      
        thirdImageExit: [0.85, 1]           
    };
    
    // Subscribe to scroll updates for section changes
    useEffect(() => {
        const handleScroll = (value) => {
            // Determine active section based on scroll position
            if (value >= transitionPoints.secondToThird[0]) {
                setActiveSectionIndex(2); // Third image
            } else if (value >= transitionPoints.firstToSecond[1]) {
                setActiveSectionIndex(1); // Second image
            } else {
                setActiveSectionIndex(0); // First image
            }
        };
        
        if (scrollYProgress) {
            const unsubscribeScroll = scrollYProgress.on("change", handleScroll);
            return () => unsubscribeScroll();
        }
    }, [scrollYProgress]);

    const gridImages = useMemo(() => {
        return imageValues.map((src, imageIndex) => {
            const tiles = [];

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns; col++) {
                    // calculate the dimension and position
                    const tileIndex = row * columns + col;

                    const xOffset = -(col * (100 / columns));
                    const yOffset = -(row * (100 / rows));
                    
                    // Random threshold for grid transitions
                    const threshold = Math.random() * 0.2;
                    
                    // Column-based delay for vertical animations
                    // This creates a wave effect from left to right
                    const delay = 0.01 * col;

                    tiles.push({
                        id: `${imageIndex}-${tileIndex}`,
                        row,
                        col,
                        threshold,
                        delay,
                        src,
                        xOffset,
                        yOffset
                    });
                }
            }
            return { src, tiles };
        });
    }, [rows, columns, imageValues]);

    return (
        <section className="RealityIntro">  
        <Grid size="20vh"/>          
            {/* Display active text content based on current section */}
            <div className="Text">
                <div className="Text__container">
                    {dataR.map((data, i) => {
                        // Text animation transforms
                        const textY = useTransform(
                            scrollYProgress,
                            [
                                // Entry point - match with image transitions
                                i === 0 ? transitionPoints.firstImageEnter[0] : 
                                i === 1 ? transitionPoints.firstToSecond[0] : 
                                transitionPoints.secondToThird[0],
                                
                                // Stable point
                                i === 0 ? transitionPoints.firstToSecond[0] - 0.1 : 
                                i === 1 ? transitionPoints.secondToThird[0] - 0.1 : 
                                transitionPoints.thirdImageExit[0] - 0.1,
                                
                                // Exit point
                                i === 0 ? transitionPoints.firstToSecond[1] : 
                                i === 1 ? transitionPoints.secondToThird[1] : 
                                transitionPoints.thirdImageExit[1]
                            ],
                            ['100%', '0%', '-100%']
                        );
                        
                        // Text opacity transform
                        const textOpacity = useTransform(
                            scrollYProgress,
                            [
                                // Fade in
                                i === 0 ? transitionPoints.firstImageEnter[0] : 
                                i === 1 ? transitionPoints.firstToSecond[0] : 
                                transitionPoints.secondToThird[0],
                                
                                // Fully visible
                                i === 0 ? transitionPoints.firstImageEnter[1] + 0.05 : 
                                i === 1 ? transitionPoints.firstToSecond[0] + 0.1 : 
                                transitionPoints.secondToThird[0] + 0.1,
                                
                                // Start fading out
                                i === 0 ? transitionPoints.firstToSecond[0] - 0.1 : 
                                i === 1 ? transitionPoints.secondToThird[0] - 0.1 : 
                                transitionPoints.thirdImageExit[0] - 0.1,
                                
                                // Fully faded out
                                i === 0 ? transitionPoints.firstToSecond[1] : 
                                i === 1 ? transitionPoints.secondToThird[1] : 
                                transitionPoints.thirdImageExit[1]
                            ],
                            [0, 1, 1, 0]
                        );
                        
                        // Add spring physics for smoother animations
                        const springY = useSpring(textY, { stiffness: 90, damping: 20 });
                        const springOpacity = useSpring(textOpacity, { stiffness: 100, damping: 20 });
                        
                        return (
                            <motion.div 
                                className="Text__wrapper" 
                                key={i}
                                style={{ 
                                    y: springY,
                                    opacity: springOpacity,
                                    position: 'absolute',
                                    width: '100%',
                                }}
                            >
                                <div className="Text__header">
                                    <h3 style={{ lineHeight: 1 }}>{data.rate}</h3>
                                    <h4 style={{ 
                                        lineHeight: 1, 
                                        alignSelf: 'flex-end', 
                                        marginBottom: '1.5rem' 
                                    }}>{data.rateText}</h4>
                                </div>
                                <div className="Text__content">
                                    <p>{data.text}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
            
            <div className="RealityIntro__images">
                {gridImages.map((imageData, imageIndex) => (
                    <AnimatedGrid
                        key={`grid-image-${imageIndex}`}
                        imageData={imageData}
                        imageIndex={imageIndex}
                        activeSectionIndex={activeSectionIndex}
                        rows={rows}
                        columns={columns}
                        tileSize={tileSize}
                        scrollYProgress={scrollYProgress}
                        transitionPoints={transitionPoints}
                    />
                ))}
            </div>
        </section>
    );
}

// Separate component for the animated grid to improve code readability
const AnimatedGrid = ({ 
    imageData, 
    imageIndex, 
    activeSectionIndex,
    rows, 
    columns, 
    tileSize,
    scrollYProgress,
    transitionPoints
}) => {
    // Group tiles by column for column-based animations
    const columnTiles = useMemo(() => {
        const grouped = Array.from({ length: columns }, () => []);
        
        imageData.tiles.forEach(tile => {
            grouped[tile.col].push(tile);
        });
        
        return grouped;
    }, [imageData.tiles, columns]);

    return (
        <div 
            className={`RealityIntro__grid-container ${imageIndex === activeSectionIndex ? 'active' : ''}`}
            style={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, ${tileSize})`,
                gridTemplateRows: `repeat(${rows}, ${tileSize})`,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
            }}
        >
            {columnTiles.map((tilesInColumn, colIndex) => (
                <div 
                    key={`column-${colIndex}`}
                    className="RealityIntro__grid-column"
                    style={{
                        display: 'grid',
                        gridTemplateRows: `repeat(${rows}, ${tileSize})`,
                    }}
                >
                    {tilesInColumn.map(tile => (
                        <AnimatedTile 
                            key={tile.id}
                            tile={tile}
                            imageIndex={imageIndex}
                            columns={columns}
                            rows={rows}
                            scrollYProgress={scrollYProgress}
                            transitionPoints={transitionPoints}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

const AnimatedTile = ({ 
    tile, 
    imageIndex, 
    columns, 
    rows, 
    scrollYProgress,
    transitionPoints 
}) => {
    // First image enters from bottom with column delay
    const firstImageY = useTransform(
        scrollYProgress,
        [0, 0.1 - (tile.delay)], 
        ['1500vh', '0vh']
    );

    // Third image exits to top with column delay
    const thirdImageY = useTransform(
        scrollYProgress,
        [transitionPoints.thirdImageStable[1], transitionPoints.thirdImageExit[1] - (tile.delay)], 
        ['0vh', '-1000vh']
    );

    // Opacity transitions for grid-based transitions (like in GridTransition)
    const firstToSecondOpacity = useTransform(
        scrollYProgress,
        [
            transitionPoints.firstToSecond[0] + tile.threshold,
            transitionPoints.firstToSecond[0] + tile.threshold + 0.05
        ],
        [1, 0]
    );

    const secondToThirdOpacity = useTransform(
        scrollYProgress,
        [
            transitionPoints.secondToThird[0] + tile.threshold,
            transitionPoints.secondToThird[0] + tile.threshold + 0.05
        ],
        [1, 0]
    );

    // Combine all transformations based on which image this is
    const y = useTransform(
        scrollYProgress,
        (value) => {
            if (imageIndex === 0) {
                return firstImageY.get();
            } else if (imageIndex === 2 && value >= transitionPoints.secondToThird[0]) {
                return thirdImageY.get();
            }
            return '0vh';
        }
    );

    // Combine opacity based on transitions and which image it is
    const opacity = useTransform(
        scrollYProgress,
        (value) => {
            // First image: full opacity until transition, then fade based on threshold
            if (imageIndex === 0) {
                if (value < transitionPoints.firstToSecond[0]) return 1;
                return firstToSecondOpacity.get();
            }
            // Second image: starts invisible, gets revealed during first transition,
            // stays visible, then fades during second transition
            else if (imageIndex === 1) {
                if (value < transitionPoints.firstToSecond[0]) return 0;
                if (value < transitionPoints.firstToSecond[1]) {
                    return 1 - firstToSecondOpacity.get();
                }
                if (value < transitionPoints.secondToThird[0]) return 1;
                return secondToThirdOpacity.get();
            }
            // Third image: starts invisible, gets revealed during second transition, stays visible
            else {
                if (value < transitionPoints.secondToThird[0]) return 0;
                return 1 - secondToThirdOpacity.get();
            }
        }
    );

    // Make transitions smoother with spring physics
    const springY = useSpring(y, { stiffness: 100, damping: 20 });
    const springOpacity = useSpring(opacity, { stiffness: 100, damping: 20 });

    return (
        <motion.div
            className="RealityIntro__grid-tile"
            style={{
                position: 'relative',
                overflow: 'hidden',
                y: springY,
                opacity: springOpacity,
            }}
        >
            {/* The container for the image inside this tile */}
            <div className="RealityIntro__image-wrapper">
                {/* Position the entire image within the wrapper */}
                <div 
                    className="RealityIntro__image-container"
                    style={{
                        width: `${columns * 100}%`, // Full grid width (columns × 100%)
                        height: `${rows * 100}%`,   // Full grid height (rows × 100%)
                        transform: `translate(${tile.xOffset}%, ${tile.yOffset}%)`, // Offset to show correct part
                    }}
                >
                    <Image
                        src={tile.src}
                        alt="Section image"
                        fill={true}
                        sizes="100vw"
                        quality={90}
                        className="RealityIntro__image"
                        priority={true}
                        placeholder="blur"
                        blurDataURL="data:image/webp"
                    />
                </div>
            </div>
            
            {/* Overlay for the tile */}
            <div className="RealityIntro__cover"></div>
        </motion.div>
    );
}