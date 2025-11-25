import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const menuVariants = {
    open: {
        clipPath: "inset(0% 0% 0% 0% round 10px)",
        scaleX: 1,
        scaleY: 1,
        transition: {
            type: "spring",
            bounce: 0,
            duration: 0.7,
            delayChildren: 0.3,
            staggerChildren: 0.05,
            scaleX: { duration: 0.3, ease: "circOut" },
            scaleY: { duration: 0.4, delay: 0.2, ease: "circOut" }
        }
    },
    closed: {
        clipPath: "inset(10% 50% 90% 50% round 10px)",
        scaleX: 0,
        scaleY: 0,
        transition: {
            type: "spring",
            bounce: 0,
            duration: 0.3
        }
    }
};

const itemVariants = {
    open: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    closed: { opacity: 0, y: 20, transition: { duration: 0.2 } }
};

export default function ChooseBar({ 
    people, 
    isOpen, 
    onPersonClick, 
    onHoverStart, 
    onHoverEnd 
}) {
    const scrollRef = useRef(null);
    const navRef = useRef(null);
    
    // Add wheel event handling for mouse scroll
    useEffect(() => {
        const scrollContainer = scrollRef.current;
        
        if (!scrollContainer) return;
        
        const handleWheel = (e) => {
            // Prevent the default scrolling behavior
            e.preventDefault();
            
            // Apply the scroll delta to the container
            scrollContainer.scrollTop += e.deltaY;
        };
        
        // Add the event listener when the menu is open
        if (isOpen && scrollContainer) {
            scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
        }
        
        // Cleanup function to remove event listener
        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('wheel', handleWheel);
            }
        };
    }, [isOpen]); // Re-run effect when isOpen changes

    // Add effect to disable Lenis scroll on hover
    useEffect(() => {
        const nav = navRef.current;
        
        if (!nav || !isOpen) return;
        
        const handleMouseEnter = () => {
            // Disable Lenis scroll when mouse enters the component
            if (window.lenis) {
                window.lenis.stop();
            }
        };
        
        const handleMouseLeave = () => {
            // Re-enable Lenis scroll when mouse leaves the component
            if (window.lenis) {
                window.lenis.start();
            }
        };
        
        nav.addEventListener('mouseenter', handleMouseEnter);
        nav.addEventListener('mouseleave', handleMouseLeave);
        
        return () => {
            // Cleanup: remove event listeners and ensure Lenis is started
            nav.removeEventListener('mouseenter', handleMouseEnter);
            nav.removeEventListener('mouseleave', handleMouseLeave);
            
            // Make sure Lenis is re-enabled when the component unmounts
            if (window.lenis) {
                window.lenis.start();
            }
        };
    }, [isOpen]);

    return (
        <motion.nav
            ref={navRef}
            initial={false}
            animate={isOpen ? "open" : "closed"}
            className="person__menu scrollable__menu"
            variants={menuVariants}
            style={{
                width: "350px",
                maxHeight: "250px",
                overflow: "hidden",
                position: "absolute",
                zIndex: 100,
                background: "var(--bgColor)",
                borderRadius: "10px",
                boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.1)",
                top: "80%",
            }}
        >
            <motion.div 
                className="scroll__container"
                ref={scrollRef}
                style={{
                    overflowY: "auto",
                    maxHeight: "250px",
                    width: "100%",
                    paddingRight: "10px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--hColor) transparent",
                    scrollBehavior: "smooth"
                }}
            >
                <motion.ul
                    variants={menuVariants}
                    className="menu__list"
                    style={{
                        listStyle: "none",
                        padding: "10px 0",
                        margin: 0
                    }}
                >
                    {people.map((person, index) => {
                        
                        return(
                        <motion.li
                            key={index}
                            variants={itemVariants}
                            onHoverStart={() => onHoverStart(index)}
                            onHoverEnd={onHoverEnd}
                            onClick={() => onPersonClick(index)}
                            style={{
                                padding: "12px 20px",
                                cursor: "pointer",
                                color: "var(--wText)",
                                fontFamily: "Switzer-Light",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                transition: "background-color 0.2s ease"
                            }}
                            whileHover={{
                                backgroundColor: "rgba(255, 255, 255, 0.05)"
                            }}
                        >
                            {person.name}
                        </motion.li>
                    )})}
                </motion.ul>
            </motion.div>
        </motion.nav>
    );
}