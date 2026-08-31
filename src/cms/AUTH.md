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

## The hint cookie — a convenience, never a control

Beside `cms_session`, sign-in sets a second cookie: `cms_hint=1`, `Path=/`,
`SameSite=Lax`, same 30-day `Max-Age`, same sliding refresh, cleared in the same
response that revokes the session — and **not `HttpOnly`**. It exists so the
public site can show a signed-in editor a small "Spravovat web" badge with a
button into the Studio, without charging every visitor a request to find out.

**It carries no authority and nothing may ever be gated on it.** Anyone can set
it from a console; doing so shows a button, and the button leads to `/studio`,
where the real signed `HttpOnly` session is checked and a stranger gets the
sign-in form. Measured: with a forged `cms_hint` and no session,
`/api/cms/documents` answers 401 exactly as with no cookie at all.

This is the same conclusion `src/cms/nextConfig.mjs` reaches about why there is
no edge auth gate — a presence check waves the forged cookie through and refuses
only the honest visitor. The difference is that here the presence check has been
given nothing but a convenience to do. `src/cms/manage/hint.js` is where that is
written down, next to the code that reads it.

A stale hint (session ended from another device, password changed, secret
rotated) shows the badge to somebody who is no longer signed in. Nothing
confirms it with a request, deliberately: the outcome of a stale hint is the
outcome of a forged one, so a confirmation prevents no state — it only costs a
round trip and makes the cookie look authoritative to the next reader.

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

## Sessions, seen

Thirty-day sliding sessions accumulate and `signOut` revokes only the cookie the
caller presented, so an audit found thirteen live sessions and no way to look at
them. `src/cms/server/sessions.js` adds the list and two ways to end one:

- `listSessions({ currentHash })` — live, unexpired sessions with the account
  behind each. `ip_hash` is deliberately not returned: a salted hash of an
  address is still a stable per-person identifier and nothing on that screen is
  answered by it. The browser string is, because that is what a person
  recognises their own laptop by.
- `revokeSession(id)` — one row, including your own.
- `revokeAllSessions({ userId, keepHash })` — sign out everywhere. **The
  caller's own session is kept by default.** The threat it answers is a session
  somebody else holds; a button that logs the owner out of the screen they
  pressed it on is a button they will not press twice. Changing the password
  still revokes everything including the current one, which is the right tool
  for "I think someone has my password".

## API keys

A key an outside system uses to READ this site's published content. Same
cryptography as a session, for the same reasons: 32 random bytes, a SHA-256 in
`cms_api_key.token_hash`, the token shown once at creation and retrievable never
(`src/cms/server/apiKeys.js`, table in `migrations/0005_cms_api_key.sql`).

What keeps it read-only is not a check, it is the shape:

- Resolving a key answers `{ id, name }` — not a user, no role. `requireUser()`
  and `requireOwner()` read the session cookie and nothing else, so a key
  presented to `/documents`, `/media` or `/auth/users` is not a weaker
  credential there, it is no credential at all. Those routes answer 401.
- `/api/cms/content/*` is the only route that accepts one, and it constructs
  `createContentReadPort()` (`src/cms/server/contentApi.js`) — an object with
  `list` and `get` on it, both going through `documents.listPublished`, which
  fixes `status = 'published'`, `archived_at is null` and the public column set
  that does not include `draft`. Widening a key means adding a method to that
  file, under the comment saying not to.
- A session cookie means nothing on that route either, so it cannot become a
  second, weaker way into the Studio's data.

Issuing, listing and revoking are owner-only, checked server-side on every call.

## The settings portal

`/studio/settings`, owner-only, and `src/cms/server/settings.js` is the rule it
exists to hold: **it reports whether a secret is set and never what it is.** Not
masked, not the first six characters, not behind a reveal. The endpoint does not
return the values, so the screen cannot print them by accident. A "which key is
this" question is answered with a fingerprint (`keyFingerprint`), which the
server can compute and deliberately does not send.

---

## Role — správce, majitel, člen

| role | kdo | co smí |
|---|---|---|
| `admin` | vývojář | všechno: uživatelé, nastavení, archiv, pole jen pro správce |
| `owner` | majitel webu | dnes totéž co člen |
| `member` | člen redakce | obsah |

**Admina určuje `CMS_ADMIN_EMAIL`, ne sloupec v databázi.** `effectiveRole()`
v `server/auth.js` porovná adresu přihlášeného s tou proměnnou a teprve podle ní
odpoví. Plyne z toho trojí, aniž by to někdo musel udržovat: přesun proměnné na
jinou adresu přesune i správcovství, řádek ručně přepsaný v databázi na `admin`
nedává nic (musí sedět i adresa), a vývojáře nejde z vlastního CMS vyřadit
degradací. Obrazovka Uživatelé roli `admin` proto vůbec nenabízí — uložit by ji
šlo a server by ji stejně ignoroval.

**`owner` je titul, ne pravomoc.** Klient má na svém webu vidět, že je majitel,
aniž by tím dostal správu uživatelů, nastavení, archiv a pole, která rozbíjejí
adresy stránek. Práva má dnes shodná s členem. Až se budou lišit, rozhodne se to
v `effectiveRole()`, ne rozsypáním nových kontrol po handlerech.

### Pole jen pro správce

Pole může nést `adminOnly: true` (`core/defineField.js`). Dvě místa to ctí a obě
jsou potřeba:

- `studio/fields/FieldRenderer.jsx` pole **nevykreslí**. Ne zašedlé — zašedlé
  pole je otázka, na kterou se editor zeptá, a odpověď „tohle rozbije adresy
  stránek, na které už někdo odkazuje" formulář dobře nepodá.
- `server/adapter.js` **odmítne zápis**, který jeho hodnotu mění. Studio je
  aplikace v prohlížeči mluvící s HTTP API editorovou vlastní cookie — co umí
  poslat ona, umí poslat i on. Porovnává se hodnota, ne přítomnost: formulář
  posílá celé tělo, takže člen ukládající jiné pole pošle beze změny i tohle.

### Co která role smí u recenzí

Recenze je cizí výpověď, ne obsah webu — proto se **moderování** a **úprava**
rozdělily:

| | schválit / zamítnout | přepsat text |
|---|---|---|
| `admin` | ano | ano |
| `owner` | ano | ano |
| `member` | ano | **ne** |

Je to první věc, ve které se majitel liší od člena. Technicky to nese
`editRoles: ['admin', 'owner']` na čtyřech obsahových polích typu `review`
(jméno zákazníka, jméno poradce, text, hashtag). Pole ze skupiny „moderace" —
`approved`, `rejectedAt` a spol. — omezená nejsou, jinak by schvalování nešlo
právě lidem, kteří ho mají na starost.

Ta pole jsou pro člena **zamčená, ne skrytá**. Kdo schvaluje, musí si text
přečíst, aby se měl podle čeho rozhodnout.

Schvalování posílá celé tělo recenze včetně textu (`ModerationView` volá
`port.update` a hned `publish`). Kontrola proto porovnává **hodnoty**, ne
přítomnost polí: text poslaný zpět beze změny projde, přepsaný ne. Ověřeno —
člen recenzi schválí, ale její text nepřepíše.

### Zařazení u poradce

| pole | člen | majitel | správce |
|---|---|---|---|
| Typ (poradce / Benefit program) | nevidí | vidí a mění | vidí a mění |
| Pořadí | nevidí | vidí a mění | vidí a mění |
| Počítadla (líbí se, počet recenzí) | nevidí | jen vidí | vidí a mění |
| Původní ID | nevidí | jen vidí | vidí a mění |

Členům se ta záložka nezobrazí vůbec — `fieldGroups()` filtruje pole podle role
a skupina, ze které nezbude nic, přestává být záložkou. Prázdný tab by se četl
jako závada, ne jako oprávnění.

Pole tedy odpovídají na tři otázky, ne na dvě: `viewRoles` (kdo to vidí),
`editRoles` (kdo to smí měnit) a `adminOnly` jako zkratka pro obojí omezené na
správce.

**Skrytí je jen v rozhraní.** Dokument se přes API vrací celý a formulář posílá
zpět, co dostal — kdyby server hodnoty vyřezával, pole schované na obrazovce by
se při uložení ztratilo. Vynucený je zápis (`editRoles`), a to je ta polovina,
na které záleží. U počítadel a původního ID to ani není citlivý údaj: počty jsou
vidět na webu a původní ID je stopa na starou databázi.

Dnes je jediné pole jen pro správce ve všech třech smyslech: `slug` u poradce. Je to adresa stránky, která je
odkazovaná z webu, indexovaná a hlavně vytištěná jako QR kód na vizitce — a
vizitku v cizí peněžence už nikdo neopraví.

---

## Pozvánka do Studia

Založení účtu odešle e-mail — šablona `src/modules/resend/emails/cms-pozvanka.jsx`
(React Email), vzhledem podle Studia, ne podle webu: příjemce má za chvíli
otevřít tmavou administraci a pozvánka, která vypadá jako marketingový e-mail,
je o jeden důvod k nedůvěře víc.

**Jeden odesílatel, ne druhý.** `server/mail.js` se napojuje na Resend, který
projekt už má (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) a kterým odchází deset
formulářových e-mailů webu. Vlastní nastavení pro CMS by znamenalo druhou doménu
k ověření a druhý klíč k rotaci.

**Bez odesílatele se nic neposílá a nic se nerozbije.** `hasSender()` je celá
podmínka; web, který ho nemá, zakládá účty dál, jen bez pozvánky. Odesílání je
doplněk k založení účtu, ne jeho součást — účet už existuje a heslo už bylo
vygenerováno, takže `sendInvite` nikdy nevyhodí výjimku. Odpověď na založení
proto veze `invite: { sent }`, aby rozhraní mohlo říct nahlas, jestli má správce
heslo předat sám.

**Heslo v pozvánce není.** Heslo poslané e-mailem zůstane ve schránce napořád —
v odeslané poště správce i v doručené příjemce. Pozvánka veze adresu, roli a
odkaz; heslo předá správce jinou cestou. Odkaz na nastavení vlastního hesla je
lepší a je to další krok, ne tenhle.

## Hlášení o publikované změně

Publikování je jediná akce v systému, kterou uvidí veřejnost, takže o ní chodí
e-mail — šablona `cms-aktualizace.jsx`, opět ve vzhledu Studia.

**Správcům a majiteli, ne členům.** Členové publikují dnes a denně; e-mail o
vlastní práci je šum, který se po týdnu přestane číst — a s ním i ten, který si
přečíst bylo potřeba. Kdo změnu udělal, je ze seznamu vyňatý ze stejného důvodu.

Adresa z `CMS_ADMIN_EMAIL` je v seznamu vždycky, i kdyby řádek v tabulce
chyběl: správce je určený prostředím, ne sloupcem.

Posílá se **až po revalidaci** — než e-mail dorazí, ať je změna opravdu na webu
— a jen když se něco změnilo: publikování, které nic nezměnilo, se vrací
s `unchanged` a sem nedojde.

**Jedno omezení, které stojí za vědomí:** publikuje se po dokumentech, takže
zveřejnění stránky o šesti blocích pošle šest e-mailů. Zatím to tak je. Sloučit
je do jednoho by znamenalo frontu nebo naplánovaný souhrn — a přesně na to je
připravená šablona `cms-statistiky.jsx`, která zatím čeká, protože pravidelný
e-mail potřebuje něco, co ho spustí (cron na Vercelu). Šablona je hotová, čísla
dostane hotová, měnit se na ní nebude nic.
