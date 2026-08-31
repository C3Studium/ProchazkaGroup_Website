/**
 * In-memory implementation of Contract 2, for developing the Studio before
 * build C's real port exists.
 *
 * It is deliberately a full implementation rather than a set of empty
 * resolvers: search, sort, pagination and the draft/publish transitions are all
 * real, so the UI is exercised against the same semantics the server will have.
 * State persists to localStorage so a reload does not wipe an editing session —
 * bump STORE_VERSION to reset after a schema change.
 *
 * Nothing here ships. `src/pages/studio/[[...path]].jsx` picks this port only
 * when no real port is supplied.
 */

// Pure — the core and errors.js, nothing else — and therefore browser-safe in
// the same way `httpDataPort.js` is, despite living under `server/`. Shared so
// the stub cannot accept a field path or a value that production would refuse.
import { sameJson } from "@/cms/core"
import { patchBody } from "@/cms/server/fieldPatch"
import { REJECTION_FIELDS, REJECTION_REASONS } from "@/cms/schemas/review"

import { DEV_PASSWORD, seedAssets, seedDocuments, seedUsers } from "./seed"

const STORE_KEY = "cms.studio.dev"
// 8: consultants gained academicTitle/firstName/lastName, a second portrait and
// an archived fixture. A stale version 7 store would show the old shape.
// 9: the two homepage copy blocks (index.offers, index.who-we-are) and their
// photographs joined the fixtures. A stale version 8 store would keep showing
// eight siteCopy documents and none of the two the page is annotated against.
// 10: the partner logos are the fourteen keyed files in /logos/orbit, not the
// raw ones. Version 9 fixtures drew ten logos with their backgrounds still on
// — including KB and ČSOB, the two that were dropped because keying could not
// clean them — so a stale store silently undoes that work on the homepage.
const STORE_VERSION = 10
const LATENCY = 140

export class CmsError extends Error {
  constructor(code, message, fields) {
    super(message)
    this.name = "CmsError"
    this.code = code
    this.fields = fields
  }
}

const wait = (ms = LATENCY) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)))
// Said once, so the five methods that refuse cannot drift apart.
const ARCHIVE_UNAVAILABLE =
  "Archiv čte revize ze serveru a vývojový port žádné nemá. Vypněte NEXT_PUBLIC_CMS_DEV_PORT."

const now = () => new Date().toISOString()
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

/* ------------------------------------------------------------------ store -- */

function hydrate() {
  const documents = []
  for (const [type, entries] of Object.entries(seedDocuments || {})) {
    for (const entry of entries) {
      const published = entry._status === "published"
      documents.push({
        id: entry._id,
        type,
        status: published ? "published" : "draft",
        // Contract 3: an unpublished document has no public body yet, its
        // content lives in `draft` until someone publishes it.
        data: published ? clone(entry.data) : {},
        draft: published ? null : clone(entry.data),
        createdAt: entry._createdAt,
        updatedAt: entry._updatedAt,
        publishedAt: published ? entry._updatedAt : null,
        // Orthogonal to `_status` on purpose, exactly as the column is: a
        // fixture can be published AND archived, which is the case the archive
        // view exists for.
        archivedAt: entry._archivedAt ?? null,
        createdBy: null,
      })
    }
  }
  return {
    version: STORE_VERSION,
    documents,
    assets: clone(seedAssets) || [],
    users: clone(seedUsers) || [],
    // The id of the signed-in account, not a copy of it — a role change or a
    // disable has to be visible to the session it applies to, and a snapshot
    // taken at sign-in would go stale the moment an owner edited themselves.
    sessionUserId: null,
  }
}

function load() {
  if (typeof window === "undefined") return hydrate()
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === STORE_VERSION) return parsed
    }
  } catch {
    // Corrupt or unavailable storage just means a fresh dev dataset.
  }
  return hydrate()
}

/* ----------------------------------------------------------------- query -- */

const bodyOf = (doc) => doc.draft ?? doc.data ?? {}

/** Search walks every leaf string in the body — schema-agnostic on purpose. */
function matchesSearch(doc, search) {
  if (!search) return true
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  const stack = [bodyOf(doc)]
  while (stack.length) {
    const value = stack.pop()
    if (value == null) continue
    if (typeof value === "string" || typeof value === "number") {
      if (String(value).toLowerCase().includes(needle)) return true
    } else if (typeof value === "object") {
      stack.push(...Object.values(value))
    }
  }
  return false
}

const isSet = (value) => value !== undefined && value !== null && value !== ""

/**
 * One field of one document, on the same three roots `server/query.js` resolves.
 *
 * A bare name is the body an editor is working on — which is what every filter
 * in the Studio meant before any of them needed to be specific. `data.x` and
 * `draft.x` name one of the two halves explicitly, and the moderation queues do
 * need that: a rejection stamp is written into `draft`, and asking for it on
 * `data` would match nothing at all against the real port.
 */
function fieldOf(doc, key) {
  if (key.startsWith("data.")) return doc.data?.[key.slice(5)]
  if (key.startsWith("draft.")) return doc.draft?.[key.slice(6)]
  return bodyOf(doc)[key]
}

/**
 * Implements the declarative filter grammar described in lib/moderation.js.
 * Predicate functions are deliberately not supported — the real port is an HTTP
 * boundary and a filter that cannot be serialised would work here and nowhere
 * else, which is the worst possible failure mode for a dev stub.
 */
function matchesFilters(doc, filters) {
  if (!filters) return true

  return Object.entries(filters).every(([key, expected]) => {
    if (expected === undefined) return true

    // `state` filters the document envelope, everything else the body.
    if (key === "state") {
      if (expected === "draft") return doc.status !== "published"
      if (expected === "published") return doc.status === "published" && !doc.draft
      if (expected === "edited") return doc.status === "published" && Boolean(doc.draft)
      return true
    }
    if (key === "archived") return Boolean(doc.archivedAt) === Boolean(expected)
    if (key === "ids") return expected.includes(doc.id)

    const actual = fieldOf(doc, key)

    if (expected && typeof expected === "object" && "op" in expected) {
      const { op, value } = expected
      if (op === "eq") return actual === value
      if (op === "neq") return actual !== value
      // `is`/`isNot` against null, because `neq` cannot ask it in SQL and the
      // real port therefore does not offer it either — query.js says why.
      if (op === "is") return value === null ? actual == null : actual === value
      if (op === "isNot") return value === null ? actual != null : actual !== value
      if (op === "exists") return isSet(actual) === Boolean(value)
      if (op === "in") return Array.isArray(value) && value.includes(actual)
      if (op === "contains") return String(actual ?? "").toLowerCase().includes(String(value).toLowerCase())
      if (op === "gt") return actual > value
      if (op === "lt") return actual < value
      throw new CmsError("invalid", `Neznámý filtr "${op}".`)
    }

    if (expected === null || expected === "") return true
    return actual === expected
  })
}

function compare(a, b, field, direction) {
  const left = fieldOf(a, field)
  const right = fieldOf(b, field)
  const sign = direction === "desc" ? -1 : 1

  // Empty values sort last in both directions — an editor scanning for the
  // newest item should never hit a wall of blanks first.
  if (left == null && right == null) return 0
  if (left == null) return 1
  if (right == null) return -1

  if (typeof left === "number" && typeof right === "number") return (left - right) * sign
  return String(left).localeCompare(String(right), "cs") * sign
}

/* ------------------------------------------------------------------ port -- */

/**
 * The port instance this module has handed out, if any.
 *
 * The store is in memory and only mirrored to localStorage, so two ports built
 * from this module would each hold their own copy and the older one would go
 * stale the moment the newer one wrote. One instance per page removes that
 * failure entirely, and nothing wants a second: `createDevPort()` is called
 * once, by the Studio's mount point.
 *
 * `getDevPort` existed for `lib/portCompat.js`, which needed to reach this same
 * instance while the Studio's mount point still proxied a fixed list of method
 * names. That shim is gone — the mount point forwards the whole port now — and
 * the accessor is kept only as a way to reach the store from a console or a
 * test.
 */
let devPort = null

export const getDevPort = () => devPort

export function createDevPort({ signedIn = false } = {}) {
  if (devPort) return devPort

  let store = load()
  if (signedIn) store.sessionUserId = store.users[0]?.id || null

  if (typeof window !== "undefined") {
    // The fixture credentials, said out loud once. Without this the sign-in
    // screen is a wall with no way through, and the alternative — a hint
    // rendered in the component — would be a dev affordance living in shipped UI.
    console.info(
      `[studio] dev port: sign in as any of ${store.users.map((entry) => entry.email).join(", ")} ` +
        `with the password "${DEV_PASSWORD}".`,
    )
  }

  const persist = () => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {
      // Quota or private mode — dev data simply stops surviving reloads.
    }
  }

  /** Public shape of a user. `password` never crosses this boundary. */
  const publicUser = (entry) =>
    entry && {
      id: entry.id,
      email: entry.email,
      name: entry.name,
      role: entry.role,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt || entry.createdAt,
      lastLoginAt: entry.lastLoginAt,
      disabledAt: entry.disabledAt,
      createdBy: entry.createdBy ?? null,
    }

  /** Mirrors cms_resolve_session(): a disabled account stops resolving. */
  const currentUser = () => {
    const entry = store.users.find((user) => user.id === store.sessionUserId)
    if (!entry || entry.disabledAt) return null
    return entry
  }

  const requireSession = () => {
    const user = currentUser()
    if (!user) throw new CmsError("unauthorized", "Přihlaste se prosím znovu.")
    return user
  }

  /** The server checks this on every request; so does the stub, or the Studio
   *  gets developed against a permission model that does not exist. */
  const requireOwner = () => {
    const user = requireSession()
    if (user.role !== "owner") throw new CmsError("forbidden", "Tuto akci může provést jen vlastník.")
    return user
  }

  const activeOwners = () => store.users.filter((user) => user.role === "owner" && !user.disabledAt)

  const findUser = (id) => {
    const user = store.users.find((entry) => entry.id === id)
    if (!user) throw new CmsError("not_found", "Uživatel neexistuje.")
    return user
  }

  const assertNotLastOwner = (target) => {
    if (target.role !== "owner" || target.disabledAt) return
    if (activeOwners().length <= 1) {
      throw new CmsError(
        "conflict",
        "Toto je poslední aktivní vlastník. Nejdřív pověřte někoho dalšího, jinak by se systém uzamkl.",
      )
    }
  }

  const find = (id) => {
    const doc = store.documents.find((entry) => entry.id === id)
    if (!doc) throw new CmsError("not_found", "Dokument neexistuje.")
    return doc
  }

  const port = {
    /**
     * `archived` mirrors the server's tri-state (src/cms/server/documents.js):
     * falsy means live documents only, `true` means the archive, `"all"` means
     * both. Defaulting to live-only here as well is the point of the stub — a
     * dev port that showed archived rows in the normal list would let the
     * Studio be built against semantics production does not have.
     */
    async list({ type, search, filters, sort, page = 1, perPage = 20, archived = false } = {}) {
      await wait()
      requireSession()

      let rows = store.documents.filter((doc) => (type ? doc.type === type : true))
      if (archived !== "all") rows = rows.filter((doc) => Boolean(doc.archivedAt) === Boolean(archived))
      rows = rows.filter((doc) => matchesSearch(doc, search) && matchesFilters(doc, filters))

      // ASSUMPTION — the spec names `sort` without a shape. The Studio sends a
      // type ordering's own `by` array, so the port needs no ordering registry.
      const by = Array.isArray(sort) ? sort : sort ? [sort] : []
      if (by.length) {
        rows = [...rows].sort((a, b) => {
          for (const { field, direction } of by) {
            const result = compare(a, b, field, direction)
            if (result !== 0) return result
          }
          return 0
        })
      } else {
        rows = [...rows].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      }

      const total = rows.length
      const start = (page - 1) * perPage
      return { rows: clone(rows.slice(start, start + perPage)), total }
    },

    async get({ id }) {
      await wait(60)
      requireSession()
      return clone(find(id))
    },

    async create({ type, data }) {
      await wait()
      requireSession()
      const doc = {
        id: uid(type),
        type,
        status: "draft",
        data: {},
        draft: clone(data) || {},
        createdAt: now(),
        updatedAt: now(),
        publishedAt: null,
        archivedAt: null,
        createdBy: currentUser()?.id || null,
      }
      store.documents.unshift(doc)
      persist()
      return clone(doc)
    },

    /**
     * `baseVersion` is checked here for the same reason `sameJson` is: a stub
     * that accepted a stale write the server refuses would let the resolve
     * dialog be developed against a backend that never opens it.
     *
     * The order matches the server's exactly, and the order is the rule: a body
     * that stores nothing is answered, not refused, so pressing Uložit twice
     * cannot produce a conflict.
     */
    async update({ id, data, baseVersion = null }) {
      await wait()
      requireSession()
      const doc = find(id)
      // Edits always land in `draft`; `data` only moves on publish. A body that
      // repeats what is already published stores no draft at all — same rule and
      // same comparison as src/cms/server/documents.js, so the stub cannot make
      // a state the real server would not.
      const draft = sameJson(data, doc.data) ? null : clone(data)
      if (sameJson(draft, doc.draft)) return clone(doc)
      if (baseVersion != null && baseVersion !== doc.updatedAt) {
        throw new CmsError("conflict", "Někdo jiný obsah mezitím změnil. Načtěte jej znovu.")
      }
      doc.draft = draft
      doc.updatedAt = now()
      persist()
      return clone(doc)
    },

    /**
     * Contract C — the visual editor's write.
     *
     * Path resolution and single-field validation come from the real server's
     * `fieldPatch.js` rather than being re-implemented here. That module is
     * pure — the core and errors.js, nothing else — so it is browser-safe in
     * the same way `httpDataPort.js` is, and sharing it means the stub cannot
     * accept a path or a value that production would refuse. Which is the whole
     * job of the stub.
     *
     * The one thing it re-states rather than shares is the write itself, and it
     * re-states it identically: `draft` moves, `data` does not.
     */
    async patchField({ id, field, value }) {
      await wait()
      requireSession()
      const doc = find(id)
      const next = patchBody(doc.type, doc.draft ?? doc.data ?? {}, field, value)

      doc.draft = clone(next.body)
      doc.updatedAt = now()
      persist()

      return {
        document: clone(doc),
        field: next.segments.join("."),
        value:
          next.segments.reduce((node, key) => (node == null ? undefined : node[key]), doc.draft) ??
          null,
      }
    },

    async remove({ id }) {
      await wait()
      requireSession()
      const index = store.documents.findIndex((entry) => entry.id === id)
      if (index === -1) throw new CmsError("not_found", "Dokument neexistuje.")
      store.documents.splice(index, 1)
      persist()
    },

    async publish({ id }) {
      await wait()
      requireSession()
      const doc = find(id)
      doc.data = clone(doc.draft ?? doc.data ?? {})
      doc.draft = null
      doc.status = "published"
      doc.publishedAt = now()
      doc.updatedAt = now()
      persist()
      return clone(doc)
    },

    async unpublish({ id }) {
      await wait()
      requireSession()
      const doc = find(id)
      // Only the envelope moves, matching src/cms/server/documents.js. This used
      // to empty `data` into `draft`, which read as "the body must survive going
      // private" — it survives either way, because an editor reads `draft ?? data`
      // — and it made the stub disagree with the server about the one thing
      // discardDraft() depends on: after a withdrawal the last published body is
      // still there to go back to.
      doc.status = "draft"
      doc.publishedAt = null
      doc.updatedAt = now()
      persist()
      return clone(doc)
    },

    /**
     * Throw the draft away, matching src/cms/server/documents.js: `draft` is
     * cleared and `data`, `status` and `publishedAt` are not named. Both
     * refusals are here too, because a stub that accepted what the server
     * refuses would let a bug through in the one direction that matters.
     */
    async discardDraft({ id }) {
      await wait()
      requireSession()
      const doc = find(id)
      if (!doc.draft) throw new CmsError("conflict", "Dokument nemá rozpracovaný koncept.")
      if (!Object.keys(doc.data || {}).length) {
        throw new CmsError(
          "conflict",
          "Není k čemu se vrátit — tento dokument ještě nebyl publikovaný. Použijte archiv nebo smazání.",
        )
      }
      doc.draft = null
      doc.updatedAt = now()
      persist()
      return clone(doc)
    },

    /**
     * Archive and restore, matching src/cms/server/documents.js: `status`,
     * `data` and `draft` are all left exactly as they were, so a published
     * document restores straight back onto the site and a draft restores as a
     * draft. Only `archivedAt` moves.
     */
    async archive({ id }) {
      await wait()
      requireSession()
      const doc = find(id)
      if (doc.archivedAt) throw new CmsError("conflict", "Dokument je už v archivu.")
      doc.archivedAt = now()
      doc.updatedAt = now()
      persist()
      return clone(doc)
    },

    async restore({ id }) {
      await wait()
      requireSession()
      const doc = find(id)
      doc.archivedAt = null
      doc.updatedAt = now()
      persist()
      return clone(doc)
    },

    /**
     * Moderation's pair, matching src/cms/server/documents.js: a rejection is an
     * archive plus three stamps in `draft`, and it never deletes. `rejectedBy` is
     * the signed-in name because the real one takes it from the session — a stub
     * that let the caller supply it would be teaching the wrong contract.
     */
    async reject({ id, reason }) {
      await wait()
      const session = requireSession()
      if (!REJECTION_REASONS.some((entry) => entry.value === reason)) {
        throw new CmsError("invalid", "Neplatný důvod zamítnutí.")
      }
      const doc = find(id)
      if (doc.status === "published") {
        throw new CmsError("conflict", "Publikovanou recenzi nelze zamítnout — nejdřív ji stáhněte z webu.")
      }
      if (doc.archivedAt) throw new CmsError("conflict", "Recenze je už zamítnutá nebo v archivu.")

      const at = now()
      doc.draft = { ...clone(doc.draft ?? doc.data ?? {}), rejectedAt: at, rejectedBy: session?.name || session?.email || null, rejectedReason: reason }
      doc.archivedAt = at
      doc.updatedAt = at
      persist()
      return clone(doc)
    },

    async requeue({ id }) {
      await wait()
      requireSession()
      const doc = find(id)
      const body = clone(doc.draft ?? doc.data ?? {})
      for (const field of REJECTION_FIELDS) delete body[field]
      doc.draft = body
      doc.archivedAt = null
      doc.updatedAt = now()
      persist()
      return clone(doc)
    },

    media: {
      async upload(file, { alt } = {}) {
        await wait(320)
        requireSession()
        if (!file?.type?.startsWith("image/")) {
          throw new CmsError("invalid", "Nahrát lze jen obrázek.", { file: "Nepodporovaný formát" })
        }

        // Object URLs are enough for a dev session and keep base64 blobs out of
        // localStorage, which would blow the quota after two photos.
        const url = typeof URL !== "undefined" ? URL.createObjectURL(file) : ""
        const dimensions = await measure(url)
        const asset = {
          id: uid("asset"),
          url,
          width: dimensions.width,
          height: dimensions.height,
          mime: file.type,
          alt: alt || "",
          filename: file.name,
          size: file.size,
          createdAt: now(),
          ephemeral: true, // object URL, gone on reload — dev only
        }
        store.assets.unshift(asset)
        persist()
        return clone(asset)
      },

      /**
       * `archived` is the same tri-state the document listing uses and the real
       * media repository grew when removal became archival: `false` (the
       * default) is the library, `true` is what has left it, `"all"` is every
       * file that was ever in it — which is the Archive's Média subpage's whole
       * subject.
       */
      async list({ page = 1, perPage = 24, search, archived = false } = {}) {
        await wait(80)
        requireSession()
        const needle = (search || "").trim().toLowerCase()
        const rows = store.assets.filter(
          (asset) =>
            (archived === "all" || (archived ? asset.archivedAt : !asset.archivedAt)) &&
            (!needle ||
              asset.filename?.toLowerCase().includes(needle) ||
              asset.alt?.toLowerCase().includes(needle)),
        )
        const start = (page - 1) * perPage
        return { rows: clone(rows.slice(start, start + perPage)), total: rows.length }
      },

      async update(id, { alt }) {
        await wait(80)
        requireSession()
        const asset = store.assets.find((entry) => entry.id === id)
        if (!asset) throw new CmsError("not_found", "Soubor neexistuje.")
        asset.alt = alt
        persist()
        return clone(asset)
      },

      /**
       * Still called `remove`, and it ARCHIVES.
       *
       * The name is Contract 2's and the behaviour is server/media.js's: since
       * the Archive landed, nothing outside it destroys a file. This mock used
       * to splice the asset out of the array, which made it the one remaining
       * place in the codebase where a file could be destroyed without going
       * through the Archive — invisible today, because `NEXT_PUBLIC_CMS_DEV_PORT`
       * is off, and a nasty surprise the day somebody turns it on. A mock that
       * disagrees with the thing it stands in for is worse than no mock.
       *
       * Idempotent, like the real one: archiving an archived file is not an
       * error, it is a no-op with the original date kept.
       */
      async remove(id) {
        await wait()
        requireSession()
        const asset = store.assets.find((entry) => entry.id === id)
        if (!asset) throw new CmsError("not_found", "Soubor neexistuje.")
        asset.archivedAt = asset.archivedAt || now()
        persist()
        return clone(asset)
      },

      async restore(id) {
        await wait()
        requireSession()
        const asset = store.assets.find((entry) => entry.id === id)
        if (!asset) throw new CmsError("not_found", "Soubor neexistuje.")
        asset.archivedAt = null
        persist()
        return clone(asset)
      },
    },

    /**
     * The Archive is NOT mocked, and refuses rather than pretending.
     *
     * Everything it shows is `cms_document_revision` and `cms_media_archive`,
     * which are written by the server's four document transitions — a browser
     * mock has no transitions to record and no history to answer with. A stub
     * returning empty lists would make the Archive look like a feature that
     * works and holds nothing, which is the one impression a record must never
     * give. So each method says what is missing and why.
     *
     * `purge` is the important one: the only hard delete in the system must not
     * have a second implementation that skips the server's two refusals.
     */
    history: {
      async revisions() {
        throw new CmsError("server", ARCHIVE_UNAVAILABLE)
      },
      async revision() {
        throw new CmsError("server", ARCHIVE_UNAVAILABLE)
      },
      async media() {
        throw new CmsError("server", ARCHIVE_UNAVAILABLE)
      },
      async plan() {
        throw new CmsError("server", ARCHIVE_UNAVAILABLE)
      },
      async purge() {
        throw new CmsError("server", ARCHIVE_UNAVAILABLE)
      },
    },

    auth: {
      async user() {
        await wait(40)
        return clone(publicUser(currentUser()))
      },

      /**
       * Email and password. The failure is deliberately the same for an unknown
       * address and a wrong password — the real port spends a decoy scrypt hash
       * to make the two indistinguishable in time as well, and a stub that
       * cheerfully answered "no such user" would train the UI to show a message
       * production will never send.
       */
      async signIn(email, password) {
        await wait(500)
        const address = String(email || "").trim().toLowerCase()
        const entry = store.users.find((user) => user.email.toLowerCase() === address)

        if (!entry || entry.password !== String(password || "") || entry.disabledAt) {
          throw new CmsError("unauthorized", "Nesprávný e-mail nebo heslo.")
        }

        entry.lastLoginAt = now()
        store.sessionUserId = entry.id
        persist()
        return clone(publicUser(entry))
      },

      async signOut() {
        await wait(80)
        store.sessionUserId = null
        persist()
      },

      async changePassword({ currentPassword, newPassword }) {
        await wait(300)
        const user = requireSession()
        if (user.password !== String(currentPassword || "")) {
          throw new CmsError("invalid", "Současné heslo není správné.", { currentPassword: "Nesprávné heslo" })
        }
        if (String(newPassword || "").length < 10) {
          throw new CmsError("invalid", "Heslo musí mít alespoň 10 znaků.", { newPassword: "Příliš krátké" })
        }
        user.password = String(newPassword)
        persist()
      },

      users: {
        async list() {
          await wait(120)
          requireOwner()
          const rows = [...store.users].sort(
            (a, b) => b.role.localeCompare(a.role) || a.email.localeCompare(b.email, "cs"),
          )
          return { rows: rows.map(publicUser) }
        },

        async create({ email, name, role = "editor", password } = {}) {
          await wait(400)
          const actor = requireOwner()
          const address = String(email || "").trim().toLowerCase()

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
            throw new CmsError("invalid", "Zadejte platnou e-mailovou adresu.", { email: "Neplatný formát" })
          }
          if (store.users.some((user) => user.email.toLowerCase() === address)) {
            throw new CmsError("conflict", "Uživatel s touto adresou už existuje.")
          }
          if (password && String(password).length < 10) {
            throw new CmsError("invalid", "Heslo musí mít alespoň 10 znaků.", { password: "Příliš krátké" })
          }

          // The real port generates 18 random bytes server-side and returns the
          // plaintext exactly once. Same contract here.
          const generated = !password
          const secret = generated ? `dev-${Math.random().toString(36).slice(2, 14)}` : String(password)

          const entry = {
            id: uid("user"),
            email: address,
            name: String(name || "").trim(),
            role,
            password: secret,
            createdAt: now(),
            updatedAt: now(),
            lastLoginAt: null,
            disabledAt: null,
            createdBy: actor.id,
          }
          store.users.push(entry)
          persist()
          return { user: publicUser(entry), temporaryPassword: generated ? secret : null }
        },

        async updateRole({ id, role }) {
          await wait(200)
          requireOwner()
          const target = findUser(id)
          if (target.role === role) return clone(publicUser(target))
          if (role !== "owner") assertNotLastOwner(target)
          target.role = role
          target.updatedAt = now()
          persist()
          return clone(publicUser(target))
        },

        async setDisabled({ id, disabled }) {
          await wait(200)
          requireOwner()
          const target = findUser(id)
          if (disabled) assertNotLastOwner(target)
          target.disabledAt = disabled ? now() : null
          target.updatedAt = now()
          persist()
          return clone(publicUser(target))
        },

        async remove({ id }) {
          await wait(260)
          requireOwner()
          const target = findUser(id)
          assertNotLastOwner(target)
          store.users = store.users.filter((user) => user.id !== id)
          // Deleting your own account ends your own session, exactly as the
          // ON DELETE CASCADE on cms_session does.
          if (store.sessionUserId === id) store.sessionUserId = null
          persist()
        },
      },
    },

    /**
     * Settings has no stub, and refuses in words rather than throwing a
     * TypeError three frames deep.
     *
     * Everything the settings portal reports is a fact about the SERVER —
     * which environment variables are set, which persistence is live, which
     * sessions exist in cms_session, which API keys were issued. This port is
     * a browser stub with no server behind it, so an answer here would be an
     * invented one, and an invented answer on a screen whose whole purpose is
     * "tell me the real state of the system" is worse than no screen at all.
     */
    settings: notInDevPort([
      "status",
      "probe",
      "keys.list",
      "keys.create",
      "keys.revoke",
      "sessions.list",
      "sessions.revoke",
      "sessions.revokeAll",
      // The widget's appearance is the one setting that IS stored rather than
      // read off the environment, so a stub could in principle answer it. It
      // refuses with the rest anyway: the value it would hand back would live
      // only in this browser, and the screen would report a corner that the
      // public site — which reads the real endpoint — does not use.
      "widget.read",
      "widget.save",
    ]),

    /** Dev-only escape hatch used by the "reset data" control in the shell. */
    __reset() {
      const sessionUserId = store.sessionUserId
      store = hydrate()
      store.sessionUserId = sessionUserId
      persist()
    },
  }

  devPort = port
  return port
}

/**
 * Build a namespace of methods that all refuse with the same sentence, from a
 * list of dotted paths. One CmsError per call site so the Studio's normal
 * error surfaces (ErrorState, the toast) show a person what happened, which a
 * missing method would not.
 */
function notInDevPort(paths) {
  const root = {}
  for (const path of paths) {
    const segments = path.split(".")
    const name = segments.pop()
    const owner = segments.reduce((node, key) => (node[key] ??= {}), root)
    owner[name] = async () => {
      throw new CmsError(
        "server",
        "Nastavení není dostupné v dev portu — potřebuje server. Nastavte NEXT_PUBLIC_CMS_DEV_PORT=0.",
      )
    }
  }
  return root
}

function measure(url) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined" || !url) return resolve({ width: 0, height: 0 })
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = url
  })
}
