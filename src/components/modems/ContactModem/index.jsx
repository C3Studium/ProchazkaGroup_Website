import RoundButton from "@/components/ui/stickyButtons/buttons/RoundButton";
import SVGButton from "@/components/ui/stickyButtons/buttons/SvgButton";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useContactForm } from '@/hooks/useContactForm'
import { useToast } from '@/hooks/use-toast'
import CopyText from "@/components/ui/copyText";
import { useFetchDatabase } from "@/hooks/useFetchDatabase";
import { people as staticPeople } from "@/constants/people";
import Grid from "@/components/common/grid";
import Link from "next/link";
import ChooseBar from "@/components/common/chooseBar";
import { trackEvent } from "@/hooks/trackEvent";
import { usePathname } from "next/navigation";
import useResend from "@/hooks/useResend";


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

export default function ContactModem({ 
    isOpen, 
    setIsOpen, 
    people,
    currentIndex,
    setCurrentIndex,
    activeIndex,
    previewIndex,
    setPreviewIndex
}) {
    const { toast } = useToast()
    const {
        formData,
        setFormData,
        loading,
        handleSubmit: handleContactSubmit
    } = useContactForm()
    const { sendEmail } = useResend()
    const [menuOpen, setMenuOpen] = useState(false)
    const [peopleData, setPeopleData] = useState(staticPeople)
    // Set default person on mount
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            selectedPerson: people[0].name,
        }))
    }, [])


    const {fetchPeople} = useFetchDatabase()


    const pathname = usePathname()

    // Set default person on mount
    useEffect(() => {
        const loadPeopleData = async () => {
            try {
                const fetchedData = await fetchPeople() // Načtení dat ze supabase
                const updatedPeople = staticPeople.map(person => {
                    const fetchedPerson = fetchedData.find(p => p.name === person.name)
                    // console.log(fetchedPerson)
                    return {
                        ...person,
                        moto: fetchedPerson?.moto ?? person.moto,
                        likes: typeof fetchedPerson?.likes === 'number' ? fetchedPerson.likes : person.likes,
                        reviews: typeof fetchedPerson?.reviews === 'number' ? fetchedPerson.reviews : person.reviews
                    }
                })
                setPeopleData(updatedPeople)
                // console.log(updatedPeople)
            } catch (error) {
                toast({
                    title: "Chyba!",
                    description: "Nepodařilo se načíst data.",
                    variant: "destructive"
                })
                // console.log(error)
            }
        }
        loadPeopleData()
    }, [])


    const handleSubmit = async (e) => {
        e?.preventDefault()
        
        // Připravit data pro API
        const apiData = {
            name: formData.name,
            email: formData.email,
            message: formData.message,
            phone_number: formData.phone,
            consultant_name: formData.selectedPerson,
            inquiryDate: new Date().toISOString().split('T')[0]
        }
        
        // Validate required fields
        if (!apiData.email || !apiData.name || !apiData.message) {
            throw new Error("Všechna povinná pole musí být vyplněna");
        }
        
        if (!process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            throw new Error("Konfigurace emailu není nastavena");
        }
        
        // Additional validation for email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(apiData.email)) {
            throw new Error("Neplatný formát emailu");
        }
        
        try {
            try{

           if (pathname === '/') {
                // send template for zajem
                await sendEmail({
                    template: "zajem-user",
                    to: apiData.email.trim(),
                    data: apiData
                });
                await sendEmail({
                    template: "zajem-admin",
                    to: process.env.NEXT_PUBLIC_ADMIN_EMAIL.trim(),
                    data: apiData
                });
            } else if (pathname === '/benefit-program') {
                // send template for benefit
                await sendEmail({
                    template: "benefit-user",
                    to: apiData.email.trim(),
                    data: apiData
                });
                await sendEmail({
                    template: "benefit-admin",
                    to: process.env.NEXT_PUBLIC_ADMIN_EMAIL.trim(),
                    data: apiData
                });
            }
        }
        catch(err){
            throw new Error("Email sending failed: " + err.message);
        }

            // Track successful email send with enhanced data
            trackEvent("contact_email_sent_successfully", {
                consultant_name: apiData.consultant_name,
                customer_name: apiData.name,
                form_type: "contact_modem",
                message_length: apiData.message.length,
                has_phone: !!apiData.phone,
                timestamp: new Date().toISOString()
            });

            // Zobrazit úspěšnou notifikaci
            toast({
                title: "Úspěch!",
                description: "Vaše zpráva byla úspěšně odeslána. Brzy vás budeme kontaktovat.",
                variant: "success"
            })

            setIsOpen(false)

        } catch (error) {
            // Track email send failure with enhanced data
            trackEvent("contact_email_send_failed", {
                consultant_name: apiData.consultant_name,
                customer_name: apiData.name,
                form_type: "contact_modem",
                error_message: error.message,
                timestamp: new Date().toISOString()
            });

            // Zobrazit chybovou notifikaci
            toast({
                title: "Chyba!",
                description: error.message,
                variant: "destructive"
            })
        }
    }

    return(
        <motion.section 
            className="ContactModem"
            initial={{ x: "100%", opacity: 0}}
            animate="open"
            exit="closed"
            variants={modemAnim}
        >
            <Grid size="20vh"/>
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
                                                loading='lazy'
                                                quality={60}
                                                placeholder='blur'
                                                blurDataURL='data:image/svg'
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
                                                loading='lazy'
                                                quality={60}
                                                placeholder='blur'
                                                blurDataURL='data:image/svg'
                                            /> 
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
                <div className="map">
                    <div className="mapHeader">
                        <div className="header">
                            <p>Kde nás najdete | mapa</p>

                            <Image 
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
            </div>

            <div className="CheckUpForm">
                <div className="Header">
                    <h3>
                        03
                    </h3>
                    <p>
                     Tolik spokojených lidí není náhoda - je to důkaž, že to opravdu funguje. Nic lepšího tu už není 
                    </p>
                </div>
                <div className="form">
                    <div className="form__inputs">
                        <div className="input__container">
                            <div className="form__devider"/>
                            <div className="input__container">
                                <h3>Δ</h3>
                                <label>Jméno:</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        name: e.target.value
                                    }))}
                                    placeholder="Vaše jméno"
                                    autoComplete="name"
                                />
                            </div>
                        </div>
                        <div className="input__container">
                            <div className="form__devider"/>
                            <div className="input__container">
                                <h3>ζ</h3>
                                <label>E-mail:</label>
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        email: e.target.value
                                    }))}
                                    placeholder="Váš email"
                                    autoComplete="email"
                                />
                            </div>
                        </div>
                        <div className="input__container">
                            <div className="form__devider"/>
                            <div className="input__container">
                                <h3>π</h3>
                                <label>Telefon:</label>
                                <input 
                                    type="tel" 
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        phone: e.target.value
                                    }))}
                                    placeholder="+420"
                                    autoComplete="tel"
                                />
                            </div>
                        </div>
                        
                        <div className="person__selection">
                            <div className="form__devider"/>
                            <div className="input__container">
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
                                            <Image 
                                                src='/assets/svg/arrowup_w.svg' 
                                                alt="arrow" 
                                                width={30} 
                                                height={30}
                                                priority={false}
                                                loading='lazy'
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
                                                selectedPerson: peopleData[index].name
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
                                <label>Zpráva:</label>
                                <textarea 
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        message: e.target.value
                                    }))}
                                    placeholder="Vaše zpráva"
                                    autoComplete="off"
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
                        text={loading ? 'Odesílám...' : 'Poslat Zprávu'} 
                        disableLink={true}
                        onClick={handleSubmit}
                    />
                    </div>
                    <div className="devider"/>
                </div>
            </div>

            <div className="addInfo">
                <div className="text">
                    <p>
                        Potřebujte nás hned?
                    </p>
                    <p>
                        | 8-16 
                    </p>
                </div>
                <div className="link">
                    <CopyText text="+420 705 500 200" type='phone' className='linkP'/>
                </div>
            </div>
        </motion.section>
    )
}