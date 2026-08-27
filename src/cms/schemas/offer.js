// offer — a deal on /nabidky.
//
// Modelled on src/constants/nabidkypage.js `projects`, which is what that page
// renders today: number, title, description, href, src, alt. The `number`
// there is a two-digit display label ('01'..'04') and also the sort order, so
// it is stored once as `order` and rendered padded.
//
// The live entries include one placeholder ("Project 04", "Stále v přípravě")
// and one deal that is not agreed yet ("ve stavu vyjednávání"). Both are real
// editorial states, which is why `status` exists rather than the page having to
// infer "coming soon" from the wording of a description.

import { defineField, defineType } from '@/cms/core'

export default defineType({
    name: 'offer',
    title: 'Nabídka',
    icon: 'tag',
    fields: [
        defineField({
            name: 'title',
            title: 'Název',
            type: 'string',
            validation: (rule) => rule.required().min(2).max(120),
        }),
        defineField({
            name: 'slug',
            title: 'URL',
            type: 'slug',
            options: { source: 'title', maxLength: 96 },
        }),
        defineField({
            name: 'description',
            title: 'Popis nabídky',
            type: 'text',
            options: { rows: 4 },
            description: 'Co klient dostane. Např. "50% sleva na roční předplatné".',
            validation: (rule) => rule.required().min(10).max(500),
        }),
        defineField({
            name: 'partner',
            title: 'Partner',
            type: 'reference',
            options: { to: [{ type: 'partner' }] },
            description: 'Firma, která nabídku poskytuje.',
        }),
        defineField({
            name: 'image',
            title: 'Obrázek',
            type: 'image',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'url',
            title: 'Odkaz',
            type: 'url',
        }),
        defineField({
            name: 'offerStatus',
            title: 'Stav',
            type: 'select',
            options: {
                list: [
                    { value: 'active', title: 'Platí' },
                    { value: 'negotiating', title: 'Ve vyjednávání' },
                    { value: 'preparing', title: 'V přípravě' },
                    { value: 'ended', title: 'Ukončeno' },
                ],
            },
            initialValue: 'active',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'validUntil',
            title: 'Platí do',
            type: 'date',
            description: 'Prázdné = bez omezení.',
        }),
        defineField({
            name: 'order',
            title: 'Pořadí',
            type: 'number',
            description: 'Zobrazuje se jako dvouciferné číslo (01, 02, ...).',
            initialValue: 100,
            validation: (rule) => rule.required().min(0),
        }),
    ],
    preview: (doc) => ({
        title: doc?.title || 'Bez názvu',
        subtitle: doc?.description || '',
        media: doc?.image || null,
    }),
    orderings: [
        { name: 'order', title: 'Podle pořadí', by: [{ field: 'order', direction: 'asc' }] },
        { name: 'status', title: 'Podle stavu', by: [{ field: 'offerStatus', direction: 'asc' }] },
    ],
})
