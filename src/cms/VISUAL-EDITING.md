# Visual editing — system design

Editors stop filling in forms for the page's own copy and images. They open the
site, click the thing, and change it. Contract for three parallel builds.

## What moves and what does not

**Stays on its own page:** anything that is a list — reviews, consultants,
partners, offers, questions. A queue of 37 reviews is not edited by clicking
around a page, and the moderation screen already does that job well.

**Moves into the preview:** the page's own standalone copy and images. Those are
the things whose meaning is their position, and a form field labelled
"heading 3" tells an editor nothing about where it lands.

Once this works, the Studio's forms for singleton content become read-only
previews — the editing lives in one place, not two.

## The iframe, and why it is one now

Viewport emulation needs a real viewport. Media queries, `vw` and `vh` resolve
against the window, not against a scaled `div`; a CSS transform makes something
look smaller without any of the layout changing. So the page runs in an iframe
sized to the device and scaled to fit, exactly as devtools does it.

This reverses the reasoning in `SPEC.md`. The objection was two live WebGL
contexts. Measured since: the Studio's own copy of the site shader sits under
`display: none`, its IntersectionObserver reports no intersection, and
react-three-fiber drops to `frameloop: "demand"` — the canvas exists and renders
nothing. One iframe therefore means one *active* context, not two.

Measured again once the host was built, and the answer is better than that: with
`getContext` instrumented in both documents, the host allocates **no** WebGL
context at all. `display: none` leaves the canvas at 0×0, and r3f does not build
a renderer until it has a size. The only contexts in the browser are the framed
page's own, exactly as many as the live page has.

## Contract 0 — the frame's URL and the edit flag

Settled in `src/cms/preview/frame.js`; all three builds import it rather than
spelling it out. The host calls `frameUrl()`, the overlay calls `isEditFrame()`.

**The iframe loads the page's own URL** with one parameter added — `/o-nas?edit=1`,
`/kontakt?edit=1`. Not a copy of the route and not a mirror of it under `/studio`.
A mirror was built and removed: this site reads its own pathname in five
components (`navbar/body` marks the active link with `pathname === href`,
`navbar/menu` swaps the CTA on `/o-nas`, plus the footer and Contact), so a page
served from a second address renders its navigation differently from the site —
with a hydration error on every page to go with it. A preview that gets the
navigation wrong is a preview of something else.

**The homepage is the exception:** `/studio/preview/home?edit=1`. `src/pages/index.js`
calls `getHomepageContent()` with no arguments and keeps doing so, so the public
homepage cannot reach a draft (`server/site/homepage.js`) — worth more than the
symmetry. The cost is that `usePathname()` there answers `/studio/preview/home`;
nothing on the homepage branches on it, and the exception disappears the day
`index.js` is allowed to read `context.draftMode`.

**The flag is claimed by the URL and validated by the frame.** `?edit=1` on a
public URL is eight characters anyone can type, so `isEditFrame()` also requires
the document to be framed by a same-origin `/studio/preview`. That is not a
second channel — nothing is signalled by it and the parameter is still the only
thing that says "edit"; it is what stops the one signal being forgeable. Verified:
the overlay mounts inside the host, and does not mount for the same URL opened
directly or for `?edit=1` pasted onto a public page. `EditSurface`'s `enabled`
prop bypasses it for testing.

## Layout

    ┌──────────────────────────────────────────────────────┐
    │  viewport presets            zoom      draft/live    │
    ├────────┬─────────────────────────────────────────────┤
    │ pages  │                                             │
    │  nav   │        iframe: the real site                │
    │        │        + edit overlay inside it             │
    └────────┴─────────────────────────────────────────────┘

## Contract A — field provenance

An element is editable because it says so. A helper emits the attributes and
they are spread onto elements that already exist:

```js
import { editable } from "@/cms/edit";

<h2 {...editable(doc, "heading")}>{heading}</h2>
<motion.div {...editable(doc, "photo")} className="Offers__photo">
```

Emitting `data-cms-doc`, `data-cms-field`, `data-cms-kind` (`text` | `image`).
Outside preview the helper returns `{}`, so nothing reaches the public HTML.

**Spreading attributes changes no layout, no timing and no transform.** That is
the whole reason it is attributes rather than wrapper elements — a wrapper adds
a box to a tuned layout, an attribute does not.

## Contract B — the overlay

Drawn **inside** the iframe — and mounted there by the host, out of the host's
bundle; see "Where the overlay is mounted" below. Its controls are counter-scaled
by `1/zoom` so they stay legible at any device size. One coordinate space: the
hard part of this feature is landing the control in the right place, and that
gets no easier by transporting rectangles across a document boundary.

- Hover outlines the element. Click selects it.
- The control anchors to the selection's **bottom-right**, and flips to the
  **bottom-left** when the right edge would leave the frame. Same logic
  vertically: above when there is no room below.
- **Text:** selecting shows *Upravit*. Taking it makes the element itself
  editable in place — the real element, in the real layout, so line breaks and
  wrapping are the truth. Then *Uložit* or *Zrušit*.
- **Image:** selecting opens a module offering replace, remove, and edit its
  alt text, backed by the existing media library.
- Escape cancels, and cancelling always restores what was there.

## Contract C — saving

The overlay never writes. It hands `{ docId, field, value }` to the host, which
calls the data port and patches the document's **draft**, never `data`.
Publishing stays where it already is. An editor who edits visually and never
publishes has changed nothing the public can see, which is the same promise the
form editor makes.

(It was a `postMessage` when this was written, because the overlay was in the
other document. It is a function call now — same rule, one less boundary. See
"The channel, and why there is not one".)

## Viewport presets

Taken from `src/styles/system/_breakpoints.scss`, not invented — width stops at
400 / 750 / 900 / 1200 / 1300 / 1400 / 1500, height stops at 320 / 380 / 600 /
1000. The presets straddle those so an editor can see each side of every stop:

| | |
|---|---|
| Monitor | 1920×1080 |
| Laptop | 1440×900 |
| Malý laptop | 1280×800 |
| Úzký laptop | 1152×720 |
| Tablet na šířku | 1366×1024 |
| Tablet na výšku | 1024×1366 |
| Malý tablet na šířku | 1024×768 |
| Malý tablet na výšku | 768×1024 |
| Velký telefon na výšku | 430×932 |
| Velký telefon na šířku | 932×430 |
| Telefon na výšku | 390×844 |
| Malý telefon na výšku | 375×667 |
| Malý telefon na šířku | 667×375 |

`932×430` is deliberate. `_breakpoints.scss:5` warns that a landscape phone
matches the 900px tablet stop on width alone — the preset exists so that trap
is visible rather than theoretical.

Zoom fits the frame to the space by default and can be set by hand. The zoom
figure is shown, because "is this small or is it scaled" is otherwise a guess.

## Known, and not to be quietly inherited

The homepage **overflows horizontally at phone width today** — 624px of content
in a 390px viewport, from the hero's rotating circular text. It predates this
work. The phone presets will show it, and it should be fixed rather than
explained away in the tool.

## Ground rules

- JavaScript, `.jsx` / `.js`. Pages Router. No new dependencies.
- Every stylesheet `*.module.scss` — `scripts/sync-styles.js` ships non-module
  ones to the public site.
- **No animation, timing, transform or layout value in
  `src/components/pages/index/` may change.** Adding attributes is the only
  permitted edit there.
- Nothing about editing may reach the public bundle.

---

# Contract B, as built

The overlay lives in `src/cms/edit/`. What follows is the part of it the other
two builds have to agree with, written down after the fact because two of these
were decided by measurement rather than by design.

## Where the overlay is mounted

**The host mounts it into the frame's document, from the host's own bundle.**
`src/cms/edit/overlay/mount.jsx`, called by `PreviewHost` on every frame `load`:

```js
const handle = mountEditOverlay(frame.contentWindow, { zoom })
```

The iframe is same-origin, so `frame.contentDocument` is reachable, and a React
root created against a node in that document builds the overlay's DOM inside the
previewed page while the code stays in the Studio's chunk. The framed page is
left carrying nothing but the inert `data-cms-*` attributes, which is all it ever
needed to carry.

**This is what closed the gap this document used to end on.** The gap was real:
every framed page except the homepage is the site's own route at its own address,
its bundle *is* the public bundle, and there was nowhere inside it to put an
`EditSurface` that visitors would not also download — so editing armed on `/`
alone. The two things that looked mutually exclusive — "the framed page is the
public page" and "editing never reaches the public bundle" — are only exclusive
if the mount has to come from the framed page. It does not. `EditSurface` is
deleted; `/studio/preview/home` no longer imports anything about editing.

Measured against a production build afterwards: 113 chunks in `.next/static`, 6
of them carry the editing surface, and **no public route loads or even names one
of the 6** — not `/`, not `/_app`, not any of the 21 public routes. Prerendered
public HTML holds zero `data-cms-*` attributes on every page.

### Two documents, one realm — the thing this costs

The overlay's JavaScript now runs in the *host's* realm while its DOM lives in the
frame's. So `window` and `document` inside `Overlay.jsx` are the Studio's, and
every read about the previewed page is taken from the frame's own globals, which
arrive as a `frame` prop. This is not tidiness: `innerWidth` off the wrong
document is the stage's width rather than the emulated device's, and `anchor()`
works entirely in the previewed page's viewport pixels.

`requestAnimationFrame` is the same trap wearing a different hat, and it is the
one worth naming. Animation callbacks are serviced per document, parent first —
so the host's rAF runs *before* the framed page's, and a loop driven by it would
read every rect one frame stale. The loop books itself on the frame's
`requestAnimationFrame`, where it is registered after framer-motion's and after
Lenis's and runs after both. Rule 2 of Overlay.jsx survives the move intact:
measured at one `getBoundingClientRect()` per frame while tracking a selection,
and 0.01 per frame when nothing is selected.

### The stylesheet

The overlay's class names come from the host's bundle and mean nothing in the
frame until the rules behind them are there too. `overlay/sheet.js` picks them
out of the host's own CSSOM by name — every rule whose selector mentions one of
this module's hashed class names, plus the one `:global` rule it owns — and
writes them into a single keyed `<style data-cms-overlay-styles>` in the frame's
head. Copying the host's stylesheet nodes wholesale was the first idea and is
wrong: a Next CSS chunk carries whatever else is in it, and here that is the
Studio's sheet landing on top of the site's.

Verified by computed style rather than by the node existing: inside the frame the
control resolves to `background: rgb(26, 26, 29)` (`--st-raised`) and
`border-color: rgba(255, 252, 247, 0.17)` (`--st-line-strong`), in dev and in a
production build alike — 7.1 KB of rules, one `<style>` node, and still one after
six frame navigations and two reloads.

## Arming, and the hydration trap

`editable()` returns `{}` until a module flag is set, and that flag is set **only
from an effect**. Effects do not run on the server, so no server render can emit
an attribute — not the public page, and not the preview's own first pass. The
first client render therefore matches the server exactly, and the effect's state
change re-renders the app so the attributes appear one frame later.

That effect is `useEditArming()` (`src/cms/edit/arm.js`), called by `_app`. It is
the one piece of this feature that has to be in the page's own bundle, and the
reason is exact: `editable()` runs inside the page's React, React lives in the
frame's realm, and the host can neither set a flag in another realm's module
registry nor make that realm re-render if it could. What `_app` gains is a
`useState` and an effect that returns on its first line for every visitor; what
it does not gain is anything under `overlay/`.

The obvious alternative — set the flag when the framed document loads, before
hydration — was rejected twice over. The server cannot know about `?edit=1` on a
statically generated route, so the client would always disagree with it, and a
hydration mismatch is a console error *and* a full client re-render of a page
that is a 550vh scroll timeline. The cost of the arrangement above is one extra
render of the page, once, straight after hydration.

## The channel, and why there is not one

There is no channel. `src/cms/edit/channel.js` and `overlay/host.js` are deleted.

Every message in the table that used to be here existed because the two halves of
this feature were in two documents; they are in one realm now, and a message
between two objects in the same realm is a function call with extra steps.

| was | is |
|---|---|
| `ready {url}` | the host mounted it; it knows |
| `host {zoom}` | a `zoom` prop |
| `save` / `saved` | `onSave({docId, field, value}) → Promise<entry>` |
| `media` request / answer, `capabilities` | the modal renders in the host's document |
| `select` | an optional `onSelect` callback |

Two of those are worth arguing rather than asserting.

**`save`/`saved` collapse to a promise.** `createFieldSaver` already resolves with
the final entry, and the `pending` message it used to send first is the one thing
the overlay never acted on — its optimistic state is "the typed text is still in
the element", which it can see for itself. So the promise not having settled *is*
pending, and `reconciled` and `failed` arrive as the resolved value.

**The media library moves rather than negotiating.** It used to be mounted inside
the frame, with a `capabilities.media` handshake and a pair of `media` messages so
that a host willing to open it at full width could take the job — because inside a
390px phone preset the library is a grid two thumbnails wide. The overlay is
already running in the Studio's realm, so `Overlay.jsx` portals `MediaModule`
into the Studio's document and the negotiation has nothing left to negotiate. The
same `.root` class wraps it there at zoom 1, which is why it needed no CSS
change. Escape reaches it because the key handler is registered on both documents
— events do not cross an iframe boundary, so neither registration ever sees the
other's.

The zoom deserves its own line, since this document used to warn about it: the
`frameElement` bootstrap is **deleted**, not merely unused. There is one place the
number comes from and it is the host, which is the component that draws the frame.

`field` may be a dotted path. The overlay uses exactly one: `image.alt`, because
it can read the alt text off the rendered `<img>` but cannot read the stored
asset, and sending `{url: whatever next/image rewrote it to}` would corrupt the
field.

## Inline emphasis — declared, and edited in place

The Offers copy lines are stored as `díky kterým máme *slevy*` and rendered as
spans with the site's accent class. The asterisks are nowhere on screen, so
editing such a line in place and saving what comes back **would** delete the
accent silently. The overlay used to detect that and decline, which was right
while the feature was out of scope and was a hole once "true editor" was the
acceptance test: three of the homepage's seven annotated fields refused.

The two things this section used to say were unsettled are settled, and both are
what made the affordance buildable rather than merely desirable.

1. **Which class means "accent" is declared, never sniffed.** It is an option on
   the field — `options: { mark: 'highlight' }` on siteCopy's `items[].label` —
   and it reaches the overlay through a fourth annotation attribute,
   `data-cms-mark`. Sniffing is unsafe and `.word` is the proof: a rule loose
   enough to find `hl` in Offers finds `word` in WhoWeAre and marks every
   character as accented.
2. **The `*…*` encoding belongs with the field.** `src/cms/schemas/marks.js`
   holds the mark: its class, its tag, its labels, and its encode/decode pair.
   The site layer decodes through it (`server/site/homepage.js` no longer spells
   the convention out) and the overlay encodes through it. The overlay itself
   works in **runs** — `[text, marked]` — and knows nothing about asterisks.

So the affordance is a selection-based mark/unmark on the real DOM range, and
the accent spans stay visible while editing because the originals are cloned
rather than flattened (`overlay/text.js`). Measured on the four Offers lines:
enter, mark a word, unmark it, save; the stored string comes back byte for byte
as the one the page renders, and Escape restores the identical nodes.

`hasEmphasis()` in `Overlay.jsx` survives, demoted to a guard: it is consulted
only for a text field that declared **no** mark, so an element that renders with
emphasis and forgot to say so is still refused rather than flattened.

What reaches the public bundle for this: the attribute name and a three-line
branch in `editable()` — 94 bytes of minified JS, measured against a production
build. The mark definition itself is loaded by `/studio/*` and by nothing else.
