# Upravit kontent — the editing mode

Supersedes the parts of `VISUAL-EDITING.md` that describe editing as something
bolted onto the preview. The preview stays what it is. This is a second thing:
a mode an editor opens to *change* the page, not to look at it.

Read `SPEC.md` and `VISUAL-EDITING.md` first; this states only what differs.

## The ask, in the words it arrived in

> chci aby tam nebyl jen ten náhled, ale celý editování textu, obrázků atd bylo
> přímo v tom náhledu … pod Schvalováním recenzí přidat nový modul "Upravit
> kontent" … když člověk klikne na element jako je obrázek, logo nebo text, tak
> se mu vpravo dole toho komponentu zobrazí Upravit … pro obrázky se zobrazí
> modál přes tu stránku, kde smaže nebo upraví obrázek, pro text bude moct
> přímo psát do textu, aby se mu to rovnou zobrazilo, pak dá vpravo dole Zrušit
> nebo Uložit … opět top bar a side bar … musí to být true editor.

"True editor" is the acceptance test. Clicking a thing and typing into it has to
change what the site serves. Anything that looks like editing and does not
persist is worse than no feature.

## Three things that have to change under it

### 1. One source of content, on the server

Today the Studio reads browser fixtures (`studio/dev/devPort.js`, localStorage)
and the framed page reads Supabase on the server. With no
`SUPABASE_SERVICE_ROLE_KEY` the second answers empty, every section falls back to
the copy hardcoded in its own component, and there is nothing annotated to click.
That is exactly what "Z CMS nepřišel žádný obsah" in the preview rail is
reporting, next to a Studio listing 23 reviews.

**A file-backed store on the server becomes the port's implementation when there
is no service-role key.** Not a second data model — the same repository
interface, the same Contract 3 document shape, the same `/api/cms/*` handlers.
Both the Studio and the site's server-side readers go through it, so they agree.

The day the key arrives, the Supabase adapter takes over and nothing above it
changes. This is a persistence adapter, not a dev mode with its own rules:
if a save works here and not there, the store is wrong, not the caller.

### 2. The overlay mounts from the host, not from the framed page — **built**

`VISUAL-EDITING.md` left this as an open contradiction: the framed page is the
site's own route, so its bundle *is* the public bundle, and mounting the overlay
inside it ships editing to visitors. Hence "homepage only".

It dissolves. The iframe is **same-origin**, so the host reaches
`frame.contentDocument` and mounts the overlay into it from the *host's* bundle
(`src/cms/edit/overlay/mount.jsx`, called by `PreviewHost` on every frame load).
The framed page keeps carrying nothing but the inert `data-cms-*` attributes.

What that turned into, and where to read the argument in full
(`VISUAL-EDITING.md`, "Where the overlay is mounted"):

- Editing works on every framed page. Measured on `/`, `/o-nas`, `/kontakt` and
  `/nabidky`: hover, select, anchor, edit in place, restore on Escape.
- The zoom is a prop. The `frameElement` bootstrap is deleted, and so is
  `channel.js` — every message it carried was a message between two documents,
  and there is one realm now. `save` is a promise; the media library is drawn in
  the Studio's document instead of asking the host to draw it.
- The overlay's stylesheet is transplanted into the frame's head by
  `overlay/sheet.js`, keyed on `data-cms-overlay-styles`, picked out of the
  host's CSSOM by this module's own hashed class names.
- `EditSurface` is deleted. `/studio/preview/home` stays — it is still how the
  homepage reaches a draft — and imports nothing about editing.
- The one thing that could not move: `editable()` runs in the frame's React, so
  something in the page has to notice and re-render. That is `useEditArming()`
  in `_app` — a `useState` and an effect that returns on its first line for a
  visitor, reaching `frame.js` and `mode.js` and nothing else.

### 3. Editing is a Studio view, with the Studio's chrome — **built**

`/studio/edit`, a reserved segment in `lib/routes.js`, rendered inside the
Studio shell — sidebar and top bar, as asked. The sidebar entry sits directly
under "Schvalování recenzí", above the "Obsah" group: it is a job, not a content
type, which is the same argument moderation already won.

What that turned into:

- **The frame is shared, not forked.** Everything below the chrome —
  the iframe at the device's real dimensions, the zoom, the load handler, the
  overlay mount — is `studio/preview/useFrameSurface.js`, lifted out of
  `PreviewHost` and used by both hosts. The device and zoom clusters of the bar
  are `studio/preview/FrameControls.jsx`, likewise. `/studio/preview` renders the
  same controls with the same behaviour it had; measured against the previous
  revision running beside it, the bar, the rail, the emulation and the overlay's
  control were identical objects.
- **The page rail becomes a `<select>`.** A second vertical rail next to the
  Studio's sidebar would spend ~440px of a screen whose whole purpose is the page,
  and both rails would answer "where am I" in two different shapes. Same pages,
  same grouping, one control in the toolbar. Devices and zoom stay in the toolbar,
  where they describe the stage directly below them.
- **No draft/published switch.** This surface is always the draft, because
  writing to anything else is not something it can do. The view opens a draft
  session on mount (`/api/studio/edit?session=open`, which also hands over the
  page list, since `listSitePages()` reads the filesystem) and closes it on
  unmount. That is the switch that cannot be left in the wrong position.
- **"Úpravy zapnuté" and the draft strip are on screen the whole time**, next to
  a live count of the annotated elements on the framed page — the only number
  that tells "nothing is clickable" apart from "nothing loaded", since every
  section of this site falls back to copy hardcoded in its own component.

**`/studio/preview` only looks.** It used to arm the overlay too — it was the
only host there was, and editing had been bolted onto it. Once "Upravit kontent"
existed, that left two surfaces that edit, which is a claim in this document that
is false and a page someone can change by clicking while showing the site to a
client. So `useFrameSurface` takes `editing`, opt-in, and only the new view
passes it; `VisualSurfaceNotice`'s "Upravit na stránce" was repointed at
`/studio/edit` in the same change, because a link offering to edit has to land
somewhere that can. Measured after the split, framing the same page:

| | overlay | styles | annotated elements |
|---|---|---|---|
| `/studio/edit` | 1 | 1 | 7 |
| `/studio/preview` | 0 | 0 | 7 |

The attributes stay in both — they are inert, and `editable()` neither knows nor
cares which host is framing it. What differs is whether anything is mounted to
act on them.

## Interaction, exactly

1. **Hover** outlines the element under the cursor.
2. **Click** selects it: outline holds, and a control appears anchored to the
   element's **bottom-right**, flipping to bottom-left / above when the frame has
   no room (`overlay/anchor.js`, already built and tested — do not rewrite it).
3. The control offers **Upravit**.
4. **Text** — taking it makes the real element editable in place, in the real
   layout, so wrapping and line breaks are the truth as typed. The control
   becomes **Zrušit** / **Uložit**.
5. **Image, logo** — taking it opens a **modal over the page** with the media
   library: replace, remove, alt text. Confirm/cancel in the modal.
6. **Escape** cancels and restores exactly what was there.
7. **Uložit** writes the field and the element keeps the typed value — no
   flash of the old text while the write lands, and no silent divergence if it
   fails: a failed save says so and offers the text back.

## Saving

Unchanged from Contract C and it stays unchanged: the write is
`PATCH /api/cms/documents/:id/field`, it touches **`draft`**, never `data`, and
it cannot publish — `patchField` has no reach into `data`, `status` or
`published_at`. Publishing stays in the document editor.

So an editor who edits visually and never publishes has changed nothing the
public can see. Say this in the UI; it is not obvious from a page that updates
as you type.

## Inline emphasis — built

The overlay used to refuse the Offers copy lines, because they are stored as
`díky kterým máme *slevy*` and saving what the DOM shows would delete the
accent. Declining was right while the feature was scoped out. Under "true
editor" it was a hole — and a bigger one than a count of the lines suggests:
three of the homepage's seven annotated fields refused outright, and the fourth
copy line was offered only because that particular sentence happens to carry no
highlight today. Adding one would have taken the affordance away.

Both decisions held, and the build is what they describe:

1. **The accent is declared, never sniffed.** `options: { mark: 'highlight' }`
   on siteCopy's `items[].label`. The site layer reads the declaration off the
   field descriptor rather than restating it, and puts the mark's name in the
   annotation; `editable()` emits it as `data-cms-mark` and the overlay looks it
   up. Sniffing is unsafe and `.word` in WhoWeAre is the proof: a rule loose
   enough to find the Offers highlight marks every character of that paragraph
   as accented.
2. **The `*…*` encoding belongs to the schema layer, not the overlay.**
   `src/cms/schemas/marks.js` owns the class, the tag, the Czech labels and the
   encode/decode pair. `server/site/homepage.js` no longer spells the convention
   out; `parseHighlights` is now the decode half of the mark the schema declares.
   The overlay works in runs of `[text, marked]` and never sees an asterisk.

The affordance is a selection-based mark/unmark on the real DOM range: the
control gains *Zvýraznit* / *Zrušit zvýraznění* while something is selected, the
range is widened to whole words because that is the granularity the encoding can
be read back at, and the accent spans stay visible while editing because the
originals are cloned rather than flattened.

The old detector is kept as a guard, not as the feature: it runs only for a text
field that declared no mark, so emphasis that exists and was never declared is
still refused rather than silently deleted.

## What must still be true afterwards

Every one of these was measured once and regressing any of them is a defect:

- **Zero** editing markers in the public production bundle, on every route —
  not just `/`. `data-cms-*` count in prerendered public HTML: 0. Last measured
  against a production build: 113 chunks, 6 carry the editing surface, 0 of them
  reachable from any of the 21 public routes or from `/_app`; 0 `data-cms-*` in
  25 prerendered pages.
- Every stylesheet under `src/cms` is `*.module.scss`. `sync-styles.js` globs
  every non-module `.scss` under `src/` into the public stylesheet.
- 0 console errors, 0 hydration mismatches, on `/studio/*` and on every framed
  page. Anything read from the URL is gated on an effect — `router.isReady` is
  already `true` on the first client render of a static route and `false` on the
  server, which is a mismatch (see `PreviewHost.jsx`).
- Viewport emulation still real: `100vh` inside the frame resolves to the
  preset's height, and `.HScroll__sticky` still flips at the 820px stop.
- No animation, timing or transform value in `src/components/pages/index/`
  changes. Attributes are the permitted edit. (The one exception is the mobile
  overflow bug named in `VISUAL-EDITING.md`, which is a separate decision.)
