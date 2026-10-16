// newsWidget — nastavení plovoucího okna novinek.
//
// Jeden dokument, ne nastavení v jádře CMS: je to věc tohohle webu, ne
// knihovny, a jako dokument ho majitel najde v Obsahu hned vedle Novinek.
// Zakládá ho jen správce (`createRoles`), takže zůstane jeden; web bere první
// publikovaný a bez něj použije výchozí hodnoty z src/pages/api/news.js.
//
// Web ho čte za běhu přes /api/news, ne při buildu stránek, takže přesun
// widgetu je na webu vidět při dalším načtení (stejný důvod jako u widgetu
// „Spravovat web", viz src/cms/server/manageWidget.js).

import { defineField, defineType } from '@/cms/core'

/** Polohy, v pořadí nabídky. Hodnoty čte NewsWidget jako třídu. */
export const NEWS_WIDGET_POSITIONS = [
    { value: 'bottom-right', title: 'Vpravo dole' },
    { value: 'lower-right', title: 'Vpravo ve dvou třetinách výšky' },
    { value: 'middle-right', title: 'Vpravo uprostřed' },
    { value: 'bottom-left', title: 'Vlevo dole' },
    { value: 'lower-left', title: 'Vlevo ve dvou třetinách výšky' },
    { value: 'middle-left', title: 'Vlevo uprostřed' },
]

export default defineType({
    name: 'newsWidget',
    title: 'Widget novinek',
    icon: 'settings',
    createRoles: ['admin'],
    fields: [
        defineField({
            name: 'enabled',
            title: 'Zobrazit na webu',
            type: 'boolean',
            initialValue: true,
        }),
        defineField({
            name: 'position',
            title: 'Poloha',
            type: 'select',
            description: 'Kde na obrazovce widget stojí. Na telefonu se okno novinek vždy otevře přes celou obrazovku.',
            options: { list: NEWS_WIDGET_POSITIONS },
            initialValue: 'bottom-right',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'bubble',
            title: 'Text bubliny',
            type: 'string',
            description: 'Krátká výzva vedle tlačítka. Návštěvník ji může zavřít; tlačítko pak zajede napůl k okraji.',
            initialValue: 'Podívejte se na novinky na trhu',
            validation: (rule) => rule.max(70),
        }),
        defineField({
            name: 'heading',
            title: 'Nadpis okna',
            type: 'string',
            initialValue: 'Novinky na trhu',
            validation: (rule) => rule.max(40),
        }),
        defineField({
            name: 'intro',
            title: 'Úvodní zpráva',
            type: 'text',
            options: { rows: 3 },
            description: 'První „zpráva" v okně, nad novinkami. Nepovinné.',
            initialValue: 'Dobrý den, tady najdete, co se aktuálně děje v hypotékách, pojištění a investicích. Novinky přidáváme průběžně.',
            validation: (rule) => rule.max(300),
        }),
    ],
    preview: (doc) => ({
        title: 'Widget novinek',
        subtitle: [
            doc?.enabled === false ? 'skrytý' : 'zobrazený',
            NEWS_WIDGET_POSITIONS.find((p) => p.value === doc?.position)?.title || '',
        ].filter(Boolean).join(' · '),
        media: null,
    }),
})
