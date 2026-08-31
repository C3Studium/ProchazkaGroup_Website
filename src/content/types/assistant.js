// assistant — the person on the other end of the contact sheet.
//
// A type of her own rather than a `kind` on `consultant`, because she is not
// one: she has no slug, no page, no motto, no review counter and no portrait
// pair. Bending the consultant type to hold her would make every one of those
// fields optional for everybody, which is how a schema stops describing
// anything.
//
// One row is expected. Nothing enforces that — a `singleton` concept does not
// exist here — so the reader takes the first by `order` and the field below
// says so out loud.

import { defineField, defineType } from '@/cms/core'

export default defineType({
    name: 'assistant',
    title: 'Asistentka',
    icon: 'user',
    fields: [
        defineField({
            name: 'name',
            title: 'Jméno',
            type: 'string',
            description: 'Zobrazí se v kontaktním okně, které se otevírá z navigace.',
            validation: (rule) => rule.required().min(2).max(120),
        }),
        defineField({
            name: 'role',
            title: 'Pozice',
            type: 'string',
            description: 'Drobný popisek pod jménem. Nepovinné.',
            validation: (rule) => rule.max(60),
        }),
        defineField({
            name: 'phone',
            title: 'Telefon',
            type: 'string',
            description: 'Ve tvaru +420 777 898 157. Web z něj sám udělá odkaz tel:.',
            validation: (rule) => rule.max(40),
        }),
        defineField({
            name: 'email',
            title: 'E-mail',
            type: 'string',
            validation: (rule) => rule.max(160),
        }),
        defineField({
            name: 'photo',
            title: 'Fotka',
            type: 'image',
            description: 'Na výšku, 4:5. Vykresluje se s ořezem od horní hrany, aby seděla tvář.',
        }),
        defineField({
            name: 'order',
            title: 'Pořadí',
            type: 'number',
            description: 'Web bere první v pořadí. Slouží jen k tomu, kdyby jich tu bylo víc.',
            initialValue: 0,
        }),
    ],
    // A function, not a `select` map. This core takes `(doc) => ({...})` and
    // rejects the object form outright — the Studio returned a 500 until this
    // matched consultant.js.
    preview: (doc) => ({
        title: doc?.name || 'Bez jména',
        subtitle: doc?.role || doc?.email || '',
        media: doc?.photo || null,
    }),
})
