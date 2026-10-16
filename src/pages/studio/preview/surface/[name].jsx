import Head from "next/head"

import { siteChrome } from "@/cms"
import { surfaceRoot } from "@/cms/edit"
import AddReview from "@/components/pages/reviews/AddReview"
import ChooseAdvisor from "@/components/pages/index/ChooseAdvisor"
import ContactModal from "@/components/common/ContactModal"
import CookiesModem from "@/components/modems/Cookies"
import QnaContact from "@/components/pages/index/QnaContact"
import {
    getConsultants,
    getContactContent,
    getCookiesContent,
    getHomepageContent,
    getNavbarContent,
    getPageContent,
    getRoster,
    getAssistant,
    readerFor,
    viewOf,
} from "@/lib/site"

/**
 * Jeden povrch, sám na stránce.
 *
 * Proč to existuje: modál a rozbalovací seznam se v rámu vybrat myší nedají —
 * překryv hledá prvky geometricky a co má `display: none`, obdélník nemá. Studio
 * to dosud řešilo formulářem nad stránkou: editor viděl pole, ne to, co dělají.
 *
 * Tahle routa je druhá odpověď a lepší. Rám se přepne sem, povrch se vykreslí
 * otevřený a klikací úpravy fungují přesně jako na kterékoli stránce — protože
 * to stránka je, jen je na ní jedna komponenta místo celé routy. `defineSurface`
 * na ni ukazuje přes `preview`; viz cms/site/surfaces.js.
 *
 * Předloha je ./home.jsx — tentýž nápad (routa, kterou načítá jedině rám),
 * jiný důvod.
 *
 * ---------------------------------------------------------------------------
 * Proč `siteChrome` a ne holá stránka
 *
 * Povrch není obrázek na bílém pozadí; je to kus webu a vypadá tak, jak ho
 * obklopuje web. Shell navíc dodává lištu — a u povrchů `navbar` a
 * `navbar.advisors` je lišta ta komponenta, o kterou jde. Otevře se sama:
 * `useStudioSurface` čte jméno povrchu, které Studio píše na `<html>` rámu.
 * Proto tu pro ně není žádný záznam v `SURFACES` a `main` zůstane prázdný —
 * panel ho stejně celý překryje.
 */
const SURFACES = {
    // `studioRoot` je hranice výběru. Bez ní najde překryv i to, co leží POD
    // povrchem — `_app` kreslí patičku i pod touhle routou — a editor dostane
    // rámeček kolem textu, na který se nedívá. Viz cms/edit/surface.js.
    cookies: ({ cookies }) => (
        // `settings` i `setSettings` napevno: tady se modál zavřít nemá. Zavřený
        // modál je přesně ten stav, kvůli kterému se tahle routa píše.
        <CookiesModem settings setSettings={() => {}} copy={cookies} studioRoot="cookies" />
    ),
    contact: ({ contact, assistant }) => (
        <ContactModal open onClose={() => {}} assistant={assistant} copy={contact} studioRoot="contact" />
    ),
    // Formuláře. Každý se vykresluje ve své vlastní komponentě, ne v celé
    // stránce — o to v téhle routě jde. `AddReview` si navíc sám sáhne na
    // `useStudioSurface` a rozbalí se; sbalený by tu nebylo do čeho klikat.
    "recenze.form": ({ consultants, reviewForm, reviewNotices }) => (
        <AddReview
            consultants={consultants}
            copy={reviewForm}
            notices={reviewNotices}
            studioRoot="recenze.form"
        />
    ),
    "index.advisorForm": ({ consultants, advisorsCopy, advisorFormCopy }) => (
        <ChooseAdvisor consultants={consultants} copy={advisorsCopy} formCopy={advisorFormCopy} />
    ),
    "index.qnaForm": ({ qna }) => <QnaContact copy={qna} />,
}

export async function getStaticProps(context) {
    const name = String(context.params?.name || "")

    // Draft, nebo okamžik v Archivu — obojí přichází na téže cookie a `viewOf`
    // je rozliší. Bez draftu nenesou bloky `id`, a bez `id` není do čeho klikat;
    // to je záměr, tohle je routa pro editora.
    const view = viewOf(context)
    const read = readerFor(view)

    // Jedno čtení pro všechny povrchy, ne větvení podle `name`.
    //
    // Je to routa, kterou načítá jedině rám Studia — nejvýš jeden editor v jednu
    // chvíli — takže pár dotazů navíc nikoho nestojí nic. Za to se nemůže stát,
    // že nový povrch ukáže prázdno proto, že se zapomnělo doplnit větev.
    const [cookies, navbar, roster, contact, assistant, consultants, home, recenze] =
        await Promise.all([
            getCookiesContent(view),
            getNavbarContent(view),
            // Poradci. Lišta je vykresluje ve druhém pohledu panelu a bere si je
            // z `pageProps` — bez tohohle by povrch „Menu — poradci" ukázal
            // prázdnou stěnu a vypadalo by to jako porucha, ne jako chybějící props.
            getRoster({ read }),
            getContactContent(view),
            getAssistant({ read }),
            getConsultants({ kind: "consultant", read }),
            getHomepageContent(view),
            getPageContent("/recenze", view),
        ])

    return {
        props: {
            name,
            cookies,
            navbar,
            roster,
            contact,
            assistant,
            consultants,
            advisorsCopy: home?.advisorsCopy || {},
            advisorFormCopy: home?.advisorFormCopy || {},
            qna: home?.qna || {},
            reviewForm: recenze?.form || {},
            reviewNotices: recenze?.notices || null,
        },
        revalidate: 15,
    }
}

/**
 * Cesty se negenerují dopředu, a je to jediná rozumná volba.
 *
 * Povrchy jsou v `cms.config.js` a přibývají tam, kde se píše web — ne tam, kde
 * se staví. `blocking` znamená, že nová adresa prostě funguje, aniž by ji někdo
 * musel dopsat sem, a náhled se stejně načítá jedině v rámu Studia.
 */
export function getStaticPaths() {
    return { paths: [], fallback: "blocking" }
}

function SurfacePreview({ name, ...data }) {
    const render = SURFACES[name]

    return (
        <>
            <Head>
                <title>Náhled povrchu — Studio</title>
                <meta key="robots" name="robots" content="noindex, nofollow" />
            </Head>
            {/* Hranice i tady. Povrchy, které se neportálují (oba formuláře
                z úvodní stránky), bydlí rovnou v `main`, takže jim stačí tohle;
                modály si ji nesou samy, protože jejich portál z `main` uteče. */}
            <main lang="cs" data-cms-surface-preview={name} {...surfaceRoot(name)}>
                {render ? render(data) : null}
            </main>
        </>
    )
}

export default siteChrome(SurfacePreview)
