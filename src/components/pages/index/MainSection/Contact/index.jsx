
import SubText from "@/components/anim/SubText";
import ContactModem from "@/components/modems/ContactModem"
import CopyText from "@/components/ui/copyText"
import RoundButton from "@/components/ui/stickyButtons/buttons/RoundButton"
import SVGButton from "@/components/ui/stickyButtons/buttons/SvgButton"
import { people as staticPeople } from "@/constants/people"
import { useToast } from "@/hooks/use-toast"
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion"
import NextImage from "next/image"
import { useEffect, useRef, useState } from "react"
import { useFetchDatabase } from "@/hooks/useFetchDatabase"
import { usePerformance } from "@/context/PerformanceProvider"
import MainText from "@/components/anim/MainText";
import Grid from "@/components/common/grid";
import Link from "next/link";
import ChooseBar from "@/components/common/chooseBar";
import { trackEvent } from "@/hooks/trackEvent";


export default function Contact({text}) {
    // Performance
    const { shouldReduceAnimations } = usePerformance();

    const [ isOpen, setIsOpen ] = useState(false)
    const [ menuOpen, setMenuOpen ] = useState(false)
    const [ currentIndex, setCurrentIndex ] = useState(0)
    const [previewIndex, setPreviewIndex] = useState(null)
    const [peopleData, setPeopleData] = useState(staticPeople)
    const sectionRef = useRef()

    
    const { scrollYProgress: phoneScrollProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'end 0.7'],
    })


    const { scrollYProgress: messageScrollProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'end 0.7'],
    })

    const { scrollYProgress: bgScrollProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });

    // Create smooth progress for better animation
    const smoothBgProgress = useSpring(bgScrollProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    const phoneX = useTransform(
        phoneScrollProgress,
        [0, 0.5, 1], 
        [400, -100, -200]
    )

    // Background parallax effect - moves slower than scroll speed
    const bgY = useTransform(
        smoothBgProgress,
        [0, 1],
        ["-10%", "10%"] // Background moves 20% as you scroll through section
    );

    const bgScale = useTransform(
        smoothBgProgress,
        [0, 1],
        [1, 1.1] // Slight zoom as you scroll
    );

    const messageX = useTransform(
        messageScrollProgress,
        [0, 0.6, 1], // Slightly delayed
        [500, -50, -150] // Different positions
    )

    const activeIndex = previewIndex ?? currentIndex
    const [isMobile, setIsMobile] = useState(false)
    const { toast } = useToast()

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
    
    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }, [])

    const handleCopyName = async () => {
        if (isMobile) {
            trackEvent("contact_phone_button_clicked", {
                action: "call",
                consultant_name: peopleData[activeIndex].name,
                phone_number: peopleData[activeIndex].tel,
                device_type: "mobile",
                timestamp: new Date().toISOString()
            });
            window.location.href = `tel:${peopleData[activeIndex].tel}`
            return
        }

        try {
            await navigator.clipboard.writeText(peopleData[activeIndex].tel)
            toast({
                title: "Úspěch!",
                description: "Tel.číslo bylo zkopírováno do schránky",
                variant: "success"
            })
            trackEvent("contact_phone_button_clicked", {
                action: "copy",
                consultant_name: peopleData[activeIndex].name,
                phone_number: peopleData[activeIndex].tel,
                device_type: "desktop",
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Copy error:', err)
            trackEvent("contact_phone_copy_failed", {
                consultant_name: peopleData[activeIndex].name,
                error: err.message,
                timestamp: new Date().toISOString()
            });
            toast({
                title: "Chyba!",
                description: "Kopírování se nezdařilo",
                variant: "destructive"
            })
        }
    }


    const {fetchPeople} = useFetchDatabase()
            

    useEffect(() => {
        const loadPeopleData = async () => {
            try {
                // Try to fetch from the database first
                const fetchedData = await fetchPeople();
                console.log("Fetched people from database:", fetchedData); // <-- Add this line

                if (fetchedData && fetchedData.length > 0) {
                    // Merge fetched data with staticPeople to fill any missing fields
                    const updatedPeople = fetchedData.map(dbPerson => {
                        // Find matching static person for fallback fields
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
                    // If database returns empty, fallback to staticPeople
                    setPeopleData(staticPeople);
                }
            } catch (error) {
                // On error, fallback to staticPeople
                setPeopleData(staticPeople);
                toast({
                    title: "Upozornění",
                    description: "Některá data se nepodařilo načíst ze serveru.",
                    variant: "warning"
                });
            }
        };

        loadPeopleData();
    }, []);

        // Add this useEffect for preloading images
    useEffect(() => {
        // Function to preload images
        const preloadImages = async () => {
            const imageUrls = staticPeople.map(person => person.src)
            
            try {
                // Preload all images in parallel
                await Promise.all(
                    imageUrls.map(url => {
                        return new Promise((resolve, reject) => {
                            const img = new Image()
                            img.onload = resolve
                            img.onerror = reject
                            img.src = url
                        })
                    })
                )
                console.log('All team member images preloaded')
            } catch (error) {
                console.error('Error preloading images:', error)
            }
        }
        
        preloadImages()
    }, [])



   const handleMessage = () => {
        const activePerson = peopleData[activeIndex]
        
        if (!activePerson || !activePerson.tel) {
            trackEvent("contact_message_failed", {
                consultant_name: activePerson?.name || "unknown",
                error: "phone_number_unavailable",
                timestamp: new Date().toISOString()
            });
            toast({
                title: "Chyba!",
                description: "Telefonní číslo není k dispozici",
                variant: "destructive"
            })
            return
        }

        const message = `Dobrý den, mám zájem o více informací o vašich službách.`
        
        // Proper phone number formatting for WhatsApp
        let phoneNumber = activePerson.tel
            .replace(/\s/g, '') // Remove spaces
            .replace(/\+/g, '') // Remove + sign
            .replace(/\(/g, '') // Remove parentheses
            .replace(/\)/g, '') // Remove parentheses
            .replace(/-/g, '') // Remove dashes
        
        // Add country code if missing (assuming Czech Republic +420)
        if (!phoneNumber.startsWith('420') && phoneNumber.length <= 9) {
            phoneNumber = '420' + phoneNumber
        }
        
        try {
            trackEvent("contact_message_button_clicked", {
                consultant_name: activePerson.name,
                phone_number: activePerson.tel,
                formatted_number: phoneNumber,
                device_type: isMobile ? "mobile" : "desktop",
                platform: "whatsapp",
                timestamp: new Date().toISOString()
            });
            
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
            
            if (isMobile) {
                window.location.href = whatsappUrl
            } else {
                window.open(whatsappUrl, '_blank')
            }
        } catch (err) {
            console.error('WhatsApp error:', err)
            trackEvent("contact_message_failed", {
                consultant_name: activePerson.name,
                error: err.message,
                platform: "whatsapp",
                timestamp: new Date().toISOString()
            });
            toast({
                title: "Chyba!",
                description: "Nepodařilo se otevřít WhatsApp",
                variant: "destructive"
            })
        }
    }
    

    return (
        <section className="ContactMain" ref={sectionRef}>
            <Grid size="20vh"/>

            <div className="ContactMain__bg">
                <motion.div 
                    style={{ 
                        y: bgY, 
                        scale: bgScale,
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        overflow: "hidden"
                    }}
                >
                    <NextImage 
                        src="/assets/backgrounds/soundBG.webp" //NOTE: for production build always use the proper name path
                        fill={true}
                        alt="tree"
                        priority={true}
                        quality={100}
                        sizes="50vw"
                        style={{ objectFit: "cover" }}
                    />
                </motion.div>
                <div className="cover"/>
            </div>
            <div className="svg__container">
                <div className="svg__Header">
                    <MainText initialColor="#050A10" className={"mainText__container"} text={'Je to na vás... <span>Finanční nezávislost,</span><br />nebo další roky na místě?<br /><span>Přidejte se k našim 3000+ klientům</span>,<br />kteří už dávno <span>začali vyhrávat.</span>'}/>
                </div>
                <svg 
                    className="background-svg" 
                    width="100%" 
                    height="100%" 
                    viewBox="0 0 1920 665" 
                    fill="none" 
                    preserveAspectRatio="none" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M-10 -10H1930V550.859C1930 611.088 1880.64 661 1820.41 661H768.327C708.099 661 658.327 611.088 658.327 550.859V489.39C658.327 429.162 608.556 379.39 548.327 379.39H100.406C40.1779 379.39 -9.59375 334.619 -9.59375 274.39V-10Z" 
                        fill="#fff"
                    />
                </svg>

                <div className="svg__text">
                    <SubText className={"subtext__container"} initialColor="#fff" text={text}/>
                </div>
            </div>

            
            
            <div className="Contact__Personal">

                <div className="Contact__Personal__choice">
                    <div className="Contact__Personal__choice__container">
                        {peopleData.map(( person, i) => {
                            const { name, likes, reviews, moto, src, alt } = person

                            return (
                                <div className="Contact__Personal__choice__wrapper" key={i}>
                                    <div className="Contact__Personal__choice__image__container" key={i} style={{ zIndex: 1 + i}}>
                                        <AnimatePresence mode="wait">
                                            <motion.div 
                                                key={activeIndex}
                                                className="Contact__Personal__choice__image"
                                                initial={{ opacity: 0, x: -100 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -100 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <NextImage 
                                                    src={peopleData[activeIndex].src} 
                                                    alt={peopleData[activeIndex].alt} 
                                                    fill={true}
                                                    priority={true} // Change to true for faster loading
                                                    loading="eager" // Change to eager 
                                                    sizes='(max-width: 768px) 100vw, 50vw' // Better sizes for responsive
                                                    quality={90}
                                                    placeholder="blur"
                                                    blurDataURL="data:image/webp"
                                                />
                                            </motion.div>
                                            </AnimatePresence>
                                            
                                    </div>
                                    <div className="Contact__Personal__choice__Data__container">
                                        <AnimatePresence mode="wait">
                                            <motion.div 
                                                key={activeIndex}
                                                className="Moto"
                                                initial={{ opacity: 0, y: -50 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -50 }}
                                                transition={{ 
                                                    duration: 0.2,
                                                    delay: 0.05
                                                }}
                                            >
                                                <CopyText text={peopleData[activeIndex].moto} type={'phone'} />
                                                <CopyText text={peopleData[activeIndex].tel} type={'phone'} />
                                            </motion.div>
                                        </AnimatePresence>
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
                                                    <NextImage  
                                                        src='/assets/svg/thumbsup_w.svg'
                                                        alt="thumbsUp_icon" 
                                                        width={50} 
                                                        height={50} 
                                                        priority={false} 
                                                        loading="lazy" 
                                                        quality={60}
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
                                                    <NextImage  
                                                        src='/assets/svg/comment_w.svg' 
                                                        alt="reviews__icon" 
                                                        width={50} 
                                                        height={50} 
                                                        priority={false} 
                                                        loading="lazy" 
                                                        quality={60}
                                                        placeholder="blur"
                                                        blurDataURL="data:image/svg"
                                                    /> 
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                   
                    <div className="Contact__choice__Input">
                        <div  className="devider"/>
                        <div className="header">
                            <div className="index">
                                <h3>Γ</h3>
                            </div>
                            <p>Váš Poradce:</p>
                        </div>
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
                                    <p>{peopleData[activeIndex].name}</p>
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
                                    <NextImage 
                                        src='/assets/svg/arrowup_w.svg' 
                                        alt="arrow"
                                        width={30} 
                                        height={30}
                                        priority={false}
                                        loading="lazy"
                                        quality={60}
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
                        <div  className="devider"/>
                    </div>
                </div>

                <div className="contact__wrapper">
                    <div className="Contact__CTA__buttons">
                        <div className="Contact__CTA__buttons__container">
                            <motion.div 
                                className="cta__button"
                                style={shouldReduceAnimations ? { x: -125 } : { x: phoneX }}
                                onClick={handleCopyName}
                            >
                                <SVGButton src='/assets/svg/phoneIcon.svg' altText='CallIcon' />
                            </motion.div>
                            <motion.div 
                                className="cta__button"
                                style={shouldReduceAnimations ? { x: -50 } : { x: messageX }}
                                onClick={handleMessage}
                            >
                                <SVGButton src='/assets/svg/MessageIcon.svg' altText='TextIcon' />
                            </motion.div>
                        </div>
                        <div className="devider"/>
                    </div>

                    <div className="additional__wrapper">
                        <div className="Contact__CTA__optional">
                            <p className="infoText">Jste více tradiční?</p>
                            <div className="devider__vertical"/>
                            <div className="Button" onClick={() => setIsOpen(true)}>
                                <RoundButton href='#' text='Použít E-mail' disableLink={true}/>
                            </div>
                        </div>
                        <div className="Contact__Personal__addInfo">
                            <div className="addInfo__text">
                                <p>Potřebujete Poradit?</p>
                                <p> | 8-16</p>
                            </div>
                            <div className="addInfo__phoneNumber">
                                <CopyText text={'+420 705 500 200'} type={'phone'} />                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="Contact__CTA">
                

                <div className="Contact__CTA__Header">
                    <div className="header">
                        <p>Kde nás najdete | mapa</p>

                        <NextImage 
                            src='/assets/svg/mapIcon.svg' 
                            alt="map_icon" 
                            width={40} 
                            height={40} 
                            priority={false} 
                            loading="lazy" 
                            quality={60}
                            placeholder="blur"
                            blurDataURL="data:image/svg"
                        />
                    </div>
                    <p>Smetanova 78/1, 397 01 Písek</p>
                    <Link href="https://maps.app.goo.gl/AQWz24PX5EKAGGtY6" target="_blank" rel="noopener noreferrer">
                        <SVGButton src='/assets/svg/mapIcon.svg' altText='TextIcon' />
                    </Link>
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