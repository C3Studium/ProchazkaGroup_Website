import AnimatedText from '@/components/common/PreLoader/typingText'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function ONViewLogo() {
    const ref = useRef(null)
    const isInView = useInView(ref, { 
        once: false, 
        amount: 0.5 
    })
    
    const textIntro = {
        initial: {
            opacity: 0,
        },
        enter: (i) => {
            return {
                opacity: 1,
                transition: {
                    delay: 0.25 + (i * 0.3),
                    duration: 0.25,
                    ease: [ 0.76, 0, 0.24, 1 ],
                }
            }
        },
        exit: (i) => {
            return {
                opacity: 1,
                transition: {
                    delay: i * 0.05,
                    duration: 0.25,
                    ease: [ 0.76, 0, 0.24, 1 ],
                }
            }
        }  
    }

    return (
        <div className="onViewLogo" ref={ref}>
            <div className="onViewLogo__Text">
                <motion.h3 
                    variants={textIntro} 
                    initial='initial'
                    animate={isInView ? 'enter' : 'initial'}
                    custom={1}
                >
                   <AnimatedText text={"Procházka Group"} custom={1} isInView={isInView} />
                </motion.h3>
                <motion.p 
                    variants={textIntro} 
                    initial='initial'
                    animate={isInView ? 'enter' : 'initial'}
                    custom={2}
                >
                    <AnimatedText text={"Finance a vzdělání"} custom={2} isInView={isInView} />
                </motion.p>
            </div>
        </div>
    )
}