// What the bytes say they are — SERVER ONLY.
//
// Two facts about an upload have to come from the file itself rather than from
// the request: its type and its pixel dimensions.
//
// The MIME arrives as the POST's Content-Type header (handlers/media.js), which
// is whatever the browser guessed from the file extension and whatever a
// non-browser client felt like sending. `ALLOWED_MIME` in media.js exists to
// keep an SVG — a script host — out of the library; a check against a
// client-supplied string is not a check at all, because renaming shell.svg to
// shell.webp defeats it. So the magic bytes decide, and the header is only ever
// quoted back in the error message.
//
// Dimensions are the Studio's grid layout and `next/image`'s width/height, and
// a claimed size that does not match the file makes both wrong.
//
// ---------------------------------------------------------------------------
// Why a hand-written parser and not a library
// ---------------------------------------------------------------------------
//
// sharp IS a dependency of this project (next/image pulls it in) and media.js
// used it for dimensions before this file existed. It is kept as a fallback
// below, not removed. What it cannot do is answer the first question: sharp
// tells you what it managed to decode, which is a different thing from what the
// file's container declares, and it has no opinion at all about a PDF.
//
// Reading a header is ~120 lines of well-specified offsets, needs no native
// import on the request path, and covers every format this site actually ships:
// the whole of /public/assets is .webp, the logos are .webp, portraits .webp.
// PNG and JPEG are here because an editor's own camera roll and screenshots are
// what will arrive next.
//
// Anything NOT recognised below returns `{ mime: null }` and media.js refuses
// the upload. That is deliberately the strict direction: an unrecognised header
// is either a format this CMS has never served or a file pretending to be one,
// and both are better refused than stored. GIF and AVIF are recognised because
// ALLOWED_MIME already admits them; SVG is not recognised, and could not be
// even in principle, because it has no magic number — which is a second reason
// it stays out.

import { assertServer } from './env.js'

assertServer('@/cms/server/imageProbe')

const NONE = Object.freeze({ mime: null, width: null, height: null })

const at = (buffer, offset, ascii) =>
    buffer.length >= offset + ascii.length &&
    buffer.toString('latin1', offset, offset + ascii.length) === ascii

// --- PNG ---------------------------------------------------------------------
// Signature, then the IHDR chunk is required by the spec to be first: length(4)
// type(4) width(4) height(4) starting at byte 8.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const png = (buffer) => {
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null
    if (!at(buffer, 12, 'IHDR')) return { mime: 'image/png', width: null, height: null }
    return {
        mime: 'image/png',
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    }
}

// --- JPEG --------------------------------------------------------------------
// No fixed dimension offset: the frame header is somewhere after an arbitrary
// number of APPn/COM/DQT segments, so the marker chain has to be walked. SOF0-15
// minus the four markers in that range that are not frame headers (DHT C4, JPGA
// C8, DAC CC).
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

const jpeg = (buffer) => {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return null

    let offset = 2
    while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset += 1; continue }   // resync past padding
        const marker = buffer[offset + 1]
        if (marker === 0xff) { offset += 1; continue }           // fill byte
        // Standalone markers carry no length field.
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            offset += 2
            continue
        }
        const length = buffer.readUInt16BE(offset + 2)
        if (length < 2) break
        if (SOF.has(marker)) {
            // ...precision(1) height(2) width(2) — height first, which is the
            // one field order in this file that reads like a typo and is not.
            return { mime: 'image/jpeg', width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
        }
        offset += 2 + length
    }
    // A JPEG whose SOF is past the end of what we hold is still a JPEG.
    return { mime: 'image/jpeg', width: null, height: null }
}

// --- WebP --------------------------------------------------------------------
// RIFF container, three encodings, three different places the canvas size lives.
// This is the format that matters most here: every image the site ships is one.
const webp = (buffer) => {
    if (buffer.length < 30 || !at(buffer, 0, 'RIFF') || !at(buffer, 8, 'WEBP')) return null
    const mime = 'image/webp'
    const chunk = buffer.toString('latin1', 12, 16)

    // Lossy: VP8 bitstream, 3-byte frame tag, 3-byte start code, then two
    // 14-bit dimensions (the top 2 bits of each are a scaling hint).
    if (chunk === 'VP8 ' && buffer.length >= 30) {
        if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return { mime, width: null, height: null }
        return { mime, width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
    }

    // Lossless: signature byte then 28 bits packed little-endian, each dimension
    // stored one less than its value.
    if (chunk === 'VP8L' && buffer.length >= 25) {
        if (buffer[20] !== 0x2f) return { mime, width: null, height: null }
        const bits = buffer.readUInt32LE(21)
        return { mime, width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }

    // Extended (animation, alpha, ICC): flags(4) then canvas width-1 and
    // height-1 as 24-bit little-endian.
    if (chunk === 'VP8X' && buffer.length >= 30) {
        return { mime, width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 }
    }

    return { mime, width: null, height: null }
}

// --- GIF ---------------------------------------------------------------------
const gif = (buffer) => {
    if (buffer.length < 10 || (!at(buffer, 0, 'GIF87a') && !at(buffer, 0, 'GIF89a'))) return null
    return { mime: 'image/gif', width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
}

// --- AVIF --------------------------------------------------------------------
// ISO base media file format. The size lives in an `ispe` box nested four levels
// down (meta > iprp > ipco > ispe); walking the box tree properly is a parser in
// its own right, so this scans the first 64 kB for the box header instead.
// `ispe` is a four-byte tag preceded by its own length — a false positive would
// have to be those eight bytes in that order, and the cost of one is a wrong
// width on a format the site does not currently ship.
const avif = (buffer) => {
    if (buffer.length < 12 || !at(buffer, 4, 'ftyp')) return null
    const brand = buffer.toString('latin1', 8, 12)
    if (brand !== 'avif' && brand !== 'avis') return null

    const window = buffer.subarray(0, Math.min(buffer.length, 65536))
    const index = window.indexOf('ispe', 0, 'latin1')
    if (index < 0 || index + 16 > window.length) return { mime: 'image/avif', width: null, height: null }
    return {
        // +4 skips the FullBox version/flags word that follows the tag.
        mime: 'image/avif',
        width: window.readUInt32BE(index + 8),
        height: window.readUInt32BE(index + 12),
    }
}

// --- PDF ---------------------------------------------------------------------
// Allowed in the library as a document, never rendered as an image. Page size is
// a content-stream question and nothing asks it, so dimensions stay null.
const pdf = (buffer) => (at(buffer, 0, '%PDF-') ? { mime: 'application/pdf', width: null, height: null } : null)

const READERS = [png, jpeg, webp, gif, avif, pdf]

/**
 * @param {Buffer} buffer
 * @returns {{ mime: string|null, width: number|null, height: number|null }}
 */
export const probeBytes = (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return NONE
    for (const reader of READERS) {
        const result = reader(buffer)
        if (result) return result
    }
    return NONE
}
