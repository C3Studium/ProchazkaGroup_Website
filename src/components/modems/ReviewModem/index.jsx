
import RoundButton from "@/components/ui/stickyButtons/buttons/RoundButton"
import SVGButton from "@/components/ui/stickyButtons/buttons/SvgButton"
import { people as staticPeople} from "@/constants/people"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useReviewForm } from '@/hooks/useReviewForm'
import { useToast } from '@/hooks/use-toast'
import { useFetchDatabase } from "@/hooks/useFetchDatabase"
import Grid from "@/components/common/grid"
import ChooseBar from "@/components/common/chooseBar"
import { trackEvent } from "@/hooks/trackEvent"
import useResend from "@/hooks/useResend"

const modemAnim = {
    open: {
        x: "0",
        opacity: 1,
        transition: {
            duration: 0.6,
            ease: [0.76, 0, 0.24, 1]
        },
    },
    closed: {
        x: "-100%",
        opacity: 0,
        transition: {
            duration: 0.6,
            ease: [0.76, 0, 0.24, 1]
        },
    }
}



export default function ReviewModem ({ isOpen, setIsOpen, onSubmitted}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [ currentIndex, setCurrentIndex ] = useState(0)
    const [previewIndex, setPreviewIndex] = useState(null)
    const [peopleData, setPeopleData] = useState(staticPeople) // Přidáno

    const { sendEmail } = useResend();

    const activeIndex = previewIndex ?? currentIndex

    const { toast } = useToast()
    const {
        formData,
        setFormData,
        loading,
        handleSubmit: handleReviewSubmit
    } = useReviewForm()

    
    const {fetchPeople} = useFetchDatabase()

    // Set default person on mount
        useEffect(() => {
        const loadPeopleData = async () => {
            try {
                // Try to fetch from the database first
                const fetchedData = await fetchPeople();

                if (fetchedData && fetchedData.length > 0) {
                    // Sort by id ascending
                    const sortedPeople = [...fetchedData].sort((a, b) => a.id - b.id);
                    const updatedPeople = sortedPeople.map(dbPerson => {
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
                            consultantId: dbPerson.consultantId || staticPerson.consultantId || ''
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

    useEffect(() => {
        if (
            isOpen &&
            peopleData.length > 0 &&
            !formData.consultantId
        ) {
            setFormData(prev => ({
                ...prev,
                consultantId: peopleData[0].consultantId,
                consultantName: peopleData[0].name,
                reviewType: peopleData[0].name === "Benefit Program" ? "benefitprogram" : "poradce"
            }));
            setCurrentIndex(0);
            setPreviewIndex(null);
        }
    }, [isOpen, peopleData, formData.consultantId, setFormData]);

    const handleSubmit = async (e) => {
        e?.preventDefault()
        
        const result = await handleReviewSubmit()
        
        if (result.success) {
            // Track successful review submission with enhanced data
            trackEvent("review_submitted_successfully", {
                consultant_name: peopleData[activeIndex].name,
                customer_name: formData.customerName,
                message_length: formData.message.length,
                review_type: formData.reviewType,
                form_type: "review_modem",
                consultant_id: formData.consultantId,
                timestamp: new Date().toISOString()
            });

            // Track review for specific person/entity
            const personSlug = peopleData[activeIndex].name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            trackEvent(`review_submitted_${personSlug}`, {
                consultant_name: peopleData[activeIndex].name,
                customer_name: formData.customerName,
                review_type: formData.reviewType,
                consultant_id: formData.consultantId,
                timestamp: new Date().toISOString()
            });

            // Track different completion events based on type
            const completionEventType = peopleData[activeIndex].name === "Benefit Program" ? "benefit_program_review_completed" : "consultant_review_completed";
            trackEvent(completionEventType, {
                consultant_name: peopleData[activeIndex].name,
                form_type: "review_modem",
                review_type: formData.reviewType,
                consultant_id: formData.consultantId,
                timestamp: new Date().toISOString()
            });

        } else {
            // Track review submission failure with enhanced data
            trackEvent("review_submission_failed", {
                consultant_name: peopleData[activeIndex].name,
                customer_name: formData.customerName,
                error_message: result.message,
                form_type: "review_modem",
                review_type: formData.reviewType,
                consultant_id: formData.consultantId,
                timestamp: new Date().toISOString()
            });
        }
        
        toast({
            title: result.success ? "Úspěch!" : "Chyba!",
            description: result.message,
            variant: result.success ? "success" : "destructive"
        })

        if (result.success) {
            // notify parent to refresh reviews and set filter to newest
            try {
                //implement sending email
                sendEmail({
                    template: "recenze-user",
                    to: formData.email,
                    data: formData
                });
                sendEmail({
                    template: "recenze-admin",
                    to: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
                    data: formData
                });
                if (onSubmitted) await onSubmitted()
            } catch (err) {
                console.error('onSubmitted callback failed:', err)
            }

            setIsOpen(false)
        }
    }

    return(
        <motion.section 
            className="ReviewModem"
            initial={{ x: "100%", opacity: 0}}
            animate="open"
            exit="closed"
            variants={modemAnim}
        >
            <Grid size="20vh" key={"ReviewsModem"}/>
            <div className="button" onClick={() => setIsOpen(!isOpen)}>
                <SVGButton src='/assets/svg/exit.svg' altText='close_icon'/>
                <p>Zrušit</p>
            </div>

            <div className="checkUp">
                <div className="Personal">
                    <div className="Personal__container">
                        <div className="ImageConatiner">
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={activeIndex}
                                    className="image"
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
                                        quality={100}
                                        priority={false}
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL="data:image/webp"
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="Info__container">
                            <div className="moto">
                                
                                <div className="moto__text">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={activeIndex}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {peopleData[activeIndex].moto}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>

                                <div className="moto__name">
                                    <div className="devider"/>
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={activeIndex}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {peopleData[activeIndex].name}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
                                <div className="stats">
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
                                                src='/assets/svg/thumbsup_w.svg' 
                                                alt="thumbsUp_icon" 
                                                width={35} 
                                                height={35} 
                                                style={{ paddingBottom: 5}}
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
                                            <Image  
                                                src='/assets/svg/comment_w.svg' 
                                                alt="reviews__icon" 
                                                width={35} 
                                                height={35} 
                                                style={{ paddingBottom: 5}}
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
                    </div>
                </div>
            </div>

            <div className="CheckUpForm">
                <div className="form">
                    <div className="form__inputs">
                        <div className="input__container">
                            <div className="form__devider"/>
                            <div className="input__container">
                                <h3>Δ</h3>
                                <label>Jméno:</label>
                                <input 
                                    type="text" 
                                    value={formData.customerName}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        customerName: e.target.value
                                    }))}
                                    placeholder="Vaše jméno"
                                />
                            </div>
                        </div>
                        
                        <div className="input__container">
                            <div className="form__devider"/>
                            <div className="input__container">
                                <h3>ε</h3>
                                <label>Email:</label>
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        email: e.target.value
                                    }))}
                                    placeholder="vas@email.cz"
                                />
                            </div>
                        </div>
                        
                        <div className="person__selection">
                            <div className="form__devider"/>
                            <div className="input__container__wrapper">
                                <div className="header__input">
                                    <div className="index">
                                        <h3>Γ</h3>
                                    </div>
                                    <p>Pro Koho (#):</p>
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
                                            <Image 
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
                                            setFormData(prev => ({
                                                ...prev,
                                                consultantId: peopleData[index].consultantId,
                                                consultantName: peopleData[index].name,
                                                reviewType: peopleData[index].name === "Benefit Program" ? "benefitprogram" : "poradce"
                                            }));
                                        }}
                                        onHoverStart={(index) => setPreviewIndex(index)}
                                        onHoverEnd={() => setPreviewIndex(null)}
                                    />
                                </div>
                            </div>
                        </div>
                
                        <div className="input__container">
                            <div className="form__devider"/>
                            <div className="input__container">
                                <h3>λ</h3>
                                <label>Váš Názor:</label>
                                <textarea 
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        message: e.target.value
                                    }))}
                                    placeholder="Váš názor"
                                />
                            </div>
                        </div>
                        <div className="input__container">
                            <div className="form__devider"/>
                            <div className="text__container">
                                <p>Klinutím na “poslat žádost” souhlasíte se zpracováním vašich osobních údajů</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="cta">
                    <div className="button">
                        <RoundButton 
                            href='' 
                            text={loading ? 'Odesílám...' : 'Poslat Recenzi'} 
                            disableLink={true}
                            onClick={handleSubmit}
                        />
                    </div>
                    <div className="devider"/>
                </div>
            </div>
        </motion.section>
    )
}