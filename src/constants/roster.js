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

/**
 * A consultant document, flattened to what a roster draws.
 *
 * Here for the same reason FALLBACK_ROSTER is: two places draw these people —
 * „Naši kolegové" on /o-nás and the advisors sheet the navigation opens — and a
 * mapping written twice is two rosters that agree until somebody edits one. It
 * lived inside Colleagues until the sheet needed it too.
 *
 * It takes either shape the CMS hands out, and that is deliberate rather than
 * sloppy: /o-nás receives consultants already shaped by `colleague` in
 * cms.config (portrait / portraitAlt), while the navigation receives them
 * straight from `getConsultants` (portrait / portraitDetail). Same people, two
 * seams, one mapping.
 *
 * `id` and `likes` are the whole reason the sheet needed real documents at all:
 * a visitor pressing „líbí se" has to name whom they mean, and a hard-coded
 * list has no name to give.
 */
export const rosterFromCms = (people) =>
    (Array.isArray(people) ? people : [])
        .map((person) => ({
            name: person?.name || "",
            moto: person?.motto || person?.moto || "",
            src: person?.portrait?.src || person?.src || "",
            srcAlt: person?.portraitAlt?.src || person?.portraitDetail?.src || null,
            tel: person?.phone || person?.tel || "",
            // Only ever present while the Studio is previewing — see
            // cms/server/site/read.js.
            ...(person?.docId ? { docId: person.docId } : {}),
            id: person?.id || null,
            likes: Number.isFinite(person?.likes) ? person.likes : 0,
        }))
        // A person with no photograph would put an empty frame in the roster,
        // and both surfaces are built out of portraits.
        .filter((person) => person.name && person.src);
