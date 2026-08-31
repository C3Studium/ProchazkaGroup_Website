/**
 * What the Studio is allowed to say about the web after a publish.
 *
 * The four transitions answer with a `revalidation` report beside the document
 * (server/handlers/documents.js): which pages were regenerated, which failed,
 * and how long it took. Every screen that publishes something prints a sentence
 * afterwards, and until this existed all of them printed the same one —
 * "Je vidět na webu." — whether or not anything had reached the web at all.
 *
 * So the sentence is computed from the report, in one place, and there are only
 * three of them:
 *
 *   regenerated  the pages are live, and it says which
 *   failed       the document IS published; the pages are not refreshed yet,
 *                and it says what happens next
 *   nowhere      nothing on the site renders this document
 *
 * The failure sentence is the one that matters. A revalidation can fail for
 * reasons a person can act on — a page that throws while rendering, an instance
 * that cannot reach the store — and the honest answer names the ten-minute ISR
 * window the pages have anyway (`revalidate: 600` in every page's
 * getStaticProps) rather than pretending the change is invisible or that it is
 * live.
 */

import { plural } from './format'

/** Reports from one or more transitions, folded into one. */
const fold = (reports) => {
    const list = reports.filter(Boolean)
    const paths = new Set()
    const failed = new Set()
    let missing = 0
    for (const report of list) {
        ;(report.paths || []).forEach((path) => paths.add(path))
        ;(report.failed || []).forEach((entry) => failed.add(entry.path))
        if (!report.paths?.length && !report.failed?.length) missing += 1
    }
    return { paths: [...paths], failed: [...failed], missing, total: list.length }
}

/** "/, /recenze a 6 dalších" — a list an editor can check, not a wall of paths. */
const naming = (paths, limit = 3) => {
    if (paths.length <= limit) return paths.join(', ')
    const rest = paths.length - limit
    return `${paths.slice(0, limit).join(', ')} a ${plural(rest, 'další', 'další', 'dalších')}`
}

/**
 * @param {object|object[]} reports  a document's `revalidation`, or several
 * @param {(paths: string) => string} said  the sentence for the good case
 * @returns {{ ok: boolean, description: string }}
 *
 * `ok` is what decides whether the caller shows a positive toast or one that has
 * to be read. It is false when a page failed to refresh even though the
 * transition itself succeeded — which is exactly the state the old sentence
 * could not express.
 */
const outcomeOf = (reports, said) => {
    const many = [].concat(reports || [])
    // No report at all: an older server, or a code path that does not publish.
    // Says nothing about the web rather than guessing.
    if (!many.filter(Boolean).length) return { ok: true, description: '' }

    const { paths, failed, missing, total } = fold(many)

    if (failed.length) {
        return {
            ok: false,
            description:
                `Uloženo, ale stránky se nepodařilo obnovit (${naming(failed)}). ` +
                'Na webu se změna projeví nejpozději do deseti minut sama. ' +
                'Zkuste akci zopakovat, pokud to spěchá.',
        }
    }

    if (!paths.length) {
        // Every report came back with nowhere to go. True for a document no page
        // renders — a partner of the wrong kind, a copy block left over from a
        // section that is gone — and worth saying, because "publikováno" on such
        // a document otherwise reads as a change nobody can find.
        return {
            ok: true,
            description:
                missing === total
                    ? 'Uloženo. Žádná stránka webu tenhle dokument nezobrazuje, takže se na webu nic nezměnilo.'
                    : 'Uloženo.',
        }
    }

    return { ok: true, description: said(naming(paths)) }
}

/** Something is now on the site. */
export const publishOutcome = (reports) => outcomeOf(reports, (paths) => `Je vidět na webu — obnoveno: ${paths}.`)

/** Something has just left it. */
export const withdrawOutcome = (reports) => outcomeOf(reports, (paths) => `Z webu odstraněno — obnoveno: ${paths}.`)

/**
 * Neither, said truthfully.
 *
 * Restoring from the archive puts a published document straight back on the site
 * and leaves a draft a draft (`restoreOutcome` in ./documents.js says which),
 * so the one thing this sentence can promise is that the pages were re-rendered.
 */
export const refreshOutcome = (reports) => outcomeOf(reports, (paths) => `Stránky webu obnoveny: ${paths}.`)
