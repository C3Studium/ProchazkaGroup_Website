// qna — the FAQ.
//
// Modelled on src/constants/pages/qna.js: six entries, each a plain
// { question, answer } pair with no ordering key, no grouping and no links —
// the order is the array order. `order` and `category` below are the two things
// the constant could not express and that an editor will want the first time
// they add a seventh entry.
//
// Answers in the live copy embed e-mail addresses in prose
// ("asistentka.prochazka@ovbone.cz"). `answer` is text rather than richText for
// that reason: the existing renderer prints a string, and promoting it to rich
// text would change what the component receives. Left as a follow-up for
// whoever converts the accordion.

import { defineField, defineType } from '@/cms/core'
import { QNA_PAIR_FIELDS } from '@/cms/schemas/siteCopy'

// The pair lives with the array field that also uses it — see siteCopy.js.
// Re-exported so this type stays the obvious place to look for it.
export { QNA_PAIR_FIELDS }


export default defineType({
    name: 'qna',
    title: 'Časté dotazy',
    icon: 'help',
    fields: [
        ...QNA_PAIR_FIELDS,
        defineField({
            name: 'category',
            title: 'Sekce',
            type: 'select',
            options: {
                list: [
                    { value: 'obecne', title: 'Obecné' },
                    { value: 'sluzby', title: 'Služby' },
                    { value: 'benefit', title: 'Benefit program' },
                    { value: 'kariera', title: 'Kariéra' },
                ],
            },
            initialValue: 'obecne',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'order',
            title: 'Pořadí',
            type: 'number',
            initialValue: 100,
            validation: (rule) => rule.required().min(0),
        }),
    ],
    preview: (doc) => ({
        title: doc?.question || 'Bez otázky',
        subtitle: (doc?.answer || '').slice(0, 90),
        media: null,
    }),
    orderings: [
        { name: 'order', title: 'Podle pořadí', by: [{ field: 'order', direction: 'asc' }] },
        { name: 'category', title: 'Podle sekce', by: [{ field: 'category', direction: 'asc' }, { field: 'order', direction: 'asc' }] },
    ],
})
