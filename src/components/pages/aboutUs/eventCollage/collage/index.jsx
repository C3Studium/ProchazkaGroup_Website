import Grid from "@/components/common/grid";
import CustomImage from "@/components/common/ui/stickyImage";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";


const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const evenItemVariants = {
    hidden: {
        x: 100,
        opacity: 0,
    },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.6,
            ease: "easeOut",
        },
    },
};

const oddItemVariants = {
    hidden: {
        x: -100,
        opacity: 0,
    },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.6,
            ease: "easeOut",
        },
    },
};

export default function Collage() {
    const points = 4;
    const sectionRef = useRef(null);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    // Listen for window resize
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end end']
    });

    const peakPoints = useMemo(() => (
        Array.from({ length: points }, (_, i) => (i / points) + (1 / (points * 4)))
    ), [points]);

    // Create conditional transform based on viewport width
    const moveX = useTransform(
        scrollYProgress,
        [0, 1],
        windowWidth < 450
            ? ['150vw', '-700vw'] // Double the movement for small screens
            : ['100vw', '-450vw']  // Normal movement for larger screens
    );

    //NOTE: Events data are here
    const events = [
        {
            name: 'Vstup do financí',
            time: '2012-2014',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: 'Vstup do financí',
            text: 'Vstup do financí při studiu vysoké školy. První zkušenosti, které položily základy budoucího růstu a profesionálního přístupu k práci s klienty.',
        },
        {
            name: 'Otevření první kanceláře',
            time: '2016',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: 'First Office Opening',
            text: 'Povýšení na obchodního vedoucího a otevření první kanceláře v Písku. Z malé místnosti se stalo zázemí pro budoucí tým a skutečné podnikání.',
        },
        {
            name: 'Opakovaná umístění mezi nejlepšími',
            time: '2019-2022',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: 'Recurring Top Positions',
            text: 'Umístění mezi nejlepšími vedoucími v rámci zemského ředitelství. Každoroční úspěchy dokazují stabilní výsledky a vysokou kvalitu práce celého týmu.',
        },
        {
            name: 'První veřejné přednášky',
            time: '2022',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: 'Public Lectures Start',
            text: 'Zahájení veřejných přednášek na téma finanční gramotnosti. Více než 17 akcí v Písku, Plzni a Kadani. Osvěta, která pomáhá lidem lépe rozumět penězům.',
        },
        {
            name: 'Oficiální značka ProcházkaGroup',
            time: '2023',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: 'Official branding',
            text: 'Založení značky ProcházkaGroup pod hlavičkou OVB. Jasná identita, která odráží naše hodnoty – důvěru, výsledky a individuální přístup. A ustanovení společného cíle.',
        },
        {
            name: 'Povýšení do vedení',
            time: '2023-2024',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: 'Povýšení do vedení',
            text: 'Růst vedení: Michaela Marková a Ondřej Efenberk povýšeni. Silní lídři, kteří potvrzují kvalitu týmu a pokračování v dlouhodobé vizi.',
        },
        {
            name: 'Zlatý odznak OVB',
            time: '2024',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: 'Zlatý odznak OVB',
            text: 'Získání Zlatého odznaku OVB za týmový výkon. Ocenění, které získávají jen poradci s dlouhodobě vysokými a stabilními výsledky.',
        },
        {
            name: '10 let členství ve VIP klubu',
            time: '2014-2024',
            photo: '/assets/prebuild/reviewsBackground.webp',
            alt: '10 let členství ve VIP klubu',
            text: '10 let ve VIP klubu ředitelství jako ocenění kvality. Účast v prestižním programu jako důkaz odbornosti, důvěry a silného klientského servisu.',
        }
    ]


    const eventPairs = [];
    for (let i = 0; i < events.length; i += 2) {
        eventPairs.push([
            events[i],
            events[i + 1] || null
        ]);
    }
    return (
        <section className="Collage" ref={sectionRef}>
            {/* <div className="ProgressBar__container__wrapper">
                    <div className='ProgressBar__container'>
                        <div className="Collage__progressBar">
                            <div className="Collage__progressBar_div">
                                {[circleProgress0, circleProgress1, circleProgress2, circleProgress3].map((circleAnim, index) => {
                                    const isLastItem = index === 3;
                                    return (
                                        <div className="Collage__progressBar__Container" key={index}>
                                            <div className="circle">
                                                <motion.div className="circle__inner" style={{ scale: circleAnim }}></motion.div>
                                            </div>
                                            {!isLastItem && (
                                                <div className="segment">
                                                    <motion.div className="segment__inner" style={{ y: [segmentProgress0, segmentProgress1, segmentProgress2, segmentProgress3][index] }}></motion.div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
            </div>  */}

            <div className="content__wrapper">
                {/* <Grid size="20vh"/> */}
                <motion.div className="Collage__content" style={{ x: moveX }}>
                    {eventPairs.map(([event1, event2], i) => {
                        return (
                            <motion.div
                                className="content__container"
                                key={i}
                                variants={containerVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                            >
                                {/* First Event */}
                                <motion.div className="content">
                                    <motion.div
                                        className="contains"
                                        variants={i % 2 === 0 ? oddItemVariants : evenItemVariants}
                                    >
                                        <motion.div
                                            className="contains__header"
                                            variants={{
                                                hidden: { y: 20, opacity: 0 },
                                                visible: {
                                                    y: 0,
                                                    opacity: 1,
                                                    transition: { delay: 0.2, duration: 0.5 }
                                                }
                                            }}
                                        >
                                            <h2>{event1.time}</h2>
                                            <p>|</p>
                                            <h3>{event1.name}</h3>
                                        </motion.div>
                                        <motion.div
                                            className="image__container"
                                            variants={{
                                                hidden: { scale: 0.8, opacity: 0 },
                                                visible: {
                                                    scale: 1,
                                                    opacity: 1,
                                                    transition: { delay: 0.3, duration: 0.5 }
                                                }
                                            }}
                                        >
                                            {/* <CustomImage src={event1.photo} altText={event1.alt}/> */}
                                            <Image
                                                src={event1.photo}
                                                alt={event1.alt}
                                                fill={true}
                                                sizes="50vw"
                                                quality={100}
                                                priority={true}
                                                placeholder="blur"
                                                blurDataURL="data:image/webp"
                                            />
                                        </motion.div>
                                    </motion.div>
                                    <motion.div
                                        className="contains__text"
                                        variants={{
                                            hidden: { y: 30, opacity: 0 },
                                            visible: {
                                                y: 0,
                                                opacity: 1,
                                                transition: { delay: 0.4, duration: 0.5 }
                                            }
                                        }}
                                    >
                                        <p>{event1.text}</p>
                                    </motion.div>
                                </motion.div>

                                {/* Second Event (if exists) */}
                                {event2 && (
                                    <motion.div className="content">
                                        <motion.div
                                            className="contains"
                                            variants={i % 2 === 0 ? evenItemVariants : oddItemVariants}
                                        >
                                            <motion.div
                                                className="contains__header"
                                                variants={{
                                                    hidden: { y: 20, opacity: 0 },
                                                    visible: {
                                                        y: 0,
                                                        opacity: 1,
                                                        transition: { delay: 0.2, duration: 0.5 }
                                                    }
                                                }}
                                            >
                                                <h2>{event2.time}</h2>
                                                <p>|</p>
                                                <h3>{event2.name}</h3>
                                            </motion.div>
                                            <motion.div
                                                className="image__container"
                                                variants={{
                                                    hidden: { scale: 0.8, opacity: 0 },
                                                    visible: {
                                                        scale: 1,
                                                        opacity: 1,
                                                        transition: { delay: 0.3, duration: 0.5 }
                                                    }
                                                }}
                                            >
                                                {/* <CustomImage src={event2.photo} altText={event2.alt}/> */}
                                                <Image
                                                    src={event1.photo}
                                                    alt={event1.alt}
                                                    fill={true}
                                                    sizes="50vw"
                                                    quality={100}
                                                    priority={true}
                                                    placeholder="blur"
                                                    blurDataURL="data:image/webp"
                                                />
                                            </motion.div>
                                        </motion.div>
                                        <motion.div
                                            className="contains__text"
                                            variants={{
                                                hidden: { y: 30, opacity: 0 },
                                                visible: {
                                                    y: 0,
                                                    opacity: 1,
                                                    transition: { delay: 0.4, duration: 0.5 }
                                                }
                                            }}
                                        >
                                            <p>{event2.text}</p>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}