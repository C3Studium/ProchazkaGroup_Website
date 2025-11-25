import { chartData1, chartData2 } from "@/constants/mainpage"
import { useOnWindowResize } from "@/hooks/useOnWindowResize"
import { AreaChart, LineChart } from "@tremor/react"
import { useRef, useState } from "react"
import SmallButton from "@/components/ui/stickyButtons/buttons/SmallButton"
import Grid from "@/components/common/grid"
import { useScroll, useTransform, motion } from "framer-motion"

export default function Reality() {
    const sectionRef = useRef(null)
    const [ isMobile, setIsMobile ] = useState(false)

    const [ data, setData ] = useState("chartData1")

    useOnWindowResize(() => {
        setIsMobile(window.innerWidth < 910)
    })

         // Set up parallax scrolling effect
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start 0.75", "end start"],
    });
    
    // Header text parallax transforms
    const headerY = useTransform(scrollYProgress, [0, 1], [80, -60]);
    const headerOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const headerScale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.98]);
    
    // Graph parallax transforms
    const graphY = useTransform(scrollYProgress, [0.1, 1], [120, -80]);
    const graphOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0, 1, 1, 0]);
    const graphScale = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0.92, 1, 1, 0.95]);
    
    // Additional text parallax
    const addTextY = useTransform(scrollYProgress, [0.2, 1], [60, -40]);
    const addTextOpacity = useTransform(scrollYProgress, [0.2, 0.4, 0.6, 0.8], [0, 1, 1, 0]);
    
    // Divider parallax - subtle horizontal expansion
    const dividerWidth = useTransform(scrollYProgress, [0.3, 0.5, 0.7], ["85%", "90%", "92%"]);
    const dividerOpacity = useTransform(scrollYProgress, [0.3, 0.5, 0.7], [0.6, 1, 0.6]);

    const categories1 = ["Vaše peníze", "Běžná cesta", "Inflace"];
    const colors1 = ["gray", "neonCyan", "fuchsia"];

    const categories2 = ["Vaše peníze", "Naše cesta", "Inflace"];
    const colors2 = ["gray", "neonCyan", "fuchsia"];

    return (
        <div className="Reality" ref={sectionRef}>
            <Grid size="20vh"/>
            <motion.div
                className="Graph__container"
                style={{
                    y: graphY,
                    opacity: graphOpacity,
                    scale: graphScale,
                }}
            >
                <motion.div
                    className="graph__wrapper"
                    initial={{ filter: "blur(1px)" }}
                    whileInView={{ filter: "blur(0px)" }}
                    transition={{ duration: 0.5 }}
                >
                    <LineChart
                        className={isMobile ? "h-60" : "h-full w-full"}
                        data={data === "chartData1" ? chartData1 : chartData2}
                        index="date"
                        categories={data === "chartData1" ? categories1 : categories2}
                        colors={data === "chartData1" ? colors1 : colors2}
                        valueFormatter={number => `${Math.round(number)} %`}
                        showLegend={!isMobile}
                        showGridLines={false}
                        showYAxis={!isMobile}
                        showXAxis={true}
                        startEndOnly={isMobile}
                        showTooltip={true}
                        enableLegendSlider={true}
                    />
                </motion.div>
            </motion.div>
            <motion.div
                className="Header"
                style={{ 
                    y: headerY,
                    opacity: headerOpacity,
                    scale: headerScale,
                }}
            >
                <motion.div
                    className="header__text"
                    initial={{ x: -20 }}
                    whileInView={{ x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <h3>δ |</h3>
                    <p>
                        Představte si, že každá rodina na tomto grafu,<br/>
                        žije ve stresu z každého dalšího výdaje.<br/>
                        <span>Chcete patřit mezi ně?</span> <br/>
                        S námi můžete žít bez obav a nad inflací.
                    </p>
                </motion.div>
                <motion.div
                    className="addText"
                    style={{ 
                        y: addTextY,
                        opacity: addTextOpacity,
                    }}
                >
                    <div className="addText__content">   
                        <h3>CNB |</h3>
                        <p>Statistiky</p>
                    </div>
                    <motion.div
                        className="addText__buttons"
                        initial={{ x: 15, opacity: 0.8 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >   
                        <div onClick={() => setData("chartData1")}>
                            <SmallButton 
                                text='Vlastní cesta' 
                            />
                        </div>
                        <div onClick={() => setData("chartData2")}>
                            <SmallButton 
                                text='Naše cesta' 
                            />
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
            <motion.div
                className="divider"
                style={{ 
                    width: dividerWidth, 
                    opacity: dividerOpacity,
                }}
            />
        </div>
    )
}