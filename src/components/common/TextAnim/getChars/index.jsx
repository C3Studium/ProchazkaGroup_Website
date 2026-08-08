import { motion } from 'framer-motion';
import { Fragment, useEffect, useRef } from 'react';

const textExplosionHover = (initialColor, isActive) => ({
    initial: {
        scale: 1,
        opacity: isActive ? 1 : 0.65,
        color: initialColor
    },
    enter: (i,) => ({
        scale: [1, 1.1, 1], // Increased scale value for more pronounced effect
        opacity: 1,
        color: [initialColor, '#4BDADC', initialColor],
        transition: {
            duration: 0.5,
            ease: [0.76, 0, 0.24, 1],
            delay: i[0],
            scale: { times: [0, 0.5, 1], duration: 0.3, ease: [0.76, 0, 0.24, 1], delay: i[0] + 0.2 },
            color: { times: [0, 0.5, 1], duration: 0.3, ease: [0.76, 0, 0.24, 1], delay: i[0] + 0.2 }
        }
    }),
    exit: (i) => ({
        opacity: isActive ? 1 : 0.65,
        scale: [1, 1, 1.1, 1], // Increased scale value for more pronounced effect
        color: [initialColor, initialColor, '#4BDADC', initialColor],
        transition: {
            duration: 0.5,
            ease: [0.76, 0, 0.24, 1],
            delay: i[1],
            scale: { times: [1, 0.5, 0], duration: 0.3, ease: [0.76, 0, 0.24, 1], delay: i[1] + 0.2 },
            color: { times: [1, 0.5, 0], duration: 0.3, ease: [0.76, 0, 0.24, 1], delay: i[1] + 0.2 }
        }
    }),
});

const GetChars = ({ text, selectedLink, index, initialColor, pathname, href }) => {
    const charRefs = useRef([]);
    const isActive = pathname && href ? pathname === href : false;
    let charIndex = 0;

    useEffect(() => {
        // Initialize refs array for all characters
        const totalChars = text.replace(/\s+/g, '').length;
        charRefs.current = charRefs.current.slice(0, totalChars);
    }, [text]);

    // Split text into words first
    const words = text.split(' ');
    
    return (
        <Fragment>
            {words.map((word, wordIndex) => (
                <span 
                    key={`word-${wordIndex}`} 
                    style={{ 
                        display: 'inline-block',
                        marginRight: wordIndex < words.length - 1 ? '0.3em' : 0
                    }}
                >
                    {word.split('').map((char, i) => {
                        const currentCharIndex = charIndex;
                        charIndex++; // Increment for next character
                        
                        return (
                            <motion.span
                                key={`${char}-${currentCharIndex}`}
                                ref={(el) => (charRefs.current[currentCharIndex] = el)}
                                variants={textExplosionHover(initialColor, isActive)}
                                custom={[currentCharIndex * 0.02, (text.replace(/\s+/g, '').length - currentCharIndex) * 0.02]}
                                initial="initial"
                                animate={
                                    selectedLink.isActive && selectedLink.index === index
                                        ? 'enter'
                                        : 'exit'
                                }
                                onAnimationComplete={() => {
                                    if (!selectedLink.isActive || selectedLink.index !== index) {
                                        if (charRefs.current[currentCharIndex]) {
                                            // Only use #964BF2 if both pathname and href were provided
                                            charRefs.current[currentCharIndex].style.color = isActive ? '#964BF2' : initialColor;
                                            charRefs.current[currentCharIndex].style.opacity = isActive ? "1" : "0.65";
                                            charRefs.current[currentCharIndex].style.transform = 'scale(1)';
                                        }
                                    }
                                }}
                                style={{ display: 'inline-block', marginRight: '0.02em' }}
                            >
                                {char}
                            </motion.span>
                        );
                    })}
                </span>
            ))}
        </Fragment>
    );
};

export default GetChars;