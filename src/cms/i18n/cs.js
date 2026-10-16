/**
 * Čeština — výchozí a ÚPLNÝ katalog.
 *
 * Úplný znamená, že sem patří každý klíč, který knihovna zná: chybějící
 * překlad padá sem (docs/I18N.md, „co s chybějícím překladem"), takže díra
 * tady je jediná díra, kterou nic nezachytí.
 *
 * Texty jsou PŘEPSANÉ ZNAK PO ZNAKU z míst, odkud se sem stěhovaly —
 * `src/core/rules.js`, `src/core/fieldTypes.js`,
 * `src/server/handlers/reviews.js`, `src/server/handlers/reactions.js`
 * a `src/manage/ManageWidget.jsx`. Weby, které na knihovně běží, ty věty
 * znají: mají je v testech, ve screenshotech a v hlavě. Vylepšit tečku nebo
 * velké písmeno není zlepšení, je to tichá změna chování — kdo chce jiné
 * znění, přepíše si ho přes `addMessages()`.
 *
 * Hodnota je řetězec, nebo POLE TVARŮ pro pluralizaci (viz ./plural.js);
 * v češtině tři: 1 / 2–4 / zbytek.
 */
export const cs = Object.freeze({
  /* ------------------------------------------------- pravidla validace -- */
  // src/core/rules.js — výchozí hlášky, když `.min(2, "…")` vlastní nedostane.
  "rule.required": "Povinné pole.",
  "rule.regex": "Neplatný formát.",
  "rule.email": "Neplatná e-mailová adresa.",
  "rule.url": "Neplatná adresa odkazu.",
  "rule.integer": "Musí být celé číslo.",
  "rule.positive": "Musí být kladné číslo.",
  "rule.unique": "Položky se nesmí opakovat.",
  "rule.custom": "Neplatná hodnota.",

  /* ------------------------------------------------------------- míry -- */
  // src/core/fieldTypes.js — co znamená min/max/length v té které míře.
  // `{n|unit.characters}` je skloňovaný tvar podle čísla `n`, viz ./index.js.
  "unit.characters": ["znak", "znaky", "znaků"],
  "unit.items": ["položku", "položky", "položek"],

  "measure.characters.min": "Musí mít alespoň {n} {n|unit.characters}.",
  "measure.characters.max": "Může mít nejvýše {n} {n|unit.characters}.",
  "measure.characters.length": "Musí mít přesně {n} {n|unit.characters}.",

  "measure.items.min": "Musí obsahovat alespoň {n} {n|unit.items}.",
  "measure.items.max": "Může obsahovat nejvýše {n} {n|unit.items}.",
  "measure.items.length": "Musí obsahovat přesně {n} {n|unit.items}.",

  "measure.value.min": "Musí být alespoň {n}.",
  "measure.value.max": "Může být nejvýše {n}.",
  "measure.value.length": "Musí být přesně {n}.",

  "measure.instant.min": "Nesmí být dříve než {at}.",
  "measure.instant.max": "Nesmí být později než {at}.",
  "measure.instant.length": "Musí být přesně {at}.",

  /* ------------------------------------------------- tvar hodnoty (check) -- */
  // src/core/fieldTypes.js — „tohle není ta věc, co sem patří".
  "check.string": "Očekáván text.",
  "check.richText": "Očekáván formátovaný text.",
  "check.number": "Očekáváno číslo.",
  "check.boolean": "Očekávána hodnota ano/ne.",
  "check.date": "Očekáváno datum ve tvaru RRRR-MM-DD.",
  "check.datetime": "Očekáváno datum a čas v ISO 8601.",
  "check.slug": "Očekávána URL adresa.",
  "check.slug.format": "Jen malá písmena, číslice a pomlčky.",
  "check.image": "Očekáván obrázek z knihovny médií.",
  "check.file": "Očekáván soubor z knihovny médií.",
  "check.reference": "Očekáván odkaz ve tvaru { _ref, _type }.",
  "check.reference.ref": "Odkaz nemá vyplněné _ref.",
  "check.reference.type": "Odkaz nemá vyplněné _type.",
  "check.reference.to": "Odkaz musí mířit na typ {types}.",
  "check.array": "Očekáván seznam.",
  "check.array.member": "Neznámý typ položky.",
  "check.array.memberNamed": 'Neznámý typ položky "{type}".',
  "check.object": "Očekávána skupina polí.",
  "check.select": "Neplatná volba.",
  "check.select.multiple": "Očekáván seznam voleb.",
  "check.url": "Očekávána adresa odkazu.",
  "check.url.invalid": "Neplatná adresa odkazu.",
  "check.url.scheme": "Nepodporovaný protokol odkazu.",
  "check.email": "Očekávána e-mailová adresa.",
  "check.email.invalid": "Neplatná e-mailová adresa.",

  // Spojka ve výčtu typů („článek nebo stránka"). Mezery kolem ní jsou
  // součástí textu, protože se jí `Array.prototype.join` spojuje.
  "list.or": " nebo ",

  /* ------------------------------------------------------ veřejná API -- */
  // src/server/handlers/reviews.js, .../reactions.js — jediné věty, které
  // knihovna posílá NÁVŠTĚVNÍKOVI cizího webu. Viz docs/I18N.md §8.
  "review.thanks": "Děkujeme za váš názor!",
  "review.rateLimited": "Recenzi jste už odeslali. Zkuste to prosím později.",
  "review.unknownConsultant": "Vybraný poradce neexistuje",
  "review.unknownConsultant.field": "Neznámý poradce",
  "reaction.rateLimited": "Příliš mnoho hlasů z jednoho místa, zkuste to prosím za chvíli",

  /* ---------------------------------------------------------- odznak -- */
  // src/manage/ManageWidget.jsx — čtyři texty v rohu veřejné stránky.
  "manage.region": "Správa webu",
  "manage.label": "Spravovat web",
  "manage.open": "Otevřít Studio",
  "manage.hide": "Skrýt do konce návštěvy",
})
