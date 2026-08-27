// Does this link leave the site, and how the markup says so.
//
// The editor asks the question constantly: a path on this site is the site's own
// routing and its target is not the client's to change, while a link that goes
// somewhere else is content and both halves of it are editable. That answer was
// being worked out by picking an href apart at each place that needed it — and
// an href is precisely the thing an editor is about to rewrite, so the same
// string was being parsed by the thing rendering it and again by the thing
// changing it.
//
// So it is decided once, where the link is rendered, and the element carries the
// answer. `EXTERNAL_CLASS` is a marker and nothing else: no stylesheet defines a
// rule for it, deliberately, because nothing about how a link looks depends on
// where it points and a rule would make removing the marker a visual change as
// well as a semantic one.
//
// Named `isExternal` to match `isActive`, which is this site's existing spelling
// for "a class that states a fact rather than paints one".
export const EXTERNAL_CLASS = "isExternal";

// A path on this site starts with exactly one slash. `//host` is
// protocol-relative and leaves. `#` and `?` are this page. Everything with a
// scheme — http:, https:, mailto:, tel: — leaves, and tel: leaving is the point:
// the number printed on the page IS the target, so both are editable.
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** @param {string} [href] @returns {boolean} */
export function isExternalHref(href) {
    const value = typeof href === "string" ? href.trim() : "";
    if (!value) return false;
    if (value.startsWith("//")) return true;
    if (value.startsWith("/") || value.startsWith("#") || value.startsWith("?")) return false;
    return SCHEME.test(value);
}

/**
 * The marker, or `""` — ready to be joined into a class list.
 *
 * Returning the empty string rather than undefined so that
 * `[...].filter(Boolean).join(" ")` drops it without the caller testing: a class
 * attribute that gains a stray space for every internal link is a diff in the
 * rendered HTML of every page for no reason at all.
 */
export const externalClass = (href) => (isExternalHref(href) ? EXTERNAL_CLASS : "");
