import { motion, useScroll, useTransform } from "framer-motion";
import { Fragment, useRef } from "react";

// Linear Interpolation function
const lerp = (start, end, t) => start + t * (end - start);

const AnimatedChar = ({ char, progress, animationOffset, initialColor, isHighlighted, secondaryColor }) => {
    const scale = useTransform(
        progress,
        [
            animationOffset,
            animationOffset + 0.15,
            animationOffset + 0.3,
            animationOffset + 0.45,
            animationOffset + 0.6
        ],
        [1, 1.1, 1.3, 1.1, 1]
    );
    const color = useTransform(
        progress,
        [
            animationOffset,
            animationOffset + 0.15,
            animationOffset + 0.3,
            animationOffset + 0.45,
            animationOffset + 0.6
        ],
        isHighlighted 
            ? [secondaryColor, secondaryColor, '#9151e0', secondaryColor, secondaryColor]
            : [initialColor, '#00F0FF', '#9151e0', '#00F0FF', initialColor]
    );
    const opacity = useTransform(progress, [animationOffset + 0.1, animationOffset + 0.3], [0.65, 1]);

    return (
        <motion.span
            style={{
                display: 'inline-block',
                marginRight: '0.02em',
                scale,
                opacity,
                color
            }}
            className={isHighlighted ? 'highlighted-char' : ''}
        >
            {char}
        </motion.span>
    );
};

const parseText = (text) => {
    // Split text into segments (normal text, <br/>, and spans)
    return text.split(/(<br \/>|<span>.*?<\/span>)/).filter(Boolean).map(segment => {
        if (segment === '<br />') {
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

const AnimatedText = ({ text, progress, initialColor, secondaryColor }) => {
    const segments = parseText(text);
    let totalCharCount = 0;
    
    // Calculate total character count for animation offsets
    segments.forEach(segment => {
        if (segment.type === 'text') {
            totalCharCount += segment.content.length;
        }
    });
    
    return (
        <motion.p className="animated-paragraph">
            {segments.map((segment, segIndex) => {
                if (segment.type === 'break') {
                    return <br key={`br-${segIndex}`} />;
                }
                
                // Split segment content into words
                const words = segment.content.split(/\s+/);
                
                return words.map((word, wordIndex) => {
                    // Calculate relative position of this word for animation timing
                    let wordStartChar = 0;
                    for (let i = 0; i < segIndex; i++) {
                        if (segments[i].type === 'text') {
                            wordStartChar += segments[i].content.length;
                        }
                    }
                    for (let i = 0; i < wordIndex; i++) {
                        wordStartChar += words[i].length + 1; // +1 for space
                    }
                    
                    return (
                        <span 
                            key={`word-${segIndex}-${wordIndex}`} 
                            className={`word-wrapper ${segment.highlighted ? 'highlighted-word' : ''}`}
                            style={{ 
                                display: 'inline-block',
                                marginRight: wordIndex < words.length - 1 ? '0.3em' : '0'
                            }}
                        >
                            {/* Map each character in the word */}
                            {word.split('').map((char, charIdx) => {
                                const charPosition = wordStartChar + charIdx;
                                const animationOffset = lerp(0, 1, charPosition / totalCharCount) * 0.2;
                                
                                return (
                                    <AnimatedChar
                                        key={`char-${segIndex}-${wordIndex}-${charIdx}`}
                                        char={char}
                                        progress={progress}
                                        animationOffset={animationOffset}
                                        initialColor={initialColor}
                                        isHighlighted={segment.highlighted}
                                        secondaryColor={secondaryColor}
                                    />
                                );
                            })}
                        </span>
                    );
                });
            })}
        </motion.p>
    );
};

export default function MainText({ text, initialColor = '#FFFFFF', secondaryColor = '#4bdadc', className, ref }) {
    const textRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref? ref :textRef,
        offset: ref? ['start end', 'end start'] : ["start 1.1", "start start"],
    });

    return (
        <div className={`MainTextV3__Main ${className}`} ref={textRef}>
            <div className="MainText__Container">
                <AnimatedText 
                    text={text} 
                    progress={scrollYProgress} 
                    initialColor={initialColor}
                    secondaryColor={secondaryColor}
                />
            </div>
        </div>
    );
}