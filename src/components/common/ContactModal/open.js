// How anything on the site asks for the contact sheet.
//
// The sheet is mounted once, by the navigation bar, and `_app` renders that bar
// as a SIBLING of the page — so a button inside a section cannot reach it
// through context without the provider moving up into `_app`, where every route
// on the site would pay for a piece of state only this one seam reads.
//
// What travels instead is one call. The bar registers while it is mounted and
// `openContactModal` is what a button does instead of navigating. A module-level
// registration rather than a `window` event because both halves are in the same
// bundle: an event name is a contract spelled twice that nothing checks, and the
// two would agree until somebody renamed half of it.
//
// One listener, not a set. There is one contact sheet on the site and a second
// registration means a second sheet, which is the bug this would otherwise hide.

import { isEditMode } from "@/cms/edit";

let listener = null;

/**
 * The marker every element that asks for the sheet carries.
 *
 * It exists for the editing surface below, and it is an attribute rather than a
 * list of selectors kept in this file because the elements are spread over five
 * components: a selector list is the same fact written twice and it goes stale
 * the first time a CTA is renamed. `aria-haspopup` says the same thing to a
 * screen reader, and would have served — but behaviour keyed on an ARIA
 * attribute is behaviour that breaks when a second kind of dialog appears, and
 * the marker states which dialog.
 */
export const TRIGGER_ATTR = "data-contact-trigger";

/**
 * Register the sheet. Called by the navigation bar from an effect; returns the
 * unregister that effect wants.
 *
 * @param {() => void} open
 */
export function onContactRequest(open) {
    listener = open;
    // Bound to the registration rather than to edit mode, because edit mode is
    // turned on by an effect in `_app` — the parent — and React runs a child's
    // effects first, so asking the question here would answer `false` on the
    // one render where it is asked. It is asked inside the handler instead,
    // where a visitor pays one comparison on a click that was going to be
    // handled anyway.
    document.addEventListener("click", onArmedClick, true);
    return () => {
        document.removeEventListener("click", onArmedClick, true);
        if (listener === open) listener = null;
    };
}

/**
 * Open the contact sheet, and stop whatever the element was going to do instead.
 *
 * Written as an event handler because that is the whole of its use: the buttons
 * that call it are still real links to /kontakt, which is what a middle click, a
 * crawler and a browser with no JavaScript get. The navigation is cancelled only
 * once there is a sheet to put in its place — with nothing registered the link
 * is left alone rather than being turned into a dead button.
 *
 * @param {{preventDefault?: () => void}} [event]
 */
export function openContactModal(event) {
    if (!listener) return;
    event?.preventDefault?.();
    listener();
}

/**
 * The attributes a link needs to be honest about opening a dialog.
 *
 * Spread rather than written out at each of the five call sites, because a
 * button that opens the sheet and does not say so is exactly the regression this
 * change could introduce for a screen reader: the accessible name still reads
 * "Kontakt", and without this the only thing announced is a link that then does
 * not go anywhere.
 */
export const CONTACT_TRIGGER = {
    onClick: openContactModal,
    "aria-haspopup": "dialog",
    [TRIGGER_ATTR]: "",
};

/**
 * The one way into the sheet while editing is armed — SEE `@/cms/edit/overlay/lock`.
 *
 * The lock stops every pointer event at the framed page's document in the
 * capture phase, so no `onClick` in the page runs: while editing, a click means
 * "select this", not "do what this does". Measured on /studio/edit?p=/o-nas —
 * a real click on the bar's contact word left the sheet closed, and with the
 * sheet closed its fourteen annotations are unreachable, which is why every
 * survey of that page reported `document: 0`.
 *
 * A capture listener on the same node is the sanctioned way back in: lock.js
 * uses `stopPropagation` and not the immediate form precisely so that the
 * overlay's own document-level listeners still run, and this is one more of
 * them. It is installed with the sheet's registration and removed with it, so
 * `/studio/preview` — which arms nothing — is untouched either way.
 *
 * **An annotated trigger is left alone.** The five CTAs in the page carry
 * `editableLink`, so their words are content and the click is the overlay's
 * selection gesture; taking it would make those buttons uneditable. The bar's
 * word is not annotated — site navigation is structure, not copy — so the click
 * on it is otherwise wasted, and it is the one the client's sentence names:
 * *pro kontakt to zobrazí kontakt modem*.
 */
function onArmedClick(event) {
    if (!listener || !isEditMode()) return;
    const trigger = event.target?.closest?.(`[${TRIGGER_ATTR}]`);
    if (!trigger || trigger.closest("[data-cms-doc]")) return;
    event.preventDefault();
    listener();
}
