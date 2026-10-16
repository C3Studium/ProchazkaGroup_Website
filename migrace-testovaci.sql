-- Schéma CMS pro TESTOVACÍ Supabase projekt — všech osm migrací najednou.
--
-- Vygenerováno z src/cms/server/migrations/. Není to zdroj pravdy: když se
-- některá migrace změní, vygeneruj tenhle soubor znovu, needituj ho.
--
-- POUŽITÍ: Supabase → SQL Editor → vložit celé → Run. Jeden běh.
--
-- 0004_legacy_lockdown.sql tu SCHVÁLNĚ NENÍ. Ta zavírá zápisové právo na
-- starých tabulkách ostrého projektu a na testovací nemá co dělat.
--
-- Migrace jsou psané idempotentně (`if not exists`, `or replace`), takže
-- opakované spuštění nic nerozbije. Všechna `begin` uvnitř jsou těla plpgsql
-- funkcí, ne transakce — proto se dají spojit do jednoho skriptu.


-- ========================================================================
-- 0001_cms_tables.sql
-- ========================================================================

-- CMS persistence layer — cms_document, cms_media, cms_editor.
--
-- Run once against the Supabase project (SQL editor, or psql with the
-- connection string from Project Settings -> Database). It is written to be
-- re-runnable: every object is created with IF NOT EXISTS or dropped first.
--
-- Posture: RLS is on for every table and the default is DENY. The anon key
-- currently has read+write on every legacy table in this project; nothing
-- here may reproduce that. Reads of PUBLISHED documents are public, and only
-- through a restricted column grant so `draft` and `created_by` are never
-- visible to anon. Everything else — drafts, writes, media mutations — needs
-- either an authenticated editor session or the service role, which only the
-- server holds.

create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid
create extension if not exists pg_trgm with schema extensions;    -- search index


-- ---------------------------------------------------------------------------
-- Editor allowlist
-- ---------------------------------------------------------------------------
-- Supabase Auth will happily mint a session for any email that asks for a
-- magic link. "Authenticated" is therefore not the same as "allowed to edit".
-- This table is the single source of truth for who is an editor; both the RLS
-- policies below and the API layer check it. It is deliberately unreadable by
-- anon and authenticated — only the service role (BYPASSRLS) touches it.

create table if not exists public.cms_editor (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.cms_editor enable row level security;
revoke all on public.cms_editor from anon, authenticated;
-- No policies at all: deny-by-default for every role except service_role.

-- SECURITY DEFINER so an editor's own session can test membership without
-- being able to read the allowlist itself. search_path is pinned so the
-- function cannot be hijacked by a shadowing schema.
create or replace function public.cms_is_editor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.cms_editor e
    where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.cms_is_editor() from public;
grant execute on function public.cms_is_editor() to authenticated;


-- ---------------------------------------------------------------------------
-- cms_document
-- ---------------------------------------------------------------------------
-- One row per document, body in JSONB. Adding a content type is a config
-- change in src/cms/schemas, never a migration — that is the whole point of
-- this shape.

create table if not exists public.cms_document (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  data          jsonb not null default '{}'::jsonb,
  draft         jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  updated_by    uuid references auth.users (id) on delete set null,

  -- Provenance of migrated rows. The pair is what makes scripts/cms-migrate.js
  -- idempotent: a second run finds the existing document instead of duplicating
  -- it. NULL for anything authored in the Studio.
  legacy_source text,
  legacy_id     text,

  -- Search target. `jsonb #>> '{}'` renders the whole body as text and is
  -- immutable, which a generated column requires. Draft text is included so
  -- editors can find their unpublished work.
  search_text   text generated always as (
    lower(coalesce(data #>> '{}', '') || ' ' || coalesce(draft #>> '{}', ''))
  ) stored,

  constraint cms_document_published_has_data
    check (status <> 'published' or published_at is not null)
);

create unique index if not exists cms_document_legacy_key
  on public.cms_document (legacy_source, legacy_id)
  where legacy_source is not null;

create index if not exists cms_document_type_status_idx
  on public.cms_document (type, status, updated_at desc);

create index if not exists cms_document_data_gin
  on public.cms_document using gin (data jsonb_path_ops);

create index if not exists cms_document_search_idx
  on public.cms_document using gin (search_text extensions.gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- cms_media
-- ---------------------------------------------------------------------------
-- Metadata mirror of whatever the StoragePort put in the bucket. The row is
-- the record of truth for alt text and dimensions; the bytes live in storage.
-- `bucket` is stored per-row rather than assumed so that a later MinIO/R2
-- migration can move assets a bucket at a time.

create table if not exists public.cms_media (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null,
  path       text not null,
  url        text not null,
  mime       text,
  size_bytes bigint,
  width      integer,
  height     integer,
  alt        text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,

  unique (bucket, path)
);

create index if not exists cms_media_created_at_idx
  on public.cms_media (created_at desc);


-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.cms_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cms_document_touch on public.cms_document;
create trigger cms_document_touch
  before update on public.cms_document
  for each row execute function public.cms_touch_updated_at();

drop trigger if exists cms_media_touch on public.cms_media;
create trigger cms_media_touch
  before update on public.cms_media
  for each row execute function public.cms_touch_updated_at();


-- ---------------------------------------------------------------------------
-- Grants — column-level, because RLS filters rows and cannot hide columns
-- ---------------------------------------------------------------------------
-- anon and authenticated get SELECT on the public column set only. `draft`,
-- `created_by`, `updated_by` and `legacy_*` are absent from the grant, so no
-- browser-held key can read unpublished edits or author ids no matter what
-- policy matches. Editors read drafts through /api/cms/*, which runs as
-- service_role and bypasses both grants and RLS.

alter table public.cms_document enable row level security;
alter table public.cms_media    enable row level security;

revoke all on public.cms_document from anon, authenticated;
revoke all on public.cms_media    from anon, authenticated;

grant select (id, type, data, status, published_at, created_at, updated_at)
  on public.cms_document to anon, authenticated;

grant select (id, bucket, path, url, mime, width, height, alt, created_at)
  on public.cms_media to anon, authenticated;

-- Write verbs exist for authenticated only, and every one of them is gated by
-- cms_is_editor() below. anon is granted no write verb at any point.
grant insert, update, delete on public.cms_document to authenticated;
grant insert, update, delete on public.cms_media    to authenticated;


-- ---------------------------------------------------------------------------
-- Policies — cms_document
-- ---------------------------------------------------------------------------

drop policy if exists cms_document_public_read   on public.cms_document;
drop policy if exists cms_document_editor_read   on public.cms_document;
drop policy if exists cms_document_editor_insert on public.cms_document;
drop policy if exists cms_document_editor_update on public.cms_document;
drop policy if exists cms_document_editor_delete on public.cms_document;

-- The one public read. Published rows, public columns, no session needed.
create policy cms_document_public_read
  on public.cms_document
  for select
  to anon, authenticated
  using (status = 'published');

create policy cms_document_editor_read
  on public.cms_document
  for select
  to authenticated
  using (public.cms_is_editor());

create policy cms_document_editor_insert
  on public.cms_document
  for insert
  to authenticated
  with check (public.cms_is_editor());

create policy cms_document_editor_update
  on public.cms_document
  for update
  to authenticated
  using (public.cms_is_editor())
  with check (public.cms_is_editor());

create policy cms_document_editor_delete
  on public.cms_document
  for delete
  to authenticated
  using (public.cms_is_editor());


-- ---------------------------------------------------------------------------
-- Policies — cms_media
-- ---------------------------------------------------------------------------
-- Media rows are readable by anyone: a published document referencing an
-- asset needs its url, dimensions and alt text to render. Mutations are
-- editor-only.

drop policy if exists cms_media_public_read   on public.cms_media;
drop policy if exists cms_media_editor_insert on public.cms_media;
drop policy if exists cms_media_editor_update on public.cms_media;
drop policy if exists cms_media_editor_delete on public.cms_media;

create policy cms_media_public_read
  on public.cms_media
  for select
  to anon, authenticated
  using (true);

create policy cms_media_editor_insert
  on public.cms_media
  for insert
  to authenticated
  with check (public.cms_is_editor());

create policy cms_media_editor_update
  on public.cms_media
  for update
  to authenticated
  using (public.cms_is_editor())
  with check (public.cms_is_editor());

create policy cms_media_editor_delete
  on public.cms_media
  for delete
  to authenticated
  using (public.cms_is_editor());


-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
-- Public-read bucket so <Image src> works without signing every URL. Writes
-- are editor-gated at the storage layer too, not only in the API — the anon
-- key must not be able to upload even if a handler is ever misrouted.
--
-- CMS_MEDIA_BUCKET must match this id.

insert into storage.buckets (id, name, public)
values ('cms-media', 'cms-media', true)
on conflict (id) do nothing;

drop policy if exists cms_storage_public_read   on storage.objects;
drop policy if exists cms_storage_editor_insert on storage.objects;
drop policy if exists cms_storage_editor_update on storage.objects;
drop policy if exists cms_storage_editor_delete on storage.objects;

create policy cms_storage_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'cms-media');

create policy cms_storage_editor_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'cms-media' and public.cms_is_editor());

create policy cms_storage_editor_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'cms-media' and public.cms_is_editor())
  with check (bucket_id = 'cms-media' and public.cms_is_editor());

create policy cms_storage_editor_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'cms-media' and public.cms_is_editor());


-- ---------------------------------------------------------------------------
-- Grant the first editor
-- ---------------------------------------------------------------------------
-- Nobody can edit until a row exists here. Run this yourself with the real
-- address; it is left commented because an email is a value this build has no
-- authority to invent.
--
--   insert into public.cms_editor (email, name)
--   values ('someone@example.com', 'Jméno')
--   on conflict (email) do nothing;


-- ========================================================================
-- 0002_cms_auth.sql
-- ========================================================================

-- CMS authentication — cms_user, cms_session, and the end of the magic-link
-- allowlist. See src/cms/AUTH.md for the design this implements.
--
-- Run after 0001_cms_tables.sql (Supabase SQL editor, or psql with the
-- connection string from Project Settings -> Database). Re-runnable: every
-- object is created with IF NOT EXISTS, replaced, or dropped first.
--
-- Posture, in one sentence: no browser-held key may touch either table. Not
-- "policies restrict it" — the grants are revoked outright and no policy is
-- ever created, so anon and authenticated are denied by the privilege system
-- before RLS is even consulted. A password hash that anon can select is a
-- password hash that will be cracked offline at leisure.
--
-- What this migration therefore also does: it takes the write verbs away from
-- `authenticated` on cms_document and cms_media. Those grants existed so a
-- magic-link session could write through PostgREST; there is no such session
-- any more. Every write now arrives as service_role from behind /api/cms/*.
-- The one thing that stays open is the public read of PUBLISHED documents on
-- the public column set — the site's own pages depend on it.

create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid
create extension if not exists citext   with schema extensions;   -- case-insensitive email


-- ---------------------------------------------------------------------------
-- cms_user
-- ---------------------------------------------------------------------------
-- The only account table this system has. Supabase Auth is no longer involved:
-- a Supabase session proved that an address receives mail, which is not the
-- question anyone was asking, and it forced a second allowlist table to answer
-- the real one. One table, one source of truth.
--
-- `email` is citext so "Jan@…" and "jan@…" cannot both exist. The server also
-- lowercases before every read and write, so uniqueness does not depend on the
-- extensions schema being on the caller's search_path.
--
-- `created_by` is self-referential: it records the owner who invited an editor.
-- ON DELETE SET NULL rather than CASCADE — removing the person who did the
-- inviting must not remove the people they invited.

create table if not exists public.cms_user (
  id            uuid primary key default gen_random_uuid(),
  email         extensions.citext not null unique,
  password_hash text not null,
  name          text not null default '',
  role          text not null default 'editor' check (role in ('owner', 'editor')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz,
  disabled_at   timestamptz,
  created_by    uuid references public.cms_user (id) on delete set null,

  -- The stored format is scrypt$N$r$p$salt$hash (src/cms/server/password.js).
  -- The check is not cryptography, it is a tripwire: a bug that ever wrote a
  -- plaintext password into this column fails loudly instead of silently.
  constraint cms_user_password_hash_format
    check (password_hash ~ '^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$')
);

create index if not exists cms_user_role_idx on public.cms_user (role) where disabled_at is null;


-- ---------------------------------------------------------------------------
-- cms_session
-- ---------------------------------------------------------------------------
-- Sessions are stored rather than stateless because removing a user has to end
-- their access immediately, and a self-contained JWT cannot be withdrawn before
-- it expires.
--
-- THE TOKEN IS NOT IN THIS TABLE. `token_hash` is a SHA-256 of it, and the
-- check constraint below is what makes that a guarantee rather than a habit:
-- 64 lowercase hex characters is the shape of a SHA-256 digest and is not the
-- shape of the base64url token the browser holds. A leaked session table is
-- therefore not a set of working credentials.

create table if not exists public.cms_session (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.cms_user (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  ip_hash    text,

  constraint cms_session_token_hash_is_digest
    check (token_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists cms_session_user_idx on public.cms_session (user_id);

-- Expired rows are dead weight; this index makes the sweep cheap.
create index if not exists cms_session_expires_idx on public.cms_session (expires_at);


-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
-- Re-declared rather than assumed from 0001 so this file can be read on its own.
-- The body is identical, so replacing it is a no-op for the existing triggers.

create or replace function public.cms_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cms_user_touch on public.cms_user;
create trigger cms_user_touch
  before update on public.cms_user
  for each row execute function public.cms_touch_updated_at();


-- ---------------------------------------------------------------------------
-- The system must not be able to lock itself out
-- ---------------------------------------------------------------------------
-- An owner cannot demote, disable or delete themselves while they are the only
-- one. AUTH.md puts this rule on the server, and the server does enforce it
-- with a clear error message — but "there is always an owner" is an invariant
-- of the data, not of one code path, so it is also a constraint here. Any
-- future script, migration or console session gets the same answer.
--
-- DEFERRABLE INITIALLY DEFERRED so a transaction that promotes a new owner and
-- demotes the old one succeeds regardless of statement order; only the state at
-- commit is judged.

create or replace function public.cms_guard_last_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.cms_user
    where role = 'owner' and disabled_at is null
  ) then
    raise exception 'cms_user: the last active owner cannot be demoted, disabled or deleted'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists cms_user_last_owner_guard on public.cms_user;
create constraint trigger cms_user_last_owner_guard
  after update or delete on public.cms_user
  deferrable initially deferred
  for each row execute function public.cms_guard_last_owner();


-- ---------------------------------------------------------------------------
-- Bootstrap — a seed, not a back door
-- ---------------------------------------------------------------------------
-- CMS_ADMIN_EMAIL / CMS_ADMIN_PASSWORD create the first owner and nothing else.
-- The environment value is hashed by the server and thrown away; it is never
-- stored, never logged, and never compared against anything.
--
-- `where not exists (select 1 from cms_user)` is the whole of the "not a back
-- door" guarantee, and it is here rather than in JavaScript for two reasons.
-- It is atomic — the test and the insert cannot be interleaved by a second
-- request — and it is unconditional: once any account exists, this function
-- returns zero rows forever, so leaving the variables set in Vercel grants
-- nothing and rotating them grants nothing. Changing the password in the admin
-- cannot be undone from the environment.
--
-- Returns the created row, or no rows when it was inert. The server tells those
-- two apart and logs only the first.

create or replace function public.cms_bootstrap_owner(
  p_email         text,
  p_password_hash text,
  p_name          text
)
returns table (id uuid, email text, role text)
language sql
volatile
set search_path = public, extensions, pg_temp
as $$
  insert into public.cms_user (email, password_hash, name, role)
  select lower(p_email)::extensions.citext,
         p_password_hash,
         coalesce(nullif(btrim(p_name), ''), split_part(lower(p_email), '@', 1)),
         'owner'
  where not exists (select 1 from public.cms_user)
  returning cms_user.id, cms_user.email::text, cms_user.role;
$$;


-- ---------------------------------------------------------------------------
-- Session resolution
-- ---------------------------------------------------------------------------
-- One function so that "this session is usable" has one definition. Four
-- conditions, all of them data: the digest matches, the session was not
-- revoked, it has not expired, and the account behind it is not disabled.
--
-- The last one is why this is a function and not four `if` statements in
-- JavaScript. "Disabling a user ends their access immediately" is the reason
-- sessions are stored at all; the check belongs where it cannot be forgotten
-- by the next caller.

create or replace function public.cms_resolve_session(p_token_hash text)
returns table (
  session_id uuid,
  user_id    uuid,
  email      text,
  name       text,
  role       text,
  expires_at timestamptz
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select s.id, u.id, u.email::text, u.name, u.role, s.expires_at
  from public.cms_session s
  join public.cms_user u on u.id = s.user_id
  where s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and u.disabled_at is null;
$$;


-- ---------------------------------------------------------------------------
-- Grants — cms_user, cms_session
-- ---------------------------------------------------------------------------
-- RLS is enabled and NO POLICY IS CREATED. That alone denies anon and
-- authenticated, but Supabase grants privileges on new public tables to both
-- roles by default, and a privilege that exists is a privilege that one
-- mistaken policy turns into a leak. So the grants go too.

alter table public.cms_user    enable row level security;
alter table public.cms_session enable row level security;

revoke all on public.cms_user    from public, anon, authenticated;
revoke all on public.cms_session from public, anon, authenticated;

grant all on public.cms_user    to service_role;
grant all on public.cms_session to service_role;

-- Functions are EXECUTE-to-PUBLIC by default, which would let any browser key
-- call cms_resolve_session() and confirm a digest, or call the bootstrap.
revoke all on function public.cms_bootstrap_owner(text, text, text) from public, anon, authenticated;
revoke all on function public.cms_resolve_session(text)             from public, anon, authenticated;
revoke all on function public.cms_guard_last_owner()                from public, anon, authenticated;

grant execute on function public.cms_bootstrap_owner(text, text, text) to service_role;
grant execute on function public.cms_resolve_session(text)             to service_role;


-- ---------------------------------------------------------------------------
-- Retire the allowlist
-- ---------------------------------------------------------------------------
-- Every policy that called cms_is_editor() goes first, then the function, then
-- the table. Dropped in that order rather than with CASCADE so that a policy
-- this migration did not expect to find causes a visible failure instead of
-- being silently removed.

drop policy if exists cms_document_editor_read   on public.cms_document;
drop policy if exists cms_document_editor_insert on public.cms_document;
drop policy if exists cms_document_editor_update on public.cms_document;
drop policy if exists cms_document_editor_delete on public.cms_document;

drop policy if exists cms_media_editor_insert on public.cms_media;
drop policy if exists cms_media_editor_update on public.cms_media;
drop policy if exists cms_media_editor_delete on public.cms_media;

drop policy if exists cms_storage_editor_insert on storage.objects;
drop policy if exists cms_storage_editor_update on storage.objects;
drop policy if exists cms_storage_editor_delete on storage.objects;

drop function if exists public.cms_is_editor();
drop table    if exists public.cms_editor;


-- ---------------------------------------------------------------------------
-- Authorship now points at cms_user
-- ---------------------------------------------------------------------------
-- created_by/updated_by referenced auth.users. The ids the server writes are
-- cms_user ids now, so without this every create would fail on a foreign key.
--
-- The UPDATE below is a no-op on any project where this runs in order — the CMS
-- tables have never held a row authored by a Supabase user. It exists so that
-- re-running the file, or running it on a project that did briefly use the
-- magic-link build, cannot fail on an orphaned reference. An author id that
-- names a deleted account is worth nothing; NULL says the same thing honestly.

update public.cms_document set created_by = null
  where created_by is not null
    and not exists (select 1 from public.cms_user u where u.id = cms_document.created_by);
update public.cms_document set updated_by = null
  where updated_by is not null
    and not exists (select 1 from public.cms_user u where u.id = cms_document.updated_by);
update public.cms_media set created_by = null
  where created_by is not null
    and not exists (select 1 from public.cms_user u where u.id = cms_media.created_by);

alter table public.cms_document drop constraint if exists cms_document_created_by_fkey;
alter table public.cms_document drop constraint if exists cms_document_updated_by_fkey;
alter table public.cms_media    drop constraint if exists cms_media_created_by_fkey;

alter table public.cms_document add constraint cms_document_created_by_fkey
  foreign key (created_by) references public.cms_user (id) on delete set null;
alter table public.cms_document add constraint cms_document_updated_by_fkey
  foreign key (updated_by) references public.cms_user (id) on delete set null;
alter table public.cms_media add constraint cms_media_created_by_fkey
  foreign key (created_by) references public.cms_user (id) on delete set null;


-- ---------------------------------------------------------------------------
-- Policies — cms_document, cms_media, storage
-- ---------------------------------------------------------------------------
-- What is left after the editor policies are gone: one public read of published
-- documents on the public column set, one public read of media rows, one public
-- read of the media bucket. Everything else is service_role, which bypasses RLS
-- and only exists behind /api/cms/*.
--
-- The write grants to `authenticated` go with the policies. Leaving a grant in
-- place with no policy to satisfy is a trap for whoever adds the next policy.

revoke insert, update, delete on public.cms_document from authenticated;
revoke insert, update, delete on public.cms_media    from authenticated;

-- Re-asserted from 0001 so this file describes the finished state rather than a
-- diff against it. Column-level, because RLS filters rows and cannot hide
-- columns: `draft`, `created_by`, `updated_by` and `legacy_*` are absent, so no
-- browser key reads unpublished edits or author ids whatever policy matches.
grant select (id, type, data, status, published_at, created_at, updated_at)
  on public.cms_document to anon, authenticated;
grant select (id, bucket, path, url, mime, width, height, alt, created_at)
  on public.cms_media to anon, authenticated;

drop policy if exists cms_document_public_read on public.cms_document;
create policy cms_document_public_read
  on public.cms_document
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists cms_media_public_read on public.cms_media;
create policy cms_media_public_read
  on public.cms_media
  for select
  to anon, authenticated
  using (true);

drop policy if exists cms_storage_public_read on storage.objects;
create policy cms_storage_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'cms-media');


-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------
-- Sessions expire; the rows do not remove themselves. Called opportunistically
-- by the server on sign-in, which is often enough for a table that grows by one
-- row per login. Revoked rows are kept for 30 days so "who was signed in when"
-- survives an incident.

create or replace function public.cms_prune_sessions()
returns integer
language sql
volatile
set search_path = public, pg_temp
as $$
  with gone as (
    delete from public.cms_session
    where expires_at < now() - interval '7 days'
       or (revoked_at is not null and revoked_at < now() - interval '30 days')
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.cms_prune_sessions() from public, anon, authenticated;
grant execute on function public.cms_prune_sessions() to service_role;


-- ---------------------------------------------------------------------------
-- The first owner
-- ---------------------------------------------------------------------------
-- Nothing to run by hand. Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD and sign
-- in; the first sign-in attempt seeds the owner and then the pair is inert
-- forever. Change the password in the admin afterwards — the environment copy
-- stops meaning anything the moment the row exists, so it is only ever as good
-- as the first login.
--
-- Recovery, if a project ever ends up with accounts but no usable owner. The
-- constraint trigger above makes that unreachable through the application, so
-- getting there takes direct SQL, and getting out takes direct SQL too — the
-- environment pair deliberately will not do it, because a seed that reactivates
-- whenever the owner list looks wrong is exactly the back door AUTH.md rules
-- out. Promote someone who already exists:
--
--   update public.cms_user set role = 'owner', disabled_at = null
--   where email = 'someone@prochazkagroup.cz';
--
-- Or empty the table and let the seed run again on the next sign-in:
--
--   alter table public.cms_user disable trigger cms_user_last_owner_guard;
--   delete from public.cms_user;
--   alter table public.cms_user enable trigger cms_user_last_owner_guard;


-- ========================================================================
-- 0003_cms_document_archive.sql
-- ========================================================================

-- Archiving — cms_document.archived_at.
--
-- Run after 0002_cms_auth.sql (Supabase SQL editor, or psql with the connection
-- string from Project Settings -> Database). Re-runnable: the column is added
-- with IF NOT EXISTS, the index likewise, and the policy is dropped before it is
-- created.
--
-- ---------------------------------------------------------------------------
-- Why a column and not a third `status`
-- ---------------------------------------------------------------------------
-- Contract 3 fixes `status` at 'draft' | 'published'. Three things key off that
-- pair: the public read path (src/cms/server/site/read.js), the RLS policy
-- below, and the anon column grant. Adding 'archived' would have to change all
-- three, and it would still be the wrong shape — it would make "archived" and
-- "never published" the same fact at the database level, so restoring a person
-- could not tell whether to put them back on the site or back in the drafts.
--
-- `archived_at` is orthogonal to `status` instead. A document keeps the publish
-- state it had, gains a filing date, and loses it again on restore. It is also
-- not consultant-specific: nothing below names a type, so every content type
-- gets archiving from this one migration.
--
-- ---------------------------------------------------------------------------
-- Where the rule is enforced
-- ---------------------------------------------------------------------------
-- In the policy, not only in the query. The site's read path does filter
-- `archived_at is null` itself, but that filter is a line of JavaScript someone
-- can drop; the policy is the thing that makes an archived consultant
-- unreachable with the anon key no matter what the read path asks for. Same
-- reasoning as `status = 'published'` in 0001: the database is the enforcement
-- and the query is the optimisation.

-- ---------------------------------------------------------------------------
-- The column
-- ---------------------------------------------------------------------------
-- NULL means "not archived". A timestamp rather than a boolean because "when
-- was this person taken off the site" is the question an editor actually asks
-- six months later, and a boolean cannot answer it.

alter table public.cms_document
  add column if not exists archived_at timestamptz;

-- The public read is `status = 'published' and archived_at is null`, so the
-- index is partial on exactly that predicate. Postgres can only use a partial
-- index for a query it can prove is covered by the WHERE clause, which is why
-- this repeats the policy rather than indexing the column on its own.
create index if not exists cms_document_live_idx
  on public.cms_document (type, updated_at desc)
  where status = 'published' and archived_at is null;

-- The Studio's archive view is the opposite query and is not covered by the
-- index above.
create index if not exists cms_document_archived_idx
  on public.cms_document (type, archived_at desc)
  where archived_at is not null;


-- ---------------------------------------------------------------------------
-- Grant
-- ---------------------------------------------------------------------------
-- Column-level grants are absolute: a column absent from the grant cannot be
-- selected AND cannot be named in a WHERE clause, so without this line the
-- site's own `archived_at=is.null` filter fails with a permission error rather
-- than filtering.
--
-- Granting it leaks nothing. The policy below denies anon every row where
-- `archived_at` is not null, so the only value anon can ever read from this
-- column is NULL — the grant lets the filter be written, not the data be seen.
--
-- Re-stated in full rather than as a diff so this file describes the finished
-- column set. `draft`, `created_by`, `updated_by` and `legacy_*` are still
-- absent, deliberately.

grant select (id, type, data, status, published_at, created_at, updated_at, archived_at)
  on public.cms_document to anon, authenticated;


-- ---------------------------------------------------------------------------
-- Policy
-- ---------------------------------------------------------------------------
-- The one public read, narrowed. Everything else on this table is service_role,
-- which bypasses RLS and lives only behind /api/cms/*, so the Studio keeps
-- seeing archived documents while the public site cannot.

drop policy if exists cms_document_public_read on public.cms_document;
create policy cms_document_public_read
  on public.cms_document
  for select
  to anon, authenticated
  using (status = 'published' and archived_at is null);


-- ---------------------------------------------------------------------------
-- Restore is not a re-publish
-- ---------------------------------------------------------------------------
-- 0001 carries `cms_document_published_has_data`: published rows must have a
-- published_at. Archiving does not touch either column, so an archived document
-- that was live goes straight back to live on restore, and one that was a draft
-- goes back to being a draft. That is the property the split into two columns
-- was for, and it is asserted here so a future migration that "simplifies"
-- archiving into `status` fails this file instead of silently unpublishing
-- everyone's archive.
do $$
begin
  if exists (
    select 1
    from information_schema.check_constraints
    where constraint_schema = 'public'
      and constraint_name = 'cms_document_published_has_data'
  ) then
    return;
  end if;
  raise exception 'cms_document_published_has_data is missing — run 0001_cms_tables.sql first';
end
$$;


-- ========================================================================
-- 0005_cms_api_key.sql
-- ========================================================================

-- API keys the CMS issues — cms_api_key.
--
-- Run after 0002_cms_auth.sql (Supabase SQL editor, or psql with the connection
-- string from Project Settings -> Database). Re-runnable: every object is
-- created with IF NOT EXISTS or replaced.
--
-- Numbered 0005 rather than 0004 on purpose: 0004 is being written in parallel
-- to close the legacy-table grants the audit found. Two migrations claiming one
-- number is a merge conflict in the one place a merge conflict must not be
-- resolved by guessing.
--
-- The table exists so an outside system can READ this site's published content
-- without a person's session behind it. What it is not is a second way in:
-- src/cms/server/handlers/content.js is the only route that accepts a key, and
-- the port it constructs (src/cms/server/contentApi.js) has two read methods on
-- it. Nothing here grants a key anything; the grant is the shape of that port.
--
-- Posture is cms_session's, unchanged and for the same reason: the table holds
-- a SHA-256 of the token and never the token, and no browser-held key may touch
-- it at all — `revoke all ... from anon, authenticated`, with no policy ever
-- created, so the privilege system denies it before RLS is consulted. A leaked
-- key table must be a list of digests, not a set of working credentials.

create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid


-- ---------------------------------------------------------------------------
-- cms_api_key
-- ---------------------------------------------------------------------------
-- `name` is what an owner recognises the key by in the Studio; it is required,
-- because "which system is this one for" is the question asked at revocation
-- time and an unnamed key cannot answer it.
--
-- There is deliberately NO column holding a prefix or the first characters of
-- the token. A prefix is a real usability feature elsewhere and it is not worth
-- it here: the promise this table makes is that it stores a digest and nothing
-- else, and a promise with an exception in it is harder to verify than one
-- without. Keys are told apart by their name.
--
-- `created_by` is ON DELETE SET NULL, like cms_user.created_by: an integration
-- must not stop working because the owner who set it up left the company.
--
-- `revoked_at` rather than a delete, so the list can still say a key existed
-- and was turned off, and so revocation has something to refuse rather than a
-- row that is simply absent.

create table if not exists public.cms_api_key (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) between 1 and 60),
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.cms_user (id) on delete set null,
  last_used_at timestamptz,
  revoked_at   timestamptz,

  -- The same tripwire as cms_session_token_hash_is_digest: a SHA-256 is 64 hex
  -- characters and an issued token is not, so a bug that ever wrote the real
  -- token into this column fails on insert instead of silently working.
  constraint cms_api_key_token_hash_is_digest
    check (token_hash ~ '^[a-f0-9]{64}$')
);

-- The lookup every content request makes: digest -> key, live ones only.
create index if not exists cms_api_key_live_idx
  on public.cms_api_key (token_hash) where revoked_at is null;


-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Identical to cms_user and cms_session. RLS is enabled and no policy is
-- created, which is belt and braces: the revoke already denies anon and
-- authenticated, and an enabled-with-no-policy table denies them again if some
-- future migration hands out a table-level grant by accident.

alter table public.cms_api_key enable row level security;

revoke all on public.cms_api_key from public, anon, authenticated;
grant all  on public.cms_api_key to service_role;


-- ========================================================================
-- 0006_cms_setting.sql
-- ========================================================================

-- Stored configuration — cms_setting.
--
-- Run after 0005_cms_api_key.sql (Supabase SQL editor, or psql with the
-- connection string from Project Settings -> Database). Re-runnable: every
-- object is created with IF NOT EXISTS.
--
-- Until now "settings" in this system meant environment variables, and
-- src/cms/server/settings.js reports them without ever returning one. That file
-- answers "what is this deployment configured to do". This table answers a
-- different question — "what has an owner chosen" — and the two are kept apart
-- deliberately: an environment variable is set by whoever deploys, cannot be
-- changed from a browser, and takes a redeploy to move; a row here is changed
-- by an owner from /studio/settings and takes effect on the next request.
--
-- One row per key, the value as jsonb. A key/value table rather than a column
-- per setting because the alternative is a migration every time somebody wants
-- a corner moved, and because the shape of each value is already validated in
-- JavaScript by the module that owns it (src/cms/server/manageWidget.js) —
-- restating it as SQL columns would create a second definition that drifts.
--
-- NOTHING SECRET GOES IN THIS TABLE. Not an API token, not a password, not a
-- webhook URL with a key in it. Values here are read by an endpoint that does
-- not require a session (handlers/widget.js explains why a corner and a colour
-- do not), so a secret stored here is a secret published. If a future setting
-- needs a secret, it needs its own table and its own owner-only read path.

create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid


-- ---------------------------------------------------------------------------
-- cms_setting
-- ---------------------------------------------------------------------------
-- `key` is the primary key and is a stable dotted/underscored identifier the
-- code writes literally, never something a user types. `value` is jsonb rather
-- than text so a malformed write fails at the database rather than at the first
-- JSON.parse three requests later.
--
-- `updated_by` is ON DELETE SET NULL, like cms_api_key.created_by: a setting
-- must not be reset because the person who chose it left.

create table if not exists public.cms_setting (
  key        text primary key check (key ~ '^[a-z][a-z0-9_.]{0,63}$'),
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.cms_user (id) on delete set null
);

create or replace function public.cms_setting_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cms_setting_touch on public.cms_setting;
create trigger cms_setting_touch
  before update on public.cms_setting
  for each row execute function public.cms_setting_touch();


-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Identical to cms_user, cms_session and cms_api_key, and for the same reason
-- even though the values are not secret: the ONE path that reads this table is
-- src/cms/server, through the service-role client, so a browser-held anon key
-- has no business touching it. Making it anon-readable would be a second read
-- path with its own policy to keep in step — and a policy is what would have to
-- be right the day somebody stores something here that should not be public.
--
-- RLS is enabled with no policy created: belt and braces behind the revoke.

alter table public.cms_setting enable row level security;

revoke all on public.cms_setting from public, anon, authenticated;
grant all  on public.cms_setting to service_role;


-- ========================================================================
-- 0007_cms_archive.sql
-- ========================================================================

-- The content archive, layers 1 and 4 — cms_document_revision, cms_media_archive.
--
-- Run after 0006_cms_setting.sql (Supabase SQL editor, or psql with the
-- connection string from Project Settings -> Database). Re-runnable: every
-- object is created with IF NOT EXISTS or dropped before it is created.
--
-- Numbered 0007. 0004 and 0006 already exist, so this is the next free number
-- rather than the next number after the last one anybody remembers.
--
-- ---------------------------------------------------------------------------
-- Why now, and what is being lost while this is not run
-- ---------------------------------------------------------------------------
-- src/cms/server/documents.js `publish()` writes `data` in place. Every publish
-- therefore destroys the body the previous publish put there, and no amount of
-- later work can bring one back: there is nowhere it was written down. This
-- file is the place it starts being written down, which means the archive's
-- history begins on the day this migration runs and contains nothing from
-- before it. That is a property of the situation, not of the design, and it is
-- the reason src/cms/ARCHIVE.md puts revisions first in the order of work.
--
-- ---------------------------------------------------------------------------
-- One row per transition, not per edit
-- ---------------------------------------------------------------------------
-- The four transitions that change what a visitor sees — publish, unpublish,
-- archive, restore — are one choke point in handlers/documents.js, the same
-- place on-demand revalidation hooks into. A draft write (PUT /documents/:id,
-- PATCH /documents/:id/field) changes `draft` and nothing public, so it writes
-- no row here: an archive that recorded keystrokes would be a different, larger
-- and less useful thing than one that records what the site said.
--
-- Volume grows with the number of transitions, not with the size of the site.
-- One publish is one body, not 125.
--
-- ---------------------------------------------------------------------------
-- No foreign key from the revision to the document
-- ---------------------------------------------------------------------------
-- `document_id` is a plain uuid. Both available foreign keys are wrong here:
--
--   on delete cascade   deleting a document would destroy its history, silently
--                       and automatically. ARCHIVE.md's settled position is
--                       that nothing is ever deleted automatically and that all
--                       destruction lives in the Archive screen, deliberate and
--                       confirmed. A cascade is exactly the automatic deletion
--                       that position rules out.
--   on delete restrict  a document that has ever been published could then
--                       never be deleted at all, which turns "we keep history"
--                       into "you may not tidy up".
--
-- So the revision outlives the row it describes, and carries `type` itself so
-- the archive can still say what the thing was after the document is gone.
--
-- `changed_by` does have a foreign key, `on delete set null`, matching
-- cms_api_key.created_by and cms_setting.updated_by: history must not be
-- destroyed because the person who made it left, and an orphaned uuid is worse
-- than a null because it looks like an answer.

create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid


-- ---------------------------------------------------------------------------
-- cms_document_revision
-- ---------------------------------------------------------------------------
-- `body` is the document's published body AFTER the transition, and `status` /
-- `archived_at` are the state it left the document in. That combination is what
-- makes layer 2 — "what was published at time T" — a query rather than a stored
-- snapshot: for each document, the last revision with changed_at <= T, kept if
-- `status = 'published' and archived_at is null`.
--
-- `reason` is the transition's name, constrained to the four. It is not free
-- text: a note field would collect prose and stop being answerable, and the one
-- question this column has to answer — "was this taken down or filed away" — is
-- a question about which transition ran.
--
-- `build_id` is the identity of the code that was deployed when the transition
-- happened (src/cms/server/buildId.js). It is what lets the Archive say
-- "content from 3 March, replayed by today's code; the code then was abc1234"
-- instead of the false "this is how the site looked". Nullable, because a
-- deployment that cannot name itself must still record the content.

create table if not exists public.cms_document_revision (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  type        text not null,
  body        jsonb not null default '{}'::jsonb,
  status      text not null check (status in ('draft', 'published')),
  archived_at timestamptz,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references public.cms_user (id) on delete set null,
  reason      text not null check (reason in ('publish', 'unpublish', 'archive', 'restore')),
  build_id    text
);

-- The timeline of one document, and the "as of T" lookup, are the same index:
-- both walk backwards from an instant within one document_id.
create index if not exists cms_document_revision_document_idx
  on public.cms_document_revision (document_id, changed_at desc);

-- The Archive's Změny subpage: every transition, newest first, across the site.
create index if not exists cms_document_revision_changed_idx
  on public.cms_document_revision (changed_at desc);

-- Layer 2 replays one content type at a time (`reviews` with its own limit,
-- consultants for the dynamic routes), and only published revisions can be
-- shown. Partial on exactly that predicate, for the same reason 0003's live
-- index is partial: Postgres uses a partial index only for a query it can prove
-- the WHERE clause covers.
create index if not exists cms_document_revision_published_idx
  on public.cms_document_revision (type, changed_at desc)
  where status = 'published' and archived_at is null;


-- ---------------------------------------------------------------------------
-- cms_media.archived_at
-- ---------------------------------------------------------------------------
-- media.js `remove()` deleted the row and then the object. An editor tidying
-- the library therefore destroyed history — every revision pointing at that
-- file became a revision pointing at nothing — with no error and no trace.
-- Removal becomes archival: the row stays, the object stays, the file leaves
-- the library.
--
-- A column and not a status, exactly as 0003 argued for documents: `archived_at`
-- is orthogonal to everything else the row says, a timestamp answers "when did
-- this leave the library" which a boolean cannot, and nothing that reads
-- cms_media has to learn a new value for a column it already understands.
--
-- Uploads are content-addressed (ports/storage.js buildObjectKey), so replacing
-- an image writes a NEW key and the old object is never overwritten. The
-- archive gets its real pictures from that property for free — this column is
-- what stops an editor from taking them away again.

alter table public.cms_media
  add column if not exists archived_at timestamptz;

create index if not exists cms_media_live_idx
  on public.cms_media (created_at desc)
  where archived_at is null;

-- Column grants are absolute: a column absent from the grant can neither be
-- selected nor named in a WHERE clause. Nothing public reads cms_media today,
-- but the grant already lists the other columns, and a public read that one day
-- filters archived files out must fail on the filter's logic rather than on a
-- permission error. Re-stated in full so this file describes the finished
-- column set; `size_bytes`, `updated_at` and `created_by` stay out.

grant select (id, bucket, path, url, mime, width, height, alt, created_at, archived_at)
  on public.cms_media to anon, authenticated;


-- ---------------------------------------------------------------------------
-- cms_media_archive
-- ---------------------------------------------------------------------------
-- What the archive knows about a file that cms_media cannot answer.
--
-- "Nahráno" and "publikováno" are two different dates and the Archive needs
-- both: a file is uploaded at one moment and first appears on the site at
-- another — sometimes weeks later, sometimes never. cms_media holds the first.
-- The second is not a fact about the upload at all; it is the first revision
-- with `status = 'published'` whose body mentions the file, so it is computed
-- when a revision is written (src/cms/server/mediaArchive.js) and stored here.
--
-- One row per file the archive has learned something about, created the first
-- time a published revision mentions it OR the moment it is archived —
-- whichever happens first. A row here therefore does NOT mean "archived";
-- `archived_at is not null` means that.
--
-- `uploaded_at` and `archived_at` are copies of cms_media.created_at and
-- cms_media.archived_at, written by the same call that sets them. cms_media is
-- authoritative if they ever disagree. They are duplicated because the Archive's
-- Média subpage answers "uploaded / published / archived" for one file in one
-- read, and because the file-backed development store (fileStore/client.js) has
-- no joins at all — a design that needed one would work against Supabase and
-- fail on the machine it is developed on.
--
-- `on delete cascade` is right here and wrong on the revision above: this row is
-- ABOUT a cms_media row rather than a record of something that happened, and
-- the only way a cms_media row is ever hard-deleted is a confirmed, owner-only
-- purge from the Archive, which means to destroy exactly this.

create table if not exists public.cms_media_archive (
  media_id           uuid primary key references public.cms_media (id) on delete cascade,
  uploaded_at        timestamptz,
  archived_at        timestamptz,
  first_published_at timestamptz
);

create index if not exists cms_media_archive_first_published_idx
  on public.cms_media_archive (first_published_at desc nulls last);


-- ---------------------------------------------------------------------------
-- Who may read this
-- ---------------------------------------------------------------------------
-- Nobody with a browser-held key. The archive contains everything that was ever
-- published, including what somebody later took down — that is its purpose and
-- it is exactly why it is not for every editor, let alone for anon. Same
-- posture as cms_api_key in 0005: the privilege system denies it before RLS is
-- consulted, and no policy is ever created, so service_role behind
-- /api/cms/archive/* is the only way in. handlers/archive.js checks for an
-- owner on every request.

revoke all on public.cms_document_revision from anon, authenticated;
revoke all on public.cms_media_archive from anon, authenticated;

alter table public.cms_document_revision enable row level security;
alter table public.cms_media_archive enable row level security;


-- ---------------------------------------------------------------------------
-- What this migration deliberately does NOT do
-- ---------------------------------------------------------------------------
-- No backfill. A row inserted here for a document published last month would
-- claim `body` was what the site said last month, and it is not — it is what
-- the site says now, because `data` was overwritten in place. A backfilled
-- archive is a confident untruth, which ARCHIVE.md names as worse than no
-- archive at all. The table starts empty and fills forward.
--
-- No automatic pruning. No trigger, no retention window, no cascade that could
-- reach a revision. Everything that destroys anything is one owner-only,
-- confirmed action in the Archive screen (src/cms/server/archive.js), and that
-- is the whole list.
--
-- Nothing here records `create({ status: 'published' })`, which is reachable
-- only from scripts/cms-migrate.js. That path writes documents in bulk under a
-- human's supervision and is not a transition an editor performs; if it ever
-- becomes one, it joins the four in handlers/documents.js rather than gaining a
-- second way to write this table.


-- ========================================================================
-- 0008_cms_review_rejection.sql
-- ========================================================================

-- Rejecting a review stops deleting it — cms_document_revision.reason gains
-- 'reject' and 'requeue'.
--
-- Run after 0007_cms_archive.sql (Supabase SQL editor, or psql with the
-- connection string from Project Settings -> Database). Re-runnable: the
-- constraint is dropped before it is created and the index is created with
-- IF NOT EXISTS.
--
-- Numbered 0008 because 0007 is the highest that exists.
--
-- ---------------------------------------------------------------------------
-- What was happening before this, stated plainly
-- ---------------------------------------------------------------------------
-- studio/views/ModerationView.jsx `reject()` called `port.remove()`. Rejecting a
-- review DELETED the row. The only way back was a toast button that lived 7.5
-- seconds and re-created the document with a new id, so it was not the same
-- record even when somebody caught it. `r` was bound on window with no modifier
-- and no confirmation.
--
-- That is a data-loss bug on its own. It is also a legal exposure: these are
-- consumer reviews, and the Omnibus amendment to zákona o ochraně spotřebitele
-- requires a business that publishes them to be able to account for how it
-- handles them, and specifically not to suppress unfavourable ones. A deleted
-- review is not evidence of good moderation and not evidence of bad moderation —
-- it is no evidence at all, which is the worst position to be in when asked.
-- Keeping the rejection, with who and when and why, is the thing that shows the
-- queue is not being cherry-picked.
--
-- ---------------------------------------------------------------------------
-- Why this migration is four lines and not a table
-- ---------------------------------------------------------------------------
-- Nothing new is needed to hold a rejection. `archived_at` (0003) already is the
-- orthogonal withdrawal column: it is filtered out of the public read path, it
-- is denied to anon by the RLS policy, it is type-agnostic, and 0003's header
-- argues at length why it is a column instead of a third `status`. A rejected
-- review is an archived document. What was missing was only the REASON, and the
-- reason has two halves that live in two places on purpose:
--
--   the document body   rejectedAt, rejectedBy, rejectedReason — written into
--                       `draft` by server/documents.js reject(). Editable-shaped
--                       data an editor reads, and the thing the rejected queue
--                       filters on: `draft->>'rejectedAt' is not null`, one
--                       predicate whether the body sat in `draft` or in `data`.
--
--   the revision        reason = 'reject', with changed_by and changed_at.
--                       Append-only, owner-only, and nothing in the application
--                       updates it. This is the half that is evidence: a body
--                       field can be edited by whoever is holding the mouse, and
--                       a row in cms_document_revision cannot.
--
-- Body fields rather than columns because rejection is moderation and moderation
-- is a fact about reviews. cms_document has stayed type-agnostic — 0003 names no
-- type, which is how one migration gave archiving to every content type — and
-- three columns for one type's workflow would be the first crack in that.
--
-- ---------------------------------------------------------------------------
-- The two new transitions
-- ---------------------------------------------------------------------------
-- `reject`   archive + stamp. The review leaves the pending queue, cannot reach
--            the public site (it is archived AND unpublished AND approved is
--            false), and keeps its id.
-- `requeue`  the way back: clears archived_at and the three stamps, so the same
--            id is pending again. Not `restore`, which deliberately leaves a
--            document exactly as it was filed — right for a consultant somebody
--            archived, wrong for a decision being taken back.
--
-- The revision the rejection wrote is NOT removed by a requeue. Taking a
-- decision back does not unmake the fact that it was taken, and a ledger that
-- empties when you press the button twice is not evidence.
--
-- Both are transitions in handlers/documents.js beside the original four, which
-- is where revalidation and the revision write already hang, so neither needed a
-- second place to be remembered.

-- ---------------------------------------------------------------------------
-- reason
-- ---------------------------------------------------------------------------
-- Still the transition's name and still not free text — 0007's header is right
-- that a note column collects prose and stops being answerable. "Which of the
-- fixed reasons" lives in the body as `rejectedReason` (schemas/review.js holds
-- the list) and is a closed set for the same argument.

alter table public.cms_document_revision
  drop constraint if exists cms_document_revision_reason_check;

alter table public.cms_document_revision
  add constraint cms_document_revision_reason_check
  check (reason in ('publish', 'unpublish', 'archive', 'restore', 'reject', 'requeue'));

-- ---------------------------------------------------------------------------
-- The rejected queue's index
-- ---------------------------------------------------------------------------
-- The Studio's third moderation tab is `archived_at is not null and
-- draft->>'rejectedAt' is not null`, ordered by the rejection date. Partial on
-- exactly that predicate, for the reason 0003 and 0007 both give: Postgres uses
-- a partial index only for a query whose WHERE clause it can prove the index
-- covers, so the predicate is repeated here rather than the column indexed on
-- its own.

create index if not exists cms_document_rejected_idx
  on public.cms_document ((draft->>'rejectedAt') desc)
  where archived_at is not null and (draft->>'rejectedAt') is not null;

-- ---------------------------------------------------------------------------
-- What this migration deliberately does NOT do
-- ---------------------------------------------------------------------------
-- No backfill, and here that is not a technical limitation but the honest
-- answer: every review rejected before today was deleted, and there is no row
-- left to stamp. The rejection ledger starts empty and fills forward, exactly as
-- 0007's revisions do.
--
-- No change to the anon grant or to the policy. A rejected review is archived,
-- and 0003's policy already denies anon every row with a non-null `archived_at`
-- — before the site's own filter, before `getApprovedReviews`, before anything
-- in JavaScript gets a say. The three stamps are in `draft`, which has never
-- been in the anon grant at all.


-- ========================================================================
-- 0009_cms_noop_draft_cleanup.sql
-- ========================================================================

-- Clear the drafts that are copies of what is already published.
--
-- Run after 0008_cms_review_rejection.sql (Supabase SQL editor, or psql with the
-- connection string from Project Settings -> Database). Re-runnable and safe to
-- run twice: the second run matches nothing.
--
-- Numbered 0009 because 0008 is the highest that exists.
--
-- NOT A SCHEMA CHANGE. No column, index, constraint or policy moves. This is a
-- one-time repair of rows that the code above it can no longer create, and it is
-- written as a migration only because a production store cannot be repaired from
-- a developer's machine.
--
-- ---------------------------------------------------------------------------
-- What it repairs
-- ---------------------------------------------------------------------------
-- Contract 3's invariant is that `draft` is non-null exactly when there is
-- something the public has not seen. Every part of the Studio reads it that way:
-- the state chip (studio/lib/documents.js `stateOf`), the `state = 'edited'`
-- filter (server/query.js `STATE_CONDITIONS`), and the publish dialog on
-- /studio/edit.
--
-- The invariant was never enforced on the way in. `documents.update()` stored
-- whatever body it was handed, including a body identical to `data` — which is
-- what an editor produces by opening a document, reading it and pressing Uložit.
-- Measured on the development store before this: 125 documents, 43 carrying a
-- draft, 10 of those identical to their published body. Every one of the ten
-- showed as pending work that did not exist, and the publish dialog offered them
-- alongside the block the editor had actually changed.
--
-- `documents.update()` now stores no draft for a body that matches `data`, so
-- nothing new arrives in this state. This clears what arrived before that.
--
-- ---------------------------------------------------------------------------
-- Why `draft = data` is the right test
-- ---------------------------------------------------------------------------
-- Both columns are jsonb, and jsonb equality is canonical: key order and
-- whitespace are not part of the value, so two objects with the same keys and
-- the same values are equal whichever way round they were written. That is the
-- same comparison @/cms/core/body.js makes in JavaScript, where it has to be
-- built by hand because JSON.stringify does treat key order as content.
--
-- `status` and `published_at` are not named below, and `data` is not named
-- below. Clearing a draft cannot change what a visitor sees — that is the whole
-- reason this needs no revision and no revalidation, and it is why this file is
-- an UPDATE of one column and nothing else.

update cms_document
   set draft = null
 where draft is not null
   and draft = data;

-- Afterwards, to confirm nothing is left:
--
--   select count(*) from cms_document where draft is not null and draft = data;
--   -- expected: 0
