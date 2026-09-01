// Obsah tohohle webu — SERVER ONLY.
//
// Jedna adresa pro všechno, co stránky čtou: obecná část z knihovny a k ní
// čtyři typy dokumentů, patička a /o-nas, které patří tomuhle webu.
//
// Rozdělení je v tom, jestli by to jméno dávalo smysl jinému projektu.
// `getPageContent` ano, `getConsultants` ne. Proto první přichází z `@/cms` a
// druhé bydlí tady — a knihovna se dá nasadit jinam, aniž by s sebou nesla
// slovník jedné finanční skupiny.
//
// Importuje se odsud, ne z `@/cms/server/site` — ten zůstává tím, čím je,
// a stránka nemusí vědět, která půlka je odkud.

export {
    readPublished,
    readOnePublished,
    readEditable,
    documentId,
    imageValue,
    plainText,
    slugValue,
    stringValue,
    numberValue,
    getSiteCopy,
    getPageContent,
    getHomepageContent,
    parseHighlights,
    COPY_KEYS,
    getArchiveMoment,
    momentOf,
    readAt,
    readerAt,
    readerFor,
    viewOf,
} from '@/cms/server/site'

import { registerSources } from '@/cms/server/site'

import { getApprovedReviews, getAssistant, getConsultants, getPartners } from './people.js'

// Co znamená `type: 'review'` ve `sources` v `cms.config.js`.
//
// Knihovna tuhle tabulku mít nemůže — `partner`, `poradce` a `asistentka` jsou
// typy dokumentů tohohle webu. Zapisuje se při načtení tohohle modulu, tedy
// dřív, než kterákoli stránka zavolá `getPageContent`: všechny ho volají přes
// tenhle barrel.
registerSources({
    partner: (options, read) => getPartners({ ...options, read }),
    review: (options, read) => getApprovedReviews({ ...options, read }),
    consultant: (options, read) => getConsultants({ ...options, read }),
    assistant: (options, read) => getAssistant({ ...options, read }),
})

export { getPartners, getApprovedReviews, getConsultants, getAssistant } from './people.js'
export { getAboutContent, ABOUT_KEYS } from './aboutUs.js'
export {
    getFooterContent,
    getContactContent,
    footerStaticProps,
    FOOTER_KEY,
    FOOTER_LINES,
    FOOTER_LINKS,
    CLAIM_LINES,
    CONTACT_LINES,
    GLOBAL_KEYS,
} from './footer.js'
