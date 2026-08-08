import MainText from "@/components/common/TextAnim/MainText";
import SubText from "@/components/common/TextAnim/SubText";
import Grid from "@/components/common/grid";
import { Benefitreviews, ReviewsCards } from "@/constants/benefitpage";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useFetchDatabase } from "@/hooks/useFetchDatabase";

export default function Reviews() {
    const [currentBatch, setCurrentBatch] = useState(0);
    const [batchSize, setBatchSize] = useState(3); // Default to 3
    const [reviews, setReviews] = useState([]); // Store database reviews
    const [loading, setLoading] = useState(true);

    const { fetchReviews } = useFetchDatabase();
    const container = useRef(null);

    // Fetch reviews from database
    useEffect(() => {
        const loadBenefitReviews = async () => {
            if (typeof window === 'undefined') return; // SSR safety

            try {
                const data = await fetchReviews();
                if (data) {
                    // Filter only Benefit Program reviews
                    const benefitReviews = data.filter(review =>
                        review.hashtag === 'benefitprogram' ||
                        review.consultant_name === 'Benefit Program'
                    );

                    // Sort by number
                    benefitReviews.sort((a, b) => a.number - b.number);

                    setReviews(benefitReviews);
                }
            } catch (error) {
                console.error('Error loading benefit reviews:', error);
                // Fallback to static reviews if database fails
                setReviews(Benefitreviews);
            } finally {
                setLoading(false);
            }
        };

        loadBenefitReviews();
    }, [fetchReviews]);

    // Use database reviews if available, otherwise fallback to static
    const reviewsToShow = reviews.length > 0 ? reviews : Benefitreviews;
    const totalBatches = Math.ceil(reviewsToShow.length / batchSize);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Update batchSize based on dimensions
            setBatchSize(
                width <= 600
                    ? 1  // Show 1 review for mobile
                    : width >= 700 && width <= 990 && height >= 950
                        ? 2  // Show 2 reviews for tablet portrait
                        : 3  // Default 3 reviews
            );
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Optimize batch transition variants
    const containerVariants = {
        enter: {
            x: "50%",
            opacity: 0,
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
        },
        center: {
            x: 0,
            opacity: 1,
            transition: {
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
                staggerChildren: 0.1
            }
        },
        exit: {
            x: "-50%",
            opacity: 0,
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
        }
    };

    // Add review item variants
    const reviewVariants = {
        enter: {
            y: 20,
            opacity: 0
        },
        center: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1]
            }
        },
        exit: {
            y: -20,
            opacity: 0,
            transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
            }
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBatch((prev) => (prev + 1) % totalBatches);
        }, 12000);

        return () => clearInterval(timer);
    }, [totalBatches]);

    const getCurrentBatch = () => {
        const start = currentBatch * batchSize;
        return reviewsToShow.slice(start, start + batchSize);
    };

    // Show loading state
    if (loading) {
        return (
            <div className="Reviews">
                <Grid size="20vh" />
                <div className="Reviews__wrapper">
                    <div className="reviews__wrapper">
                        <div className="reviews__Header">
                            <MainText
                                text={"NAČÍTÁNÍ RECENZÍ..."}
                                className="mainText__container"
                                initialColor="#050A10"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="Reviews" ref={container}>
            <Grid size="20vh" />
            <div className="Reviews__wrapper">
                <div className="reviews__wrapper">
                    <div className="reviews__Header">
                        <MainText
                            text={"PŘEČTETE SI CO NA PROGRAM ŘÍKAJÍ NAŠI DALŠÍ KLIENTI JAKO VY."}
                            className="mainText__container"
                            initialColor="#050A10"
                        />
                        <SubText
                            text={"NEBO JEŠTĚ NEJSTE KLIENTEM? TO CHCE NAPRAVIT!"}
                            className="subText__container"
                            initialColor="#050A10"
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentBatch}
                            className="reviews__container"
                            variants={containerVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            {getCurrentBatch().map((review, index) => (
                                <motion.div
                                    className="review"
                                    key={`${currentBatch}-${review.number || review.id || index}`}
                                    variants={reviewVariants}
                                    layout
                                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                >
                                    <div className="review__header">
                                        <h3>{review.number || `#${index + 1}`}</h3>
                                        <p>{review.hashtag || "#benefitprogram"}</p>
                                    </div>
                                    <div className="review__content">
                                        <p>{review.message || review.content}</p>
                                    </div>
                                    <div className="review__footer">
                                        <p>| {review.customer_name || review.name}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}