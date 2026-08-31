# Plán: z CMS udělat knihovnu

Odpověď na tři otázky — Railway Postgres, App Router, a nová repa
instalovatelná jako balíček z gitu. Čísla níže jsou naměřená v tomto stromu,
ne odhadnutá.

---

## 1. Dá se to napojit na Postgres na Railway?

**Ano, a šev na to už existuje** — ale nejsou to migrace, jak by člověk čekal.

CMS nemluví se Supabase přímo. Mluví s *klientem*, a ten klient je zaměnitelný:
`createClient` se v celém `src/cms` vyskytuje v **jediném souboru**
(`server/supabaseAdmin.js`). Zbylých 13 modulů si ho bere přes továrnu
`getAdminClient()` a o Supabase neví.

A hlavně — **druhý backend už běží**. `server/fileStore/client.js` (1005 řádků)
je kompletní náhrada, která pohání celé CMS beze změny řádku nad sebou.
Implementuje přesně tu podmnožinu dotazů, kterou repozitáře používají:

```
select insert update delete | eq neq in is not or | order range limit
single maybeSingle | 3× rpc
```

Ten výčet je zároveň **zadání** pro Railway driver, a `fileStore/client.js` je
jeho referenční implementace. Překlad těch sloves do SQL je přímočařejší než
do skenu souborů, který už funguje.

Pomáhá i to, že CMS **nepoužívá Supabase Auth** — má vlastní scrypt sessions
v `server/auth.js`. Odpadá tím obvykle největší blokátor migrace ze Supabase.

### Co Railway neumí a je potřeba dodělat

| Věc | Stav | Práce |
|---|---|---|
| Dotazy (PostgREST) | šev v 1 souboru | nový `pgClient.js` nad `pg`, podle výčtu výše |
| Úložiště souborů | Railway nemá object storage | driver pro S3/R2/Vercel Blob proti `ports/storage.js` |
| 3 RPC funkce | čisté SQL v migracích | přenositelné beze změny |
| Migrace | **částečně vázané na Supabase** | rozdělit, viz níže |

`ports/storage.js` s tím počítá — v hlavičce sám jmenuje MinIO, R2, Vercel Blob
a S3 jako platné implementace a `assertStoragePort()` kontrakt vynucuje při
konstrukci.

### Jediné nemilé překvapení: migrace

Tady jsem čekal čistý přenos a nedostal ho. Migrace sahají na věci, které na
holém Postgresu **neexistují**:

- `storage.buckets` a `storage.objects` — RLS politiky pro bucket (0001, ~10 míst)
- `auth.users` — cizí klíč do Supabase auth schématu
- `extensions.gin_trgm_ops` — na Railway je to `public` schéma, ne `extensions`
- granty rolím `anon`, `authenticated`, `service_role` — ty role tam nejsou

Řešení je rozdělit migrace na dvě řady: **jádro** (tabulky, indexy, RPC — běží
kdekoli) a **platforma** (bucket policies, role granty — jen Supabase). Není to
těžké, ale je to práce, kterou je lepší vidět teď než při první instalaci.

---

## 2. Dá se to použít na App Router?

**Ano, a je to výrazně menší než se zdá z prvního grepu.**

`getStaticProps` sice najdeš v 20 souborech — ale v 18 z nich je to **próza
v komentářích**. Skutečná volání jsou **dvě**: `studio/views/EditView.jsx`
a `server/pages.js`.

Celá vazba na Pages Router:

| API | Míst | Kde | App Router protějšek |
|---|---|---|---|
| `useRouter` | 10 | **všech 10 v `studio/`** | `next/navigation` (jiné API) |
| `getStaticProps` | 2 | `EditView`, `server/pages.js` | server component + `revalidate` |
| `res.setHeader` | 8 | auth, rate limity, http | `Response` headers |
| `res.revalidate` | 1 | `server/revalidate.js:193` | `revalidatePath()` |
| `setPreviewData` | 1 | draft mode | `draftMode()` |

Nula výskytů v `server/` (mimo ty response hlavičky), `core/`, `edit/`
a `site/` — tedy schémata, validace, field DSL, patch logika a celý datový
model jsou na routeru nezávislé už teď.

Studio je navíc v podstatě SPA. Pod App Routerem z něj bude jedna
`'use client'` větev, což `useRouter` řeší hromadně, ne po jednom.

---

## 3. Plán knihovny

### Co je hotové

Hranice je dnes **tři importy ven** (`@/lib/cms.config.js` ×2,
`@/lib/cms.types.mjs` ×1) a **nula vazeb v SCSS** — `src/cms/styles/_viewport.scss`
má vlastní breakpointy a `sync-styles.js` do `src/cms` nesahá (`ownsItsStyles`).

### Pořadí fází

Klíč je **neportovat dvě věci najednou**. Nejdřív ať to jde nainstalovat, teprve
pak měnit router a databázi — jinak se nedá poznat, co rozbilo co.

**Fáze 0 — vytáhnout as-is.** Nová repa, `src/cms` beze změny chování: Pages
Router, Supabase. Ty tři relativní importy se stanou vstřikovanou konfigurací.
Tenhle web se na balíček přepne a musí fungovat identicky.
*Hotovo, když: `pnpm add github:…` a web běží jako dnes.*

**Fáze 1 — runtime port.** Tenká vrstva `runtime/` se dvěma implementacemi
(pages/app): router, response, revalidate, draft mode. Podle tabulky výše.
*Hotovo, když: Studio běží na App Routeru bez sáhnutí do `views/`.*

**Fáze 2 — datový port.** `pgClient.js` nad `pg` podle výčtu sloves; rozdělit
migrace na jádro a platformu.
*Hotovo, když: celé CMS běží na Railway Postgresu.*

**Fáze 3 — úložiště.** S3/R2 driver proti `ports/storage.js`.

**Fáze 4 — texty.** 79 souborů s natvrdo českými řetězci bez slovníku. Pro
tenhle web je to jedno, pro druhý projekt ne.

### Mechanika balíčku

Doporučuji **posílat zdroj, ne build**. Balíček je JSX + SCSS moduly; když ho
konzument uvede v `transpilePackages`, Next si ho zkompiluje sám a odpadá build
krok, `prepare` skript i riziko zastaralého `dist` v gitu:

```js
// next.config.mjs konzumenta
transpilePackages: ['@prochazka/cms']
```

```jsonc
// package.json knihovny
{
  "exports": {
    ".": "./src/index.js",           // site helpers
    "./studio": "./src/studio/index.js",
    "./server": "./src/server/index.js",
    "./styles/*": "./src/styles/*"
  },
  "peerDependencies": { "next": ">=14", "react": ">=18" },
  "peerDependenciesMeta": { "@supabase/supabase-js": { "optional": true } }
}
```

Instalace: `pnpm add github:uzivatel/cms#v0.1.0`. Tagovat verze — bez tagu se
instaluje pohyblivý `main` a druhý projekt se rozbije ve chvíli, kdy do knihovny
commitneš.

---

## Co je zatím neověřené

Abych nesliboval víc, než jsem změřil:

- **Nic z tohohle neběželo proti Railway.** Fáze 2 je návrh podle změřených
  švů, ne odzkoušená cesta.
- **Rozsah `pgClient.js` je odhad.** Výčet sloves je jistý, jejich SQL překlad
  ne — hlavně `or()` a řetězené filtry.
- **Zbývá otevřený bezpečnostní bod** z ostré DB: `0004_legacy_lockdown.sql`
  nespuštěná, anon klíč nerotovaný. To s knihovnou nesouvisí, ale je to pořád
  na řadě dřív.
