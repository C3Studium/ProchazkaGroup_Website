import MainText from "@/components/anim/MainText";
import SubText from "@/components/anim/SubText";
import Grid from "@/components/common/grid";
import { RealityIntroGrid } from "@/components/pages/index/MainSection/Offer/GridTransition";
import { RealityIntroGridOut } from "@/components/pages/index/MainSection/Offer/GridTransitionOut";
import { motion, useSpring, useTransform } from "framer-motion"
import Image from "next/image";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

const InfoBenefitS = forwardRef(function InfoBenefitS({ scroll }, ref) {
    const gridRefIn = useRef(null);
    const gridRefOut = useRef(null);
    const [dimensions, setDimensions] = useState({
        width: 0,
        height: 0,
        isLandscape: false
    });

    // Grid settings for pixelated effect
    const rows = 5;
    const columns = 10;
    const tileSize = "20vh";

    // Renamed for clarity and adjusted timing
    const firstContentOpacity = useTransform(
        scroll,
        [0, 0.25, 0.50, 0.55], // Fade out slightly earlier
        [1, 1, 1, 0]           // Complete fade before the third content appears
    );

    // Renamed for clarity and adjusted timing
    const thirdContentOpacity = useTransform(
        scroll,
        [0, 0.30, 0.35, 0.55, 0.6, 1],
        [0, 0, 0, 0, 1, 1]     // Start fade in exactly when first content is gone
    );

    const headerMove = useTransform(
        scroll,
        [0, 0.5, 0.6, 1],
        dimensions.isLandscape
            ? ['0vw', '0vw', '-50vw', '-50vw']  // Landscape mode
            : dimensions.width >= 740
                ? ['0vw', '0vw', '-50vw', '-50vw']  // Portrait mode above 740px
                : ['0vw', '0vw', '-20vw', '-20vw']  // Default
    );
    
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isLandscape = width/height >= 1;
            
            setDimensions({
                width,
                height,
                isLandscape
            });
        };
    
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const wrapperMove = useTransform(
        scroll,
        [0, 0.7, 0.8, 1],
        ['0vw', '0vw', '100vw', '100vw']
    );

    const coverMove = useTransform(
        scroll,
        [0, 0.7, 0.8, 1],
        ['-100vw', '-100vw', '0vw', '0vw']
    );

    // Generate grid tiles
    const gridTiles = useMemo(() => {
        const tiles = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const tileIndex = row * columns + col;
                const xOffset = -(col * (100 / columns));
                const yOffset = -(row * (100 / rows));
                
                // Create a delay based on column for staggered animation
                const delayX = 0.01 * col;
                const delayY = 0.015 * row;
                
                tiles.push({
                    id: `tile-${tileIndex}`,
                    row,
                    col,
                    delayX,
                    delayY,
                    xOffset,
                    yOffset
                });
            }
        }
        return tiles;
    }, [rows, columns]);

    // Animation for tiles coming in
    const getTileX = (delay) => useTransform(
        scroll,
        [0.70, 0.8 - delay],
        ['-300%', '0%']
    );
    const getTileY = (delay) => useTransform(
        scroll,
        [0.70, 0.8 - delay],
        ['-300%', '0%',]
    );


    return (
        <section className="InfoBenefitS" ref={ref}>
            <div className="InfoBenefitS__sticky">
                <Grid size="20vh" key={"InfoBenefitS__sticky"}/> 
                <motion.div 
                    className="InfoBenefitS__sticky__Wrapper"
                    style={{x: wrapperMove}}
                >
                    <div className="InfoBenefitS__sticky__Header">
                        <motion.div 
                            className="InfoBenefitS__sticky__Header__container"
                            style={{x: headerMove}}
                            transition={{
                                type: 'spring',
                                stiffness: 100,
                                damping: 30,
                                mass: 1,
                            }}
                        >
                            <div className="InfoBenefitS__sticky__Header__container__text">
                                <h3>01</h3>
                                <p>Vaše doporučení má hodnotu, odměníme Vás za něj</p>
                            </div>
                            <div className="devider"/>
                        </motion.div>
                        
                    </div>
                    <div className="InfoBenefitS__sticky__Content">
                        <div className="InfoBenefitS__sticky__Content__div">
                            <motion.div 
                                className="InfoBenefitS__sticky__Content__div__content" 
                                style={{zIndex: 2, opacity: firstContentOpacity}} 
                                transition={{
                                    duration: 0.5,
                                    delay: 0.2
                                }}
                            >
                                <h2>PŘINESTE ZMĚNU A ZÍSKEJTE ZPĚT</h2>
                                <p>
                                    Proč to děláme: Už 12 let tvoříme hodnoty, ne jen zisky. Když s vámi
                                    spolupracujeme, nejde o to, abychom &#39;dostali zaplaceno.&#39; Představte si, 
                                    že jste tím, kdo lidem otevírá dveře k finanční jistotě. Vy budujete jejich příběhy - a přitom posilujete svůj vlastní.          
                                </p> 
                            </motion.div>
                        </div>
                        <div className="InfoBenefitS__sticky__Content__div">
                            <motion.div 
                                className="InfoBenefitS__sticky__Content__div__content" 
                                style={{zIndex: 2, opacity: firstContentOpacity}} 
                                transition={{
                                    duration: 0.5,
                                    delay: 0.5
                                }}
                            >
                                <h2>CO DOSTANETE VY: ODMĚNY NEJEN FYZIČNÉ</h2>
                                <p>
                                  Jak fungujeme: neplatíte nám nic předem. Každý krok, který uděláte, přináší okamžitou hodnotu. Žádné složité podmínky, jen čistý zisk a uznání za váš přínos.
                                </p>                             
                            </motion.div>
                            <motion.div 
                                className="InfoBenefitS__sticky__Content__div__content" 
                                style={{zIndex: 1, opacity: thirdContentOpacity}}
                                transition={{
                                    duration: 0.5,
                                    delay: 0.5
                                }}
                            >
                                <h2>NABÍZÍME ODMĚNY, KTERÉ MŮŽETE OPRAVDU VYUŽÍT
                                    — NE JEN BODY NA KARTIČKU
                                </h2>
                                <p>Tento program je první svého druhu. Nejde o obyčejné body, věrnostní karty nebo nudné benefity. 
                                    Je to o reálných odměnách, které můžete použít.
                                    <br />ZAJMULI JSME VÁS? KOUKNĚTĚ NÍŽE:
                                </p> 
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div 
                    className="InfoBenefitS__sticky__Cover"
                    style={{x: coverMove}}
                >
                    {/* Pixelated grid effect */}
                    <div 
                        className="InfoBenefitS__grid-container"
                        style={{ 
                            display: 'grid',
                            gridTemplateColumns: `repeat(${columns}, ${tileSize})`,
                            gridTemplateRows: `repeat(${rows}, ${tileSize})`,
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            zIndex: 1
                        }}
                    >
                        {gridTiles.map((tile) => {
                            const tileX = getTileX(tile.delayX);
                            const springX = useSpring(tileX, { stiffness: 100, damping: 20 });

                            const tileY = getTileY(tile.delayY);
                            const springY = useSpring(tileY, { stiffness: 100, damping: 20 });

                            return (
                                <motion.div
                                    key={tile.id}
                                    className="InfoBenefitS__grid-tile"
                                    style={{
                                        position: 'relative',
                                        overflow: 'hidden',
                                        border: '0.01px solid rgba(94, 117, 141, 0.5)',
                                        x: springX,
                                        y: springY,

                                    }}
                                >
                                    {/* The container for the image inside this tile */}
                                    <div 
                                        className="InfoBenefitS__image-wrapper"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            zIndex: 1,
                                        }}
                                    >
                                        {/* Position the entire image within the wrapper */}
                                        <div 
                                            className="InfoBenefitS__image-container"
                                            style={{
                                                width: `${columns * 100}%`, // Full grid width
                                                height: `${rows * 100}%`,   // Full grid height
                                                transform: `translate(${tile.xOffset}%, ${tile.yOffset}%)`, // Offset for correct position
                                                position: 'relative'
                                            }}
                                        >
                                            <Image
                                                src='/assets/backgrounds/questRoom.webp'
                                                alt='background__section'
                                                fill={true}
                                                sizes="100vw"
                                                quality={100}
                                                priority={tile.row < 2 && tile.col < 3} // Priority only for visible tiles
                                                placeholder="blur"
                                                blurDataURL="data:image/webp"
                                                className="InfoBenefitS__tile-image"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Overlay for the tile */}
                                    <div className="InfoBenefitS__tile-cover" style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        background: 'rgba(0, 0, 0, 0.6)',
                                        zIndex: 2,
                                    }}></div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Keep the main header on top of the grid */}
                    <div className="mainHeader">
                        <MainText initialColor="#fff" text={'- JAK SE -<br />- MŮŽETE -<br />- PŘIPOJIT -<br />- ? -'}/>
                    </div>
                </motion.div>
            </div>
        </section>
    )
});

export default InfoBenefitS;