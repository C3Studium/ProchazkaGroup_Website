import { people } from "./people";

// The roster the site falls back to when the CMS answers with nothing — an
// empty database, a missing table, a failed query.
//
// It lives here rather than inside a section because two things draw it now:
// the "Naši kolegové" block on /o-nas and the advisors sheet the navigation
// opens. Two copies of a fallback is two rosters that agree until somebody
// edits one.
//
// The mottos are here and not in `people.js` because every `moto` in that file
// is still the same Lorem sentence, and Latin on the page is worse than a
// placeholder that reads. They are assigned by position, which is why none of
// them uses a gendered verb — the list is half women. The real ones live on each
// consultant's own record (`motto` in src/content/types/consultant.js) and these
// are only ever seen with no content system behind the page.
export const MOTTOS = [
    "Finance mají dávat klid, ne starosti.",
    "Nejlepší plán je ten, kterému rozumíte.",
    "Bez malých písmen a bez spěchu.",
    "Malé kroky, které vydrží roky.",
    "Za každým číslem stojí něčí život.",
    "Nejdřív poslouchat, potom počítat.",
    "Jistota se staví po vrstvách.",
    "Rozhodnutí, která obstojí za deset let.",
    "Žádná otázka není hloupá.",
    "Peníze mají sloužit, ne velet.",
];

export const FALLBACK_ROSTER = people.map((person, index) => ({
    name: person.name,
    moto: MOTTOS[index % MOTTOS.length],
    src: person.src,
    srcAlt: person.srcAlt || null,
    tel: person.tel,
}));

/** Spaces are how a telephone number is written, not how it is dialled. */
export const dial = (tel) => (tel ? `tel:${String(tel).replace(/\s+/g, "")}` : undefined);
