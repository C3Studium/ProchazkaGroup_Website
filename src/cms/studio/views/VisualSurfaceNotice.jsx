import Link from "next/link"

import { hrefs } from "../lib/routes"
import Icon from "../ui/Icon"
import styles from "./VisualSurfaceNotice.module.scss"

/**
 * What an editor sees instead of a second set of inputs.
 *
 * The block this document holds is rendered on a page, and the page is where it
 * is edited now. Leaving the form here as well would be two places to change one
 * string, and the losing side is always the form: it says "Text" and shows a
 * textarea, while the page shows the sentence in the size, the width and the
 * line breaks it will actually have.
 *
 * So the fields the page owns become read-only — they are still shown, because
 * "where has my text gone" is a worse question than a greyed-out input — and the
 * way to change them is the one button here.
 *
 * The fields the page does NOT render keep their inputs. `key` and `page` have
 * no element to click; a document whose key is wrong is exactly the document
 * that renders nowhere, and taking its only input away would leave it
 * unfixable.
 *
 * The button goes to "Upravit kontent" (/studio/edit), not to the preview. It
 * used to be a plain anchor at the preview's API route, because that route had
 * to set the draft cookie before getStaticProps ran. Neither half of that is
 * true any more: /studio/preview only looks now, and /studio/edit opens its own
 * draft session on mount — so this is a client-side transition and the Studio
 * does not reload underneath the editor. A link offering "upravit" has to land
 * somewhere that can actually edit.
 */
export default function VisualSurfaceNotice({ surface, disabled }) {
    return (
        <section className={styles.notice} aria-labelledby="visual-surface-title">
            <div className={styles.head}>
                <span className={styles.eyebrow}>Vizuální úpravy</span>
                <h2 className={styles.title} id="visual-surface-title">
                    Tenhle blok se upravuje přímo na stránce
                </h2>
                <p className={styles.lead}>
                    Blok <strong>{surface.section}</strong> je vidět na stránce{" "}
                    <code className={styles.path}>{surface.page}</code>. Otevřete náhled, klikněte na
                    text nebo fotku a upravte je tam, kde je uvidí i návštěvník — s tou velikostí,
                    šířkou i zalomením, které budou mít doopravdy.
                </p>
            </div>

            <ul className={styles.fields}>
                {surface.fields.map((field) => (
                    <li key={field.path} className={styles.field}>
                        <Icon name={field.kind === "image" ? "image" : "document"} size={14} />
                        <span className={styles.fieldLabel}>{field.label}</span>
                        <code className={styles.fieldPath}>{field.path}</code>
                    </li>
                ))}
            </ul>

            {disabled ? (
                /* A document that has never been saved has no id, so there is
                   nothing for the preview to point at and nothing on the page to
                   click. Saying so beats a button that goes nowhere. */
                <p className={styles.pending}>
                    <Icon name="info" size={13} />
                    <span>Nejdřív blok uložte — pak půjde upravit na stránce.</span>
                </p>
            ) : (
                <Link className={styles.open} href={hrefs.edit(surface.page)}>
                    <Icon name="eye" size={15} />
                    <span>Upravit na stránce</span>
                    <Icon name="chevronRight" size={13} className={styles.openGo} />
                </Link>
            )}

            <p className={styles.note}>
                Úpravy na stránce se ukládají jako koncept, stejně jako tady. Na web se dostanou až
                tlačítkem <strong>Publikovat</strong>.
            </p>
        </section>
    )
}
