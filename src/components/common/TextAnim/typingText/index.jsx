import { motion } from "framer-motion";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const TextType = ({
  text,
  as: Component = "span",
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = "",
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = "|",
  cursorClassName = "",
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const containerRef = useRef(null);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const getCurrentTextColor = () => {
    if (textColors.length === 0) return undefined;
    return textColors[currentTextIndex % textColors.length];
  };

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let timeout;
    const currentText = textArray[currentTextIndex] || "";
    const processedText = reverseMode ? currentText.split("").reverse().join("") : currentText;

    const executeTypingAnimation = () => {
      if (isDeleting) {
        if (displayedText === "") {
          setIsDeleting(false);
          if (currentTextIndex === textArray.length - 1 && !loop) {
            return;
          }

          if (onSentenceComplete) {
            onSentenceComplete(textArray[currentTextIndex], currentTextIndex);
          }

          setCurrentTextIndex(prev => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
          timeout = setTimeout(() => { }, pauseDuration);
        } else {
          timeout = setTimeout(() => {
            // Mazání odvozené z délky, ne z předchozí hodnoty — ze stejného
            // důvodu jako psaní výš.
            setDisplayedText(prev => processedText.slice(0, Math.max(0, prev.length - 1)));
          }, deletingSpeed);
        }
      } else {
        if (currentCharIndex < processedText.length) {
          timeout = setTimeout(
            () => {
              // Odvozeno z indexu, ne přičtením znaku k předchozímu stavu.
              // Přičítání není idempotentní: když se efekt zopakuje — a
              // v Reactu se ve vývojovém režimu opakuje záměrně — přidá se
              // znak dvakrát nebo z jiné pozice a slovo se rozsype. Pozorováno
              // jako „jeenu dekádu" místo „jednu dekádu". Řez ze zdroje dá
              // stejný výsledek, kolikrát se provede.
              setDisplayedText(processedText.slice(0, currentCharIndex + 1));
              setCurrentCharIndex(prev => prev + 1);
            },
            variableSpeed ? getRandomSpeed() : typingSpeed
          );
        } else if (textArray.length >= 1) {
          if (!loop && currentTextIndex === textArray.length - 1) return;
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, pauseDuration);
        }
      }
    };

    if (currentCharIndex === 0 && !isDeleting && displayedText === "") {
      timeout = setTimeout(executeTypingAnimation, initialDelay);
    } else {
      executeTypingAnimation();
    }

    return () => clearTimeout(timeout);
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    reverseMode,
    variableSpeed,
    onSentenceComplete,
    getRandomSpeed
  ]);

  const shouldHideCursor =
    hideCursorWhileTyping && (currentCharIndex < (textArray[currentTextIndex] || "").length || isDeleting);

  return createElement(
    Component,
    {
      ref: containerRef,
      className: `text-type ${className}`.trim(),
      ...props
    },
    <span className="text__type__content" style={{ color: getCurrentTextColor() || "inherit" }}>
      {displayedText}
    </span>,
    showCursor && (
      <motion.span
        className={`text__type__cursor ${cursorClassName} ${shouldHideCursor ? "text__type__cursor--hidden" : ""}`}
        animate={shouldHideCursor ? { opacity: 0 } : { opacity: [1, 0, 1] }}
        transition={
          shouldHideCursor
            ? { duration: 0.1 }
            : { duration: cursorBlinkDuration * 2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {cursorCharacter}
      </motion.span>
    )
  );
};

export const TextTypeState = ({
  isActive,
  textWhenTrue = "",
  textWhenFalse = "",
  as: Component = "span",
  typingSpeed = 50,
  deletingSpeed = 30,
  className = "",
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = "|",
  cursorClassName = "",
  cursorBlinkDuration = 0.5,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef(null);

  const targetText = isActive ? textWhenTrue : textWhenFalse;

  useEffect(() => {
    setIsDeleting(true);
  }, [targetText]);

  useEffect(() => {
    let timeout;
    const processedText = targetText || "";

    if (isDeleting) {
      if (displayedText === "") {
        setIsDeleting(false);
        setCurrentCharIndex(0);
      } else {
        timeout = setTimeout(() => {
          setDisplayedText(prev => prev.slice(0, -1));
        }, deletingSpeed);
      }
    } else {
      if (currentCharIndex < processedText.length) {
        timeout = setTimeout(() => {
          setDisplayedText(prev => prev + processedText[currentCharIndex]);
          setCurrentCharIndex(prev => prev + 1);
        }, typingSpeed);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentCharIndex, deletingSpeed, displayedText, isDeleting, targetText, typingSpeed]);

  const shouldHideCursor =
    hideCursorWhileTyping && (currentCharIndex < (targetText || "").length || isDeleting);

  return createElement(
    Component,
    {
      ref: containerRef,
      className: `text-type ${className}`.trim(),
      ...props
    },
    <span className="text__type__content">
      {displayedText}
    </span>,
    showCursor && (
      <motion.span
        className={`text__type__cursor ${cursorClassName} ${shouldHideCursor ? "text__type__cursor--hidden" : ""}`}
        animate={shouldHideCursor ? { opacity: 0 } : { opacity: [1, 0, 1] }}
        transition={
          shouldHideCursor
            ? { duration: 0.1 }
            : { duration: cursorBlinkDuration * 2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {cursorCharacter}
      </motion.span>
    )
  );
};

export default TextType;
