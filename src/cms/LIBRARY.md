# The Studio as a library — architecture

What changes: the CMS stops being *this site's* CMS and becomes a thing this
site is one configuration of. Adding a page becomes a config entry plus a route
file, and everything else — the Studio's page list, the editable surface, the
seed, the migration — follows from it.

## What is already the library, and what is not

Measured, not estimated:

| | lines | status |
|---|---|---|
| `core/` — schema DSL, field types, validation | 2081 | **library** |
| `edit/` — annotation + overlay, seven kinds | 5282 | **library** |
| `studio/preview/` — iframe, presets, zoom | 1304 | **library** |
| `studio/fields/` — inputs, `FieldRenderer` | 1230 | **library** |
| `server/ports/` — storage drivers | 471 | **library** |
| `server/site/*.js` + `visualEditing.js` | **2100** | **hand-written per page — this is what the config replaces** |
| `studio/dev/seed*.js` | **3124** | **hand-written content — this is what the generator emits** |
| `editable*()` calls in components | **117** | **hand-threaded ids and paths — this is what the binding removes** |

So this is not a rewrite. It is one new layer, and the deletion of three.

## The config

One file, `cms.config.js`, at the repo root. It declares pages, the blocks each
page holds, and what each block's fields are. Everything else is derived.

```js
import { defineSite, definePage, defineBlock, f } from "@/cms/site";

export default defineSite({
  pages: [
    definePage({
      route: "/",                       // must match a file in src/pages
      title: "Úvodní stránka",
      blocks: [
        defineBlock({
          key: "index.hero",            // the document key; stable, dotted
          title: "Úvod stránky",
          type: "siteCopy",             // an existing schema type…
          fields: {                     // …narrowed to what this block uses
            headline: f.text({ lines: true, mark: "highlight" }),
            image:    f.image(),
            items:    f.list({ of: f.string(), max: 8 }),
          },
        }),
      ],
    }),
  ],
});
```

**A block names a schema type rather than inventing one.** `siteCopy`, `partner`,
`consultant`, `review`, `offer`, `qna`, `assistant` already exist and are already
config (`defineType`/`defineField`). A block is a *use* of a type at a place on a
page. That keeps one definition of "what a partner is" and stops the config
growing a second, weaker schema language.

## The binding — how a component says which element holds which field

Today a component threads a document id and a dotted path by hand, 117 times:

```jsx
<h1 {...editable(docId, "headline", "text", mark)}>          // before
```

A page component now receives one `cms` object per block and asks it for a field:

```jsx
<h1 {...cms.hero.text("headline")}>                          // after
<div {...cms.hero.image("image")} />
<li {...cms.faq.list(`questions.${i}`)} />
<a {...cms.footer.link({ text: "items.0.label", href: "items.0.value" })} />
```

`cms.hero` knows the document id, the type, the mark and whether editing is
armed, because the config said so. The component only says **which element**.
Outside edit mode every one of these returns `{}`, exactly as `editable()` does
now, so the public bundle carries the same inert helper it carries today.

Sugar for the simple case, since it was asked for: a component may instead write
`data-cms-bind="hero.headline"` in its markup and a resolver fills the rest. It
produces the identical attributes. It is sugar, not a second mechanism — and it
is **not** class-name sniffing. A class is styling; two different things sharing
a class is normal and correct, and a rule loose enough to find one is loose
enough to find the other. `.word` in WhoWeAre already proved that once.

## What the config generates

- **The Studio's page list.** `server/pages.js` reads `src/pages` at request
  time; the config supplies each route's title and block list. A page missing
  from one of the two is reported rather than silently absent — the current
  list has eleven entries titled `$` because a regex failed and nothing checked.
- **The site layer.** One generic `getPageContent(route, { draft })` replaces
  `homepage.js`, `aboutUs.js` and `footer.js`. Per-page code survives only where
  a real shape mismatch needs absorbing, and each survivor must say why.
- **The seed.** A generator walks the config, reads each component's declared
  fallback, and emits fixtures. Today's 3124 hand-written lines exist because
  every string was copied by hand from a component; the copying is mechanical
  and should be done by a machine that cannot mistype.
- **The migration.** One command turns the config into the SQL and the document
  rows. This is what closes the gap the security audit found: 74 documents live
  in fixtures that no script puts into Supabase, so a first deploy yields a
  Studio with five of seven types empty and nothing to click.

## Popups

Declared per kind in the config: which kinds a block offers and what each one
shows. Two rules, both from the ask:

- **The image popup is native and universal.** Every image field anywhere gets
  the same one — pick, upload, alt, remove. It is not configurable, because a
  configurable image picker is six subtly different image pickers.
- **Every other popup is one shell with a declared body.** `document` renders
  the type's own form; `list` renders an array; `imageSet` renders a set;
  `moderate` narrows a document popup to hide and archive.

## Viewports

The thirteen presets are derived from `src/styles/system/_breakpoints.scss` —
today by hand, into a literal list. They should be read from the stylesheet, so
a breakpoint added in SCSS appears in the device menu without a second edit.
`932×430` stays: `_breakpoints.scss:5` warns that a landscape phone matches the
900px tablet stop on width alone, and the preset exists so the trap is visible.

## The order this is built in, and why

0. **Fix the save that reverts.** `text.js`'s `readSlots` returns null unless
   every line is exactly one node, so `applyLines` no-ops and the restored
   original stays on screen — for every line carrying a highlight. The store is
   correct, the flash says "Uloženo", the page shows the old words. Verified in
   code and in the DOM. Generating editable surfaces for every page multiplies
   this rather than diluting it.
1. **The config and the generic reader**, proved by moving the homepage onto it
   with byte-identical output.
2. **The binding**, replacing the homepage's hand-threaded annotations.
3. **The rest of the pages and the modals**, which by then is config entries.
4. **The generator**: seed and migration from config.

## The rule that does not move

The rendered page is the acceptance test. Text and every image URL identical
before and after, on every page, every time. Nothing about editing reaches the
public bundle. Writes land in `draft`. An empty CMS renders exactly what the
components ship with.
