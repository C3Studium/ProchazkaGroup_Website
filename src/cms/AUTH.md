# CMS authentication — design

Replaces the Supabase magic-link flow and the `cms_editor` allowlist. Modelled
on how Medusa seeds an admin: credentials in the environment bootstrap the first
owner, everything after that lives in the database and is managed from the admin.

## Why not keep magic links

They were the cheap option and they leaked responsibility: a Supabase session
proves only that an address receives mail, so a second allowlist table had to
decide who was staff. Two sources of truth for one question. Password auth owned
by this application collapses that into one, and removes a dependency on
Supabase Auth that nothing else in the project uses.

## Tables

```
cms_user     id, email (citext unique), password_hash, name,
             role ('owner' | 'editor'), created_at, updated_at,
             last_login_at, disabled_at, created_by
cms_session  id, user_id, token_hash, created_at, expires_at,
             revoked_at, user_agent, ip_hash
```

`cms_editor` and `cms_is_editor()` are dropped; `cms_document` and `cms_media`
policies key off a session resolved server-side instead.

**No browser-held key may touch either table.** Not "policies restrict it" —
`revoke all ... from anon, authenticated`. Only `service_role` reads them, which
means only code behind `/api/cms/*` does. A password hash that anon can select
is a password hash that will be cracked offline at leisure.

## Bootstrap

`CMS_ADMIN_EMAIL` and `CMS_ADMIN_PASSWORD` in the environment. On the first
authenticated request, if no `owner` row exists, one is created with the
password hashed. The environment value is never stored, never logged, never
compared against a stored plaintext — it is hashed and thrown away.

If an owner already exists the environment pair is ignored. It is a seed, not a
back door: leaving it set must not let anyone in after the password is changed
in the admin, or rotating it in Vercel silently grants access.

## Hashing

`crypto.scrypt`, Node built-in — N=2^15, r=8, p=1, 16-byte salt, 64-byte key,
stored as `scrypt$N$r$p$salt$hash`. The parameters live in the string so they
can be raised later without invalidating existing hashes.

No dependency. Argon2id is better in the abstract and needs a native module on
Vercel; scrypt is in the standard library, is what Medusa v2 uses, and the
difference does not decide this system's security.

## Sessions

Server-generated 32-byte random token, sent as an httpOnly, Secure, SameSite=Lax
cookie. **The database stores a SHA-256 of the token, never the token** — the
same reasoning as passwords: a leaked session table must not be a set of working
credentials. Thirty-day expiry, sliding on use.

Stored rather than stateless because removing a user has to end their access
immediately. A self-contained JWT cannot be withdrawn before it expires, and
"remove a user" is a feature this system is being asked for.

## Login

- Rate-limited per address and per IP; IP stored only as a salted hash.
- Constant-time comparison; the same generic failure for unknown address and
  wrong password, taking the same time either way. Distinguishing them hands an
  attacker a list of valid staff addresses.
- Successful login rotates the session id.

## Roles

`owner` manages users; `editor` does not. Both edit content. Enforced on the
server on every request, not by hiding buttons — a hidden button is a UI
convenience, never a control.

An owner cannot remove or demote themselves while they are the only owner; the
system must not be able to lock itself out.

## Environment

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | server-only; the sole path to these tables |
| `CMS_ADMIN_EMAIL` | bootstrap owner |
| `CMS_ADMIN_PASSWORD` | bootstrap password, hashed on first use |
| `CMS_SESSION_SECRET` | signs the session cookie |
| `CMS_IP_HASH_SALT` | salts IP hashes in rate limiting and sessions |

None carry `NEXT_PUBLIC_`. Anything that does is compiled into the browser
bundle and is public by definition.
