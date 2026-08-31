# Knihovna médií a ořez

Co je řádek v knihovně, co s ním dělá ořez, a jedno pravidlo, které je potřeba
znát dřív, než někdo ořeže obrázek použitý na pěti místech.

## Dva druhy řádku

Knihovna má dnes 36 položek a **žádná z nich není v bucketu**. Jsou to soubory
zacommitované v repozitáři — `path` i `url` jsou `/assets/portraits/…`, tedy
cesty do `public/`. Seed je tam zapisuje přes `importRow()` právě proto, aby
nekopíroval assety webu do úložiště a pak neukazoval na kopii.

Nahraný soubor je ten druhý druh: klíč odvozený z obsahu
(`uploads/<dva znaky>/<hash>-<jméno>`), objekt v bucketu, `url` veřejná adresa.
Stejné bajty nahrané dvakrát jsou jedna položka — klíč je hash, takže se
duplikát sám sloučí.

Ořez umí obojí. U souboru z `public/` čte originál z repozitáře a výsledek
uloží do bucketu; **originál v `public/` zůstává nedotčený**.

## Co v knihovně je

116 položek. Původních 36 založil seed — byly to ty, na které odkazoval nějaký
seedovaný dokument. Zbytek doplnil `scripts/cms-import-public.mjs`, aby šlo
z knihovny vybrat i to, co na disku leží, ale nikdo na to zatím neodkázal:

| adresář | položek |
|---|---|
| `/assets/backgrounds` (vč. `bp_cards`, `partners`, `wheels`) | 54 |
| `/assets/benefit-cards` | 12 |
| `/assets/portraits/business` | 20 |
| `/assets/portraits/casual` | 6 |
| `/assets/zoom` | 7 |
| `/assets/video` | 3 |
| `/logos/orbit` | 14 |

**Co se schválně nebere:** `assets/svg` (SVG je nositel skriptu — `media.js` ho
při nahrávání odmítá a import přes tu kontrolu obcházet nebude), `assets/seo`
(patří do `<meta>`, ne na stránku), `assets/prebuild` (mezivýsledky) a `Fonts`.
Seznam adresářů je v hlavičce toho skriptu, i s důvody.

Skript nekopíruje bajty a je opakovatelný — cesta, která už v knihovně je, se
přeskočí.

### Filtry: složka a použití

Dvě roztřídění, **ani jedno není uložená taxonomie** — obojí se počítá.

**Složka** je cesta souboru. `/assets/portraits/casual/3.webp` je v casual
portrétech proto, že tam leží. Pro 116 souborů z toho vyjde přesně těch deset
skupin, které by někdo dělal ručně — což je zároveň argument, proč je ručně
nedělat. Nahrané soubory mají klíč `uploads/<dva znaky>/…`, jehož shard nic
neříká, takže se slévají do jedné skupiny místo do 256.

**Použití** je odpověď na „odkazuje na tenhle soubor nějaký dokument". Ze 116
souborů jich **74 neodkazuje nic** — a před tímhle filtrem nešlo poznat které.
V detailu souboru se vypíše, kde se používá; u nepoužitého je napsáno, že je
bezpečné ho archivovat.

Počítá se to v `server/mediaUsage.js`, ne ve sloupci. Sloupec `used_in` by byl
druhou kopií toho, co dokumenty už říkají, a každý zápis do obrázkového pole by
si ho musel pamatovat aktualizovat; jedno zapomenuté místo a knihovna začne
lhát o tom, co se smí smazat. Cena je jedno přečtení všech dokumentů — při 187
dokumentech jeden malý dotaz. Kdyby jich byly desetitisíce, odpovědí je index
v databázi, ne větší smyčka.

Za referenci se počítá **id i adresa** souboru, protože obě podoby jsou
v úložišti: pole vyplněné výběrem drží celý objekt, seedovaná a migrovaná těla
drží holou cestu. Hledat jen jednu z nich by hlásilo půlku pravdy.

Filtry jde kombinovat a kombinují se správně — „portréty business + použité"
vrátí 10, ne všech 42 použitých. Stálo to jeden přepis: první verze si ve větvi
s použitím brala celou knihovnu a ostatní podmínky zahodila.

### Chybí popisek

V liště knihovny je tlačítko **Chybí popisek (N)**. Přepne mřížku na soubory,
které popis nemají, a jak se u některého doplní a uloží, z výběru zmizí — takže
je to průchod, ne jen upozornění.

Číslo se počítá **na serveru napříč celou knihovnou**. Dřív ho sčítal prohlížeč
z právě načtené stránky, což při 116 souborech a stránce po 24 hlásilo „3 bez
popisu", zatímco jich bylo 83. Číslo, které se plete v uklidňujícím směru, je
horší než žádné.

Import z `public/` popisky schválně nevymýšlí — odhad z názvu souboru vyrobí
text, který už nikdo neopraví. Proto jich je po importu bez popisu většina a
tenhle průchod dává smysl.

### Video

Tři `.mp4` v knihovně jsou, ale platí o nich dvě věci:

- **Obrázkové pole je nenabídne.** `MediaLibrary` filtruje podle `accept` toho
  pole; video vložené do `image` pole by se na webu vykreslilo jako rozbitý
  `<img>` a schéma by to nezachytilo, protože objekt sám je platný.
- **Nahrát nové video přes Studio zatím nejde.** `ALLOWED_MIME` v
  `server/media.js` video neobsahuje. Rozšířit to je jedna řádka plus rozmyslet,
  co s rozměry — `sharp` mp4 nečte, takže u nich zůstávají prázdné.

## Ořez: jedna položka, vratně

Ořez **nezakládá novou položku**. Přepíše řádek na místě: stejné `id`, stejný
popisek, stejné zařazení v knihovně. To bylo zadání a je to i to, co dává smysl
— editor, který ořízne portrét, myslí „tenhle obrázek, zarámovaný takhle", ne
„tenhle obrázek a k němu skoro stejný o znak jinak pojmenovaný".

Přepis bajtů je normálně způsob, jak archiv shnije. Tady ne, kvůli dvěma věcem:

**Originál se nikdy nepřepíše.** `source_path` a `source_url` (migrace 0010) si
pamatují, kde leží, a **každý další ořez se počítá z něj**, ne z předchozího
výřezu. Proto jde rámeček zase rozšířit, posunout, nebo úplně zrušit tlačítkem
*Vrátit originál*. Ověřeno měřením: po ořezu na 600×300 prošel výřez 800×500,
což by z 600×300 nešlo.

**Obdélník se ukládá.** `crop` je `{x, y, width, height}` v pixelech
**originálu**. Bez něj by druhý ořez ořezával výřez a cesta zpátky k širšímu
rámu by neexistovala — pixely mimo něj v tom souboru prostě nejsou.

Ořez běží na serveru přes `sharp`, který projekt už má kvůli `next/image`.
Prohlížeč se souboru vůbec nedotkne, jen pošle obdélník — čímž odpadá problém
s CORS a „ušpiněným" plátnem, na který by ořez v prohlížeči narazil, jakmile
obrázek leží na jiné doméně než web.

## Ořez platí tam, kde ho uděláš

**Tohle je to pravidlo.** Ořez změní obrázek **v tom poli, které zrovna
upravuješ**. Jinde, kde je stejný obrázek použitý, zůstane původní rámování,
dokud ho tam někdo znovu nevybere.

Není to nedodělek, je to nutnost, a plyne z toho, jak jsou obrázky uložené:
tělo dokumentu nese **celý objekt** obrázku, ne odkaz na řádek knihovny (viz
`core/fieldTypes.js` — „kept whole in the document so the public site renders
without a second lookup"). Stránka tedy vykresluje tu adresu, se kterou byla
uložena.

Kdyby ořez měnil obrázek všude, znamenalo by to dvě věci, a obě jsou horší než
tohle pravidlo. Editor ořezávající portrét na jedné stránce by potichu
překreslil čtyři další, které neotevřel a neuvidí. A **stará verze v archivu by
přestala odpovídat tomu, co se tehdy publikovalo** — revize by ukazovala na
adresu, za kterou by mezitím byly jiné pixely. Právě proto, že archiv držíme
kvůli legislativě, je tohle pravidlo ta správná strana kompromisu.

Prakticky: ořez použitý na portrétu na `/o-nas` se neprojeví na
`/recenze/<slug>` téhož poradce, dokud tam obrázek znovu nevybereš.

## Co by se dalo dodělat, a proč zatím ne

Aby šel **jeden ořez použít na víc místech**, musel by mít vlastní identitu —
tedy vlastní řádek s vlastním `id`, odvozený od originálu, a v poli by se na něj
odkazovalo tím `id` místo dnešní vložené kopie objektu. Knihovna by pak uměla
ukázat „originál a jeho tři výřezy" jako skupinu a editor by výřez vybral stejně
jako jakýkoli jiný obrázek.

Zatím to hotové není a schválně:

- Znamenalo by to **odkaz místo vložené kopie** aspoň pro obrázky, tedy druhé
  čtení při každém vykreslení stránky — přesně to, čemu se dnešní tvar vyhýbá.
- Archiv by potřeboval vlastní odpověď na otázku, co se stane s revizí, která
  ukazuje na výřez, jenž mezitím někdo změnil.
- A hlavně to zatím nikdo nepotřebuje: dnešní chování řeší, co bylo zadáno, a
  přidat identitu později jde bez toho, aby se cokoli z toho, co je teď, muselo
  přepsat — `source_path` a `crop` jsou už dnes to, z čeho by se odvozený řádek
  dal vyrobit.

Až to bude potřeba, začíná se u `cms_media` (nový sloupec s odkazem na rodiče) a
u `core/fieldTypes.js`, kde se rozhodne, jestli pole nese objekt, nebo `id`.
