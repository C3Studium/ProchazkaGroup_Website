// Inline emphasis — the encoding, next to the field that declares it.
//
// Some copy is one run of plain text with one run of accent inside it: "díky
// kterým pro vás máme *slevy*". Nothing in `siteCopy` expresses that — `label`
// is a flat string and a rich-text field per line would be worse — so the
// convention is an asterisk pair, which an editor can see in a plain input and
// which degrades to visible asterisks rather than to broken markup.
//
// That convention used to live in `server/site/homepage.js`, which is the only
// place that decoded it, and it left two holes that this file closes.
//
// **The overlay could not edit such a line.** Editing the element in place and
// saving what the DOM shows would have dropped the accent silently, because the
// asterisks are nowhere on screen; so the overlay detected the case and refused
// it. Making it editable means the overlay has to be able to write the encoding
// back — and a generic overlay that hard-codes `*…*` has taken on knowledge of
// one site's copy convention, which is exactly what it must not do. It works in
// marked runs instead and asks a mark for the encoding.
//
// **Which class means "accent" cannot be guessed.** A rule loose enough to find
// `hl` in Offers finds `word` in WhoWeAre and marks every character of that
// paragraph as accented, because it wraps each character in its own span for
// the reveal. So the class is declared here and reaches the overlay through the
// annotation `editable()` emits — never sniffed off the DOM.
//
// Zero dependencies, deliberately. The server's site layer imports it, the
// Studio's overlay imports it, and neither may import the other's tree. It must
// also stay out of the public bundle: nothing here is reachable from a
// component, and `@/cms/edit`'s barrel does not name it.

/** A run of non-whitespace. The granularity `decode` reads back — see `encode`. */
// A "word" is a run of anything that is not an ordinary space, and a
// non-breaking space is NOT an ordinary space — it is typography. Czech sets one
// after every single-letter preposition so a lone "v" cannot be left at the end
// of a line, and the obvious `/\S+/` splits on it, after which rejoining with
// U+0020 throws it away. Since a person cannot type one and cannot see that it
// is gone, that loss is silent and permanent.
//
// SEP is therefore whitespace MINUS the non-breaking spaces, and WORD is
// everything SEP is not — so `V\u00a0roce` is one word and survives the round
// trip, while runs of real spaces still collapse to one.
const SEP = /[^\S\u00a0\u202f]+/
const WORD = /(?:(?![^\S\u00a0\u202f])[\s\S])+/g

/** `*…*`, non-greedy by construction: the class excludes the delimiter. */
const HIGHLIGHT_PAIR = /\*([^*]+)\*/g

/**
 * Runs -> one string, and one flag per character of it.
 *
 * ---------------------------------------------------------------------------
 * The two run conventions, which are not the same and must not be conflated
 *
 * `decode` answers in the **component's** convention: the parts CopyLine
 * renders, with the space between them supplied by the component
 * (`{j < parts.length - 1 ? " " : ""}`) rather than carried in the part.
 *
 * `encode` takes the **DOM's**: runs read back off the rendered element, where
 * every character including that separator is in one run or the other — and in
 * Offers the separator is inside the highlighted span, because that is where
 * the JSX puts it.
 *
 * They cannot be unified from run text alone. `[["a", true], ["b", false]]` is
 * "a b" under one and "ab" under the other, and nothing in the pair says which:
 * inserting a separator would split a word an editor marked half of, and not
 * inserting one would run two words together. So `encode` is documented as the
 * inverse of *rendering*, not of `decode` — round-trip the way the page does it
 * and the stored string comes back byte for byte.
 * ---------------------------------------------------------------------------
 */
const flatten = (runs) => {
    let raw = ''
    const rawFlags = []
    for (const run of runs || []) {
        const value = String(run?.[0] ?? '')
        const on = Boolean(run?.[1])
        raw += value
        for (let i = 0; i < value.length; i += 1) rawFlags.push(on)
    }
    return { raw, rawFlags }
}

/**
 * The one mark this site has: a run of the accent colour, inside a line of copy.
 *
 * `className` and `tag` are what the page renders it as (see Offers' CopyLine),
 * and they are here rather than in the overlay because they are facts about this
 * site's copy, not about editing.
 */
export const HIGHLIGHT = Object.freeze({
    name: 'highlight',
    tag: 'span',
    className: 'hl',
    /** On the overlay's control, to an editor. */
    label: 'Zvýraznit',
    clear: 'Zrušit zvýraznění',
    hint: 'Označte text a zvýrazněte',

    /**
     * "a *b* c" -> [["a", false], ["b", true], ["c", false]] — the shape Offers
     * renders.
     *
     * Split per word rather than per span, because the component joins the parts
     * it is given with a single space (see CopyLine). Cutting exactly at the
     * asterisks puts a part boundary mid-word wherever a highlight is followed
     * by punctuation, and "na konci*." comes out as "na konci ." with a space in
     * front of the full stop. Whole words never do that, and the round trip is
     * exact: run the four authored lines of the Offers copy through this and you
     * get the component's hardcoded fallback back, character for character.
     */
    decode(line) {
        const source = String(line)

        // Which characters of the stripped text were inside a highlight.
        let stripped = ''
        const marked = []
        let cursor = 0
        for (const match of source.matchAll(HIGHLIGHT_PAIR)) {
            const before = source.slice(cursor, match.index)
            stripped += before
            for (let i = 0; i < before.length; i += 1) marked.push(false)
            stripped += match[1]
            for (let i = 0; i < match[1].length; i += 1) marked.push(true)
            cursor = match.index + match[0].length
        }
        const rest = source.slice(cursor)
        stripped += rest
        for (let i = 0; i < rest.length; i += 1) marked.push(false)

        // Words, each highlighted if any of its characters was; then adjacent
        // words that agree are coalesced back into one part.
        const parts = []
        let at = 0
        for (const word of stripped.split(SEP)) {
            const start = stripped.indexOf(word, at)
            if (!word) continue
            at = start + word.length
            const highlighted = marked.slice(start, at).some(Boolean)
            const last = parts[parts.length - 1]
            if (last && last[1] === highlighted) last[0] += ` ${word}`
            else parts.push([word, highlighted])
        }
        return parts
    },

    /**
     * The half the overlay needs: runs read off the real DOM, back into the
     * stored string. Every character is in a run — see `flatten` for why that
     * is not the shape `decode` answers with.
     *
     * Encoded per word, because that is the granularity `decode` reads: a mark
     * that starts mid-word would come back whole-word and the stored string
     * would not be the one this produced. So the flags are widened to the words
     * they touch and the asterisks land outside the whitespace — which is what
     * turns Offers' `<span class="hl">Spolupracujeme </span>`, trailing space
     * and all, back into `*Spolupracujeme* s partnery OVB Group` rather than
     * into `*Spolupracujeme *s partnery OVB Group`.
     */
    encode(runs) {
        const { raw, rawFlags } = flatten(runs)

        const groups = []
        for (const match of raw.matchAll(WORD)) {
            const on = rawFlags.slice(match.index, match.index + match[0].length).some(Boolean)
            const last = groups[groups.length - 1]
            if (last && last.on === on) last.words.push(match[0])
            else groups.push({ on, words: [match[0]] })
        }

        return groups.map((group) => (group.on ? `*${group.words.join(' ')}*` : group.words.join(' '))).join(' ')
    },

    /**
     * Widen a character range to the words it touches.
     *
     * `encode` is going to do this anyway; doing it at the moment an editor
     * presses *Zvýraznit* is what makes the accent they see on screen the accent
     * that gets stored, instead of half a word now and a whole one after the
     * page re-renders.
     */
    snap(text, start, end) {
        let from = start
        let to = end
        // Same definition of "word" as WORD above: widen over a non-breaking
        // space, stop at an ordinary one. Otherwise marking "V roce" through a
        // nbsp would snap to half of it.
        const inWord = (ch) => ch !== undefined && !/[^\S\u00a0\u202f]/.test(ch)
        while (from > 0 && inWord(text[from - 1])) from -= 1
        while (to < text.length && inWord(text[to])) to += 1
        return [from, to]
    },
})

/**
 * The absence of a mark, as an object rather than as `null`.
 *
 * The site layer decodes every copy line through whatever the schema declares,
 * and a field that declares nothing should read as one plain run rather than
 * make every call site test for null. Whitespace is collapsed here too, so a
 * plain line and a marked one arrive at the component in the same shape.
 */
export const PLAIN = Object.freeze({
    name: null,
    tag: null,
    className: null,
    decode(line) {
        const words = String(line).split(SEP).filter(Boolean)
        return words.length ? [[words.join(' '), false]] : []
    },
    encode(runs) {
        return flatten(runs).raw.split(SEP).filter(Boolean).join(' ')
    },
    snap(text, start, end) {
        return [start, end]
    },
})

/* --------------------------------------------------------- hard line breaks -- */
//
// A break is `\n` in the store and `<br />` on the page (EDIT-SURFACES, round
// four). Neither `encode` nor `decode` may ever be handed one: SEP matches
// `\n`, so decoding a two-line string collapses it to one line and encoding
// runs that span a break rejoins them with an ordinary space. The loss is
// silent — the words are all still there — which is exactly the failure a
// non-breaking space taught this file to guard against.
//
// So a multi-line value is cut into lines FIRST and each line goes through the
// mark one at a time. The pair below is the only place that cut is made, and it
// is a pair so that the round trip is stated in one file: split, encode, join.

/** Runs read off the DOM -> one array of runs per line. */
const splitRuns = (runs) => {
    const lines = [[]]
    for (const run of runs || []) {
        const value = String(run?.[0] ?? '')
        const on = Boolean(run?.[1])
        const pieces = value.split('\n')
        for (let i = 0; i < pieces.length; i += 1) {
            if (i > 0) lines.push([])
            if (pieces[i]) lines[lines.length - 1].push([pieces[i], on])
        }
    }
    return lines
}

/**
 * A stored multi-line value -> the parts of each of its lines.
 *
 * Standalone rather than a method, so a caller holding a mark cannot reach it
 * with the wrong `this` and so `PLAIN` needs no copy of it.
 *
 * @returns {[string, boolean][][]} one entry per line, in order
 */
export const decodeLines = (mark, value) =>
    String(value ?? '').split('\n').map((line) => mark.decode(line))

/** The inverse of rendering those lines, back into one stored string. */
export const encodeLines = (mark, runs) =>
    splitRuns(runs).map((line) => mark.encode(line)).join('\n')

const MARKS = Object.freeze({ [HIGHLIGHT.name]: HIGHLIGHT })

/**
 * The mark an annotation names, or `null`.
 *
 * The overlay's door, and it takes the raw attribute value: an element with no
 * `data-cms-mark` is plain text and gets the plain-text editor, which is the
 * behaviour every field had before marks existed.
 */
export const markNamed = (name) => (typeof name === 'string' && MARKS[name]) || null

/**
 * The mark a field declares, reached through the schema.
 *
 * `path` is the dotted path with `*` for "the one member of this list", which is
 * the spelling `@/cms/visualEditing` already uses — `items.*.label`. Reading the
 * declaration rather than restating it is the point: the asterisk convention has
 * exactly one home now, and removing `options.mark` from the field removes the
 * affordance from the page in the same breath.
 *
 * Answers PLAIN for a field that declares nothing, so a caller shaping copy has
 * no branch to write and a schema edit cannot break the public homepage.
 */
export const markAtPath = (type, path) => {
    let node = type
    for (const segment of String(path).split('.')) {
        if (!node) return PLAIN
        if (segment === '*') {
            const members = node.members || []
            node = members.length === 1 ? members[0] : null
            continue
        }
        node = (node.fields || []).find((field) => field.name === segment) || null
    }
    return markNamed(node?.options?.mark) || PLAIN
}
