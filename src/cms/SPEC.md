# In-house CMS — system design

The contract three parallel builds share. Read this before writing anything.

## What this is

A content system owned by this repo, not a hosted product. Editors get one
place to write copy, manage partner logos and photos, edit consultants, and
**approve reviews**. Schemas are declared in config the way Sanity does it —
`defineType` / `defineField` — so adding a content type is a config change, not
a migration.

It lives as a module inside this project. Not a package, not a published
library. That may come later; nothing should assume it.

## Why it is shaped this way

**Documents are rows of JSONB, not a table per type.** `cms_document` holds
`{ id, type, data, draft, status, ... }`. Adding a content type touches no
database. This is the single decision that makes config-driven schemas possible
at all — a table-per-type design forces a migration for every field an editor
asks for.

**The Studio never imports a database client.** It receives a data port object
(below) through React context. That is what lets the persistence layer be
swapped, tested, or mocked, and it is what keeps service credentials out of the
browser bundle.

**Storage is behind an adapter.** MinIO was the ask. MinIO is a server process
and cannot run on Vercel, which is where this deploys — so the first
implementation is Supabase Storage (the project already has Supabase), written
against a `StoragePort` so MinIO, R2 or Vercel Blob can replace it later
without the Studio knowing. There are two drivers today:
`ports/supabaseStorage.js`, and `ports/fileStorage.js` which keeps bytes under
`.cms-dev/media/` and serves them from `/api/cms/asset/<key>`. Which one runs is
decided by `env.js storageDriver()` on the same `hasServiceRoleKey()` question
that decides the document store, and by nothing else.

## Repository facts that constrain the build

- **JavaScript, not TypeScript.** The project is `.js` / `.jsx` throughout.
- **Pages Router.** Next 16, `src/pages`. No App Router, no server components.
- **`scripts/sync-styles.js` globs every `.scss` and `.css` under `src/` and
  concatenates the non-module ones into the site's global stylesheet.** A plain
  `studio.scss` would ship the admin's CSS to every public visitor. Every
  stylesheet in the CMS must therefore be `*.module.scss`. This is checked by
  the glob at `scripts/sync-styles.js:47` and the exclusion at `:62`.
- React 19, framer-motion 12 available.
- Supabase project is live and holds real content: 13 consultants, 37 reviews.

## Security position

The anon key currently permits **read and write on every table**, verified by
probe. Reviews carry `ip_list` and `list_of_all_ips` — IP addresses, personal
data under GDPR, world-readable today. The CMS must not reproduce this:

- No key with write rights reaches the browser. Ever.
- Public review submission goes through `POST /api/cms/reviews` server-side.
- Studio mutations require an authenticated session; the server checks it.
- Migrated reviews drop the IP columns unless there is a stated lawful basis.

The site's own anon-key write helpers are gone (`src/hooks/supabaseClient.js`,
`useReviewForm.js`, `useFetchDatabase.js`, all deleted, all with zero
importers). A production build of this branch puts the anon key in 0 of 98
client chunks. That removed the caller, not the permission — and not the past:
the site deployed today still serves the key and the compiled hook in
`/_next/static/chunks/124-*.js`. The key keeps insert/update on the legacy
tables until `server/migrations/0004_legacy_lockdown.sql` is run by hand against
the live project, and should be rotated afterwards. That file is destructive and
waits for a human.

Note the default the CMS ships with: `cms_document.data` is granted whole to
anon for published rows, so a field added to a schema is public the moment it is
published. `consultant.data` carries telephone numbers and e-mail addresses on
that basis and is meant to. Anything that must not be public needs its own
column, not a corner of `data`.

## Layout

    src/cms/
      SPEC.md          this file
      core/            schema DSL, field types, validation      — build A
      studio/          the admin interface                       — build B
      server/          persistence, storage, API handlers        — build C
      schemas/         this project's content types              — build C
    src/pages/studio/[[...path]].jsx    mounts the Studio
    src/pages/api/cms/[...route].js     mounts the server handlers
    scripts/cms-migrate.js              Supabase -> CMS, dry-run by default

## Contract 1 — core API (build A owns; B and C consume)

```js
import { defineType, defineField, getType, listTypes,
         validateDocument, emptyDocument, FIELD_TYPES } from "@/cms/core";

defineType({
  name: "review",              // stable id, used as cms_document.type
  title: "Recenze",
  icon: "star",                // key into the Studio's icon set
  fields: [ /* defineField(...) */ ],
  preview: (doc) => ({ title, subtitle, media }),   // list rendering
  orderings: [{ name, title, by: [{ field, direction }] }],
})

defineField({
  name: "message",
  title: "Text recenze",
  type: "text",                // one of FIELD_TYPES
  validation: (rule) => rule.required().min(10).max(2000),
  options: { rows: 6 },        // type-specific
  group: "obsah",              // tab in the editor
  hidden: (doc) => false,
})
```

`FIELD_TYPES`: `string` `text` `richText` `number` `boolean` `date` `datetime`
`slug` `image` `file` `reference` `array` `object` `select` `url` `email`.

- `validateDocument(type, value)` → `{ ok, errors: [{ path, message }] }`,
  paths dotted with array indices: `"fields.0.title"`.
- `emptyDocument(type)` → a document body with every field at its zero value.
- Rules are chainable and pure; they never touch the network.

## Contract 2 — data port (build C implements; build B consumes)

One object, injected into the Studio. No other data access exists in the UI.

```js
{
  list({ type, search, filters, sort, page, perPage }) => { rows, total },
  get({ id }) => doc,
  create({ type, data }) => doc,
  update({ id, data }) => doc,          // full body; server diffs
  remove({ id }) => void,
  publish({ id }) => doc,               // draft -> published
  unpublish({ id }) => doc,             // off the site; both bodies kept
  discardDraft({ id }) => doc,          // draft -> null; the site does not move
  media: {
    upload(file, { alt }) => asset,     // { id, url, width, height, mime, alt }
    list({ page, perPage, search }) => { rows, total },
    update(id, { alt }) => asset,
    remove(id) => void,
  },
  auth: {
    user() => { id, email, name, role } | null,
    signIn(email, password) => user,       // see AUTH.md
    signOut() => void,
    changePassword({ currentPassword, newPassword }) => void,
    users: {                               // owner only; the server enforces it
      list() => { rows },
      create({ email, name, role, password? }) => { user, temporaryPassword },
      updateRole({ id, role }) => user,
      setDisabled({ id, disabled }) => user,
      remove({ id }) => void,
    },
  },
}
```

`auth` was a magic link in the first draft of this contract and is password auth
now — `src/cms/AUTH.md` is the design and the reasoning. `role` is `"owner"` or
`"editor"`; both edit content, only an owner manages users. The Studio uses
`role` to decide what to *offer*, never what to *permit* — every `auth.users`
call is re-checked server-side and answers `forbidden` regardless of what the UI
believed. `temporaryPassword` is non-null only when the server generated one and
appears in that one response only; nothing can retrieve it again.

Every method is async and throws `CmsError { code, message, fields? }` on
failure. `code` is one of `unauthorized` `forbidden` `not_found` `invalid`
`conflict` `server`.

## Contract 3 — document shape

```js
{
  id: "uuid",
  type: "review",
  status: "draft" | "published",
  data: { /* published body, shaped by the schema */ },
  draft: { /* unpublished edits, or null */ },
  createdAt, updatedAt, publishedAt,
  createdBy: "user id | null",
}
```

An editor always edits `draft ?? data`. Publishing copies `draft` into `data`,
clears `draft`, stamps `publishedAt`. The public site reads `data` only, and
only where `status = "published"`.

`draft` is non-null exactly when there is something the public has not seen. A
body identical to `data` is not stored as a draft (`update()` drops it) and an
existing one can be thrown away (`discardDraft()`), which is the way back out of
a draft that does not go through the one irreversible action in the system.
Discarding writes `draft` and nothing else — not `data`, not `status`, not
`published_at` — so it changes no page, writes no revision and regenerates
nothing, exactly like every other draft write.

## Content types this project needs

`siteCopy` (keyed blocks of page copy), `partner` (logo, name, order, local vs
financial), `consultant` (from `people`), `review` (from `reviews`, with
`approved`), `offer`, `qna`, `mediaAsset`.

## Ground rules

- Additive only. Do not modify existing site components, `src/pages/index.js`,
  or anything under `src/components/pages`.
- No new runtime dependency without saying why it is not reasonable to write.
- Never run the migration against live data. Dry-run prints a plan and exits.
- Comment the decisions, not the syntax; match the density of the surrounding
  codebase.
