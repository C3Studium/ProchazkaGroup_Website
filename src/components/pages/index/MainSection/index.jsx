import Contact from "./Contact";
import IntroSMain from "./IntroS";
import Offer from "./Offer";

export default function MainPageSection() {
    return(
        <section style={{ backgroundColor: 'var(--bgColor)' }}>
            <IntroSMain />
            <Offer />
            <Contact text={'VYBERTE SI KDO VÁM JE NEJVÍCE SYMPATICKÝ A UDĚLEJTE KROK V PŘED HNED.  PROTOŽE PRVNÍ KROK ZA VÁS NIKDO NEUDĚLÁ.'}/>
        </section>
    )
}