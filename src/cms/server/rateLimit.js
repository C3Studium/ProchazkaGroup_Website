// Rate limiting for the public review route.
//
// Honest description of what this is: a per-instance in-memory limiter. Vercel
// runs several lambda instances and recycles them, so a determined submitter
// spreading requests across instances gets more than the nominal budget. It is
// still worth having — it stops the accidental double-submit and the trivial
// script — and it costs no dependency and no database round-trip. If the abuse
// this is meant to prevent ever materialises, the replacement is a
// cms_rate_limit table or Upstash, and the call site does not change.
//
// The key is a salted hash of the client IP, never the IP itself. This build
// dropped ip_list and list_of_all_ips from the migrated reviews on the grounds
// that there is no stated lawful basis for holding IP addresses; keeping raw
// IPs in a limiter would be the same data under a different name. The hash is
// in memory only and is never written anywhere.

import crypto from 'node:crypto'

import { ipHashSalt } from './env.js'

const buckets = new Map()

// Bound the map so a burst of unique clients cannot grow it without limit.
const MAX_TRACKED = 5000

export const clientKey = (req) => {
    // Vercel sets x-forwarded-for; the left-most entry is the client. Trusting
    // the header is only safe because Vercel overwrites it at the edge — on any
    // other host this needs revisiting.
    const forwarded = req.headers['x-forwarded-for']
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || '')
        .split(',')[0]
        .trim() || req.socket?.remoteAddress || 'unknown'

    return crypto.createHash('sha256').update(`${ipHashSalt()}:${ip}`).digest('hex').slice(0, 32)
}

const sweep = (now) => {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key)
    }
}

/**
 * Fixed-window counter. Returns { allowed, remaining, retryAfter }.
 */
export const consume = (key, { limit = 5, windowMs = 60 * 60 * 1000 } = {}) => {
    const now = Date.now()

    if (buckets.size > MAX_TRACKED) sweep(now)

    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, remaining: limit - 1, retryAfter: 0 }
    }

    if (bucket.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
        }
    }

    bucket.count += 1
    return { allowed: true, remaining: limit - bucket.count, retryAfter: 0 }
}

// Test seam.
export const reset = () => buckets.clear()
