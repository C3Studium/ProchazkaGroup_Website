
import SmallButton from "@/components/ui/stickyButtons/buttons/SmallButton";
import SVGButton from "@/components/ui/stickyButtons/buttons/SvgButton";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import ReviewModem from "../ReviewModem";
import ReviewsSearch from "./ReviewsSearch";
import { WebsiteReviews } from "@/constants/pages/reviews";
import {useFetchDatabase} from "@/hooks/useFetchDatabase";
import { supabase } from '@/hooks/supabaseClient';
import Grid from "@/components/common/grid";
import MainText from "@/components/anim/MainText";
import SubText from "@/components/anim/SubText";


export default function ReviewsList() {
    const [isOpen, setIsOpen] = useState(false)
    const [visibleItems, setVisibleItems] = useState(6)
    const [activeFilter, setActiveFilter] = useState('všechno')
    const [searchQuery, setSearchQuery] = useState("")
    const [activeMode, setActiveMode] = useState('filter') // 'filter' or 'search'

    const containerRef = useRef(null);
    const headerButtonRef = useRef(null);
    const reviewButtonsRef = useRef(null);

    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { fetchReviews, fetchClovek } = useFetchDatabase()

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothYScroll = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 20,
        restDelta: 0.001
    });

    const headerButtonY = useTransform(smoothYScroll, [0, 1], [0, 40]);
    const reviewButtonsY = useTransform(smoothYScroll, [0, 1], [0, 50]);
    const showMoreButtonY = useTransform(smoothYScroll, [0, 1], [0, 60]);


    // Disable/enable Lenis scrolling when modal opens/closes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.lenis) return;
        
        if (isOpen) {
            // Disable scrolling when modal is open
            window.lenis.stop();
            document.body.style.overflow = 'hidden';
        } else {
            // Re-enable scrolling when modal is closed
            window.lenis.start();
            document.body.style.overflow = '';
        }
        
        // Cleanup function to ensure scrolling is re-enabled if component unmounts
        return () => {
            if (typeof window !== 'undefined' && window.lenis) {
                window.lenis.start();
                document.body.style.overflow = '';
            }
        };
    }, [isOpen]);



    useEffect(() => {
        const loadReviews = async () => {
            try {
                const data = await fetchReviews()
                if (data) {
                    console.log("data:", data)
                    setReviews(data)
                }
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        loadReviews()
    }, [])

    // Handler to refresh reviews and switch filter to nejnovější after new review is submitted
    const handleReviewSubmitted = async () => {
        try {
            const data = await fetchReviews()
            if (data) {
                setReviews(data)
                setActiveFilter('nejnovější')
                setActiveMode('filter')
                setVisibleItems(6)
            }
        } catch (err) {
            console.error('Failed to refresh reviews after submit:', err)
        }
    }

    const handleFilterClick = (filter) => {
        setActiveFilter(filter)
        setSearchQuery("") // Reset search
        setActiveMode('filter')
        setVisibleItems(6)
    }

    const handleSearch = (value) => {
        setSearchQuery(value)
        setActiveFilter('všechno') // Reset filter
        setActiveMode('search')
        setVisibleItems(6)
    }

    const getIPAddress = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json')
            const data = await response.json()
            return data.ip
        } catch (error) {
            console.error('Chyba při získávání IP adresy:', error)
            return null
        }
    }

    const getFilteredReviews = () => {
        try {
            let workingArray = [...reviews];
            
            if (activeMode === 'search' && searchQuery) {
                workingArray = workingArray.filter(review => 
                    // Přidat filtrování podle consultant_name
                    review?.consultant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    review?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            } else if (activeMode === 'filter') {
                // For 'nejnovější' we should NOT filter by hashtag — just change sorting.
                // For 'všechno' we also keep all items. Only apply hashtag filter for specific tags.
                if (activeFilter !== 'všechno' && activeFilter !== 'nejnovější') {
                    workingArray = workingArray.filter(review => 
                        review?.hashtag?.toLowerCase() === activeFilter.toLowerCase()
                    );
                }
            }

            // Sorting: newest first when 'nejnovější' is active, otherwise by number
            if (activeFilter === 'nejnovější') {
                workingArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else {
                workingArray.sort((a, b) => a.number - b.number);
            }
      
            return workingArray;
        } catch (error) {
            console.error('Filter error:', error);
            return [];
        }
    };

    const addLike = async (reviewId) => {
        try {
            // console.log('Adding like to review:', reviewId)
            // Získání IP adresy
            const userIP = await getIPAddress()
            if (!userIP) throw new Error('Nepodařilo se získat IP adresu')
    
                // Načtení aktuální recenze
                const { data: reviewData, error: reviewError } = await supabase
                    .from('reviews')
                    .select('likes, ip_list, list_of_all_ips, consultant_name')
                    .eq('id', reviewId)
                    .single()
        
                if (reviewError) throw reviewError
        
                // Kontrola IP v seznamu
                const ipList = reviewData.ip_list ? reviewData.ip_list.split(',') : []
                
                if (ipList.includes(userIP)) {
                    // Odstranění IP adresy ze seznamu

                    const { data: totalData, error: totalError } = await supabase
                        .from('total')
                        .select('totalpeople, likes')
                        .eq('id', "7d1cc7c4-b546-40a1-8e9e-97d0601e7b07")



                    const TotalObject = {
                        totalpeople: totalData[0].totalpeople - 1,
                        likes: totalData[0].likes - 1
                    }

                    const { data: totalDataUpdate, error: totalErrorUpdate } = await supabase
                        .from('total')
                        .update(TotalObject)
                        .eq('id', "7d1cc7c4-b546-40a1-8e9e-97d0601e7b07")
                        
                        const newIpList = ipList.filter(ip => ip !== userIP)
                    
                        const { error: updateError } = await supabase
                            .from('reviews')
                            .update({
                                likes: (reviewData.likes || 0) - 1,
                                ip_list: newIpList.join(',')
                            })
                            .eq('id', reviewId)
                    
                        if (updateError) throw updateError
                    
                        // Aktualizace UI
                        setReviews(prevReviews =>
                            prevReviews.map(review =>
                                review.id === reviewId
                                    ? {
                                        ...review,
                                        likes: (review.likes || 0) - 1,
                                        ip_list: newIpList.join(',')
                                    }
                                    : review
                            )
                        )

                        const peopledata = await fetchClovek(reviewData.consultant_name)

                        const { data: peopleData, error: peopleError } = await supabase
                            .from('people')
                            .update({ likes: peopledata[0].likes - 1 })
                            .eq('name', reviewData.consultant_name)
                    }
            else{
                // Přidání nové IP do seznamu
                ipList.push(userIP)

                    const { data: totalData, error: totalError } = await supabase
                        .from('total')
                        .select('totalpeople, likes')
                        .eq('id', "7d1cc7c4-b546-40a1-8e9e-97d0601e7b07")



                    const TotalObject = {
                        totalpeople: totalData[0].totalpeople + 1,
                        likes: totalData[0].likes + 1
                    }

                    const { data: totalDataUpdate, error: totalErrorUpdate } = await supabase
                        .from('total')
                        .update(TotalObject)
                        .eq('id', "7d1cc7c4-b546-40a1-8e9e-97d0601e7b07")
            
                // Update recenze
                const { error: updateError } = await supabase
                    .from('reviews')
                    .update({ 
                        likes: (reviewData.likes || 0) + 1,
                        ip_list: ipList.join(',')
                    })
                    .eq('id', reviewId)
        
                if (updateError) throw updateError
        
                // Aktualizace UI
                setReviews(prevReviews => 
                    prevReviews.map(review => 
                        review.id === reviewId 
                            ? { 
                                ...review, 
                                likes: (review.likes || 0) + 1,
                                ip_list: ipList.join(',')
                            }
                            : review
                    )
                )

                const peopledata = await fetchClovek(reviewData.consultant_name)

                        const { data: peopleData, error: peopleError } = await supabase
                            .from('people')
                            .update({ likes: peopledata[0].likes + 1 })
                            .eq('name', reviewData.consultant_name)
            }
    
            
    
        } catch (error) {
            console.error('Chyba při přidávání like:', error)
            alert('Nepodařilo se přidat like')
        }
    }

    const filteredReviews = getFilteredReviews()

    const showMore = () => {
        setVisibleItems(prevCount => prevCount + 6);
    };
    

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    return(
        <motion.section className="ReviewsList" ref={containerRef}>
            <Grid size="20vh"/>
            <div className="ReviewsList__header">
                <div className="devider"/>
                <div className="header">
                    <h3>02</h3>
                    <SubText initialColor="#050A10" text={"Tolik spokojených lidí není náhoda - je to důkaz, že děláme svou praci tak jak se má dělat."}/>
                    <div className="devider__header"/>
                </div>
                <div className="mainText">
                    <h2>
                        <MainText text={"ODEZVA OD NAŠICH KLIENTŮ"} initialColor="#050A10" />
                    </h2>
                </div>
            </div>

            <div className="ReviewsList__menu">
                <motion.div 
                    className="devider__menu" 
                    style={{
                        y: reviewButtonsY,
                    }}
                />
                <motion.div 
                    className="menu__controls"
                    ref={reviewButtonsRef}
                    // style={{
                    //     y: reviewButtonsY,
                    // }}
                >
                    <div className="menu__buttons">
                        <div className="button" onClick={() => handleFilterClick('všechno')}>
                            <SmallButton 
                                text='#všechno' 
                                active={activeMode === 'filter' && activeFilter === 'všechno'}
                            />
                        </div>
                        <div className="button" onClick={() => handleFilterClick('benefitprogram')}>
                            <SmallButton
                                text='#benefit' 
                                active={activeMode === 'filter' && activeFilter === 'benefitprogram'}
                            />
                        </div>
                        <div className="button" onClick={() => handleFilterClick('poradce')}>
                            <SmallButton 
                                text='#poradci' 
                                active={activeMode === 'filter' && activeFilter === 'poradce'}
                            />
                        </div>
                        <div className="button" onClick={() => handleFilterClick('nejnovější')}>
                            <SmallButton 
                                text='#nejnovější' 
                                active={activeMode === 'filter' && activeFilter === 'nejnovější'}
                            />
                        </div>
                    </div>
                    
                    <div className="searchBar">
                        <ReviewsSearch 
                            onSearch={handleSearch} // Function to update search
                            reviews={reviews}
                            searchValue={searchQuery} // String value
                            resetSearch={() => {
                                setSearchQuery("")
                                setActiveMode('filter')
                            }}
                        />
                    </div>
                </motion.div>
                <div className="addReviews">
                    <motion.div 
                        className="devider__rev"
                        style={{
                            y: headerButtonY,
                            willChange: "transform"
                        }}
                    />
                    <motion.div 
                        className="controls"
                        ref={headerButtonRef}
                        style={{
                            y: headerButtonY,
                            willChange: "transform"
                        }}
                    >
                        <div className="button" onClick={() => setIsOpen(!isOpen)}>
                            <SVGButton src='/assets/svg/addIcon.svg' altText="add__icon" />
                        </div>
                        <p>Chcete přidat váš feedback?</p>
                    </motion.div>
                </div>
            </div>

            <motion.div className="ReviewsList__Reviews" 
                layout
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <AnimatePresence>
                    {filteredReviews.slice(0, visibleItems).map(( review, i) => {
                        const { number, hashtag, message, customer_name, likes, consultant_name, id} = review
                        return (
                            <motion.div 
                                key={review.number}
                                className="review__item"
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                layout
                                transition={{
                                opacity: { duration: 0.2 },
                                layout: { duration: 0.4, type: "spring" }
                                }}
                            >
                                <div className="devider__item"/>
                                <div className="context">
                                    <div className="Header">
                                        <h3>{number < 9 ? "0" + number : number}</h3>
                                        <h3>#{hashtag}</h3>
                                        <p>{hashtag === "poradce" ? " | " + consultant_name : ""}</p>
                                    </div>
                                    <div className="message">
                                        <p>{message}</p>
                                    </div>  
                                </div>
                                <div className="ratings">
                                    <p>{customer_name}</p>
                                    <div className="buttons">
                                        <SVGButton src='/assets/svg/thumbsup_w.svg' altText='Like__icon' onClick={() => addLike(id)}/>
                                        <p>{likes}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </motion.div>
            {visibleItems < filteredReviews.length && (
                <motion.div
                    onClick={showMore}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        y: showMoreButtonY,
                        willChange: "transform"
                    }}
                    className="showMore__button"
                >
                    <SmallButton text='Zobrazit Více' />
                </motion.div>
            )}
            <AnimatePresence mode="wait">
                { isOpen && <ReviewModem isOpen={isOpen} setIsOpen={setIsOpen} onSubmitted={handleReviewSubmitted}/>}
            </AnimatePresence>
        </motion.section>
    )
}