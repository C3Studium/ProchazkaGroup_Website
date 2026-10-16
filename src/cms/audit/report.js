// One wording for both surfaces — PURE.
//
// The Studio prints this into a developer's console and the deliberate scan
// prints it into a terminal. They are the same sentences deliberately: a warning
// somebody has already read once in one place should not have to be recognised
// again in the other.

/** Czech counts the small numbers separately. */
const plural = (count, one, few, many) => {
    if (count === 1) return `${count} ${one}`
    if (count >= 2 && count <= 4) return `${count} ${few}`
    return `${count} ${many}`
}

/** What was NOT compared against the configuration, and why. One line each. */
const skipped = (counts) => {
    const out = []
    if (counts.wholeDocuments) {
        out.push(`${counts.wholeDocuments}× celý dokument (editableDoc) — nemá pole, kontroluje se jen typ`)
    }
    if (counts.notDeclared) {
        out.push(`${counts.notDeclared}× dokument, který stránka nečte přes deklarovaný blok (globály, zdroje)`)
    }
    if (counts.opaque) out.push(`${counts.opaque}× pole čtené lambdou (f.from) — nelze ověřit`)
    if (counts.noSchema) out.push(`${counts.noSchema}× typ bez dostupného schématu`)
    return out
}

/** One finding as a single line. */
const lineOf = (item) =>
    `${item.where}  ${item.doc}${item.path ? ` · ${item.path}` : ''}  —  ${item.message}`

/**
 * The whole report for one route, as lines.
 *
 * The counts come first and are printed whether or not anything is wrong: a
 * check that only ever speaks up when it is unhappy is one nobody can tell apart
 * from a check that is not running.
 */
export const reportLines = ({ route, findings, counts, notes }) => {
    const head = `[cms/audit] ${route}: ${plural(counts.annotations, 'anotace', 'anotace', 'anotací')}, ` +
        `${counts.checkedAgainstConfig} adres porovnáno s konfigurací, ` +
        `${plural(findings.length, 'nález', 'nálezy', 'nálezů')}`
    const out = [head]
    for (const note of notes) out.push(`  ! ${note}`)
    for (const item of skipped(counts)) out.push(`  · ${item}`)
    for (const item of findings) out.push(`  ✗ ${lineOf(item)}`)
    return out
}
