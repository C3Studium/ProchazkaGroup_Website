/**
 * Angličtina — druhý jazyk katalogu.
 *
 * Nemusí být úplná: co tu chybí, spadne na češtinu (./index.js). Dnes tu
 * chybět nic nemá — vzniklo to jedním překladem celého `cs`.
 *
 * Skloňování má DVĚ formy, ne tři. To je celý důvod, proč pravidlo patří
 * jazyku a ne hlášce: kdyby se tvary vybíraly českým pravidlem, „1 characters"
 * by prošlo bez jediné chyby.
 */
export const en = Object.freeze({
  /* --------------------------------------------------- validation rules -- */
  "rule.required": "Required field.",
  "rule.regex": "Invalid format.",
  "rule.email": "Invalid e-mail address.",
  "rule.url": "Invalid link address.",
  "rule.integer": "Must be a whole number.",
  "rule.positive": "Must be a positive number.",
  "rule.unique": "Items must not repeat.",
  "rule.custom": "Invalid value.",

  /* -------------------------------------------------------------- units -- */
  "unit.characters": ["character", "characters"],
  "unit.items": ["item", "items"],

  "measure.characters.min": "Must have at least {n} {n|unit.characters}.",
  "measure.characters.max": "May have at most {n} {n|unit.characters}.",
  "measure.characters.length": "Must have exactly {n} {n|unit.characters}.",

  "measure.items.min": "Must contain at least {n} {n|unit.items}.",
  "measure.items.max": "May contain at most {n} {n|unit.items}.",
  "measure.items.length": "Must contain exactly {n} {n|unit.items}.",

  "measure.value.min": "Must be at least {n}.",
  "measure.value.max": "May be at most {n}.",
  "measure.value.length": "Must be exactly {n}.",

  "measure.instant.min": "Must not be earlier than {at}.",
  "measure.instant.max": "Must not be later than {at}.",
  "measure.instant.length": "Must be exactly {at}.",

  /* ------------------------------------------------------- value shapes -- */
  "check.string": "Expected text.",
  "check.richText": "Expected formatted text.",
  "check.number": "Expected a number.",
  "check.boolean": "Expected a yes/no value.",
  "check.date": "Expected a date in the form YYYY-MM-DD.",
  "check.datetime": "Expected a date and time in ISO 8601.",
  "check.slug": "Expected a URL address.",
  "check.slug.format": "Only lowercase letters, digits and hyphens.",
  "check.image": "Expected an image from the media library.",
  "check.file": "Expected a file from the media library.",
  "check.reference": "Expected a reference in the form { _ref, _type }.",
  "check.reference.ref": "The reference has no _ref.",
  "check.reference.type": "The reference has no _type.",
  "check.reference.to": "The reference must point at type {types}.",
  "check.array": "Expected a list.",
  "check.array.member": "Unknown item type.",
  "check.array.memberNamed": 'Unknown item type "{type}".',
  "check.object": "Expected a group of fields.",
  "check.select": "Invalid choice.",
  "check.select.multiple": "Expected a list of choices.",
  "check.url": "Expected a link address.",
  "check.url.invalid": "Invalid link address.",
  "check.url.scheme": "Unsupported link protocol.",
  "check.email": "Expected an e-mail address.",
  "check.email.invalid": "Invalid e-mail address.",

  "list.or": " or ",

  /* ---------------------------------------------------------- public API -- */
  "review.thanks": "Thank you for your feedback!",
  "review.rateLimited": "You have already sent a review. Please try again later.",
  "review.unknownConsultant": "The selected consultant does not exist",
  "review.unknownConsultant.field": "Unknown consultant",
  "reaction.rateLimited": "Too many votes from one place, please try again in a moment",

  /* --------------------------------------------------------------- badge -- */
  "manage.region": "Site management",
  "manage.label": "Manage site",
  "manage.open": "Open Studio",
  "manage.hide": "Hide for this visit",
})
