# TODO

Věci, které čekají na rozhodnutí nebo na údaj zvenčí. Kód je hotový, chybí vstup.

---

## 1. Google Place ID — pro předání recenze na Google

**Stav:** kód hotový a otestovaný, čeká jen na hodnotu.

### Co to je

Place ID je trvalý identifikátor jednoho konkrétního místa v mapách Googlu —
kanceláře na Smetanově 78/1 v Písku. Vypadá jako `ChIJN1t_tDeuEmsRUsoyG83frY4`:
nesmyslný řetězec, ale je stabilní. Nemění se, když se přejmenuje firma nebo
upraví adresa, a proto se na něj dá odkazovat natrvalo.

Potřebujeme ho k jediné věci: složit odkaz na **formulář Googlu pro psaní
recenze**, který vypadá takto:

```
https://search.google.com/local/writereview?placeid=<PLACE_ID>
```

### Jak ho získat

1. Otevřít **Place ID Finder**:
   https://developers.google.com/maps/documentation/places/web-service/place-id
2. Do vyhledávacího pole na mapě napsat `Procházka Group Písek`
   (nebo adresu `Smetanova 78/1, Písek`).
3. Kliknout na správnou špendlíkovou značku — v bublině se ukáže název
   a pod ním **Place ID**.
4. Zkopírovat.

Kontrola, že je správné: vložit ho do odkazu výše a otevřít v prohlížeči.
Musí naskočit formulář Googlu s názvem *Procházka Group*. Když naskočí jiná
firma nebo chyba, je to špatný identifikátor.

### Kam ho zapsat

Do `.env`:

```
NEXT_PUBLIC_GOOGLE_PLACE_ID=ChIJ...
```

A na Vercelu do proměnných prostředí projektu, jinak to poběží jen lokálně.

### Co se tím zapne

Na kartě poradce (`/recenze/<slug>`) se **po odeslání recenze** objeví druhý
krok: tlačítko *Zkopírovat text* a *Otevřít Google*. Návštěvník má svůj text ve
schránce a Googlu se otevře jeho prázdný formulář.

**Dokud je proměnná prázdná, ten blok se vůbec nevykreslí** — na stránce, kam
vede vytištěný QR kód, je mrtvý odkaz horší než žádná nabídka. Nic jiného se
nastavovat nemusí, zapne se to samo.

### Proč to nejde bez toho kopírování

Google **nedovoluje zapsat recenzi přes API** — ani nám, ani nikomu jinému.
Business Profile API umí recenze číst a odpovídat na ně, ale ne vytvořit. A do
jeho formuláře nejde předvyplnit text; URL triky, které kdysi uměly aspoň
předvybrat hvězdičky, Google zavřel a odkaz, který se o to pokouší, porušuje
jejich pravidla.

Takže „vyplní u nás formulář a objeví se to i na Googlu" automaticky nejde.
Dvoukrokové předání se schránkou je strop toho, co je povolené.

### Na co si dát pozor

Ten druhý krok se nabízí **každému, kdo recenzi napsal**. Kód vůbec neví, jestli
je pochvalná, a tak to má zůstat: posílat na Google jen spokojené je *review
gating* a Google to zakazuje.

---

## 2. Odesílání formulářů — chybí šablona a schránka

**Stav:** dva formuláře validují, ale neodesílají.

- `ChooseAdvisor` na hlavní stránce (žádost o zavolání)
- dřívější varianta karty poradce (dnes už je to recenze, takže se to týká jen
  hlavní stránky)

`useResend` čeká na **název e-mailové šablony** a **adresu, kam to má chodit**.
Obojí je rozhodnutí, ne kód. Do té doby formulář poctivě řekne, že odesílání
není napojené — nevymýšlí si cíl.

---

## 3. Dva různé seznamy poradců

**Stav:** k rozhodnutí.

V CMS je 10 poradců (Procházka, Svobodová, Dvořák, Nováková, Kučera, Marková,
Beneš, Horáková, Pokorná, Kříž). V `src/constants/people.js` je jiná sestava
(Efenberk, Filipská, Furbachová, Kaslová, dvě Markové, Matouš, Posnerová,
Štofflová, Vituj). **Společný je jediný — Václav Procházka.**

Důsledky:

- stránky `/recenze/<slug>` se generují z CMS, takže existují jen pro těch 10
- staré složky `src/pages/reviews/<příjmení>-<jméno>` jsou prázdné skořápky
  (obsah zakomentovaný od remodelu) a **přesměrovat je nelze** — nejsou to titíž
  lidé
- sekce „Naši kolegové" na `/o-nas` čte `people.js`, ne CMS

Rozhodnout, který seznam platí. Pak buď doplnit lidi do CMS, nebo smazat staré
složky a přepojit `/o-nas` na CMS.

---

## 4. QR kódy do Studia

**Stav:** navrženo, nezačato.

Každý poradce má mít v editaci ve Studiu QR kód na svoji stránku
`/recenze/<slug>`, ke stažení v SVG (pro tisk) a PNG. Generovat na klientovi —
QR je čistá funkce z textu, server k tomu není potřeba. V projektu zatím žádná
QR knihovna není.

Dvě věci do zadání: kód se ukáže jen když má poradce vyplněný `slug` (jinak by
vedl na 404) a vedle se vypíše cílová URL, ať je při korektuře vizitky vidět,
kam to míří.

---

## 5. Mobilní zobrazení nových stránek

**Stav:** napsané, neproklikané.

`/nabidky` i `/recenze` mají mobilní rozvržení napsané, ale neověřené na
skutečném zařízení. Karta poradce `/recenze/<slug>` je stavěná pro telefon
a ověřená byla.

---

## 6. Zbytek webu

Obsah je pořád zakomentovaný na `/kontakt`, `/benefit-program`, `/cookies`
a `/ochrana-soukromi`.
