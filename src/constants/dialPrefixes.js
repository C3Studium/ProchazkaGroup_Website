// The dialling prefixes the forms offer.
//
// One list, read by every phone field on the site — the contact sheet, the
// homepage's advisor form and the QnA form. It is a constant rather than three
// hard-coded "+420" strings for the reason those three had drifted into being
// three different things: two of them already drew a chevron beside the number,
// promising a list that was never built.
//
// WHY A LIST AT ALL. The office is in Písek and most callers are Czech, so +420
// leads and is the default. Slovak numbers are the other half of the practice's
// natural reach — one border, one language people here read without translating
// — and the rest are the countries a Czech client is most likely to be dialling
// from when they are not at home.
//
// `label` is the country in Czech, and it is what the option shows beside the
// code: a bare list of codes asks the reader to know that +43 is Austria.
//
// ISO codes are carried so a value can survive being re-ordered or re-labelled.
// Nothing reads them yet; they are here because a list keyed only on the dial
// code cannot tell +1 in the United States from +1 in Canada, and that is the
// kind of thing a list like this grows into.
//
// MEANT TO BE REPLACED BY THE CMS. This is the fallback, on the same terms as
// every other fallback on the site: an empty answer from the database leaves
// the forms working with exactly what shipped. Whatever reads it later should
// keep the same shape — { iso, code, label } — so the component below needs no
// changes when the source moves.
export const DIAL_PREFIXES = [
    { iso: "CZ", code: "+420", label: "Česko" },
    { iso: "SK", code: "+421", label: "Slovensko" },
    { iso: "AT", code: "+43", label: "Rakousko" },
    { iso: "DE", code: "+49", label: "Německo" },
    { iso: "PL", code: "+48", label: "Polsko" },
    { iso: "HU", code: "+36", label: "Maďarsko" },
    { iso: "GB", code: "+44", label: "Spojené království" },
    { iso: "IE", code: "+353", label: "Irsko" },
    { iso: "NL", code: "+31", label: "Nizozemsko" },
    { iso: "CH", code: "+41", label: "Švýcarsko" },
    { iso: "IT", code: "+39", label: "Itálie" },
    { iso: "ES", code: "+34", label: "Španělsko" },
    { iso: "US", code: "+1", label: "USA / Kanada" },
];

/** What a phone field starts on. The first entry, so the two cannot drift. */
export const DEFAULT_DIAL = DIAL_PREFIXES[0].code;
