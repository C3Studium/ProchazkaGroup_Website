import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import RoundButton from "@/components/common/ui/stickyButtons/buttons/RoundButton";
import { useQuestionForm } from "@/hooks/useQuestionForm";
import { useToast } from "@/hooks/use-toast";
import { use, useState } from "react";
import Grid from "@/components/common/grid";
import SVGButton from "@/components/common/ui/stickyButtons/buttons/SvgButton";
import Link from "next/link";
import CopyText from "@/components/common/ui/copyText";
import { trackEvent } from "@/hooks/trackEvent";
import useResend from "@/hooks/useResend";

//NOTE: FeedBack and contact are switched

export default function FeedbackForm({ scroll }) {
    const top = useTransform(scroll, [0, 1], ['15%', '65%'])
    const [isOpen, setIsOpen] = useState(true)

    const { sendEmail } = useResend();

    const { toast } = useToast()
    const {
        formData,
        setFormData,
        loading,
        handleSubmit: handleFeedbackSubmit
    } = useQuestionForm()

    const smoothYProgress = useSpring(scroll, {
        stiffness: 100,
        damping: 20,
        restDelta: 0.001
    })

    const moveButtonX = useTransform(smoothYProgress, [0, 0.5, 1], ['-10%', '10%', "25%"])

    const handleSubmit = async (e) => {
        e?.preventDefault()

        try {
            const apiData = {
                name: formData.name,
                email: formData.email,
                message: formData.message,
                phone_number: formData.phone,
                consultant_name: formData.selectedPerson
            }

            try {
                sendEmail({
                    template: "kontakt-user",
                    to: apiData.email,
                    data: apiData
                });
                sendEmail({
                    template: "kontakt-admin",
                    to: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
                    data: apiData
                });

                // Enhanced tracking with custom tags
                trackEvent("qna_submitted_successfully", {
                    form_type: "feedback_form",
                    consultant: apiData.consultant_name || "none",
                    page_section: "feedback_form",
                    timestamp: new Date().toISOString()
                });
            }
            catch (err) {
                throw new Error("Email sending failed: " + err.message);
            }

            toast({
                title: "Úspěch!",
                description: "Zpráva byla odeslána",
                variant: "success"
            })

            setIsOpen(false)

        } catch (error) {
            // Enhanced error tracking
            trackEvent("qna_submission_failed", {
                form_type: "feedback_form",
                error_message: error.message,
                timestamp: new Date().toISOString()
            });

            toast({
                title: "Chyba!",
                description: error.message,
                variant: "destructive"
            })
        }
    }

    const handleMapClick = () => {
        trackEvent("map_link_clicked", {
            button_location: "feedback_form",
            timestamp: new Date().toISOString()
        });
    };

    return (
        <motion.section
            className="FeedbackForm"
            style={{ top }}
            layout
        >
            <Grid size="20vh" key={"FeedbackForm"} />
            <div className="form__wrapper">
                <div className="form">
                    <form>
                        <div className="input__container">
                            <div className="form__devider" />
                            <h3>Δ</h3>
                            <div className="input__wrapper">
                                <label htmlFor="name">Jméno:</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        name: e.target.value
                                    }))}
                                    placeholder="Vaše jméno"
                                    required
                                />
                            </div>

                        </div>

                        <div className="input__container">
                            <div className="form__devider" />
                            <h3>ζ</h3>
                            <div className="input__wrapper">
                                <label htmlFor="email">E-mail:</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        email: e.target.value
                                    }))}
                                    placeholder="Váš E-mail"
                                    required
                                />
                            </div>

                        </div>

                        <div className="input__container">
                            <div className="form__devider" />
                            <h3>π</h3>
                            <div className="input__wrapper">
                                <label htmlFor="phone">Tel. číslo:</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        phone: e.target.value
                                    }))}
                                    placeholder="+420"
                                    required
                                />
                            </div>

                        </div>

                        <div className="input__container">
                            <div className="form__devider" />
                            <div className="input__wrapper" style={{ padding: 0 }}>
                                <div className="label__wrapper">
                                    <h3>λ</h3>
                                    <label htmlFor="message">Zpráva:</label>
                                    <div className="label__devider" />
                                </div>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows="4"
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        message: e.target.value
                                    }))}
                                    placeholder="Vaše zpráva"
                                    required
                                />
                            </div>
                        </div>
                        <div className="terms__container">
                            <div className="form__devider" />
                            <p className="terms__text">Klinutím na “poslat žádost” souhlasíte se zpracováním vašich osobních údajů</p>
                        </div>
                    </form>
                </div>

                <div className="CTA">
                    <div className="devider" />
                    <motion.div
                        style={{
                            x: moveButtonX,
                            willChange: "transform"
                        }}
                    >
                        <RoundButton
                            href='/'
                            text={loading ? 'Odesílám...' : 'Poslat Zprávu'}
                            onClick={handleSubmit}
                            disableLink={true}
                        />
                    </motion.div>
                </div>

                <div className="bottom__footer">
                    <div className="header">
                        <h3>
                            σ
                        </h3>
                        <p>
                            Chcete svou odpověď hned?
                            Zavolejte nám.
                        </p>
                    </div>
                    <div className="phone__details">
                        <div className="details__devider" />
                        <div className="details">
                            <CopyText text="+420 705 500 200" type='phone' className='pcopytext' />
                            <CopyText text="asistentka.prochazka@ovbone.cz" type='email' className='pcopytext' />
                        </div>
                        <div className="details__devider" />
                    </div>
                </div>
            </div>

            <div className="map__wrapper">
                <div className="map__container">
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
                        <SVGButton src='/assets/svg/mapIcon.svg' altText='TextIcon' onClick={handleMapClick} />
                    </Link>
                </div>
            </div>
        </motion.section>
    )
}