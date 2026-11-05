// Zmenšení fotky v prohlížeči ještě před odesláním.
//
// Server obrázek zmenší a převede do WebP sám (server/imageOptimize.js), ale
// k tomu se velká fotka nemusí vůbec dostat: Vercel pustí do funkce tělo
// požadavku jen do ~4,5 MB a CMS má vlastní strop (CMS_MAX_UPLOAD_BYTES, 8 MB).
// Fotka z telefonu má 5–12 MB. Proto ji prohlížeč nejdřív sám zmenší na
// MAX_EDGE px a zabalí do WebP (kde to prohlížeč neumí — starší Safari — do
// JPEG; ten pak převede server).
//
// Malé soubory v limitu rozměrů jdou beze změny: dvojí ztrátová komprese
// (tady a pak na serveru) by jen ubírala kvalitu a server je zpracuje sám.
// Bez knihovny — createImageBitmap a <canvas> umí všechno potřebné.

export const MAX_EDGE = 2560
const SEND_AS_IS_BELOW = 1.5 * 1024 * 1024
const QUALITY = 0.85
const RASTER = /^image\/(jpeg|png|webp)$/

const toBlob = (canvas, type, quality) =>
    new Promise((resolve) => {
        try {
            canvas.toBlob((blob) => resolve(blob), type, quality)
        } catch {
            resolve(null)
        }
    })

const renamed = (name, ext) => `${String(name || 'obrazek').replace(/\.[^.]*$/, '') || 'obrazek'}.${ext}`

/**
 * Soubor připravený k nahrání: zmenšený, nebo ten původní, když zmenšovat
 * nebylo co nebo to nešlo. Nikdy nehází — nejhorší případ je originál.
 *
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function prepareImageUpload(file) {
    if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') return file
    if (!file || !RASTER.test(file.type || '')) return file

    let bitmap
    try {
        // `from-image` narovná fotku podle EXIF, jinak by fotka z telefonu
        // na výšku skončila naležato (canvas EXIF nezná).
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
        return file
    }

    try {
        const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
        if (scale === 1 && file.size <= SEND_AS_IS_BELOW) return file

        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

        let blob = await toBlob(canvas, 'image/webp', QUALITY)
        // Prohlížeč, který WebP zakódovat neumí, vrátí místo něj PNG.
        if (!blob || blob.type !== 'image/webp') {
            blob = file.type === 'image/png' ? await toBlob(canvas, 'image/png') : await toBlob(canvas, 'image/jpeg', QUALITY)
        }
        if (!blob) return file
        // Nic neušetřilo a rozměry byly v pořádku: pošli originál.
        if (scale === 1 && blob.size >= file.size) return file

        const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'
        return new File([blob], renamed(file.name, ext), { type: blob.type, lastModified: file.lastModified })
    } catch {
        return file
    } finally {
        bitmap.close?.()
    }
}
