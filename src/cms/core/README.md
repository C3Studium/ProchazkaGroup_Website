# `@/cms/core` — the schema layer

Contract 1 of [SPEC.md](../SPEC.md). Declare content types in config, get back
something the Studio can render and the server can trust.

Pure JavaScript, no dependencies, no build step, no I/O. Every function here is
synchronous and side-effect free apart from the type registry itself. That is
what lets the same validation run in the browser on a keystroke and on the
server on a write and produce the same answer.

```js
import { defineType, defineField, getType, listTypes,
         validateDocument, emptyDocument, FIELD_TYPES } from "@/cms/core"
```

Run `node src/cms/core/selfcheck.js` after changing anything in this folder.

---

## Declaring a type

```js
defineType({
  name: "review",            // stable id — this is cms_document.type, never rename it
  title: "Recenze",
  icon: "star",              // key into the Studio's icon set
  groups: [                  // editor tabs; optional, derived from fields if omitted
    { name: "obsah", title: "Recenze" },
    { name: "sprava", title: "Správa" },
  ],
  fields: [
    defineField({
      name: "message",
      title: "Text recenze",
      type: "text",                                        // one of FIELD_TYPES
      validation: (rule) => rule.required().min(10).max(2000),
      options: { rows: 6 },                                // type-specific, see the table
      group: "obsah",
      hidden: (doc) => doc.approved === true,              // or a plain boolean
    }),
  ],
  preview: (doc) => ({ title: doc.name, subtitle: doc.message, media: doc.photo }),
  orderings: [{ name: "newest", title: "Nejnovější", by: [{ field: "submittedAt", direction: "desc" }] }],
})
```

`defineField` is optional sugar — `defineType` normalises bare objects in
`fields` the same way, and normalising twice is a no-op. Both return frozen
objects; treat them as read-only everywhere.

Registration is a side effect of `defineType`, so a schema module has to be
imported for its types to exist. Declaring the same name twice throws: two
content types answering to one `cms_document.type` would route rows to whichever
import won, silently and permanently. In a hot-reloading dev server, call
`clearTypes()` at the top of the module that declares your schemas.

## Validating

```js
const { ok, errors } = validateDocument("review", doc.draft ?? doc.data)
// errors: [{ path, message, rule, field, type }]
```

`value` is the document *body*, not the Contract 3 envelope. Paths are dotted
and array indices are segments:

```
message                    a top-level field
cta.label                  a field inside an object
highlights.2.label         a field inside the third item of an array
specialisations.1          the second item of an array of scalars
""                         the body itself was not an object
```

`errors` carries `rule` (`"required"`, `"min"`, `"type"`, …) alongside the Czech
`message`, so a UI that wants its own wording can key off `rule` and ignore
`message` entirely. `validateValue(field, value, { document })` validates one
field in isolation — that is the on-blur path, and it costs nothing to call on
every keystroke.

Semantics worth knowing before you debug something:

- **Empty gates everything.** If a value is empty, only `required` runs. An
  untouched optional field never shouts "at least 10 characters".
- **What "empty" means is the field type's business**, not the rule's. `0` is a
  filled number, `false` is a filled boolean, `"   "` is not filled text, an
  object is empty when all of its own fields are.
- **Shape before rules.** A value of the wrong shape reports one type error and
  stops; rules do not pile a second opinion on top.
- **Hidden fields are not validated.** A field an editor cannot see must not be
  able to block a save.
- **An untouched optional object is not walked**, so its required children stay
  quiet — but an *array item* always is, because someone added it on purpose and
  a blank row is unfinished work.
- **References are checked for shape and target only.** `{ _ref, _type }`, and
  `_type` against the field's `to` list. Whether the id exists is a database
  question and this layer never asks one.

`emptyDocument(type)` returns a body with every field at its zero value —
what "New document" opens on. `emptyValue(field)` does the same for one field,
which is what an array editor's "add item" button needs.

## What the Studio can rely on

Every normalised field carries these, always, with no `?.` needed:

| key | |
|---|---|
| `name` `title` `description` `type` `group` | `title` falls back to `name`, `group` is `null` when unset |
| `options` | the type's defaults merged under the author's |
| `ui` | render metadata — see below |
| `rules` | the compiled rule specs |
| `constraints` | `{ required, min, max, length, pattern, integer, positive, unique }`, flattened from the rules |
| `required` | hoisted from `constraints` because a label asterisk should not have to walk rules |
| `hidden(doc, ctx)` `readOnly(doc, ctx)` | always functions, whatever the author wrote |
| `fields` | child fields, for `object` |
| `members` | member definitions, for `array` — always an array |
| `of` | the single member, for the common single-member array (an array when the array is polymorphic; prefer `members`) |
| `to` | reference target type names, lifted from either `to` or `options.to` |

And every type carries `name`, `title`, `icon`, `fields`, `fieldsByName`,
`groups`, `orderings` and `preview`.

`preview(doc)` always returns an object with `title`, `subtitle` and `media`,
for any document you hand it including an empty or half-typed draft, and any
extra keys the author's preview returned (`badge`, say) ride along. A preview
that throws falls back rather than taking a list view down. `groups` always has
exactly one entry marked `default: true` when it is non-empty. `orderings` is
never empty — a type that declares none gets "Naposledy upravené" by
`updatedAt`.

### `field.ui` — the config-to-UI seam

The Studio should not switch on type names. It reads `field.ui.input`, looks it
up in its own component registry, and spreads the rest as props:

```jsx
const Input = inputs[field.ui.input] ?? inputs[field.ui.kind]
<Input {...field.ui} value={value} onChange={onChange} />
```

Five keys are guaranteed on every `ui` object, and generic code — the field
wrapper, the group tabs, the layout — reads only these:

`input` (which control), `kind` (coarse family, a fallback when no component is
registered for the exact input), `name`, `title`, `children` (`"none"`,
`"fields"` or `"members"` — whether to recurse and where the child definitions
are).

Everything else is props for the one component that `input` named, so they
cannot collide: `rows` and `maxLength` for text, `choices` and `multiple` for
select, `accept` and `assetKind` for assets, `to` for references, `withTime` for
dates, `members` and `sortable` for arrays, `step`/`min`/`max` for numbers.

Two things `ui` does that are worth using rather than reimplementing:

- **Rules become input attributes.** `.max(2000)` on a string arrives as
  `ui.maxLength`, `.integer()` as `ui.step = 1`, `.min(1).max(5)` on a number as
  `ui.min`/`ui.max`. Author-supplied `options` win over what the rules imply, so
  an explicit `options.step` is not overridden.
- **Inputs collapse.** Sixteen types share nine `kind`s: `string`/`url`/`email`
  differ only by `htmlType`, `inputMode` and `autoComplete`; `date` and
  `datetime` by `withTime`; `image` and `file` by `assetKind` and `accept`. You
  can ship far fewer components than there are types.

## Value shapes

What each type stores, and its zero. Build C's migration writes these shapes.

| type | stored value | zero |
|---|---|---|
| `string` `text` | string | `""` |
| `richText` | string of HTML; an array of portable-text-style blocks is accepted too. Length rules count text content, never markup | `""` |
| `number` | number | `null` — an untouched rating and a rating of 0 are different answers |
| `boolean` | boolean | `false` |
| `date` | `"YYYY-MM-DD"` | `null` |
| `datetime` | ISO 8601 string | `null` |
| `slug` | string, lowercase and hyphenated; `{ current }` accepted on the way in | `""` |
| `image` `file` | the asset object Contract 2's `media.upload` returns — `{ id, url, … }`; a bare url string is accepted | `null` |
| `reference` | `{ _ref, _type }` | `null` |
| `array` | array of member values | `[]` |
| `object` | object keyed by child field names (plus `_type` when it is a polymorphic array member) | children at their zeros |
| `select` | one of `options.list`'s values, or an array of them with `options.multiple` | `null` / `[]` |
| `url` | absolute url, or a site-relative `/path` or `#anchor` | `""` |
| `email` | string | `""` |

Unknown keys in a stored document are left alone — validation never strips or
rejects them, so a field removed from a schema does not destroy existing data.

## Rules

`required` `min` `max` `length` `regex` `email` `url` `integer` `positive`
`unique` `custom`. Every one takes an optional trailing message (a string, or a
function of the value) to override the default Czech wording.

The builder is **immutable** — each call returns a new rule — so return the
chain: `(rule) => rule.required().min(2)`. A validation function that returns
nothing throws at import rather than silently validating nothing.

Those eleven are the whole vocabulary. Reaching for a name another library uses
— `.matches()`, `.uri()`, `.notEmpty()` — throws at import with the name of the
rule you meant, rather than a bare `is not a function` twenty frames deep.

`min`/`max`/`length` mean whatever the field type counts in: characters for
text, items for arrays and multi-selects, the number itself for numbers, an
instant for dates (`rule.min("2010-01-01")` works, and so does a `Date`). A rule
the type cannot evaluate — `.integer()` on a string, `.min()` on a boolean — is
a config error and throws at import, because the alternative is a check that
passes forever and means nothing.

`custom(fn)` returns `true`/`undefined` to pass, `false` for the default
message, or a string to be the message. It receives `(value, { field, path,
document, parent })`. It must be synchronous: rules never touch the network, and
returning a promise throws. Cross-document checks — "is this slug unique across
all consultants" — belong in the server layer.

## Adding a field type

Two steps, no changes to the validator, the rule builder or the Studio's generic
code. Register the type before any schema that uses it is imported:

```js
import { registerFieldType } from "@/cms/core"

registerFieldType({
  name: "rating",
  title: "Hvězdičky",
  kind: "number",              // fallback family for the Studio's input registry
  input: "rating",             // which component renders it
  scalar: true,                // is the value directly sortable / searchable
  options: { stars: 5 },       // defaults, merged under each field's options

  zero: (field) => null,
  check: (value) => (Number.isInteger(value) ? null : "Očekáváno hodnocení."),
  isEmpty: (value, field) => value == null,          // optional, defaults to null/undefined/""
  supports: ["min", "max"],                           // required and custom are always allowed

  // What min/max/length count in here, and how to say so.
  measure: {
    unit: "stars",
    value: (value) => (typeof value === "number" ? value : null),
    bound: (bound) => (typeof bound === "number" ? bound : null),
    message: (flag, bound) => (flag === "min" ? `Nejméně ${bound} hvězdiček.` : `Nejvýše ${bound} hvězdiček.`),
  },

  ui: (entry, field) => ({
    input: entry.input, kind: entry.kind, name: field.name, title: field.title,
    children: "none",
    stars: field.options.stars,
    required: field.constraints.required,
  }),

  toDisplay: (value) => (value == null ? "" : `${value}/5`),
})
```

Omitting one of the five guaranteed `ui` keys throws — the seam is enforced, not
just documented. Two more optional hooks:

- `checkConfig(field)` returns a string to reject a field declaration at import
  time. `select` uses it to refuse an empty `options.list`, and to refuse
  counting rules on a single-value select where they could never fire.
- `enter(value, field)` returns `{ key, field, value }` per child. That is all
  `array` and `object` do, and it is why nesting needs no special case in the
  validator or in the path builder.

## Notes on the shape of the API

- **`FIELD_TYPES` is keyed by name** — `FIELD_TYPES.string.input` — because the
  spec lists the names but the Studio needs the metadata behind them. Iteration
  and `.includes()` are provided as non-enumerable extras, so
  `Object.keys(FIELD_TYPES)`, `[...FIELD_TYPES]` and
  `FIELD_TYPES.includes("slug")` all agree, while `Object.values()` stays the
  sixteen metadata entries. `FIELD_TYPE_NAMES` is the plain array of names.
- **`getType` throws on an unknown name**, per the spec's "fail loudly". UI code
  that legitimately handles "no such type" — a route parameter typed by a human
  — should use `hasType(name)` or `findType(name)` (which returns `null`) rather
  than catch. `validateDocument` and `emptyDocument` throw for the same reason.
- **Messages are Czech, developer errors are English.** Validation messages are
  read by editors and by visitors submitting a review; `CmsSchemaError` messages
  are read by us. Every rule takes a message override, and `error.rule` is
  stable, so a UI-side wording layer needs nothing from here.
