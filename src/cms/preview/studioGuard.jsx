import { useEffect } from 'react'

import { isEditSurfaceFrame } from './frame.js'

/**
 * Stops a site's intro from running while somebody is editing it.
 *
 * A preloader is a curtain over the whole document and page transitions move it
 * underneath the pointer. Both are right on a public visit and both are in the
 * way on the Studio's editing surface, where the same document is reloaded
 * dozens of times an hour and every reload would pay for the entrance again.
 *
 * ## Why the durations are shortened rather than switched off
 *
 * `animation: none` is the obvious rule and it deadlocks. A preloader that
 * releases its gate on `animationend` — most of them do — never hears the event,
 * because an animation that does not run does not end, and the curtain stays up
 * forever with the site behind it. Near-zero durations fire every event in the
 * usual order, immediately, so a listener that waits is released on the next
 * frame and one that does not is simply not seen.
 *
 * ## Which surfaces this applies to
 *
 * `/studio/edit` only, via `isEditSurfaceFrame()`. `/studio/preview` is
 * deliberately left alone: its whole job is to show what a visitor will see, and
 * a visitor sees the curtain. Suppressing it there would make the faithful
 * surface the unfaithful one.
 *
 * @param {object}   [props]
 * @param {string}   [props.attribute] An attribute this project sets on `<html>`
 *   while its intro is running, removed here so a gate read off it releases.
 *   Pass null if there is none.
 * @param {boolean}  [props.stripMotion] Whether to shorten animation and
 *   transition durations document-wide. On by default.
 */
export default function StudioMotionGuard({ attribute = 'data-preload', stripMotion = true }) {
    useEffect(() => {
        // Reading the frame needs `window`, so this is an effect and never runs
        // on the server pass — which also means the public HTML is byte-for-byte
        // what it was before this component existed.
        let framed = false
        try { framed = isEditSurfaceFrame() } catch { framed = false }
        if (!framed) return

        const html = document.documentElement
        html.setAttribute('data-valecms-studio', '')
        if (attribute) html.removeAttribute(attribute)

        if (!stripMotion) return () => html.removeAttribute('data-valecms-studio')

        const style = document.createElement('style')
        style.setAttribute('data-valecms-studio-motion', '')
        style.textContent = `
            html[data-valecms-studio] *,
            html[data-valecms-studio] *::before,
            html[data-valecms-studio] *::after {
                animation-duration: 0.01ms !important;
                animation-delay: 0s !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                transition-delay: 0s !important;
                scroll-behavior: auto !important;
            }
        `
        document.head.appendChild(style)

        return () => {
            html.removeAttribute('data-valecms-studio')
            style.remove()
        }
    }, [attribute, stripMotion])

    return null
}

export { StudioMotionGuard }
