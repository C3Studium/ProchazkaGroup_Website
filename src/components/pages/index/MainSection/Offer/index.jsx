import { useRef } from "react";
import IntroOffer from "./Intro";
import Reality from "./Reality";
import Testimonials from "./Testimonials";
import RealityIntro from "./RealityIntro";
import { RealityIntroGrid } from "./GridTransition";
import WhatWeDo from "./WhatWeDo";


export default function Offer() {
    const sectionRef = useRef(null);
    
    return(
        <section className="Offer">
            <IntroOffer />
            <RealityIntroGrid/>
            <div className="sticky__wrapper" ref={sectionRef}>
                {/* Single sticky container for both animated elements */}
                <div className="sticky">
                    <div className="content__container">
                        <RealityIntro ref={sectionRef}/>
                    </div>
                </div>
            </div>
            <Reality/>
            <div className="section__wrapper">
            
                <div className="section__container">
                    <div className="sticky__wrapper">
                        <WhatWeDo />
                    </div>
                </div>
            </div>
            <Testimonials />
        </section>
    );
}