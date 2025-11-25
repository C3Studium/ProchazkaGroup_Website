import { motion } from "framer-motion";


const AnimatedText = ({ text, custom, className }) => {
    // Generate random delays for each character
    const characters = Array.from(text).map((char, i) => {
      const randomDelay = Math.random() * 0.5 + 0.25; // Random delay between 0 and 0.5s
      return { char, delay: randomDelay };
    });
    
    return (
      <>
        {characters.map((char, index) => (
          <motion.span
            key={index}
            style={{ display: 'inline-block', marginRight: '0.1em' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              delay: 0.75 + (custom * 0.3) + char.delay, // Base delay + custom delay + random
              duration: 0.3,
              ease: [0.76, 0, 0.24, 1],
            }}
          >
            {char.char === " " ? "\u00A0" : char.char}
          </motion.span>
        ))}
      </>
    );
};

export default AnimatedText