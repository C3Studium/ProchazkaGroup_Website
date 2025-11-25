import MainText from "@/components/anim/MainText";
import { qnas } from "@/constants/pages/qna"
import { AnimatePresence, motion, useInView } from "framer-motion"
import Image from "next/image"
import { useState, useRef } from "react"
import GetChars from "../navbar/body/getChars"
import { usePerformance } from "@/context/PerformanceProvider"
import Grid from "../grid";

const contentVariants = {
    open: {
        height: "auto",
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    },
    closed: {
        height: 0,
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: "easeIn"
        }
    }
}

export default function QNA() {
    const [openStates, setOpenStates] = useState(new Array(qnas.length).fill(false));
    const [selectedItem, setSelectedItem] = useState({ isActive: false, index: 0 });

    const toggleQNA = (index) => {
        setOpenStates(prev => {
            // Create a new array with all items closed
            const newStates = new Array(prev.length).fill(false);
            
            // If the clicked item was already open, leave it closed
            // Otherwise, open the clicked item
            if (!prev[index]) {
                newStates[index] = true;
            }
            
            return newStates;
        });
    }
    return (
        <section className="QNA">
            <Grid size="20vh"/>
            <div className="QNA__Intro">
                <div className="QNA__MainText">
                    <MainText initialColor={'#050A10'} secondaryColor={'#FF5733'} text="<span>MÁTE NĚJAKÝ DOTAZ?</span> NĚKTERÉ Z NICH JSME UŽ ZODPOVĚZELI." />
                </div>
                <div className="QNA__Header">
                    <div className="QNA__Header__container">
                        <h2>04</h2>
                        <p>
                            Vše, na co se naši klienti <br /> nejčastěji ptají 
                        </p>
                    </div>
                    <div className="devider"/>
                </div>
            </div>
            <div className="QNA__wrapper">
                {qnas.map((qna, index) => (
                    <motion.div 
                        key={`qna${index}`} 
                        className="QNA__item"
                        initial={false}
                    >
                        <motion.div 
                            className="QNA__item__header"
                            onMouseEnter={() => setSelectedItem({ isActive: true, index })}
                            onMouseLeave={() => setSelectedItem({ isActive: false, index })}
                        >
                            <motion.h3 onClick={() => toggleQNA(index)}>
                                <GetChars
                                    text={qna.question}
                                    selectedLink={selectedItem}
                                    index={index}
                                    initialColor={'#fff'}
                                />
                            </motion.h3>
                            <motion.div 
                                className="QNA__item__header__icon"
                                animate={{ rotate: openStates[index] ? 90 : 0 }}
                                onClick={() => toggleQNA(index)}
                            >
                                <Image src='/assets/prebuild/QNA.png' alt='icon' width={25} height={25} priority={false} quality={60} loading="lazy"/>
                            </motion.div>
                        </motion.div>
                        <AnimatePresence initial={false} mode="wait">
                            {openStates[index] && (
                                <motion.div 
                                    className="QNA__item__content"
                                    initial="closed"
                                    animate="open"
                                    exit="closed"
                                    variants={contentVariants}
                                >
                                    <div className="devider"/>
                                    <SubText text={qna.answer} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </section>
    )
}
const parseWords = (text) => {
    return text.split(/(<br\/>)/).map((segment, index) => {
        return segment === '<br/>' ? 
            { type: 'break' } : 
            { type: 'text', content: segment.split(' ') };
    });
};

function SubText({text, className}) {
    // Performance
    const { shouldReduceAnimations } = usePerformance();

    const ref = useRef(null);
    const isInView = useInView(ref, {
        margin: "-2% 0px -2% 0px",
        amount: 0.2,
        once: false
    });

    const segments = text.split(/(<br\/>)/).map((segment, index) => {
        return segment === '<br/>' ? { type: 'break' } : { type: 'text', content: segment };
    });

    const characters = segments.reduce((acc, segment) => {
        if (segment.type === 'break') {
            acc.push({ char: '<br/>', type: 'break' });
        } else {
            segment.content.split('').forEach(char => {
                acc.push({ char, type: 'text' });
            });
        }
        return acc;
    }, []);
    if (shouldReduceAnimations) {
        const words = parseWords(text);
        return (
            <div ref={ref} className={className}>
                <motion.p>
                    {words.map((segment, i) => 
                        segment.type === 'break' ? (
                            <br key={`br-${i}`} />
                        ) : (
                            segment.content.map((word, j) => (
                                <motion.span
                                    key={`word-${i}-${j}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={isInView ? {
                                        opacity: 1,
                                        y: 0
                                    } : {
                                        opacity: 0,
                                        y: 10
                                    }}
                                    transition={{
                                        duration: 0.2,
                                        delay: j * 0.1,
                                        ease: "easeOut",
                                    }}
                                    style={{
                                        display: 'inline-block',
                                        marginRight: '0.25em'
                                    }}
                                >
                                    {word}
                                </motion.span>
                            ))
                        )
                    )}
                </motion.p>
            </div>
        );
    }

    return (
        <div ref={ref} className={className}>
            <motion.p>
                {characters.map((item, i) => (
                    item.type === 'break' ? (
                        <br key={`br-${i}`} />
                    ) : (
                        <motion.span
                            key={`brs${i}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={isInView ? {
                                opacity: 1,
                                y: 0
                            } : {
                                opacity: 0,
                                y: 10
                            }}
                            transition={{
                                duration: 0.05,
                                delay: i * 0.004, // Forward animation only
                                ease: [0.215, 0.61, 0.355, 1],
                            }}
                            style={{
                                display: 'inline-block',
                                marginRight: item.char === ' ' ? '0.1em' : '0.015em'
                            }}
                        >
                            {item.char === ' ' ? '\u00A0' : item.char}
                        </motion.span>
                    )
                ))}
            </motion.p>
        </div>
    );
}


// with parallax effect

// import MainText from "@/components/anim/MainText";
// import { qnas } from "@/constants/pages/qna"
// import { AnimatePresence, motion, useInView, useScroll, useSpring, useTransform } from "framer-motion"
// import Image from "next/image"
// import { useState, useRef } from "react"
// import GetChars from "../navbar/body/getChars"
// import { usePerformance } from "@/context/PerformanceProvider"
// import Grid from "../grid";

// const contentVariants = {
//     open: {
//         height: "auto",
//         opacity: 1,
//         transition: {
//             duration: 0.3,
//             ease: "easeOut"
//         }
//     },
//     closed: {
//         height: 0,
//         opacity: 0,
//         transition: {
//             duration: 0.3,
//             ease: "easeIn"
//         }
//     }
// }

// export default function QNA() {
//     const [openStates, setOpenStates] = useState(new Array(qnas.length).fill(false));
//     const [selectedItem, setSelectedItem] = useState({ isActive: false, index: 0 });
//     const { shouldReduceAnimations } = usePerformance();
    
//     // Add refs for scroll tracking
//     const sectionRef = useRef(null);
//     const mainTextRef = useRef(null);
//     const headerRef = useRef(null);
    
//     // Set up scroll tracking
//     const { scrollYProgress } = useScroll({
//         target: sectionRef,
//         offset: ["start end", "end start"]
//     });

//     // Create smooth progress for better animation
//     const smoothYProgress = useSpring(scrollYProgress, {
//         stiffness: 100,
//         damping: 30,
//         restDelta: 0.001,
//     });
    
//     // Create parallax transforms for different elements
//     const mainTextY = useTransform(
//         smoothYProgress, 
//         [0, 0.5, 1], 
//         shouldReduceAnimations ? [0, 0, 0] : [-40, 0, 40]
//     );
    
//     const headerY = useTransform(
//         smoothYProgress, 
//         [0, 0.5, 1], 
//         shouldReduceAnimations ? [0, 0, 0] : [60, 0, -60]
//     );

//     const toggleQNA = (index) => {
//         setOpenStates(prev => {
//             const newStates = [...prev]
//             newStates[index] = !newStates[index]
//             return newStates
//         })
//     }
    
//     return (
//         <section className="QNA" ref={sectionRef}>
//             <Grid size="20vh"/>
//             <div className="QNA__Intro">
//                 <motion.div 
//                     className="QNA__MainText"
//                     ref={mainTextRef}
//                     style={{ y: mainTextY }}
//                 >
//                     <MainText 
//                         initialColor={'#050A10'} 
//                         secondaryColor={'#FF5733'} 
//                         text="<span>MÁTE NĚJAKÝ DOTAZ?</span> NĚKTERÉ Z NICH JSME UŽ ZODPOVĚZELI." 
//                     />
//                 </motion.div>
//                 <motion.div 
//                     className="QNA__Header"
//                     ref={headerRef}
//                     style={{ y: headerY }}
//                 >
//                     <div className="QNA__Header__container">
//                         <h2>04</h2>
//                         <p>
//                             Vše, na co se naši klienti <br /> nejčastěji ptají 
//                         </p>
//                     </div>
//                     <div className="devider"/>
//                 </motion.div>
//             </div>
//             <div className="QNA__wrapper">
//                 {qnas.map((qna, index) => {
//                     // Calculate parallax offset for each item
//                     // Items in the middle will have less movement than items at the beginning/end
//                     const itemPosition = index / (qnas.length - 1); // 0 to 1
//                     const offset = (itemPosition - 0.5) * 2; // -1 to 1
                    
//                     // Create a custom transform for each item
//                     const itemY = useTransform(
//                         smoothYProgress,
//                         [0, 0.5, 1],
//                         shouldReduceAnimations ? [0, 0, 0] : [-60 + (offset * 20), 0, 60 - (offset * 20)]
//                     );
                    
//                     return (
//                         <motion.div 
//                             key={`qna${index}`} 
//                             className="QNA__item"
//                             initial={false}
//                             style={{ 
//                                 y: itemY,
//                                 zIndex: qnas.length - index // Maintain proper layering
//                             }}
//                         >
//                             <motion.div 
//                                 className="QNA__item__header"
//                                 onMouseEnter={() => setSelectedItem({ isActive: true, index })}
//                                 onMouseLeave={() => setSelectedItem({ isActive: false, index })}
//                             >
//                                 <motion.h3 onClick={() => toggleQNA(index)}>
//                                     <GetChars
//                                         text={qna.question}
//                                         selectedLink={selectedItem}
//                                         index={index}
//                                         initialColor={'#fff'}
//                                     />
//                                 </motion.h3>
//                                 <motion.div 
//                                     className="QNA__item__header__icon"
//                                     animate={{ rotate: openStates[index] ? 90 : 0 }}
//                                     onClick={() => toggleQNA(index)}
//                                 >
//                                     <Image src='/assets/prebuild/QNA.png' alt='icon' width={25} height={25} priority={false} quality={60} loading="lazy"/>
//                                 </motion.div>
//                             </motion.div>
//                             <AnimatePresence initial={false}>
//                                 {openStates[index] && (
//                                     <motion.div 
//                                         className="QNA__item__content"
//                                         initial="closed"
//                                         animate="open"
//                                         exit="closed"
//                                         variants={contentVariants}
//                                     >
//                                         <div className="devider"/>
//                                         <SubText text={qna.answer} />
//                                     </motion.div>
//                                 )}
//                             </AnimatePresence>
//                         </motion.div>
//                     );
//                 })}
//             </div>
//         </section>
//     )
// }
// const parseWords = (text) => {
//     return text.split(/(<br\/>)/).map((segment, index) => {
//         return segment === '<br/>' ? 
//             { type: 'break' } : 
//             { type: 'text', content: segment.split(' ') };
//     });
// };

// function SubText({text, className}) {
//     // Performance
//     const { shouldReduceAnimations } = usePerformance();

//     const ref = useRef(null);
//     const isInView = useInView(ref, {
//         margin: "-2% 0px -2% 0px",
//         amount: 0.2,
//         once: false
//     });

//     const segments = text.split(/(<br\/>)/).map((segment, index) => {
//         return segment === '<br/>' ? { type: 'break' } : { type: 'text', content: segment };
//     });

//     const characters = segments.reduce((acc, segment) => {
//         if (segment.type === 'break') {
//             acc.push({ char: '<br/>', type: 'break' });
//         } else {
//             segment.content.split('').forEach(char => {
//                 acc.push({ char, type: 'text' });
//             });
//         }
//         return acc;
//     }, []);
//     if (shouldReduceAnimations) {
//         const words = parseWords(text);
//         return (
//             <div ref={ref} className={className}>
//                 <motion.p>
//                     {words.map((segment, i) => 
//                         segment.type === 'break' ? (
//                             <br key={`br-${i}`} />
//                         ) : (
//                             segment.content.map((word, j) => (
//                                 <motion.span
//                                     key={`word-${i}-${j}`}
//                                     initial={{ opacity: 0, y: 10 }}
//                                     animate={isInView ? {
//                                         opacity: 1,
//                                         y: 0
//                                     } : {
//                                         opacity: 0,
//                                         y: 10
//                                     }}
//                                     transition={{
//                                         duration: 0.2,
//                                         delay: j * 0.1,
//                                         ease: "easeOut",
//                                     }}
//                                     style={{
//                                         display: 'inline-block',
//                                         marginRight: '0.25em'
//                                     }}
//                                 >
//                                     {word}
//                                 </motion.span>
//                             ))
//                         )
//                     )}
//                 </motion.p>
//             </div>
//         );
//     }

//     return (
//         <div ref={ref} className={className}>
//             <motion.p>
//                 {characters.map((item, i) => (
//                     item.type === 'break' ? (
//                         <br key={`br-${i}`} />
//                     ) : (
//                         <motion.span
//                             key={`brs${i}`}
//                             initial={{ opacity: 0, y: 10 }}
//                             animate={isInView ? {
//                                 opacity: 1,
//                                 y: 0
//                             } : {
//                                 opacity: 0,
//                                 y: 10
//                             }}
//                             transition={{
//                                 duration: 0.05,
//                                 delay: i * 0.004, // Forward animation only
//                                 ease: [0.215, 0.61, 0.355, 1],
//                             }}
//                             style={{
//                                 display: 'inline-block',
//                                 marginRight: item.char === ' ' ? '0.1em' : '0.015em'
//                             }}
//                         >
//                             {item.char === ' ' ? '\u00A0' : item.char}
//                         </motion.span>
//                     )
//                 ))}
//             </motion.p>
//         </div>
//     );
// }