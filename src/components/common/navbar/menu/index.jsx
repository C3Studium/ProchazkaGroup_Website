import Magnetic from "@/components/common/Magnetic";
import { useCursorRef } from "@/context/CursorRefProvider";
import { } from "@/context/PerformanceProvider";
import { useAnimationControls } from "framer-motion";
import { useMotionValue, motion, animate, transform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollToText } from "../../TextAnim/scrollToText";
import ButtonLink from "../../ui/stickyButtons/buttons/buttonLink";
import { usePathname } from "next/navigation";


export default function Menu({ menu, setMenu }) {
    const { registerRef, unregisterRef } = useCursorRef();
    const menuBoundsRef = useRef(null);
    const menuRef = useRef(null);
    const textRef = useRef(null);
    const [boundsHovered, setBoundsHovered] = useState(false);

    const pathname = usePathname();

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
        await animateTo("reset", 0);
        await animateTo("enter", 0.5);
    };

    const onHoverLeave = async () => {
        await animateTo("leave", 0.5);
        await animateTo("reset", 0.2);
    };


    const textChange = {
        initial: {
            opacity: 0
        },
        open: {
            opacity: 1,
            transition: { duration: 0.5 }
        },
        closed: {
            opacity: 0,
            transition: { duration: 0.5 }
        }
    }

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
        animate(menuRef.current, { rotate: 0 }, { duration: 0.2, ease: [0.6, 0.05, -0.01, 0.9] });
        animate(textRef.current, { rotate: 0 }, { duration: 0.2, ease: [0.6, 0.05, -0.01, 0.9] });
    };

    useEffect(() => {
        window.addEventListener('mousemove', manageMouseMove);

        return () => {
            window.removeEventListener('mousemove', manageMouseMove);
        };
    }, [manageMouseMove]);

    useEffect(() => {

        if (!boundsHovered) {
            animate(menuRef.current, { rotate: `0rad` }, { duration: 0 });
            animate(textRef.current, { rotate: `0rad` }, { duration: 0 });
        }
        const current = menuBoundsRef.current;
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
    }, [menuBoundsRef, manageBoundsHover, manageBoundsLeave]);

    useEffect(() => {
        if (menuBoundsRef.current) {
            registerRef(menuBoundsRef.current);
        }

        return () => {
            if (menuBoundsRef.current) {
                unregisterRef(menuBoundsRef.current);
            }
        }
    }, [menuBoundsRef.current, registerRef, unregisterRef]);

    const template = ({ rotate, scaleX, scaleY }) => {
        return `rotate(${rotate}) scaleX(${scaleX}) scaleY(${scaleY})`
    }
    return (
        <div className="navbar__container">
            <ButtonLink textRotate="ProcházkaGroup" href="/" />
            <Magnetic sensitivity='0.15'>
                <motion.div
                    transformTemplate={template}
                    ref={menuRef}
                    style={{ scaleX: scale.x, scaleY: scale.y }}
                    data-cursor-target
                    className='navbar__menu'
                    onMouseEnter={onHoverEnter}
                    onMouseLeave={onHoverLeave}
                    onClick={() => setMenu(!menu)}
                >
                    <div ref={menuBoundsRef} className='navbar__bounds'></div>
                    <div ref={textRef} className="navbar__text">
                        <motion.div className="navbar__line__up" initial={{ x: "-100%" }} animate={controlsUp} />
                        <div className="navbar__text__content">
                            <motion.div className="navbar__line__left" initial={{ y: "100%" }} animate={controlsLeft} />
                            <ScrollToText text={menu ? "Close" : "Menu"} duration={0.5} />
                            <motion.div className="navbar__line__right" initial={{ y: "100%" }} animate={controlsRight} />
                        </div>
                        <motion.div className="navbar__line__down" initial={{ x: "100%" }} animate={controlsDown} />
                    </div>
                </motion.div>
            </Magnetic>
            <ButtonLink textRotate={pathname === "/o-nas" ? "Navázat Spolupráci" : "Spojit se"} kontakt={true} />
        </div>
    )
}
