import RoundButton from "@/components/common/ui/stickyButtons/buttons/RoundButton"
import { people as staticPeople } from "@/constants/people"
import { useToast } from "@/hooks/use-toast"
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useFetchDatabase } from "@/hooks/useFetchDatabase"
import MainText from "@/components/common/TextAnim/MainText"
import Grid from "@/components/common/grid"
import { usePerformance } from "@/context/PerformanceProvider"
import SubText from "@/components/common/TextAnim/SubText"
import ChooseBar from "@/components/common/chooseBar"
import { trackEvent } from "@/hooks/trackEvent"
import ContactModem from "@/components/modems/Contact"


export default function BenefitReminder() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [previewIndex, setPreviewIndex] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [peopleData, setPeopleData] = useState(staticPeople)
    const [isOpen, setIsOpen] = useState(false)
    const { toast } = useToast()
    const { shouldReduceAnimations } = usePerformance()

    // Add refs for scroll tracking
    const sectionRef = useRef(null)
    const subtextRef = useRef(null)
    const mainTextRef = useRef(null)

    // Set up scroll tracking for parallax effects
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    })

    // Create smooth scroll progress
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 300,
        damping: 30,
        restDelta: 0.001
    })

    // Parallax transforms for heading elements
    const subtextY = useTransform(
        smoothProgress,
        [0, 0.5, 1],
        shouldReduceAnimations ? [0, 0, 0] : [-30, 0, 30]
    )

    const mainTextY = useTransform(
        smoothProgress,
        [0, 0.5, 1],
        shouldReduceAnimations ? [0, 0, 0] : [40, 0, -40]
    )

    const buttonX = useTransform(
        smoothProgress,
        [0, 0.5, 1],
        shouldReduceAnimations ? ["50%", "50%", "50%"] : ["80%", "50%", "30%"]
    )

    // Fixed button visibility - hide when scrolled into section
    const fixedButtonOpacity = useTransform(
        smoothProgress,
        [0, 0.1, 0.2],
        [1, 0.5, 0]
    )

    const fixedButtonScale = useTransform(
        smoothProgress,
        [0, 0.1, 0.2],
        [1, 0.8, 0]
    )

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }, [])


    // Disable/enable Lenis scrolling when modal opens/closes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.lenis) return;

        if (isOpen) {
            // Disable scrolling when modal is open
            window.lenis.stop();
            document.body.style.overflow = 'hidden';
        } else {
            // Re-enable scrolling when modal is closed
            window.lenis.start();
            document.body.style.overflow = '';
        }

        // Cleanup function to ensure scrolling is re-enabled if component unmounts
        return () => {
            if (typeof window !== 'undefined' && window.lenis) {
                window.lenis.start();
                document.body.style.overflow = '';
            }
        };
    }, [isOpen]);

    const activeIndex = previewIndex ?? currentIndex


    const { fetchPeople } = useFetchDatabase()

    useEffect(() => {
        const loadPeopleData = async () => {
            try {
                // Try to fetch from the database first
                const fetchedData = await fetchPeople();
                console.log("Fetched people from database:", fetchedData);

                if (fetchedData && fetchedData.length > 0) {
                    // Merge fetched data with staticPeople to fill any missing fields
                    const updatedPeople = fetchedData.map(dbPerson => {
                        const staticPerson = staticPeople.find(p => p.name === dbPerson.name) || {};
                        return {
                            ...staticPerson,
                            ...dbPerson,
                            moto: dbPerson.moto || staticPerson.moto || 'Finanční poradenství ve vašich službách',
                            likes: dbPerson.likes ?? staticPerson.likes ?? '100',
                            reviews: dbPerson.reviews ?? staticPerson.reviews ?? '10',
                            tel: dbPerson.tel || staticPerson.tel || '+420777777777',
                            src: dbPerson.src || staticPerson.src || '',
                            alt: dbPerson.alt || staticPerson.alt || '',
                        };
                    });
                    setPeopleData(updatedPeople);
                } else {
                    setPeopleData(staticPeople);
                }
            } catch (error) {
                setPeopleData(staticPeople);
                toast({
                    title: "Chyba!",
                    description: "Nepodařilo se načíst data.",
                    variant: "destructive"
                });
            }
        };
        loadPeopleData();
    }, []);

    const handleCopyName = async () => {
        // Open the contact modal instead of copying phone number
        setIsOpen(true)

        // Track modal opening
        trackEvent("benefit_reminder_modal_opened", {
            consultant_name: peopleData[activeIndex].name,
            device_type: isMobile ? "mobile" : "desktop",
            timestamp: new Date().toISOString()
        });
    }
    return (
        <section className="BenefitReminder" ref={sectionRef}>
            {/* Fixed CTA Button - disappears when scrolling into section */}
            <motion.div
                className="fixed-cta-button"
                style={{
                    position: 'fixed',
                    top: isMobile ? '100px' : '55vh', // Adjust for mobile menu
                    right: isMobile ? '1rem' : '1.5rem', // Closer to edge on mobile
                    zIndex: 1000,
                    opacity: fixedButtonOpacity,
                    scale: fixedButtonScale,
                    pointerEvents: smoothProgress.get() > 0.1 ? 'none' : 'auto',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
                    transition: shouldReduceAnimations ? 'none' : 'all 0.3s ease',
                    transform: isMobile ? 'scale(0.9)' : 'scale(1)' // Smaller on mobile
                }}
                onClick={handleCopyName}
            >
                <RoundButton
                    href=''
                    text={isMobile ? 'Zapojit se' : 'Zapojit se hned'} // Shorter text on mobile
                    disableLink={true}
                />
            </motion.div>

            <Grid size="20vh" key={"BenefitReality"} />
            <div className="BenefitReminder__Header">
                <motion.div
                    className="Main__text"
                    ref={subtextRef}
                    style={{ y: subtextY }}
                >
                    <div className="Header__wrapper">
                        <h3>
                            01
                        </h3>
                        <SubText className={"subtext__Container"} text={"80 % našich členů získá svou první odměnu do dvou týdnů."} initialColor="#050A10" />
                    </div>
                </motion.div>
                <motion.div
                    className="Header"
                    ref={mainTextRef}
                    style={{ y: mainTextY }}
                >
                    <MainText initialColor={"#050A10"} text='Přidejte se, doporučte a začněte získávat.' />
                </motion.div>
            </div>
            <div className="BenefitReminder__Personal__wrapper">
                <div className="BenefitReminder__Personal__choice">
                    <div className="BenefitReminder__Personal__choice__container">
                        {peopleData.map((person, i) => {
                            const { name, likes, reviews, moto, src, alt } = person

                            return (
                                <div className="BenefitReminder__Personal__choice__wrapper" key={`wrappersfs${i}`}>
                                    <div className="BenefitReminder__Personal__choice__image__container" key={`wsarappersfs${i}`} style={{ zIndex: 1 + i }}>
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeIndex}
                                                className="BenefitReminder__Personal__choice__image"
                                                initial={{ opacity: 0, x: -100 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -100 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Image
                                                    src={peopleData[activeIndex].src}
                                                    alt={peopleData[activeIndex].alt}
                                                    fill={true}
                                                    sizes="50vw"
                                                    priority={false}
                                                    quality={80}
                                                    loading="lazy"
                                                    placeholder="blur"
                                                    blurDataURL="data:image/webp"
                                                />
                                            </motion.div>
                                        </AnimatePresence>

                                    </div>
                                    <div className="BenefitReminder__Personal__choice__Data__container">
                                        <div className="BenefitReminder__choice__Input">
                                            <div className="person__container">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={activeIndex}
                                                        className="name"
                                                        initial={{ opacity: 0, y: -20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        transition={{
                                                            duration: 0.2,
                                                            ease: "easeInOut"
                                                        }}
                                                    >
                                                        <p>| {peopleData[activeIndex].name}</p>
                                                        <p>{peopleData[activeIndex].tel}</p>
                                                    </motion.div>
                                                </AnimatePresence>
                                            </div>
                                            <div className="buttons">
                                                <motion.button
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setMenuOpen(!menuOpen)}
                                                    className="menu__button"
                                                >
                                                    <motion.div
                                                        variants={{
                                                            open: { rotate: 0 },
                                                            closed: { rotate: 180 }
                                                        }}
                                                        initial="closed"
                                                        animate={menuOpen ? "open" : "closed"}
                                                        transition={{ duration: 0.2 }}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Image
                                                            src='/assets/svg/arrowup.svg'
                                                            alt="arrow"
                                                            width={30}
                                                            height={30}
                                                            quality={60}
                                                            priority={false}
                                                            loading="lazy"
                                                        />
                                                    </motion.div>
                                                </motion.button>

                                                <ChooseBar
                                                    people={peopleData}
                                                    isOpen={menuOpen}
                                                    onPersonClick={(index) => {
                                                        setCurrentIndex(index);
                                                        setMenuOpen(false);
                                                        setPreviewIndex(null);
                                                    }}
                                                    onHoverStart={(index) => setPreviewIndex(index)}
                                                    onHoverEnd={() => setPreviewIndex(null)}
                                                />
                                            </div>
                                        </div>
                                        <div className="Reviews_stats">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={activeIndex}
                                                    className="ThumsUp"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{
                                                        duration: 0.2,
                                                        delay: 0.1
                                                    }}
                                                >
                                                    <p>{peopleData[activeIndex].likes}</p>
                                                    <Image
                                                        src='/assets/svg/thumbsup.svg'
                                                        alt="thumbsUp_icon"
                                                        width={50}
                                                        height={50}
                                                        priority={false}
                                                        quality={60}
                                                        loading="lazy"
                                                        placeholder="blur"
                                                        blurDataURL="data:image/svg"
                                                    />
                                                </motion.div>
                                            </AnimatePresence>

                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={activeIndex}
                                                    className="Comments"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{
                                                        duration: 0.2,
                                                        delay: 0.15
                                                    }}
                                                >
                                                    <p>{peopleData[activeIndex].reviews}</p>
                                                    <Image
                                                        src='/assets/svg/comment.svg'
                                                        alt="review__icon"
                                                        width={50}
                                                        height={50}
                                                        priority={false}
                                                        quality={60}
                                                        loading="lazy"
                                                        placeholder="blur"
                                                        blurDataURL="data:image/webp"
                                                    />
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="CTA__Wrapper">
                <div className="devider__line" />
                <motion.div style={{ left: buttonX }} className="button__wrapper" onClick={handleCopyName}>
                    <RoundButton href='' text='Zapojit se hned' disableLink={true} />
                </motion.div>
            </div>


            <div className="Footer__wrapper">
                <h2>?</h2>
                <p>Nejste našimi Klienty?</p>
                <div className="svg__wrapper">
                    <motion.div
                        className="svg__container"
                        animate={{
                            y: [0, 10, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            ease: "easeInOut",
                            repeat: Infinity,
                            repeatType: "loop"
                        }}
                    >
                        <Image
                            src='/assets/svg/ArrowDown.svg'
                            alt="arrow-down"
                            height={60}
                            width={30}
                            priority={false}
                            quality={60}
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/svg"
                        />
                    </motion.div>
                </div>
            </div>
            <AnimatePresence mode="wait">
                {isOpen && (
                    <ContactModem
                        setIsOpen={setIsOpen}
                        isOpen={isOpen}
                        people={peopleData}
                        currentIndex={currentIndex}
                        setCurrentIndex={setCurrentIndex}
                        activeIndex={activeIndex}
                        previewIndex={previewIndex}
                        setPreviewIndex={setPreviewIndex}
                    />
                )}
            </AnimatePresence>
        </section>
    )
}