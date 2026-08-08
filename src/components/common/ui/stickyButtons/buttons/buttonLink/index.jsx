import Magnetic from "@/components/common/Magnetic";
import { useCursorRef } from "@/context/CursorRefProvider";
import { useAnimationControls } from "framer-motion";
import { useMotionValue, motion, animate, transform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScrollToText } from "@/components/common/TextAnim/scrollToText";


export default function ButtonLink({ href, textRotate = '', text = "", kontakt = "" }) {
    const { registerRef, unregisterRef } = useCursorRef();
    const ButtonLinkBoundsRef = useRef(null);
    const menuRef = useRef(null);
    const textRef = useRef(null);
    const [boundsHovered, setBoundsHovered] = useState(false);
    const [isContact, setIsContact] = useState(false);
    const [isHovered, setIsHovered] = useState(false)

    const controlsUp = useAnimationControls();
    const controlsDown = useAnimationControls();
    const controlsLeft = useAnimationControls();
    const controlsRight = useAnimationControls();
    const timeoutRef = useRef(null);

    const clearPendingTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }
    const lineConfigs = [
        { control: controlsUp, axis: "x", reset: "-100%", enter: "0%", leave: "100%" },
        { control: controlsDown, axis: "x", reset: "100%", enter: "0%", leave: "-100%" },
        { control: controlsLeft, axis: "y", reset: "-100%", enter: "0%", leave: "100%" },
        { control: controlsRight, axis: "y", reset: "100%", enter: "0%", leave: "-100%" },
    ];

    const animateTo = (phase, duration) => {
        const transition = { duration, ease: [0.6, 0.05, -0.01, 0.9] };
        return Promise.all(
            lineConfigs.map(({ control, axis, reset, enter, leave }) => {
                const value = phase === "reset" ? reset : phase === "enter" ? enter : leave;
                return control.start({ [axis]: value, transition });
            })
        );
    };

    const onHoverEnter = async () => {
        clearPendingTimeout();
        setIsHovered(true)
        await animateTo("reset", 0);
        await animateTo("enter", 0.5);
    };

    const onHoverLeave = async () => {
        setIsHovered(false)
        await animateTo("leave", 0.5);
        await animateTo("reset", 0.2);
    };


    const scale = {
        x: useMotionValue(1),
        y: useMotionValue(1)
    }
    const rotate = (distance) => {
        const angle = Math.atan2(distance.y, distance.x)
        animate(menuRef.current, { rotate: `${angle}rad` }, { duration: 0 });
        animate(textRef.current, { rotate: `${-angle}rad` }, { duration: 0 });
    }

    const manageMouseMove = useCallback((e) => {

        const { clientX, clientY } = e;
        const { top: topBounds, left: leftBounds, width: widthBounds, height: heightBounds } = menuRef.current.getBoundingClientRect();

        const center = { x: leftBounds + widthBounds / 2, y: topBounds + heightBounds / 2 };

        const distance = { x: clientX - center.x, y: clientY - center.y };

        if (boundsHovered) {
            rotate(distance);
            const absDistance = { x: Math.abs(distance.x), y: Math.abs(distance.y) };
            const newScaleX = transform(absDistance.x, [0, widthBounds / 2], [1, 1.15], { clamp: true }); // clamps => value will not exceed the range - true
            const newScaleY = transform(absDistance.y, [0, heightBounds / 2], [1, 0.9], { clamp: true });
            scale.x.set(newScaleX);
            scale.y.set(newScaleY);
        } else { return null }
    }, [boundsHovered, scale.x, scale.y, menuRef]);

    const manageBoundsHover = () => {
        setBoundsHovered(true);
    };

    const manageBoundsLeave = () => {
        setBoundsHovered(false);
        animate(menuRef.current, { scaleX: 1, scaleY: 1, }, { duration: 0.5 }, { type: 'spring', damping: 5, stiffness: 350, mass: 0.5 });
        animate(menuRef.current, { rotate: `0rad` }, { duration: 0 });
        animate(textRef.current, { rotate: `0rad` }, { duration: 0 });
    };

    useEffect(() => {
        window.addEventListener('mousemove', manageMouseMove);

        return () => {
            window.removeEventListener('mousemove', manageMouseMove);
        };
    }, [manageMouseMove]);

    useEffect(() => {
        const current = ButtonLinkBoundsRef.current;
        if (!boundsHovered) {
            animate(menuRef.current, { rotate: `0rad` }, { duration: 0 });
            animate(textRef.current, { rotate: `0rad` }, { duration: 0 });
        }
        if (current) {
            current.addEventListener('mouseenter', manageBoundsHover);
            current.addEventListener('mouseleave', manageBoundsLeave);

            return () => {
                if (current) {
                    current.removeEventListener('mouseenter', manageBoundsHover);
                    current.removeEventListener('mouseleave', manageBoundsLeave);
                }
            };
        }
    }, [ButtonLinkBoundsRef, manageBoundsHover, manageBoundsLeave]);

    useEffect(() => {
        if (ButtonLinkBoundsRef.current) {
            registerRef(ButtonLinkBoundsRef.current);
        }

        return () => {
            if (ButtonLinkBoundsRef.current) {
                unregisterRef(ButtonLinkBoundsRef.current);
            }
        }
    }, [ButtonLinkBoundsRef.current, registerRef, unregisterRef]);

    const template = ({ rotate, scaleX, scaleY }) => {
        return `rotate(${rotate}) scaleX(${scaleX}) scaleY(${scaleY})`
    }
    return (
        <Magnetic sensitivity='0.05'>
            {kontakt === "" ?
                <LinkDiv
                    template={template}
                    menuRef={menuRef}
                    ButtonLinkBoundsRef={ButtonLinkBoundsRef}
                    scale={scale}
                    onHoverEnter={onHoverEnter}
                    onHoverLeave={onHoverLeave}
                    href={href}
                    textRef={textRef}
                    controlsUp={controlsUp}
                    controlsDown={controlsDown}
                    controlsLeft={controlsLeft}
                    controlsRight={controlsRight}
                    textRotate={textRotate}
                    text={text}
                    isHovered={isHovered}
                />
                :
                <ButtonDiv
                    template={template}
                    menuRef={menuRef}
                    ButtonLinkBoundsRef={ButtonLinkBoundsRef}
                    scale={scale}
                    onHoverEnter={onHoverEnter}
                    onHoverLeave={onHoverLeave}
                    href={href}
                    textRef={textRef}
                    controlsUp={controlsUp}
                    controlsDown={controlsDown}
                    controlsLeft={controlsLeft}
                    controlsRight={controlsRight}
                    textRotate={textRotate}
                    text={text}
                    isHovered={isHovered}
                />
            }
        </Magnetic>
    )
}


const LinkDiv = ({ template, textRotate, menuRef, ButtonLinkBoundsRef, scale, onHoverEnter, onHoverLeave, href, textRef, controlsUp, controlsDown, controlsLeft, controlsRight, isHovered }) => {
    const [displayText, setDisplayText] = useState(textRotate || "");

    useEffect(() => {
        const baseText = textRotate || "";
        if (!isHovered) {
            setDisplayText(baseText);
            return;
        }

        const reversed = baseText.split("").reverse().join("");
        setDisplayText(reversed);

        const timeout = setTimeout(() => {
            setDisplayText(baseText);
        }, 150);

        return () => clearTimeout(timeout);
    }, [isHovered, textRotate]);
    return (
        <motion.div transformTemplate={template} ref={menuRef} style={{ scaleX: scale.x, scaleY: scale.y }} data-cursor-target className='rotateText' onMouseEnter={onHoverEnter} onMouseLeave={onHoverLeave}
        >
            <div ref={ButtonLinkBoundsRef} className='rotateText__bounds'></div>
            <Link href={href} ref={textRef} className="rotateText__text">
                <motion.div className="rotateText__line__up" initial={{ x: "-100%" }} animate={controlsUp} />
                <div className="rotateText__text__content">
                    <motion.div className="rotateText__line__left" initial={{ y: "100%" }} animate={controlsLeft} />
                    <ScrollToText text={textRotate ? displayText : text} duration={0.5} />
                    <motion.div className="rotateText__line__right" initial={{ y: "100%" }} animate={controlsRight} />
                </div>
                <motion.div className="rotateText__line__down" initial={{ x: "100%" }} animate={controlsDown} />
            </Link>
        </motion.div>
    )
}

const ButtonDiv = ({ template, menuRef, ButtonLinkBoundsRef, scale, onHoverEnter, onHoverLeave, textRotate, text, kontakt, textRef, controlsUp, controlsDown, controlsLeft, controlsRight, isHovered }) => {
    const [displayText, setDisplayText] = useState(textRotate || "");

    useEffect(() => {
        const baseText = textRotate || "";
        if (!isHovered) {
            setDisplayText(baseText);
            return;
        }

        const reversed = baseText.split("").reverse().join("");
        setDisplayText(reversed);

        const timeout = setTimeout(() => {
            setDisplayText(baseText);
        }, 150);

        return () => clearTimeout(timeout);
    }, [isHovered, textRotate]);
    return (
        <motion.div transformTemplate={template} ref={menuRef} style={{ scaleX: scale.x, scaleY: scale.y }} data-cursor-target className='rotateText' onMouseEnter={onHoverEnter} onMouseLeave={onHoverLeave}
        >
            <div ref={ButtonLinkBoundsRef} className='rotateText__bounds'></div>
            <button id="button" ref={textRef} className="rotateText__text">
                <motion.div className="rotateText__line__up" initial={{ x: "-100%" }} animate={controlsUp} />
                <div className="rotateText__text__content">
                    <motion.div className="rotateText__line__left" initial={{ y: "100%" }} animate={controlsLeft} />
                    <ScrollToText text={textRotate ? displayText : text} duration={0.5} />
                    <motion.div className="rotateText__line__right" initial={{ y: "100%" }} animate={controlsRight} />
                </div>
                <motion.div className="rotateText__line__down" initial={{ x: "100%" }} animate={controlsDown} />
            </button>
        </motion.div>
    )
}
