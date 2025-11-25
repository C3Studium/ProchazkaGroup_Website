import RoundButton from "@/components/ui/stickyButtons/buttons/RoundButton";
import { testimonials } from "@/constants/mainpage";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useFetchDatabase } from "@/hooks/useFetchDatabase";
import Grid from "@/components/common/grid";

const cardVariants = {
    enter: (direction) => ({
      x: direction > 0 ? '10%' : '-10%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? '10%' : '-10%',
      opacity: 0
    })
};

export default function Testimonials () {
    const [activeIndices, setActiveIndices] = useState([0, 1]);
    const [direction, setDirection] = useState(1);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [reviews, setReviews] = useState(testimonials);
    const [loading, setLoading] = useState(false);
    
    // Refs for scrolling elements
    const sectionRef = useRef();
    const headerRef = useRef();
    const carouselRef = useRef();
    const buttonRef = useRef();

    const { fetchReviews } = useFetchDatabase();

    // Main scroll progress for the entire section
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'end end'],
    });

    // Create roller effect transformations
    const sectionScale = useTransform(
        scrollYProgress,
        [0, 0.6, 0.8, 1], 
        [0.9, 0.9, 1, 1]
    );
    const sectionY = useTransform(
        scrollYProgress,
        [0.1, 0.2, 0.5, 0.8, 1], 
        [-250, -250, 0, 0, 0]
    );
    
    const headerY = useTransform(
        scrollYProgress,
        [0, 0.3, 1], 
        ['10%', '0%', '-5%']
    );
    
    const headerOpacity = useTransform(
        scrollYProgress,
        [0, 0.3, 0.8, 1], 
        [0.5, 1, 1, 0.8]
    );
    
    const carouselY = useTransform(
        scrollYProgress,
        [0, 0.4, 1], 
        ['15%', '0%', '-2%']
    );
    
    const carouselOpacity = useTransform(
        scrollYProgress,
        [0, 0.4, 0.9, 1], 
        [0.3, 1, 1, 0.9]
    );
    
    const buttonX = useTransform(
        scrollYProgress,
        [0, 0.5, 1], 
        ['40%', '-100%', '-180%']
    );
    
    const buttonScale = useTransform(
        scrollYProgress,
        [0, 0.5, 0.8, 1], 
        [0.8, 1, 1.05, 1]
    );

    const totalTestimonials = reviews.length;

    const handleNext = (testimonialPosition) => {
        setDirection(1);
        setActiveIndices((prevIndices) => {
            const newIndices = [...prevIndices];
            let nextIndex = (newIndices[testimonialPosition] + 2) % totalTestimonials;
            while (newIndices.includes(nextIndex)) {
                nextIndex = (nextIndex + 1) % totalTestimonials;
            }
            newIndices[testimonialPosition] = nextIndex;
            return newIndices;
        });
    };

    useEffect(() => {
        if (!isAutoPlaying) return;
        
        const timer = setInterval(() => {
            handleNext(0);
            setTimeout(() => {
                handleNext(1);
            }, 300);
        }, 10000);

        return () => clearInterval(timer);
    }, [isAutoPlaying]);  

    useEffect(() => {
        const loadReviews = async () => {
            try {
                setLoading(true);
                const data = await fetchReviews();
                if (data && data.length > 0) {
                    // Validate data
                    const validData = data.filter(item => 
                        item && 
                        typeof item === 'object' && 
                        'id' in item &&
                        'customer_name' in item
                    );
                    setReviews(validData);
                }
            } catch (error) {
                console.error('Error loading reviews:', error);
                setReviews(testimonials); // Fallback to static data
            } finally {
                setLoading(false);
            }
        };
        loadReviews();
    }, []);
    
    const handlePrev = (testimonialPosition) => {
        setDirection(-1);
        setActiveIndices((prevIndices) => {
            const newIndices = [...prevIndices];
            let prevIndex = (newIndices[testimonialPosition] - 2 + totalTestimonials) % totalTestimonials;
            while (newIndices.includes(prevIndex)) {
            prevIndex = (prevIndex - 1 + totalTestimonials) % totalTestimonials;
            }
            newIndices[testimonialPosition] = prevIndex;
            return newIndices;
        });
    };

    return (
        <motion.section 
            className="Testimonials" 
            ref={sectionRef}
            style={{
                scale: sectionScale,
                transformOrigin: 'center',
                y: sectionY,
            }}
        >
        <Grid 
            size="20vh" 
            key={"Testimonials"} 
            className="Grid__testimonials"
            color="rgba(94, 117, 141, 0.15)" // Slightly stronger for visibility
        />            
            <motion.div 
                className="Testimonials__Header"
                ref={headerRef}
                style={{
                    y: headerY,
                    opacity: headerOpacity,
                }}
            >
                <div className="Testimonials__Header__container">
                    <h2>ψ</h2>
                    <p>Přečtěte si slova našich<br/> spokojených klientů</p>
                </div>
                <div className="devider"/>
            </motion.div>
            
            <div className="button__container">
                <div className="devider"/>
                <motion.div 
                    className="button" 
                    ref={buttonRef}
                    style={{ 
                        x: buttonX,
                        scale: buttonScale,
                    }}
                >
                    <RoundButton href='/recenze' text='Všechny Ohlasy'/>
                </motion.div>
            </div>
            
            <motion.div 
                className="Testimonials__Carousel__container"
                ref={carouselRef}
                style={{
                    y: carouselY,
                    opacity: carouselOpacity,
                }}
            >
                <div className="Testimonials__Carousel__subContainer">
                    {activeIndices.map((testimonialIndex, idx) => {
                        const adjustedIndex = testimonialIndex % reviews.length;
                        const testimonial = reviews[adjustedIndex];

                        if (!testimonial || typeof testimonial !== 'object') {
                            const fallbackIndex = idx % reviews.length;
                            return reviews[fallbackIndex];
                        }

                        const {
                            id = `fallback-${idx}`,
                            customer_name = '',
                            town = '', 
                            message = '',
                            number = adjustedIndex,
                            hashtag = ''
                        } = testimonial;

                        return (
                            <div key={idx} className="Testimonials__Carousel__itemWrapper">
                                <AnimatePresence initial={false} mode="wait" custom={direction}>
                                    <motion.div 
                                        key={id} 
                                        custom={direction}
                                        variants={cardVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{
                                            duration: 0.5,
                                            delay: idx * 0.1
                                        }}
                                        className="Testimonials__Carousel__container__item"
                                    >
                                        {/* Testimonial Header */}
                                        <div className="Testimonials__Carousel__container__item__header">
                                            <p>{number < 9 ? number : number} {hashtag}</p>
                                            <div className="Testimonials__Carousel__container__item__header__controls">
                                                <button onClick={() => handlePrev(idx)}>
                                                    <Image 
                                                        src="/assets/svg/arrow-left.svg" 
                                                        alt="Arrow Left" 
                                                        width={20} 
                                                        height={20}
                                                        priority={false}
                                                        quality={60}
                                                        loading="lazy"
                                                    />
                                                </button>
                                                <p>|</p>
                                                <button onClick={() => handleNext(idx)}>
                                                    <Image 
                                                        src="/assets/svg/arrow-right.svg" 
                                                        alt="Arrow Right" 
                                                        width={20} 
                                                        height={20} 
                                                        priority={false}
                                                        quality={60}
                                                        loading="lazy"
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Testimonial Content */}
                                        <div className="Testimonials__Carousel__container__item__content">
                                            <p>{message}</p>
                                        </div>
                                        
                                        {/* Additional Info */}
                                        <div className="Testimonials__Carousel__container__item__addInfo">
                                            <p>{customer_name} | {"Strakonice"}</p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>  
            </motion.div>  
        </motion.section>
    );
}