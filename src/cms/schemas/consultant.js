// consultant — migrated from the live `people` table (13 rows, inspected).
//
// Notes from the real data rather than from a guess at it:
//
//   - Every row has `moto`; exactly one row is missing tel/mail/fb/ig/pribeh,
//     and it is "Benefit Program" — not a person but a pseudo-consultant that
//     exists so the review form can attribute a review to the programme. That
//     is why `kind` exists and why the contact fields are optional: making them
//     required would make the real data invalid on day one.
//   - `moto` runs to 100 characters and `pribeh` to 137 in the live rows. The
//     limits below leave room to grow without inviting an essay.
//   - `src`/`alt` are paths into /public, not uploads. The image field carries
//     them through unchanged; re-uploading through the media library is an
//     editor action, not something the migration should force.
//   - `likes` and `reviews` are counters the public site increments. They are
//     here because dropping them would lose live numbers, and they are marked
//     readOnly because an editor typing into them is not how they should
//     change. See the note in the migration script about where counters
//     actually belong.
//
// ---------------------------------------------------------------------------
// The name is three fields, not one
// ---------------------------------------------------------------------------
// `people.name` is a single string that already carries titles in some rows
// ("Mgr. Václav Procházka"), which makes every question about a person's name
// a parsing problem: sorting by surname, addressing them in an e-mail, printing
// "Ing." only where there is one. The client asked for the three parts, so the
// three parts are what is stored, and the display string is composed on the way
// out by `consultantFullName` below — one definition, used by the Studio
// preview and by the public site, so the two cannot drift.
//
// Only `academicTitle` is optional. A consultant with no surname is not a
// record anyone wants, and the migration's parser is written to put the whole
// name in `lastName` rather than leave it blank when it cannot split safely.

import { defineField, defineType } from '@/cms/core'

/**
 * The display name, everywhere. Title first in the Czech convention, and each
 * part omitted when empty so a person without a title does not get a leading
 * space and the "Benefit Program" pseudo-row still reads correctly.
 *
 * @param {{academicTitle?:string, firstName?:string, lastName?:string}} data
 * @returns {string}
 */
export const consultantFullName = (data) =>
    [data?.academicTitle, data?.firstName, data?.lastName]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(' ')

export default defineType({
    name: 'consultant',
    title: 'Poradce',
    icon: 'user',
    groups: [
        { name: 'obsah', title: 'Obsah', default: true },
        { name: 'fotky', title: 'Fotky' },
        { name: 'kontakt', title: 'Kontakt' },
        { name: 'meta', title: 'Zařazení' },
    ],
    fields: [
        defineField({
            name: 'academicTitle',
            title: 'Titul',
            type: 'string',
            group: 'obsah',
            options: { width: 'half' },
            description: 'Např. „Mgr.", „Ing.", „Bc.". Nechte prázdné, pokud poradce titul neuvádí.',
            validation: (rule) => rule.max(24),
        }),
        defineField({
            name: 'firstName',
            title: 'Jméno',
            type: 'string',
            group: 'obsah',
            options: { width: 'half' },
            validation: (rule) => rule.required().min(2).max(60),
        }),
        defineField({
            name: 'lastName',
            title: 'Příjmení',
            type: 'string',
            group: 'obsah',
            options: { width: 'half' },
            validation: (rule) => rule.required().min(2).max(60),
        }),
        defineField({
            name: 'slug',
            title: 'URL',
            type: 'slug',
            group: 'obsah',
            // Surname first, matching the pages that already exist under
            // src/pages/reviews/ ("kaslova-olga"). Those URLs are indexed.
            options: { source: ['lastName', 'firstName'], maxLength: 96 },
            description: 'Používá se v /reviews/<url>. Změna rozbije existující odkazy.',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'kind',
            title: 'Typ',
            type: 'select',
            group: 'meta',
            options: {
                list: [
                    { value: 'consultant', title: 'Poradce' },
                    { value: 'program', title: 'Program (není osoba)' },
                ],
            },
            initialValue: 'consultant',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'motto',
            title: 'Motto',
            type: 'string',
            group: 'obsah',
            description: 'Jedna věta, kterou se poradce představuje. Ukazuje se v seznamu poradců.',
            validation: (rule) => rule.required().max(200),
        }),
        defineField({
            name: 'story',
            title: 'Příběh',
            type: 'text',
            group: 'obsah',
            options: { rows: 6 },
            validation: (rule) => rule.max(2000),
        }),

        // Two photos, named for where they end up. An editor uploading into a
        // field called "Fotka 2" has no way to know which one the client meant,
        // so the titles and descriptions carry the answer instead of a comment
        // in this file. Two named fields rather than an array for the same
        // reason: an array of unknown length cannot say which is which, and the
        // client asked for exactly two.
        //
        // The second one is empty for everybody imported from `people`, which
        // has a single image column — the migration does not invent one, and
        // neither does anything downstream. The roster on /o-nas turns the
        // portrait over to it under the pointer where it exists and leaves the
        // first one up where it does not, so an absent second photograph is a
        // missing flourish rather than a hole.
        defineField({
            name: 'portrait',
            title: 'Portrét na úvodní stránku',
            type: 'image',
            group: 'fotky',
            options: { hotspot: false },
            description:
                'Zobrazuje se v sekci „Zvolit poradce" na úvodní stránce, oříznutý na výšku od horního okraje. ' +
                'Nejlépe portrét na výšku, obličej v horní třetině.',
        }),
        defineField({
            name: 'portraitDetail',
            title: 'Fotka na profil poradce',
            type: 'image',
            group: 'fotky',
            options: { hotspot: false },
            description:
                'Druhá fotka. Ukazuje se na stránce „O nás“, když na poradci zůstane myš, ' +
                'a na jeho vlastní stránce s recenzemi (/recenze/<url>). ' +
                'Může být volnější než portrét výše. Bez ní se fotka na „O nás“ jen nepřeklopí.',
        }),

        defineField({
            name: 'phone',
            title: 'Telefon',
            type: 'string',
            group: 'kontakt',
            // Live values are all "+420 xxx xxx xxx"; the pattern allows the
            // spacing the data already uses rather than demanding a reformat.
            validation: (rule) => rule.max(32).regex(/^\+?[0-9 ]{9,}$/),
        }),
        defineField({
            name: 'email',
            title: 'E-mail',
            type: 'email',
            group: 'kontakt',
            validation: (rule) => rule.max(160),
        }),
        defineField({
            name: 'facebook',
            title: 'Facebook',
            type: 'url',
            group: 'kontakt',
        }),
        defineField({
            name: 'instagram',
            title: 'Instagram',
            type: 'url',
            group: 'kontakt',
        }),
        defineField({
            name: 'order',
            title: 'Pořadí',
            type: 'number',
            group: 'meta',
            description: 'Nižší číslo je výš. Odpovídá původnímu people.id.',
            initialValue: 100,
            validation: (rule) => rule.required().min(0),
        }),
        defineField({
            name: 'stats',
            title: 'Počítadla',
            type: 'object',
            group: 'meta',
            readOnly: true,
            description: 'Udržuje web, ne editor. Zobrazeno jen pro kontrolu.',
            fields: [
                defineField({ name: 'likes', title: 'Líbí se', type: 'number', initialValue: 0 }),
                defineField({ name: 'reviewCount', title: 'Počet recenzí', type: 'number', initialValue: 0 }),
            ],
        }),
        defineField({
            name: 'legacyId',
            title: 'Původní ID',
            type: 'number',
            group: 'meta',
            readOnly: true,
            hidden: (doc) => !doc?.legacyId,
        }),
    ],
    preview: (doc) => ({
        title: consultantFullName(doc) || 'Bez jména',
        subtitle: doc?.kind === 'program' ? 'Program' : (doc?.motto || ''),
        media: doc?.portrait || null,
    }),
    orderings: [
        { name: 'order', title: 'Podle pořadí', by: [{ field: 'order', direction: 'asc' }] },
        { name: 'name', title: 'Podle příjmení', by: [{ field: 'lastName', direction: 'asc' }] },
        { name: 'reviews', title: 'Podle počtu recenzí', by: [{ field: 'stats.reviewCount', direction: 'desc' }] },
    ],
})
