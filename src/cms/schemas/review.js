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

/**
 * Why a rejection is refused publication and never deleted.
 *
 * Rejecting used to call `remove()`. These are consumer reviews, and the Omnibus
 * amendment to zákona o ochraně spotřebitele requires a business publishing them
 * to be able to account for how it handles them — and specifically not to
 * suppress the unfavourable ones. A deleted review proves nothing in either
 * direction. A rejected one, kept with who / when / why, is what shows the queue
 * was not cherry-picked. So `reject` archives (server/documents.js) and stamps
 * the three fields below.
 *
 * NOT ONE OF THESE REASONS IS ABOUT WHETHER THE REVIEW IS FLATTERING. That is
 * the whole point of a closed list: every value here is about whether the
 * submission is a real, publishable review, and there is deliberately no entry
 * an editor could reach for to mean "this one is negative". A free-text box
 * would have collected exactly that sentence and been unanswerable besides —
 * migrations/0007's header makes the same argument about `reason`.
 */
export const REJECTION_REASONS = Object.freeze([
    { value: 'spam', title: 'Spam nebo test', hint: 'Nesmyslný text, zkouška formuláře, reklama.' },
    { value: 'offensive', title: 'Urážlivé nebo nevhodné', hint: 'Vulgarita, útok na osobu, nenávistný obsah.' },
    { value: 'notClient', title: 'Není od klienta', hint: 'Pisatel není klient nebo recenze není o naší službě.' },
    { value: 'duplicate', title: 'Duplicita', hint: 'Stejná recenze už ve frontě nebo na webu je.' },
    { value: 'personalData', title: 'Osobní údaje v textu', hint: 'Jméno třetí osoby, číslo smlouvy, kontakt.' },
    { value: 'other', title: 'Jiný důvod', hint: 'Nic z výše uvedeného.' },
])

export const isRejectionReason = (value) =>
    REJECTION_REASONS.some((reason) => reason.value === value)

/** The three fields a rejection writes, and the only ones `requeue` clears. */
/**
 * Kdo smí přepsat, co zákazník napsal.
 *
 * Správce a majitel. Člen recenze moderuje — schválí je, nebo zamítne — a to je
 * jiná činnost než je přepisovat: text je cizí výpověď, ne obsah webu. Pole ze
 * skupiny „moderace" (`approved`, `rejectedAt`…) tím dotčena nejsou, jinak by
 * schvalování nešlo právě těm lidem, kteří ho mají na starost.
 *
 * Zamčeno, ne skryto — `editRoles` řídí zápis, ne zobrazení. Kdo schvaluje,
 * musí si text přečíst.
 */
const CONTENT_ROLES = ['admin', 'owner']

export const REJECTION_FIELDS = Object.freeze(['rejectedAt', 'rejectedBy', 'rejectedReason'])

export default defineType({
    name: 'review',
    title: 'Recenze',
    // Nikdo kromě správce nezaloží recenzi ručně. Recenze je výpověď zákazníka;
    // kdo ji umí napsat, umí napsat i doporučení a podepsat pod ně cizí jméno.
    // Schvalovat, zamítat a archivovat smí dál i majitel a člen — brání se
    // autorství, ne moderaci.
    createRoles: ['admin'],
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
            editRoles: CONTENT_ROLES,
            validation: (rule) => rule.required().min(2).max(120),
        }),
        defineField({
            name: 'consultantName',
            title: 'Poradce',
            type: 'string',
            group: 'obsah',
            editRoles: CONTENT_ROLES,
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
            editRoles: CONTENT_ROLES,
            options: { rows: 6 },
            validation: (rule) => rule.required().min(10).max(2000),
        }),
        defineField({
            name: 'hashtag',
            title: 'Kategorie',
            type: 'select',
            group: 'obsah',
            editRoles: CONTENT_ROLES,
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
        // --- rejection ------------------------------------------------------
        //
        // Written by server/documents.js `reject()` and cleared by `requeue()`;
        // read-only here because they are the record of a decision, not a form.
        // The machine-readable half of the same event is a row in
        // cms_document_revision (`reason = 'reject'`, with `changed_by`), which
        // is append-only — these three are what an editor reads on the screen,
        // that one is what nobody can rewrite afterwards.
        defineField({
            name: 'rejectedAt',
            title: 'Zamítnuto',
            type: 'datetime',
            group: 'moderace',
            readOnly: true,
            description: 'Vyplní se automaticky při zamítnutí. Prázdné = recenze zamítnutá není.',
        }),
        defineField({
            name: 'rejectedBy',
            title: 'Zamítl(a)',
            type: 'string',
            group: 'moderace',
            readOnly: true,
            // The name as it was at the moment of the decision, not a reference:
            // "kdo to zamítl" has to stay answerable after that person's account
            // is gone, and the uuid lives on the revision for the machine.
            description: 'Jméno v době rozhodnutí.',
        }),
        defineField({
            name: 'rejectedReason',
            title: 'Důvod zamítnutí',
            type: 'select',
            group: 'moderace',
            readOnly: true,
            options: { list: REJECTION_REASONS.map(({ value, title }) => ({ value, title })) },
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
    // The subtitle carries the moderation state because this is what the archive
    // list and the "smazat natrvalo" confirmation print — a rejected review has
    // to be findable there by something other than the customer's name.
    preview: (doc) => ({
        title: doc?.customerName || 'Bez jména',
        subtitle: `${doc?.consultantName || '—'} · ${
            doc?.rejectedAt
                ? `zamítnuto${doc?.rejectedBy ? ` — ${doc.rejectedBy}` : ''}`
                : doc?.approved ? 'schváleno' : 'čeká na schválení'
        }`,
        media: null,
    }),
    orderings: [
        { name: 'newest', title: 'Nejnovější', by: [{ field: 'submittedAt', direction: 'desc' }] },
        { name: 'pending', title: 'Čekající první', by: [{ field: 'approved', direction: 'asc' }, { field: 'submittedAt', direction: 'desc' }] },
        { name: 'order', title: 'Podle pořadí', by: [{ field: 'order', direction: 'asc' }] },
    ],
})
