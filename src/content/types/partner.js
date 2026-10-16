// partner — the companies whose logos and names appear on the site.
//
// No live table backs this: it is in code today, in two places that turn out to
// be two different things wearing one word.
//
//   - src/constants/mainpage.js `partnersIcons` — ~43 financial institutions
//     (Allianz, ČSOB, Conseq, ...). Logo and name only; they exist to show
//     which markets the group can quote from.
//   - src/constants/nabidkypage.js `projects` — local businesses (Pojistné
//     hlášení, ElevenCosmetic, ReKvítka) that give Procházka Group clients a
//     discount. Logo, name, link, and a deal attached.
//
// `kind` is the split the SPEC asked for. The deal itself is NOT here — it is
// an `offer`, which references a partner, because "ElevenCosmetic" and "10% for
// our clients" have different lifetimes: the discount is renegotiated, the
// company is not.

import { defineField, defineType } from '@/cms/core'

export default defineType({
    name: 'partner',
    title: 'Partner',
    icon: 'building',
    fields: [
        defineField({
            name: 'name',
            title: 'Název',
            type: 'string',
            validation: (rule) => rule.required().min(2).max(120),
        }),
        defineField({
            name: 'slug',
            title: 'URL',
            type: 'slug',
            options: { source: 'name', maxLength: 96 },
        }),
        defineField({
            name: 'kind',
            title: 'Druh partnera',
            type: 'select',
            options: {
                list: [
                    { value: 'financial', title: 'Finanční instituce' },
                    { value: 'local', title: 'Lokální partner' },
                ],
            },
            initialValue: 'financial',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'logo',
            title: 'Logo',
            type: 'image',
            description: 'Na průhledném pozadí. Web loga vykresluje na 200×150 s object-fit: contain.',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'url',
            title: 'Web partnera',
            type: 'url',
            // Financial partners are listed, not linked — the logo strip on the
            // homepage has no links at all. Only local partners need one.
            hidden: (doc) => doc?.kind !== 'local',
        }),
        defineField({
            name: 'description',
            title: 'Popis',
            type: 'text',
            options: { rows: 3 },
            hidden: (doc) => doc?.kind !== 'local',
            validation: (rule) => rule.max(400),
        }),
        defineField({
            name: 'order',
            title: 'Pořadí',
            type: 'number',
            initialValue: 100,
            validation: (rule) => rule.required().min(0),
        }),
        defineField({
            name: 'active',
            title: 'Zobrazit na webu',
            type: 'boolean',
            initialValue: true,
        }),
    ],
    preview: (doc) => ({
        title: doc?.name || 'Bez názvu',
        subtitle: doc?.kind === 'local' ? 'Lokální partner' : 'Finanční instituce',
        media: doc?.logo || null,
    }),
    orderings: [
        { name: 'order', title: 'Podle pořadí', by: [{ field: 'order', direction: 'asc' }] },
        { name: 'name', title: 'Podle názvu', by: [{ field: 'name', direction: 'asc' }] },
    ],
})
