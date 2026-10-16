// Which deployment is running — SERVER ONLY.
//
// One export, and it exists because two halves of the archive need the same
// answer and must not each invent one. The revision writer stamps `build_id` on
// every row it appends to `cms_document_revision`; the archive reader hands that
// stamp back to the screen so it can print the only true sentence available:
// *obsah z 3. března, přehraný dnešním kódem; kód z té doby byl `abc1234`.*
//
// ARCHIVE.md, layer 5, is blunt about why that sentence matters. An archive
// replays old bodies through TODAY'S components, so what it shows is something
// that may never have existed. Naming the commit is not a fix — nothing fixes it
// short of storing the rendered bytes — it is the admission that makes the claim
// honest instead of confident and wrong.
//
// `null` is a legitimate answer and is the one every local `next dev` gives.
// A screen that receives it must say "kód z té doby není zaznamenaný" rather
// than filling in today's commit, which would be exactly the lie the field
// exists to prevent.
export const currentBuildId = () => {
    // CMS_BUILD_ID first, so a deployment that knows its own identity by another
    // name (a CI tag, an image digest) can say so without this file learning
    // about every platform. Vercel's commit sha is the fallback because it is
    // the one this project actually deploys with.
    const explicit = String(process.env.CMS_BUILD_ID || '').trim()
    if (explicit) return explicit
    const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim()
    return sha ? sha.slice(0, 12) : null
}
