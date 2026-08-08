import RoundButton from "@/components/common/ui/stickyButtons/buttons/RoundButton";
import { testimonials } from "@/constants/mainpage";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useFetchDatabase } from "@/hooks/useFetchDatabase";

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

const CarouselItem = ({
    testimonial,
    idx,
    direction,
    onPrev,
    onNext
}) => {
    if (!testimonial || typeof testimonial !== 'object') {
        return null;
    }

    const {
        id = `fallback-${idx}`,
        customer_name = '',
        town = '',
        message = '',
        number = idx,
        hashtag = ''
    } = testimonial;

    return (
        <div className="Testimonials__Carousel__itemWrapper">
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
                    <div className="Testimonials__Carousel__container__item__header">
                        <p>{number < 9 ? number : number} {hashtag}</p>
                        <div className="Testimonials__Carousel__container__item__header__controls">
                            <button className="Testimonials__Carousel__container__item__header__controls__button" onClick={() => onPrev(idx)}>
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
                            <button className="Testimonials__Carousel__container__item__header__controls__button" onClick={() => onNext(idx)}>
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

                    <div className="Testimonials__Carousel__container__item__content">
                        <p>{message}</p>
                    </div>

                    <div className="Testimonials__Carousel__container__item__addInfo">
                        <p>{customer_name} | {town || "Strakonice"}</p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default function Testimonials() {
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
        >
            <motion.div
                className="Testimonials__Header"
                ref={headerRef}
            >
                <div className="Testimonials__Header__container">
                    <p>Přečtěte si slova našich<br /> spokojených klientů</p>
                </div>
                <div className="divider" />
            </motion.div>

            <div className="button__container">
                <div className="devider" />
                <motion.div
                    className="button"
                    ref={buttonRef}
                    style={{
                        x: buttonX,
                        scale: buttonScale,
                    }}
                >
                    <RoundButton href='/recenze' text='Všechny Ohlasy' />
                </motion.div>
            </div>

            <motion.div
                className="Testimonials__Carousel__container"
                ref={carouselRef}
            >
                {activeIndices.map((testimonialIndex, idx) => {
                    const adjustedIndex = testimonialIndex % reviews.length;
                    const testimonial = reviews[adjustedIndex];

                    if (!testimonial || typeof testimonial !== 'object') {
                        const fallbackIndex = idx % reviews.length;
                        return (
                            <CarouselItem
                                key={`fallback-${idx}`}
                                testimonial={reviews[fallbackIndex]}
                                idx={idx}
                                direction={direction}
                                onPrev={handlePrev}
                                onNext={handleNext}
                            />
                        );
                    }

                    return (
                        <CarouselItem
                            key={testimonial.id || `item-${idx}`}
                            testimonial={{
                                ...testimonial,
                                number: adjustedIndex
                            }}
                            idx={idx}
                            direction={direction}
                            onPrev={handlePrev}
                            onNext={handleNext}
                        />
                    );
                })}
            </motion.div>
        </motion.section>
    );
}
