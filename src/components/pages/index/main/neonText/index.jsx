import { useEffect, useRef } from "react";
import { motion } from 'framer-motion'

// Animation variants for word-by-word animation
const wordAnimation = {
    initial: {
        opacity: 0,
        filter: "blur(10px)",
    },
    animate: (i) => ({
        opacity: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.8,
            delay: i * 0.05, // Staggered delay for each word
            ease: [0.25, 0.1, 0.25, 1.0],
        }
    }),
    exit: (i) => ({
        opacity: 0,
        filter: "blur(5px)",
        transition: {
            duration: 0.3,
            delay: i * 0.02,
            ease: [0.25, 0.1, 0.25, 1.0],
        }
    })
};

const PixelateText = ({ text, isInView = true, className = "", firstLoad = false }) => {
    const wordRefs = useRef([]);
    const words = text.split(' ');
    
    // Calculate base delay depending on firstLoad state
    const baseDelay = firstLoad ? 3.700 : 700; // 3.5s or 0.5s + 200ms buffer
    const wordDelayFactor = 200; // Consistent delay factor

    // Simulate pixel effect by randomizing opacity
    useEffect(() => {
        let intervalId;
        
        // Only run pixelation effect when animating in
        if (isInView) {
            // Initial setup - ensure all words are at opacity 0
            wordRefs.current.forEach(ref => {
                if (ref) ref.style.opacity = "0";
            });
            
            // Apply fluctuating opacity to create pixelation effect
            let step = 0;
            
            // Add timeout to match the introAnim delay
            const timeoutId = setTimeout(() => {
                intervalId = setInterval(() => {
                    let allComplete = true;
                    
                    wordRefs.current.forEach((ref, i) => {
                        if (!ref) return;
                        
                        // Calculate delay based on word position
                        const wordDelay = i * wordDelayFactor;
                        
                        // Only start animation after word's delay time has passed
                        if (step > wordDelay) {
                            // Create a pixelated effect with random opacity changes
                            const progress = Math.min(1, (step - wordDelay) / 500); // 500ms animation duration
                            
                            if (progress < 1) {
                                // During animation, randomize opacity for pixel effect
                                const randomOpacity = Math.random() * 0.5 + progress * 0.5;
                                ref.style.opacity = randomOpacity.toString();
                                allComplete = false;
                            } else {
                                // Animation complete, set final opacity
                                ref.style.opacity = "1";
                            }
                        } else {
                            allComplete = false;
                        }
                    });
                    
                    step += 16; // Roughly 60fps
                    
                    // Clear interval only when ALL words have finished animating
                    const totalAnimationTime = (words.length - 1) * wordDelayFactor + 500;
                    if (step > totalAnimationTime + 100 || allComplete) {
                        // Force set all words to full opacity before clearing
                        wordRefs.current.forEach(ref => {
                            if (ref) ref.style.opacity = "1";
                        });
                        clearInterval(intervalId);
                    }
                }, 16);
            }, baseDelay);
            
            return () => {
                clearTimeout(timeoutId);
                if (intervalId) clearInterval(intervalId);
                // Ensure all words are visible if component unmounts during animation
                wordRefs.current.forEach(ref => {
                    if (ref) ref.style.opacity = "1";
                });
            };
        }
    }, [isInView, words.length, baseDelay]);

    return (
        <>
            {words.map((word, i) => (
                <motion.span
                    key={`word-${i}`}
                    ref={el => (wordRefs.current[i] = el)}
                    custom={i}
                    variants={wordAnimation}
                    initial="initial"
                    animate={isInView ? "animate" : "initial"}
                    exit="exit"
                    style={{
                        display: 'inline-block',
                        marginRight: '0.25em',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        position: 'relative',
                    }}
                >
                    {word}
                </motion.span>
            ))}
        </>
    );
};

export default PixelateText