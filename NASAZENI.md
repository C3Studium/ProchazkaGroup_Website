# Co je potřeba udělat — krok za krokem

Tenhle soubor je pro tebe, ne pro stroj. Všechno ostatní je hotové a ověřené;
zbývají čtyři věci, které musí udělat člověk, protože sahají na živá data a
jsou nevratné.

**Nedělej to poprvé na ostrém projektu.** Celý postup se nejdřív projede na
zahazovací kopii. Když tam něco spadne, nic se nestalo. Když projde, projde i
doopravdy — a budeš to vědět předem místo za provozu.

---

## Proč to nejde spustit za tebe

Do `.env` chybí `SUPABASE_SERVICE_ROLE_KEY`. Bez něj se nedá založit tabulka ani
zapsat dokument — anonymní klíč, který tam je, na to nemá právo (a je to tak
správně, ten je v prohlížeči každého návštěvníka).

Najdeš ho v **Supabase → Project Settings → API → `service_role`**.

Ten klíč **nikdy nesmí dostat předponu `NEXT_PUBLIC_`**. Cokoli s ní se zapéká
do JavaScriptu, který si stáhne každý návštěvník webu.

---

## Zkouška nanečisto (asi 20 minut)

### 1. Založ prázdný Supabase projekt
Zdarma, jméno je jedno, zahodíš ho potom.

### 2. Přepiš dočasně `.env`

Zálohuj si původní hodnoty, budeš je vracet:

```
NEXT_PUBLIC_SUPABASE_URL       = adresa zkušebního projektu
NEXT_PUBLIC_SUPABASE_ANON_KEY  = jeho anon klíč
SUPABASE_SERVICE_ROLE_KEY      = jeho service_role klíč
```

### 3. Pusť SQL — v tomhle pořadí

Supabase → SQL Editor. Otevři soubor, zkopíruj obsah, spusť. Po každém se
podívej, jestli nehlásí chybu, a teprve pak pokračuj.

```
src/cms/server/migrations/0001_cms_tables.sql
src/cms/server/migrations/0002_cms_auth.sql
src/cms/server/migrations/0003_cms_document_archive.sql
src/cms/server/migrations/0005_cms_api_key.sql
src/cms/server/migrations/0006_cms_setting.sql
src/cms/server/migrations/0007_cms_archive.sql
src/cms/server/migrations/0008_cms_review_rejection.sql
src/cms/server/migrations/0009_cms_noop_draft_cleanup.sql
src/cms/server/migrations/0010_cms_media_crop.sql
src/cms/server/migrations/0011_cms_roles.sql
```

**`0004` teď ne.** Ta je až úplně nakonec a jen na ostrém — viz níž. Deset
ostatních jde za sebou tak, jak jsou vypsané: `0008` je to, co dělá ze
zamítnuté recenze archivaci místo smazání, `0009` uklidí koncepty, které
jsou shodné s publikovanou verzí, a `0010` přidá k médiím ořez.
`0011` zavádí tři role — správce, majitel, člen.

### 4. Zkontroluj, že to sedí

```bash
pnpm cms:seed
```

Nic nezapisuje. Vypíše tabulku migrací — u všech deseti má být ✓ místo ✗.
Když ne, jedna neproběhla; vypíše která a proč.

### 5. Nasyp obsah

```bash
pnpm cms:seed --write
```

Čekej `vytvořeno 124` dokumentů a `vytvořeno 36` položek knihovny.

### 6. Podívej se, jestli to žije

```bash
pnpm run dev
```

- `/studio` — přihlas se, v seznamech mají být plné typy, ne prázdno
- `/studio/edit` — musí být na co klikat
- `/` — web má vypadat úplně stejně jako dnes

**Když web vypadá správně, ale Studio je prázdné, obsah se nenahrál.** To je ta
zákeřná varianta: každá sekce má v sobě záložní text, takže stránka vypadá
zdravě i s prázdnou databází.

---

## Naostro

Když zkouška prošla, totéž na skutečném projektu:

1. Vrať do `.env` původní adresu a anon klíč, přidej **skutečný** `service_role`
2. Pusť těch šest SQL souborů ve stejném pořadí
3. `pnpm cms:seed` → zkontroluj → `pnpm cms:seed --write`
4. Ověř `/studio` a `/`

**Nespouštěj `scripts/cms-migrate.js`.** Ten starý skript popisuje stejných 52
dokumentů jako `cms:seed` a spuštění obou by vyrobilo od každého dva. Pojistka
tam je a plán to napíše červeně, ale je lepší to nezkoušet.

---

## Až nakonec: zavřít starou databázi

Tohle je nevratné a dělá se **až když obsah v CMS je**.

### 1. Udělej zálohu
Supabase → Database → Backups.

### 2. `0004_legacy_lockdown.sql`

Má to v hlavičce napsané a platí to: **přečti si to, než to spustíš.**

- **Sekce 0** je jen čtení. Spusť ji samotnou a přečti si výstup — ověřuje
  předpoklady, na kterých zbytek stojí.
- **Sekce 1–3** zavřou anonymní zápis a **smažou sloupce `ip_list` a
  `list_of_all_ips`** z tabulky `reviews`. Zpátky to nejde jinak než ze zálohy.
- **Sekce 4** je zakomentovaná schválně a **teď se nespouští** — zavřela by i
  čtení, které migrace ještě potřebuje.

Proč to spěchá: v těch sloupcích jsou **skutečné IP adresy dvanácti lidí a jsou
veřejně čitelné**. Ověřeno naposledy dnes. Je to osobní údaj podle GDPR.

### 3. Rotuj anonymní klíč

Supabase → Project Settings → API → *Reset anon key*. Nový vlož do `.env` jako
`NEXT_PUBLIC_SUPABASE_ANON_KEY` a nasaď.

**Proč to není zbytečné:** ten současný klíč je právě teď v ostrém balíčku na
`prochazkagroup.cz` **spolu s právem zapisovat** — ověřeno stažením toho
souboru. Po kroku 2 už zapisovat nesmí, ale ten konkrétní klíč byl publikovaný
v době, kdy směl. Po rotaci je veřejný anon klíč neškodný; tak je navržený.

---

## Co pak zbude

Nic blokujícího. Zůstane pár věcí označených jako „až před předáním" —
doplnit poradcům druhé fotky a tituly, nahradit zástupná jména „Jane Doe"
skutečnými (v živé tabulce `people` ta jména jsou) a vyplnit asistentku v
kontaktním panelu, která je zatím prázdný koncept.

---

## Když něco spadne

Každá migrace má v hlavičce napsáno, co dělá a co se rozbije, když neplatí
předpoklady. `pnpm cms:seed` bez parametru nikdy nic nezapíše, takže se dá
pouštět kolikrát chceš. A zkušební projekt se dá zahodit a založit znovu.

Pošli mi, co vypsal SQL editor, a projdeme to.
