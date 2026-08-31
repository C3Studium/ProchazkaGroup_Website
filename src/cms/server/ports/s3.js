// Podepisování požadavků pro S3 (AWS SigV4), bez závislostí.
//
// MinIO mluví S3, takže tenhle podpis platí pro obojí. Vlastní implementace
// místo SDK proto, že SDK by si přitáhlo strom balíčků kvůli šesti operacím,
// a balíček, který se instaluje z gitu, má být lehký.
//
// Adresování je cestou (`https://host/bucket/klíč`), ne podle hostitele. MinIO
// na vlastní doméně virtual-host styl neumí, dokud se mu nenastaví doménová
// jména bucketů — a AWS ho zvládá taky.

import { createHash, createHmac } from 'node:crypto'

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const hmac = (key, data) => createHmac('sha256', key).update(data).digest()

/** `2026-08-30T21:34:32Z` bez pomlček a dvojteček, jak to podpis chce. */
const stamps = (now) => {
    const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    return { amzDate: iso, dateOnly: iso.slice(0, 8) }
}

/** Každý segment cesty se kóduje zvlášť — lomítka mezi nimi zůstávají. */
export const encodeKey = (key) =>
    String(key)
        .split('/')
        .map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()))
        .join('/')

const signingKey = ({ secretAccessKey, dateOnly, region, service }) => {
    let key = hmac('AWS4' + secretAccessKey, dateOnly)
    key = hmac(key, region)
    key = hmac(key, service)
    return hmac(key, 'aws4_request')
}

/**
 * Podepsaný požadavek: vrátí URL a hlavičky, se kterými se dá zavolat `fetch`.
 *
 * @param {object} options
 * @param {string} options.method
 * @param {URL}    options.url        Už i s dotazem, pokud nějaký má.
 * @param {Buffer|string} [options.body]
 * @param {object} [options.headers]  Vlastní hlavičky (content-type a spol.).
 */
export const signRequest = ({
    method,
    url,
    body = '',
    headers = {},
    accessKeyId,
    secretAccessKey,
    region = 'us-east-1',
    service = 's3',
    now = new Date(),
}) => {
    const { amzDate, dateOnly } = stamps(now)
    const payloadHash = sha256(body)

    const all = {
        host: url.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)])),
    }

    const names = Object.keys(all).sort()
    const canonicalHeaders = names.map((n) => `${n}:${String(all[n]).trim()}\n`).join('')
    const signedHeaders = names.join(';')

    // Dotaz musí být seřazený podle jména parametru — jinak podpis nesedí.
    const query = [...url.searchParams.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')

    const canonical = [method, url.pathname, query, canonicalHeaders, signedHeaders, payloadHash].join('\n')
    const scope = `${dateOnly}/${region}/${service}/aws4_request`
    const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n')
    const signature = createHmac('sha256', signingKey({ secretAccessKey, dateOnly, region, service }))
        .update(toSign)
        .digest('hex')

    return {
        url,
        headers: {
            ...all,
            Authorization:
                `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
                `SignedHeaders=${signedHeaders}, Signature=${signature}`,
        },
    }
}

/**
 * Adresa podepsaná v dotazu, ne v hlavičce — dá se poslat prohlížeči.
 *
 * @param {object} options
 * @param {number} [options.expiresIn] Sekundy; S3 povoluje nejvýš týden.
 */
export const presignUrl = ({
    method = 'GET',
    url,
    accessKeyId,
    secretAccessKey,
    region = 'us-east-1',
    service = 's3',
    expiresIn = 3600,
    now = new Date(),
}) => {
    const { amzDate, dateOnly } = stamps(now)
    const scope = `${dateOnly}/${region}/${service}/aws4_request`
    const signed = new URL(url.toString())

    signed.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
    signed.searchParams.set('X-Amz-Credential', `${accessKeyId}/${scope}`)
    signed.searchParams.set('X-Amz-Date', amzDate)
    signed.searchParams.set('X-Amz-Expires', String(Math.min(Math.max(1, Math.floor(expiresIn)), 604800)))
    signed.searchParams.set('X-Amz-SignedHeaders', 'host')

    const query = [...signed.searchParams.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')

    const canonical = [method, signed.pathname, query, `host:${signed.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
    const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n')
    const signature = createHmac('sha256', signingKey({ secretAccessKey, dateOnly, region, service }))
        .update(toSign)
        .digest('hex')

    signed.searchParams.set('X-Amz-Signature', signature)
    return signed.toString()
}
