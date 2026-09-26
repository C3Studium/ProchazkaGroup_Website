/**
 * Contract C, browser half — what happens between the overlay letting go of a
 * value and the field being stored.
 *
 * The overlay never writes. It hands `{docId, field, value}` to `save()` below
 * and this is the answer: treat it as applied, call the data port, reconcile
 * against what came back.
 *
 * That used to be a `save` postMessage from the framed document, answered by a
 * `saved` one, with `attachEditBridge` in this file wiring the two together. The
 * overlay is mounted by the host now (`@/cms/edit/overlay/mount`) and runs in the
 * host's own realm, so there is no boundary left for a message to cross: the
 * bridge and the wire format went with it, and `save()` resolving with the final
 * entry is the whole protocol. The `pending` status survives because a caller
 * that wants to show a spinner still needs it announced synchronously — but the
 * overlay does not, since its optimistic state is "the typed text is still in
 * the element", which it can see for itself.
 *
 * Three things it does that a bare `await port.patchField(...)` would not:
 *
 *   optimism       The value is applied the moment it is submitted. The overlay
 *                  has already left the typed text in the element — it edits a
 *                  contentEditable, so the DOM *is* the input — and the honest
 *                  optimistic state is "leave it there". What this adds is the
 *                  two events after it, which is the part the overlay cannot
 *                  know on its own.
 *
 *   reconciliation The server answers with what it stored, which is not always
 *                  what was sent: `image.alt` sets a leaf inside an asset and
 *                  the stored value is the whole asset. Reconciling against the
 *                  answer rather than against the input is what stops "saved"
 *                  showing one thing and a reload showing another.
 *
 *   recovery       A failed write is followed by a read, so the frame can
 *                  *offer* what is actually stored. It offers rather than
 *                  applies, and the distinction is the whole of it: the typed
 *                  text exists in one place, and a failed save that overwrote it
 *                  with the server's older copy destroyed the only thing the
 *                  failure was about. The read answers `recovered` as well as
 *                  `value`, because "the field holds null" and "we could not
 *                  ask" are two different sentences to put in front of a person.
 *
 * Writes to one field are queued so two edits a keystroke apart cannot land out
 * of order. Different fields do not wait for each other.
 *
 * ---------------------------------------------------------------------------
 * `lang`, a čtvrtá věc, kterou to dělá navíc (docs/I18N.md §4)
 *
 * Zápis s `lang` míří do řádku překladu, zápis bez něj do základu. Cesta sem je
 * jediná, kterou vizuální editace píše, takže je to jediné místo, kde `lang`
 * musí projít — a taky jediné, kde jde odchytit zápis, který server stejně
 * odmítne: pole, které se nepřekládá, je s `lang` CHYBA, ne tiché přesměrování
 * do základu.
 *
 * Odmítá se to tady místo na serveru ze stejného důvodu, z jakého validace běží
 * ve Studiu i na serveru: server odpoví „to nejde" a editor se ptá „co teda",
 * protože formulář o té otázce nic neřekl. Tady je po ruce schéma, takže se dá
 * říct proč — a hlavně se to dá říct hned, ne po odmítnutém kole na server.
 *
 * Zotavení po chybě se u překladu NENABÍZÍ. `port.get` umí přečíst základ, ne
 * překladový řádek, takže „tohle je uložená hodnota" by byl text v jiném
 * jazyce. Radši přiznat, že se zeptat nejde, než nabídnout cizí větu — `recovered`
 * je přesně pro rozlišení těch dvou případů (viz `storedValue` níž).
 */

import { findType, isTranslatable } from '../../core/index.js'

// Fronta je na POLE, ne na pole a jazyk. Dva jazyky téhož pole jsou dva různé
// řádky, takže by se o pořadí přetahovat nemusely — ale překryv si výsledky
// pamatuje pod `docId field` (viz `savesRef` v overlay/Overlay.jsx) a dvě
// odpovědi pod jedním klíčem by si přepsaly element, do kterého se vrací.
const keyOf = (docId, field) => `${docId} ${field}`

const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

const valueAt = (body, field) =>
    String(field).split('.').reduce((node, key) => (node == null ? undefined : node[key]), body)

/**
 * @param {object}   options
 * @param {object}   options.port      Contract 2 port; uses `patchField` and `get`
 * @param {function} [options.onEntry] called with every status change
 * @param {function} [options.typeFor] jméno typu → schéma. Výchozí je registr
 *                                     jádra, který má Studio naplněný; parametr
 *                                     je tu proto, aby šlo `save()` otestovat
 *                                     bez registru.
 */
export function createFieldSaver({ port, onEntry, typeFor = findType } = {}) {
    if (!port) throw new Error('[studio] createFieldSaver needs a data port.')

    // One promise chain per field, so writes to the same field serialise and
    // writes to different fields do not.
    const chains = new Map()
    let sequence = 0

    const emit = (entry) => {
        try {
            onEntry?.(entry)
        } catch (error) {
            // A listener that throws must not turn a successful save into a
            // failed one.
            console.error('[studio] visual save listener failed', error)
        }
        return entry
    }

    /**
     * What is stored for this field right now, for a frame that has just been
     * told its edit did not take.
     *
     * Best effort by definition, and the answer says which: `recovered` is the
     * difference between "the server holds null here" and "we could not ask".
     * It used to be `null` for both, and the caller could not tell them apart —
     * so the worst path in the whole feature (the session dies mid-edit, the
     * recovery read 401s too) came back looking exactly like a field that is
     * legitimately empty. The frame offers the stored value back to the editor
     * and must never offer a value it does not have.
     */
    const storedValue = async (docId, field, lang) => {
        // U překladu se neptáme vůbec. `port.get` vrací základní řádek, tedy
        // výchozí jazyk — nabídnout ho jako „uloženou hodnotu" tohohle pole by
        // znamenalo nabídnout editorovi českou větu místo německé, kterou psal.
        if (lang) return { recovered: false, value: null }
        try {
            const doc = await port.get({ id: docId })
            return { recovered: true, value: valueAt(doc?.draft ?? doc?.data ?? {}, field) ?? null }
        } catch {
            return { recovered: false, value: null }
        }
    }

    /**
     * Typ dokumentu, jednou za dokument a za sezení.
     *
     * Ptá se na to jen zápis s `lang`, takže web s jedním jazykem nezaplatí ani
     * jeden požadavek navíc. Neúspěch se pamatuje jako `null` schválně: když se
     * typ nepodařilo zjistit, nemá smysl se ptát znovu při každé klávese —
     * rozhodne server, což je odpověď, kterou stejně bereme (viz níž).
     */
    const typeNames = new Map()
    const typeOfDocument = async (docId) => {
        if (!typeNames.has(docId)) {
            typeNames.set(
                docId,
                await port
                    .get({ id: docId })
                    .then((doc) => doc?.type ?? null)
                    .catch(() => null),
            )
        }
        return typeNames.get(docId)
    }

    /**
     * Věta, proč tenhle zápis nemá smysl posílat — nebo `null`, když má.
     *
     * Odpovídá `null` i tehdy, když schéma není po ruce. Neznalost není důvod
     * odmítnout zápis: jediná pravda o překládanosti je `isTranslatable` nad
     * schématem a tu má server taky (docs/I18N.md §3). Tohle je předsunutá
     * hláška, ne druhé rozhodovací místo — kdyby rozhodovalo, rozešlo by se
     * s ním přesně v ten den, kdy Studio nemá registr naplněný.
     */
    const refuseTranslation = async (docId, field) => {
        const type = typeFor(await typeOfDocument(docId))
        if (!type || isTranslatable(type, field)) return null
        return (
            `Pole „${field}" se nepřekládá — má jednu hodnotu pro všechny jazyky. ` +
            'Upravte ho ve výchozím jazyce.'
        )
    }

    /**
     * @param {object} submission
     * @param {string} submission.docId
     * @param {string} submission.field   dotted path
     * @param {*}      submission.value
     * @param {string|null} [submission.lang]  jazyk obsahu. Bez něj se píše do
     *                      základního řádku, což JE výchozí jazyk — volající
     *                      tedy za výchozí jazyk neposílá nic a dnešní volání
     *                      se chovají přesně jako dosud (docs/I18N.md §4).
     * @returns {Promise<object>} the final entry — resolved, never rejected
     */
    const save = ({ docId, field, value, lang = null } = {}) => {
        const id = (sequence += 1)
        // Prázdný řetězec je „žádný jazyk", ne jazyk jménem "". Přichází
        // z `?lang=` v adrese Studia, kde ho odebrání parametru takhle nechá.
        const target = typeof lang === 'string' && lang.trim() ? lang.trim() : null

        if (!docId || !field) {
            return Promise.resolve(emit({
                id, docId, field, status: 'failed', value: null,
                error: new Error('Chybí dokument nebo pole'),
            }))
        }

        // Synchronous, before any await: the caller must be able to treat the
        // value as applied in the same tick it submitted it.
        emit({ id, docId, field, lang: target, status: 'pending', value })

        const run = async () => {
            try {
                // Před odesláním, ne místo serveru: server si totéž ověří sám,
                // tohle jen ušetří kolo, po kterém by editor nevěděl proč.
                const refusal = target ? await refuseTranslation(docId, field) : null
                if (refusal) {
                    return emit({
                        id, docId, field, lang: target,
                        status: 'failed', value: null, recovered: false,
                        error: new Error(refusal),
                    })
                }
                const answer = await port.patchField({ id: docId, docId, field, value, lang: target })
                // A port that answers with nothing is treated as having stored
                // what it was given. Both real ports answer properly; a third
                // one should not be able to break the UI by being terse.
                const stored = answer && 'value' in answer ? answer.value : value
                return emit({
                    id, docId, field, lang: target,
                    status: 'saved',
                    value: stored,
                    // The one flag the overlay acts on: it only has to touch the
                    // DOM again when the stored value is not what it displayed.
                    reconciled: !sameValue(stored, value),
                    document: answer?.document ?? null,
                })
            } catch (error) {
                const stored = await storedValue(docId, field, target)
                return emit({
                    id, docId, field, lang: target,
                    status: 'failed',
                    value: stored.value,
                    // Whether `value` is the server's answer or a hole. The
                    // overlay only offers to put it back when it is the former.
                    recovered: stored.recovered,
                    error,
                })
            }
        }

        const chain = (chains.get(keyOf(docId, field)) || Promise.resolve()).then(run, run)
        chains.set(keyOf(docId, field), chain)
        // Let the map forget a field once its queue has drained, so a long
        // session does not accumulate one resolved promise per field touched.
        chain.finally(() => {
            if (chains.get(keyOf(docId, field)) === chain) chains.delete(keyOf(docId, field))
        })
        return chain
    }

    return { save }
}
