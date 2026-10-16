# Archiv verzí — návrh

Plán, ne stavba. U archivu, který má obstát v úředním nebo soudním kontextu,
rozhoduje návrh: systém, který tvrdí „takhle web vypadal 3. března", ale ve
skutečnosti znamená „tohle jsou staré texty nalité do dnešního rozvržení", je
horší než žádný — je to sebejistá nepravda.

## Co určuje, co návštěvník viděl

Pět vstupů. Kolik z nich umíme zachytit, rozhoduje o tom, co archiv dokazuje.

| # | Vstup | Zachytitelný? |
|---|---|---|
| 1 | **Těla dokumentů** — texty, čísla, odkazy | **ano, přesně** |
| 2 | **Soubory médií** — fotky, loga | **ano** — a skoro zadarmo, viz níže |
| 3 | **Kód komponentů** — rozvržení, animace, zabudované záložní texty | **ne** — jen pojmenovat |
| 4 | **Konfigurace** (`cms.config.js`) — které bloky stránka má | ano |
| 5 | **Které dokumenty byly publikované** — stav a archivace | ano |

Bod 3 je jediná mez, kterou nejde vyřešit inženýrsky, jen přiznat.

## Čtyři fakta, na kterých návrh stojí (ověřená)

**Publikování dnes předchozí verzi ničí.** `documents.js:112` přepisuje `data`
na místě. Historie se tedy už teď každým publikováním ztrácí — hodiny začnou
běžet dnem, kdy tohle vznikne, a zpětně se nedá zrekonstruovat nic.

**Nahrané soubory jsou adresované obsahem.** `ports/storage.js:94` staví klíč
jako `uploads/<shard>/<hash16>-<jméno>`. Nová fotka = nový klíč, takže výměna
obrázku **starý soubor nepřepíše**. Stará verze si tím drží svoje skutečné
obrázky bez jakékoli další práce. To je z nich to nejcennější a vzniklo to
kvůli něčemu jinému.

**Ale mazání média je tvrdé.** `media.js:227` smaže řádek i objekt. Redaktorka,
která uklidí knihovnu, tím **zničí historii**. Archiv je důvěryhodný přesně
potud, pokud se média nikdy nemažou natvrdo.

**Stránka už umí renderovat z jiné sady dokumentů.** Náhled konceptu je jedna
páka v `page.js` — `readPublished` vs `readEditable`. „Ke dni T" je tatáž páka
s třetí čtečkou. Celý rám, viewporty i zvětšení se použijí beze změny.

## Návrh

### Vrstva 1 — revize

Jeden řádek při každém přechodu, který mění, co veřejnost vidí — publikovat,
stáhnout, archivovat, obnovit. Tedy **na stejném místě, kam se právě zavěsila
revalidace**, což je jediné místo v systému, kde se to dá zachytit celé.

```
cms_document_revision
  id · document_id · type · body(jsonb) · status · archived_at
  changed_at · changed_by · reason        -- publish | unpublish | archive | restore
```

Objem roste s **počtem změn**, ne s velikostí webu: jedno publikování = jedno
tělo, ne 125. Při dvou úpravách denně je to řádově pár set kilobajtů za rok.

### Vrstva 2 — stav webu k okamžiku

„Co bylo publikované v čase T" je dotaz, ne uložený snímek: pro každý dokument
poslední revize s `changed_at <= T`, u které `status = 'published'`. Žádné
duplikáty, žádné snímky celého webu.

Pozor na jednu past: seznamy mají limity (`reviews: { limit: 12 }`). Přehrání
staré sady musí použít **tehdejší** limit, jinak se ukáže dvanáct recenzí, které
vedle sebe nikdy nestály.

### Vrstva 3 — stránka Archiv

Seznam v levém sloupci Studia: časová osa změn — kdy, kdo, co a proč. Klik
otevře **web v rámu, vykreslený ke zvolenému okamžiku**. Tentýž rám, tytéž
viewporty, tytéž stránky jako náhled — jen třetí čtečka.

**Archiv je záznam, ne pracovní plocha.** Nic v něm nejde upravovat a overlay se
v něm nenasazuje. Obnovení staré verze je samostatná, vědomá akce, která zapíše
do **konceptu** — aby i návrat prošel schválením, ne aby přepsal web klikem.

### Vrstva 4 — média se přestanou mazat

`media.remove` se změní na archivaci, stejně jako u dokumentů: řádek zůstane,
soubor zůstane, z knihovny zmizí. Bez toho archiv shnije zevnitř a nikdo si toho
nevšimne, dokud ho nebude potřebovat.

### Vrstva 5 — mez, kterou je nutné napsat na obrazovku

Ke každé revizi se zaznamená **identita nasazení** (commit, číslo buildu). Archiv
pak umí říct: *tohle je obsah z 3. března, přehraný dnešním kódem; kód z té doby
byl `abc1234`.* To je pravdivé tvrzení. „Takhle web vypadal" pravdivé není a
nesmí tam být napsané.

## Co tohle dokazuje a co ne

**Dokazuje:** co bylo na webu napsané, které fotky u toho byly, kam odkazovaly
odkazy, kdy se to změnilo a kdo to udělal. Na drtivou většinu sporů o obsah to
stačí.

**Nedokazuje:** jak stránka vypadala. Kdyby se dnes změnilo rozvržení, přehraje
se starý text novým kódem.

Pokud je potřeba i to druhé — a u veřejných zakázek bývá — je na to jiná věc:
**neměnný otisk stránky** (HTML plus soubory, uložené tak, jak se odeslaly).
Standardem je WARC. Je to řádově dražší na místo a je to samostatná vrstva, ne
rozšíření téhle. Navrhuju ji nestavět teď, ale postavit vrstvy 1–5 tak, aby ji
šlo přidat vedle.

## Pořadí a rizika

1. **Revize** (vrstva 1) — samostatně užitečné hned: vrací „vrať to zpátky",
   které dnes neexistuje, protože publikování starou verzi přepíše.
2. **Média se přestanou mazat** (vrstva 4) — **dřív než archiv**, jinak vznikají
   revize, které už teď ukazují na soubory, jež někdo zítra smaže.
3. Stav k okamžiku a stránka Archiv (vrstvy 2–3).
4. Identita nasazení a text o mezích (vrstva 5).

**Doplněno později — zamítnutí recenze.** Schvalovací fronta uměla jediné
„zamítnout": smazat. Recenze jsou spotřebitelské a novela zákona o ochraně
spotřebitele (omnibus) po firmě chce, aby uměla doložit, jak s nimi nakládá — a
aby nepotlačovala ty nepříznivé. Smazaná recenze nedokládá nic. Zamítnutí je
proto archivace plus důvod: `archived_at` na dokumentu, tři pole v těle
(`rejectedAt`, `rejectedBy`, `rejectedReason`) a řádek v revizích s
`reason = 'reject'`. Ničí se dál jedině ručně a jedině v Archivu — což je přesně
to, na čem trvá odstavec výš.

**Riziko, které je třeba říct nahlas:** archiv obsahuje **všechno, co kdy bylo
publikované**, včetně toho, co někdo později stáhl. To je jeho smysl a zároveň to
znamená, že přístup do něj patří vlastníkovi, ne každému redaktorovi — a že
smazání osobního údaje na žádost (GDPR) musí umět sáhnout i do revizí. Právo na
výmaz nemá výjimku pro zálohy.

---

# Rozhodnuto

Rozsah: **obsahový archiv** (vrstvy 1–5). Neměnné otisky stránek (WARC) se teď
nestaví; vrstvy 1–5 se staví tak, aby šly přidat vedle.

## Mazání je ruční, a je jediné

Nic se nemaže samo — ani médium, ani revize, ani stará verze. Automatický úklid
by z archivu udělal něco, čemu nejde věřit, protože by v nejhorší chvíli chybělo
přesně to, co je potřeba.

**Všechno ničení žije na jednom místě: v Archivu.** `media.remove` se mění na
archivaci, mazací tlačítka jinde mizí. Kdo chce něco opravdu zničit, jde do
Archivu a udělá to vědomě.

Potvrzení, doslova: *„Jste si opravdu jisti? Tato akce nelze vrátit zpět."* —
a nad ním **co přesně zmizí**: kolik revizí, které dny, kolik souborů, kolik
místa. Stejná kázeň, jakou už má potvrzení publikování, které jmenuje bloky.

**Co smazat nejde:** revizi, která je zároveň dnes publikovaným tělem. To není
historie, to je web. Musí to odmítnout server, ne jen schované tlačítko.

## Tři podstránky

| Podstránka | Co ukazuje |
|---|---|
| **Změny** | časová osa: kdy, kdo, co, proč. Klik → web ke zvolenému okamžiku |
| **Texty** | každá verze každého textu: který blok, co říkal, od kdy do kdy |
| **Média** | každý soubor, který kdy v knihovně byl: náhled, jméno, **nahráno** i **publikováno**, kde se používal, jestli se používá dnes |

**„Nahráno" a „publikováno" jsou dvě různá data** a obě jsou potřeba: soubor se
nahraje v jednu chvíli a poprvé se objeví na webu jindy — někdy o týdny později,
někdy nikdy. Archiv, který zná jen jedno, odpovídá na jinou otázku, než na jakou
se ptají.

## Tabulky

```
cms_document_revision
  id · document_id · type · body(jsonb) · status · archived_at
  changed_at · changed_by · reason        -- publish | unpublish | archive | restore
                                          -- + reject | requeue (moderace recenzí,
                                          --   migrations/0008)
  build_id                                -- identita nasazení, viz vrstva 5

cms_media_archive                          -- soubor, který z knihovny zmizel
  media_id · uploaded_at · archived_at · first_published_at
```

`first_published_at` se dopočítá při zápisu revize: první revize se
`status = 'published'`, jejíž tělo ten soubor zmiňuje.

## Kdo tam smí

Vlastník. Archiv obsahuje **všechno, co kdy bylo publikované**, včetně toho, co
někdo později stáhl — to je jeho smysl a zároveň důvod, proč to není pro každého
redaktora. Server to kontroluje na každém požadavku, ne skrytím položky v menu.

---

## Ořez obrázku a archiv

Ořez přepisuje řádek `cms_media` na místě, což by na první pohled bylo přesně
to, čemu tenhle dokument brání. Není: originál se nikdy nepřepíše ani nesmaže
(`source_path`), a tělo dokumentu nese obrázek celý, takže revize ukazuje na
adresu, kterou tehdy publikovala — ne na to, co řádek říká dnes. Podrobně
v `MEDIA.md`.

## Publikování beze změny nezakládá verzi

Měřeno: tři POSTy na `/publish` u nedotčeného dokumentu vyrobily tři řádky
v `cms_document_revision` se shodným tělem. Archiv se drží proto, aby šlo
odpovědět „co web říkal k tomuhle datu", a řada identických verzí tu odpověď
ztěžuje, ne usnadňuje.

`publish()` proto vrací `unchanged: true`, když je tělo, které má publikovat,
už to publikované — handler pak přeskočí zápis revize i revalidaci.
Není to chyba a nehlásí se jako chyba: editor stiskl tlačítko, které mu bylo
nabídnuto. `published_at` se nepřepisuje, protože znamená „kdy veřejnost naposled
viděla něco nového", a stisk, který nic nezměnil, tím okamžikem není. Koncept,
který je kopií publikovaného těla, se cestou zahodí — to je stav, který uklízí
migrace 0009.

Druhá polovina je v `DocumentEditorView`: tlačítko *Publikovat změny* zešedne,
když není co publikovat. Pravidlo ale drží server, protože pravidlo vynucované
jen v rozhraní obejde každá zapomenutá záložka.
