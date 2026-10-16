/**
 * "Somebody signed in on this device" — SHARED, BROWSER-SAFE, AND NOT A CONTROL.
 *
 * ===========================================================================
 * THIS COOKIE CARRIES NO AUTHORITY. IT NEVER WILL. DO NOT GATE ANYTHING ON IT.
 * ===========================================================================
 *
 * Anyone can type `document.cookie = "cms_hint=1"` in a console and this
 * function returns true for them forever. That is not a flaw to be patched, it
 * is the whole design: the thing it guards is a *link*, and following that link
 * lands on `/studio`, where the real credential — the httpOnly, HMAC-signed
 * `cms_session` — is checked by `server/auth.js` and a stranger is handed the
 * sign-in form. Forging it buys a button that goes nowhere.
 *
 * The project has already settled this question once, in a different place and
 * with the same answer. `src/cms/nextConfig.mjs` explains why there is no edge
 * auth gate: a middleware can see that a cookie named `cms_session` is present
 * but not whether it verifies, so a presence check would wave a forged cookie
 * through and refuse only the honest visitor. Measured then, still true:
 * `/api/cms/documents` answers 401 to a well-formed but wrongly-signed cookie.
 * A presence check is a convenience, never a control — and this file is a
 * presence check that has been given nothing but a convenience to do.
 *
 * ---------------------------------------------------------------------------
 * Why a second cookie exists at all
 *
 * `cms_session` is httpOnly, which is what stops a script on a public page from
 * stealing it, and is not up for negotiation. So the page's JavaScript cannot
 * read it and cannot answer "is an editor looking at this?" without a request.
 * The three ways to answer that question, and why this is the one:
 *
 *   - **In `getStaticProps`.** Impossible. The public pages are statically
 *     generated with ISR and never see a cookie — the same wall the edge gate
 *     hit.
 *   - **A `/api/cms/auth/user` fetch on every page load.** Authoritative, and it
 *     charges every visitor a request so that one editor can see a button.
 *   - **A non-httpOnly hint, set beside the session and cleared with it.** The
 *     page reads it locally, and only then does anything at all. A visitor who
 *     has never signed in makes no request and renders nothing.
 *
 * The hint holds no identity, no role and no token — the literal string "1" —
 * because there is nothing it could hold that would be safe to publish and
 * useful to have. `server/auth.js` writes it in the same response that mints the
 * session, refreshes it on the same sliding expiry, and clears it in the same
 * response that revokes the session, so the two cannot drift apart in the
 * ordinary case.
 *
 * ---------------------------------------------------------------------------
 * What a stale hint costs, and why nothing confirms it
 *
 * A session can die without this browser being told: an owner ends it from
 * another device on /studio/settings, or the password changes, or
 * CMS_SESSION_SECRET rotates. The cookie survives, and the widget shows a
 * button for somebody who is no longer signed in.
 *
 * The widget deliberately does NOT confirm with `/api/cms/auth/user` before
 * showing itself, and the argument is that confirming buys nothing. The
 * consequence of a stale hint is identical to the consequence of a forged one —
 * `/studio` shows the sign-in form — so there is no state a confirmation
 * prevents, only a button that is briefly wrong. Against that it would cost a
 * second round trip on every armed page load, and, worse, it would make this
 * cookie *look* authoritative to the next person reading the code: a hint that
 * is always checked is one refactor away from being a hint that is trusted.
 * The honest shape is the one where trusting it is obviously not an option.
 */

/**
 * Named for what it is. Not `cms_user`, not `cms_editor` — nothing that would
 * read as identity in a devtools cookie list.
 */
export const HINT_COOKIE = "cms_hint"

/** The only value ever written. There is nothing else worth carrying. */
export const HINT_VALUE = "1"

/**
 * Has this browser been signed in?
 *
 * Exact-name matching rather than a substring test on `document.cookie`: a
 * cookie called `x_cms_hint` on the same host would satisfy `includes()`, and a
 * check that is loose is a check that reads as careful without being it.
 */
export const hasManageHint = () => {
  if (typeof document === "undefined") return false
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${HINT_COOKIE}=${HINT_VALUE}`)
}
