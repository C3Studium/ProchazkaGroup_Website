/**
 * „Líbí se" — jeden hlas na jednu adresu, bez ukládání adresy.
 *
 * SERVER ONLY. Reads and writes with the service-role client, because
 * `cms_reaction` is revoked from anon and authenticated in migrations/0012 —
 * a table of IP fingerprints is exactly the thing that must not be downloadable
 * and comparable.
 *
 * ---------------------------------------------------------------------------
 * Co je to číslo, které web ukazuje
 *
 * Součet dvou věcí: výchozí hodnoty uložené v dokumentu (`review.likes`,
 * `consultant.stats.likes`, přenesené ze staré databáze) a počtu řádků tady.
 * Nepřičítá se do dokumentu, a to je celý důvod, proč tahle tabulka existuje —
 * `publish()` přepisuje `data` obsahem `draft`, takže první publikování po
 * spuštění by nasbírané liky beze stopy zahodilo.
 */
import crypto from 'node:crypto'

import { assertServer } from './env.js'
import { cmsErrorFromPostgrest, invalid, notFound } from './errors.js'
import { getAdminClient } from './supabaseAdmin.js'

export const REACTION_TARGETS = Object.freeze(['review', 'consultant'])

const TABLE = 'cms_reaction'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const db = () => getAdminClient()

export const assertTarget = (type) => {
    if (!REACTION_TARGETS.includes(type)) {
        throw invalid(`Neznámý cíl reakce: ${type}. Povoleno: ${REACTION_TARGETS.join(', ')}`)
    }
    return type
}

/** Where the baseline lives differs per type, and only here. */
const baselineOf = (document) => {
    const body = document?.data ?? {}
    if (document.type === 'consultant') return Number(body?.stats?.likes) || 0
    return Number(body?.likes) || 0
}

/**
 * Record one like.
 *
 * The unique index does the work: a second attempt from the same fingerprint
 * collides rather than counting twice, and that collision is an ANSWER — the
 * visitor has already voted — not a failure. Reported as `already` so the
 * button can say so instead of showing an error for a thing that is fine.
 */
export const react = async ({ targetType, targetId, ipHash, clientHash = ipHash }) => {
    assertServer('reactions')
    assertTarget(targetType)
    if (!UUID.test(String(targetId || ''))) throw invalid('Neplatné id')

    // Liking something the public cannot see would let a caller discover which
    // ids exist. Published only, and the document is what carries the baseline.
    const { data: document, error: readError } = await db()
        .from('cms_document')
        .select('id, type, status, data, archived_at')
        .eq('id', targetId)
        .maybeSingle()
    if (readError) throw cmsErrorFromPostgrest(readError, 'Načtení dokumentu selhalo')
    if (!document || document.type !== targetType) throw notFound('Nenalezeno')
    if (document.status !== 'published' || document.archived_at) throw notFound('Nenalezeno')

    const { error } = await db()
        .from(TABLE)
        .insert({ target_type: targetType, target_id: targetId, ip_hash: ipHash })

    let already = false
    if (error) {
        if (error.code === '23505') already = true
        else throw cmsErrorFromPostgrest(error, 'Uložení reakce selhalo')
    }

    // Souhlas s recenzí je zároveň souhlas s tím, kdo ji dostal — viz
    // `mirrorToConsultant`. Jen když hlas opravdu vznikl: opakovaný klik ze
    // stejného místa už nic nepřidává.
    if (targetType === 'review' && !already) {
        await mirrorToConsultant(targetId, document.data || {}, clientHash, false)
    }

    return { already, count: await countFor(targetType, targetId, baselineOf(document)) }
}

/**
 * Komu recenze patří.
 *
 * Recenze nese jméno poradce, ne odkaz na jeho dokument — tak to přišlo ze staré
 * databáze a tak to porovnává i příjem nových recenzí (handlers/reviews.js).
 * Shoda podle jména je proto to, co tu je k dispozici; když nesedí nic, vrací se
 * null a like se prostě nepropíše dál. Nikdy to nesmí shodit hlas u recenze —
 * ten je hlavní věc, propsání je vedlejší.
 */
const consultantOfReview = async (reviewBody) => {
    const wanted = String(reviewBody?.consultantName || '').trim().toLowerCase()
    if (!wanted) return null

    const { data, error } = await db()
        .from('cms_document')
        .select('id, data')
        .eq('type', 'consultant')
        .eq('status', 'published')
        .is('archived_at', null)
    if (error || !data) return null

    const match = data.find((row) => {
        const body = row.data || {}
        const full = [body.academicTitle, body.firstName, body.lastName]
            .filter((part) => typeof part === 'string' && part.trim())
            .join(' ')
            .trim()
            .toLowerCase()
        const plain = `${body.firstName || ''} ${body.lastName || ''}`.trim().toLowerCase()
        return full === wanted || plain === wanted
    })

    return match?.id || null
}

/**
 * Propsat hlas z recenze na poradce.
 *
 * Zadání znělo „přidá count do liků a tím i liky tomu poradci". Dělá se to
 * druhým řádkem, ne přičtením do čísla: otisk nese i id recenze, takže kdo
 * souhlasí s pěti recenzemi jednoho poradce, přidá mu pět — a když jednu z nich
 * odvolá, ubere se právě jedna. Přičtení do čísla by tohle neumělo vzít zpět.
 *
 * Selhání se polyká. Hlas u recenze už je zapsaný a je to ta věc, na kterou
 * návštěvník klikl; poradcův součet se dorovná při příštím kliknutí.
 */
const mirrorToConsultant = async (reviewId, reviewBody, clientHash, remove) => {
    try {
        const consultantId = await consultantOfReview(reviewBody)
        if (!consultantId) return

        const ipHash = crypto
            .createHash('sha256')
            .update(`${clientHash}:consultant:${consultantId}:via:${reviewId}`)
            .digest('hex')

        if (remove) {
            await db().from(TABLE).delete()
                .eq('target_type', 'consultant').eq('target_id', consultantId).eq('ip_hash', ipHash)
            return
        }

        const { error } = await db().from(TABLE)
            .insert({ target_type: 'consultant', target_id: consultantId, ip_hash: ipHash })
        if (error && error.code !== '23505') throw error
    } catch (error) {
        console.warn(`[cms] like se nepropsal na poradce — ${String(error?.message || error)}`)
    }
}

/**
 * Take a vote back.
 *
 * The mirror of `react`, and it exists because a reader who clicks by mistake
 * has no other way out: the fingerprint is the server's, so clearing the
 * browser would not help them, and a vote that cannot be withdrawn is one
 * people hesitate to cast.
 *
 * A row that is not there is not an error — the visitor wants to end up not
 * having voted, and they already are. Same posture as `already` on the way in.
 */
export const unreact = async ({ targetType, targetId, ipHash, clientHash = ipHash }) => {
    assertServer('reactions')
    assertTarget(targetType)
    if (!UUID.test(String(targetId || ''))) throw invalid('Neplatné id')

    const { data: document, error: readError } = await db()
        .from('cms_document')
        .select('id, type, status, data, archived_at')
        .eq('id', targetId)
        .maybeSingle()
    if (readError) throw cmsErrorFromPostgrest(readError, 'Načtení dokumentu selhalo')
    if (!document || document.type !== targetType) throw notFound('Nenalezeno')

    const { error } = await db()
        .from(TABLE)
        .delete()
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('ip_hash', ipHash)
    if (error) throw cmsErrorFromPostgrest(error, 'Odebrání reakce selhalo')

    if (targetType === 'review') {
        await mirrorToConsultant(targetId, document.data || {}, clientHash, true)
    }

    return { count: await countFor(targetType, targetId, baselineOf(document)) }
}

/**
 * Which of these has this visitor already voted for.
 *
 * The page is statically generated, so the answer cannot be baked in — the
 * markup is the same for everyone. The button therefore renders in its neutral
 * state and asks afterwards, which is also why the fingerprint has to be
 * server-side: the browser has nothing that survives a cleared cache and
 * nothing another browser on the same connection would share.
 */
export const likedAmong = async (targetType, ids, ipHashOf) => {
    assertServer('reactions')
    assertTarget(targetType)

    const wanted = [...new Set((ids || []).filter((id) => UUID.test(String(id || ''))))]
    if (!wanted.length) return []

    const hashes = new Map(wanted.map((id) => [ipHashOf(id), id]))
    const { data, error } = await db()
        .from(TABLE)
        .select('target_id, ip_hash')
        .eq('target_type', targetType)
        .in('target_id', wanted)
        .in('ip_hash', [...hashes.keys()])
    if (error) throw cmsErrorFromPostgrest(error, 'Načtení reakcí selhalo')

    return (data || []).map((row) => row.target_id)
}

/** Baseline plus rows. */
export const countFor = async (targetType, targetId, baseline = 0) => {
    const { count, error } = await db()
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('target_type', targetType)
        .eq('target_id', targetId)
    if (error) throw cmsErrorFromPostgrest(error, 'Načtení počtu selhalo')
    return baseline + (count ?? 0)
}

/**
 * Counts for a whole page's worth of ids, in one query.
 *
 * The review wall renders forty at a time; asking per card would be forty round
 * trips inside one render.
 */
export const countsFor = async (targetType, ids) => {
    assertServer('reactions')
    const wanted = [...new Set((ids || []).filter((id) => UUID.test(String(id || ''))))]
    if (!wanted.length) return new Map()

    const { data, error } = await db()
        .from(TABLE)
        .select('target_id')
        .eq('target_type', targetType)
        .in('target_id', wanted)
    if (error) throw cmsErrorFromPostgrest(error, 'Načtení počtů selhalo')

    const counts = new Map(wanted.map((id) => [id, 0]))
    for (const row of data || []) counts.set(row.target_id, (counts.get(row.target_id) || 0) + 1)
    return counts
}

/**
 * The numbers a page should show — baseline plus votes, per id.
 *
 * The same meaning as the `likes` a server-rendered card already carries, and
 * that is the whole point: the browser replaces one number with another rather
 * than doing arithmetic against a count it cannot see. Returning bare vote
 * counts here was the first shape and it made the client subtract a value it
 * had no way of knowing.
 */
export const totalsFor = async (targetType, ids) => {
    assertServer('reactions')
    assertTarget(targetType)

    const wanted = [...new Set((ids || []).filter((id) => UUID.test(String(id || ''))))]
    if (!wanted.length) return {}

    const [{ data, error }, counts] = await Promise.all([
        db().from('cms_document').select('id, type, data').in('id', wanted),
        countsFor(targetType, wanted),
    ])
    if (error) throw cmsErrorFromPostgrest(error, 'Načtení dokumentů selhalo')

    const totals = {}
    for (const document of data || []) {
        if (document.type !== targetType) continue
        totals[document.id] = baselineOf(document) + (counts.get(document.id) || 0)
    }
    return totals
}

/** The fingerprint of one visitor, for one target. Never the address itself. */
export const fingerprint = (clientKeyValue, targetType, targetId) =>
    crypto.createHash('sha256').update(`${clientKeyValue}:${targetType}:${targetId}`).digest('hex')
