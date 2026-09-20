# Telefonní předvolby — nativní funkce Studia

Které země si návštěvník může vybrat před telefonním číslem. **Hotové
a nasazené.** Tenhle dokument říká, kde to bydlí, proč je to funkce nástroje
a ne obsah webu, a co z toho ještě zbývá.

---

## 1. Kde to je

| Soubor | Role |
| --- | --- |
| `dialPrefixes.data.js` | výchozí seznam, bez jediného importu |
| `dialPrefixes.js` | co si bere WEB — `useDialPrefixes()`, `fullPhoneNumber()`, `DEFAULT_DIAL` |
| `server/dialPrefixes.js` | uložený seznam: jeden řádek `cms_setting`, validace, čtení a zápis |
| `server/handlers/dialPrefixes.js` | `GET` / `PUT` na `/api/cms/dial-prefixes` |
| `server/handlers/index.js` | `case 'dial-prefixes'` v routeru |
| `server/httpDataPort.js` | `port.settings.dialPrefixes` |
| `studio/dev/devPort.js` | tentýž název v `notInDevPort` — viz §4 |
| `studio/views/SettingsView.jsx` | panel **Telefonní předvolby** v Nastavení |

Web z toho používá jednu řádku:

```js
import { useDialPrefixes, fullPhoneNumber, DEFAULT_DIAL } from "@/cms/dialPrefixes"
```

Žádný typ dokumentu, žádné fixtury, žádný čtenář v `getStaticProps`, žádný
kontext protažený řetězem propů. Knihovna si seznam stáhne sama.

---

## 2. Proč je to nastavení nástroje

Obojí bylo napsané a to druhé zahozené, takže to není domněnka.

Jako **typ dokumentu** to fungovalo a mělo tři vady. Seznam stál v postranním
menu vedle Poradců a Recenzí — tedy vedle věcí, které editor mění týdně, ačkoli
na předvolby sáhne jednou za rok. Každá další instalace knihovny si ten typ
musela napsat znovu, včetně fixtur a čtenáře. A hlavně: *„+420 je Česko" není
obsah.* Je to číselník, platí stejně na každém webu na světě a nikdo ho
nevymýšlí — kdežto všechno ostatní v `cms_document` napsal člověk, který za to
odpovídá.

Číselník, který je pro všechny instalace stejný, patří do nástroje. Proto
`DIAL_PREFIX_DEFAULTS`: čistá instalace předvolby **umí**, aniž by kdokoli
cokoli zakládal, a řádek v `cms_setting` vzniká teprve ve chvíli, kdy se
vlastník rozhodne ten výchozí seznam změnit.

**Pořadí je pořadí v poli.** Žádné číslo `order` a žádný přepínač `active`:
seznam v nastavení je seznam, ze kterého se řádky přesouvají a mažou, a číslo
pořadí vedle šipek je druhá pravda o tomtéž. Zemi, kterou nechcete nabízet,
smažete. **První země je předvybraná** — tak se nastavuje výchozí předvolba,
místo dalšího zaškrtávátka, které jde zaškrtnout dvakrát.

---

## 3. Tři věci, které se nesmí rozbít

**Klient nesmí vidět server.** `server/dialPrefixes.js` sahá na
`getAdminClient()` a servisní klíč; `dialPrefixes.js` jede v prohlížeči
návštěvníka. Proto výchozí seznam nebydlí ani v jednom, ale ve třetím souboru
bez importů. Import přes ten šev je bezpečnostní chyba, ne stylistická.

**`GET` je bez session, `PUT` jen vlastník.** Čtení potřebuje formulář
v prohlížeči návštěvníka, který session nemá a mít nemá, a odpovídá se číselníkem
států. Zápis se kontroluje v handleru, při každém volání.

**Proč to není pod `/api/cms/settings/*`.** `handlers/settings.js` drží
invariant „vlastník, zkontrolovaný před jakoukoli větví", takže trasa přidaná
tam nemůže přijít bez té kontroly. Veřejně čitelný endpoint by byl ta výjimka,
kvůli které ta věta přestane platit — a jedné výjimky v seznamu deseti si nikdo
nevšimne. Přesně tak a ze stejného důvodu to má `handlers/widget.js`.

---

## 4. Rozhodnutí, která se při čtení kódu neuhodnou

**Dev port to odmítá, místo aby to stuboval.** Formuláře na webu čtou skutečný
endpoint, takže seznam upravený proti stubu by žil jen v jedné záložce
a obrazovka by hlásila země, které pole telefonu nenabízí. Stejný závěr
a stejná formulace jako u štítku „Spravovat web". Nikoho to o nic nepřipraví:
čistá instalace předvolby umí i bez řádku v databázi.

**Prázdná odpověď = výchozí seznam, ne chyba.** Chybějící řádek, nezmigrovaná
databáze, úložiště, které klíč nikdy nedrželo, i úložiště, které vůbec neběží.
`try/catch` je kolem všeho, ne jen kolem dotazu — v produkčním buildu bez
`SUPABASE_SERVICE_ROLE_KEY` hodí `getAdminClient()` výjimku dřív, než se dotaz
sestaví, takže kontrola vráceného `error` ji nikdy neuvidí.

**Validace odmítá, `coerce` přežívá.** Zápisy jdou přes `validate` a hlásí
číslo řádku; čtení jde přes `coerce`, které zahodí, co nedává smysl. Ta
nesouměrnost je záměr: vlastníkovi, který napíše „420", se to řekne, a řádek,
který to nějak obsahuje, web nepoloží.

**`DEFAULT_DIAL` je výchozí seznam, ne ten nastavený.** Je to konstanta pro
`const EMPTY = {...}` nad komponentou, kde se na hook nedosáhne — a v tu chvíli
ještě není co načíst. Dorovnává to `DialPrefix`: když se hodnota v načteném
seznamu nenajde, srovná ji na první položku a formuláři to oznámí.

---

## 5. Co zbývá: typ pole `phone`

Jediný krok, který hotový **není**. Seznam je nativní; telefonní číslo jako
*pole dokumentu* zatím ne — `consultant.phone` je pořád `string` s regexem a to,
že k němu patří předvolba, ví jen web, ne schéma.

Do `core/fieldTypes.js`, do pole `definitions`:

```js
{
  name: "phone",
  title: "Telefon",
  kind: "text",
  input: "phone",
  scalar: false,                       // { dial, number }
  zero: () => ({ dial: "", number: "" }),
  check: (value) => ...,
  isEmpty: (value) => !String(value?.number || "").trim(),
  supports: ["min", "max", "regex"],
  ui: (entry, field) => ...,
  toDisplay: (value) => [value?.dial, value?.number].filter(Boolean).join(" "),
}
```

Vstup do `studio/fields/inputs/` a `registerInput("phone", PhoneInput)`; registr
v `studio/fields/registry.js` řeší zbytek — **nikde se nesmí objevit switch podle
jména typu**, to je jeho celý smysl. Seznam si vstup vezme z `useDialPrefixes()`,
tedy z téhož místa jako web.

`toDisplay` vrací složené číslo, protože to je, co uvidí seznam dokumentů
a preview — a samotné „777 111 222" je číslo, na které se nedá odnikud zavolat.

Pozor: je to **změna tvaru uložené hodnoty**. `consultant.phone` je dnes string
a dokumenty, které ho tak mají, existují; převod potřebuje vlastní jednorázový
skript s dry runem, jako měl převod předvoleb samotných.

---

## 6. Čím to ověřit

- `node scripts/cms-audit.js` — devět adres, nula nálezů.
- `pnpm run build` — projde i Studio, které audit nerenderuje.
- `GET /api/cms/dial-prefixes` bez přihlášení → 200 a seznam.
  `PUT` bez přihlášení → 401.
- `/studio/settings` → přehodit pořadí → Uložit → načíst formulář na webu
  a zkontrolovat, že se předvybírá první země.
- Formuláře s telefonem jsou čtyři: úvodní stránka (`ChooseAdvisor`), QnA na
  téže stránce, benefit program a kontaktní arch z lišty.

Stránky jedou na ISR s desetiminutovým oknem, takže se změna na nasazeném webu
projeví do deseti minut. Ne u předvoleb — ty se stahují za běhu, a proto je
nastavení vidět při dalším načtení stránky.
