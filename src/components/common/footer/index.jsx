import MyButton from "@/components/ui/stickyButtons/buttons/MyButton";
import RoundButton from "@/components/ui/stickyButtons/buttons/RoundButton";
import { FooterLinks } from "@/constants/common";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GetChars from "../navbar/body/getChars";
import { useNewsletterForm } from "@/hooks/useNewsletterForm";
import { useToast } from "@/hooks/use-toast";
import ONViewLogo from "@/components/anim/onViewLogo";
import MainText from "@/components/anim/MainText";
import Grid from "../grid";
import { usePathname } from "next/navigation";
import SVGButton from "@/components/ui/stickyButtons/buttons/SvgButton";
import Image from "next/image";
import { trackEvent } from "@/hooks/trackEvent";
import useResend from "@/hooks/useResend";

export default function Footer() {
    const [selectedLink, setSelectedLink] = useState({ isActive: false, index: 0 });
    const { toast } = useToast();
    const {
        formData,
        setFormData,
        loading,
        handleSubmit: handleNewsletterSubmit
    } = useNewsletterForm();

    const pathname = usePathname();
    const { sendEmail } = useResend();
    // Add responsive state variables
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    
    // SVG paths for different device types
    const svgPaths = {
        // Desktop path (original)
        desktop: "M0.429688 100.477C0.429688 45.2481 45.2012 0.476562 100.43 0.476562H1243.43C1298.66 0.476562 1343.43 45.2481 1343.43 100.477V315.558C1343.43 370.787 1388.2 415.558 1443.43 415.558H1820.43C1875.66 415.558 1920.43 460.33 1920.43 515.558V812.148C1920.43 867.377 1875.66 912.148 1820.43 912.148H714.707C668.225 912.148 630.543 949.83 630.543 996.313V996.313C630.543 1042.8 592.862 1080.48 546.379 1080.48H100.43C45.2012 1080.48 0.429688 1035.71 0.429688 980.477V100.477Z",
        
        // Updated tablet path based on your provided SVG
        tablet: "M-19.7031 100.5C-19.7031 45.2715 25.0684 0.5 80.2969 0.5H600.617C655.846 0.5 700.617 45.2715 700.617 100.5V250.5C700.617 305.728 745.389 350.5 800.617 350.5H924.617C979.846 350.5 1024.62 395.272 1024.62 450.5V1020.5C1024.62 1075.73 979.846 1120.5 924.617 1120.5H428.669C373.441 1120.5 328.669 1165.27 328.669 1220.5V1249.5C328.669 1304.73 283.898 1349.5 228.669 1349.5H80.2967C25.0683 1349.5 -19.7031 1304.73 -19.7031 1249.5V100.5Z",
        
        // No specific path for mobile
        mobile: ""
    };
    
    // Detect device type and orientation with improved iPad Pro detection
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Set portrait mode
            const isPortraitMode = height > width;
            setIsPortrait(isPortraitMode);
            
            // Mobile: width < 600px
            setIsMobile(width < 600);
            
            // Tablet: width >= 600px && width <= 1024px
            // Note: This includes iPad Pro (1024px wide in portrait mode)
            setIsTablet(width >= 600 && width <= 1024);
        };
        
        // Initial check
        handleResize();
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    // Determine which viewBox to use based on device
    const getViewBox = () => {
        if (isMobile) {
            return "0 0 600 800"; // Mobile viewBox
        } else if (isTablet && isPortrait) {
            return "0 0 1025 1350"; // Tablet portrait viewBox updated for iPad Pro
        } else {
            return "0 0 1921 1081"; // Desktop viewBox
        }
    };
    
    // Determine which SVG path to use
    const getPath = () => {
        if (isMobile) {
            // For mobile, return empty path as we'll use a rect for full background
            return null;
        } else if (isTablet && isPortrait) {
            return svgPaths.tablet;
        } else {
            return svgPaths.desktop;
        }
    }

    const handleSubmit = async (e) => {
        e?.preventDefault();
        
        if (!formData.name || !formData.email) {
            toast({
                title: "Chyba!",
                description: "Prosím vyplňte všechna pole",
                variant: "destructive"
            });
            return;
        }

        try {
            const url = "https://api.sender.net/v2/subscribers";
            
            const headers = {
                "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SENDER_API_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            };
            
            const data = {
                email: formData.email,
                firstname: formData.name,
                groups: ["prochazkagroup"]
            };
            
            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Track successful newsletter signup
                trackEvent("newsletter_signup_successful", {
                    name: formData.name,
                    email: formData.email,
                    timestamp: new Date().toISOString()
                });

                toast({
                    title: "Úspěch!",
                    description: "Byli jste úspěšně přihlášeni k odběru novinek",
                    variant: "success"
                });
                sendEmail({
                    template: "newsletter-user",
                    to: formData.email,
                    data: {
                        ...formData,
                        subscriptionDate: new Date().toISOString().split('T')[0]
                    }
                });
                sendEmail({
                    template: "newsletter-admin",
                    to: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
                    data: {
                        ...formData,
                        subscriptionDate: new Date().toISOString().split('T')[0]
                    }
                });
                setFormData({ name: '', email: '' });
            } else {
                throw new Error(result.message || 'Něco se pokazilo');
            }

        } catch (error) {
            // Track newsletter signup failure
            trackEvent("newsletter_signup_failed", {
                name: formData.name,
                email: formData.email,
                timestamp: new Date().toISOString()
            });

            toast({
                title: "Chyba!",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleMyButtonClick = () => {
        trackEvent("footer_mybutton_clicked", {
            pathname: pathname,
            timestamp: new Date().toISOString()
        });
    };

    return (
        <section className="Footer">
            <Grid size={isMobile ? "10vh" : "20vh"}/>
            
            <svg 
                className="footer-background-svg" 
                width="100%" 
                height="100%" 
                viewBox={getViewBox()}
                fill="none" 
                preserveAspectRatio="none" 
                xmlns="http://www.w3.org/2000/svg"
            >
                {isMobile ? (
                    // For mobile, use a simple rectangle that fills the entire area
                    <rect 
                        x="0" 
                        y="0" 
                        width="100%" 
                        height="100%" 
                        fill="#063F66" 
                    />
                ) : (
                    // For tablet and desktop, use the complex path
                    <path 
                        d={getPath()}
                        fill="#063F66"
                    />
                )}
            </svg>
            
            <div className="Footer__Header">
                <div className="MainText">
                    <MainText 
                        className={"MainText__Container"} 
                        initialColor={'#fff'} 
                        secondaryColor={'#4bdadc'} 
                        text={'JSME ODHOLÁNI VÁM ZLEHČIT <br /><span>FINAČNÍ ASPEKT ŽIVOTA. </span> <br />KDYKOLIV JSTE PŘIPRAVENI, <br /><span>MY JSME TAKY.</span>'}
                    />
                </div>
                <div className="Logo">
                    <ONViewLogo />
                </div>  
            </div>
            
            {/* Rest of the component stays the same */}
            <div className="Footer__Form">
                <div className="Contact__CTA__Header">
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
                            className="mapIcon"
                        />
                    </div>
                    <p>Smetanova 78/1, 397 01 Písek</p>
                    <Link href="https://maps.app.goo.gl/AQWz24PX5EKAGGtY6" target="_blank" rel="noopener noreferrer">
                        <SVGButton src='/assets/svg/mapIcon.svg' altText='TextIcon' onClick={handleMyButtonClick}/>
                    </Link>
                </div>
                <div className="Form__container">
                    <div className="Form__header">
                        <div className="Form__header__index">
                            <p>
                            ε
                            </p>
                            <h3>
                                05
                            </h3>
                        </div>
                        <div className="Form__header__text">
                            <p>
                             Naše měsíční novinky toho nejdůležitějšího ze světa financí
                            </p>
                        </div>
                    </div>
                    <div className="Form__form">
                        <div className="devider"/>
                        <div className="button__container">
                            <RoundButton  href='#' text={ loading ? 'Odesilám...' : 'Chci se Zapojit'} disableLink={true} onClick={handleSubmit}/>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="Form__input__container">
                                <p>Δ</p>
                                <label htmlFor="name">Jméno:</label>
                                <input 
                                    type="text" 
                                    id="name" 
                                    name="name" 
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev =>({ ...prev, name: e.target.value }))}
                                    placeholder="Vaše jméno"
                                    required
                                    autoComplete="name"
                                />
                            </div>
                            <div className="devider2"/>
                            <div className="Form__input__container">
                                <p>Δ</p>
                                <label htmlFor="email">E-mail:</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev =>({ ...prev, email: e.target.value }))} 
                                    placeholder="Váš email"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="devider3"/>
                            <p className="gdpr">Klinutím na "chci se zapojit" souhlasíte se zpracováním vašich osobních údajů</p>
                        </form>
                    </div>
                </div>
            </div>
            <div className="Footer__Links">
                <div className="Links__Author">
                    <MyButton />
                </div>
                <div className="Links__container">
                    <div className="Social__Links">
                        {FooterLinks.map((link, i) => {
                            const { name, href } = link;
                            return (
                                <Link 
                                    key={`footerLink-${i}`} 
                                    href={href}
                                    onMouseEnter={() => setSelectedLink({ isActive: true, index: i })}
                                    onMouseLeave={() => setSelectedLink({ isActive: false, index: i })}
                                >
                                    <motion.p>
                                        <GetChars
                                            text={name}
                                            selectedLink={selectedLink}
                                            index={i}
                                            initialColor={isMobile ? '#fff' : '#050A10'}
                                            pathname={pathname}
                                            href={href}
                                        />
                                    </motion.p>
                                </Link>
                            )
                        })}
                    </div>
                    <div className="Credits">
                        <p>2025 © ProcházakGroup Všechna práva udělena </p>
                    </div>
                </div>
            </div>
        </section>
    );
}