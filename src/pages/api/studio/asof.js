// Režim prohlížeče pro Studio — viz @/cms/server/studio.
//
// Logika je v CMS, tenhle soubor jí dává adresu. Dřív tu ležela celá: než se
// z CMS stala knihovna, nebylo kam ji dát. Teď by to byla druhá kopie, která
// se rozejde s tou první.
//
// `registerSchemas` i tady, ne jen v catch-allu pod /api/cms: registr typů
// odmítá duplicity záměrně a tahle routa je vlastní vstupní bod, který si
// konfiguraci webu vyhodnotí znovu.
import '@/cms/server/registerSchemas'

export { handleAsof as default } from '@/cms/server/studio'
