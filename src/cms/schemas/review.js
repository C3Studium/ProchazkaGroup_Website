// review — migrated from the live `reviews` table (37 rows, inspected).
//
// Notes from the real data:
//
//   - Columns are id, created_at, likes, ip_list, list_of_all_ips,
//     consultant_name, hashtag, message, number, customer_name. There is no
//     `approved` column: everything in that table is on the site the moment it
//     is inserted, by a browser-side insert with the anon key. `approved` below
//     is the field that ends that.
//   - `hashtag` is 'poradce' in all 37 live rows, but the submission hook can
//     also write 'benefitprogram', so both are in the list.
//   - `number` is 1..37 with no gaps and no duplicates — a display ordering,
//     not a rating. Mapped to `order`.
//   - `message` runs 4..729 characters. The 4-character ones are literally
//     "test". min(10) below is a deliberate choice about what should be
//     accepted from now on; the migration reports the legacy short rows rather
//     than pretending they pass.
//   - ip_list / list_of_all_ips are NOT here. IP addresses are personal data
//     and no lawful basis for holding them has been stated, so they are dropped
//     at the migration and never collected by the replacement route.
//   - There is no email field. The public form collects one and the live table
//     has nowhere to put it; `data` is world-readable once a document is
//     published, so this is the wrong place for a submitter's address.

import { defineField, defineType } from '@/cms/core'

export default defineType({
    name: 'review',
    title: 'Recenze',
    icon: 'star',
    groups: [
        { name: 'obsah', title: 'Obsah', default: true },
        { name: 'moderace', title: 'Moderace' },
    ],
    fields: [
        defineField({
            name: 'customerName',
            title: 'Jméno klienta',
            type: 'string',
            group: 'obsah',
            validation: (rule) => rule.required().min(2).max(120),
        }),
        defineField({
            name: 'consultantName',
            title: 'Poradce',
            type: 'string',
            group: 'obsah',
            // A string rather than a reference, because the live table is keyed
            // by name and the public site renders that name directly. The
            // public submission route checks it against published consultants,
            // so the integrity a reference would give is enforced at the write.
            // Turning this into a real reference is a follow-up, not something
            // to fake now.
            description: 'Musí odpovídat jménu publikovaného poradce.',
            validation: (rule) => rule.required().min(2).max(120),
        }),
        defineField({
            name: 'message',
            title: 'Text recenze',
            type: 'text',
            group: 'obsah',
            options: { rows: 6 },
            validation: (rule) => rule.required().min(10).max(2000),
        }),
        defineField({
            name: 'hashtag',
            title: 'Kategorie',
            type: 'select',
            group: 'obsah',
            options: {
                list: [
                    { value: 'poradce', title: 'Poradce' },
                    { value: 'benefitprogram', title: 'Benefit program' },
                ],
            },
            initialValue: 'poradce',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'approved',
            title: 'Schváleno',
            type: 'boolean',
            group: 'moderace',
            initialValue: false,
            description: 'Nastavuje výhradně editor. Veřejný formulář ho nikdy neposílá.',
        }),
        defineField({
            name: 'likes',
            title: 'Líbí se',
            type: 'number',
            group: 'moderace',
            initialValue: 0,
            validation: (rule) => rule.min(0),
        }),
        defineField({
            name: 'order',
            title: 'Pořadí',
            type: 'number',
            group: 'moderace',
            description: 'Odpovídá původnímu reviews.number.',
            validation: (rule) => rule.min(0),
        }),
        defineField({
            name: 'submittedAt',
            title: 'Odesláno',
            type: 'datetime',
            group: 'moderace',
            readOnly: true,
        }),
        defineField({
            name: 'source',
            title: 'Původ',
            type: 'select',
            group: 'moderace',
            readOnly: true,
            options: {
                list: [
                    { value: 'web', title: 'Formulář na webu' },
                    { value: 'import', title: 'Import ze staré databáze' },
                    { value: 'studio', title: 'Zadáno ve Studiu' },
                ],
            },
            initialValue: 'studio',
        }),
    ],
    preview: (doc) => ({
        title: doc?.customerName || 'Bez jména',
        subtitle: `${doc?.consultantName || '—'} · ${doc?.approved ? 'schváleno' : 'čeká na schválení'}`,
        media: null,
    }),
    orderings: [
        { name: 'newest', title: 'Nejnovější', by: [{ field: 'submittedAt', direction: 'desc' }] },
        { name: 'pending', title: 'Čekající první', by: [{ field: 'approved', direction: 'asc' }, { field: 'submittedAt', direction: 'desc' }] },
        { name: 'order', title: 'Podle pořadí', by: [{ field: 'order', direction: 'asc' }] },
    ],
})
