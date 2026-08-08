'use client'
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { useGlobalContext } from "@/context/LoadProvider";
import Preloader from "../PreLoader";


const GetChars = ({ text }) => {
    return text.split('').map((char, i) => {
        return (
            <span key={i}>{char}</span>
        )
    })
}


const childrenSlide = {
    initial: {
        opacity: 0,
    },
    enter: {
        opacity: 1,
    },
    exit: {
        opacity: 0,
    },
};

const routes = {
    '/': 'Domov',
    '/benefit-program': 'Benefit program',
    '/nabidky': 'Partneři',
    '/o-nas': 'Náš příběh',
    '/recenze': 'Recenze',
    '/kontakt': 'Kontakt',
    '/404': '404',
    '/blog': 'Blog Článek',
    '/ochrana-soukromi': 'Ochrana Osobních Údajů',
    '/cookies': 'Cookies',
    '/reviews/efenberk-ondrej': 'Osobní Recenze',
    '/reviews/efenberk-ondrej': 'Osobní Recenze',
}

const rows = [
    {
        number: 0,
    },
]


export default function Transition({ children }) {
    const router = useRouter();
    const pathname = router.asPath.split('?')[0].split('#')[0];
    const routeText = routes[pathname] || '404';
    const { firstLoad } = useGlobalContext();


    const PathnameText = {
        initial: {
            x: !firstLoad ? '0%' : '-800%',
            opacity: 1,
        },
        enter: {
            x: '-800%',
            opacity: 0,
            transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.3 },
        },
        exit: {
            x: !firstLoad ? '0%' : '-800%',
            opacity: 1,
            transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.5 }
        }
    }

    const rowSlide = {
        initial: {
            x: !firstLoad ? '0%' : '100%',
        },
        enter: (i) => ({
            x: '100%',
            transition: {
                duration: 0.5,
                ease: [0.76, 0, 0.24, 1],
                delay: ((rows.length - i - 1) * 0.1) + 0.3
            },
        }),
        exit: (i) => ({
            x: !firstLoad ? '0%' : '100%',
            transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: (i * 0.15) + 0.3 },
        }),
    };

    return (
        <AnimatePresence
            mode="wait"
            onExitComplete={() => {
                window.scrollTo(0, 0);
                if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
            }}
        >
            {rows.map((row, index) => {
                const { number } = row;
                return (
                    <motion.div
                        key={`rowsr${number}-${pathname}`}
                        className='Transition__body__row'
                        variants={rowSlide}
                        initial='initial'
                        animate='enter'
                        exit='exit'
                        custom={index} //ensure the index is passed as a custom prop
                    ></motion.div>
                );
            })}
            <motion.div
                className="Transition__PageText"
                variants={PathnameText}
                initial='initial'
                animate='enter'
                exit='exit'
                key={`transition${pathname}text`}
            >
                <p>
                    <GetChars text={routeText} />
                </p>
            </motion.div>
            {firstLoad && <Preloader key={`preloader-${pathname}`} />}
            <motion.div
                className="Transition__children__wrapper"
                key={`transition${pathname}children`}
                variants={childrenSlide}
                initial='initial'
                animate='enter'
                exit='exit'
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
