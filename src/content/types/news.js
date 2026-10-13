// news — Novinky.
//
// Krátké zprávy „co je nového na trhu", které web ukazuje v plovoucím okně
// novinek (components/common/NewsWidget). Jedna novinka = jedna zpráva v tom
// okně: titulek, jednou větou o co jde, text a volitelně tlačítko s odkazem.
//
// Datum se předvyplní dnešním dnem při založení a dá se přepsat — novinka
// může popisovat něco, co se stalo včera, a filtr podle data na webu má
// řadit podle toho, kdy se to stalo, ne kdy to někdo napsal.
//
// Filtrování podle rozsahu dat dělá web sám (v okně novinek); server vrací
// publikované novinky seřazené od nejnovější, viz src/pages/api/news.js.

import { defineField, defineType } from '@/cms/core'

/** Dnešní datum jako YYYY-MM-DD v místním čase — tvar, který chce pole `date`. */
const today = () => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default defineType({
    name: 'news',
    title: 'Novinky',
    icon: 'inbox',
    fields: [
        defineField({
            name: 'title',
            title: 'Titulek',
            type: 'string',
            description: 'Krátce a věcně, ukazuje se tučně nahoře ve zprávě.',
            validation: (rule) => rule.required().max(90),
        }),
        defineField({
            name: 'summary',
            title: 'O co jde',
            type: 'string',
            description: 'Jedna věta pod titulkem. Nepovinné.',
            validation: (rule) => rule.max(160),
        }),
        defineField({
            name: 'date',
            title: 'Datum',
            type: 'date',
            description: 'Vyplní se samo dnešním dnem. Podle něj se novinky na webu řadí a filtrují.',
            initialValue: today,
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'message',
            title: 'Zpráva',
            type: 'text',
            options: { rows: 6 },
            validation: (rule) => rule.required().max(1200),
        }),
        defineField({
            name: 'linkUrl',
            title: 'Odkaz tlačítka',
            type: 'url',
            description: 'Kam tlačítko vede — celá adresa (https://…) nebo stránka webu (/nabidka). Bez odkazu se tlačítko neukáže.',
        }),
        defineField({
            name: 'linkLabel',
            title: 'Text tlačítka',
            type: 'string',
            initialValue: 'Zjistit víc',
            validation: (rule) => rule.max(40),
        }),
    ],
    preview: (doc) => ({
        title: doc?.title || 'Bez titulku',
        subtitle: [doc?.date ? String(doc.date).split('-').reverse().join('. ') : '', doc?.summary || ''].filter(Boolean).join(' · '),
        media: null,
    }),
    orderings: [
        { name: 'date', title: 'Od nejnovější', by: [{ field: 'date', direction: 'desc' }] },
        { name: 'dateAsc', title: 'Od nejstarší', by: [{ field: 'date', direction: 'asc' }] },
    ],
})
