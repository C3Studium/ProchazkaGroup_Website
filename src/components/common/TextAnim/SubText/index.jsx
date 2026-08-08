import { usePerformance } from "@/context/PerformanceProvider";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const parseText = (text) => {
    return text.split(/(<br\/>|<span>.*?<\/span>)/).filter(Boolean).map(segment => {
        if (segment === '<br/>') {
            return { type: 'break' };
        } else if (segment.startsWith('<span>')) {
            return {
                type: 'text',
                content: segment.replace(/<\/?span>/g, ''),
                highlighted: true
            };
        }
        return { type: 'text', content: segment, highlighted: false };
    });
};


export default function SubText({text, className, initialColor = "#fff", secondaryColor = "#4bdadc"}) {
    // Performance context
    const { shouldReduceAnimations } = usePerformance();
    
    const ref = useRef(null);
    const lastAnimatedIndex = useRef(0);
    const isAnimatingOut = useRef(false);
    
    const isInView = useInView(ref, {
        margin: "-2% 0px -2% 0px",
        amount: 0.2,
        once: false
    });

    useEffect(() => {
        if (!isInView) {
            isAnimatingOut.current = true;
            lastAnimatedIndex.current = 0;
        }
    }, [isInView]);

    // For reduced animations mode
    if (shouldReduceAnimations) {
        // Parse text into segments and then words
        const segments = parseText(text);
        
        return (
            <div ref={ref} className={className}>
                <motion.p>
                    {segments.map((segment, segIndex) => {
                        if (segment.type === 'break') {
                            return <br key={`br-${segIndex}`} />;
                        }
                        
                        // Split segment content into words
                        const words = segment.content.split(/\s+/);
                        
                        return words.map((word, wordIndex) => (
                            <motion.span
                                key={`word-${segIndex}-${wordIndex}`}
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
                                    delay: wordIndex * 0.05,
                                    ease: "easeOut",
                                }}
                                style={{
                                    display: 'inline-block',
                                    marginRight: '0.25em',
                                    color: segment.highlighted ? secondaryColor : initialColor
                                }}
                            >
                                {word}
                            </motion.span>
                        ));
                    })}
                </motion.p>
            </div>
        );
    }

    // For full animation mode - organize text into words and characters
    const segments = parseText(text);
    
    // Transform segments into a structured array of words and characters
    const words = [];
    let totalCharCount = 0;
    
    segments.forEach((segment, segIndex) => {
        if (segment.type === 'break') {
            words.push({ type: 'break', segmentIndex: segIndex });
            return;
        }
        
        // Split segment content into words
        const segmentWords = segment.content.split(/\s+/);
        
        segmentWords.forEach((wordText, wordIndex) => {
            const characters = wordText.split('').map((char) => {
                return { 
                    char,
                    position: totalCharCount++,
                    highlighted: segment.highlighted
                };
            });
            
            words.push({
                type: 'word',
                characters,
                segmentIndex : segIndex,
                wordIndex : wordIndex,
                highlighted: segment.highlighted
            });
        });
    });

    return (
        <div ref={ref} className={className}>
            <motion.p>
                {words.map((word, wordIdx) => {
                    if (word.type === 'break') {
                        return <br key={`br-${word.segmentIndex}`} />;
                    }
                    
                    return (
                        <span 
                            key={`word-${word.segmentIndex}-${word.wordIndex}`}
                            className={word.highlighted ? 'highlighted-word' : ''}
                            style={{ 
                                display: 'inline-block',
                            }}
                        >
                            {word.characters.map((item, charIdx) => (
                                <motion.span
                                    key={`char-${word.segmentIndex}-${word.wordIndex}-${charIdx}`}
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
                                        delay: isAnimatingOut.current ? 
                                            Math.max(0, (totalCharCount - item.position) * 0.006) :
                                            item.position * 0.008,
                                        ease: [0.215, 0.61, 0.355, 1],
                                    }}
                                    onAnimationComplete={() => {
                                        lastAnimatedIndex.current = item.position;
                                        if (item.position === totalCharCount - 1) {
                                            isAnimatingOut.current = false;
                                        }
                                    }}
                                    style={{
                                        display: 'inline-block',
                                        color: item.highlighted ? secondaryColor : initialColor
                                    }}
                                >
                                    {item.char}
                                </motion.span>
                            ))}
                            {/* Add space after each word except the last one in a segment */}
                            {wordIdx < words.length - 1 && words[wordIdx + 1].type !== 'break' && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                                    style={{ display: 'inline-block' }}
                                >
                                    {'\u00A0'}
                                </motion.span>
                            )}
                        </span>
                    );
                })}
            </motion.p>
        </div>
    );
}