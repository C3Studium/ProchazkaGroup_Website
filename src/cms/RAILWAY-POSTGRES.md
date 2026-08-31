# Postgres na Railway — co se udělalo a na co se narazilo

Cíl: dostat obsah CMS ze Supabase na Postgres v projektu `disciplined-recreation`,
skupina *CMS TEST*, a připravit půdu pro vlastní driver.

## Stav

| | |
|---|---|
| schéma | **hotové** — 9 tabulek, 3 RPC, 32 indexů, ve vlastní databázi `valecms` |
| obsah | **přenesený** — 360 řádků, počty sedí se Supabase |
| Postgres driver | **hotový** — 17/17 vlastních testů, celé CMS 37/37 |
| S3 / MinIO driver | **hotový** — 10/10 kontrol proti Railway |
| soubory médií | **nepřenesené** — řádky ukazují na Supabase, bajty tam pořád leží |

## Co která služba je

Je to **jeden projekt**, ne dva; „CMS TEST" je skupina na plátně, takže odkazy
`${{…}}` můžou mezi eshopem a CMS přeskakovat.

| služba | privátní doména | kdo ji používá |
|---|---|---|
| `PostgresNew` | `postgres-qd3s.railway.internal` | eshop Backend |
| `Bucket` | `bucket.railway.internal` | eshop Backend |
| **`Postgres`** | `postgres.railway.internal` | **CMS** |
| **`Bucket Copy`**, **`Console Copy`** | zatím žádná | CMS, čeká na deploy |

Ověřeno u všech 13 služeb: na `Postgres` se neodkazuje žádná jiná. Držela 136
prázdných tabulek Medusy (0 řádků) — smazáno.

U `Postgres` je `DATABASE_URL` ta **veřejná** (proxy `gondola.proxy.rlwy.net`),
privátní je `DATABASE_PRIVATE_URL`. U `PostgresNew` je to obráceně. Driver na to
nesmí spoléhat: uvnitř Railway se pozná podle `RAILWAY_ENVIRONMENT` a sáhne po
privátní, jinak po veřejné.

## Migrace schématu

Supabase migrace na holém Postgresu neběží. Řeší to `scripts/cms-migrations-postgres.mjs`,
který z nich vyrobí `src/cms/server/migrations-postgres.sql` — **převádí, nekopíruje**,
aby schéma zůstalo v jednom zdroji a nerozešlo se.

Vynechá 71 příkazů, každý s důvodem:

- **granty a revoke pro `anon`/`authenticated`/`service_role`** — ty role tvoří Supabase
- **RLS a politiky** — chrání před anonymním klíčem, který mimo Supabase neexistuje;
  aplikace se připojuje jako vlastník
- **politiky pro `storage.objects`** — na MinIO to řeší úložiště samo
- **`cms_is_editor()`** — stojí na `auth.jwt()`; členství se mimo Supabase ověřuje
  v `server/auth.js`

Převádí `extensions.*` na holá jména a odstraňuje cizí klíč na `auth.users`
(sloupec zůstává, autora si CMS drží ve vlastním `cms_user`).

## Chyby, na které se narazilo

Všechny opravené; jsou tu proto, aby se u dalšího driveru hledaly rychleji.

**1. Dělič SQL příkazů sekal uvnitř komentářů a řetězců.**
Naivní split na `;` rozsekal `create table cms_user` uprostřed — soubor `0002`
dal 2 příkazy místo 44. Dělič teď přeskakuje `--`, `/* */`, `'…'` i `$$…$$`.

**2. `role "anon" does not exist`.**
Pravidlo hlídalo jen `grant`, ale v migracích je i `revoke all … from anon`.
Rozšířeno na `revoke` a `alter default privileges`.

**3. `schema "auth" does not exist`.**
Pravidlo chytalo `auth.users`, ne `auth.jwt()` uvnitř těla funkce. Rozšířeno na
celé schéma `auth`, a s ním odpadá i to, co na `cms_is_editor()` navazuje.

**4. `relation "public.cms_document" does not exist`.**
Špatné pořadí: vynechání se rozhodovalo dřív než oprava, takže se zahodila celá
`create table` jen proto, že jeden sloupec ukazoval na `auth.users`. Teď se
nejdřív odstraní cizí klíč a teprve pak se rozhoduje.

**5. `cannot insert a non-DEFAULT value into column "search_text"`.**
Generovaný sloupec. Přenos teď bere jen sloupce s `is_generated = 'NEVER'`;
`search_text` se na cíli dopočítal sám pro všech 191 dokumentů.

## Přenos obsahu

`scripts/cms-supabase-to-postgres.mjs` — čte přes PostgREST, zapisuje přes `pg`,
tabulky v pořadí závislostí, `on conflict (id) do update`, takže opakované
spuštění obsah srovná místo zdvojení. `--dry` ukáže, co by přenesl.

```
cms_user 1 · cms_document 191 · cms_media 117
cms_document_revision 39 · cms_media_archive 4 · cms_api_key 8
```

Typy sedí: siteCopy 103, review 37, partner 17, consultant 13, offer 10, qna 10,
assistant 1.

`cms_session` se **nepřenáší** — sezení není obsah a podepisuje se jiným klíčem,
takže by na cíli neplatilo.

## Drivery

`server/pgClient.js` — klient pro Postgres v řeči repozitářů. Zaměňuje se klient,
ne repozitář, takže nad ním běží všechno nezměněné. `getAdminClient()` ho vybere,
když je nastavené `DATABASE_URL`.

`server/ports/s3.js` a `s3Storage.js` — podpis SigV4 a úložiště. Bez závislostí;
SDK by si kvůli šesti operacím přitáhlo strom balíčků. Adresování cestou, protože
MinIO na vlastní doméně virtual-host styl neumí.

### Čtyři chyby v driverech

**Přetypování na `::text` u filtrů.** Aby fungovaly cesty do JSONu, přetypovával
jsem sloupec na text. U časového razítka pak porovnávalo
`2026-08-30 21:59:59.123456+00` s ISO tvarem a nikdy se to netrefilo — a přesně
tím se posílá zpátky značka pro souběžné úpravy. Cast pryč; Postgres si parametr
přivede na typ sloupce sám.

**Ztráta mikrosekund.** Převod časů přes `Date` je ořízne na milisekundy, takže
přečtená hodnota se do uložené netrefila a každé uložení hlásilo konflikt, který
nikdo nezpůsobil. Časy se vrací tak, jak přišly.

**`delete({ count: 'exact' })` ignorovalo parametr.** `remove()` čte počet jako
důkaz, že se něco stalo; bez něj hlásilo „nenalezeno" i u řádku, který smazalo.

**Seznam sloupců se nepřekládal.** `select('id, data->>page')` šel do SQL syrový
a spadl na „column page does not exist". Cesty do JSONu se teď překládají i tam
a pojmenují podle posledního článku, jak to dělá PostgREST.

## Ověřeno

Proti Railway, ne proti napodobenině:

- **37/37** testů API přes všech devět rodin rout, nula chyb v logu serveru
- **17/17** vlastních testů klienta (filtry, `or`, JSON cesty, `single`, RPC…)
- **10/10** kontrol úložiště (put/get/list/publicUrl/signedUrl/remove, idempotence)
- Studio v prohlížeči: všech devět pohledů čistých
- Zápis prokazatelně končí v Railway Postgresu, ne v Supabase

## Co zbývá

1. **Přenést soubory médií.** Řádky v `cms_media` se přenesly, ale bajty pořád
   leží v Supabase Storage a `url` na ně ukazuje. Dokud se nezkopírují do MinIA
   a URL nepřepíšou, obrázky se tahají ze Supabase.
2. **App Router** — samostatná vrstva, netýká se driverů.
