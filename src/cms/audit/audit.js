// Does this annotation point at anything? — PURE and ISOMORPHIC.
//
// ---------------------------------------------------------------------------
// The failure this exists for
//
// A component annotated an element with `items.0.label` on the block that holds
// the homepage's questions. The pairs then moved into a `questions[]` array of
// their own; `cms.config.js` and the site layer were changed and the component
// was not. The save that followed returned **200** — `items.0.label` is still a
// field of `siteCopy`, so it validated, and it was written — and then the text
// reverted on screen, because nothing reads that address any more. It looked
// like it had worked. That is the whole of the failure mode: not a broken
// button, a silent one.
//
// So there are two questions here, and only the second one would have caught it.
//
//   1. Does the type declare this field at all? Cheap, catches a typo and a
//      rename. `items.0.lable` fails here.
//   2. Is this address among the ones the page's configuration READS out of this
//      document, given what the document currently holds? `items.0.label`
//      resolved and validated; it had simply stopped being rendered.
//
// The second is possible only because `cms.config.js` says, per block, which
// paths a page takes out of a document — and `f.*` readers now answer that
// question directly (`reads`, in @/cms/site/fields.js) instead of a second file
// restating what each of them does. Restating it is how the bug happened.
//
// ---------------------------------------------------------------------------
// What must never be reported, and why each is legitimate
//
// A warning that fires on correct code every reload is worse than no warning:
// after a week nobody reads the console, and the real one is invisible. The
// shapes that would tempt one, all of them present on this site today:
//
//   an empty field      absence in the STORE is not absence in the schema. Every
//                       section falls back to the copy it ships with, and an
//                       element annotating a blank position is how an editor
//                       fills it. So check 1 asks the type, never the body.
//   `items.*.label`     a wildcard is one member of a list. It is matched
//                       against indices rather than compared as a string.
//   `docId`             not a content field. It is never annotated — nothing
//                       addresses it — and `f.docId().reads()` is empty.
//   a source row        a partner, a review, a consultant. Reached through
//                       `sources` and shaped by a lambda, so the configuration
//                       does not declare addresses for it: check 2 does not
//                       apply and says so rather than firing.
//   the globals         the patička and the contact sheet are `_app`'s, and
//                       `defineGlobals` declares no fields. Same answer.
//   `editableDoc`       the whole document is the target. There is no field, so
//                       there is nothing to resolve; only the type name is
//                       checked.
//
// All of those come out as counts, not as findings. A finding is a claim that
// something is wrong, and this file makes as few of them as it can.

import { fieldAtPath } from '@/cms/schemas/marks'
import { pageFor, readsAt, undeclaredCustom } from '@/cms/site'

import { isWholeDocument } from './annotations.js'

/**
 * The configuration entries that decide what a route renders.
 *
 * More than one, because `includes` exists: /nabidka and /benefit-program both
 * end on the homepage's advisor block and say so — they call
 * `getHomepageContent()` in their own getStaticProps. An element on one of those
 * routes carrying a homepage block's address is right, and comparing it against
 * only that route's own (empty) block list would call every one of them broken.
 */
export const pagesFor = (site, route) => {
    const own = pageFor(site, route)
    if (!own) return []
    return [own, ...own.includes.map((included) => pageFor(site, included)).filter(Boolean)]
}

/** `items.3.label` -> `items.*.label`. One member of a list, as the schema
 *  spells it — the index is a position, and positions are not fields. */
const asSchemaPath = (path) =>
    String(path)
        .split('.')
        .map((segment) => (/^\d+$/.test(segment) ? '*' : segment))
        .join('.')

const isIndex = (segment) => /^\d+$/.test(segment)

/** One segment of an address against one of a declared read. */
const sameSegment = (a, b) =>
    a === b || (a === '*' && isIndex(b)) || (b === '*' && isIndex(a))

/**
 * Are these two addresses on the same branch?
 *
 * Not equality, and the difference is the point. An element may address the
 * whole array (`questions`), one member of it (`questions.3`) or a field inside
 * that member, while the configuration declares whichever depth its reader
 * works at — so the test is that neither address contradicts the other as far as
 * they both go. `items.0.label` and `items.4.label` do contradict, at the index.
 */
const onSameBranch = (address, read) => {
    const a = String(address).split('.')
    const b = String(read).split('.')
    const depth = Math.min(a.length, b.length)
    for (let i = 0; i < depth; i += 1) if (!sameSegment(a[i], b[i])) return false
    return true
}

const finding = (entry, address, kind, message) => ({
    kind,
    message,
    doc: entry.doc,
    path: address ? address.path : '',
    attr: address ? address.attr : '',
    where: entry.where,
})

/**
 * Every annotation on one page, checked.
 *
 * @param {string}   route         the address these annotations were read from
 * @param {object[]} pages         its `cms.config.js` entry and the ones it includes
 * @param {object[]} annotations   from ./annotations.js
 * @param {function} documentFor   `(id) => { type, key, body } | null`
 * @param {function} typeFor       `(name) => schema type | null`
 * @returns {{findings: object[], counts: object, notes: string[]}}
 */
export function auditPage({ route, pages = [], annotations = [], documentFor, typeFor }) {
    const findings = []
    const notes = []
    const counts = {
        annotations: annotations.length,
        addresses: 0,
        // Addresses that got as far as the configuration comparison. The number
        // worth reporting: everything else was skipped for a stated reason.
        checkedAgainstConfig: 0,
        wholeDocuments: 0,
        unknownDocuments: 0,
        notDeclared: 0,
        opaque: 0,
        noSchema: 0,
    }

    // A custom block that does not say what it reads makes every siteCopy
    // document on its page potentially its own, so there is no honest way to
    // call an address unread. Check 2 goes off for the page and says why —
    // reporting a guess would be the false alarm this file is built against.
    const undeclared = pages.flatMap((page) => undeclaredCustom(page))
    const compareConfig = Boolean(pages.length) && !undeclared.length
    if (undeclared.length) {
        notes.push(
            `Kontrola proti konfiguraci je pro "${route}" vypnutá: vlastní blok ${undeclared
                .map((at) => `"${at}"`)
                .join(', ')} nedeklaruje "reads".`,
        )
    }
    if (!pages.length) notes.push(`"${route}" není v cms.config.js — porovnávat je s čím jen schéma typu.`)

    for (const entry of annotations) {
        const document = documentFor(entry.doc)

        if (!document) {
            counts.unknownDocuments += 1
            findings.push(
                finding(
                    entry,
                    entry.addresses[0] || null,
                    'unknown-document',
                    `Dokument "${entry.doc}" na stránce není — anotace míří na nic.`,
                ),
            )
            continue
        }

        const type = typeFor(document.type)

        if (isWholeDocument(entry)) {
            counts.wholeDocuments += 1
            // The one thing such an annotation can get wrong: the type name it
            // carries, which is what the popup renders the form from.
            if (entry.type && !typeFor(entry.type)) {
                findings.push(
                    finding(entry, null, 'unknown-type', `Typ "${entry.type}" v anotaci neexistuje.`),
                )
            }
            continue
        }

        const declared = compareConfig
            ? pages.reduce(
                (all, page) => {
                    const one = readsAt(page, document.key, document.body, { draft: true, type })
                    if (!one.known) return all
                    return {
                        known: true,
                        opaque: all.opaque || one.opaque,
                        paths: new Set([...all.paths, ...one.paths]),
                    }
                },
                { known: false, opaque: false, paths: new Set() },
            )
            : { known: false, opaque: false, paths: new Set() }

        for (const address of entry.addresses) {
            counts.addresses += 1

            // ---- 1. does the type declare this field ------------------------
            if (!type) counts.noSchema += 1
            else if (!fieldAtPath(type, asSchemaPath(address.path))) {
                findings.push(
                    finding(
                        entry,
                        address,
                        'no-such-field',
                        `Typ "${document.type}" nemá pole "${address.path}".`,
                    ),
                )
                continue
            }

            // ---- 2. does this page read it ---------------------------------
            if (!declared.known) {
                counts.notDeclared += 1
                continue
            }
            if (declared.opaque) {
                counts.opaque += 1
                continue
            }
            counts.checkedAgainstConfig += 1
            const read = [...declared.paths].some((path) => onSameBranch(address.path, path))
            if (!read) {
                findings.push(
                    finding(
                        entry,
                        address,
                        'not-read',
                        `Stránka "${route}" nečte z bloku "${document.key}" pole "${address.path}". ` +
                            `Uložení projde a nikdo ho nepřečte. Blok se čte na: ${
                                [...declared.paths].sort().join(', ') || '— nic'
                            }.`,
                    ),
                )
            }
        }
    }

    return { findings, counts, notes }
}
