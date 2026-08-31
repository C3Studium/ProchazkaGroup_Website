// Kde Studio na tomhle webu bydlí.
//
// Všechno, co administrace potřebuje, je v CMS — tenhle soubor existuje jen
// proto, aby to mělo adresu. Je to catch-all, takže jedna deklarace pokrývá
// všechny pohledy Studia a ten, který přibude zítra, na nic nezapomene.
//
// Dřív tu ležela celá: líný port, klientský load, načítací obrazovka. Než se
// z CMS stala knihovna, nebylo kam to dát. Teď by to byla druhá kopie, která se
// rozejde s tou první.
import { createStudioPage } from "@/cms/studio/page"

export default createStudioPage({ title: "Studio — Procházka Group" })
