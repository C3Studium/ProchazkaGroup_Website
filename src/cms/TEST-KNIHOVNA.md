# Osamostatnění knihovny — co otestovat

Dva zásahy z 29. 8. 2026. Obojí mělo být **beze změny chování** — účelem bylo
odstřihnout `src/cms` od tohohle konkrétního webu, ne cokoli předělat. Každá
kontrola níže má napsaný očekávaný výsledek; když sedí, změna prošla.

Web musí běžet na `localhost:3000` (`pnpm dev` běží na 3690, tenhle seznam
předpokládá port, na kterém testujete).

---

## Co se změnilo

**1. Styly.** `src/cms` už nesahá do `src/styles/system`. Vlastní zlomy má
v `styles/_viewport.scss` se stejnými hodnotami. Zároveň bylo nutné upravit
`scripts/sync-styles.js`: ten import **sám vpisoval** do každého `.scss` pod
`src/` a dělal to znovu při každém buildu, takže ručně smazaný se vždycky
vrátil. Teď `src/cms` přeskakuje.

**2. Typy obsahu.** Pět typů tohohle webu (`partner`, `consultant`,
`assistant`, `offer`, `qna`) se přesunulo do `src/content/types/`. Seznam typů
je nově v `src/lib/cms.types.mjs`. V knihovně zůstaly `siteCopy`, `review`
a `marks` — to nejsou obsah, ale mechanismy, na kterých stojí config a fronta
recenzí.

---

## Kontroly

### 1. Build

```bash
pnpm build
```

Čekejte **EXIT=0** a žádné `Error:`. Build zahrnuje `sync:styles`, takže tímhle
zároveň ověříte, že se importy do `src/cms` nevracejí.

### 2. Hranice knihovny

```bash
grep -rnE "from ['\"](\.\./){3,}" src/cms --include='*.js' --include='*.jsx'
grep -rn 'styles/system' src/cms --include='*.scss' | grep '@use'
```

První musí vrátit **přesně tři řádky** — dvakrát `site/config.js`, jednou
`site/types.js`. Druhý **nic**. Čtvrtý řádek nebo jakýkoli výstup z druhého
znamená, že knihovně narostla vazba zpátky na tenhle web.

### 3. Sync stylů nechává knihovnu být

```bash
pnpm sync:styles
```

Čekejte `28 owned by the CMS` a `0 shortcut paths updated`. Pak znovu
kontrolu 2 — musí dopadnout stejně.

### 4. Web se nezměnil

```bash
for u in / /o-nas /cookies /ochrana-soukromi /nabidka /nabidky \
         /benefit-program /recenze /recenze/prochazka-vaclav /kontakt; do
  printf '%-28s %s %s B\n' "$u" \
    "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$u)" \
    "$(curl -s http://localhost:3000$u | wc -c)"
done
```

Všechno **200**. Naměřeno po zásahu:

| adresa | bajtů |
|---|---|
| `/` | 164 066 |
| `/o-nas` | 143 869 |
| `/cookies` | 97 489 |
| `/ochrana-soukromi` | 93 808 |
| `/nabidka` | 330 839 |
| `/nabidky` | 95 322 |
| `/benefit-program` | 162 202 |
| `/recenze` | 101 925 |
| `/recenze/prochazka-vaclav` | 85 468 |
| `/kontakt` | 79 461 |

`/` na bajt souhlasí se stavem před celým remodelem, což je nejsilnější
jednotlivý důkaz, že se nic neposunulo.

### 5. Anotace sedí s configem

```bash
pnpm cms:audit
```

Čekejte `celkem 0 nálezů na 9 adresách`.

### 6. Všech sedm typů je registrovaných

Přihlaste se a projděte typy:

```bash
for t in siteCopy partner consultant assistant review offer qna neexistujici; do
  curl -s -b cookies.txt -o /dev/null -w "$t %{http_code}\n" \
    "http://localhost:3000/api/cms/documents?type=$t"
done
```

Sedm × **200**, `neexistujici` **404**. Tohle je ta kontrola, která by chytila
špatně přesunutý typ — registr se plní tím, že se soubor vyhodnotí.

### 7. Jméno poradce se pořád skládá

Nejrizikovější místo celé změny: `consultantFullName` se přestal importovat
přímo a chodí se pro něj přes `displayNameOf`.

```bash
curl -s http://localhost:3000/recenze/prochazka-vaclav | grep -o 'Václav Procházka' | head -1
curl -s http://localhost:3000/o-nas | grep -coE 'Procházka|Forejt|Ing\.'
```

První musí něco najít, druhý čekejte **28**.

### 8. Studio ve třech šířkách

Otevřete `/studio`, `/studio/edit` a `/studio/archive` na 390 px, 760 px
a naplno. Zlomy se přepsaly na knihovní; vygenerované media query jsou
doslova stejné jako předtím (ověřeno v sestaveném CSS), ale prohlédnout to
okem stojí za to — je to jediná část, kterou žádný z předchozích testů
nevidí.

---

## Co tyhle testy **neověřují**

- **Nic proti skutečné Supabase.** Pořád běží souborové úložiště
  `.cms-dev/store.json`, migrace nikdy neproběhly. Viz `NASAZENI.md`.
- **Že je knihovna přenositelná.** Ověřují jen, že už nesahá ven. Skutečný
  důkaz je zkusit `src/cms` + `cms.config.js` + `cms.types.mjs` zkopírovat do
  prázdného projektu na Pages Routeru — to zbývá.
- **Čeština a App Router.** Nedotčeno; viz seznam na konci `LIBRARY.md`.

## Drobnost k prohlédnutí

`pnpm cms:seed` (nanečisto) hlásí u `siteCopy-h11` `image Očekáván obrázek
z knihovny médií`. S přesunem typů to nesouvisí — `siteCopy` v knihovně
zůstal a jeho pole se neměnila — ale neověřoval jsem, jestli to hlásil
i dřív. Stojí za jeden pohled, až se bude seed pouštět naostro.
