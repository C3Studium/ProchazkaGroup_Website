import { useGlobalContext } from "@/context/LoadProvider";
import { usePerformance } from "@/context/PerformanceProvider";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect, useRef  } from "react";
import Grid from "../grid";
import AnimatedText from "./typingText";

const intro = {
    initial: {
        opacity: 1,
    },
    exit: {
        opacity: 0,
        scale: 5,
        transition: {
            delay: 0.5,
            duration: 0.5,
            ease: [ 0.76, 0, 0.24, 1 ],
        }
    }
}

const textIntro = {
    initial: {
        opacity: 0,
    },
    enter: (i) =>{
        return {
            opacity: 1,
            transition: {
                delay: 0.75 + (i * 0.3),
                duration: 0.5,
                ease: [ 0.76, 0, 0.24, 1 ],
            }
        }
    },
    exit: (i) => {
        return {
            opacity: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.5,
                ease: [ 0.76, 0, 0.24, 1 ],
            }
        }
    }  
}

export default function Preloader({ staggers, number }) {
    //Performance
    const { shouldReduceAnimations } = usePerformance();

  const { runTime, setFirstLoad, preloaderRun } = useGlobalContext();
  const hasAnimated = useRef(false);

  const count = useMotionValue(0);
  const pathLength = useMotionValue(0);


  //need to transform the values to %, and I can't make it as normal text
  const Counting = useTransform(count, Math.round);
  const CountingWithPercent = useTransform(Counting, (latest) => `${latest}%`);

   // When preloader starts, disable scrolling
   useEffect(() => {
        if (typeof window === 'undefined' || !window.lenis) return;
        
        // Disable scrolling
        window.lenis.stop();
        document.body.style.overflow = 'hidden';
        
        return () => {
            // When preloader unmounts, re-enable scrolling
            if (typeof window !== 'undefined' && window.lenis) {
                window.lenis.start();
                document.body.style.overflow = '';
            }
        };
    }, []);

    useEffect(() => {
    if (hasAnimated.current) return;
    let controls;
    let pathControls;

    // Reduce staggers for mobile
    const actualStaggers = shouldReduceAnimations ? Math.min(staggers, 3) : staggers;

    // Optimize random calculations
    const randomFloats = Array.from(
        { length: actualStaggers }, 
        () => Math.random() * number
    )
    .sort((a, b) => a - b)
    .concat(number);

    const scaledRandomFloats = randomFloats.map((item) => item / number);

    // Simplified delays for mobile
    const randomDelays = Array.from(
        { length: actualStaggers }, 
        () => shouldReduceAnimations ? Math.random() * 0.5 : Math.random()
    )
    .sort((a, b) => a - b)
    .concat(1);

    const times = randomDelays.map(
        (delay) => delay / randomDelays[randomDelays.length - 1]
    );

    // Optimized counter animation
    controls = animate(count, randomFloats, {
        duration: shouldReduceAnimations ? runTime * 1 : runTime,
        times: times,
        ease: "linear",
        onComplete: () => {
            setFirstLoad(false);
            hasAnimated.current = true;
        }
    });

    // Optimized path animation
    pathControls = animate(pathLength, scaledRandomFloats, {
        duration: shouldReduceAnimations ? runTime * 1 : runTime,
        times: times,
        ease: "linear",
        onComplete: () => {
            setFirstLoad(false);
            hasAnimated.current = true;
        }
    });

    return () => {
        controls?.stop();
        pathControls?.stop();
    };
    }, [number, staggers, runTime, setFirstLoad, count, pathLength, shouldReduceAnimations]);

  return (
    <motion.div className="Preloader__Main" variants={intro} initial='initial' exit='exit'>
      <div className="Preloader__Background">
        <Grid blur="0px" color="rgba(94, 117, 141, 0.05)" size="20vh" key={"Preloader"}/>
      </div>
      <div className="Preloader__Loading__Line">
        <motion.svg 
            className="Preloader__Loading__Line__SVG"
            style={{
                willChange: 'transform',
                transform: 'translateZ(0)',
            }}
        >
            {!shouldReduceAnimations && (
                <defs>
                    <filter id="blur-filter">
                        <feGaussianBlur in="SourceGraphic" stdDeviation={shouldReduceAnimations ? "1" : "2.5"} />
                    </filter>
                </defs>
            )}
          <motion.circle
            cx="50%"
            cy="50%"
            r="40"
            fill="none"
            strokeWidth="0.75"
            filter="url(#blur-filter)"
            style={{ 
                pathLength: pathLength,
                willChange: 'transform',
                transform: 'translateZ(0)',
            }}
          />
        </motion.svg>
        <motion.svg className="Preloader__Loading__Line__SVG">
          <defs>
            <filter
              id="shadow-filter"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="5"
                floodColor="#4bdadc"
              />
            </filter>
          </defs>
          <motion.circle
            cx="50%"
            cy="50%"
            r="40"
            fill="none"
            strokeWidth="0.75"
            filter="url(#shadow-filter)"
            style={{ 
                pathLength: pathLength,
                willChange: 'transform',
                transform: 'translateZ(0)',
            }}
          />
        </motion.svg>
      </div>
      <div className="Preloader__Loading__Number">

        <div className="Loading__PreLNumber__Container">
            <motion.h1 variants={textIntro} initial='initial' animate='enter' exit='exit'>{CountingWithPercent}</motion.h1>
        </div>

      </div>
      <div className="Preloader__Loading__Text">
        <motion.h3 
            variants={textIntro} 
            initial='initial' 
            animate='enter' 
            exit='exit'
            custom={1}
        >
            <AnimatedText 
                text="Procházka Group"
                custom={1}
                className="animated-title"
            />
        </motion.h3>
        <motion.p 
            variants={textIntro} 
            initial='initial' 
            animate='enter' 
            exit='exit'
            custom={2}
        >
            <AnimatedText 
                text="Finance a vzdělání"
                custom={2}
                className="animated-subtitle"
            />
        </motion.p>
      </div>
    </motion.div>
  );
}