import { motion } from "framer-motion";
import { useMemo } from "react";

const alphabet = [
    { letter: "A", index: 0 },
    { letter: "Á", index: 1 },
    { letter: "B", index: 2 },
    { letter: "C", index: 3 },
    { letter: "Č", index: 4 },
    { letter: "D", index: 5 },
    { letter: "Ď", index: 6 },
    { letter: "E", index: 7 },
    { letter: "É", index: 8 },
    { letter: "Ě", index: 9 },
    { letter: "F", index: 10 },
    { letter: "G", index: 11 },
    { letter: "H", index: 12 },
    { letter: "I", index: 13 },
    { letter: "Í", index: 14 },
    { letter: "J", index: 15 },
    { letter: "K", index: 16 },
    { letter: "L", index: 17 },
    { letter: "M", index: 18 },
    { letter: "N", index: 19 },
    { letter: "Ň", index: 20 },
    { letter: "O", index: 21 },
    { letter: "Ó", index: 22 },
    { letter: "P", index: 23 },
    { letter: "Q", index: 24 },
    { letter: "R", index: 25 },
    { letter: "Ř", index: 26 },
    { letter: "S", index: 27 },
    { letter: "Š", index: 28 },
    { letter: "T", index: 29 },
    { letter: "Ť", index: 30 },
    { letter: "U", index: 31 },
    { letter: "Ú", index: 32 },
    { letter: "Ů", index: 33 },
    { letter: "V", index: 34 },
    { letter: "W", index: 35 },
    { letter: "X", index: 36 },
    { letter: "Y", index: 37 },
    { letter: "Ý", index: 38 },
    { letter: "Z", index: 39 },
    { letter: "Ž", index: 40 },
    { letter: "", index: 41 },
    { letter: " ", index: 42 },
];
const findAlphabetIndex = (char) => {
    const normalized = typeof char === "string" ? char.toUpperCase() : "";
    const found = alphabet.find((item) => item.letter === normalized);
    if (found) return found.index;
    const fallback = alphabet.find((item) => item.letter === "");
    return fallback ? fallback.index : 26;
};

const AlphabetChar = ({ char, duration = 0.5 }) => {
    const index = findAlphabetIndex(char);
    const translateY = `${-(index * 100)}%`;

    return (
        <motion.span
            className="scrollToText__char__track"
            animate={{ y: translateY }}
            transition={{ duration, ease: [0.6, 0.05, -0.01, 0.9] }}
        >
            {alphabet.map((item) => (
                <span key={`${item.letter}-${item.index}`} className="scrollToText__char__letter">
                    {item.letter}
                </span>
            ))}
        </motion.span>
    );
};

export const ScrollToText = ({ text = "", duration = 0.6 }) => {
    const chars = useMemo(() => text.split(""), [text]);

    return (
        <p className="scrollToText">
            {chars.map((char, index) => (
                <AlphabetChar
                    key={`${char}-${index}`}
                    char={char}
                    duration={duration}
                />
            ))}
        </p>
    );
};
