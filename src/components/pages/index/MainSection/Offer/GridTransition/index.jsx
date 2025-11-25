import { useRef, useEffect, useState } from "react";
import { useScroll, useTransform, motion, useSpring } from "framer-motion";
import { useMemo, memo } from "react";
import Grid from "@/components/common/grid";

export function RealityIntroGrid() {
    // Create a unique ref for this component instance
    const gridRef = useRef(null);
    const sectionRef = useRef(null);
    
    return (
        <section className="GridTransition" ref={sectionRef}>
            <div className="grid__container" ref={gridRef}
                style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100vw',  // Match RealityIntro
                    height: '100vh'  // Match RealityIntro
                }}
            >
                <BlackTilesGrid gridRef={gridRef} />
            </div>
            <div className="grid__container">
                <StaticBlackTilesGrid />
            </div>
            <IntroText sectionRef={sectionRef} />
        </section>
    )
}

function BlackTilesGrid({ 
    gridRef,
    rows = 5, 
    columns = 12, 
    tileSize = "20vh",
    color = "rgba(94, 117, 141, 0.05)",
    blur = "0.5px"
}) {
    // Track if component is mounted to prevent stale scroll references
    const [isMounted, setIsMounted] = useState(false);
    
    // Initialize scroll tracking only after component is mounted
    useEffect(() => {
        setIsMounted(true);
        
        // Clean up function to reset state when component unmounts
        return () => {
            setIsMounted(false);
        };
    }, []);
    
    // Modified scroll parameters to fix the animation rate
    // Only create this hook if the component is mounted and the ref exists
    const { scrollYProgress } = useScroll(isMounted ? {
        target: gridRef,
        offset: ["start 0.75", "end start"],
    } : { target: undefined });

     // Use the same column-based approach as RealityIntro
    const columnTiles = useMemo(() => {
        const grouped = Array.from({ length: columns }, () => []);
        
        // Create tiles with the same structure as RealityIntro
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const tileIndex = row * columns + col;
                
                // Use same threshold and delay pattern as RealityIntro
                const threshold = Math.random() * 0.2;
                const delay = 0.01 * col;
                
                grouped[col].push({ 
                    id: tileIndex, 
                    row,
                    col,
                    threshold,
                    delay,
                    transitionLength: 0.05
                });
            }
        }
        
        return grouped;
    }, [rows, columns]);

    return (
        <div className="grid__transition"
            style={{
                position: 'absolute',  // Match RealityIntro
                top: 0,                // Match RealityIntro
                left: 0,               // Match RealityIntro
                width: '100%',
                height: '100%'
            }}
        >
            <Grid size="20vh"/>
            <div
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
                        style={{
                            display: 'grid',
                            gridTemplateRows: `repeat(${rows}, ${tileSize})`,
                        }}
                    >
                        {tilesInColumn.map(tile => (
                            <MemoizedGridTile
                                key={tile.id}
                                tile={tile}
                                scrollYProgress={scrollYProgress}
                                color={color}
                                blur={blur}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Base GridTile component with randomized transition
const GridTile = ({ tile, scrollYProgress, color }) => {
    // Only create the transform if scrollYProgress is valid
    const rawOpacity = scrollYProgress ? useTransform(
        scrollYProgress,
        [tile.threshold, tile.threshold + tile.transitionLength + tile.delay],
        [0, 1]
    ) : { get: () => 0 };
    
    // Use a more responsive spring configuration
    const opacity = useSpring(rawOpacity, {
        stiffness: 100, // Increased for faster response
        damping: 20,    // Balanced for smooth but quick transitions
        mass: 0.2,      // Reduced for lighter, faster animations
        restSpeed: 0.01 // More sensitive rest detection
    });

    return (
        <motion.div
            style={{
                backgroundColor: 'var(--bgColor2)', 
                opacity, 
                width: "100%",
                height: "100%",
                border: `1px solid ${color}`
            }}
        />
    );
}

function StaticBlackTilesGrid({ 
    rows = 5, 
    columns = 12, 
    tileSize = "20vh",
    color = "rgba(94, 117, 141, 0.1)",
}) {
    // Track if component is mounted to prevent stale scroll references
    const [isMounted, setIsMounted] = useState(false);
    
    // Initialize scroll tracking only after component is mounted
    useEffect(() => {
        setIsMounted(true);
        
        // Clean up function to reset state when component unmounts
        return () => {
            setIsMounted(false);
        };
    }, []);

    // Memoize tile data generation
    const columnTiles = useMemo(() => {
        const grouped = Array.from({ length: columns }, () => []);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const tileIndex = row * columns + col;
                grouped[col].push({ id: tileIndex, row, col });
            }
        }
        
        return grouped;
    }, [rows, columns]);

    return (
        <div className="grid__transition"
            style={{
                position: 'absolute',  // Match RealityIntro
                top: 0,                // Match RealityIntro
                left: 0,               // Match RealityIntro
                width: '100%',
                height: '100%'
            }}
        >
            <div
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
                        style={{
                            display: 'grid',
                            gridTemplateRows: `repeat(${rows}, ${tileSize})`,
                        }}
                    >
                        {tilesInColumn.map(tile => (
                            <MemoizedStaticGridTile
                                key={tile.id}
                                color={color}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Base GridTile component with randomized transition
const StaticGridTile = ({color }) => {

    return (
        <motion.div
            style={{
                backgroundColor: 'var(--bgColor2)', 
                width: "100%",
                height: "100%",
                border: `1px solid ${color}`
            }}
        />
    );
}

// Memoized GridTile to prevent unnecessary re-renders
const MemoizedGridTile = memo(GridTile);
const MemoizedStaticGridTile = memo(StaticGridTile);


const IntroText = ({sectionRef}) => {
    const text = "Dnešní Realita";
    
    // Track if component is mounted to prevent stale scroll references
    const [isMounted, setIsMounted] = useState(false);
    
    // Initialize scroll tracking only after component is mounted
    useEffect(() => {
        setIsMounted(true);
        
        // Clean up function to reset state when component unmounts
        return () => {
            setIsMounted(false);
        };
    }, []);
    
    // Create characters array only once
    const characters = useMemo(() => {
        return text.split('').map((char, index) => ({
            char,
            index,
            delay: 0.01 + (index * 0.008), // Smaller delay increment for better synchronization
        }))
    },[text]);

    // Only create this hook if the component is mounted and the ref exists
    const { scrollYProgress } = useScroll(isMounted ? {
        target: sectionRef,
        offset: ['start 0.8', 'end start'] 
    } : { target: undefined });
    
    return (
        <div className="sticky-container">
            <motion.div className="grid__transition__sticky">
               <motion.p className="grid__transition__sticky__text__container">
                    {characters.map(({ char, index, delay }) => (
                        <AnimatedCharacter
                            key={`${char}-${index}`}
                            char={char}
                            index={index}
                            delay={delay}
                            scrollYProgress={scrollYProgress}
                        />
                    ))}
               </motion.p>
            </motion.div>
        </div>
    )
}

const AnimatedCharacter = ({ char, index, delay, scrollYProgress }) => {
    // Only create the transform if scrollYProgress is valid
    const opacity = scrollYProgress ? useTransform(
        scrollYProgress,
        [0.25 + delay, 0.4 + delay, 0.6 + delay, 0.7 + delay],
        [0, 1, 1, 0]
    ) : { get: () => 0 }; // Fallback for when scrollYProgress is undefined

    // Only create the transform if scrollYProgress is valid
    const y = scrollYProgress ? useTransform(
        scrollYProgress,
        [0.1 + delay, 0.3 + delay, 0.42 + delay, 0.6 + delay, 0.7 + delay],
        [100, 0, 35, 0, -100]
    ) : { get: () => 0 }; // Fallback for when scrollYProgress is undefined

    return (
        <motion.span
            style={{
                opacity,
                y,
                display: 'inline-block',
                margin: '0 2px',
                willChange: 'transform, opacity',
            }}
        >
            {char === ' ' ? '\u00A0' : char}
        </motion.span>
    );
};