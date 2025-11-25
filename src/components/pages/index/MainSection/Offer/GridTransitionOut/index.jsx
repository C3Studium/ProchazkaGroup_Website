import { useRef, useEffect, useState } from "react";
import { useScroll, useTransform, motion, useSpring } from "framer-motion";
import { useMemo, memo } from "react";
import Grid from "@/components/common/grid";

export function RealityIntroGridOut({ref, color}) {
    // Create a unique ref for this component instance
    const gridRef = ref.current;
    const sectionRef = useRef(null);
    
    return (
        <section className="GridTransitionOut" ref={sectionRef}>
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
                <BlackTilesGrid gridRef={ref} color={color} />
            </div>
        </section>
    )
}

function BlackTilesGrid({ 
    gridRef,
    rows = 7, 
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
        offset: ["start start", "end start"],
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
            <Grid size="20vh" key={"grid__transitionB2"}/>
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
        [1, 0]
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

// Memoized GridTile to prevent unnecessary re-renders
const MemoizedGridTile = memo(GridTile);
