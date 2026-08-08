
import MyButton from "@/components/common/ui/stickyButtons/buttons/MyButton"
import RoundButton from "@/components/common/ui/stickyButtons/buttons/RoundButton"
import { FooterLinks } from "@/constants/common"
import Link from "next/link"
import { motion } from "framer-motion"
import GetChars from "@/components/common/navbar/body/getChars"
import { useState } from "react"
import Grid from "@/components/common/grid"
import Magnetic from "@/components/common/Magnetic"
import CopyText from "@/components/common/ui/copyText"

export default function Intro404() {
    const [selectedLink, setSelectedLink] = useState({ isActive: false, index: 0 })
    return (
        <>
            <div className="devider" />
            <div className="Button__container">
                <div className="button">
                    <RoundButton href='/' text='Zpět Domů' />
                </div>
            </div>
            <section className="Intro404">
                <Grid size="20vh" key={"Intro404"} />
                <div className="index">
                    <Magnetic sensitivity={0.05}>
                        <Link href="/">
                            <h2>ProcházkaGroup</h2>
                        </Link>
                    </Magnetic>
                </div>
                <div className="letter__wrapper">
                    <h2>
                        <span>
                            4
                        </span>
                        <span>
                            0
                        </span>
                        <span>
                            4
                        </span>
                    </h2>
                </div>
                <div className="addInfo">
                    <div className="bottom__footer">
                        <div className="header">
                            <h3>
                                σ
                            </h3>
                            <p>
                                Máte nějaké dotazi ohledně naši stránky?
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
                <div className="footer__Container">
                    <div className="Footer__Links">
                        <div className="Links__Author">
                            <MyButton />
                        </div>
                        <div className="Links__container">
                            <div className="devider" />
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
                                                    initialColor={'#fff'}
                                                />
                                            </motion.p>
                                        </Link>
                                    )
                                })}
                            </div>
                            <div className="Credits">
                                <p>2026 © ProcházkaGroup - Všechna práva udělena </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}