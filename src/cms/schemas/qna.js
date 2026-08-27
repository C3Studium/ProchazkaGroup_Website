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

/**
 * A question and its answer — the pair, declared once.
 *
 * The FAQ exists in two shapes on this site and they are the same two fields:
 * a document per question (this type), and the homepage's block, where the five
 * questions are an array on one siteCopy document so that one `list` popup can
 * open the whole thing (EDIT-SURFACES, round four §6). Exporting the pair is
 * what keeps that from becoming two declarations of "a Q&A" that agree until
 * somebody widens one of them — `defineField` is idempotent, so the same frozen
 * descriptors are safe to hand to a second type.
 *
 * The bounds are the document's own and are deliberately not relaxed for the
 * array: a question too short to be a question is one wherever it is stored.
 */
export const QNA_PAIR_FIELDS = Object.freeze([
    defineField({
        name: 'question',
        title: 'Otázka',
        type: 'string',
        validation: (rule) => rule.required().min(5).max(300),
    }),
    defineField({
        name: 'answer',
        title: 'Odpověď',
        type: 'text',
        options: { rows: 8 },
        validation: (rule) => rule.required().min(10).max(3000),
    }),
])

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
